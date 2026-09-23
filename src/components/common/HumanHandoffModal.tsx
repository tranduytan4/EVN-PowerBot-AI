import React, { useState } from 'react';
import { CustomerProfile } from '../../types';
import { PhoneCall, ShieldAlert, CheckCircle2, UserCheck, X, ArrowRight } from 'lucide-react';

interface HumanHandoffModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedCustomer: CustomerProfile;
  query: string;
}

export const HumanHandoffModal: React.FC<HumanHandoffModalProps> = ({
  isOpen,
  onClose,
  selectedCustomer,
  query,
}) => {
  const [status, setStatus] = useState<'idle' | 'calling' | 'connected'>('idle');

  if (!isOpen) return null;

  const handleStartCall = () => {
    setStatus('calling');
    setTimeout(() => {
      setStatus('connected');
    }, 1800);
  };

  const handleReset = () => {
    setStatus('idle');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-fadeIn">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="px-4 sm:px-5 py-3.5 sm:py-4 border-b border-slate-800 bg-slate-950 flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-2.5">
            <div className="p-1.5 sm:p-2 rounded-xl bg-orange-950/80 text-orange-400 border border-orange-800/60 flex-shrink-0">
              <PhoneCall className="w-4 h-4 sm:w-5 sm:h-5 animate-pulse" />
            </div>
            <div>
              <h3 className="font-bold text-xs sm:text-sm text-slate-100">Chuyển tiếp Tổng đài viên EVN</h3>
              <p className="text-[10px] sm:text-[11px] text-slate-400">Trung tâm CSKH 19001909 (Hỗ trợ 24/7)</p>
            </div>
          </div>
          <button
            onClick={handleReset}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-5 space-y-3.5 sm:space-y-4">
          {status === 'idle' && (
            <>
              <div className="p-3 sm:p-3.5 rounded-xl bg-orange-950/30 border border-orange-500/30 text-[11px] sm:text-xs text-orange-200 leading-relaxed flex items-start gap-2 sm:gap-2.5">
                <ShieldAlert className="w-4 h-4 sm:w-5 sm:h-5 text-orange-400 flex-shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold block mb-0.5">Yêu cầu cần chuyên viên giải quyết:</span>
                  Câu hỏi của Quý khách cần xác thực chuyên sâu hoặc nằm ngoài phạm vi tài liệu tự động của Trợ lý AI.
                </div>
              </div>

              <div className="space-y-2 bg-slate-950 p-3 sm:p-3.5 rounded-xl border border-slate-800 text-xs">
                <div className="flex justify-between text-slate-400 pb-1.5 border-b border-slate-800">
                  <span>Khách hàng:</span>
                  <span className="font-semibold text-slate-200">{selectedCustomer.fullName}</span>
                </div>
                <div className="flex justify-between text-slate-400 pb-1.5 border-b border-slate-800">
                  <span>Mã khách hàng:</span>
                  <span className="font-mono text-cyan-400 font-bold">{selectedCustomer.customerId}</span>
                </div>
                <div className="flex justify-between text-slate-400 pb-1.5 border-b border-slate-800">
                  <span>Số điện thoại:</span>
                  <span className="font-mono text-slate-200">{selectedCustomer.phone}</span>
                </div>
                <div className="pt-1">
                  <span className="text-slate-400 block mb-1">Nội dung yêu cầu chuyển tiếp:</span>
                  <p className="p-2 rounded-lg bg-slate-900 text-slate-300 italic text-[11px] line-clamp-2 border border-slate-800">
                    "{query}"
                  </p>
                </div>
              </div>

              <button
                onClick={handleStartCall}
                className="w-full py-2.5 sm:py-3 rounded-xl bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white font-bold text-xs shadow-lg shadow-orange-950 transition-all flex items-center justify-center gap-2"
              >
                <PhoneCall className="w-4 h-4" />
                <span>Kết nối ngay với Tổng đài viên 19001909</span>
              </button>
            </>
          )}

          {status === 'calling' && (
            <div className="py-6 sm:py-8 text-center space-y-3 sm:space-y-4">
              <div className="w-14 h-14 sm:w-16 sm:h-16 mx-auto rounded-full bg-orange-950/60 border-2 border-orange-500/60 flex items-center justify-center animate-pulse">
                <PhoneCall className="w-7 h-7 sm:w-8 sm:h-8 text-orange-400 animate-bounce" />
              </div>
              <div>
                <h4 className="font-bold text-xs sm:text-sm text-slate-100">Đang điều phối cuộc gọi...</h4>
                <p className="text-[11px] sm:text-xs text-slate-400 mt-1">
                  Chuyển tiếp phiên hội thoại và dữ liệu khách hàng đến Tổng đài CSKH EVN miền Bắc.
                </p>
              </div>
            </div>
          )}

          {status === 'connected' && (
            <div className="py-5 sm:py-6 text-center space-y-3 sm:space-y-4 animate-fadeIn">
              <div className="w-12 h-12 sm:w-14 sm:h-14 mx-auto rounded-full bg-emerald-950/60 border-2 border-emerald-500/60 flex items-center justify-center">
                <CheckCircle2 className="w-7 h-7 sm:w-8 sm:h-8 text-emerald-400" />
              </div>
              <div>
                <h4 className="font-bold text-xs sm:text-sm text-emerald-300">Đã kết nối thành công!</h4>
                <p className="text-[11px] sm:text-xs text-slate-300 mt-1 leading-relaxed">
                  Tổng đài viên **Trần Thu Trang (ID: CS-2041)** đã tiếp nhận yêu cầu và đang mở phiên đàm thoại trực tiếp với số điện thoại `{selectedCustomer.phone}`.
                </p>
              </div>
              <div className="p-2.5 sm:p-3 bg-slate-950 rounded-xl border border-slate-800 text-[10px] sm:text-[11px] text-slate-400">
                Toàn bộ lịch sử trao đổi với AI đã được chuyển tự động vào màn hình CRM của tổng đài viên.
              </div>
              <button
                onClick={handleReset}
                className="w-full py-2 sm:py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors"
              >
                Đóng hộp thoại
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

