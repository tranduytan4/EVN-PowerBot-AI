import { DocumentItem, ChunkItem, BM25Result, VectorResult, RRFResult, RerankResult, Vector2DPoint, CitationItem, DocumentDateFilter } from '../types';
import documentsData from '../data/documents.json';
import { chunkDocuments, ChunkingOptions } from './chunker';
import { BM25Engine } from './bm25';
import { VectorStore } from './vectorStore';
import { reciprocalRankFusion } from './rrf';
import { rerankCandidates } from './reranker';
import { computePCA2D } from './pca';
import { isDateInRange } from '../utils/dateFilter';

export interface RetrievalPipelineResult {
  allChunks: ChunkItem[];
  bm25Results: BM25Result[];
  vectorResults: VectorResult[];
  rrfResults: RRFResult[];
  rerankedResults: RerankResult[];
  vector2DPoints: Vector2DPoint[];
  query2DVector?: [number, number];
  citations: CitationItem[];
  retrievedContextText: string;
  timings: {
    chunkingMs: number;
    bm25SearchMs: number;
    vectorSearchMs: number;
    rrfFusionMs: number;
    rerankingMs: number;
    pcaProjectionMs: number;
    totalRetrievalMs: number;
  };
}

export class RAGPipelineService {
  private documents: DocumentItem[] = documentsData as DocumentItem[];
  private currentChunks: ChunkItem[] = [];
  private bm25Engine: BM25Engine = new BM25Engine();
  private vectorStore: VectorStore = new VectorStore();
  private currentChunkSize: number = 350;
  private currentOverlap: number = 60;
  private currentDateFilter: DocumentDateFilter = {};

  constructor() {
    this.reindex(350, 60);
  }

  public setDateFilter(filter: DocumentDateFilter): void {
    this.currentDateFilter = filter ? { ...filter } : {};
  }

  public getDateFilter(): DocumentDateFilter {
    return { ...this.currentDateFilter };
  }

  public clearDateFilter(): void {
    this.currentDateFilter = {};
  }

  public reindex(chunkSize: number, overlap: number): { chunkCount: number; durationMs: number } {
    const t0 = performance.now();
    this.currentChunkSize = chunkSize;
    this.currentOverlap = overlap;

    this.currentChunks = chunkDocuments(this.documents, {
      chunkSize,
      chunkOverlap: overlap,
    });

    this.bm25Engine.index(this.currentChunks);
    this.vectorStore.buildIndex(this.currentChunks);

    const durationMs = Math.round(performance.now() - t0);
    return { chunkCount: this.currentChunks.length, durationMs };
  }

  public getDocuments(): DocumentItem[] {
    return this.documents;
  }

  public getChunks(): ChunkItem[] {
    return this.currentChunks;
  }

  public getChunkingConfig() {
    return {
      chunkSize: this.currentChunkSize,
      overlap: this.currentOverlap,
      totalChunks: this.currentChunks.length,
    };
  }

  public retrieve(query: string, topK: number = 4, dateFilter?: DocumentDateFilter): RetrievalPipelineResult {
    const tStart = performance.now();

    const activeFilter = dateFilter !== undefined ? dateFilter : this.currentDateFilter;
    const hasDateFilter = Boolean(activeFilter && (activeFilter.startDate || activeFilter.endDate));
    const filterFn = hasDateFilter
      ? (chk: ChunkItem) => isDateInRange(chk.effectiveDate, activeFilter.startDate, activeFilter.endDate)
      : undefined;

    // 1. BM25 Search
    const tBM25 = performance.now();
    const bm25Results = this.bm25Engine.search(query, 10, filterFn);
    const bm25Ms = Math.round(performance.now() - tBM25);

    // 2. Vector Search (Cosine Similarity)
    const tVec = performance.now();
    const { results: vectorResults, queryVector } = this.vectorStore.search(query, 10, filterFn);
    const vectorMs = Math.round(performance.now() - tVec);

    // 3. Hybrid RRF Fusion
    const tRRF = performance.now();
    const rrfResults = reciprocalRankFusion(bm25Results, vectorResults, 60, 8);
    const rrfMs = Math.round(performance.now() - tRRF);

    // 4. Reranking
    const tRerank = performance.now();
    const rerankedResults = rerankCandidates(query, rrfResults, topK);
    const rerankMs = Math.round(performance.now() - tRerank);

    // 5. 2D PCA Dimensionality Reduction
    const tPCA = performance.now();
    const topKChunkIds = rerankedResults.map(r => r.chunkId);
    const { points: vector2DPoints, queryPoint } = computePCA2D(
      this.currentChunks,
      queryVector,
      topKChunkIds
    );
    if (queryPoint) {
      vector2DPoints.push(queryPoint);
    }
    const pcaMs = Math.round(performance.now() - tPCA);

    // 6. Build Citations & Context Text
    const citations: CitationItem[] = rerankedResults.map(r => ({
      chunkId: r.chunk.id,
      docCode: r.chunk.docCode,
      docTitle: r.chunk.docTitle,
      sectionHeading: r.chunk.sectionHeading,
      department: r.chunk.department,
      effectiveDate: r.chunk.effectiveDate,
      excerpt: r.chunk.content.length > 220 ? r.chunk.content.substring(0, 220) + '...' : r.chunk.content,
      similarityScore: r.chunk.vector ? 0.85 : 0.7,
    }));

    const retrievedContextText = rerankedResults
      .map((r, i) => `[Đoạn ${i + 1} - ${r.chunk.docTitle} (${r.chunk.docCode}) - ${r.chunk.sectionHeading}]:\n${r.chunk.content}`)
      .join('\n\n');

    const totalRetrievalMs = Math.round(performance.now() - tStart);

    return {
      allChunks: this.currentChunks,
      bm25Results,
      vectorResults,
      rrfResults,
      rerankedResults,
      vector2DPoints,
      query2DVector: queryPoint ? [queryPoint.x, queryPoint.y] : undefined,
      citations,
      retrievedContextText,
      timings: {
        chunkingMs: 0,
        bm25SearchMs: bm25Ms,
        vectorSearchMs: vectorMs,
        rrfFusionMs: rrfMs,
        rerankingMs: rerankMs,
        pcaProjectionMs: pcaMs,
        totalRetrievalMs,
      },
    };
  }
}

// Global Singleton instance for seamless state across components
export const ragPipeline = new RAGPipelineService();
