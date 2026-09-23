import { BM25Result, VectorResult, RRFResult, ChunkItem } from '../types';

export function reciprocalRankFusion(
  bm25Results: BM25Result[],
  vectorResults: VectorResult[],
  k: number = 60,
  topK: number = 8
): RRFResult[] {
  const scoreMap = new Map<string, {
    chunk: ChunkItem;
    bm25Score: number;
    bm25Rank: number;
    vectorSim: number;
    vectorRank: number;
    rrfScore: number;
  }>();

  // Process BM25 rankings
  bm25Results.forEach((res) => {
    scoreMap.set(res.chunkId, {
      chunk: res.chunk,
      bm25Score: res.score,
      bm25Rank: res.rank,
      vectorSim: 0,
      vectorRank: 999, // default unranked
      rrfScore: 1 / (k + res.rank),
    });
  });

  // Process Vector rankings and accumulate RRF
  vectorResults.forEach((res) => {
    const existing = scoreMap.get(res.chunkId);
    if (existing) {
      existing.vectorSim = res.similarity;
      existing.vectorRank = res.rank;
      existing.rrfScore += 1 / (k + res.rank);
    } else {
      scoreMap.set(res.chunkId, {
        chunk: res.chunk,
        bm25Score: 0,
        bm25Rank: 999,
        vectorSim: res.similarity,
        vectorRank: res.rank,
        rrfScore: 1 / (k + res.rank),
      });
    }
  });

  // Convert to array and sort descending by rrfScore
  const sorted = Array.from(scoreMap.entries())
    .map(([chunkId, data]) => ({
      chunkId,
      chunk: data.chunk,
      rrfScore: Number(data.rrfScore.toFixed(6)),
      bm25Score: data.bm25Score,
      bm25Rank: data.bm25Rank,
      vectorSimilarity: data.vectorSim,
      vectorRank: data.vectorRank,
      rank: 0,
    }))
    .sort((a, b) => b.rrfScore - a.rrfScore);

  // Assign final ranks
  const finalResults = sorted.slice(0, topK).map((item, idx) => ({
    ...item,
    rank: idx + 1,
  }));

  return finalResults;
}
