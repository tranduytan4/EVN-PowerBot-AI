import React from 'react';
import { PipelineStageTiming, QueryType } from '../../types';
import { Clock, Route, Search, Cpu, GitFork, ArrowUpRight, Zap, CheckCircle2 } from 'lucide-react';

interface PipelineStageMetricsProps {
  timings: PipelineStageTiming;
  detectedType: QueryType;
  groundednessScore: number;
}

export const PipelineStageMetrics: React.FC<PipelineStageMetricsProps> = ({
  timings,
  detectedType,
  groundednessScore,
}) => {
  const stages = [
    {
      name: 'Intent Routing',
      ms: timings.intentRoutingMs,
      icon: <Route className="w-3.5 h-3.5 text-purple-400" />,
      color: 'border-purple-500/30 bg-purple-950/20 text-purple-300',
    },
    {
      name: 'BM25 Lexical',
      ms: timings.bm25SearchMs,
      icon: <Search className="w-3.5 h-3.5 text-amber-400" />,
      color: 'border-amber-500/30 bg-amber-950/20 text-amber-300',
    },
    {
      name: 'Vector Cosine',
      ms: timings.vectorSearchMs,
      icon: <Zap className="w-3.5 h-3.5 text-cyan-400" />,
      color: 'border-cyan-500/30 bg-cyan-950/20 text-cyan-300',
    },
    {
      name: 'RRF Fusion',
      ms: timings.rrfFusionMs,
      icon: <GitFork className="w-3.5 h-3.5 text-blue-400" />,
      color: 'border-blue-500/30 bg-blue-950/20 text-blue-300',
    },
    {
      name: 'Reranking',
      ms: timings.rerankingMs,
      icon: <ArrowUpRight className="w-3.5 h-3.5 text-emerald-400" />,
      color: 'border-emerald-500/30 bg-emerald-950/20 text-emerald-300',
    },
    {
      name: 'Tool Calling',
      ms: timings.toolCallingMs,
      icon: <Cpu className="w-3.5 h-3.5 text-orange-400" />,
      color: 'border-orange-500/30 bg-orange-950/20 text-orange-300',
    },
    {
      name: 'LLM Generation',
      ms: timings.generationMs,
      icon: <Clock className="w-3.5 h-3.5 text-sky-400" />,
      color: 'border-sky-500/30 bg-sky-950/20 text-sky-300',
    },
  ];

  return (
    <div className="space-y-2.5">
      {/* Top summary row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 rounded-xl bg-slate-950/90 border border-slate-800">
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400">Tổng độ trễ Pipeline:</span>
          <span className="font-mono text-xs sm:text-sm font-bold text-amber-400 bg-amber-950/50 px-2 py-0.5 rounded border border-amber-800/60">
            ⚡ {timings.totalLatencyMs} ms
          </span>
        </div>

        <div className="flex items-center gap-2.5 sm:gap-3 text-xs flex-wrap">
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400">Phân loại:</span>
            <span className="font-mono text-[10px] sm:text-xs font-semibold px-2 py-0.5 rounded bg-slate-800 text-cyan-300 border border-slate-700">
              {detectedType}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-slate-400">Groundedness:</span>
            <span className="font-mono text-xs font-bold text-emerald-400 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              {(groundednessScore * 100).toFixed(0)}%
            </span>
          </div>
        </div>
      </div>

      {/* Stage Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-7 gap-1.5 sm:gap-2">
        {stages.map((stg) => (
          <div
            key={stg.name}
            className={`p-2 rounded-xl border text-center flex flex-col items-center justify-center transition-all ${stg.color}`}
            title={`${stg.name}: ${stg.ms} ms`}
          >
            <div className="flex items-center justify-center gap-1 text-[10px] sm:text-[11px] font-medium text-slate-300 mb-0.5 max-w-full">
              {stg.icon}
              <span className="truncate sm:whitespace-normal leading-tight">{stg.name}</span>
            </div>
            <span className="font-mono text-xs font-bold text-slate-100">
              {stg.ms} ms
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

