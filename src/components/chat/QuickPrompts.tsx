import React, { useState } from 'react';
import promptsData from '../../data/prompts.json';
import { CustomerProfile } from '../../types';
import { Sparkles, FileText, Cpu, GitFork, ShieldAlert, ChevronDown, ChevronUp, RefreshCw } from 'lucide-react';

interface QuickPromptsProps {
  onSelectPrompt: (promptText: string) => void;
  disabled?: boolean;
  selectedCustomer?: CustomerProfile;
}

export const QuickPrompts: React.FC<QuickPromptsProps> = ({
  onSelectPrompt,
  disabled,
  selectedCustomer,
}) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [setIndex, setSetIndex] = useState<0 | 1>(0);

  // Group prompts by 4 specific types
  const type1Prompts = promptsData.filter(p => p.type === 'TYPE_1_RAG_ONLY');
  const type2Prompts = promptsData.filter(p => p.type === 'TYPE_2_TOOL_ONLY');
  const type3Prompts = promptsData.filter(p => p.type === 'TYPE_3_MULTI_STEP');
  const type4Prompts = promptsData.filter(p => p.type === 'TYPE_4_OUT_OF_SCOPE');

  // Select 1 prompt per Type based on setIndex (0: Basic, 1: Advanced)
  const activePrompts = [
    type1Prompts[setIndex % type1Prompts.length],
    type2Prompts[setIndex % type2Prompts.length],
    type3Prompts[setIndex % type3Prompts.length],
    type4Prompts[setIndex % type4Prompts.length],
  ].filter(Boolean);

  const formatPromptText = (text: string) => {
    if (!selectedCustomer) return text;
    // Replace any static PE code with currently selected customer's ID
    return text.replace(/PE\d{10,12}/g, selectedCustomer.customerId);
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'TYPE_1_RAG_ONLY':
        return <FileText className="w-3.5 h-3.5 text-cyan-400" />;
      case 'TYPE_2_TOOL_ONLY':
        return <Cpu className="w-3.5 h-3.5 text-orange-400" />;
      case 'TYPE_3_MULTI_STEP':
        return <GitFork className="w-3.5 h-3.5 text-amber-400" />;
      case 'TYPE_4_OUT_OF_SCOPE':
        return <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />;
      default:
        return <Sparkles className="w-3.5 h-3.5 text-slate-400" />;
    }
  };

  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'TYPE_1_RAG_ONLY':
        return 'bg-cyan-950/80 text-cyan-300 border-cyan-800/80';
      case 'TYPE_2_TOOL_ONLY':
        return 'bg-orange-950/80 text-orange-300 border-orange-800/80';
      case 'TYPE_3_MULTI_STEP':
        return 'bg-amber-950/80 text-amber-300 border-amber-800/80';
      case 'TYPE_4_OUT_OF_SCOPE':
        return 'bg-rose-950/80 text-rose-300 border-rose-800/80';
      default:
        return 'bg-slate-800 text-slate-400 border-slate-700';
    }
  };

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-slate-400 px-1">
        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-1.5 hover:text-slate-200 transition-colors"
        >
          <Sparkles className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
          <span className="truncate">Gợi ý 4 Luồng Thực thi (4 Type)</span>
          {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
        </button>

        {isExpanded && (
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setSetIndex(setIndex === 0 ? 1 : 0)}
              className="flex items-center gap-1 text-[10px] normal-case font-medium text-white/70 hover:text-cyan-300 px-2.5 py-0.5 rounded-full glass-card border border-white/10 hover:border-cyan-500/40 transition-colors"
              title="Đổi sang bộ kịch bản khác"
            >
              <RefreshCw className="w-2.5 h-2.5" />
              <span>{setIndex === 0 ? 'Bộ 1 (Cơ bản)' : 'Bộ 2 (Nâng cao)'}</span>
            </button>

            <span className="text-[10px] text-white/40 font-normal hidden sm:inline normal-case">
              Bấm để kích hoạt kịch bản
            </span>
          </div>
        )}
      </div>

      {isExpanded && (
        <div className="flex overflow-x-auto no-scrollbar gap-2.5 pb-1 sm:grid sm:grid-cols-2 lg:grid-cols-4 sm:overflow-visible">
          {activePrompts.map((p) => {
            const formattedText = formatPromptText(p.text);
            return (
              <button
                key={p.id}
                type="button"
                disabled={disabled}
                onClick={() => onSelectPrompt(formattedText)}
                className="min-w-[220px] sm:min-w-0 flex-1 text-left p-3 rounded-2xl glass-card border border-white/10 glass-card-hover space-y-1.5 group disabled:opacity-50 disabled:cursor-not-allowed shadow-lg flex-shrink-0"
              >
                <div className="flex items-center justify-between gap-1">
                  <span className={`font-mono text-[9px] px-2 py-0.5 rounded-full border font-semibold ${getTypeBadge(p.type)}`}>
                    {p.type.replace('TYPE_', 'T').replace('_', ' ')}
                  </span>
                  {getTypeIcon(p.type)}
                </div>

                <h5 className="font-semibold text-xs text-white group-hover:text-cyan-300 transition-colors line-clamp-1">
                  {p.title}
                </h5>

                <p className="text-[11px] text-white/70 line-clamp-2 leading-relaxed">
                  {formattedText}
                </p>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};


