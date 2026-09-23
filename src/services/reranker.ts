import { RRFResult, RerankResult } from '../types';

export function rerankCandidates(
  query: string,
  candidates: RRFResult[],
  topK: number = 4
): RerankResult[] {
  const queryLower = query.toLowerCase();
  const queryWords = queryLower.split(/\s+/).filter(w => w.length > 2);

  const scored = candidates.map((item, originalIndex) => {
    const chunk = item.chunk;
    const contentLower = chunk.content.toLowerCase();
    const headingLower = chunk.sectionHeading.toLowerCase();
    const docTitleLower = chunk.docTitle.toLowerCase();

    // 1. Base score from RRF normalized
    let crossScore = item.rrfScore * 1000;

    // 2. Exact phrase & consecutive n-gram matches in section content
    let phraseMatches = 0;
    for (let i = 0; i < queryWords.length - 1; i++) {
      const phrase = `${queryWords[i]} ${queryWords[i + 1]}`;
      if (contentLower.includes(phrase)) {
        phraseMatches += 1;
      }
    }
    crossScore += phraseMatches * 4.5;

    // 3. Heading & Title alignment bonus
    let headingMatches = 0;
    for (const w of queryWords) {
      if (headingLower.includes(w) || docTitleLower.includes(w)) {
        headingMatches += 1;
      }
    }
    crossScore += headingMatches * 2.0;

    // 4. Exact numerical and critical keyword matching (e.g., '10 mét', 'bồi thường', 'bậc 1', 'pe01000...')
    const numbersInQuery = query.match(/\d+(\.\d+)?/g) || [];
    for (const num of numbersInQuery) {
      if (chunk.content.includes(num)) {
        crossScore += 3.0;
      }
    }

    // Determine educational relevance reason
    let relevanceReason = 'Độ tương đồng ngữ nghĩa cao với trọng tâm câu hỏi';
    if (phraseMatches > 0) {
      relevanceReason = `Khớp chính xác ${phraseMatches} cụm từ khóa liên tiếp trong nội dung`;
    } else if (headingMatches > 1) {
      relevanceReason = 'Tiêu đề quy định/điều khoản trùng khớp trực tiếp với chủ đề truy vấn';
    } else if (item.vectorSimilarity > 0.7) {
      relevanceReason = `Vector Cosine đạt ${(item.vectorSimilarity * 100).toFixed(1)}% tương đồng khái niệm`;
    }

    return {
      chunkId: chunk.id,
      chunk,
      originalRank: originalIndex + 1,
      crossScore: Number(crossScore.toFixed(3)),
      relevanceReason,
    };
  });

  // Sort by crossScore descending
  scored.sort((a, b) => b.crossScore - a.crossScore);

  // Assign new ranks and calculate rankDelta
  const results: RerankResult[] = scored.slice(0, topK).map((item, newIndex) => {
    const newRank = newIndex + 1;
    const rankDelta = item.originalRank - newRank; // > 0: promoted, < 0: demoted
    return {
      chunkId: item.chunkId,
      chunk: item.chunk,
      originalRank: item.originalRank,
      newRank,
      rankDelta,
      crossScore: item.crossScore,
      relevanceReason: item.relevanceReason,
    };
  });

  return results;
}
