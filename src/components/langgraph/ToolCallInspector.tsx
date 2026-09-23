import React from 'react';
import { 
  Wrench, 
  Clock, 
  CheckCircle2, 
  Database, 
  Calculator, 
  Users, 
  AlertCircle, 
  FileText 
} from 'lucide-react';
import { LangGraphState } from '../../types';

interface ToolCallInspectorProps {
  state: LangGraphState | null;
}

export const ToolCallInspector: React.FC<ToolCallInspectorProps> = ({ state }) => {
  if (!state || (!state.selected_tool && !state.tool_output)) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center p-6 border border-dashed border-slate-800 rounded-xl bg-slate-950/40">
        <Wrench className="w-8 h-8 text-slate-600 mb-2 animate-pulse" />
        <p className="text-sm font-semibold text-slate-300">Chưa có công cụ nào được gọi</p>
        <p className="text-xs text-slate-500 mt-1">
          Các công cụ LangChain (@tool) được kích hoạt bởi các Node trong StateGraph sẽ hiển thị dữ liệu Observation tại đây.
        </p>
      </div>
    );
  }

  const toolName = state.selected_tool || 'Unknown Tool';
  const toolInput = state.tool_input || {};
  const toolOutput = state.tool_output || {};
  const duration = toolOutput.duration_ms || 0;

  return (
    <div className="space-y-3 font-sans">
      {/* Tool Header Banner */}
      <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-emerald-950/60 border border-emerald-800/80 text-emerald-400">
            <Wrench className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold block">
              Công cụ Thực thi (LangChain Tool)
            </span>
            <span className="font-mono text-xs font-bold text-emerald-400">
              {toolName}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1 text-[11px] font-mono px-2 py-1 rounded bg-slate-950 text-cyan-400 border border-slate-800">
            <Clock className="w-3 h-3 text-cyan-400" /> {duration} ms
          </span>
          <span className="flex items-center gap-1 text-[11px] font-semibold px-2 py-1 rounded bg-emerald-950 text-emerald-400 border border-emerald-800">
            <CheckCircle2 className="w-3 h-3" /> Thành công
          </span>
        </div>
      </div>

      {/* Tool Input Parameters */}
      <div className="p-3 rounded-lg bg-slate-900/90 border border-slate-800">
        <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold block mb-1">
          Tham số Đầu vào (Tool Input Parameters):
        </span>
        <pre className="p-2 rounded bg-slate-950 text-amber-300 font-mono text-xs overflow-x-auto border border-slate-800/80">
          {JSON.stringify(toolInput, null, 2)}
        </pre>
      </div>

      {/* Special Visualization for Calculator */}
      {toolName === 'tinh_hoa_don_tien_dien' && toolOutput.tier_details && (
        <div className="p-3 rounded-lg bg-slate-900/90 border border-slate-800 space-y-2">
          <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold block">
            Chi tiết 6 Bậc thang Tính toán (Theo QĐ-05/2024/BG-BCT):
          </span>

          <div className="overflow-x-auto border border-slate-800 rounded-lg">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-950 text-slate-400 text-[10px] uppercase font-semibold border-b border-slate-800">
                <tr>
                  <th className="p-2">Bậc</th>
                  <th className="p-2">Mô tả</th>
                  <th className="p-2 text-right">Sản lượng (kWh)</th>
                  <th className="p-2 text-right">Đơn giá (đ)</th>
                  <th className="p-2 text-right">Thành tiền (đ)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 font-mono">
                {toolOutput.tier_details.map((t: any, i: number) => (
                  <tr key={i} className="hover:bg-slate-800/40">
                    <td className="p-2 font-bold text-emerald-400">Bậc {t.tier}</td>
                    <td className="p-2 text-slate-300 font-sans">{t.name}</td>
                    <td className="p-2 text-right text-slate-200">{t.kwh}</td>
                    <td className="p-2 text-right text-slate-400">{t.unitPrice.toLocaleString('vi-VN')}</td>
                    <td className="p-2 text-right font-bold text-slate-100">{t.amount.toLocaleString('vi-VN')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="p-2.5 rounded bg-slate-950 border border-slate-800/80 flex items-center justify-between text-xs font-mono">
            <span className="text-slate-400">Tổng cộng thanh toán (gồm VAT 8%):</span>
            <span className="text-base font-bold text-emerald-400">{toolOutput.formatted_total}</span>
          </div>
        </div>
      )}

      {/* Raw Observation Output */}
      <div className="p-3 rounded-lg bg-slate-900/90 border border-slate-800">
        <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold block mb-1">
          Dữ liệu Quan sát Thực tế (Tool Output / Observation):
        </span>
        <pre className="p-2.5 rounded bg-slate-950 text-emerald-300 font-mono text-xs overflow-x-auto border border-slate-800/80 max-h-72">
          {JSON.stringify(toolOutput, null, 2)}
        </pre>
      </div>
    </div>
  );
};
