import React from 'react';
import { Message, ViewMode } from '../../types';
import { UnderTheHoodPanel } from '../underTheHood/UnderTheHoodPanel';
import { Zap, User, PhoneCall, ShieldAlert, Cpu, CheckCircle2, FileText, ChevronDown } from 'lucide-react';

interface MessageItemProps {
  message: Message;
  viewMode: ViewMode;
  onOpenHandoff: (query: string) => void;
}

export const MessageItem: React.FC<MessageItemProps> = ({
  message,
  viewMode,
  onOpenHandoff,
}) => {
  const isAssistant = message.sender === 'assistant';

  // Format markdown content simply (bold, line breaks, lists, tables)
  const renderFormattedContent = (content: string) => {
    const lines = content.split('\n');
    return (
      <div className="space-y-2 text-xs sm:text-sm leading-relaxed text-slate-200">
        {lines.map((line, idx) => {
          if (line.startsWith('|') && line.endsWith('|')) {
            // Simple table row rendering
            const cells = line.split('|').filter(c => c.trim().length > 0);
            return (
              <div key={idx} className="flex gap-2 font-mono text-[11px] py-1 border-b border-slate-800">
                {cells.map((cell, cIdx) => (
                  <span key={cIdx} className="flex-1 text-slate-300">{cell.trim()}</span>
                ))}
              </div>
            );
          }

          if (line.startsWith('- ') || line.startsWith('• ')) {
            return (
              <div key={idx} className="flex items-start gap-2 pl-2">
                <span className="text-cyan-400 mt-1">•</span>
                <span>{formatInlineMarkdown(line.substring(2))}</span>
              </div>
            );
          }

          if (line.startsWith('---')) {
            return <hr key={idx} className="border-slate-800 my-2" />;
          }

          if (line.trim() === '') {
            return <div key={idx} className="h-1.5" />;
          }

          return <p key={idx}>{formatInlineMarkdown(line)}</p>;
        })}
      </div>
    );
  };

  const formatInlineMarkdown = (text: string) => {
    // Replace bold **text**
    const parts = text.split(/(\*\*.*?\*\*|`.*?`|\*.*?\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={i} className="font-bold text-slate-100">{part.slice(2, -2)}</strong>;
      }
      if (part.startsWith('`') && part.endsWith('`')) {
        return (
          <code key={i} className="font-mono text-[11px] bg-slate-950 px-1.5 py-0.5 rounded text-cyan-300 border border-slate-800">
            {part.slice(1, -1)}
          </code>
        );
      }
      if (part.startsWith('*') && part.endsWith('*')) {
        return <em key={i} className="italic text-slate-300">{part.slice(1, -1)}</em>;
      }
      return part;
    });
  };

  return (
    <div className={`flex gap-3 animate-fade-in-up ${isAssistant ? 'justify-start' : 'justify-end'}`}>
      {/* Assistant Avatar */}
      {isAssistant && (
        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 p-0.5 flex-shrink-0 shadow-lg shadow-orange-500/20">
          <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
            <Zap className="w-4 h-4 text-amber-400 fill-amber-400" />
          </div>
        </div>
      )}

      {/* Message Bubble Container */}
      <div className={`max-w-[96%] sm:max-w-[88%] lg:max-w-[84%] space-y-2 min-w-0`}>
        {/* Main Bubble */}
        <div
          className={`p-3.5 sm:p-5 rounded-2xl shadow-xl overflow-hidden ${
            isAssistant
              ? 'glass-card border border-white/10 text-slate-100 backdrop-blur-xl'
              : 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white border border-cyan-400/40 rounded-tr-none shadow-cyan-950/40'
          }`}
        >
          {renderFormattedContent(message.content)}

          {/* Type 4: Human Handoff Escalation Card */}
          {message.requiresHumanHandoff && isAssistant && (
            <div className="mt-4 pt-3 border-t border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-orange-950/30 p-3 rounded-xl border border-orange-500/30">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-orange-400 flex-shrink-0" />
                <span className="text-xs text-orange-200 font-semibold">
                  Cần hỗ trợ trực tiếp từ tổng đài viên?
                </span>
              </div>
              <button
                type="button"
                onClick={() => onOpenHandoff(message.content)}
                className="px-3.5 py-1.5 rounded-full bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white font-semibold text-xs shadow-md shadow-orange-950 flex items-center justify-center gap-1.5 transition-all flex-shrink-0 hover:scale-105"
              >
                <PhoneCall className="w-3.5 h-3.5" />
                <span>Gọi 19001909</span>
              </button>
            </div>
          )}
        </div>

        {/* Citations Footer (in customer mode) */}
        {isAssistant && message.trace?.citations && message.trace.citations.length > 0 && viewMode === 'customer' && (
          <div className="flex flex-wrap items-center gap-1.5 px-2 text-[11px]">
            <span className="text-white/60 font-medium">Nguồn tra cứu:</span>
            {message.trace.citations.map((c, cIdx) => (
              <span
                key={cIdx}
                className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full glass-card text-cyan-300 border border-white/10 font-mono text-[10px]"
                title={`${c.docTitle} - ${c.sectionHeading}`}
              >
                <FileText className="w-2.5 h-2.5" />
                <span>{c.docCode}</span>
              </span>
            ))}
          </div>
        )}

        {/* Engineer Mode: Under-the-Hood Inspector */}
        {isAssistant && message.trace && viewMode === 'engineer' && (
          <UnderTheHoodPanel trace={message.trace} defaultExpanded={true} />
        )}
      </div>

      {/* User Avatar */}
      {!isAssistant && (
        <div className="w-8 h-8 rounded-xl bg-slate-800 border border-white/10 p-1 flex-shrink-0 flex items-center justify-center text-slate-300 shadow-md">
          <User className="w-4 h-4 text-cyan-300" />
        </div>
      )}
    </div>
  );
};


