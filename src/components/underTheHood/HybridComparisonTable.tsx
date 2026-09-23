import React from 'react';
import { RRFResult, BM25Result, VectorResult } from '../../types';
import { GitFork, Search, Zap, Award, Info } from 'lucide-react';

interface HybridComparisonTableProps {
  rrfResults: RRFResult[];
  bm25Results: BM25Result[];
  vectorResults: VectorResult[];
}

export const HybridComparisonTable: React.FC<HybridComparisonTableProps> = ({
  rrfResults,
  bm25Results,
  vectorResults,
}) => {
  if (rrfResults.length === 0) {
    return (
      <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 text-center text-xs text-slate-400">
        Luồng truy vấn này không kích hoạt Hybrid Search (Sử dụng công cụ trực tiếp hoặc ngoài phạm vi).
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Formula Explainer */}
      <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 flex items-start gap-2.5 text-xs text-slate-300">
        <Info className="w-4 h-4 text-cyan-400 flex-shrink-0 mt-0.5" />
        <div className="leading-relaxed">
          <span className="font-semibold text-cyan-300 block mb-0.5">
            Công thức Reciprocal Rank Fusion (RRF với hằng số k = 60):
          </span>
          <code className="font-mono text-[11px] text-amber-300 bg-slate-900 px-1.5 py-0.5 rounded border border-slate-700">
            RRF_Score(d) = 1 / (60 + Rank_BM25) + 1 / (60 + Rank_Vector)
          </code>
          <span className="block text-[11px] text-slate-400 mt-1">
            Bảng dưới đây hiển thị điểm số và thứ hạng tính toán thực tế của các ứng viên từ 2 nhánh Lexical và Semantic.
          </span>
        </div>
      </div>

      {/* Comparison Table */}
      <div className="overflow-x-auto rounded-xl border border-slate-800">
        <table className="w-full min-w-[580px] text-left text-xs border-collapse">
          <thead>
            <tr className="bg-slate-950 text-slate-400 font-semibold border-b border-slate-800">
              <th className="py-2.5 px-3 whitespace-nowrap">Hạng RRF</th>
              <th className="py-2.5 px-3">Chunk ID & Văn bản trích xuất</th>
              <th className="py-2.5 px-3 text-amber-400 whitespace-nowrap">
                <div className="flex items-center gap-1">
                  <Search className="w-3.5 h-3.5" />
                  <span>BM25 Lexical</span>
                </div>
              </th>
              <th className="py-2.5 px-3 text-cyan-400 whitespace-nowrap">
                <div className="flex items-center gap-1">
                  <Zap className="w-3.5 h-3.5" />
                  <span>Vector Cosine</span>
                </div>
              </th>
              <th className="py-2.5 px-3 text-blue-400 whitespace-nowrap">
                <div className="flex items-center gap-1">
                  <GitFork className="w-3.5 h-3.5" />
                  <span>RRF Score (k=60)</span>
                </div>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/80 bg-slate-900/40">
            {rrfResults.map((item) => (
              <tr key={item.chunkId} className="hover:bg-slate-800/40 transition-colors">
                {/* RRF Rank */}
                <td className="py-2.5 px-3 font-mono font-bold whitespace-nowrap">
                  {item.rank === 1 && <span className="inline-flex items-center gap-1 text-amber-400 font-bold"><Award className="w-3.5 h-3.5" /> #1</span>}
                  {item.rank === 2 && <span className="text-slate-200 font-bold">#2</span>}
                  {item.rank === 3 && <span className="text-amber-600 font-bold">#3</span>}
                  {item.rank > 3 && <span className="text-slate-400 font-bold">#{item.rank}</span>}
                </td>

                {/* Chunk details */}
                <td className="py-2.5 px-3 max-w-[280px]">
                  <span className="font-mono text-[10px] text-cyan-400 block font-semibold">
                    {item.chunk.docCode} ({item.chunkId})
                  </span>
                  <p className="text-slate-200 font-medium truncate text-[11px]" title={item.chunk.sectionHeading}>
                    {item.chunk.sectionHeading}
                  </p>
                  <p className="text-slate-400 text-[10px] truncate" title={item.chunk.content}>
                    {item.chunk.content}
                  </p>
                </td>

                {/* BM25 Column */}
                <td className="py-2.5 px-3 font-mono whitespace-nowrap">
                  {item.bm25Rank <= 50 ? (
                    <div className="space-y-0.5">
                      <span className="text-amber-300 font-bold block">{item.bm25Score.toFixed(2)}</span>
                      <span className="text-[10px] text-amber-500 bg-amber-950/40 px-1 rounded border border-amber-900/40">
                        Rank #{item.bm25Rank}
                      </span>
                    </div>
                  ) : (
                    <span className="text-slate-500 text-[10px] italic">Không lọt Top</span>
                  )}
                </td>

                {/* Vector Column */}
                <td className="py-2.5 px-3 font-mono whitespace-nowrap">
                  {item.vectorRank <= 50 ? (
                    <div className="space-y-0.5">
                      <span className="text-cyan-300 font-bold block">
                        {(item.vectorSimilarity * 100).toFixed(1)}% ({item.vectorSimilarity.toFixed(4)})
                      </span>
                      <span className="text-[10px] text-cyan-500 bg-cyan-950/40 px-1 rounded border border-cyan-900/40">
                        Rank #{item.vectorRank}
                      </span>
                    </div>
                  ) : (
                    <span className="text-slate-500 text-[10px] italic">Không lọt Top</span>
                  )}
                </td>

                {/* RRF Hybrid Column */}
                <td className="py-2.5 px-3 font-mono whitespace-nowrap">
                  <span className="text-blue-300 font-bold text-xs bg-blue-950/60 px-2 py-0.5 rounded border border-blue-800/80">
                    {item.rrfScore.toFixed(6)}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

    </div>
  );
};
