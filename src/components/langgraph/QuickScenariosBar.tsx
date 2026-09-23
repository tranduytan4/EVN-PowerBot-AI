import React from 'react';
import { 
  BookOpen, 
  UserCheck, 
  Calculator, 
  Activity, 
  ShieldAlert, 
  UserPlus, 
  Sparkles 
} from 'lucide-react';

export interface QuickScenarioItem {
  id: string;
  title: string;
  badge: string;
  badgeColor: string;
  icon: React.ReactNode;
  prompt: string;
  description: string;
  expectedFlow: string;
}

interface QuickScenariosBarProps {
  onSelectScenario: (prompt: string, customerId?: string) => void;
  isRunning: boolean;
}

export const QuickScenariosBar: React.FC<QuickScenariosBarProps> = ({
  onSelectScenario,
  isRunning,
}) => {
  const scenarios: QuickScenarioItem[] = [
    {
      id: 'sc-1-rag',
      title: '1. Pure RAG',
      badge: 'Knowledge Base',
      badgeColor: 'text-cyan-400 bg-cyan-950/60 border-cyan-800/60',
      icon: <BookOpen className="w-3.5 h-3.5 text-cyan-400" />,
      prompt: 'Khi phát hiện dây điện đứt rơi xuống đất hoặc đường ngập nước, người dân cần làm gì để đảm bảo an toàn?',
      description: 'Tra cứu văn bản an toàn điện ATĐ-01/2025 (Khoảng cách 10m)',
      expectedFlow: 'analyze_question → route → search_rag → evaluate → generate'
    },
    {
      id: 'sc-2-customer',
      title: '2. Customer Lookup',
      badge: 'Customer API',
      badgeColor: 'text-amber-400 bg-amber-950/60 border-amber-800/60',
      icon: <UserCheck className="w-3.5 h-3.5 text-amber-400" />,
      prompt: 'Kiểm tra giúp tôi chỉ số công tơ và sản lượng điện tháng này của mã khách hàng PE01000123456.',
      description: 'Gọi Tool tra cứu chỉ số công tơ đo xa AMR/AMI',
      expectedFlow: 'analyze_question → route → customer_lookup → evaluate → generate'
    },
    {
      id: 'sc-3-calc',
      title: '3. Calculator',
      badge: 'Python Code',
      badgeColor: 'text-emerald-400 bg-emerald-950/60 border-emerald-800/60',
      icon: <Calculator className="w-3.5 h-3.5 text-emerald-400" />,
      prompt: 'Nếu gia đình tôi sử dụng hết 450 kWh điện sinh hoạt thì tiền điện tính theo bậc thang lũy tiến là bao nhiêu?',
      description: 'Thực thi thuật toán tính toán 6 bậc thang QĐ-05/2024/BG-BCT',
      expectedFlow: 'analyze_question → route → calculate_bill → evaluate → generate'
    },
    {
      id: 'sc-4-outage-comp',
      title: '4. Agentic RAG',
      badge: 'Tool + RAG',
      badgeColor: 'text-purple-400 bg-purple-950/60 border-purple-800/60',
      icon: <Activity className="w-3.5 h-3.5 text-purple-400" />,
      prompt: 'Khu vực của tôi (PE01000123456) tuần này có bị cắt điện bảo trì không? Nếu cắt 14 giờ thì tôi có được bồi thường gì không?',
      description: 'Kiểm tra lịch cắt 14h → Tự động gọi tiếp RAG tra cứu QĐ-07',
      expectedFlow: 'analyze → outage_tool → evaluate (Agentic RAG) → search_rag → generate'
    },
    {
      id: 'sc-5-human',
      title: '5. Human Approval',
      badge: 'Interrupt & Resume',
      badgeColor: 'text-rose-400 bg-rose-950/60 border-rose-800/60',
      icon: <UserPlus className="w-3.5 h-3.5 text-rose-400" />,
      prompt: 'Tôi là khách hàng PE01000123456, tiền điện tháng này tăng vọt nghi ngờ công tơ chạy sai, tôi yêu cầu phúc tra kiểm tra công tơ.',
      description: 'Chuẩn bị hồ sơ → Tạm dừng chờ Quản trị viên duyệt → Xuất lệnh',
      expectedFlow: 'analyze → prepare_inspection → ⏸ INTERRUPT → APPROVAL → submit'
    },
    {
      id: 'sc-6-guardrail',
      title: '6. Guardrail Check',
      badge: 'Zero Hallucination',
      badgeColor: 'text-slate-400 bg-slate-800/80 border-slate-700',
      icon: <ShieldAlert className="w-3.5 h-3.5 text-slate-400" />,
      prompt: 'Tôi muốn mua cổ phiếu tập đoàn EVN hoặc vay vốn ngân hàng qua hợp đồng điện lực.',
      description: 'Phát hiện ngoài phạm vi nghiệp vụ → Từ chối an toàn & Human Handoff',
      expectedFlow: 'analyze_question → route (OUT_OF_SCOPE) → generate_answer (Guardrail)'
    }
  ];

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3 shadow-lg">
      <div className="flex items-center justify-between mb-2.5">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-emerald-400" />
          <span className="text-xs font-semibold text-slate-200 uppercase tracking-wider">
            Thử nghiệm Nhanh các Kịch bản LangGraph (Quick Scenarios)
          </span>
        </div>
        <span className="text-[11px] text-slate-400 hidden sm:inline">
          Nhấn để chạy đồ thị StateGraph thời gian thực
        </span>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-2">
        {scenarios.map((sc) => (
          <button
            key={sc.id}
            type="button"
            disabled={isRunning}
            onClick={() => onSelectScenario(sc.prompt, 'PE01000123456')}
            className={`p-2.5 rounded-lg border text-left flex flex-col justify-between transition-all duration-200 group ${
              isRunning 
                ? 'opacity-50 cursor-not-allowed bg-slate-950/40 border-slate-800'
                : 'bg-slate-950/60 hover:bg-slate-800/70 border-slate-800 hover:border-emerald-500/40 hover:shadow-md hover:shadow-emerald-500/5'
            }`}
            title={sc.description}
          >
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <div className="p-1 rounded bg-slate-900 border border-slate-800 text-slate-300 group-hover:border-slate-700">
                  {sc.icon}
                </div>
                <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded border ${sc.badgeColor}`}>
                  {sc.badge}
                </span>
              </div>
              <div className="font-semibold text-xs text-slate-200 group-hover:text-emerald-400 transition-colors">
                {sc.title}
              </div>
              <p className="text-[10px] text-slate-400 line-clamp-2 mt-1 leading-relaxed">
                {sc.description}
              </p>
            </div>
            
            <div className="mt-2 pt-1.5 border-t border-slate-800/80 text-[9px] text-slate-500 font-mono truncate">
              {sc.expectedFlow}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};
