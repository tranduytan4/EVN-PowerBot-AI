-- =========================================================================
-- EVN POWERBOT AI: POSTGRESQL + PGVECTOR PRODUCTION DDL & SEED DATA
-- =========================================================================

-- 1. Bật Extensions cần thiết
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Bảng Tài liệu Quy chuẩn EVN
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

-- 3. Bảng Đoạn Văn bản Vector (Chunks & Embeddings)
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
    -- Vector 1536 chiều tiêu chuẩn OpenAI text-embedding-3-small & SOTA Multilingual
    embedding vector(1536) NOT NULL,
    -- Full-text search vector cho Hybrid Search (Sparse)
    search_vector tsvector GENERATED ALWAYS AS (to_tsvector('simple', coalesce(doc_title, '') || ' ' || coalesce(section_heading, '') || ' ' || coalesce(content, ''))) STORED,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. HNSW Vector Index tối ưu Cosine Similarity (<=> operator)
CREATE INDEX IF NOT EXISTS idx_chunks_hnsw_cosine ON evn_document_chunks 
USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

-- 5. Full-Text Search GIN Index & B-Tree Metadata Pre-Filtering Indexes
CREATE INDEX IF NOT EXISTS idx_chunks_fts_gin ON evn_document_chunks USING gin (search_vector);
CREATE INDEX IF NOT EXISTS idx_chunks_doc_id ON evn_document_chunks (doc_id);
CREATE INDEX IF NOT EXISTS idx_chunks_date ON evn_document_chunks (effective_date);
CREATE INDEX IF NOT EXISTS idx_chunks_metadata_gin ON evn_document_chunks USING gin (metadata);

-- 6. Bảng Quản lý Thread State & Checkpoint (LangGraph)
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

-- 7. Bảng Dữ liệu Nghiệp vụ Khách hàng EVN (Relational Business Data)
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
    billing_period VARCHAR(16) NOT NULL, -- e.g. 05/2024
    kwh_consumed INT NOT NULL,
    total_amount NUMERIC(12, 2) NOT NULL,
    payment_status VARCHAR(32) DEFAULT 'PAID', -- PAID, UNPAID
    due_date DATE,
    paid_date TIMESTAMP WITH TIME ZONE
);

