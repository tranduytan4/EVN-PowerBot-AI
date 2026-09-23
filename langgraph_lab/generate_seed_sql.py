import json
import os
import re

def normalize_vietnamese(text: str) -> str:
    if not text: return ""
    clean = text.lower().strip()
    clean = re.sub(r'[.,\/#!$%\^&\*;:{}=\-_`~()?"\'<>\[\]\\|]', ' ', clean)
    return re.sub(r'\s+', ' ', clean).strip()

def compute_text_embedding(text: str, dim: int = 64):
    normalized = normalize_vietnamese(text)
    words = normalized.split()
    if not words: return [0.0] * dim
    vec = [0.0] * dim
    anchors = [
        (["biểu giá", "giá điện", "bậc thang", "bậc 1", "kwh", "tiền điện", "2025"], [1.0, 0.8, 0.6, 0.5, 0.7, 0.9, 0.4, 0.8]),
        (["công tơ", "chỉ số", "đo xa", "amr", "chốt chỉ số", "đồng hồ"], [0.9, 0.8, 0.7, 0.6, 0.5, 0.9, 0.7, 0.6]),
        (["hóa đơn", "thanh toán", "tiền điện", "nợ cước"], [0.8, 0.9, 0.7, 0.6, 0.5, 0.8, 0.7, 0.9]),
        (["an toàn", "dây đứt", "ngập nước", "10 mét"], [0.9, 0.7, 0.8, 0.9, 0.6, 0.7, 0.8, 0.5]),
        (["cắt điện", "mất điện", "bồi thường", "8 giờ"], [0.7, 0.9, 0.8, 0.9, 0.6, 0.8, 0.7, 0.9]),
        (["phúc tra", "khiếu nại", "kiểm tra công tơ"], [0.8, 0.7, 0.9, 0.8, 0.7, 0.6, 0.8, 0.7])
    ]
    for topic_idx, (keywords, weights) in enumerate(anchors):
        match_count = sum(2.0 if " " in kw else 1.0 for kw in keywords if kw in normalized)
        if match_count > 0:
            topic_strength = min(match_count / 2.0, 4.0)
            block_start = (topic_idx * 8) % dim
            for i, w in enumerate(weights):
                vec[(block_start + i) % dim] += topic_strength * w
    for i in range(len(words)):
        h1 = (hash(words[i]) ^ 0x5bd1e995) % dim
        vec[h1] += 0.35
    norm = sum(v * v for v in vec) ** 0.5
    if norm > 1e-6: vec = [round(v / norm, 4) for v in vec]
    return vec

def parse_date(d):
    if not d: return "2024-01-01"
    p = d.split('/')
    return f"{p[2]}-{p[1].zfill(2)}-{p[0].zfill(2)}" if len(p) == 3 else d

current_dir = os.path.dirname(os.path.abspath(__file__))
with open(os.path.join(current_dir, "..", "src", "data", "documents.json"), "r", encoding="utf-8") as f:
    docs = json.load(f)

sql_lines = [
    "-- =========================================================================",
    "-- EVN POWERBOT AI: SEED DỮ LIỆU THẬT 8 TÀI LIỆU & 32 VECTOR CHUNKS VÀO POSTGRESQL",
    "-- (Mở Query Tool trong pgAdmin 4 dán vào rồi bấm F5)",
    "-- =========================================================================\n"
]

# Documents
sql_lines.append("-- 1. NẠP 8 VĂN BẢN QUY CHUẨN EVN")
sql_lines.append("INSERT INTO evn_documents (id, doc_code, title, category, effective_date, summary, content) VALUES")
doc_vals = []
for d in docs:
    val = f"('{d['id']}', '{d['docCode']}', '{d['title'].replace("'", "''")}', '{d['category']}', '{parse_date(d.get('effectiveDate'))}', '{d.get('summary','').replace("'", "''")}', '{d.get('content','').replace("'", "''")}')"
    doc_vals.append(val)
sql_lines.append(",\n".join(doc_vals))
sql_lines.append("ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title, content = EXCLUDED.content;\n")

# Chunks
sql_lines.append("-- 2. NẠP 32 VECTOR CHUNKS KÈM EMBEDDING 64 CHIỀU")
sql_lines.append("INSERT INTO evn_document_chunks (id, doc_id, doc_code, doc_title, category, effective_date, chunk_index, total_chunks, section_heading, content, token_count, embedding, metadata) VALUES")
chunk_vals = []
for d in docs:
    sections = d.get("sections", [])
    for idx, s in enumerate(sections):
        cid = f"{d['id']}-sec-{idx+1}"
        text = s.get('text', '')
        heading = s.get('heading', '')
        emb = compute_text_embedding(f"{d['title']} - {heading}: {text}")
        emb_sql = "'{" + ",".join(str(x) for x in emb) + "}'::float8[]"
        meta = json.dumps({"section_index": idx + 1, "department": d.get("department", "")}, ensure_ascii=False)
        val = f"('{cid}', '{d['id']}', '{d['docCode']}', '{d['title'].replace("'", "''")}', '{d['category']}', '{parse_date(d.get('effectiveDate'))}', {idx+1}, {len(sections)}, '{heading.replace("'", "''")}', '{text.replace("'", "''")}', {len(text.split())}, {emb_sql}, '{meta}'::jsonb)"
        chunk_vals.append(val)
sql_lines.append(",\n".join(chunk_vals))
sql_lines.append("ON CONFLICT (id) DO UPDATE SET section_heading = EXCLUDED.section_heading, content = EXCLUDED.content, embedding = EXCLUDED.embedding;\n")

with open(os.path.join(current_dir, "seed_all_chunks.sql"), "w", encoding="utf-8") as f:
    f.write("\n".join(sql_lines))

print("Created seed_all_chunks.sql successfully!")
