import React from 'react';
import { 
  CheckCircle2, 
  Clock, 
  ArrowRight, 
  Wrench, 
  Cpu, 
  Database, 
  Calculator, 
  Users, 
  AlertCircle, 
  PauseCircle, 
  FileText,
  RotateCcw,
  Sparkles
} from 'lucide-react';
import { LangGraphTraceStep } from '../../types';

interface ExecutionTraceTimelineProps {
  trace: LangGraphTraceStep[];
  selectedStepIndex: number | null;
  onSelectStep: (index: number) => void;
}

export const ExecutionTraceTimeline: React.FC<ExecutionTraceTimelineProps> = ({
  trace,
  selectedStepIndex,
  onSelectStep,
}) => {
  const getNodeIcon = (nodeName: string) => {
    switch (nodeName) {
      case 'analyze_question':
        return <Cpu className="w-4 h-4 text-cyan-400" />;
      case 'search_rag':
        return <Database className="w-4 h-4 text-blue-400" />;
      case 'customer_lookup':
        return <Users className="w-4 h-4 text-amber-400" />;
      case 'calculate_bill':
        return <Calculator className="w-4 h-4 text-emerald-400" />;
      case 'check_outage':
        return <AlertCircle className="w-4 h-4 text-purple-400" />;
      case 'prepare_inspection':
      case 'human_approval':
        return <PauseCircle className="w-4 h-4 text-rose-400" />;
      case 'rewrite_query':
        return <RotateCcw className="w-4 h-4 text-orange-400" />;
      case 'evaluate_result':
        return <Sparkles className="w-4 h-4 text-amber-300" />;
      default:
        return <FileText className="w-4 h-4 text-teal-400" />;
    }
  };

  if (!trace || trace.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center p-6 border border-dashed border-slate-800 rounded-xl bg-slate-950/40">
        <Clock className="w-8 h-8 text-slate-600 mb-2 animate-pulse" />
        <p className="text-sm font-semibold text-slate-300">Chưa có vết thực thi nào</p>
        <p className="text-xs text-slate-500 mt-1 max-w-sm">
          Hãy chọn một Kịch bản mẫu bên trên hoặc nhập câu hỏi và nhấn <strong>Chạy Agent</strong> để quan sát chuỗi sự kiện LangGraph.
        </p>
      </div>
    );
  }

  const totalDuration = trace.reduce((acc, step) => acc + (step.duration_ms || 0), 0);

  return (
    <div className="space-y-3 font-sans">
      {/* Summary bar */}
      <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-900 border border-slate-800 text-xs">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-slate-200">Tổng số bước thực thi:</span>
          <span className="px-2 py-0.5 rounded-md bg-cyan-950 text-cyan-400 border border-cyan-800/80 font-mono font-bold">
            {trace.length} Nodes
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-slate-400">Tổng thời gian:</span>
          <span className="px-2 py-0.5 rounded-md bg-slate-800 text-emerald-400 font-mono font-bold">
            {totalDuration.toFixed(1)} ms
          </span>
        </div>
      </div>

      {/* Timeline Steps */}
      <div className="space-y-2.5">
        {trace.map((step, idx) => {
          const isSelected = selectedStepIndex === idx;

          return (
            <div
              key={idx}
              onClick={() => onSelectStep(idx)}
              className={`p-3 rounded-xl border transition-all duration-200 cursor-pointer ${
                isSelected
                  ? 'border-cyan-400 bg-slate-850 ring-1 ring-cyan-500/30 shadow-lg'
                  : 'border-slate-800/80 bg-slate-900/60 hover:bg-slate-800/50 hover:border-slate-700'
              }`}
            >
              {/* Step Header */}
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-center text-xs font-mono font-bold text-slate-300">
                    {step.step_number || idx + 1}
                  </span>
                  <div className="p-1 rounded bg-slate-950 border border-slate-800">
                    {getNodeIcon(step.node_name)}
                  </div>
                  <span className="font-mono text-xs font-bold text-slate-100">
                    {step.node_name}
                  </span>
                </div>

                <div className="flex items-center gap-2 text-[11px] font-mono">
                  <span className="text-slate-500">{step.timestamp}</span>
                  <span className="px-1.5 py-0.5 rounded bg-slate-950 text-cyan-400 border border-slate-800">
                    {step.duration_ms} ms
                  </span>
                </div>
              </div>

              {/* Decision / Action Summary */}
              {step.decision && (
                <div className="text-xs text-slate-200 font-medium bg-slate-950/60 rounded-lg p-2 border border-slate-800/60 mb-2">
                  <span className="text-slate-400 text-[10px] uppercase tracking-wider font-semibold block mb-0.5">
                    Quyết định / Kết quả:
                  </span>
                  {step.decision}
                </div>
              )}

              {/* Tool Execution Details */}
              {step.tool_name && (
                <div className="mb-2 p-2 rounded-lg bg-emerald-950/20 border border-emerald-800/40 text-[11px]">
                  <div className="flex items-center gap-1.5 font-mono text-emerald-400 font-semibold mb-1">
                    <Wrench className="w-3 h-3" />
                    <span>Tool Called: {step.tool_name}</span>
                  </div>
                  {step.tool_input && (
                    <div className="text-slate-300 font-mono text-[10px] truncate">
                      Input: {JSON.stringify(step.tool_input)}
                    </div>
                  )}
                </div>
              )}

              {/* Educational Explanation */}
              {step.explanation_vi && (
                <p className="text-[11px] text-slate-400 leading-relaxed italic border-l-2 border-cyan-500/40 pl-2 mt-1">
                  💡 {step.explanation_vi}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
