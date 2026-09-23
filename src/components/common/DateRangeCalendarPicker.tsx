import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar as CalendarIcon, 
  X, 
  RotateCcw, 
  Check, 
  Sparkles,
  Clock,
  Layers
} from 'lucide-react';
import { parseDateToIso } from '../../utils/dateFilter';

export interface DateRangeCalendarPickerProps {
  startDate?: string; // ISO 'YYYY-MM-DD'
  endDate?: string;   // ISO 'YYYY-MM-DD'
  onChange: (range: { startDate?: string; endDate?: string }) => void;
  highlightedDates?: string[]; // Array of ISO date strings that have documents
  isOpen?: boolean;
  onClose?: () => void;
  className?: string;
}

const MONTH_NAMES = [
  'Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4',
  'Tháng 5', 'Tháng 6', 'Tháng 7', 'Tháng 8',
  'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12'
];

const WEEKDAY_NAMES = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];

const PRESETS = [
  { label: 'Tất cả (Mặc định)', start: undefined, end: undefined },
  { label: 'Năm 2025 (Mới nhất)', start: '2025-01-01', end: '2025-12-31' },
  { label: 'Năm 2024', start: '2024-01-01', end: '2024-12-31' },
  { label: 'Năm 2023', start: '2023-01-01', end: '2023-12-31' },
  { label: 'Năm 2021 - 2022', start: '2021-01-01', end: '2022-12-31' },
];

