import os
import sys
import json
from pathlib import Path
from dotenv import load_dotenv

# Automatically load .env from current directory or langgraph_lab directory
current_dir = Path(__file__).resolve().parent
env_path = current_dir / ".env"
if env_path.exists():
    load_dotenv(dotenv_path=env_path)
else:
    load_dotenv()

# Ensure langgraph_lab is on sys.path
sys.path.insert(0, str(current_dir))

import psycopg2
from psycopg2.extras import execute_values
from app.embeddings import global_embedder

def parse_date_to_iso(date_str: str) -> str:
    """Converts DD/MM/YYYY to YYYY-MM-DD for PostgreSQL DATE column."""
    if not date_str:
        return "2024-01-01"
    parts = date_str.strip().split('/')
    if len(parts) == 3:
        day, month, year = parts
        return f"{year}-{month.zfill(2)}-{day.zfill(2)}"
    return date_str

def init_tables(cursor, conn) -> bool:
    """
    Initializes all database tables with adaptive support:
    - If pgvector extension is available: uses vector(1536) + HNSW index.
    - If pgvector is not installed: uses FLOAT8[] array for universal PostgreSQL compatibility.
    """
    has_vector_ext = False
    try:
        cursor.execute("CREATE EXTENSION IF NOT EXISTS vector;")
        conn.commit()
        has_vector_ext = True
        print("[Seeder] pgvector extension: ENABLED (Native HNSW Cosine Indexing)")
    except Exception as e:
        conn.rollback()
        has_vector_ext = False
        print("[Seeder] pgvector extension not found on native Postgres -> Using FLOAT8[] array format with Full-Text Search GIN indexing.")

    # 1. evn_documents
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS evn_documents (
            id VARCHAR(64) PRIMARY KEY,
            doc_code VARCHAR(64) NOT NULL UNIQUE,
            title VARCHAR(512) NOT NULL,
            category VARCHAR(128) NOT NULL,
            effective_date DATE NOT NULL,
            summary TEXT,
            content TEXT,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
        CREATE INDEX IF NOT EXISTS idx_evn_docs_effective_date ON evn_documents (effective_date);
        CREATE INDEX IF NOT EXISTS idx_evn_docs_category ON evn_documents (category);
    """)
    conn.commit()

    # 2. evn_document_chunks
    if has_vector_ext:
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS evn_document_chunks (
                id VARCHAR(64) PRIMARY KEY,
                doc_id VARCHAR(64) NOT NULL REFERENCES evn_documents(id) ON DELETE CASCADE,
                doc_code VARCHAR(64) NOT NULL,
                doc_title VARCHAR(512) NOT NULL,
                category VARCHAR(128) NOT NULL,
                effective_date DATE NOT NULL,
                chunk_index INT NOT NULL,
                total_chunks INT NOT NULL,
                section_heading VARCHAR(256),
                content TEXT NOT NULL,
                token_count INT NOT NULL,
                embedding vector(1536) NOT NULL,
                metadata JSONB DEFAULT '{}'::jsonb,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
            CREATE INDEX IF NOT EXISTS idx_chunks_hnsw_cosine ON evn_document_chunks 
            USING hnsw (embedding vector_cosine_ops) WITH (m = 16, ef_construction = 64);
        """)
    else:
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS evn_document_chunks (
                id VARCHAR(64) PRIMARY KEY,
                doc_id VARCHAR(64) NOT NULL REFERENCES evn_documents(id) ON DELETE CASCADE,
                doc_code VARCHAR(64) NOT NULL,
                doc_title VARCHAR(512) NOT NULL,
                category VARCHAR(128) NOT NULL,
                effective_date DATE NOT NULL,
                chunk_index INT NOT NULL,
                total_chunks INT NOT NULL,
                section_heading VARCHAR(256),
                content TEXT NOT NULL,
                token_count INT NOT NULL,
                embedding FLOAT8[] NOT NULL,
                metadata JSONB DEFAULT '{}'::jsonb,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
        """)
    conn.commit()

    # Full-Text Search index
    try:
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_chunks_fts_gin ON evn_document_chunks 
            USING gin (to_tsvector('simple', doc_title || ' ' || coalesce(section_heading, '') || ' ' || content));
            CREATE INDEX IF NOT EXISTS idx_chunks_doc_id ON evn_document_chunks (doc_id);
            CREATE INDEX IF NOT EXISTS idx_chunks_date ON evn_document_chunks (effective_date);
            CREATE INDEX IF NOT EXISTS idx_chunks_metadata_gin ON evn_document_chunks USING gin (metadata);
        """)
        conn.commit()
    except Exception:
        conn.rollback()

    # 3. langgraph_checkpoints
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS langgraph_checkpoints (
            thread_id VARCHAR(128) NOT NULL,
            checkpoint_id VARCHAR(128) NOT NULL,
            parent_checkpoint_id VARCHAR(128),
            node_name VARCHAR(128),
            state_payload JSONB NOT NULL,
            is_paused BOOLEAN DEFAULT FALSE,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (thread_id, checkpoint_id)
        );
        CREATE INDEX IF NOT EXISTS idx_checkpoints_thread ON langgraph_checkpoints (thread_id);
    """)
    conn.commit()

    # 4. evn_customers & evn_bills
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS evn_customers (
            customer_id VARCHAR(32) PRIMARY KEY,
            customer_name VARCHAR(256) NOT NULL,
            address TEXT NOT NULL,
            phone VARCHAR(20),
            meter_id VARCHAR(32) NOT NULL,
            tariff_type VARCHAR(64) DEFAULT 'Sinh hoạt',
            voltage_level VARCHAR(32) DEFAULT 'Hạ áp 220V',
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS evn_bills (
            bill_id VARCHAR(32) PRIMARY KEY,
            customer_id VARCHAR(32) NOT NULL REFERENCES evn_customers(customer_id),
            billing_period VARCHAR(16) NOT NULL,
            kwh_consumed INT NOT NULL,
            total_amount NUMERIC(12, 2) NOT NULL,
            payment_status VARCHAR(32) DEFAULT 'PAID',
            due_date DATE,
            paid_date TIMESTAMP WITH TIME ZONE
        );
    """)
    conn.commit()
    print("[Seeder] All tables verified & initialized successfully!")
    return has_vector_ext

