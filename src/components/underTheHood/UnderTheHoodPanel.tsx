import React, { useState } from 'react';
import { PipelineExecutionTrace } from '../../types';
import { PipelineStageMetrics } from './PipelineStageMetrics';
import { HybridComparisonTable } from './HybridComparisonTable';
import { VectorSpace2DPlot } from './VectorSpace2DPlot';
import { RerankDeltaView } from './RerankDeltaView';
import { AgentTraceViewer } from './AgentTraceViewer';
import { GroundingCitationsView } from './GroundingCitationsView';
import { EducationalBanner } from './EducationalBanner';
import { 
  Cpu, 
  GitFork, 
  Compass, 
  ArrowUpRight, 
  Terminal, 
  ShieldCheck, 
  GraduationCap,
  ChevronDown,
  ChevronUp,
  Layers
} from 'lucide-react';

interface UnderTheHoodPanelProps {
  trace: PipelineExecutionTrace;
  defaultExpanded?: boolean;
}

export const UnderTheHoodPanel: React.FC<UnderTheHoodPanelProps> = ({
  trace,
  defaultExpanded = true,
}) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const [activeSubTab, setActiveSubTab] = useState<'metrics' | 'hybrid' | 'pca' | 'rerank' | 'agent' | 'citations' | 'edu'>('metrics');

  return (
    <div className="mt-3 rounded-2xl border border-slate-700/60 glass-card overflow-hidden shadow-2xl transition-all backdrop-blur-md">
      {/* Header Bar */}
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-3 sm:px-4 py-2.5 bg-gradient-to-r from-slate-950/90 via-slate-900/80 to-cyan-950/40 border-b border-slate-800/80 flex items-center justify-between text-left group hover:bg-slate-900/60 transition-colors gap-2"
      >
        <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
          <div className="p-1.5 rounded-lg bg-cyan-950 text-cyan-400 border border-cyan-800/80 flex-shrink-0 shadow-[0_0_8px_rgba(34,211,238,0.2)]">
            <Cpu className="w-3.5 h-3.5 sm:w-4 sm:h-4 animate-pulse-slow" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
              <span className="font-bold text-xs text-slate-100 group-hover:text-cyan-300 transition-colors">
                Kỹ sư Under-the-Hood Inspector
              </span>
              <span className="font-mono text-[9px] sm:text-[10px] px-1.5 py-0.2 rounded bg-slate-800/80 text-cyan-400 border border-slate-700/60 font-semibold">
                {trace.detectedType}
              </span>
            </div>
            <p className="text-[10px] text-slate-400 truncate max-w-xs sm:max-w-md">
              {trace.intentExplanation}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 text-xs text-slate-400 flex-shrink-0">
          <span className="font-mono text-[10px] sm:text-[11px] text-amber-400 bg-amber-950/60 px-2 py-0.5 rounded-full border border-amber-800/60 font-bold shadow-xs">
            ⚡ {trace.timings.totalLatencyMs}ms
          </span>
          {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-400 group-hover:text-slate-200" /> : <ChevronDown className="w-4 h-4 text-slate-400 group-hover:text-slate-200" />}
        </div>
      </button>

      {/* Collapsible Content */}
      {isExpanded && (
        <div className="p-3 sm:p-4 space-y-3.5 animate-fadeIn">
          {/* Sub-tab Navigation (Flex-wrap to ensure all 7 tabs are always visible without clipping) */}
          <div className="flex flex-wrap items-center gap-1 sm:gap-1.5 p-1.5 rounded-xl bg-slate-950/80 border border-slate-800/80 text-xs shadow-inner">
            <button
              type="button"
              onClick={() => setActiveSubTab('metrics')}
              className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-[11px] sm:text-xs font-medium transition-all ${
                activeSubTab === 'metrics'
                  ? 'bg-slate-800 text-cyan-300 border border-slate-700/80 shadow-md font-semibold shadow-cyan-950/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60 border border-transparent'
              }`}
            >
              <Layers className="w-3.5 h-3.5 flex-shrink-0" />
              <span>Độ trễ Pipeline</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveSubTab('hybrid')}
              className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-[11px] sm:text-xs font-medium transition-all ${
                activeSubTab === 'hybrid'
                  ? 'bg-slate-800 text-cyan-300 border border-slate-700/80 shadow-md font-semibold shadow-cyan-950/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60 border border-transparent'
              }`}
            >
              <GitFork className="w-3.5 h-3.5 flex-shrink-0" />
              <span>Hybrid Search (RRF)</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveSubTab('pca')}
              className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-[11px] sm:text-xs font-medium transition-all ${
                activeSubTab === 'pca'
                  ? 'bg-slate-800 text-cyan-300 border border-slate-700/80 shadow-md font-semibold shadow-cyan-950/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60 border border-transparent'
              }`}
            >
              <Compass className="w-3.5 h-3.5 flex-shrink-0" />
              <span>Không gian Vector 2D</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveSubTab('rerank')}
              className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-[11px] sm:text-xs font-medium transition-all ${
                activeSubTab === 'rerank'
                  ? 'bg-slate-800 text-cyan-300 border border-slate-700/80 shadow-md font-semibold shadow-cyan-950/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60 border border-transparent'
              }`}
            >
              <ArrowUpRight className="w-3.5 h-3.5 flex-shrink-0" />
              <span>Reranking Delta</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveSubTab('agent')}
              className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-[11px] sm:text-xs font-medium transition-all ${
                activeSubTab === 'agent'
                  ? 'bg-slate-800 text-cyan-300 border border-slate-700/80 shadow-md font-semibold shadow-cyan-950/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60 border border-transparent'
              }`}
            >
              <Terminal className="w-3.5 h-3.5 flex-shrink-0" />
              <span>Agent ReAct Trace</span>
              {trace.agentSteps.length > 0 && (
                <span className="w-1.5 h-1.5 rounded-full bg-orange-400 shadow-[0_0_6px_rgba(251,146,60,0.8)]" />
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveSubTab('citations')}
              className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-[11px] sm:text-xs font-medium transition-all ${
                activeSubTab === 'citations'
                  ? 'bg-slate-800 text-cyan-300 border border-slate-700/80 shadow-md font-semibold shadow-cyan-950/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60 border border-transparent'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5 flex-shrink-0" />
              <span>Nguồn & Citations</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveSubTab('edu')}
              className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-[11px] sm:text-xs font-medium transition-all ${
                activeSubTab === 'edu'
                  ? 'bg-slate-800 text-amber-400 border border-amber-800/80 shadow-md font-semibold shadow-amber-950/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60 border border-transparent'
              }`}
            >
              <GraduationCap className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
              <span>Góc Kỹ Thuật</span>
            </button>
          </div>

          {/* Sub-tab Content Panels */}
          <div className="pt-1">
            {activeSubTab === 'metrics' && (
              <PipelineStageMetrics
                timings={trace.timings}
                detectedType={trace.detectedType}
                groundednessScore={trace.groundednessScore}
              />
            )}

            {activeSubTab === 'hybrid' && (
              <HybridComparisonTable
                rrfResults={trace.rrfTopResults}
                bm25Results={trace.bm25TopResults}
                vectorResults={trace.vectorTopResults}
              />
            )}

            {activeSubTab === 'pca' && (
              <VectorSpace2DPlot points={trace.vector2DPoints} />
            )}

            {activeSubTab === 'rerank' && (
              <RerankDeltaView rerankedResults={trace.rerankedResults} />
            )}

            {activeSubTab === 'agent' && (
              <AgentTraceViewer agentSteps={trace.agentSteps} />
            )}

            {activeSubTab === 'citations' && (
              <GroundingCitationsView
                citations={trace.citations}
                retrievedContext={trace.retrievedContext}
                groundednessScore={trace.groundednessScore}
              />
            )}

            {activeSubTab === 'edu' && (
              <EducationalBanner notes={trace.educationalNotes} />
            )}
          </div>
        </div>
      )}
    </div>
  );
};

