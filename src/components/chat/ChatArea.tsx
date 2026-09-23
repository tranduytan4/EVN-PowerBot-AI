import React, { useState, useRef, useEffect } from 'react';
import { Message, ViewMode, CustomerProfile } from '../../types';
import { MessageItem } from './MessageItem';
import { QuickPrompts } from './QuickPrompts';
import { Send, Trash2, Zap, SlidersHorizontal, PanelLeftClose, PanelLeft } from 'lucide-react';

interface ChatAreaProps {
  messages: Message[];
  isLoading: boolean;
  onSendMessage: (text: string) => void;
  onClearMessages: () => void;
  viewMode: ViewMode;
  selectedCustomer: CustomerProfile;
  onOpenHandoff: (query: string) => void;
  onToggleMobileSidebar?: () => void;
  isSidebarCollapsed?: boolean;
  onToggleDesktopSidebar?: () => void;
}

export const ChatArea: React.FC<ChatAreaProps> = ({
  messages,
  isLoading,
  onSendMessage,
  onClearMessages,
  viewMode,
  selectedCustomer,
  onOpenHandoff,
  onToggleMobileSidebar,
  isSidebarCollapsed,
  onToggleDesktopSidebar,
}) => {
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    onSendMessage(input.trim());
    setInput('');
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-950/20 backdrop-blur-xs relative overflow-hidden">
      {/* Top Bar inside Chat Area */}
      <div className="h-12 border-b border-slate-800/60 px-3 sm:px-4 flex items-center justify-between bg-slate-950/50 backdrop-blur-md text-xs">
        <div className="flex items-center gap-2.5 min-w-0">
          {/* Mobile Sidebar Toggle Button */}
          {onToggleMobileSidebar && (
            <button
              type="button"
              onClick={onToggleMobileSidebar}
              className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-amber-300 md:hidden border border-amber-500/30 flex-shrink-0 transition-colors shadow-sm"
              title="Mở kịch bản khách hàng & cấu hình chunking"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Desktop Sidebar Toggle Button */}
          {onToggleDesktopSidebar && (
            <button
              type="button"
              onClick={onToggleDesktopSidebar}
              className="p-1.5 rounded-lg bg-slate-800/60 hover:bg-slate-700/80 text-slate-300 hidden md:flex items-center justify-center border border-slate-700/60 flex-shrink-0 transition-colors"
              title={isSidebarCollapsed ? 'Mở thanh bên' : 'Thu gọn thanh bên'}
            >
              {isSidebarCollapsed ? <PanelLeft className="w-3.5 h-3.5 text-cyan-400" /> : <PanelLeftClose className="w-3.5 h-3.5" />}
            </button>
          )}

          <div className="relative flex items-center justify-center flex-shrink-0">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span className="absolute w-3.5 h-3.5 rounded-full bg-emerald-400/40 animate-ping" />
          </div>

          <div className="flex items-center gap-1.5 text-xs truncate">
            <span className="font-semibold text-slate-200 hidden xs:inline tracking-tight">
              Hội thoại Trợ lý EVN
            </span>
            <span className="text-slate-600 hidden sm:inline">•</span>
            <span className="text-slate-400 truncate">
              <span className="hidden sm:inline text-slate-400">Khách hàng: </span>
              <strong className="text-cyan-400 font-semibold">{selectedCustomer.fullName}</strong>{' '}
              <span className="font-mono text-[11px] text-slate-400">({selectedCustomer.customerId})</span>
            </span>
          </div>
        </div>

        <button
          onClick={onClearMessages}
          className="p-1.5 px-2.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-950/30 border border-transparent hover:border-rose-900/40 transition-all flex items-center gap-1.5 text-[11px] flex-shrink-0"
          title="Làm mới hội thoại"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Làm mới</span>
        </button>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-3 sm:p-5 lg:p-6 space-y-5 scrollbar-thin">
        {messages.map((msg) => (
          <MessageItem
            key={msg.id}
            message={msg}
            viewMode={viewMode}
            onOpenHandoff={onOpenHandoff}
          />
        ))}

        {/* Loading Indicator with Electric Wave Metaphor */}
        {isLoading && (
          <div className="flex gap-3 animate-fadeIn">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-amber-500 via-orange-500 to-cyan-500 p-0.5 flex-shrink-0 shadow-lg shadow-orange-950/40">
              <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
                <Zap className="w-4 h-4 text-amber-400 fill-amber-400 animate-bounce" />
              </div>
            </div>

            <div className="p-3.5 sm:p-4 rounded-2xl glass-card border border-cyan-500/30 text-slate-200 space-y-2 max-w-md shadow-xl backdrop-blur-md">
              <div className="flex items-center gap-2 text-xs font-semibold text-cyan-300">
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
                <span>Đang thực thi luồng RAG & Agent Pipeline...</span>
              </div>
              <div className="h-1.5 w-full bg-slate-800/80 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-amber-500 via-cyan-400 to-blue-500 w-full animate-pulse" />
              </div>
              <p className="text-[10px] sm:text-[11px] text-slate-400 font-mono">
                BM25 + Vector Cosine + RRF Fusion + ReAct Tool Call...
              </p>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Bottom Quick Prompts & Floating Input Area */}
      <div className="p-3 sm:p-4 bg-slate-950/70 backdrop-blur-md border-t border-slate-800/60 space-y-2.5">
        {/* Quick Demo Prompts Chips */}
        <QuickPrompts
          onSelectPrompt={(text) => onSendMessage(text)}
          disabled={isLoading}
          selectedCustomer={selectedCustomer}
        />

        {/* Text Input Form */}
        <form onSubmit={handleSubmit} className="relative flex items-center group">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={isLoading}
            placeholder="Nhập câu hỏi (Ví dụ: Tra cứu hóa đơn tiền điện, quy chuẩn an toàn đứt dây điện, biểu giá 6 bậc thang...)"
            className="w-full pl-4 pr-12 py-3 rounded-2xl bg-slate-900/80 border border-slate-700/60 text-xs sm:text-sm text-slate-100 placeholder-slate-400 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/50 shadow-inner backdrop-blur-sm transition-all"
          />

          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="absolute right-2 p-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-bold disabled:opacity-30 disabled:cursor-not-allowed shadow-md shadow-orange-950/50 hover:shadow-orange-500/30 hover:scale-105 active:scale-95 transition-all flex items-center justify-center"
            title="Gửi câu hỏi"
          >
            <Send className="w-4 h-4 text-slate-950" />
          </button>
        </form>
      </div>
    </div>
  );
};

