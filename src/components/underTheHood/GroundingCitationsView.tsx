import React from 'react';
import { CitationItem } from '../../types';
import { ShieldCheck, FileCheck, ExternalLink, Calendar, Building } from 'lucide-react';

interface GroundingCitationsViewProps {
  citations: CitationItem[];
  retrievedContext: string;
  groundednessScore: number;
}

export const GroundingCitationsView: React.FC<GroundingCitationsViewProps> = ({
  citations,
  retrievedContext,
  groundednessScore,
}) => {
  return (
    <div className="space-y-3.5">
      {/* Grounding Status Card */}
      <div className="p-3 sm:p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-emerald-950/80 text-emerald-400 border border-emerald-800/60 flex-shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-100">Xác thực Độ Chuẩn Xác (Groundedness & Fact-Checking)</h4>
            <p className="text-[10px] sm:text-[11px] text-slate-400">
              Đảm bảo phản hồi 100% bám sát tài liệu nguồn nội bộ, chống ảo giác (Zero Hallucination).
            </p>
          </div>
        </div>
        <div className="text-left sm:text-right flex sm:block items-center justify-between pt-1 sm:pt-0 border-t sm:border-t-0 border-slate-800">
          <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Groundedness Score:</span>
          <span className="font-mono text-sm sm:text-base font-bold text-emerald-400">
            {(groundednessScore * 100).toFixed(0)}%
          </span>
        </div>
      </div>

      {/* Citations List */}
      <div className="space-y-2">
        <label className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
          <FileCheck className="w-3.5 h-3.5 text-cyan-400" />
          <span>Danh sách Nguồn Tài liệu được Trích dẫn ({citations.length}):</span>
        </label>

        {citations.length === 0 ? (
          <p className="p-3 rounded-xl bg-slate-950 text-xs text-slate-500 italic border border-slate-800">
            Không có trích dẫn tài liệu (Câu hỏi sử dụng dữ liệu trực tiếp từ Tool hoặc ngoài phạm vi).
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
            {citations.map((c, idx) => (
              <div
                key={c.chunkId || idx}
                className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2 hover:border-slate-700 transition-colors"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <span className="font-mono text-[10px] text-amber-400 font-bold block">
                      {c.docCode}
                    </span>
                    <h5 className="text-xs font-semibold text-slate-200 truncate">
                      {c.docTitle}
                    </h5>
                  </div>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-950 text-cyan-400 font-mono border border-cyan-800/60 flex-shrink-0">
                    Chunk #{idx + 1}
                  </span>
                </div>

                <p className="text-[11px] font-medium text-cyan-300 truncate">
                  📌 {c.sectionHeading}
                </p>

                <p className="text-[11px] text-slate-400 line-clamp-2 italic bg-slate-950 p-2 rounded-lg border border-slate-800/60">
                  "{c.excerpt}"
                </p>

                <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1 border-t border-slate-800/60 flex-wrap gap-1">
                  <span className="flex items-center gap-1">
                    <Building className="w-3 h-3" /> {c.department}
                  </span>
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" /> HL: {c.effectiveDate}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Raw Retrieved Context Accordion */}
      {retrievedContext && (
        <details className="text-xs bg-slate-950 rounded-xl border border-slate-800 overflow-hidden">
          <summary className="p-2.5 sm:p-3 cursor-pointer text-slate-300 font-medium hover:text-cyan-400 select-none flex items-center justify-between gap-2">
            <span className="truncate">[+] Xem toàn bộ Raw Prompt Context</span>
            <span className="text-[10px] text-slate-500 font-mono flex-shrink-0">({retrievedContext.length} ký tự)</span>
          </summary>
          <div className="p-3 border-t border-slate-800 text-[10px] sm:text-[11px] text-slate-400 font-mono whitespace-pre-wrap leading-relaxed bg-slate-950 max-h-48 overflow-y-auto">
            {retrievedContext}
          </div>
        </details>
      )}
    </div>
  );
};