def seed_database():
    db_url = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/evn_powerbot_db")
    print(f"[Seeder] Connecting to PostgreSQL at: {db_url}")

    try:
        conn = psycopg2.connect(db_url)
        cursor = conn.cursor()
        print("[Seeder] Connected successfully!")
    except Exception as e:
        print(f"[Seeder] Error connecting to PostgreSQL: {e}")
        print("\n💡 Gợi ý:")
        print("1. Đảm bảo PostgreSQL đã chạy trên cổng 5432")
        print("2. Kiểm tra chuỗi kết nối DATABASE_URL trong file langgraph_lab/.env")
        return

    # 0. Initialize Tables
    has_vector_ext = init_tables(cursor, conn)

    # 1. Load documents.json
    doc_path = current_dir.parent / "src" / "data" / "documents.json"
    if not doc_path.exists():
        doc_path = Path(os.getcwd()) / "src" / "data" / "documents.json"

    with open(doc_path, "r", encoding="utf-8") as f:
        documents = json.load(f)

    print(f"[Seeder] Found {len(documents)} documents to seed...")

    doc_rows = []
    chunk_rows = []

    for doc in documents:
        doc_id = doc["id"]
        doc_code = doc["docCode"]
        title = doc["title"]
        category = doc["category"]
        effective_date = parse_date_to_iso(doc.get("effectiveDate", "01/01/2024"))
        summary = doc.get("summary", "")
        content = doc.get("content", "")

        doc_rows.append((
            doc_id, doc_code, title, category, effective_date, summary, content
        ))

        sections = doc.get("sections", [])
        for idx, sec in enumerate(sections):
            chunk_id = f"{doc_id}-sec-{idx+1}"
            heading = sec.get("heading", "")
            text = sec.get("text", "")
            combined_text = f"{title} - {heading}: {text}"
            
            # Generate Real 1536-Dimensional Embedding
            embedding_vec = global_embedder.embed_query(combined_text)
            
            # Format vector if pgvector extension is active
            formatted_vec = ("[" + ",".join(str(x) for x in embedding_vec) + "]") if has_vector_ext else embedding_vec

            chunk_metadata = {
                "section_index": idx + 1,
                "total_sections": len(sections),
                "department": doc.get("department", ""),
                "doc_type": doc.get("docType", ""),
                "category": category,
                "effective_date": doc.get("effectiveDate", ""),
                "legal_basis": doc.get("legalBasis", ""),
                "target_audience": doc.get("targetAudience", ""),
                "keywords": doc.get("keywords", [])
            }

            chunk_rows.append((
                chunk_id,
                doc_id,
                doc_code,
                title,
                category,
                effective_date,
                idx + 1,
                len(sections),
                heading,
                text,
                len(text.split()),
                formatted_vec,
                json.dumps(chunk_metadata, ensure_ascii=False)
            ))

    # Insert Documents
    doc_insert_sql = """
        INSERT INTO evn_documents (id, doc_code, title, category, effective_date, summary, content)
        VALUES %s
        ON CONFLICT (id) DO UPDATE SET
            title = EXCLUDED.title,
            category = EXCLUDED.category,
            effective_date = EXCLUDED.effective_date,
            summary = EXCLUDED.summary,
            content = EXCLUDED.content;
    """
    execute_values(cursor, doc_insert_sql, doc_rows)
    print(f"[Seeder] Seeded {len(doc_rows)} records into 'evn_documents'!")

    # Insert Chunks
    chunk_insert_sql = """
        INSERT INTO evn_document_chunks (
            id, doc_id, doc_code, doc_title, category, effective_date,
            chunk_index, total_chunks, section_heading, content, token_count,
            embedding, metadata
        )
        VALUES %s
        ON CONFLICT (id) DO UPDATE SET
            doc_code = EXCLUDED.doc_code,
            doc_title = EXCLUDED.doc_title,
            category = EXCLUDED.category,
            effective_date = EXCLUDED.effective_date,
            section_heading = EXCLUDED.section_heading,
            content = EXCLUDED.content,
            token_count = EXCLUDED.token_count,
            embedding = EXCLUDED.embedding,
            metadata = EXCLUDED.metadata;
    """
    execute_values(cursor, chunk_insert_sql, chunk_rows)
    print(f"[Seeder] Seeded {len(chunk_rows)} 1536D vector chunks into 'evn_document_chunks'!")

    # 2. Seed Customers & Bills
    cust_path = current_dir.parent / "src" / "data" / "customers.json"
    if not cust_path.exists():
        cust_path = Path(os.getcwd()) / "src" / "data" / "customers.json"

    if cust_path.exists():
        with open(cust_path, "r", encoding="utf-8") as f:
            customers = json.load(f)

        cust_rows = []
        bill_rows = []
        for c in customers:
            cid = c.get("customerId")
            name = c.get("fullName")
            addr = c.get("address")
            phone = c.get("phone")
            meter_id = c.get("meterReading", {}).get("meterId", "METER-01")
            tariff = c.get("customerType", "Sinh hoạt")
            cust_rows.append((cid, name, addr, phone, meter_id, tariff, "Hạ áp 220V"))

            cb = c.get("currentBill")
            if cb:
                bill_rows.append((
                    cb.get("billCode", f"HD-{cid}"),
                    cid,
                    cb.get("month", "08/2026"),
                    cb.get("totalKwh", 0),
                    cb.get("totalAmount", 0),
                    cb.get("paymentStatus", "CHƯA THANH TOÁN"),
                    parse_date_to_iso(cb.get("dueDate", "25/08/2026")),
                    None
                ))

        if cust_rows:
            cust_insert_sql = """
                INSERT INTO evn_customers (customer_id, customer_name, address, phone, meter_id, tariff_type, voltage_level)
                VALUES %s
                ON CONFLICT (customer_id) DO UPDATE SET
                    customer_name = EXCLUDED.customer_name,
                    address = EXCLUDED.address,
                    phone = EXCLUDED.phone;
            """
            execute_values(cursor, cust_insert_sql, cust_rows)
            print(f"[Seeder] Seeded {len(cust_rows)} customer records into 'evn_customers'!")

        if bill_rows:
            bill_insert_sql = """
                INSERT INTO evn_bills (bill_id, customer_id, billing_period, kwh_consumed, total_amount, payment_status, due_date, paid_date)
                VALUES %s
                ON CONFLICT (bill_id) DO UPDATE SET
                    total_amount = EXCLUDED.total_amount,
                    payment_status = EXCLUDED.payment_status;
            """
            execute_values(cursor, bill_insert_sql, bill_rows)
            print(f"[Seeder] Seeded {len(bill_rows)} bill records into 'evn_bills'!")

    conn.commit()
    cursor.close()
    conn.close()
    print("\n[Seeder] SUCCESS: All documents, 1536D chunks, and customer records successfully synced into PostgreSQL!")

if __name__ == "__main__":
    seed_database()


