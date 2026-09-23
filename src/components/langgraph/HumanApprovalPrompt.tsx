import React, { useState } from 'react';
import { 
  PauseCircle, 
  CheckCircle2, 
  XCircle, 
  ShieldAlert, 
  UserCheck, 
  ArrowRight,
  Clock,
  Sparkles
} from 'lucide-react';
import { LangGraphState } from '../../types';

interface HumanApprovalPromptProps {
  state: LangGraphState | null;
  isPaused: boolean;
  onResume: (approved: boolean, comment?: string) => void;
  isResuming: boolean;
}

export const HumanApprovalPrompt: React.FC<HumanApprovalPromptProps> = ({
  state,
  isPaused,
  onResume,
  isResuming,
}) => {
  const [comment, setComment] = useState('');

  if (!isPaused || !state?.requires_human) {
    return null;
  }

  const req = state.inspection_request || {
    action: 'Tạo phiếu công tác phúc tra & kiểm định sai số công tơ',
    customerId: state.customer_id || 'PE01000123456',
    reason: 'Phát hiện khiếu nại hóa đơn tăng bất thường',
    department: 'Đội Kiểm định Đo lường Điện lực',
    sla: '24 giờ làm việc'
  };

  return (
    <div className="p-4 rounded-2xl bg-gradient-to-br from-rose-950/50 via-slate-900 to-slate-900 border-2 border-rose-500/80 shadow-2xl shadow-rose-500/10 animate-fadeIn select-none font-sans">
      {/* Title Bar */}
      <div className="flex items-center justify-between pb-3 border-b border-rose-900/60 mb-3">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-rose-900/80 text-rose-300 animate-pulse">
            <PauseCircle className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm text-rose-200 uppercase tracking-wide">
                LangGraph Human-in-the-Loop Interrupt
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-500 text-white animate-pulse">
                TẠM DỪNG ĐỒ THỊ
              </span>
            </div>
            <p className="text-xs text-rose-300/80 mt-0.5">
              Runtime LangGraph đã ngắt tại Node <code className="font-mono font-bold bg-rose-950 px-1 py-0.5 rounded">human_approval</code> và đang chờ phê duyệt.
            </p>
          </div>
        </div>

        <span className="flex items-center gap-1 text-xs text-slate-400 font-mono">
          <Clock className="w-3.5 h-3.5 text-rose-400" /> Chờ tương tác
        </span>
      </div>

      {/* Ticket Draft Details */}
      <div className="bg-slate-950/80 rounded-xl p-3 border border-slate-800 space-y-2.5 text-xs mb-3.5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <div>
            <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold block">
              Hành động Đề xuất (Action):
            </span>
            <span className="font-semibold text-slate-200">
              {req.action}
            </span>
          </div>

          <div>
            <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold block">
              Mã Khách hàng (Customer ID):
            </span>
            <span className="font-mono font-bold text-amber-400">
              {req.customerId}
            </span>
          </div>
        </div>

        <div>
          <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold block">
            Lý do & Căn cứ Pháp lý:
          </span>
          <p className="text-slate-300 mt-0.5">
            {req.reason} (Áp dụng Quy định kiểm định miễn phí HD-08/2024/TKĐ-EVN).
          </p>
        </div>

        <div className="flex items-center gap-4 text-[11px] text-slate-400 font-mono pt-1.5 border-t border-slate-800/80">
          <span>Đơn vị xử lý: <strong className="text-slate-200">{req.department}</strong></span>
          <span>Cam kết thời gian: <strong className="text-emerald-400">{req.sla}</strong></span>
        </div>
      </div>

      {/* Optional Admin Note */}
      <div className="mb-3">
        <label className="text-[11px] font-medium text-slate-400 block mb-1">
          Ghi chú của Người phê duyệt (Tùy chọn):
        </label>
        <input
          type="text"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Ví dụ: Đồng ý chuyển Đội kiểm định kiểm tra trong ngày..."
          className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-rose-500"
        />
      </div>

      {/* Decision Buttons */}
      <div className="flex items-center justify-end gap-2.5">
        <button
          type="button"
          disabled={isResuming}
          onClick={() => onResume(false, comment || 'Từ chối bởi Quản trị viên')}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold border border-slate-700 transition-all disabled:opacity-50"
        >
          <XCircle className="w-4 h-4 text-slate-400" />
          <span>Từ chối (Reject)</span>
        </button>

        <button
          type="button"
          disabled={isResuming}
          onClick={() => onResume(true, comment || 'Phê duyệt bởi Quản trị viên')}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold shadow-lg shadow-emerald-600/20 transition-all disabled:opacity-50"
        >
          <CheckCircle2 className="w-4 h-4" />
          <span>{isResuming ? 'Đang Resume đồ thị...' : 'Phê duyệt & Tiếp tục (Approve & Resume)'}</span>
        </button>
      </div>
    </div>
  );
};
