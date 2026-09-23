import { Vector2DPoint, ChunkItem } from '../types';

export function computePCA2D(
  chunks: ChunkItem[],
  queryVector?: number[],
  topKChunkIds: string[] = []
): { points: Vector2DPoint[]; queryPoint?: Vector2DPoint } {
  if (chunks.length === 0) {
    return { points: [] };
  }

  const vectors: number[][] = [];
  const validChunks: ChunkItem[] = [];

  for (const c of chunks) {
    if (c.vector && c.vector.length > 0) {
      vectors.push(c.vector);
      validChunks.push(c);
    }
  }

  if (vectors.length === 0) return { points: [] };

  const N = vectors.length;
  const D = vectors[0].length;

  // 1. Calculate Mean Vector
  const mean = new Float64Array(D);
  for (let i = 0; i < N; i++) {
    for (let d = 0; d < D; d++) {
      mean[d] += vectors[i][d];
    }
  }
  for (let d = 0; d < D; d++) {
    mean[d] /= N;
  }

  // 2. Mean Center Matrix
  const centered: number[][] = [];
  for (let i = 0; i < N; i++) {
    const row: number[] = new Array(D);
    for (let d = 0; d < D; d++) {
      row[d] = vectors[i][d] - mean[d];
    }
    centered.push(row);
  }

  // 3. Power Iteration to find 1st Principal Component (v1)
  let v1 = new Float64Array(D);
  for (let d = 0; d < D; d++) v1[d] = Math.sin(d + 1); // seed vector

  for (let iter = 0; iter < 25; iter++) {
    const nextV = new Float64Array(D);
    // nextV = X^T * (X * v1)
    for (let i = 0; i < N; i++) {
      let dot = 0;
      for (let d = 0; d < D; d++) dot += centered[i][d] * v1[d];
      for (let d = 0; d < D; d++) nextV[d] += centered[i][d] * dot;
    }
    // Normalize
    let norm = 0;
    for (let d = 0; d < D; d++) norm += nextV[d] * nextV[d];
    norm = Math.sqrt(norm);
    if (norm > 0) {
      for (let d = 0; d < D; d++) v1[d] = nextV[d] / norm;
    }
  }

  // 4. Deflation and Power Iteration to find 2nd Principal Component (v2 orthogonal to v1)
  let v2 = new Float64Array(D);
  for (let d = 0; d < D; d++) v2[d] = Math.cos(d + 1);

  for (let iter = 0; iter < 25; iter++) {
    // Orthogonalize against v1: v2 = v2 - (v2 . v1) * v1
    let dot1 = 0;
    for (let d = 0; d < D; d++) dot1 += v2[d] * v1[d];
    for (let d = 0; d < D; d++) v2[d] -= dot1 * v1[d];

    const nextV = new Float64Array(D);
    for (let i = 0; i < N; i++) {
      let dot = 0;
      for (let d = 0; d < D; d++) dot += centered[i][d] * v2[d];
      for (let d = 0; d < D; d++) nextV[d] += centered[i][d] * dot;
    }

    let norm = 0;
    for (let d = 0; d < D; d++) norm += nextV[d] * nextV[d];
    norm = Math.sqrt(norm);
    if (norm > 0) {
      for (let d = 0; d < D; d++) v2[d] = nextV[d] / norm;
    }
  }

  // 5. Project all data points onto (v1, v2)
  const rawProj: { x: number; y: number }[] = [];
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;

  for (let i = 0; i < N; i++) {
    let px = 0, py = 0;
    for (let d = 0; d < D; d++) {
      px += centered[i][d] * v1[d];
      py += centered[i][d] * v2[d];
    }
    rawProj.push({ x: px, y: py });
    if (px < minX) minX = px;
    if (px > maxX) maxX = px;
    if (py < minY) minY = py;
    if (py > maxY) maxY = py;
  }

  // Project Query Vector if provided
  let queryPx = 0, queryPy = 0;
  if (queryVector && queryVector.length === D) {
    for (let d = 0; d < D; d++) {
      const cVal = queryVector[d] - mean[d];
      queryPx += cVal * v1[d];
      queryPy += cVal * v2[d];
    }
    if (queryPx < minX) minX = queryPx;
    if (queryPx > maxX) maxX = queryPx;
    if (queryPy < minY) minY = queryPy;
    if (queryPy > maxY) maxY = queryPy;
  }

  // Normalize coordinates into [5, 95] percentage range
  const spanX = maxX - minX > 0.0001 ? maxX - minX : 1;
  const spanY = maxY - minY > 0.0001 ? maxY - minY : 1;

  const points: Vector2DPoint[] = [];

  for (let i = 0; i < N; i++) {
    const chk = validChunks[i];
    const normX = 10 + ((rawProj[i].x - minX) / spanX) * 80;
    const normY = 10 + ((rawProj[i].y - minY) / spanY) * 80;

    const isTopK = topKChunkIds.includes(chk.id);

    points.push({
      id: chk.id,
      label: `${chk.docCode} (#${chk.chunkIndex})`,
      x: Number(normX.toFixed(2)),
      y: Number(normY.toFixed(2)),
      category: chk.docTitle,
      docCode: chk.docCode,
      isRetrievedTopK: isTopK,
    });
  }

  let queryPoint: Vector2DPoint | undefined = undefined;
  if (queryVector && queryVector.length === D) {
    const qNormX = 10 + ((queryPx - minX) / spanX) * 80;
    const qNormY = 10 + ((queryPy - minY) / spanY) * 80;

    queryPoint = {
      id: 'query-vector-point',
      label: 'Câu hỏi của bạn (Query)',
      x: Number(qNormX.toFixed(2)),
      y: Number(qNormY.toFixed(2)),
      category: 'User Query',
      docCode: 'QUERY',
      isQuery: true,
    };
  }

  return { points, queryPoint };
}
