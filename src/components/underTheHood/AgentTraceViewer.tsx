import React from 'react';
import { ToolCallExecution } from '../../types';
import { Cpu, Terminal, CheckCircle2, Clock, BrainCircuit, ArrowDown } from 'lucide-react';

interface AgentTraceViewerProps {
  agentSteps: ToolCallExecution[];
}

export const AgentTraceViewer: React.FC<AgentTraceViewerProps> = ({ agentSteps }) => {
  if (!agentSteps || agentSteps.length === 0) {
    return (
      <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 text-center text-xs text-slate-400">
        Truy vấn này không kích hoạt Agent Tool Calling (Được xử lý thuần túy qua RAG hoặc Guardrail).
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 text-xs text-slate-300">
        <div className="flex items-center gap-2">
          <BrainCircuit className="w-4 h-4 text-orange-400 flex-shrink-0" />
          <span className="font-semibold text-orange-300">
            Vòng lặp ReAct Agent Trace (Thought → Action → Observation):
          </span>
        </div>
        <span className="text-[10px] sm:text-[11px] text-slate-400 font-mono">
          {agentSteps.length} Bước thực thi
        </span>
      </div>

      <div className="space-y-3 relative">
        {agentSteps.map((step, idx) => (
          <div key={step.step} className="space-y-2">
            <div className="p-3 sm:p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-3 shadow-md">
              {/* Step Header */}
              <div className="flex items-center justify-between border-b border-slate-800 pb-2 flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-orange-950 text-orange-400 font-mono font-bold text-xs flex items-center justify-center border border-orange-800/80 flex-shrink-0">
                    {step.step}
                  </span>
                  <span className="font-bold text-xs text-slate-200">
                    Bước {step.step}: Gọi Tool <code className="text-cyan-400 font-mono">{step.toolName}()</code>
                  </span>
                </div>
                <div className="flex items-center gap-1 text-[10px] sm:text-[11px] text-slate-400 font-mono">
                  <Clock className="w-3 h-3 text-slate-500" />
                  <span>{step.executionLatencyMs} ms</span>
                </div>
              </div>

              {/* Thought */}
              <div className="space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 block">
                  🧠 Agent Thought (Suy luận):
                </span>
                <p className="text-xs text-slate-300 bg-slate-950 p-2 sm:p-2.5 rounded-xl border border-slate-800/80 leading-relaxed italic">
                  "{step.thought}"
                </p>
              </div>

              {/* Action: Tool & Parameters */}
              <div className="space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-400 block flex items-center gap-1">
                  <Terminal className="w-3 h-3" />
                  <span>Action / Tool Parameters (JSON Schema):</span>
                </span>
                <pre className="text-[10px] sm:text-[11px] font-mono text-cyan-300 bg-slate-950 p-2 sm:p-2.5 rounded-xl border border-slate-800 overflow-x-auto max-w-full">
                  {JSON.stringify(step.toolParameters, null, 2)}
                </pre>
              </div>

              {/* Observation / Raw API Return */}
              <div className="space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 block flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  <span>Observation (Dữ liệu trả về từ EVN API):</span>
                </span>
                <p className="text-xs text-emerald-300 bg-emerald-950/20 p-2 sm:p-2.5 rounded-xl border border-emerald-900/40 leading-relaxed">
                  {step.observation}
                </p>
                <details className="text-[10px] text-slate-400 pt-1">
                  <summary className="cursor-pointer hover:text-slate-200 font-mono">
                    [+] Xem chi tiết JSON Payload trả về
                  </summary>
                  <pre className="mt-1.5 p-2 bg-slate-950 rounded-lg border border-slate-800 font-mono text-slate-300 overflow-x-auto max-w-full">
                    {JSON.stringify(step.rawResult, null, 2)}
                  </pre>
                </details>
              </div>
            </div>

            {idx < agentSteps.length - 1 && (
              <div className="flex justify-center py-1">
                <ArrowDown className="w-4 h-4 text-orange-400 animate-bounce" />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

