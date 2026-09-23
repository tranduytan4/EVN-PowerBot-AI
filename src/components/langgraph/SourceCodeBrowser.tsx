import React, { useState, useEffect } from 'react';
import { 
  FileCode, 
  Copy, 
  Check, 
  BookOpen
} from 'lucide-react';

export const SourceCodeBrowser: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<string>('graph.py');
  const [fileContent, setFileContent] = useState<string>('');
  const [fileDescription, setFileDescription] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);

  const files = [
    { id: 'graph.py', label: 'graph.py', desc: 'Xây dựng StateGraph, Nodes, Edges, Conditional Routing & Checkpointer' },
    { id: 'streaming.py', label: 'streaming.py', desc: 'Động cơ Server-Sent Events (SSE) truyền phát token và sự kiện trực tiếp' },
    { id: 'semantic_cache.py', label: 'semantic_cache.py', desc: 'Bộ nhớ đệm ngữ nghĩa (Semantic Cache) với cosine similarity (< 10ms)' },
    { id: 'db_pgvector.py', label: 'db_pgvector.py', desc: 'Lớp trừu tượng PostgreSQL 16 + pgvector HNSW Index và hybrid pre-filtering' },
    { id: 'middleware.py', label: 'middleware.py', desc: 'Middleware ghi vết X-Request-ID, đo thời gian xử lý và Rate Limiting' },
    { id: 'state.py', label: 'state.py', desc: 'Định nghĩa TypedDict AgentState luân chuyển qua các Node' },
    { id: 'nodes.py', label: 'nodes.py', desc: 'Hiện thực các hàm Node xử lý độc lập và Logic điều hướng' },
    { id: 'tools.py', label: 'tools.py', desc: 'Bộ công cụ @tool LangChain: RAG, Khách hàng, Tính tiền 6 bậc' },
    { id: 'main.py', label: 'main.py', desc: 'FastAPI Backend endpoints: /run, /stream, /cache/stats, /metrics' },
    { id: 'retriever.py', label: 'retriever.py', desc: 'Adapter nạp 8 văn bản documents.json cho Python RAG' },
    { id: 'llm.py', label: 'llm.py', desc: 'Bộ tạo phản hồi có căn cứ (Grounded Generator) bám sát tài liệu' },
    { id: 'checkpoints.py', label: 'checkpoints.py', desc: 'Quản lý state snapshot và thread persistence' },
  ];

  useEffect(() => {
    fetchCode(selectedFile);
  }, [selectedFile]);

  const fetchCode = async (filename: string) => {
    setIsLoading(true);
    try {
      const res = await fetch(`http://127.0.0.1:8000/api/langgraph/code/${filename}`);
      if (res.ok) {
        const data = await res.json();
        setFileContent(data.code);
        setFileDescription(data.description);
      } else {
        setFileContent('# Không thể tải mã nguồn từ máy chủ backend.');
      }
    } catch (e) {
      setFileContent('# Đang kết nối backend tại http://127.0.0.1:8000...');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(fileContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-col h-full bg-slate-950 border border-slate-800 rounded-2xl p-4 overflow-hidden font-sans">
      {/* File Selector Tabs */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-800 flex-wrap gap-2">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full">
          {files.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setSelectedFile(f.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-semibold transition-all flex-shrink-0 ${
                selectedFile === f.id
                  ? 'bg-cyan-950 text-cyan-300 border border-cyan-700 shadow-md'
                  : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
              }`}
            >
              <FileCode className="w-3.5 h-3.5" />
              <span>{f.label}</span>
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={handleCopy}
          className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-all"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          <span>{copied ? 'Đã chép' : 'Sao chép Code'}</span>
        </button>
      </div>

      {/* Description Banner */}
      <div className="my-2.5 p-2.5 rounded-xl bg-slate-900/90 border border-slate-800 text-xs text-slate-300 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-cyan-400 flex-shrink-0" />
          <span>{fileDescription || files.find(f => f.id === selectedFile)?.desc}</span>
        </div>
        <span className="text-[10px] font-mono text-slate-500 hidden sm:inline">Python 3.13 / LangGraph Runtime</span>
      </div>

      {/* Code Area */}
      <div className="flex-1 bg-slate-950 rounded-xl border border-slate-800 p-3 overflow-auto font-mono text-xs text-slate-200 leading-relaxed select-text">
        {isLoading ? (
          <div className="flex items-center justify-center h-full text-slate-500 animate-pulse">
            Đang tải mã nguồn {selectedFile}...
          </div>
        ) : (
          <pre className="text-cyan-200">{fileContent}</pre>
        )}
      </div>
    </div>
  );
};
