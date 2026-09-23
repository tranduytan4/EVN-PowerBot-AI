import os
import time
import math
import random
import json
import sqlite3
import hashlib
from pathlib import Path
from typing import Dict, Any, List, Optional, Tuple
from dotenv import load_dotenv

_env_file = Path(__file__).resolve().parent.parent / ".env"
if _env_file.exists():
    load_dotenv(dotenv_path=_env_file)
else:
    load_dotenv()

# Quota defaults for Gemini Free Tier (conservative client-side rate limiter)
DEFAULT_RATE_LIMITS = {
    "gemini-2.5-flash-lite": {"rpm": 15, "tpm": 250_000, "rpd": 1500},
    "gemini-2.0-flash-lite": {"rpm": 15, "tpm": 250_000, "rpd": 1500},
    "gemini-2.5-flash": {"rpm": 15, "tpm": 1_000_000, "rpd": 1500},
    "gemini-1.5-flash": {"rpm": 15, "tpm": 1_000_000, "rpd": 1500},
    "text-embedding-004": {"rpm": 1500, "tpm": 1_000_000, "rpd": 10000},
    "gemini-embedding-exp-03-07": {"rpm": 1500, "tpm": 1_000_000, "rpd": 10000}
}

class DiskCache:
    """
    Persistent SQLite-backed cache for LLM Judge and Generation calls.
    Guarantees deterministic, 0-cost re-evaluations.
    """
    def __init__(self, db_path: Optional[str] = None):
        if not db_path:
            cache_dir = Path(__file__).resolve().parent.parent / ".cache"
            cache_dir.mkdir(parents=True, exist_ok=True)
            db_path = str(cache_dir / "gemini_eval_cache.sqlite")
            
        self.db_path = db_path
        self._init_db()

    def _init_db(self):
        with sqlite3.connect(self.db_path) as conn:
            conn.execute("""
                CREATE TABLE IF NOT EXISTS call_cache (
                    prompt_hash TEXT PRIMARY KEY,
                    model_name TEXT NOT NULL,
                    temperature REAL NOT NULL,
                    response_text TEXT NOT NULL,
                    token_usage_json TEXT,
                    created_at REAL NOT NULL
                );
            """)
            conn.commit()

    def _hash(self, model: str, prompt: str, temperature: float) -> str:
        content = f"{model}:{temperature:.2f}:{prompt}"
        return hashlib.sha256(content.encode("utf-8")).hexdigest()

    def get(self, model: str, prompt: str, temperature: float) -> Optional[Tuple[str, Dict[str, Any]]]:
        h = self._hash(model, prompt, temperature)
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT response_text, token_usage_json FROM call_cache WHERE prompt_hash = ?", (h,))
            row = cursor.fetchone()
            if row:
                usage = json.loads(row[1]) if row[1] else {}
                return row[0], usage
        return None

    def set(self, model: str, prompt: str, temperature: float, response_text: str, usage: Dict[str, Any]):
        h = self._hash(model, prompt, temperature)
        with sqlite3.connect(self.db_path) as conn:
            conn.execute("""
                INSERT OR REPLACE INTO call_cache (prompt_hash, model_name, temperature, response_text, token_usage_json, created_at)
                VALUES (?, ?, ?, ?, ?, ?)
            """, (h, model, temperature, response_text, json.dumps(usage), time.time()))
            conn.commit()

