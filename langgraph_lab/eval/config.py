import os
from typing import Optional, List, Dict, Any
from dataclasses import dataclass, field
from pathlib import Path
from dotenv import load_dotenv

# Automatically load .env
_env_file = Path(__file__).resolve().parent.parent / ".env"
if _env_file.exists():
    load_dotenv(dotenv_path=_env_file)
else:
    load_dotenv()

@dataclass
class EvalConfig:
    """
    Configuration for an Evaluation Run.
    Specifies the combination of Corpus, Sparse Backend, Embedding Backend,
    Reranker Backend, and Retrieval Mode.
    """
    name: str = "baseline_v0"
    corpus_scope: str = "core"            # 'core' (default 12/20 docs) | 'extended'
    sparse_backend: str = "legacy"        # 'legacy' (simple tsvector) | 'vi_unaccent' | 'bm25'
    embedding_backend: str = "legacy"     # 'legacy' (1536D heuristic) | 'gemini' | 'bge-m3'
    reranker_backend: str = "legacy"      # 'legacy' (heuristic re-scorer) | 'bge_reranker_v2_m3'
    retrieval_mode: str = "hybrid_rrf_rerank" # 'dense' | 'sparse' | 'hybrid_rrf' | 'hybrid_rrf_rerank'
    top_k: int = 5
    candidate_pool_size: int = 15
    cache_enabled: bool = False           # Always False during evaluation
    eval_mode: bool = True                # Bypasses Redis semantic cache read/write
    split: str = "dev"                    # 'dev' | 'test' | 'all'
    output_dir: str = "eval/results"
    judge_model: str = "gemini-2.5-flash-lite"
    gen_model: str = "gemini-2.5-flash"

# Standard Named Evaluation Configurations
PRESET_CONFIGS: Dict[str, EvalConfig] = {
    "baseline_v0": EvalConfig(
        name="baseline_v0",
        corpus_scope="core",
        sparse_backend="legacy",
        embedding_backend="legacy",
        reranker_backend="legacy",
        retrieval_mode="hybrid_rrf_rerank",
        cache_enabled=False
    ),
    "dense_only_legacy": EvalConfig(
        name="dense_only_legacy",
        corpus_scope="core",
        sparse_backend="legacy",
        embedding_backend="legacy",
        reranker_backend="legacy",
        retrieval_mode="dense",
        cache_enabled=False
    ),
    "sparse_only_legacy": EvalConfig(
        name="sparse_only_legacy",
        corpus_scope="core",
        sparse_backend="legacy",
        embedding_backend="legacy",
        reranker_backend="legacy",
        retrieval_mode="sparse",
        cache_enabled=False
    ),
    "hybrid_rrf_no_rerank": EvalConfig(
        name="hybrid_rrf_no_rerank",
        corpus_scope="core",
        sparse_backend="legacy",
        embedding_backend="legacy",
        reranker_backend="legacy",
        retrieval_mode="hybrid_rrf",
        cache_enabled=False
    ),
    "vi_unaccent_hybrid": EvalConfig(
        name="vi_unaccent_hybrid",
        corpus_scope="extended",
        sparse_backend="vi_unaccent",
        embedding_backend="legacy",
        reranker_backend="legacy",
        retrieval_mode="hybrid_rrf_rerank",
        cache_enabled=False
    ),
    "gemini_embedding_hybrid": EvalConfig(
        name="gemini_embedding_hybrid",
        corpus_scope="extended",
        sparse_backend="legacy",
        embedding_backend="gemini",
        reranker_backend="legacy",
        retrieval_mode="hybrid_rrf_rerank",
        cache_enabled=False
    ),
    "gemini_embedding_vi_unaccent": EvalConfig(
        name="gemini_embedding_vi_unaccent",
        corpus_scope="extended",
        sparse_backend="vi_unaccent",
        embedding_backend="gemini",
        reranker_backend="legacy",
        retrieval_mode="hybrid_rrf_rerank",
        cache_enabled=False
    ),
    "full_sota_pipeline": EvalConfig(
        name="full_sota_pipeline",
        corpus_scope="extended",
        sparse_backend="vi_unaccent",
        embedding_backend="gemini",
        reranker_backend="bge_reranker_v2_m3",
        retrieval_mode="hybrid_rrf_rerank",
        cache_enabled=False
    )
}

def get_eval_config(config_name: str, split: str = "dev", **overrides) -> EvalConfig:
    """Retrieves an EvalConfig by preset name or instantiates with overrides."""
    if config_name in PRESET_CONFIGS:
        cfg = PRESET_CONFIGS[config_name]
        # Create shallow copy with overrides
        data = {k: getattr(cfg, k) for k in cfg.__dataclass_fields__}
        data["split"] = split
        data.update(overrides)
        return EvalConfig(**data)
    
    return EvalConfig(name=config_name, split=split, **overrides)
