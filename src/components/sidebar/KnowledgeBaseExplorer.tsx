import React, { useState, useMemo, useEffect } from 'react';
import { DocumentItem, ChunkItem, DocumentDateFilter } from '../../types';
import { 
  BookOpen, 
  FileText, 
  ChevronDown, 
  ChevronRight, 
  Tag, 
  Calendar, 
  Search, 
  X, 
  RotateCcw,
  AlertCircle,
  SlidersHorizontal
} from 'lucide-react';
import { filterDocumentsByDate, filterChunksByDate } from '../../utils/dateFilter';
import { ragPipeline } from '../../services/ragPipeline';
import { DateRangeCalendarPicker } from '../common/DateRangeCalendarPicker';

interface KnowledgeBaseExplorerProps {
  documents: DocumentItem[];
  chunks: ChunkItem[];
  onFilterChange?: (filter: DocumentDateFilter) => void;
}

export const KnowledgeBaseExplorer: React.FC<KnowledgeBaseExplorerProps> = ({
  documents,
  chunks,
  onFilterChange,
}) => {
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [isCalendarOpen, setIsCalendarOpen] = useState<boolean>(false);

  // Sync date filter with ragPipeline singleton and optional callback
  useEffect(() => {
    const filter: DocumentDateFilter = {
      startDate: startDate || undefined,
      endDate: endDate || undefined,
    };
    ragPipeline.setDateFilter(filter);
    if (onFilterChange) {
      onFilterChange(filter);
    }
  }, [startDate, endDate, onFilterChange]);

  const hasActiveDateFilter = Boolean(startDate || endDate);

  const handleClearFilters = () => {
    setStartDate('');
    setEndDate('');
    setSearchQuery('');
    ragPipeline.clearDateFilter();
  };

  const handleCalendarChange = (range: { startDate?: string; endDate?: string }) => {
    setStartDate(range.startDate || '');
    setEndDate(range.endDate || '');
  };

  // 1. Extract all unique document effective dates to highlight on calendar
  const docDates = useMemo(() => {
    return documents.map(d => d.effectiveDate).filter(Boolean);
  }, [documents]);

  // 2. Filter documents by date
  const dateFilteredDocs = useMemo(() => {
    return filterDocumentsByDate(documents, {
      startDate: startDate || undefined,
      endDate: endDate || undefined,
    });
  }, [documents, startDate, endDate]);

  // 3. Filter documents by text query
  const filteredDocs = useMemo(() => {
    if (!searchQuery.trim()) {
      return dateFilteredDocs;
    }
    const q = searchQuery.toLowerCase().trim();
    return dateFilteredDocs.filter((doc) =>
      doc.title.toLowerCase().includes(q) ||
      doc.docCode.toLowerCase().includes(q) ||
      doc.category.toLowerCase().includes(q) ||
      doc.summary.toLowerCase().includes(q)
    );
  }, [dateFilteredDocs, searchQuery]);

  // 4. Filter matching chunks corresponding to the date filter
  const dateFilteredChunks = useMemo(() => {
    return filterChunksByDate(chunks, {
      startDate: startDate || undefined,
      endDate: endDate || undefined,
    });
  }, [chunks, startDate, endDate]);

  // Format date helper (YYYY-MM-DD -> DD/MM/YYYY)
  const formatHumanDate = (isoStr?: string) => {
    if (!isoStr) return '';
    const parts = isoStr.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return isoStr;
  };

  return (
    <div className="space-y-3 font-sans relative">
      {/* Header with Title and Document Count */}
      <div className="flex items-center justify-between">
        <label className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
          <BookOpen className="w-3.5 h-3.5 text-cyan-400" />
          <span>Kho Tri thức Nội bộ (RAG KB)</span>
        </label>
        <span className="text-[10px] text-cyan-400 font-mono font-semibold px-2 py-0.5 rounded-full bg-cyan-950/80 border border-cyan-800/80 shadow-xs">
          {filteredDocs.length}/{documents.length} Docs
        </span>
      </div>

      {/* Filter and Search Bar Controls */}
      <div className="space-y-2 bg-slate-900/60 backdrop-blur-md p-2.5 rounded-2xl border border-slate-800/80 shadow-sm">
        {/* Search input */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm tên, mã văn bản, chủ đề..."
            className="w-full bg-slate-950/80 border border-slate-700/60 rounded-xl pl-8 pr-7 py-2 text-xs text-slate-100 placeholder-slate-400 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/50 shadow-inner"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Visual Interactive Calendar Trigger Pill */}
        <div className="relative">
          <div className="flex items-center justify-between gap-1.5">
            <button
              type="button"
              onClick={() => setIsCalendarOpen(!isCalendarOpen)}
              className={`flex-1 flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium border transition-all ${
                hasActiveDateFilter
                  ? 'bg-cyan-950/80 text-cyan-300 border-cyan-600/80 shadow-md shadow-cyan-950/50'
                  : 'bg-slate-950/70 text-slate-300 border-slate-800 hover:border-slate-700 hover:bg-slate-800/60'
              }`}
            >
              <div className="flex items-center gap-2 truncate">
                <Calendar className={`w-3.5 h-3.5 flex-shrink-0 ${hasActiveDateFilter ? 'text-cyan-400' : 'text-slate-400'}`} />
                {hasActiveDateFilter ? (
                  <span className="font-mono text-[11px] truncate text-cyan-300 font-semibold">
                    {formatHumanDate(startDate) || 'Từ đầu'} ➔ {formatHumanDate(endDate) || 'Hiện tại'}
                  </span>
                ) : (
                  <span className="text-[11px] text-slate-400 truncate">
                    Chọn khoảng ngày trên lịch...
                  </span>
                )}
              </div>

              <div className="flex items-center gap-1.5 flex-shrink-0">
                {hasActiveDateFilter && (
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_6px_rgba(34,211,238,0.8)]" />
                )}
                <SlidersHorizontal className={`w-3 h-3 text-slate-400 transition-transform ${isCalendarOpen ? 'text-cyan-400 rotate-180' : ''}`} />
              </div>
            </button>

            {(hasActiveDateFilter || searchQuery) && (
              <button
                type="button"
                onClick={handleClearFilters}
                className="p-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-400 hover:text-rose-400 hover:border-rose-900/50 transition-colors"
                title="Đặt lại toàn bộ bộ lọc"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Floating Calendar Popover */}
          {isCalendarOpen && (
            <div className="absolute left-0 top-full mt-1.5 z-50">
              <DateRangeCalendarPicker
                isOpen={isCalendarOpen}
                startDate={startDate}
                endDate={endDate}
                onChange={handleCalendarChange}
                highlightedDates={docDates}
                onClose={() => setIsCalendarOpen(false)}
              />
            </div>
          )}
        </div>

        {/* Active Filter Info Badge (When filter is set) */}
        {hasActiveDateFilter && (
          <div className="p-2 rounded-xl bg-cyan-950/50 border border-cyan-800/50 text-[10px] text-cyan-300 font-mono flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
              <span>Đã lọc: {formatHumanDate(startDate) || '—'} đến {formatHumanDate(endDate) || '—'}</span>
            </span>
            <span className="text-slate-400 font-sans">
              ({filteredDocs.length}/{documents.length} docs)
            </span>
          </div>
        )}
      </div>

      {/* Document Items List */}
      <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1 scrollbar-thin">
        {filteredDocs.length === 0 ? (
          <div className="p-4 text-center border border-dashed border-slate-800 rounded-xl bg-slate-950/40 space-y-2">
            <AlertCircle className="w-5 h-5 text-slate-500 mx-auto" />
            <p className="text-xs text-slate-400 font-medium">
              Không có tài liệu nào phù hợp với bộ lọc hiện tại.
            </p>
            <button
              type="button"
              onClick={handleClearFilters}
              className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-cyan-400 text-xs font-semibold transition-colors"
            >
              Đặt lại bộ lọc
            </button>
          </div>
        ) : (
          filteredDocs.map((doc) => {
            const isExpanded = selectedDocId === doc.id;
            const docChunks = dateFilteredChunks.filter((c) => c.docId === doc.id);

            return (
              <div
                key={doc.id}
                className={`rounded-xl border transition-all ${
                  isExpanded
                    ? 'border-cyan-500/60 bg-slate-900/90 shadow-md'
                    : 'border-slate-800/80 bg-slate-950/40 hover:border-slate-700'
                }`}
              >
                {/* Doc Item Header */}
                <button
                  type="button"
                  onClick={() => setSelectedDocId(isExpanded ? null : doc.id)}
                  className="w-full text-left p-2.5 flex items-start justify-between gap-2"
                >
                  <div className="flex items-start gap-2">
                    <div className="p-1.5 rounded-lg bg-slate-800 text-cyan-400 mt-0.5 flex-shrink-0">
                      <FileText className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-mono text-[10px] text-amber-400 font-semibold">
                          {doc.docCode}
                        </span>
                        <span className="flex items-center gap-0.5 text-[9px] text-slate-400 font-mono px-1.5 py-0.2 rounded bg-slate-900 border border-slate-800">
                          <Calendar className="w-2.5 h-2.5 text-cyan-400" />
                          <span>{doc.effectiveDate}</span>
                        </span>
                      </div>

                      <h4 className="text-xs font-semibold text-slate-200 line-clamp-1 leading-snug mt-0.5">
                        {doc.title}
                      </h4>

                      <div className="flex items-center gap-2 mt-1 text-[10px] text-slate-400">
                        <span className="flex items-center gap-1">
                          <Tag className="w-2.5 h-2.5" /> {doc.category}
                        </span>
                        <span>•</span>
                        <span className="text-cyan-400 font-mono">{docChunks.length} chunks</span>
                      </div>
                    </div>
                  </div>

                  <div className="p-1 text-slate-400 hover:text-slate-200">
                    {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                  </div>
                </button>

                {/* Expanded Chunks Details */}
                {isExpanded && (
                  <div className="px-3 pb-3 pt-1 space-y-2 border-t border-slate-800/60 bg-slate-950/60 animate-fadeIn">
                    <p className="text-[11px] text-slate-400 italic">
                      {doc.summary}
                    </p>

                    <div className="space-y-1.5 pt-1">
                      <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
                        Danh sách các đoạn văn bản (Chunks):
                      </span>
                      {docChunks.map((chk) => (
                        <div
                          key={chk.id}
                          className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-[11px] space-y-1 hover:border-slate-700 transition-colors"
                        >
                          <div className="flex items-center justify-between text-slate-400 text-[10px]">
                            <span className="font-mono text-cyan-400 font-semibold">#{chk.id}</span>
                            <span className="text-slate-500">
                              {chk.tokenCount} tokens (~{chk.content.length} chars)
                            </span>
                          </div>
                          <p className="text-slate-300 font-medium text-[11px] line-clamp-1">
                            📌 {chk.sectionHeading}
                          </p>
                          <p className="text-slate-400 text-[10px] line-clamp-2 leading-relaxed">
                            {chk.content}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