class GeminiEvaluationClient:
    """
    Production-ready Gemini API client for Evaluation & Golden Set Generation.
    Features:
    - Dynamic Model Discovery & Capability Listing (RPM/TPM/RPD).
    - Client-side token bucket rate limiting with exponential backoff & jitter.
    - Persistent SQLite disk cache to prevent duplicate billing.
    - Dry-run call & token cost estimation.
    """
    def __init__(self, api_key: Optional[str] = None, cache_db_path: Optional[str] = None):
        self.api_key = api_key or os.getenv("GEMINI_API_KEY", "")
        self.cache = DiskCache(cache_db_path)
        self.client = None
        self._last_request_time = 0.0
        self._min_request_interval_s = 4.0  # Safe ~15 RPM interval
        self._daily_calls_count = 0
        
        if self.api_key:
            try:
                from google import genai
                self.client = genai.Client(api_key=self.api_key)
            except Exception as e:
                print(f"[GeminiEvalClient] Note: google-genai client init: {e}")

    def list_available_models(self) -> List[Dict[str, Any]]:
        """Queries Gemini API for accessible models and prints RPM/TPM/RPD limits."""
        if not self.client:
            print("[GeminiEvalClient] No GEMINI_API_KEY configured. Running in offline/mock mode.")
            return []
        
        models_info = []
        try:
            for m in self.client.models.list():
                m_name = m.name.replace("models/", "")
                limits = DEFAULT_RATE_LIMITS.get(m_name, {"rpm": 15, "tpm": 250_000, "rpd": 1500})
                models_info.append({
                    "model_id": m_name,
                    "display_name": getattr(m, "display_name", m_name),
                    "supported_actions": getattr(m, "supported_generation_methods", []),
                    "rpm": limits["rpm"],
                    "tpm": limits["tpm"],
                    "rpd": limits["rpd"]
                })
        except Exception as e:
            print(f"[GeminiEvalClient] Could not fetch live model list ({e}). Using preset defaults.")
            for name, lim in DEFAULT_RATE_LIMITS.items():
                models_info.append({"model_id": name, "rpm": lim["rpm"], "tpm": lim["tpm"], "rpd": lim["rpd"]})
                
        return models_info

    def get_best_judge_model(self) -> str:
        """Selects optimal Flash-Lite class model for high-quota LLM judge evaluations."""
        available = [m["model_id"] for m in self.list_available_models()]
        for candidate in ["gemini-2.5-flash-lite", "gemini-2.0-flash-lite", "gemini-1.5-flash-8b", "gemini-1.5-flash"]:
            if candidate in available or not available:
                return candidate
        return "gemini-2.5-flash-lite"

    def get_best_gen_model(self) -> str:
        """Selects strongest Flash model for batch golden question synthesis."""
        available = [m["model_id"] for m in self.list_available_models()]
        for candidate in ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-1.5-flash"]:
            if candidate in available or not available:
                return candidate
        return "gemini-2.5-flash"

    def generate_text(
        self,
        prompt: str,
        model_name: Optional[str] = None,
        temperature: float = 0.0,
        use_cache: bool = True,
        dry_run: bool = False
    ) -> Dict[str, Any]:
        """
        Executes text generation with rate limiting, retries, and disk caching.
        """
        model = model_name or self.get_best_judge_model()
        
        # 1. Dry Run Estimation
        if dry_run:
            est_tokens = len(prompt.split()) * 2
            return {
                "text": "[DRY RUN] Output would be generated by " + model,
                "usage": {"prompt_tokens": est_tokens, "candidates_tokens": 100, "total_tokens": est_tokens + 100},
                "cached": False,
                "model": model,
                "estimated_cost_usd": 0.0
            }
            
        # 2. Check Disk Cache
        if use_cache:
            cached_res = self.cache.get(model, prompt, temperature)
            if cached_res:
                return {
                    "text": cached_res[0],
                    "usage": cached_res[1],
                    "cached": True,
                    "model": model
                }
                
        if not self.client:
            raise ValueError("GEMINI_API_KEY is required for live LLM execution. Set it in .env.")

        # 3. Rate Limiter with Jitter
        now = time.time()
        elapsed = now - self._last_request_time
        if elapsed < self._min_request_interval_s:
            sleep_time = (self._min_request_interval_s - elapsed) + random.uniform(0.1, 0.5)
            time.sleep(sleep_time)
            
        # 4. Execute with Exponential Backoff
        max_retries = 5
        base_delay = 2.0
        
        for attempt in range(max_retries):
            try:
                from google.genai import types
                res = self.client.models.generate_content(
                    model=model,
                    contents=prompt,
                    config=types.GenerateContentConfig(
                        temperature=temperature,
                    )
                )
                self._last_request_time = time.time()
                self._daily_calls_count += 1
                
                resp_text = res.text or ""
                usage_meta = getattr(res, "usage_metadata", None)
                usage = {
                    "prompt_tokens": getattr(usage_meta, "prompt_token_count", len(prompt.split()) * 2) if usage_meta else len(prompt.split()) * 2,
                    "candidates_tokens": getattr(usage_meta, "candidates_token_count", len(resp_text.split()) * 2) if usage_meta else len(resp_text.split()) * 2,
                }
                usage["total_tokens"] = usage["prompt_tokens"] + usage["candidates_tokens"]
                
                # Save to disk cache
                if use_cache:
                    self.cache.set(model, prompt, temperature, resp_text, usage)
                    
                return {
                    "text": resp_text,
                    "usage": usage,
                    "cached": False,
                    "model": model
                }
            except Exception as e:
                err_str = str(e).lower()
                if "429" in err_str or "resource_exhausted" in err_str or "rate limit" in err_str:
                    wait = (base_delay * (2 ** attempt)) + random.uniform(0.5, 1.5)
                    print(f"[GeminiEvalClient] Rate limited. Backing off for {wait:.2f}s (Attempt {attempt+1}/{max_retries})...")
                    time.sleep(wait)
                else:
                    if attempt == max_retries - 1:
                        raise e
                    time.sleep(1.0)

        raise RuntimeError(f"Gemini API request failed after {max_retries} retries.")