export const DateRangeCalendarPicker: React.FC<DateRangeCalendarPickerProps> = ({
  startDate,
  endDate,
  onChange,
  highlightedDates = [],
  isOpen = false,
  onClose,
  className = ''
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  // Staged selection state
  const [tempStart, setTempStart] = useState<string | undefined>(startDate);
  const [tempEnd, setTempEnd] = useState<string | undefined>(endDate);
  const [hoverDate, setHoverDate] = useState<string | null>(null);
  const [selectionStep, setSelectionStep] = useState<'start' | 'end'>('start');

  // Month & Year view state
  const [viewYear, setViewYear] = useState<number>(() => {
    if (startDate) {
      const parsed = parseDateToIso(startDate);
      if (parsed) return parseInt(parsed.split('-')[0], 10);
    }
    return 2024; // Default to EVN documents baseline year
  });

  const [viewMonth, setViewMonth] = useState<number>(() => {
    if (startDate) {
      const parsed = parseDateToIso(startDate);
      if (parsed) return parseInt(parsed.split('-')[1], 10) - 1;
    }
    return 5; // June (mid-year default)
  });

  // Keep internal state synced when props change
  useEffect(() => {
    setTempStart(startDate);
    setTempEnd(endDate);
    if (startDate) {
      const parsed = parseDateToIso(startDate);
      if (parsed) {
        const parts = parsed.split('-');
        setViewYear(parseInt(parts[0], 10));
        setViewMonth(parseInt(parts[1], 10) - 1);
      }
    }
  }, [startDate, endDate]);

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        if (onClose) onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onClose]);

  // Set of normalized highlighted dates for O(1) lookup
  const highlightSet = useMemo(() => {
    const set = new Set<string>();
    highlightedDates.forEach(d => {
      const iso = parseDateToIso(d);
      if (iso) set.add(iso);
    });
    return set;
  }, [highlightedDates]);

  // Navigation handlers
  const handlePrevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear(prev => prev - 1);
    } else {
      setViewMonth(prev => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear(prev => prev + 1);
    } else {
      setViewMonth(prev => prev + 1);
    }
  };

  // Build calendar matrix (42 cells: 6 rows x 7 cols)
  const calendarDays = useMemo(() => {
    const days: Array<{
      dateStr: string; // 'YYYY-MM-DD'
      dayNumber: number;
      isCurrentMonth: boolean;
      isToday: boolean;
      hasDoc: boolean;
    }> = [];

    const firstDayOfMonth = new Date(viewYear, viewMonth, 1);
    // JS getDay(): 0 is Sunday, 1 is Monday ... 6 is Saturday
    let startDayOfWeek = firstDayOfMonth.getDay() - 1; // Align to Monday as 0
    if (startDayOfWeek === -1) startDayOfWeek = 6; // Sunday becomes 6

    const daysInCurrentMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const daysInPrevMonth = new Date(viewYear, viewMonth, 0).getDate();

    const todayStr = new Date().toISOString().split('T')[0];

    // 1. Previous month trailing days
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      const dayNum = daysInPrevMonth - i;
      const prevMonth = viewMonth === 0 ? 11 : viewMonth - 1;
      const prevYear = viewMonth === 0 ? viewYear - 1 : viewYear;
      const mStr = String(prevMonth + 1).padStart(2, '0');
      const dStr = String(dayNum).padStart(2, '0');
      const dateStr = `${prevYear}-${mStr}-${dStr}`;

      days.push({
        dateStr,
        dayNumber: dayNum,
        isCurrentMonth: false,
        isToday: dateStr === todayStr,
        hasDoc: highlightSet.has(dateStr),
      });
    }

    // 2. Current month days
    for (let dayNum = 1; dayNum <= daysInCurrentMonth; dayNum++) {
      const mStr = String(viewMonth + 1).padStart(2, '0');
      const dStr = String(dayNum).padStart(2, '0');
      const dateStr = `${viewYear}-${mStr}-${dStr}`;

      days.push({
        dateStr,
        dayNumber: dayNum,
        isCurrentMonth: true,
        isToday: dateStr === todayStr,
        hasDoc: highlightSet.has(dateStr),
      });
    }

    // 3. Next month leading days to fill up 42 cells
    const remaining = 42 - days.length;
    for (let dayNum = 1; dayNum <= remaining; dayNum++) {
      const nextMonth = viewMonth === 11 ? 0 : viewMonth + 1;
      const nextYear = viewMonth === 11 ? viewYear + 1 : viewYear;
      const mStr = String(nextMonth + 1).padStart(2, '0');
      const dStr = String(dayNum).padStart(2, '0');
      const dateStr = `${nextYear}-${mStr}-${dStr}`;

      days.push({
        dateStr,
        dayNumber: dayNum,
        isCurrentMonth: false,
        isToday: dateStr === todayStr,
        hasDoc: highlightSet.has(dateStr),
      });
    }

    return days;
  }, [viewYear, viewMonth, highlightSet]);

  // Click on a date cell in the calendar
  const handleDateClick = (dateStr: string) => {
    if (selectionStep === 'start' || !tempStart) {
      setTempStart(dateStr);
      setTempEnd(undefined);
      setSelectionStep('end');
    } else {
      // Step is 'end'
      if (dateStr < tempStart) {
        // If clicked date is before start, swap them
        setTempEnd(tempStart);
        setTempStart(dateStr);
      } else {
        setTempEnd(dateStr);
      }
      setSelectionStep('start');
    }
  };

  // Apply selection
  const handleApply = () => {
    onChange({
      startDate: tempStart,
      endDate: tempEnd
    });
    if (onClose) onClose();
  };

  // Reset/Clear selection
  const handleClear = () => {
    setTempStart(undefined);
    setTempEnd(undefined);
    setSelectionStep('start');
    onChange({ startDate: undefined, endDate: undefined });
  };

  // Preset click
  const handlePresetSelect = (presetStart?: string, presetEnd?: string) => {
    setTempStart(presetStart);
    setTempEnd(presetEnd);
    setSelectionStep('start');
    if (presetStart) {
      const parsed = parseDateToIso(presetStart);
      if (parsed) {
        setViewYear(parseInt(parsed.split('-')[0], 10));
        setViewMonth(parseInt(parsed.split('-')[1], 10) - 1);
      }
    }
    onChange({ startDate: presetStart, endDate: presetEnd });
  };

  // Format date for human display (DD/MM/YYYY)
  const formatDisplay = (isoStr?: string) => {
    if (!isoStr) return '—';
    const parts = isoStr.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return isoStr;
  };

  if (!isOpen) return null;

  return (
    <div 
      ref={containerRef}
      className={`bg-slate-900/98 backdrop-blur-xl border border-slate-700/80 rounded-2xl shadow-2xl p-4 text-slate-200 z-50 animate-fadeIn font-sans ${className}`}
      style={{ minWidth: '340px', maxWidth: '380px' }}
    >
      {/* Header with Title and Close Button */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-cyan-950 border border-cyan-700/60 flex items-center justify-center text-cyan-400 shadow-sm">
            <CalendarIcon className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-slate-100 flex items-center gap-1.5">
              <span>Bảng Chọn Ngày Văn Bản</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-cyan-950 text-cyan-300 font-mono border border-cyan-800/60">
                Lịch EVN
              </span>
            </h3>
            <p className="text-[10px] text-slate-400">
              {selectionStep === 'start' ? 'Bước 1: Chọn ngày bắt đầu' : 'Bước 2: Chọn ngày kết thúc'}
            </p>
          </div>
        </div>

        {onClose && (
          <button 
            type="button"
            onClick={onClose}
            className="w-6 h-6 rounded-md hover:bg-slate-800 flex items-center justify-center text-slate-400 hover:text-slate-200 transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Quick Presets Bar */}
      <div className="py-2.5 border-b border-slate-800/80">
        <div className="flex items-center gap-1 mb-1.5 text-[10px] text-slate-400 font-medium">
          <Sparkles className="w-3 h-3 text-amber-400" />
          <span>Khoảng nhanh thông dụng:</span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {PRESETS.map((preset, idx) => {
            const isSelected = tempStart === preset.start && tempEnd === preset.end;
            return (
              <button
                key={idx}
                type="button"
                onClick={() => handlePresetSelect(preset.start, preset.end)}
                className={`px-2 py-1 rounded-md text-[10px] font-medium transition-all ${
                  isSelected
                    ? 'bg-cyan-500 text-slate-950 font-bold shadow-sm shadow-cyan-500/40 scale-102'
                    : 'bg-slate-800/90 hover:bg-slate-750 text-slate-300 hover:text-slate-100 border border-slate-700/60'
                }`}
              >
                {preset.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Month & Year Navigation */}
      <div className="flex items-center justify-between py-2.5">
        <button
          type="button"
          onClick={handlePrevMonth}
          className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-100 transition-colors"
          title="Tháng trước"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-1.5">
          <select
            value={viewMonth}
            onChange={(e) => setViewMonth(parseInt(e.target.value, 10))}
            className="bg-slate-950 border border-slate-800 rounded-md px-2 py-0.5 text-xs text-slate-200 font-semibold focus:outline-none focus:border-cyan-500 cursor-pointer"
          >
            {MONTH_NAMES.map((m, idx) => (
              <option key={idx} value={idx}>{m}</option>
            ))}
          </select>

          <select
            value={viewYear}
            onChange={(e) => setViewYear(parseInt(e.target.value, 10))}
            className="bg-slate-950 border border-slate-800 rounded-md px-2 py-0.5 text-xs text-slate-200 font-semibold font-mono focus:outline-none focus:border-cyan-500 cursor-pointer"
          >
            {[2020, 2021, 2022, 2023, 2024, 2025, 2026].map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>

        <button
          type="button"
          onClick={handleNextMonth}
          className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-100 transition-colors"
          title="Tháng sau"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Weekday Header */}
      <div className="grid grid-cols-7 gap-1 text-center mb-1">
        {WEEKDAY_NAMES.map((day, idx) => (
          <div 
            key={idx} 
            className={`text-[10px] font-semibold py-1 ${idx >= 5 ? 'text-rose-400/80' : 'text-slate-400'}`}
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Days Matrix */}
      <div className="grid grid-cols-7 gap-1">
        {calendarDays.map((cell, idx) => {
          const isStart = tempStart === cell.dateStr;
          const isEnd = tempEnd === cell.dateStr;
          const isSingle = isStart && isEnd;

          // Check if date falls in active selected range
          const inRange = Boolean(
            tempStart && 
            tempEnd && 
            cell.dateStr >= tempStart && 
            cell.dateStr <= tempEnd
          );

          // Check if date falls in active hover preview range
          const inHoverRange = Boolean(
            tempStart && 
            !tempEnd && 
            hoverDate && 
            selectionStep === 'end' &&
            ((cell.dateStr >= tempStart && cell.dateStr <= hoverDate) ||
             (cell.dateStr <= tempStart && cell.dateStr >= hoverDate))
          );

          let cellStyle = 'text-slate-300 hover:bg-slate-800/80';
          if (!cell.isCurrentMonth) {
            cellStyle = 'text-slate-600 hover:bg-slate-800/40';
          }

          if (isSingle || (isStart && !tempEnd)) {
            cellStyle = 'bg-cyan-500 text-slate-950 font-bold rounded-lg shadow-sm shadow-cyan-500/50 scale-105';
          } else if (isStart) {
            cellStyle = 'bg-cyan-500 text-slate-950 font-bold rounded-l-lg shadow-sm shadow-cyan-500/50';
          } else if (isEnd) {
            cellStyle = 'bg-cyan-500 text-slate-950 font-bold rounded-r-lg shadow-sm shadow-cyan-500/50';
          } else if (inRange) {
            cellStyle = 'bg-cyan-950/70 text-cyan-200 border-y border-cyan-800/40 rounded-none';
          } else if (inHoverRange) {
            cellStyle = 'bg-cyan-900/30 text-cyan-300 border-y border-dashed border-cyan-700/50 rounded-none';
          }

          return (
            <button
              key={idx}
              type="button"
              onClick={() => handleDateClick(cell.dateStr)}
              onMouseEnter={() => setHoverDate(cell.dateStr)}
              onMouseLeave={() => setHoverDate(null)}
              className={`relative h-7 flex flex-col items-center justify-center text-xs font-mono transition-all select-none ${cellStyle}`}
            >
              <span>{cell.dayNumber}</span>
              {/* Document presence glowing dot */}
              {cell.hasDoc && (
                <span 
                  className={`absolute bottom-0.5 w-1 h-1 rounded-full ${
                    isStart || isEnd ? 'bg-slate-950' : 'bg-cyan-400 shadow-sm shadow-cyan-400'
                  }`} 
                  title="Có văn bản EVN ban hành"
                />
              )}
            </button>
          );
        })}
      </div>

      {/* Selected Range Display Bar */}
      <div className="mt-3 p-2 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between text-xs">
        <div className="flex items-center gap-1.5 text-[11px] font-mono">
          <Clock className="w-3.5 h-3.5 text-cyan-400" />
          <span className={tempStart ? 'text-cyan-300 font-bold' : 'text-slate-500'}>
            {formatDisplay(tempStart)}
          </span>
          <span className="text-slate-600">➔</span>
          <span className={tempEnd ? 'text-cyan-300 font-bold' : 'text-slate-500'}>
            {formatDisplay(tempEnd)}
          </span>
        </div>

        {highlightSet.size > 0 && (
          <div className="flex items-center gap-1 text-[10px] text-slate-400">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 inline-block" />
            <span>Ngày có tài liệu</span>
          </div>
        )}
      </div>

      {/* Actions Footer */}
      <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={handleClear}
          className="px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:text-rose-400 hover:bg-slate-800/60 transition-colors flex items-center gap-1"
        >
          <RotateCcw className="w-3 h-3" />
          <span>Xóa lọc</span>
        </button>

        <div className="flex items-center gap-1.5">
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-750 text-slate-300 transition-colors"
            >
              Đóng
            </button>
          )}

          <button
            type="button"
            onClick={handleApply}
            className="px-3.5 py-1.5 rounded-lg text-xs font-bold bg-cyan-500 hover:bg-cyan-400 text-slate-950 flex items-center gap-1.5 shadow-md shadow-cyan-500/20 transition-all scale-100 hover:scale-102"
          >
            <Check className="w-3.5 h-3.5 stroke-[3]" />
            <span>Áp dụng</span>
          </button>
        </div>
      </div>
    </div>
  );
};
