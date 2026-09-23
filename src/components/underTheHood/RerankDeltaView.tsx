import React from 'react';
import { RerankResult } from '../../types';
import { ArrowUp, ArrowDown, Minus, ArrowRight, Sparkles, CheckCircle2 } from 'lucide-react';

interface RerankDeltaViewProps {
  rerankedResults: RerankResult[];
}

export const RerankDeltaView: React.FC<RerankDeltaViewProps> = ({ rerankedResults }) => {
  if (rerankedResults.length === 0) {
    return (
      <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 text-center text-xs text-slate-400">
        Không có dữ liệu Reranking cho truy vấn này.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 text-xs text-slate-300">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-emerald-400 flex-shrink-0" />
          <span className="font-semibold text-emerald-300">
            Mô hình Tái Xếp Hạng Ngữ Cảnh (Contextual Reranker):
          </span>
        </div>
        <span className="text-[10px] sm:text-[11px] text-slate-400">
          Chấm điểm tương thích ngữ cảnh sâu giữa câu hỏi & từng đoạn
        </span>
      </div>

      <div className="space-y-2">
        {rerankedResults.map((item) => {
          const isPromoted = item.rankDelta > 0;
          const isDemoted = item.rankDelta < 0;

          return (
            <div
              key={item.chunkId}
              className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-slate-700 transition-all flex flex-col md:flex-row md:items-center justify-between gap-3"
            >
              {/* Left: Chunk info & reason */}
              <div className="space-y-1 flex-1 min-w-0">
                <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                  <span className="font-mono text-[10px] text-cyan-400 font-bold">
                    {item.chunk.docCode} ({item.chunkId})
                  </span>
                  <span className="text-slate-500 text-[10px]">•</span>
                  <span className="text-slate-200 font-semibold text-xs truncate max-w-xs sm:max-w-md">
                    {item.chunk.sectionHeading}
                  </span>
                </div>
                <p className="text-slate-400 text-[10px] sm:text-[11px] line-clamp-1 italic">
                  "{item.chunk.content}"
                </p>
                <div className="flex items-center gap-1.5 text-[10px] text-emerald-400 pt-0.5">
                  <CheckCircle2 className="w-3 h-3 flex-shrink-0" />
                  <span className="truncate">{item.relevanceReason}</span>
                </div>
              </div>

              {/* Right: Rank Transition & Score */}
              <div className="flex items-center justify-between sm:justify-end gap-3 sm:gap-4 flex-shrink-0 bg-slate-950 px-3 py-2 rounded-xl border border-slate-800">
                {/* Pre vs Post Rank */}
                <div className="flex items-center gap-2 font-mono text-xs">
                  <div className="text-center">
                    <span className="text-[9px] text-slate-500 block uppercase">Trước</span>
                    <span className="font-bold text-slate-400">#{item.originalRank}</span>
                  </div>

                  <ArrowRight className="w-3.5 h-3.5 text-slate-600" />

                  <div className="text-center">
                    <span className="text-[9px] text-slate-500 block uppercase">Sau</span>
                    <span className="font-bold text-amber-400 text-sm">#{item.newRank}</span>
                  </div>
                </div>

                {/* Rank Delta Badge */}
                <div className="text-center min-w-[45px]">
                  {isPromoted && (
                    <span className="inline-flex items-center gap-0.5 px-1.5 sm:px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-400 text-[10px] sm:text-[11px] font-bold border border-emerald-800">
                      <ArrowUp className="w-3 h-3" /> +{item.rankDelta}
                    </span>
                  )}
                  {isDemoted && (
                    <span className="inline-flex items-center gap-0.5 px-1.5 sm:px-2 py-0.5 rounded-full bg-red-950 text-red-400 text-[10px] sm:text-[11px] font-bold border border-red-800">
                      <ArrowDown className="w-3 h-3" /> {item.rankDelta}
                    </span>
                  )}
                  {!isPromoted && !isDemoted && (
                    <span className="inline-flex items-center gap-0.5 px-1.5 sm:px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 text-[10px] sm:text-[11px] font-semibold">
                      <Minus className="w-3 h-3" /> 0
                    </span>
                  )}
                </div>

                {/* Cross Score */}
                <div className="text-right">
                  <span className="text-[9px] text-slate-500 block uppercase">Điểm Cross</span>
                  <span className="font-mono text-xs font-bold text-cyan-300">
                    {item.crossScore.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

