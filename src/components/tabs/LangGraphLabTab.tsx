import React, { useState, useEffect } from 'react';
import { 
  Network, 
  Play, 
  RotateCcw, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  Send, 
  Sparkles,
  RefreshCw,
  Zap,
  Activity,
  Layers,
  Radio,
  Trash2
} from 'lucide-react';
import { 
  CustomerProfile, 
  LangGraphState, 
  LangGraphTraceStep 
} from '../../types';
import { QuickScenariosBar } from '../langgraph/QuickScenariosBar';
import { LiveGraphView } from '../langgraph/LiveGraphView';
import { ExecutionTraceTimeline } from '../langgraph/ExecutionTraceTimeline';
import { StateDiffInspector } from '../langgraph/StateDiffInspector';
import { ToolCallInspector } from '../langgraph/ToolCallInspector';
import { HumanApprovalPrompt } from '../langgraph/HumanApprovalPrompt';
import { EducationPanel } from '../langgraph/EducationPanel';
import { SourceCodeBrowser } from '../langgraph/SourceCodeBrowser';
import { ArchitectureDiagram } from '../langgraph/ArchitectureDiagram';
import { streamingClient } from '../../services/streamingClient';

interface LangGraphLabTabProps {
  selectedCustomer: CustomerProfile;
}

type InspectorTab = 'live_graph' | 'trace' | 'state' | 'tool' | 'code' | 'architecture';

interface CacheHitData {
  isHit: boolean;
  similarity: number;
  matchedQuestion: string;
  latencySavedMs: number;
}

interface CacheStats {
  total_entries: number;
  cache_hits: number;
  cache_misses: number;
  hit_ratio_percent: number;
  estimated_tokens_saved: number;
  estimated_latency_saved_ms: number;
}

