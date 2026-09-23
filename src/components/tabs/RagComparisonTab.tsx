import React, { useState } from 'react';
import { GitFork, Sparkles, FileText, Cpu, CheckCircle2, AlertTriangle, XCircle, ArrowRight, Play } from 'lucide-react';
import { CustomerProfile } from '../../types';

interface RagComparisonTabProps {
  selectedCustomer: CustomerProfile;
}

export const RagComparisonTab: React.FC<RagComparisonTabProps> = ({ selectedCustomer }) => {
  const sampleComparisonQueries = [
    {
      title: 'Kịch bản 1: Mất điện & Chính sách bồi thường (Type 3)',
      query: `Khu vực của tôi (${selectedCustomer.customerId}) tuần này có bị cắt điện bảo trì không? Nếu có thì tôi có được hỗ trợ bồi thường gì không?`,
      type: 'TYPE_3_MULTI_STEP',
    },
    {
      title: 'Kịch bản 2: Biểu giá điện 6 bậc thang & Cách tính 250 kWh (Type 1)',
      query: 'Biểu giá bán lẻ điện sinh hoạt 6 bậc thang hiện hành tính như thế nào? Dùng 250 kWh thì tiền điện là bao nhiêu?',
      type: 'TYPE_1_RAG_ONLY',
    },
    {
      title: 'Kịch bản 3: Tra cứu tiền điện tháng này của khách hàng (Type 2)',
      query: `Hóa đơn tiền điện tháng 08/2026 của tôi mã KH ${selectedCustomer.customerId} là bao nhiêu tiền và đã thanh toán chưa?`,
      type: 'TYPE_2_TOOL_ONLY',
    },
  ];

  const [selectedScenarioIndex, setSelectedScenarioIndex] = useState(0);
  const [isRunning, setIsRunning] = useState(false);

  const currentScenario = sampleComparisonQueries[selectedScenarioIndex];

  return (
    <div className="p-3 sm:p-4 lg:p-8 space-y-4 sm:space-y-6 max-w-7xl mx-auto overflow-y-auto h-full scrollbar-thin">
      {/* Header */}
      <div className="p-5 sm:p-6 rounded-3xl glass-panel border border-slate-700/60 space-y-2 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex items-center gap-2 text-amber-400 text-xs font-bold uppercase tracking-wider">
          <GitFork className="w-4 h-4" />
          <span>Chế độ So sánh Chuyên sâu (3-Way Architectural Comparison)</span>
        </div>
        <h2 className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-slate-100 tracking-tight">
          So sánh: Không RAG vs RAG Thuần vs RAG + AI Agent
        </h2>
        <p className="text-xs sm:text-sm text-slate-300 max-w-3xl leading-relaxed">
          Chạy cùng một câu hỏi qua 3 cấu hình kiến trúc để thấy rõ giá trị gia tăng từng bậc: Từ mô hình ngôn ngữ truyền thống (dễ ảo giác) → RAG tra cứu tri thức tĩnh → AI Agent kết hợp công cụ dữ liệu động thời gian thực.
        </p>
      </div>

      {/* Scenario Selector */}
      <div className="space-y-2.5">
        <label className="text-xs font-bold uppercase tracking-wider text-slate-300 block px-1">
          Chọn Câu hỏi Thử nghiệm So sánh:
        </label>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 sm:gap-3">
          {sampleComparisonQueries.map((sc, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => setSelectedScenarioIndex(idx)}
              className={`p-3.5 sm:p-4 rounded-2xl border text-left transition-all ${
                selectedScenarioIndex === idx
                  ? 'border-amber-400/80 bg-gradient-to-br from-amber-950/60 via-slate-900/90 to-slate-900/90 shadow-xl shadow-amber-950/50 ring-1 ring-amber-400/40 scale-[1.01]'
                  : 'border-slate-800/80 bg-slate-950/50 hover:border-slate-700 hover:bg-slate-900/60'
              }`}
            >
              <span className="font-mono text-[9px] sm:text-[10px] text-amber-400 font-bold block mb-1">
                Kịch bản #{idx + 1} ({sc.type})
              </span>
              <h4 className="text-xs font-semibold text-slate-200 line-clamp-1 mb-1">
                {sc.title}
              </h4>
              <p className="text-[10px] sm:text-[11px] text-slate-400 line-clamp-2 italic">
                "{sc.query}"
              </p>
            </button>
          ))}
        </div>
      </div>


      {/* 3-Column Comparison Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Column A: No RAG */}
        <div className="p-5 sm:p-6 rounded-3xl glass-card border border-red-500/30 space-y-4 flex flex-col justify-between shadow-xl backdrop-blur-md">
          <div className="space-y-3.5">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-red-950 text-red-400 border border-red-800/80 shadow-md">
                  <XCircle className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-100">Cấu hình A: No-RAG</h3>
                  <p className="text-[10px] text-slate-400">LLM thuần (Không tài liệu, không tools)</p>
                </div>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-800/90 text-red-400 font-bold border border-red-900/50">
                Cơ bản
              </span>
            </div>

            {/* Content Output */}
            <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800/80 text-xs text-slate-300 space-y-2.5 leading-relaxed shadow-inner">
              {selectedScenarioIndex === 0 && (
                <>
                  <p className="text-red-300 italic text-[11px] flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 text-red-400" />
                    Không thể tra cứu lịch cắt điện của khách hàng và suy đoán chung chung về chính sách bồi thường.
                  </p>
                  <p>
                    "Tôi không có quyền truy cập vào hệ thống của EVN nên không biết khu vực của bạn có bị cắt điện hay không. Thông thường nếu mất điện do bão bạn sẽ không được bồi thường..."
                  </p>
                </>
              )}

              {selectedScenarioIndex === 1 && (
                <>
                  <p className="text-amber-300 italic text-[11px] flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 text-amber-400" />
                    Có thể nhớ sai đơn giá hoặc dùng dữ liệu biểu giá cũ đã hết hiệu lực từ năm 2022.
                  </p>
                  <p>
                    "Giá điện sinh hoạt được chia làm 6 bậc thang: Bậc 1 là khoảng 1.678đ, Bậc 2 khoảng 1.734đ... Tổng tiền 250 kWh khoảng 500.000đ (dữ liệu cũ chưa cập nhật QĐ 2024)."
                  </p>
                </>
              )}

              {selectedScenarioIndex === 2 && (
                <>
                  <p className="text-red-300 italic text-[11px] flex items-center gap-1.5">
                    <XCircle className="w-3.5 h-3.5 flex-shrink-0 text-red-400" />
                    Hoàn toàn không thể trả lời vì không có kết nối cơ sở dữ liệu khách hàng.
                  </p>
                  <p>
                    "Xin lỗi, tôi là mô hình AI ngôn ngữ và không có quyền truy cập cơ sở dữ liệu khách hàng cá nhân của EVN. Vui lòng gọi 19001909 để kiểm tra..."
                  </p>
                </>
              )}
            </div>
          </div>

          {/* Metric Badges */}
          <div className="space-y-1.5 pt-3.5 border-t border-slate-800/80 text-[11px]">
            <div className="flex justify-between text-slate-400">
              <span>Độ chuẩn xác (Groundedness):</span>
              <span className="font-mono text-red-400 font-bold">25% (Rủi ro ảo giác cao)</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Trích dẫn nguồn:</span>
              <span className="text-slate-500 font-mono">Không có</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Cá nhân hóa dữ liệu:</span>
              <span className="text-slate-500 font-mono">Không thể</span>
            </div>
          </div>
        </div>

        {/* Column B: RAG Only */}
        <div className="p-5 sm:p-6 rounded-3xl glass-card border border-cyan-500/30 space-y-4 flex flex-col justify-between shadow-xl backdrop-blur-md">
          <div className="space-y-3.5">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-cyan-950 text-cyan-400 border border-cyan-800/80 shadow-md">
                  <FileText className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-100">Cấu hình B: RAG Thuần</h3>
                  <p className="text-[10px] text-slate-400">LLM + 8 Văn bản Tri thức Nội bộ</p>
                </div>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-800/90 text-cyan-400 font-bold border border-cyan-900/50">
                Nâng cao
              </span>
            </div>

            {/* Content Output */}
            <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800/80 text-xs text-slate-300 space-y-2.5 leading-relaxed shadow-inner">
              {selectedScenarioIndex === 0 && (
                <>
                  <p className="text-cyan-300 italic text-[11px]">
                    ✓ Trích dẫn xuất sắc quy định bồi thường QĐ-07/2024/BTTH-EVN, nhưng thiếu dữ liệu lịch cắt điện cụ thể của khách hàng.
                  </p>
                  <p>
                    "Theo QĐ-07/2024/BTTH-EVN, nếu mất điện quá 8 giờ không báo trước, Quý khách được giảm 10% tiền điện bậc 1. Tuy nhiên, tôi không có công cụ tra cứu lịch cắt điện thực tế của mã KH này."
                  </p>
                  <span className="text-[10px] text-cyan-400 block font-mono">
                    [Nguồn: QĐ-07/2024/BTTH-EVN, Mục 2]
                  </span>
                </>
              )}

              {selectedScenarioIndex === 1 && (
                <>
                  <p className="text-emerald-300 italic text-[11px]">
                    ✓ Hoàn hảo: Trả lời chính xác 100% từng bậc giá và tính chuẩn xác 607.554đ cho 250 kWh kèm trích dẫn văn bản mới nhất.
                  </p>
                  <p>
                    "Theo Quyết định số 2699/QĐ-BCT: Bậc 1 (1.893đ), Bậc 2 (1.956đ), Bậc 3 (2.271đ), Bậc 4 (2.860đ)... Tổng tiền 250 kWh gồm thuế 8% là **607.554 VNĐ**."
                  </p>
                  <span className="text-[10px] text-cyan-400 block font-mono">
                    [Nguồn: QĐ-05/2024/BG-BCT]
                  </span>
                </>
              )}

              {selectedScenarioIndex === 2 && (
                <>
                  <p className="text-amber-300 italic text-[11px]">
                    ⚠️ RAG chỉ tìm thấy tài liệu quy định về hóa đơn, nhưng không thể truy xuất số tiền thực tế của cá nhân.
                  </p>
                  <p>
                    "Theo quy trình thanh toán tiền điện, hóa đơn được phát hành hàng tháng từ ngày 10 đến 15. Quý khách vui lòng đăng nhập App EVN CSKH để xem chi tiết số tiền..."
                  </p>
                </>
              )}
            </div>
          </div>

          {/* Metric Badges */}
          <div className="space-y-1.5 pt-3.5 border-t border-slate-800/80 text-[11px]">
            <div className="flex justify-between text-slate-300">
              <span>Độ chuẩn xác (Groundedness):</span>
              <span className="font-mono text-cyan-400 font-bold">92% (Dữ liệu tĩnh)</span>
            </div>
            <div className="flex justify-between text-slate-300">
              <span>Trích dẫn nguồn:</span>
              <span className="text-cyan-400 font-mono font-semibold">Văn bản & Quyết định</span>
            </div>
            <div className="flex justify-between text-slate-300">
              <span>Cá nhân hóa dữ liệu:</span>
              <span className="text-slate-500 font-mono">Chưa hỗ trợ</span>
            </div>
          </div>
        </div>

        {/* Column C: RAG + Agent */}
        <div className="p-5 sm:p-6 rounded-3xl glass-card border border-emerald-500/40 space-y-4 flex flex-col justify-between shadow-2xl relative overflow-hidden backdrop-blur-md">
          <div className="space-y-3.5">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-emerald-950 text-emerald-400 border border-emerald-800/80 shadow-md">
                  <Cpu className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-100">Cấu hình C: RAG + AI Agent</h3>
                  <p className="text-[10px] text-slate-400">RAG + Tool Calling + ReAct Multi-step</p>
                </div>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-950/90 text-emerald-400 font-bold border border-emerald-700/80 shadow-[0_0_8px_rgba(52,211,153,0.4)]">
                Toàn diện ⭐
              </span>
            </div>

            {/* Content Output */}
            <div className="p-4 rounded-2xl bg-slate-950/80 border border-cyan-800/60 text-xs text-slate-200 space-y-2.5 leading-relaxed shadow-inner">
              {selectedScenarioIndex === 0 && (
                <>
                  <p className="text-emerald-300 font-semibold text-[11px]">
                    🌟 Giải pháp Đỉnh cao (Multi-step ReAct):
                  </p>
                  <p>
                    "1. Lịch cắt điện: Khu vực trạm **{selectedCustomer.transformerSubstation}** của Quý khách có lịch cắt điện từ 05:00 - 19:00 Thứ Bảy (14 tiếng liên tục) để nâng cấp cáp ngầm 22kV.<br />
                    2. Bồi thường: Do cắt điện kéo dài 14 giờ (&gt; 8 giờ), Quý khách được **giảm 10% tiền điện Bậc 1** vào kỳ hóa đơn tới theo QĐ-07/2024/BTTH-EVN."
                  </p>
                  <span className="text-[10px] text-cyan-400 block font-mono">
                    [Nguồn: check_maintenance_outage() + QĐ-07/2024/BTTH-EVN]
                  </span>
                </>
              )}

              {selectedScenarioIndex === 1 && (
                <>
                  <p className="text-emerald-300 font-semibold text-[11px]">
                    🌟 Hoàn hảo: Trích dẫn chính xác quy chuẩn và biểu giá 6 bậc thang.
                  </p>
                  <p>
                    "Áp dụng biểu giá QĐ 2699/QĐ-BCT, tổng tiền điện 250 kWh của Quý khách là **607.554 VNĐ** (đã gồm 8% VAT)."
                  </p>
                  <span className="text-[10px] text-cyan-400 block font-mono">
                    [Nguồn: QĐ-05/2024/BG-BCT, Mục 2]
                  </span>
                </>
              )}

              {selectedScenarioIndex === 2 && (
                <>
                  <p className="text-emerald-300 font-semibold text-[11px]">
                    🌟 Gọi trực tiếp Tool `get_current_bill`:
                  </p>
                  <p>
                    "Hóa đơn tháng 08/2026 của Quý khách **{selectedCustomer.fullName}** ({selectedCustomer.customerId}): Tiêu thụ **{selectedCustomer.meterReading.consumptionKwh} kWh**, Tổng thanh toán: **{selectedCustomer.currentBill.totalAmount.toLocaleString('vi-VN')} VNĐ** ({selectedCustomer.currentBill.paymentStatus})."
                  </p>
                  <span className="text-[10px] text-orange-400 block font-mono">
                    [Tool: get_current_bill('PE01000123456')]
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Metric Badges */}
          <div className="space-y-1.5 pt-3.5 border-t border-slate-800/80 text-[11px]">
            <div className="flex justify-between text-slate-300">
              <span>Độ chuẩn xác (Groundedness):</span>
              <span className="font-mono text-emerald-400 font-bold">98% (Tối đa)</span>
            </div>
            <div className="flex justify-between text-slate-300">
              <span>Trích dẫn nguồn:</span>
              <span className="text-cyan-400 font-mono font-semibold">Văn bản + Tool Audit</span>
            </div>
            <div className="flex justify-between text-slate-300">
              <span>Cá nhân hóa dữ liệu:</span>
              <span className="text-emerald-400 font-mono font-bold">Thời gian thực 100%</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
