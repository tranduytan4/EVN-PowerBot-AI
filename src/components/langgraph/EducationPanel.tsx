import React, { useState } from 'react';
import { 
  Sparkles, 
  HelpCircle, 
  GitBranch, 
  Repeat, 
  PauseCircle, 
  Database, 
  Cpu, 
  Layers, 
  ChevronDown, 
  ChevronUp,
  BookmarkCheck
} from 'lucide-react';
import { LangGraphTraceStep } from '../../types';

interface EducationPanelProps {
  activeStep: LangGraphTraceStep | null;
  totalSteps: number;
}

export const EducationPanel: React.FC<EducationPanelProps> = ({ activeStep, totalSteps }) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [activeConcept, setActiveConcept] = useState<'current_step' | 'core_concepts'>('current_step');

  const concepts = [
    {
      title: '1. State (Trạng thái trung tâm)',
      icon: <Layers className="w-4 h-4 text-cyan-400" />,
      desc: 'LangGraph quản lý toàn bộ dữ liệu luồng qua một `AgentState` (TypedDict). Mọi Node chỉ đọc State và trả về một Dict chứa các trường cập nhật (Delta), giúp luồng dữ liệu minh bạch và không bị đột biến bất ngờ.'
    },
    {
      title: '2. Nodes & Edges',
      icon: <Cpu className="w-4 h-4 text-emerald-400" />,
      desc: 'Node là các hàm xử lý Python độc lập. Edge định nghĩa đường truyền dữ liệu giữa các Node (`START -> analyze_question -> search_rag`).'
    },
    {
      title: '3. Conditional Edges (Định tuyến)',
      icon: <GitBranch className="w-4 h-4 text-amber-400" />,
      desc: 'Cho phép đồ thị rẽ nhánh linh hoạt dựa trên giá trị trong State (Ví dụ: `intent == CUSTOMER_LOOKUP -> customer_lookup`, `BILL_CALCULATION -> calculate_bill`).'
    },
    {
      title: '4. Self-Correction Loop (Vòng lặp Thử lại)',
      icon: <Repeat className="w-4 h-4 text-orange-400" />,
      desc: 'Khác với LangChain Chain truyền thống chỉ chạy theo 1 chiều (DAG), LangGraph cho phép tạo chu trình (`rewrite_query -> search_rag`) kèm biến đếm `retry_count` để tự sửa sai khi chưa tìm thấy tài liệu.'
    },
    {
      title: '5. Human-in-the-loop (Interrupt & Resume)',
      icon: <PauseCircle className="w-4 h-4 text-rose-400" />,
      desc: 'Cơ chế ngắt an toàn trước các hành động nhạy cảm. Runtime LangGraph tạm dừng, lưu State vào MemorySaver/SQLite, chờ con người phê duyệt rồi mới tiếp tục chạy Node kế tiếp.'
    },
    {
      title: '6. Checkpointing & Persistence',
      icon: <Database className="w-4 h-4 text-purple-400" />,
      desc: 'Mỗi phiên làm việc được gắn với một `thread_id`. Checkpointer tự động lưu snapshot State sau mỗi Node, cho phép quay ngược thời gian (Time-travel) và khôi phục trạng thái bất kỳ lúc nào.'
    }
  ];

  return (
    <div className="bg-slate-900/95 border border-slate-800 rounded-2xl p-4 shadow-xl select-none font-sans">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-amber-400" />
          <span className="font-bold text-xs uppercase tracking-wider text-slate-100">
            Học tập LangGraph: Cơ chế Vận hành Thực tế
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setActiveConcept('current_step')}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
              activeConcept === 'current_step'
                ? 'bg-cyan-950 text-cyan-300 border border-cyan-700'
                : 'bg-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            Sự kiện vừa xảy ra
          </button>
          <button
            type="button"
            onClick={() => setActiveConcept('core_concepts')}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
              activeConcept === 'core_concepts'
                ? 'bg-cyan-950 text-cyan-300 border border-cyan-700'
                : 'bg-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            6 Khái niệm Cốt lõi
          </button>

          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1 rounded-lg bg-slate-800 text-slate-400 hover:text-slate-200 ml-1"
          >
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Body */}
      {isExpanded && (
        <div className="pt-3">
          {activeConcept === 'current_step' ? (
            activeStep ? (
              <div className="space-y-2.5 text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-cyan-400 bg-cyan-950/80 px-2 py-0.5 rounded border border-cyan-800/80">
                    Bước #{activeStep.step_number}: {activeStep.node_name}
                  </span>
                  <span className="text-slate-400 text-[11px]">
                    Thời gian thực thi: <strong>{activeStep.duration_ms} ms</strong>
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800/80 space-y-1.5">
                  <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold block">
                    Giải thích Kỹ thuật:
                  </span>
                  <p className="text-slate-200 leading-relaxed">
                    {activeStep.explanation_vi}
                  </p>
                </div>

                {activeStep.decision && (
                  <div className="p-2.5 rounded-lg bg-slate-850 border border-slate-800 text-[11px] text-slate-300">
                    <strong className="text-emerald-400">Hành vi StateGraph:</strong> {activeStep.decision}
                  </div>
                )}
              </div>
            ) : (
              <p className="text-xs text-slate-400 py-2">
                Chạy một kịch bản hoặc bấm vào một bước trong Execution Trace để xem phân tích chi tiết cơ chế LangGraph.
              </p>
            )
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {concepts.map((c, i) => (
                <div key={i} className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800/80 space-y-1 text-xs">
                  <div className="flex items-center gap-1.5 font-semibold text-slate-200">
                    {c.icon}
                    <span>{c.title}</span>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    {c.desc}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
