import { ChunkItem, VectorResult } from '../types';

export const EMBEDDING_DIM = 128;

// Semantic concept anchors for Vietnamese electricity utility domain
const SEMANTIC_TOPIC_ANCHORS: { name: string; keywords: string[]; vectorWeights: number[] }[] = [
  {
    name: 'electrical_safety_emergency',
    keywords: ['an toàn', 'đứt dây', 'phóng điện', 'chạm đất', 'chập cháy', 'cứu hỏa', 'ngập lụt', 'aptomat', 'cầu dao', 'nguy hiểm', '10 mét', 'bán kính', 'tai nạn', 'khoảng cách', '22kv', '110kv', '500kv'],
    vectorWeights: [0.9, 0.8, 0.7, 0.6]
  },
  {
    name: 'outage_reporting_dispatch',
    keywords: ['báo mất điện', 'mất điện', 'sự cố', '19001909', 'scada', 'điều độ', 'đội sửa chữa', '30 phút', 'khẩn cấp', 'tổng đài', 'zalo oa', 'phục hồi'],
    vectorWeights: [0.7, 0.9, 0.8, 0.5]
  },
  {
    name: 'restoration_time_sla',
    keywords: ['thời gian', 'khôi phục', 'cấp điện', 'tiêu chuẩn', '2 giờ', '4 giờ', '8 giờ', '24 giờ', 'cấp độ', 'máy biến áp', 'hạ thế', 'trung thế', 'bão lũ'],
    vectorWeights: [0.6, 0.7, 0.9, 0.6]
  },
  {
    name: 'maintenance_schedule',
    keywords: ['bảo trì', 'kế hoạch', 'cắt điện định kỳ', 'thông báo', '5 ngày', '7 ngày', '10 giờ', 'sửa chữa', 'nâng cấp', 'lộ đường dây', 'lưới điện', 'thời hạn'],
    vectorWeights: [0.5, 0.6, 0.8, 0.9]
  },
  {
    name: 'electricity_tariff_billing',
    keywords: ['giá điện', 'biểu giá', 'bậc thang', 'lũy tiến', 'bậc 1', 'bậc 2', 'bậc 3', 'bậc 4', 'bậc 5', 'bậc 6', 'kwh', '1893', '1956', '2271', '2860', '3197', '3302', 'vat 8%', 'tiền điện', 'hóa đơn', 'hộ nghèo'],
    vectorWeights: [0.8, 0.9, 0.7, 0.8]
  },
  {
    name: 'meter_installation_relocation',
    keywords: ['lắp đặt', 'công tơ', 'điện kế', 'di dời', 'hồ sơ', 'cccd', '3 ngày', 'miễn phí', 'dây dẫn', 'sau công tơ', 'công tơ điện tử', 'nâng công suất', 'mua điện'],
    vectorWeights: [0.6, 0.8, 0.7, 0.9]
  },
  {
    name: 'compensation_outage_support',
    keywords: ['bồi thường', 'hỗ trợ', 'mất điện kéo dài', 'quá 8 giờ', '16 giờ', '24 giờ', '150.000', 'chi phí sinh hoạt', 'giảm 10%', 'hư hỏng', 'cháy thiết bị', 'quá áp', 'bảo hiểm', 'giám định'],
    vectorWeights: [0.9, 0.7, 0.8, 0.7]
  },
  {
    name: 'energy_saving_dispute',
    keywords: ['tiết kiệm', 'máy lạnh', 'điều hòa', '26 độ', '28 độ', 'tăng cao', 'bất thường', 'phúc tra', '30%', 'rò điện', 'âm tường', 'kiểm định', 'sai số', 'khiếu nại'],
    vectorWeights: [0.7, 0.8, 0.9, 0.8]
  }
];

// Hash function to map tokens deterministically to dimension indices
function hashToken(str: string, seed: number = 0): number {
  let hash = 0x811c9dc5 ^ seed;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0);
}

