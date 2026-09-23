import React, { useState } from 'react';
import { 
  Layers, 
  FileText, 
  Scissors, 
  Zap, 
  Database, 
  Search, 
  GitFork, 
  ArrowUpRight, 
  Route, 
  Cpu, 
  Sparkles, 
  ShieldCheck,
  CheckCircle2,
  Code,
  Info
} from 'lucide-react';

interface ArchStep {
  id: string;
  stepNumber: number;
  name: string;
  title: string;
  icon: React.ReactNode;
  category: 'Ingestion' | 'Retrieval' | 'Agent' | 'Generation';
  summary: string;
  details: string;
  formula?: string;
  codeSnippet?: string;
  benefits: string[];
}

export const ArchitectureTab: React.FC = () => {
  const steps: ArchStep[] = [
    {
      id: 'ingest',
      stepNumber: 1,
      name: 'Document Ingest',
      title: '1. Tiếp nhận Tài liệu Nghiệp vụ (Ingestion)',
      icon: <FileText className="w-5 h-5 text-cyan-400" />,
      category: 'Ingestion',
      summary: 'Thu thập 8 bộ văn bản quy chuẩn, quy trình, biểu giá và chính sách bồi thường nội bộ của EVN.',
      details: 'Các tài liệu dạng PDF, Word, Quyết định của Bộ Công Thương & EVN được chuẩn hóa thành cấu trúc dữ liệu JSON kèm metadata đầy đủ (Mã văn bản, Đơn vị ban hành, Ngày hiệu lực, Danh sách điều khoản).',
      benefits: [
        'Duy trì tính toàn vẹn của nguồn dữ liệu gốc',
        'Lưu vết metadata để phục vụ trích dẫn chính xác (Grounding)',
        'Dễ dàng bổ sung tài liệu mới mà không cần sửa code',
      ],
    },
    {
      id: 'chunk',
      stepNumber: 2,
      name: 'Semantic Chunking',
      title: '2. Phân đoạn Văn bản (Chunking Engine)',
      icon: <Scissors className="w-5 h-5 text-amber-400" />,
      category: 'Ingestion',
      summary: 'Cắt nhỏ văn bản thành các đoạn (chunks) theo kích thước chunk_size và độ gối đầu overlap có kiểm soát.',
      details: 'Sử dụng thuật toán cắt đoạn nhận thức ranh giới câu (Sentence-aware Chunker). Mỗi chunk giữ lại tiêu đề điều khoản (Heading) và mã văn bản để không bị mất ngữ cảnh cục bộ.',
      formula: 'Overlap = 60 chars, Chunk_Size = 350 chars',
      codeSnippet: `chunkDocuments(documents, { chunkSize: 350, chunkOverlap: 60 })`,
      benefits: [
        'Tránh làm tràn Context Window của LLM',
        'Tăng độ đặc hiệu ngữ nghĩa khi nhúng vector',
        'Người dùng có thể tinh chỉnh trực tiếp trên Sidebar để thử nghiệm',
      ],
    },
    {
      id: 'embed',
      stepNumber: 3,
      name: 'Vector Embedding',
      title: '3. Nhúng Vector Ngữ nghĩa (Embedding Engine)',
      icon: <Zap className="w-5 h-5 text-cyan-400" />,
      category: 'Ingestion',
      summary: 'Chuyển đổi từng đoạn văn bản tiếng Việt thành vector số học đa chiều (128 Dimensions).',
      details: 'Ánh xạ các thuật ngữ chuyên ngành điện lực (an toàn, cao thế, cắt điện, bồi thường, biểu giá bậc thang...) vào không gian vector ngữ nghĩa đậm đặc, cho phép máy tính so khớp ý nghĩa trừu tượng thay vì chỉ so khớp mặt chữ.',
      formula: 'Embedding Vector u in R^128 (L2 Normalized: ||u||_2 = 1.0)',
      benefits: [
        'Hiểu được từ đồng nghĩa (ví dụ: mất điện ≈ cúp điện ≈ gián đoạn cung cấp điện)',
        'Tính toán trực tiếp trong trình duyệt bằng WebAssembly/JS',
      ],
    },
    {
      id: 'index',
      stepNumber: 4,
      name: 'Dual Indexing',
      title: '4. Lập Chỉ mục Kép (BM25 + Vector Store)',
      icon: <Database className="w-5 h-5 text-blue-400" />,
      category: 'Ingestion',
      summary: 'Xây dựng đồng thời 2 cấu trúc chỉ mục: Inverted Index cho từ khóa (BM25) và Vector Index cho ngữ nghĩa.',
      details: 'Inverted Index lưu tần suất xuất hiện từ vựng (Term Frequency, Inverse Document Frequency), trong khi Vector Index lưu mảng các float vector được L2-normalize để phục vụ tính nhanh Cosine Similarity.',
      benefits: [
        'Sẵn sàng cho tìm kiếm lai (Hybrid Search)',
        'Thời gian truy vấn cực nhanh (< 5ms cho kho tri thức)',
      ],
    },
    {
      id: 'retrieve',
      stepNumber: 5,
      name: 'Hybrid Retrieval (RRF)',
      title: '5. Truy xuất Lai & Hợp nhất Thứ hạng (RRF k=60)',
      icon: <GitFork className="w-5 h-5 text-purple-400" />,
      category: 'Retrieval',
      summary: 'Chạy song song BM25 và Vector Cosine Similarity, sau đó dung hòa bảng xếp hạng qua Reciprocal Rank Fusion.',
      details: 'BM25 bắt cực chuẩn các từ khóa kỹ thuật như "10 mét", "19001909", "Bậc 1". Vector Search bắt tốt ý định tổng quát. RRF kết hợp thứ hạng độc lập mà không bị lệch thang điểm.',
      formula: 'RRF_Score(d) = 1 / (60 + Rank_BM25) + 1 / (60 + Rank_Vector)',
      benefits: [
        'Khắc phục triệt để điểm yếu của cả tìm kiếm từ khóa thuần lẫn vector thuần',
        'Chuẩn mực kỹ thuật được các tập đoàn công nghệ hàng đầu áp dụng',
      ],
    },
    {
      id: 'rerank',
      stepNumber: 6,
      name: 'Cross-Reranking',
      title: '6. Tái Xếp Hạng Ngữ Cảnh (Reranking Stage)',
      icon: <ArrowUpRight className="w-5 h-5 text-emerald-400" />,
      category: 'Retrieval',
      summary: 'Chấm điểm lại Top-K ứng viên để đưa các đoạn tài liệu có liên kết logic chặt chẽ nhất lên vị trí Top 1-3.',
      details: 'Đo lường độ khớp cụm từ liên tiếp (N-gram phrase density) và độ khớp tiêu đề điều khoản. Tính toán độ dịch chuyển thứ hạng (Rank Delta) trước và sau khi Rerank.',
      benefits: [
        'Loại bỏ các đoạn tài liệu "bẫy" chỉ chứa từ khóa ngẫu nhiên',
        'Giải quyết hiện tượng "Lost in the Middle" của mô hình ngôn ngữ',
      ],
    },
    {
      id: 'agent',
      stepNumber: 7,
      name: 'Agent Routing & ReAct',
      title: '7. Điều phối Agent & Gọi Tool Động (Tool Calling)',
      icon: <Route className="w-5 h-5 text-orange-400" />,
      category: 'Agent',
      summary: 'Phân loại truy vấn thành 4 loại (Type 1-4) và thực thi vòng lặp ReAct gọi API khách hàng cá nhân.',
      details: 'Khi phát hiện câu hỏi cần dữ liệu thực tế (Hóa đơn, Công tơ, Lịch cắt điện), Agent phát lệnh gọi Tool (JSON Schema) đến mock backend EVN API, nhận kết quả (Observation) và phối hợp đa bước với tài liệu RAG.',
      formula: 'Vòng lặp ReAct: Thought -> Action(Tool, Params) -> Observation -> Synthesis',
      benefits: [
        'Cá nhân hóa câu trả lời mà không đưa dữ liệu nhạy cảm vào vector DB tĩnh',
        'Xử lý trọn vẹn kịch bản phức tạp Type 3 (Lịch cắt điện + Bồi thường)',
      ],
    },
    {
      id: 'gen',
      stepNumber: 8,
      name: 'Grounded Generation & Citation',
      title: '8. Sinh Phản Hồi & Trích Dẫn Minh Bạch (Citations)',
      icon: <Sparkles className="w-5 h-5 text-amber-400" />,
      category: 'Generation',
      summary: 'LLM tổng hợp thông tin, tuân thủ nghiêm ngặt chỉ thị System Prompt, chống ảo giác và gắn nhãn trích dẫn.',
      details: 'Mỗi câu trả lời đều có trích dẫn nguồn văn bản pháp lý chính xác dạng: [Nguồn: Quyết định ..., Mục ..., Hiệu lực ...]. Nếu ngoài phạm vi, kích hoạt Guardrail chuyển tiếp tổng đài 19001909.',
      benefits: [
        'Tuyệt đối không bịa đặt thông tin (Zero Hallucination)',
        'Khách hàng và ban quản trị có thể kiểm chứng nguồn gốc từng dòng thông tin',
      ],
    },
  ];

  const [selectedStep, setSelectedStep] = useState<ArchStep>(steps[4]); // default RRF

  return (
    <div className="p-3 sm:p-4 lg:p-8 space-y-4 sm:space-y-6 max-w-7xl mx-auto overflow-y-auto h-full scrollbar-thin">

      {/* Header Banner */}
      <div className="p-5 sm:p-6 rounded-3xl glass-panel border border-slate-700/60 space-y-2 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex items-center gap-2 text-cyan-400 text-xs font-bold uppercase tracking-wider">
          <Layers className="w-4 h-4" />
          <span>Sơ đồ Kiến trúc Toàn diện (System Architecture)</span>
        </div>
        <h2 className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-slate-100 tracking-tight">
          Quy trình Hoạt động RAG Pipeline & AI Agent ReAct Loop
        </h2>
        <p className="text-xs sm:text-sm text-slate-300 max-w-3xl leading-relaxed">
          Sơ đồ trực quan mô tả toàn bộ vòng đời xử lý dữ liệu từ khâu Ingestion văn bản nghiệp vụ điện lực đến khâu Truy xuất lai (Hybrid Search), Điều phối Agent Tool Calling và Sinh phản hồi có trích dẫn minh bạch.
        </p>
      </div>

      {/* Visual Pipeline Flow Nodes */}
      <div className="space-y-2.5">
        <label className="text-xs font-bold uppercase tracking-wider text-slate-300 block px-1">
          Bấm vào từng bước trong Pipeline để xem giải thích chuyên sâu & công thức toán học:
        </label>

        <div className="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-8 gap-2 sm:gap-2.5">
          {steps.map((stg) => {
            const isSelected = selectedStep.id === stg.id;
            return (
              <button
                key={stg.id}
                type="button"
                onClick={() => setSelectedStep(stg)}
                className={`p-3 rounded-2xl border text-left transition-all relative overflow-hidden flex flex-col justify-between min-h-[100px] sm:min-h-[115px] group ${
                  isSelected
                    ? 'border-cyan-400 bg-gradient-to-b from-cyan-950/70 to-slate-900/90 shadow-xl shadow-cyan-950/70 ring-1 ring-cyan-400/50 scale-[1.02]'
                    : 'border-slate-800/80 bg-slate-950/50 hover:border-slate-700 hover:bg-slate-900/70'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className={`w-5 h-5 rounded-full font-mono text-[10px] font-bold flex items-center justify-center border transition-colors ${
                    isSelected ? 'bg-cyan-500 text-slate-950 border-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.8)]' : 'bg-slate-800 text-slate-300 border-slate-700'
                  }`}>
                    {stg.stepNumber}
                  </span>
                  <div className="p-1 rounded-lg bg-slate-900/80 group-hover:scale-110 transition-transform">
                    {stg.icon}
                  </div>
                </div>

                <div>
                  <span className="text-[9px] sm:text-[10px] font-mono text-slate-400 block uppercase font-medium">
                    {stg.category}
                  </span>
                  <h4 className={`text-[11px] sm:text-xs font-bold line-clamp-2 leading-tight transition-colors ${
                    isSelected ? 'text-cyan-300' : 'text-slate-200 group-hover:text-cyan-300'
                  }`}>
                    {stg.name}
                  </h4>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Step Detail Card */}
      <div className="p-5 sm:p-7 rounded-3xl glass-card border border-slate-700/60 space-y-5 animate-fadeIn shadow-2xl backdrop-blur-md">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/80 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 sm:p-3 rounded-2xl bg-cyan-950 text-cyan-400 border border-cyan-800/80 shadow-lg shadow-cyan-950/50 flex-shrink-0">
              {selectedStep.icon}
            </div>
            <div>
              <span className="text-[9px] sm:text-[10px] font-mono font-semibold uppercase px-2.5 py-0.5 rounded-full bg-slate-800 text-cyan-400 border border-slate-700/80 shadow-xs">
                Giai đoạn {selectedStep.stepNumber} / 8 • {selectedStep.category}
              </span>
              <h3 className="text-lg sm:text-xl font-bold text-slate-100 mt-1 tracking-tight">
                {selectedStep.title}
              </h3>
            </div>
          </div>
        </div>

        {/* Overview & Technical Details */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 sm:gap-6">
          <div className="lg:col-span-2 space-y-4">
            <div className="space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-cyan-400">
                Tổng quan Khái niệm & Cách vận hành:
              </h4>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                {selectedStep.details}
              </p>
            </div>

            {/* Formula box if available */}
            {selectedStep.formula && (
              <div className="p-3.5 sm:p-4 rounded-2xl bg-slate-950/80 border border-amber-900/40 space-y-1.5 shadow-inner">
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 block">
                  📐 Công thức Toán học / Thuật toán:
                </span>
                <code className="font-mono text-xs text-amber-300 block overflow-x-auto whitespace-pre-wrap">
                  {selectedStep.formula}
                </code>
              </div>
            )}

            {/* Code snippet if available */}
            {selectedStep.codeSnippet && (
              <div className="p-3.5 sm:p-4 rounded-2xl bg-slate-950/80 border border-cyan-900/40 space-y-1.5 shadow-inner">
                <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-400 block flex items-center gap-1.5">
                  <Code className="w-3.5 h-3.5" />
                  <span>Mẫu Code Thực thi trong Dự án:</span>
                </span>
                <pre className="font-mono text-xs text-cyan-300 overflow-x-auto max-w-full">
                  {selectedStep.codeSnippet}
                </pre>
              </div>
            )}
          </div>

          {/* Benefits sidebar */}
          <div className="p-4 sm:p-5 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-3.5 shadow-md">
            <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4" />
              <span>Giá trị Kỹ thuật & Nghiệp vụ:</span>
            </h4>
            <ul className="space-y-2.5">
              {selectedStep.benefits.map((b, bIdx) => (
                <li key={bIdx} className="text-xs text-slate-300 flex items-start gap-2 leading-relaxed">
                  <span className="text-emerald-400 mt-0.5">✓</span>
                  <span>{b}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

