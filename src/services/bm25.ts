import { ChunkItem, BM25Result } from '../types';

// Stopwords in Vietnamese commonly found in general queries
const VIETNAMESE_STOPWORDS = new Set([
  'và', 'hoặc', 'là', 'của', 'ở', 'tại', 'trong', 'với', 'cho', 'về', 'như',
  'được', 'bị', 'các', 'những', 'một', 'này', 'đó', 'thì', 'sẽ', 'đã', 'đang',
  'làm', 'sao', 'gì', 'nào', 'khi', 'nếu', 'có', 'thế', 'thì', 'ơi', 'à', 'nhé'
]);

export function tokenizeVietnamese(text: string): string[] {
  // Normalize, lowercase and remove punctuation
  const clean = text
    .toLowerCase()
    .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?"'<>\[\]\\|]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const rawTokens = clean.split(' ').filter(t => t.length > 1);
  
  // Extract unigrams and bigrams for better Vietnamese phrasing match (e.g. 'công tơ', 'bảo trì', 'an toàn')
  const tokens: string[] = [];
  for (let i = 0; i < rawTokens.length; i++) {
    const unigram = rawTokens[i];
    if (!VIETNAMESE_STOPWORDS.has(unigram)) {
      tokens.push(unigram);
    }
    if (i < rawTokens.length - 1) {
      const bigram = `${rawTokens[i]} ${rawTokens[i + 1]}`;
      tokens.push(bigram);
    }
  }

  return tokens;
}

export class BM25Engine {
  private chunks: ChunkItem[] = [];
  private docTokens: string[][] = [];
  private docLengths: number[] = [];
  private avgDocLength: number = 0;
  private df: Map<string, number> = new Map(); // Document frequency per term
  private idf: Map<string, number> = new Map();
  private k1: number = 1.5;
  private b: number = 0.75;

  constructor(k1 = 1.5, b = 0.75) {
    this.k1 = k1;
    this.b = b;
  }

  public index(chunks: ChunkItem[]): void {
    this.chunks = chunks;
    this.docTokens = [];
    this.docLengths = [];
    this.df.clear();
    this.idf.clear();

    const N = chunks.length;
    let totalLength = 0;

    // Tokenize each chunk
    for (const chunk of chunks) {
      const combinedText = `${chunk.docTitle} ${chunk.sectionHeading} ${chunk.content}`;
      const tokens = tokenizeVietnamese(combinedText);
      this.docTokens.push(tokens);
      this.docLengths.push(tokens.length);
      totalLength += tokens.length;

      const uniqueTerms = new Set(tokens);
      for (const term of uniqueTerms) {
        this.df.set(term, (this.df.get(term) || 0) + 1);
      }
    }

    this.avgDocLength = N > 0 ? totalLength / N : 1;

    // Compute IDF for all terms
    for (const [term, freq] of this.df.entries()) {
      // Standard BM25 IDF formula
      const idfVal = Math.log(1 + (N - freq + 0.5) / (freq + 0.5));
      this.idf.set(term, Math.max(idfVal, 0.05));
    }
  }

  public search(query: string, topK: number = 10, filterFn?: (chunk: ChunkItem) => boolean): BM25Result[] {
    if (this.chunks.length === 0) return [];
    const queryTokens = tokenizeVietnamese(query);
    if (queryTokens.length === 0) return [];

    const scores: { chunkIndex: number; score: number; matchedTerms: string[] }[] = [];

    for (let i = 0; i < this.chunks.length; i++) {
      if (filterFn && !filterFn(this.chunks[i])) {
        continue;
      }

      const tokens = this.docTokens[i];
      const docLen = this.docLengths[i];
      let score = 0;
      const matchedTerms: string[] = [];

      // Count term frequencies in this doc
      const tfMap = new Map<string, number>();
      for (const token of tokens) {
        tfMap.set(token, (tfMap.get(token) || 0) + 1);
      }

      for (const qTerm of queryTokens) {
        const tf = tfMap.get(qTerm) || 0;
        if (tf > 0) {
          const idfVal = this.idf.get(qTerm) || 0.1;
          const numerator = tf * (this.k1 + 1);
          const denominator = tf + this.k1 * (1 - this.b + this.b * (docLen / this.avgDocLength));
          score += idfVal * (numerator / denominator);
          if (!matchedTerms.includes(qTerm)) {
            matchedTerms.push(qTerm);
          }
        }
      }

      // Bonus if match occurs in sectionHeading or docTitle
      const headingLower = (this.chunks[i].sectionHeading + ' ' + this.chunks[i].docTitle).toLowerCase();
      for (const qTerm of queryTokens) {
        if (headingLower.includes(qTerm)) {
          score += 0.8;
        }
      }

      if (score > 0) {
        scores.push({ chunkIndex: i, score, matchedTerms });
      }
    }

    // Sort descending by score
    scores.sort((a, b) => b.score - a.score);

    return scores.slice(0, topK).map((item, idx) => ({
      chunkId: this.chunks[item.chunkIndex].id,
      chunk: this.chunks[item.chunkIndex],
      score: Number(item.score.toFixed(4)),
      rank: idx + 1,
      matchedTerms: item.matchedTerms,
    }));
  }
}