// Compute a dense semantic vector embedding for a piece of text
export function computeEmbedding(text: string, dim: number = EMBEDDING_DIM): number[] {
  const vec = new Float64Array(dim);
  const clean = text.toLowerCase();
  const words = clean.split(/\s+/).filter(w => w.length > 1);

  if (words.length === 0) {
    return Array.from(vec);
  }

  // 1. Topic anchor projection (semantic clustering)
  SEMANTIC_TOPIC_ANCHORS.forEach((anchor, topicIdx) => {
    let matchCount = 0;
    for (const kw of anchor.keywords) {
      if (clean.includes(kw)) {
        matchCount += kw.length > 3 ? 1.5 : 1.0;
      }
    }

    if (matchCount > 0) {
      const topicStrength = Math.min(matchCount / 3.0, 2.5);
      // Project into dedicated dimension block for this topic
      const blockStart = topicIdx * 12;
      for (let i = 0; i < 12; i++) {
        const idx = (blockStart + i) % dim;
        const weight = anchor.vectorWeights[i % anchor.vectorWeights.length];
        vec[idx] += topicStrength * weight;
      }
    }
  });

  // 2. Subword & N-gram distributional hashing projection (lexical nuances)
  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    const h1 = hashToken(word, 42) % dim;
    const h2 = hashToken(word, 99) % dim;
    const h3 = hashToken(word, 137) % dim;

    const termWeight = 1.0 / Math.sqrt(i + 1); // positional decay
    vec[h1] += termWeight * 0.45;
    vec[h2] += termWeight * 0.35;
    vec[h3] -= termWeight * 0.25;

    // Bigram hashing
    if (i < words.length - 1) {
      const bigram = `${words[i]}_${words[i + 1]}`;
      const hb1 = hashToken(bigram, 256) % dim;
      const hb2 = hashToken(bigram, 512) % dim;
      vec[hb1] += 0.6;
      vec[hb2] += 0.4;
    }
  }

  // 3. L2 Normalization (so dot product equals cosine similarity)
  let norm = 0;
  for (let i = 0; i < dim; i++) {
    norm += vec[i] * vec[i];
  }
  norm = Math.sqrt(norm);

  if (norm > 0) {
    for (let i = 0; i < dim; i++) {
      vec[i] = vec[i] / norm;
    }
  }

  return Array.from(vec);
}

// Compute exact cosine similarity between two normalized vectors
export function cosineSimilarity(vecA: number[], vecB: number[]): number {
  if (vecA.length !== vecB.length || vecA.length === 0) return 0;
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }

  const denominator = Math.sqrt(normA) * Math.sqrt(normB);
  if (denominator === 0) return 0;
  
  // Range clamped to [-1, 1] then scaled for positive similarity
  const sim = dotProduct / denominator;
  return Math.max(0, Math.min(1, sim));
}

export class VectorStore {
  private chunks: ChunkItem[] = [];
  private vectors: number[][] = [];

  public buildIndex(chunks: ChunkItem[]): void {
    this.chunks = chunks;
    this.vectors = [];

    for (const chunk of chunks) {
      const combinedText = `${chunk.docTitle} - ${chunk.sectionHeading}\n${chunk.content}`;
      const embedding = computeEmbedding(combinedText);
      chunk.vector = embedding;
      this.vectors.push(embedding);
    }
  }

  public search(query: string, topK: number = 10, filterFn?: (chunk: ChunkItem) => boolean): { results: VectorResult[]; queryVector: number[] } {
    if (this.chunks.length === 0) return { results: [], queryVector: [] };
    const queryVector = computeEmbedding(query);

    const scored: { chunkIndex: number; similarity: number }[] = [];

    for (let i = 0; i < this.chunks.length; i++) {
      if (filterFn && !filterFn(this.chunks[i])) {
        continue;
      }
      const sim = cosineSimilarity(queryVector, this.vectors[i]);
      scored.push({ chunkIndex: i, similarity: sim });
    }

    // Sort descending by cosine similarity
    scored.sort((a, b) => b.similarity - a.similarity);

    const results: VectorResult[] = scored.slice(0, topK).map((item, idx) => ({
      chunkId: this.chunks[item.chunkIndex].id,
      chunk: this.chunks[item.chunkIndex],
      similarity: Number(item.similarity.toFixed(4)),
      rank: idx + 1,
    }));

    return { results, queryVector };
  }

  public getAllVectors(): number[][] {
    return this.vectors;
  }

  public getChunks(): ChunkItem[] {
    return this.chunks;
  }
}
