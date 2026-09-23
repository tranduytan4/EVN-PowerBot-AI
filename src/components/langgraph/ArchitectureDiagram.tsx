import React from 'react';
import { 
  Layers, 
  Cpu, 
  GitBranch, 
  Database, 
  CheckCircle2, 
  Repeat, 
  PauseCircle, 
  ArrowRight,
  ShieldCheck,
  Zap
} from 'lucide-react';

export const ArchitectureDiagram: React.FC = () => {
  return (
    <div className="flex flex-col h-full bg-slate-950 border border-slate-800 rounded-2xl p-4 overflow-y-auto space-y-4 font-sans text-xs">
      {/* Title */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <Layers className="w-5 h-5 text-emerald-400" />
          <span className="font-bold text-sm uppercase tracking-wider text-slate-100">
            Kiến trúc Tổng quan: LangGraph StateGraph & Runtime Engine
          </span>
        </div>
        <span className="px-2.5 py-1 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800 text-[11px] font-mono font-semibold">
          Python 3.13 + LangGraph Runtime
        </span>
      </div>

      {/* Comparison Table: LangChain Chains vs LangGraph */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
          <div className="flex items-center gap-1.5 font-bold text-slate-300">
            <span className="w-2 h-2 rounded-full bg-slate-500" />
            <span>LangChain Chains (Truyền thống)</span>
          </div>
          <ul className="space-y-1.5 text-slate-400 text-[11px] list-disc list-inside">
            <li>Thực thi tuần tự tuyến tính 1 chiều (DAG - Directed Acyclic Graph).</li>
            <li>Khó tạo chu trình vòng lặp (Loops / Retries / Self-correction).</li>
            <li>Khó duy trì trạng thái trung gian nhiều bước (Multi-turn state).</li>
            <li>Không có cơ chế ngắt nhịp tự nhiên (Human-in-the-loop interrupt).</li>
          </ul>
        </div>

        <div className="p-3.5 rounded-xl bg-emerald-950/20 border border-emerald-800/60 space-y-2">
          <div className="flex items-center gap-1.5 font-bold text-emerald-400">
            <Zap className="w-4 h-4 text-emerald-400" />
            <span>LangGraph StateGraph (Hiện đại)</span>
          </div>
          <ul className="space-y-1.5 text-emerald-200/80 text-[11px] list-disc list-inside">
            <li>Mô hình đồ thị trạng thái đầy đủ (State Machine + Cyclic Graphs).</li>
            <li>Hỗ trợ vòng lặp tự sửa sai vô hạn an toàn có kiểm soát (`retry_count`).</li>
            <li>Tất cả Node giao tiếp qua `AgentState` TypedDict chuẩn hóa.</li>
            <li>Hỗ trợ ngắt nhịp phần cứng/phần mềm với `interrupt_before` & `checkpointer`.</li>
          </ul>
        </div>
      </div>

      {/* Layered Architectural Flow */}
      <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
        <span className="font-bold text-slate-200 uppercase text-[11px] tracking-wider block">
          Luồng Dữ liệu & Sự kiện trong LangGraph Lab:
        </span>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-2.5">
          <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-1">
            <span className="font-mono text-cyan-400 font-bold block">1. User & API</span>
            <p className="text-slate-400 text-[11px]">
              Giao diện React gửi câu hỏi & <code>thread_id</code> tới FastAPI endpoint <code>/api/langgraph/run</code>.
            </p>
          </div>

          <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-1">
            <span className="font-mono text-amber-400 font-bold block">2. StateGraph Engine</span>
            <p className="text-slate-400 text-[11px]">
              Khởi tạo <code>AgentState</code>, thực thi Node <code>analyze_question</code> và phân phối qua Conditional Edges.
            </p>
          </div>

          <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-1">
            <span className="font-mono text-emerald-400 font-bold block">3. Tools & Multi-step</span>
            <p className="text-slate-400 text-[11px]">
              Kích hoạt các @tool nghiệp vụ: RAG văn bản, Tính tiền điện 6 bậc, Lịch cắt điện, Tra cứu công tơ.
            </p>
          </div>

          <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-1">
            <span className="font-mono text-rose-400 font-bold block">4. Interrupt & Persistence</span>
            <p className="text-slate-400 text-[11px]">
              Checkpointer <code>MemorySaver</code> lưu vết trạng thái; tạm dừng an toàn khi cần phê duyệt từ con người.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
