import React from 'react';
import { CustomerProfile } from '../../types';
import customersData from '../../data/customers.json';
import { User, MapPin, Zap, AlertTriangle, CheckCircle } from 'lucide-react';

interface CustomerSelectorProps {
  selectedCustomer: CustomerProfile;
  onSelectCustomer: (customer: CustomerProfile) => void;
}

export const CustomerSelector: React.FC<CustomerSelectorProps> = ({
  selectedCustomer,
  onSelectCustomer,
}) => {
  const customers = customersData as CustomerProfile[];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
          <User className="w-3.5 h-3.5 text-amber-400" />
          <span>Kịch bản Khách hàng Demo</span>
        </label>
        <span className="text-[10px] text-cyan-400 font-mono font-semibold px-2 py-0.5 rounded-full bg-cyan-950/80 border border-cyan-800/80">
          {customers.length} Profiles
        </span>
      </div>

      <div className="space-y-2">
        {customers.map((c) => {
          const isSelected = c.customerId === selectedCustomer.customerId;
          const hasOutage = c.outageSchedule?.hasOutage;
          const isUnpaid = c.currentBill?.paymentStatus === 'CHƯA THANH TOÁN';

          return (
            <button
              key={c.customerId}
              onClick={() => onSelectCustomer(c)}
              className={`w-full text-left p-3 rounded-xl border transition-all relative overflow-hidden group ${
                isSelected
                  ? 'border-cyan-400/80 bg-gradient-to-br from-cyan-950/50 via-slate-900/90 to-slate-900/90 shadow-lg shadow-cyan-950/60'
                  : 'border-slate-800/80 bg-slate-950/40 hover:border-slate-700/80 hover:bg-slate-900/60'
              }`}
            >
              {isSelected && (
                <div className="absolute top-0 left-0 bottom-0 w-1 bg-gradient-to-b from-cyan-400 to-amber-400 shadow-[0_0_8px_rgba(34,211,238,0.8)]" />
              )}

              <div className="flex items-start justify-between gap-1 mb-1">
                <span className={`font-semibold text-xs transition-colors ${isSelected ? 'text-cyan-300 font-bold' : 'text-slate-200 group-hover:text-cyan-300'}`}>
                  {c.fullName}
                </span>
                <span className="font-mono text-[10px] px-1.5 py-0.5 rounded-md bg-slate-800/80 text-slate-300 border border-slate-700/60">
                  {c.customerId}
                </span>
              </div>

              <p className="text-[11px] text-slate-400 truncate flex items-center gap-1 mb-2">
                <MapPin className="w-3 h-3 text-slate-500 flex-shrink-0" />
                <span>{c.district}, {c.city}</span>
              </p>

              {/* Badges */}
              <div className="flex flex-wrap gap-1.5 text-[10px]">
                <span className="px-1.5 py-0.5 rounded bg-slate-800/80 text-slate-300 border border-slate-700/40 font-mono">
                  ⚡ {c.meterReading.consumptionKwh} kWh
                </span>

                {hasOutage ? (
                  <span className="px-1.5 py-0.5 rounded bg-amber-950/80 text-amber-300 border border-amber-700/60 flex items-center gap-1 font-medium">
                    <AlertTriangle className="w-2.5 h-2.5 text-amber-400" /> Có lịch cắt điện T7
                  </span>
                ) : (
                  <span className="px-1.5 py-0.5 rounded bg-emerald-950/60 text-emerald-300 border border-emerald-800/40 flex items-center gap-1">
                    <CheckCircle className="w-2.5 h-2.5 text-emerald-400" /> Lưới điện ổn định
                  </span>
                )}

                {isUnpaid && (
                  <span className="px-1.5 py-0.5 rounded bg-rose-950/80 text-rose-300 border border-rose-800/60 font-semibold">
                    Chưa nộp ({c.currentBill.totalAmount.toLocaleString('vi-VN')}đ)
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