export const LangGraphLabTab: React.FC<LangGraphLabTabProps> = ({ selectedCustomer }) => {
  // Core State
  const [question, setQuestion] = useState<string>('Khi phát hiện dây điện đứt rơi xuống đất hoặc đường ngập nước, người dân cần làm gì để đảm bảo an toàn?');
  const [threadId, setThreadId] = useState<string>(`thread-${Math.random().toString(36).substring(2, 8)}`);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [isResuming, setIsResuming] = useState<boolean>(false);
  const [activeInspectorTab, setActiveInspectorTab] = useState<InspectorTab>('live_graph');
  const [selectedStepIndex, setSelectedStepIndex] = useState<number | null>(null);

  // Streaming & Production Backend State
  const [useStreaming, setUseStreaming] = useState<boolean>(true);
  const [activeNodeStatus, setActiveNodeStatus] = useState<string | null>(null);
  const [streamingAnswer, setStreamingAnswer] = useState<string>('');
  const [cacheHitInfo, setCacheHitInfo] = useState<CacheHitData | null>(null);
  const [cacheStats, setCacheStats] = useState<CacheStats | null>(null);
  const [showCacheModal, setShowCacheModal] = useState<boolean>(false);

  // Backend state
  const [backendStatus, setBackendStatus] = useState<'online' | 'offline' | 'checking'>('checking');
  const [graphState, setGraphState] = useState<LangGraphState | null>(null);
  const [trace, setTrace] = useState<LangGraphTraceStep[]>([]);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Check backend health & cache stats on mount
  useEffect(() => {
    checkHealth();
    fetchCacheStats();
  }, []);

  const checkHealth = async () => {
    setBackendStatus('checking');
    try {
      const res = await fetch('http://127.0.0.1:8000/api/langgraph/health');
      if (res.ok) {
        setBackendStatus('online');
      } else {
        setBackendStatus('offline');
      }
    } catch {
      setBackendStatus('offline');
    }
  };

  const fetchCacheStats = async () => {
    try {
      const res = await fetch('http://127.0.0.1:8000/api/cache/stats');
      if (res.ok) {
        const data = await res.json();
        setCacheStats(data);
      }
    } catch {
      // Ignored if backend offline
    }
  };

  const handleClearCache = async () => {
    try {
      const res = await fetch('http://127.0.0.1:8000/api/cache/clear', { method: 'POST' });
      if (res.ok) {
        fetchCacheStats();
        setCacheHitInfo(null);
      }
    } catch (e) {
      console.error('Failed to clear cache:', e);
    }
  };

  const handleNewThread = () => {
    streamingClient.abort();
    const newId = `thread-${Math.random().toString(36).substring(2, 8)}`;
    setThreadId(newId);
    setGraphState(null);
    setTrace([]);
    setIsPaused(false);
    setSelectedStepIndex(null);
    setErrorMsg(null);
    setActiveNodeStatus(null);
    setStreamingAnswer('');
    setCacheHitInfo(null);
  };

  const handleSelectScenario = (promptText: string, customerId?: string) => {
    setQuestion(promptText);
    runGraph(promptText, customerId || selectedCustomer.customerId);
  };

  const runGraph = async (queryText?: string, customerId?: string) => {
    const q = queryText || question;
    if (!q.trim()) return;

    setIsRunning(true);
    setErrorMsg(null);
    setSelectedStepIndex(null);
    setStreamingAnswer('');
    setCacheHitInfo(null);
    setActiveNodeStatus('Đang khởi tạo kết nối backend...');

    // =========================================================================
    // MODE 1: SERVER-SENT EVENTS (SSE) STREAMING EXECUTION
    // =========================================================================
    if (useStreaming) {
      const liveTrace: LangGraphTraceStep[] = [];

      try {
        await streamingClient.startStream(
          'http://127.0.0.1:8000/api/langgraph/stream',
          {
            question: q,
            customer_id: customerId || selectedCustomer.customerId,
            thread_id: threadId
          },
          {
            onInit: () => {
              setActiveNodeStatus('⚡ Bắt đầu thực thi StateGraph...');
            },
            onCacheHit: (data) => {
              setCacheHitInfo({
                isHit: true,
                similarity: data.similarity,
                matchedQuestion: data.matched_question,
                latencySavedMs: data.latency_saved_ms
              });
              setActiveNodeStatus(data.message);
              fetchCacheStats();
            },
            onNodeStart: (data) => {
              setActiveNodeStatus(data.description);
              // Add to live trace timeline
              const step: LangGraphTraceStep = {
                step_number: liveTrace.length + 1,
                node_name: data.node,
                timestamp: data.timestamp,
                duration_ms: data.duration_ms || 0,
                input_state_summary: {},
                output_state_delta: {},
                explanation_vi: data.description
              };
              liveTrace.push(step);
              setTrace([...liveTrace]);
              setSelectedStepIndex(liveTrace.length - 1);
            },
            onToolCall: (data) => {
              const lastStep = liveTrace[liveTrace.length - 1];
              if (lastStep) {
                lastStep.tool_name = data.tool;
                lastStep.tool_input = data.input;
                lastStep.tool_output = data.observation;
                setTrace([...liveTrace]);
              }
            },
            onStateDiff: (data) => {
              const lastStep = liveTrace[liveTrace.length - 1];
              if (lastStep) {
                lastStep.output_state_delta = data.state_delta;
                lastStep.decision = data.decision;
                setTrace([...liveTrace]);
              }
            },
            onToken: (data) => {
              setStreamingAnswer(data.accumulated);
            },
            onInterrupt: (data) => {
              setIsPaused(true);
              setActiveNodeStatus('⏸ Đồ thị ngắt tại điểm Human-in-the-loop (Chờ phê duyệt)');
              setGraphState(data.state as LangGraphState);
              if (data.trace && Array.isArray(data.trace)) {
                setTrace(data.trace);
              }
            },
            onDone: (data) => {
              setIsPaused(data.is_paused || false);
              setGraphState(data.state as LangGraphState);
              if (data.trace && Array.isArray(data.trace)) {
                setTrace(data.trace);
              }
              setActiveNodeStatus(null);
              fetchCacheStats();
            },
            onError: (err) => {
              console.error('[LangGraphLab] Stream error:', err);
              setErrorMsg('Lỗi truyền phát thời gian thực. Hãy đảm bảo FastAPI backend đang chạy.');
              setBackendStatus('offline');
              setActiveNodeStatus(null);
            }
          }
        );
      } catch (err: any) {
        console.error('[LangGraphLab] Stream startup error:', err);
        setErrorMsg('Không thể kết nối SSE Stream với Backend tại http://127.0.0.1:8000.');
        setBackendStatus('offline');
      } finally {
        setIsRunning(false);
        setActiveNodeStatus(null);
      }
      return;
    }

    // =========================================================================
    // MODE 2: STANDARD BATCH JSON EXECUTION
    // =========================================================================
    try {
      const res = await fetch('http://127.0.0.1:8000/api/langgraph/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: q,
          customer_id: customerId || selectedCustomer.customerId,
          thread_id: threadId
        })
      });

      if (!res.ok) {
        throw new Error(`Server returned error ${res.status}`);
      }

      const data = await res.json();
      setGraphState(data.state);
      setTrace(data.trace || []);
      setIsPaused(data.is_paused || false);
      if (data.is_cached) {
        setCacheHitInfo({
          isHit: true,
          similarity: data.similarity || 1.0,
          matchedQuestion: data.matched_question || q,
          latencySavedMs: 650
        });
      }

      if (data.trace && data.trace.length > 0) {
        setSelectedStepIndex(data.trace.length - 1);
      }
      fetchCacheStats();
    } catch (err: any) {
      console.error('[LangGraphLab] Run error:', err);
      setErrorMsg('Không thể kết nối với LangGraph Backend tại http://127.0.0.1:8000. Hãy đảm bảo FastAPI server đang chạy.');
      setBackendStatus('offline');
    } finally {
      setIsRunning(false);
      setActiveNodeStatus(null);
    }
  };

  const handleResume = async (approved: boolean, comment?: string) => {
    setIsResuming(true);
    setErrorMsg(null);

    try {
      const res = await fetch('http://127.0.0.1:8000/api/langgraph/resume', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          thread_id: threadId,
          approved,
          approval_comment: comment
        })
      });

      if (!res.ok) {
        throw new Error(`Server returned error ${res.status}`);
      }

      const data = await res.json();
      setGraphState(data.state);
      setTrace(data.trace || []);
      setIsPaused(false);

      if (data.trace && data.trace.length > 0) {
        setSelectedStepIndex(data.trace.length - 1);
      }
      fetchCacheStats();
    } catch (err: any) {
      console.error('[LangGraphLab] Resume error:', err);
      setErrorMsg('Lỗi khi Resume LangGraph execution.');
    } finally {
      setIsResuming(false);
    }
  };

  const activeStep = selectedStepIndex !== null && trace[selectedStepIndex] ? trace[selectedStepIndex] : null;
  const currentDisplayedAnswer = streamingAnswer || graphState?.answer;

  return (
    <div className="h-full flex flex-col bg-slate-950/20 text-slate-100 overflow-hidden font-sans backdrop-blur-xs">
      {/* Top Controls Header Bar */}
      <div className="border-b border-slate-800/80 bg-slate-950/60 backdrop-blur-md px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-700 shadow-lg shadow-emerald-500/20 text-white">
            <Network className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-sm tracking-tight text-white">
                LangGraph Enterprise Engine
              </span>
              <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-700/80 shadow-[0_0_8px_rgba(52,211,153,0.3)]">
                PROD RUNTIME (SSE + CACHE)
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Truyền phát Token SSE thời gian thực, Bộ nhớ đệm Semantic Cache & Trừu tượng pgvector HNSW
            </p>
          </div>
        </div>

        {/* Status, Streaming Switch, Cache & Thread Pill */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* SSE Streaming Toggle Switch */}
          <button
            type="button"
            onClick={() => setUseStreaming(!useStreaming)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all ${
              useStreaming
                ? 'bg-cyan-950/90 border-cyan-600/80 text-cyan-300 shadow-md shadow-cyan-950/50'
                : 'bg-slate-900/70 border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
            title="Bật/Tắt chế độ Server-Sent Events (SSE) Streaming"
          >
            <Zap className={`w-3.5 h-3.5 ${useStreaming ? 'text-amber-400 fill-amber-400' : 'text-slate-500'}`} />
            <span>SSE Stream: {useStreaming ? 'BẬT' : 'TẮT'}</span>
          </button>

          {/* Semantic Cache Stats Button */}
          <button
            type="button"
            onClick={() => setShowCacheModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-slate-700/60 text-xs font-medium text-slate-300 transition-all hover:border-emerald-700/50 shadow-sm"
            title="Xem thống kê bộ nhớ đệm ngữ nghĩa Semantic Cache"
          >
            <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
            <span>Cache ({cacheStats?.total_entries || 0})</span>
          </button>

          {/* Backend Health Badge */}
          <div 
            onClick={checkHealth}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold cursor-pointer transition-all shadow-sm ${
              backendStatus === 'online' 
                ? 'bg-emerald-950/80 border-emerald-700/80 text-emerald-400 shadow-emerald-950/30'
                : 'bg-rose-950/80 border-rose-700/80 text-rose-400 animate-pulse'
            }`}
            title="Bấm để kiểm tra lại kết nối backend"
          >
            <span className={`w-2 h-2 rounded-full ${backendStatus === 'online' ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'}`} />
            <span>{backendStatus === 'online' ? 'FastAPI: Online' : 'FastAPI: Offline'}</span>
          </div>

          {/* Thread ID Badge */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900/80 border border-slate-700/60 text-xs font-mono text-slate-300 shadow-inner">
            <span className="text-slate-400">Thread:</span>
            <strong className="text-cyan-400">{threadId}</strong>
          </div>

          {/* Reset Thread Button */}
          <button
            type="button"
            onClick={handleNewThread}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700/90 text-slate-200 text-xs font-medium border border-slate-700/60 transition-all shadow-sm"
            title="Tạo Thread ID mới & xóa vết thực thi"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Thread Mới</span>
          </button>
        </div>
      </div>

      {/* Quick Scenarios Bar */}
      <div className="p-3 border-b border-slate-800/80 bg-slate-950/60 backdrop-blur-md flex-shrink-0">
        <QuickScenariosBar
          onSelectScenario={handleSelectScenario}
          isRunning={isRunning || isResuming}
        />
      </div>

      {/* Main Workspace Body */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-3.5 p-3.5 overflow-hidden min-h-0">
        {/* Left Column: Prompt Input, Final Answer, Human Approval & Education (5 Cols) */}
        <div className="lg:col-span-5 flex flex-col h-full overflow-y-auto space-y-3.5 pr-1 scrollbar-thin">
          {/* Question Input Card */}
          <div className="glass-card border border-slate-700/60 rounded-2xl p-4 shadow-xl space-y-3 backdrop-blur-md">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                <Send className="w-3.5 h-3.5 text-cyan-400" /> Nhập Câu hỏi cho LangGraph Agent
              </span>
              <span className="text-[11px] text-slate-400 font-mono">
                KH: {selectedCustomer.customerId}
              </span>
            </div>

            <textarea
              rows={3}
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Nhập câu hỏi tra cứu quy định, tiền điện hoặc kiểm tra công tơ..."
              className="w-full px-3.5 py-2.5 bg-slate-950/80 border border-slate-700/60 rounded-xl text-xs text-slate-100 placeholder-slate-400 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/50 font-sans resize-none shadow-inner"
            />

            <div className="flex items-center justify-between pt-1">
              <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
                {useStreaming ? (
                  <span className="flex items-center gap-1.5 text-cyan-400 font-medium">
                    <Radio className="w-3 h-3 text-cyan-400 animate-pulse" />
                    <span>SSE Realtime Stream</span>
                  </span>
                ) : (
                  <span>Chế độ: Đồng bộ (Batch JSON)</span>
                )}
              </div>

              <button
                type="button"
                disabled={isRunning || isResuming}
                onClick={() => runGraph()}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 text-xs font-bold shadow-lg shadow-orange-950/50 hover:scale-105 active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {isRunning ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin text-slate-950" />
                    <span>Đang truyền phát...</span>
                  </>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5 fill-slate-950 text-slate-950" />
                    <span>Chạy Agent</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Real-time Node Status Banner (Live Streaming Progress) */}
          {isRunning && activeNodeStatus && (
            <div className="p-3.5 rounded-2xl bg-cyan-950/60 border border-cyan-500/60 text-cyan-200 text-xs flex items-center gap-2.5 animate-pulse shadow-lg shadow-cyan-950/50 backdrop-blur-md">
              <Activity className="w-4 h-4 text-cyan-400 flex-shrink-0 animate-spin" />
              <div className="flex-1 font-medium truncate">
                {activeNodeStatus}
              </div>
            </div>
          )}

          {/* Semantic Cache Hit Notification Badge */}
          {cacheHitInfo?.isHit && (
            <div className="p-3.5 rounded-2xl bg-emerald-950/60 border border-emerald-500/60 text-emerald-200 text-xs flex items-start gap-2.5 shadow-xl shadow-emerald-950/50 animate-fadeIn backdrop-blur-md">
              <Sparkles className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <strong className="font-bold text-emerald-300">
                    ⚡ Phản hồi tức thì từ Semantic Cache!
                  </strong>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-900/80 text-emerald-200 font-mono font-bold border border-emerald-700/60">
                    {Math.round(cacheHitInfo.similarity * 100)}% Tương đồng
                  </span>
                </div>
                <p className="text-[11px] text-emerald-300/90">
                  Tiết kiệm ~{cacheHitInfo.latencySavedMs}ms độ trễ suy luận & 100% chi phí Token LLM.
                </p>
                <p className="text-[10px] text-slate-400 italic">
                  Khớp với câu hỏi gốc: "{cacheHitInfo.matchedQuestion}"
                </p>
              </div>
            </div>
          )}

          {/* Backend Error Alert */}
          {errorMsg && (
            <div className="p-3.5 rounded-2xl bg-rose-950/60 border border-rose-700/80 text-rose-300 text-xs flex items-start gap-2 animate-fadeIn backdrop-blur-md">
              <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
              <div>
                <strong className="block font-semibold mb-0.5">Lỗi thực thi:</strong>
                {errorMsg}
              </div>
            </div>
          )}

          {/* Human-in-the-loop Approval Banner */}
          {isPaused && (
            <HumanApprovalPrompt
              state={graphState}
              isPaused={isPaused}
              onResume={handleResume}
              isResuming={isResuming}
            />
          )}

          {/* Final / Streaming Answer Card */}
          {currentDisplayedAnswer && !isPaused && (
            <div className="glass-card border border-emerald-500/30 rounded-2xl p-4 shadow-xl space-y-2.5 backdrop-blur-md">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800/80">
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                    {isRunning ? 'Đang truyền phát câu trả lời (SSE Stream)...' : 'Kết quả Sinh ra từ StateGraph'}
                  </span>
                </div>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800">
                  {cacheHitInfo?.isHit ? '⚡ Cached Response' : 'Grounded Response'}
                </span>
              </div>

              <div className="text-xs text-slate-200 leading-relaxed whitespace-pre-line bg-slate-950/80 p-3.5 rounded-xl border border-slate-800/80 font-sans relative shadow-inner">
                {currentDisplayedAnswer}
                {isRunning && (
                  <span className="inline-block w-1.5 h-3.5 bg-cyan-400 ml-1 animate-pulse align-middle" />
                )}
              </div>
            </div>
          )}

          {/* Education Explanations */}
          <div className="flex-1">
            <EducationPanel
              activeStep={activeStep}
              totalSteps={trace.length}
            />
          </div>
        </div>

        {/* Right Column: Multi-tab Deep Inspector (7 Cols) */}
        <div className="lg:col-span-7 flex flex-col h-full glass-card border border-slate-700/60 rounded-3xl overflow-hidden shadow-2xl backdrop-blur-md">
          {/* Inspector Tab Bar */}
          <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-slate-800/80 bg-slate-950/70 flex-wrap gap-1.5 backdrop-blur-md">
            <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 scrollbar-thin">
              <button
                type="button"
                onClick={() => setActiveInspectorTab('live_graph')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                  activeInspectorTab === 'live_graph'
                    ? 'bg-slate-800 text-cyan-300 border border-slate-700/80 shadow-md shadow-cyan-950/40'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
                }`}
              >
                <Network className="w-3.5 h-3.5" />
                <span>Live StateGraph</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveInspectorTab('trace')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                  activeInspectorTab === 'trace'
                    ? 'bg-slate-800 text-cyan-300 border border-slate-700/80 shadow-md shadow-cyan-950/40'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
                }`}
              >
                <Clock className="w-3.5 h-3.5" />
                <span>Trace Timeline ({trace.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveInspectorTab('state')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                  activeInspectorTab === 'state'
                    ? 'bg-slate-800 text-cyan-300 border border-slate-700/80 shadow-md shadow-cyan-950/40'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>State TypedDict</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveInspectorTab('tool')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                  activeInspectorTab === 'tool'
                    ? 'bg-slate-800 text-cyan-300 border border-slate-700/80 shadow-md shadow-cyan-950/40'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
                }`}
              >
                <Activity className="w-3.5 h-3.5" />
                <span>Tool Inspection</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveInspectorTab('code')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                  activeInspectorTab === 'code'
                    ? 'bg-slate-800 text-cyan-300 border border-slate-700/80 shadow-md shadow-cyan-950/40'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
                }`}
              >
                <span>Code Browser</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveInspectorTab('architecture')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                  activeInspectorTab === 'architecture'
                    ? 'bg-slate-800 text-cyan-300 border border-slate-700/80 shadow-md shadow-cyan-950/40'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
                }`}
              >
                <span>Architecture</span>
              </button>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[10px] text-slate-500 font-mono">
                {activeStep ? `Bước ${activeStep.step_number}/${trace.length}: ${activeStep.node_name}` : 'Chưa có bước'}
              </span>
            </div>
          </div>

          {/* Inspector Content Area */}
          <div className="flex-1 p-3 overflow-hidden min-h-0">
            {activeInspectorTab === 'live_graph' && (
              <LiveGraphView
                trace={trace}
                isPaused={isPaused}
                isRunning={isRunning}
                selectedStepIndex={selectedStepIndex}
                onSelectStep={(idx) => setSelectedStepIndex(idx)}
              />
            )}

            {activeInspectorTab === 'trace' && (
              <ExecutionTraceTimeline
                trace={trace}
                selectedStepIndex={selectedStepIndex}
                onSelectStep={(idx) => setSelectedStepIndex(idx)}
              />
            )}

            {activeInspectorTab === 'state' && (
              <StateDiffInspector
                state={graphState}
                trace={trace}
                selectedStepIndex={selectedStepIndex}
                onSelectStep={(idx) => setSelectedStepIndex(idx)}
              />
            )}

            {activeInspectorTab === 'tool' && (
              <ToolCallInspector
                state={graphState}
              />
            )}

            {activeInspectorTab === 'code' && (
              <SourceCodeBrowser />
            )}

            {activeInspectorTab === 'architecture' && (
              <ArchitectureDiagram />
            )}
          </div>
        </div>
      </div>

      {/* Semantic Cache Management Modal */}
      {showCacheModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-slate-900 border border-slate-700/80 rounded-2xl p-5 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-emerald-950 text-emerald-400 border border-emerald-800">
                  <Sparkles className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-bold text-slate-100">
                  Thống kê Semantic Cache (Vector Cache)
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowCacheModal(false)}
                className="text-slate-400 hover:text-slate-200 text-xs px-2 py-1 rounded bg-slate-800"
              >
                Đóng
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2.5 text-xs">
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                <span className="text-[10px] text-slate-400 block font-medium">Số mục đã cache</span>
                <strong className="text-base text-cyan-400 font-mono">
                  {cacheStats?.total_entries || 0} / 500
                </strong>
              </div>

              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                <span className="text-[10px] text-slate-400 block font-medium">Tỷ lệ Trúng Cache</span>
                <strong className="text-base text-emerald-400 font-mono">
                  {cacheStats?.hit_ratio_percent || 0}%
                </strong>
              </div>

              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                <span className="text-[10px] text-slate-400 block font-medium">Ước tính Token tiết kiệm</span>
                <strong className="text-base text-amber-400 font-mono">
                  {cacheStats?.estimated_tokens_saved || 0} tokens
                </strong>
              </div>

              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                <span className="text-[10px] text-slate-400 block font-medium">Độ trễ đã tiết kiệm</span>
                <strong className="text-base text-purple-400 font-mono">
                  {cacheStats?.estimated_latency_saved_ms || 0} ms
                </strong>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 text-[11px] text-slate-400 space-y-1">
              <p>
                💡 <strong>Cơ chế hoạt động:</strong> Mỗi câu hỏi được nhúng thành vector 64 chiều. Khi câu hỏi mới có độ tương đồng Cosine $\ge 0.85$, hệ thống trả về kết quả ngay trong <strong>&lt; 10ms</strong> mà không cần chạy lại đồ thị.
              </p>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={handleClearCache}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-950/80 hover:bg-rose-900 text-rose-300 text-xs font-semibold border border-rose-800 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Xóa toàn bộ Cache</span>
              </button>

              <button
                type="button"
                onClick={() => setShowCacheModal(false)}
                className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-colors"
              >
                Xong
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
