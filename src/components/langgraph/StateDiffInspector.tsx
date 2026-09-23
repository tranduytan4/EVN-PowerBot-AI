import React, { useState } from 'react';
import { 
  FileCode, 
  Copy, 
  Check, 
  Layers, 
  Code2, 
  Filter, 
  ArrowRight,
  Eye
} from 'lucide-react';
import { LangGraphState, LangGraphTraceStep } from '../../types';

interface StateDiffInspectorProps {
  state: LangGraphState | null;
  trace: LangGraphTraceStep[];
  selectedStepIndex: number | null;
  onSelectStep: (index: number) => void;
}

export const StateDiffInspector: React.FC<StateDiffInspectorProps> = ({
  state,
  trace,
  selectedStepIndex,
  onSelectStep,
}) => {
  const [copied, setCopied] = useState(false);
  const [viewMode, setViewMode] = useState<'formatted' | 'raw_json'>('formatted');

  const handleCopy = () => {
    if (!state) return;
    navigator.clipboard.writeText(JSON.stringify(state, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!state && (!trace || trace.length === 0)) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center p-6 border border-dashed border-slate-800 rounded-xl bg-slate-950/40">
        <Layers className="w-8 h-8 text-slate-600 mb-2 animate-pulse" />
        <p className="text-sm font-semibold text-slate-300">State đang trống</p>
        <p className="text-xs text-slate-500 mt-1">
          Chạy một kịch bản để xem cấu trúc `AgentState` được truyền qua các Node trong LangGraph.
        </p>
      </div>
    );
  }

  // Get active state to show: either from selected step or final state
  const activeStep = selectedStepIndex !== null && trace[selectedStepIndex] ? trace[selectedStepIndex] : null;
  const displayState = state || (activeStep ? activeStep.input_state_summary : {});

  return (
    <div className="space-y-3 font-sans">
      {/* Top Controls */}
      <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-lg bg-slate-900 border border-slate-800">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-cyan-400" />
          <span className="text-xs font-bold text-slate-200 uppercase tracking-wider">
            {activeStep ? `State Snapshot sau Node: ${activeStep.node_name}` : 'Trạng thái State Hiện tại (Current State)'}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setViewMode(viewMode === 'formatted' ? 'raw_json' : 'formatted')}
            className="flex items-center gap-1 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-colors"
          >
            <Code2 className="w-3.5 h-3.5" />
            <span>{viewMode === 'formatted' ? 'Xem Raw JSON' : 'Xem Dạng Thẻ'}</span>
          </button>

          <button
            type="button"
            onClick={handleCopy}
            className="flex items-center gap-1 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-colors"
            title="Sao chép JSON"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Đã chép' : 'Sao chép'}</span>
          </button>
        </div>
      </div>

      {/* Step Selector Pills */}
      {trace.length > 0 && (
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
          <span className="text-slate-500 text-[11px] font-medium flex-shrink-0">
            Xem theo bước:
          </span>
          {trace.map((step, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => onSelectStep(idx)}
              className={`px-2 py-0.5 rounded-md font-mono text-[11px] flex-shrink-0 transition-all ${
                selectedStepIndex === idx
                  ? 'bg-cyan-950 text-cyan-300 border border-cyan-700 font-bold'
                  : 'bg-slate-900 text-slate-400 hover:bg-slate-800 border border-slate-800'
              }`}
            >
              #{idx + 1} {step.node_name}
            </button>
          ))}
        </div>
      )}

      {/* Content Display */}
      {viewMode === 'formatted' ? (
        <div className="space-y-2.5">
          {/* Key Attributes Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 text-xs">
            <div className="p-2.5 rounded-lg bg-slate-900/90 border border-slate-800">
              <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold block">
                Intent (Ý định)
              </span>
              <span className="font-mono font-bold text-cyan-400">
                {displayState.intent || 'Chưa xác định'}
              </span>
            </div>

            <div className="p-2.5 rounded-lg bg-slate-900/90 border border-slate-800">
              <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold block">
                Mã Khách hàng (customer_id)
              </span>
              <span className="font-mono font-bold text-amber-400">
                {displayState.customer_id || 'Không có'}
              </span>
            </div>

            <div className="p-2.5 rounded-lg bg-slate-900/90 border border-slate-800">
              <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold block">
                Tool Đã chọn (selected_tool)
              </span>
              <span className="font-mono font-bold text-emerald-400">
                {displayState.selected_tool || 'None'}
              </span>
            </div>

            <div className="p-2.5 rounded-lg bg-slate-900/90 border border-slate-800">
              <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold block">
                Số lần Thử lại (retry_count)
              </span>
              <span className="font-mono font-bold text-slate-200">
                {displayState.retry_count ?? 0} / {displayState.max_retries ?? 2}
              </span>
            </div>

            <div className="p-2.5 rounded-lg bg-slate-900/90 border border-slate-800">
              <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold block">
                Cần Duyệt (requires_human)
              </span>
              <span className={`font-mono font-bold ${displayState.requires_human ? 'text-rose-400' : 'text-slate-400'}`}>
                {displayState.requires_human ? 'CÓ (INTERRUPT)' : 'KHÔNG'}
              </span>
            </div>

            <div className="p-2.5 rounded-lg bg-slate-900/90 border border-slate-800">
              <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold block">
                Trạng thái Duyệt (approved)
              </span>
              <span className="font-mono font-bold text-slate-300">
                {displayState.approved === true ? '✅ Đã Duyệt' : displayState.approved === false ? '❌ Đã Từ Chối' : 'Chưa xử lý'}
              </span>
            </div>
          </div>

          {/* Question & Answer Card */}
          <div className="p-3 rounded-lg bg-slate-900/90 border border-slate-800 space-y-2 text-xs">
            <div>
              <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold block">
                Câu hỏi Đầu vào (question):
              </span>
              <p className="text-slate-200 font-medium mt-0.5">{displayState.question}</p>
            </div>

            {displayState.answer && (
              <div className="pt-2 border-t border-slate-800">
                <span className="text-[10px] text-emerald-400 uppercase tracking-wider font-semibold block">
                  Câu trả lời Cuối cùng (answer):
                </span>
                <p className="text-slate-200 whitespace-pre-line mt-1 bg-slate-950 p-2.5 rounded border border-slate-800/80 font-mono text-[11px] leading-relaxed">
                  {displayState.answer}
                </p>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 font-mono text-xs overflow-x-auto">
          <pre className="text-cyan-300">{JSON.stringify(displayState, null, 2)}</pre>
        </div>
      )}
    </div>
  );
};
