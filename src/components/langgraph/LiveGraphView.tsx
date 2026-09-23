import React, { useState } from 'react';
import { 
  Play, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  PauseCircle, 
  ArrowRight, 
  Sparkles, 
  RotateCcw, 
  Shield, 
  Database, 
  Calculator, 
  Users, 
  FileText, 
  Cpu, 
  HelpCircle,
  CornerDownLeft
} from 'lucide-react';
import { LangGraphTraceStep, LangGraphNodeStatus } from '../../types';

interface LiveGraphViewProps {
  trace: LangGraphTraceStep[];
  isPaused: boolean;
  isRunning: boolean;
  selectedStepIndex: number | null;
  onSelectStep: (index: number) => void;
}

interface NodeMeta {
  id: string;
  name: string;
  category: 'system' | 'router' | 'tool' | 'evaluator' | 'human' | 'generator';
  icon: React.ReactNode;
  labelVi: string;
  description: string;
}

export const LiveGraphView: React.FC<LiveGraphViewProps> = ({
  trace,
  isPaused,
  isRunning,
  selectedStepIndex,
  onSelectStep,
}) => {
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);

  const nodesMeta: Record<string, NodeMeta> = {
    START: {
      id: 'START',
      name: 'START',
      category: 'system',
      icon: <Play className="w-3.5 h-3.5" />,
      labelVi: 'Bắt đầu',
      description: 'Nhận câu hỏi và khởi tạo State ban đầu.'
    },
    analyze_question: {
      id: 'analyze_question',
      name: 'analyze_question',
      category: 'router',
      icon: <Cpu className="w-3.5 h-3.5 text-cyan-400" />,
      labelVi: 'Phân tích Ý định',
      description: 'Nhận diện Intent, trích xuất Mã KH và tham số.'
    },
    search_rag: {
      id: 'search_rag',
      name: 'search_rag',
      category: 'tool',
      icon: <Database className="w-3.5 h-3.5 text-blue-400" />,
      labelVi: 'Tra cứu RAG',
      description: 'Tìm kiếm văn bản quy chuẩn trong documents.json.'
    },
    customer_lookup: {
      id: 'customer_lookup',
      name: 'customer_lookup',
      category: 'tool',
      icon: <Users className="w-3.5 h-3.5 text-amber-400" />,
      labelVi: 'Dữ liệu Khách hàng',
      description: 'Tra cứu chỉ số công tơ và hóa đơn tiền điện.'
    },
    calculate_bill: {
      id: 'calculate_bill',
      name: 'calculate_bill',
      category: 'tool',
      icon: <Calculator className="w-3.5 h-3.5 text-emerald-400" />,
      labelVi: 'Tính Tiền điện',
      description: 'Bộ tính toán bậc thang lũy tiến bằng Python code.'
    },
    check_outage: {
      id: 'check_outage',
      name: 'check_outage',
      category: 'tool',
      icon: <AlertCircle className="w-3.5 h-3.5 text-purple-400" />,
      labelVi: 'Lịch Cắt điện',
      description: 'Kiểm tra lịch cắt và điều kiện bồi thường > 8h.'
    },
    prepare_inspection: {
      id: 'prepare_inspection',
      name: 'prepare_inspection',
      category: 'human',
      icon: <FileText className="w-3.5 h-3.5 text-rose-400" />,
      labelVi: 'Lập Hồ sơ Phúc tra',
      description: 'Chuẩn bị phiếu công tác kiểm định công tơ.'
    },
    evaluate_result: {
      id: 'evaluate_result',
      name: 'evaluate_result',
      category: 'evaluator',
      icon: <Sparkles className="w-3.5 h-3.5 text-amber-300" />,
      labelVi: 'Đánh giá Kết quả',
      description: 'Kiểm tra chất lượng dữ liệu, điều phối Retry hoặc Agentic RAG.'
    },
    rewrite_query: {
      id: 'rewrite_query',
      name: 'rewrite_query',
      category: 'router',
      icon: <RotateCcw className="w-3.5 h-3.5 text-orange-400" />,
      labelVi: 'Thử lại (Loop)',
      description: 'Mở rộng câu hỏi và lặp lại tìm kiếm trong RAG.'
    },
    human_approval: {
      id: 'human_approval',
      name: 'human_approval',
      category: 'human',
      icon: <PauseCircle className="w-3.5 h-3.5 text-rose-400" />,
      labelVi: 'Phê duyệt (Interrupt)',
      description: 'Tạm dừng đồ thị chờ con người duyệt yêu cầu.'
    },
    execute_approved_request: {
      id: 'execute_approved_request',
      name: 'execute_approved_request',
      category: 'tool',
      icon: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />,
      labelVi: 'Xuất Lệnh Công tác',
      description: 'Tạo mã ticket kiểm định sau khi được duyệt.'
    },
    generate_answer: {
      id: 'generate_answer',
      name: 'generate_answer',
      category: 'generator',
      icon: <FileText className="w-3.5 h-3.5 text-teal-400" />,
      labelVi: 'Tổng hợp Câu trả lời',
      description: 'Tạo câu trả lời cuối cùng đính kèm trích dẫn.'
    },
    END: {
      id: 'END',
      name: 'END',
      category: 'system',
      icon: <CheckCircle2 className="w-3.5 h-3.5 text-slate-400" />,
      labelVi: 'Kết thúc',
      description: 'Hoàn thành chu trình thực thi StateGraph.'
    }
  };

  // Find status of each node from trace
  const getNodeStatus = (nodeId: string): LangGraphNodeStatus => {
    if (nodeId === 'START') return trace.length > 0 ? 'COMPLETED' : 'PENDING';
    if (nodeId === 'END') {
      const lastStep = trace[trace.length - 1];
      return (lastStep && lastStep.node_name === 'generate_answer') ? 'COMPLETED' : 'PENDING';
    }

    const stepIndex = trace.findIndex((s) => s.node_name === nodeId);
    if (stepIndex === -1) {
      if (isPaused && nodeId === 'human_approval') return 'PAUSED';
      return 'PENDING';
    }

    // If it's the last step and paused
    if (stepIndex === trace.length - 1 && isPaused && nodeId === 'human_approval') {
      return 'PAUSED';
    }

    return 'COMPLETED';
  };

  const getStatusBadge = (status: LangGraphNodeStatus) => {
    switch (status) {
      case 'COMPLETED':
        return (
          <span className="flex items-center gap-1 text-[9px] font-semibold px-1.5 py-0.5 rounded bg-emerald-950/80 text-emerald-400 border border-emerald-800/80">
            <CheckCircle2 className="w-2.5 h-2.5" /> Xong
          </span>
        );
      case 'PAUSED':
        return (
          <span className="flex items-center gap-1 text-[9px] font-semibold px-1.5 py-0.5 rounded bg-rose-950/80 text-rose-300 border border-rose-800/80 animate-pulse">
            <PauseCircle className="w-2.5 h-2.5 text-rose-400" /> Tạm dừng (Interrupt)
          </span>
        );
      case 'RUNNING':
        return (
          <span className="flex items-center gap-1 text-[9px] font-semibold px-1.5 py-0.5 rounded bg-cyan-950/80 text-cyan-300 border border-cyan-800/80 animate-pulse">
            <Clock className="w-2.5 h-2.5" /> Đang chạy
          </span>
        );
      default:
        return (
          <span className="text-[9px] font-medium px-1.5 py-0.5 rounded bg-slate-800/50 text-slate-400">
            Chờ (Pending)
          </span>
        );
    }
  };

  const renderNodeCard = (nodeId: string) => {
    const meta = nodesMeta[nodeId];
    if (!meta) return null;
    const status = getNodeStatus(nodeId);
    
    // Find trace step matching this node
    const stepIdx = trace.findIndex((s) => s.node_name === nodeId);
    const isSelected = selectedStepIndex === stepIdx && stepIdx !== -1;

    let borderClass = 'border-slate-800 bg-slate-900/80';
    let textClass = 'text-slate-300';
    let glowClass = '';

    if (status === 'COMPLETED') {
      borderClass = 'border-emerald-500/50 bg-emerald-950/20';
      textClass = 'text-emerald-300';
      glowClass = 'shadow-sm shadow-emerald-500/10';
    } else if (status === 'PAUSED') {
      borderClass = 'border-rose-500/80 bg-rose-950/30';
      textClass = 'text-rose-200';
      glowClass = 'shadow-md shadow-rose-500/20 ring-1 ring-rose-500/50 animate-pulse';
    }

    if (isSelected) {
      borderClass = 'border-cyan-400 ring-2 ring-cyan-500/40 bg-slate-850';
    }

    return (
      <div
        key={nodeId}
        onClick={() => {
          if (stepIdx !== -1) onSelectStep(stepIdx);
        }}
        onMouseEnter={() => setHoveredNode(nodeId)}
        onMouseLeave={() => setHoveredNode(null)}
        className={`p-2.5 rounded-xl border transition-all duration-200 cursor-pointer select-none relative group ${borderClass} ${glowClass}`}
      >
        <div className="flex items-center justify-between gap-1.5 mb-1">
          <div className="flex items-center gap-1.5">
            <div className="p-1 rounded bg-slate-950/60 border border-slate-800 text-slate-300">
              {meta.icon}
            </div>
            <span className="font-mono text-xs font-bold text-slate-100">
              {meta.name}
            </span>
          </div>
          {getStatusBadge(status)}
        </div>

        <div className="text-[11px] font-medium text-slate-400 group-hover:text-slate-200 transition-colors">
          {meta.labelVi}
        </div>
        <div className="text-[10px] text-slate-500 line-clamp-1 mt-0.5">
          {meta.description}
        </div>

        {stepIdx !== -1 && (
          <div className="mt-1.5 pt-1 border-t border-slate-800/80 flex items-center justify-between text-[9px] text-slate-400 font-mono">
            <span>Bước #{stepIdx + 1}</span>
            <span className="text-cyan-400">{trace[stepIdx].duration_ms}ms</span>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full bg-slate-950 border border-slate-800 rounded-xl p-3.5 overflow-hidden">
      {/* Header Info */}
      <div className="flex items-center justify-between border-b border-slate-800/80 pb-2.5 mb-3">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-xs font-bold uppercase tracking-wider text-slate-200">
            Sơ đồ Trực quan LangGraph StateGraph (Live Topology)
          </span>
        </div>
        <div className="flex items-center gap-3 text-xs text-slate-400">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-400" /> Đã chạy
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-rose-400" /> Ngắt / Tạm dừng
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-slate-600" /> Chưa kích hoạt
          </span>
        </div>
      </div>

      {/* Interactive Visual Graph Flow Canvas */}
      <div className="flex-1 overflow-y-auto pr-1 space-y-3 font-sans">
        {/* Layer 1: START */}
        <div className="max-w-xs mx-auto">
          {renderNodeCard('START')}
        </div>

        <div className="flex justify-center text-slate-600">
          <ArrowRight className="w-4 h-4 rotate-90" />
        </div>

        {/* Layer 2: analyze_question */}
        <div className="max-w-md mx-auto">
          {renderNodeCard('analyze_question')}
        </div>

        {/* Layer 3: Conditional Branching Hub */}
        <div className="relative border border-dashed border-cyan-800/50 bg-cyan-950/10 rounded-2xl p-3 my-2">
          <div className="text-[10px] font-bold uppercase tracking-wider text-cyan-400 text-center mb-2.5">
            ⚡ Conditional Edges (Định tuyến Theo Ý Định Người Dùng)
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2">
            {renderNodeCard('search_rag')}
            {renderNodeCard('customer_lookup')}
            {renderNodeCard('calculate_bill')}
            {renderNodeCard('check_outage')}
            {renderNodeCard('prepare_inspection')}
          </div>
        </div>

        <div className="flex justify-center text-slate-600">
          <ArrowRight className="w-4 h-4 rotate-90" />
        </div>

        {/* Layer 4: Evaluation & Retry Loop */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-w-2xl mx-auto">
          {renderNodeCard('evaluate_result')}
          {renderNodeCard('rewrite_query')}
        </div>

        <div className="flex justify-center text-slate-600">
          <ArrowRight className="w-4 h-4 rotate-90" />
        </div>

        {/* Layer 5: Human in the loop & Execution */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-w-2xl mx-auto">
          {renderNodeCard('human_approval')}
          {renderNodeCard('execute_approved_request')}
        </div>

        <div className="flex justify-center text-slate-600">
          <ArrowRight className="w-4 h-4 rotate-90" />
        </div>

        {/* Layer 6: generate_answer & END */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-w-xl mx-auto">
          {renderNodeCard('generate_answer')}
          {renderNodeCard('END')}
        </div>
      </div>
    </div>
  );
};
