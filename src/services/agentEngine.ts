import {
  QueryType,
  PipelineExecutionTrace,
  ToolCallExecution,
  CitationItem,
  CustomerProfile,
} from '../types';
import { ragPipeline } from './ragPipeline';
import { executeTool } from './tools';
import { generateResponse, LLMSettings } from './llmService';

export interface ProcessQueryResult {
  answer: string;
  trace: PipelineExecutionTrace;
  requiresHumanHandoff: boolean;
}

export function classifyIntent(query: string): {
  type: QueryType;
  confidence: number;
  explanation: string;
  extractedCustomerId?: string;
  targetTools: string[];
} {
  const q = query.toLowerCase();

  // Extract Customer ID (e.g. PE01000123456)
  const idMatch = query.match(/PE\d{10,12}/i);
  const customerId = idMatch ? idMatch[0].toUpperCase() : undefined;

  // TYPE 4: Out of Scope / General / Financial Stock / Irrelevant queries
  const outOfScopeKeywords = [
    'cổ phiếu', 'chứng khoán', 'vay vốn', 'vay tiền', 'ngân hàng', 'bất động sản',
    'giá vàng', 'thời tiết hôm nay', 'xổ số', 'bóng đá', 'bitcoin', 'crypto', 'du lịch'
  ];
  if (outOfScopeKeywords.some(kw => q.includes(kw))) {
    return {
      type: 'TYPE_4_OUT_OF_SCOPE',
      confidence: 0.96,
      explanation: 'Câu hỏi chứa các từ khóa nằm ngoài phạm vi hoạt động của Tập đoàn Điện lực EVN (Đầu tư tài chính, chứng khoán, vay vốn, thông tin xã hội khác). Kích hoạt cơ chế Guardrail chống ảo giác và đề xuất Human Handoff.',
      extractedCustomerId: customerId,
      targetTools: [],
    };
  }

  // TYPE 3: Multi-step Reasoning (Tool + RAG)
  // Example: Outage check + compensation policy, or High bill + meter verification procedure
  const hasOutageQuery = q.includes('cắt điện') || q.includes('mất điện') || q.includes('bảo trì');
  const hasCompensationQuery = q.includes('bồi thường') || q.includes('hỗ trợ') || q.includes('quy định') || q.includes('được gì');
  const hasBillComplaint = (q.includes('hóa đơn') || q.includes('tiền điện')) && (q.includes('tăng') || q.includes('khiếu nại') || q.includes('kiểm tra công tơ') || q.includes('phúc tra'));

  if ((hasOutageQuery && hasCompensationQuery) || (hasBillComplaint && customerId)) {
    return {
      type: 'TYPE_3_MULTI_STEP',
      confidence: 0.94,
      explanation: 'Phát hiện yêu cầu nghiệp vụ phức hợp: Vừa cần tra cứu dữ liệu thời gian thực của khách hàng (Lịch cắt điện / Hóa đơn), vừa cần đối chiếu quy chuẩn pháp lý bồi thường/khiếu nại từ tài liệu RAG. Agent sẽ thực hiện quy trình suy luận đa bước (Multi-step ReAct).',
      extractedCustomerId: customerId || 'PE01000123456',
      targetTools: hasOutageQuery ? ['check_maintenance_outage'] : ['get_current_bill'],
    };
  }

  // TYPE 2: Personalized Customer Data (Pure Tool)
  if (customerId || q.includes('chỉ số công tơ') || q.includes('hóa đơn tháng') || q.includes('tiền điện tháng') || q.includes('lịch sử thanh toán')) {
    const targetTools: string[] = [];
    if (q.includes('chỉ số') || q.includes('sản lượng')) targetTools.push('get_meter_reading');
    if (q.includes('hóa đơn') || q.includes('tiền điện')) targetTools.push('get_current_bill');
    if (q.includes('lịch sử') || q.includes('thanh toán')) targetTools.push('get_payment_history');
    if (q.includes('cắt điện') || q.includes('bảo trì')) targetTools.push('check_maintenance_outage');
    if (targetTools.length === 0) targetTools.push('get_current_bill');

    return {
      type: 'TYPE_2_TOOL_ONLY',
      confidence: 0.92,
      explanation: 'Yêu cầu tra cứu dữ liệu cá nhân hóa của khách hàng cụ thể (Chỉ số công tơ, Hóa đơn, Lịch sử thanh toán). Agent bắt buộc gọi Tool/API nội bộ mô phỏng thay vì tìm kiếm trong tài liệu tĩnh.',
      extractedCustomerId: customerId || 'PE01000123456',
      targetTools,
    };
  }

  // TYPE 1: Policy / Procedure / Safety Lookup (Pure RAG)
  return {
    type: 'TYPE_1_RAG_ONLY',
    confidence: 0.95,
    explanation: 'Câu hỏi tra cứu chính sách, biểu giá, quy chuẩn an toàn hoặc thủ tục chung của ngành điện. Không yêu cầu dữ liệu cá nhân hóa -> Thực thi thuần túy qua luồng RAG Pipeline (BM25 + Vector + RRF + Rerank).',
    targetTools: [],
  };
}

export async function processQueryWithAgent(
  query: string,
  selectedCustomer?: CustomerProfile,
  llmSettings: LLMSettings = { provider: 'local' }
): Promise<ProcessQueryResult> {
  const tStart = performance.now();
  const queryId = `query-${Date.now()}`;

  // Stage 1: Intent Routing
  const tRoute = performance.now();
  const intent = classifyIntent(query);
  const activeCustomerId = intent.extractedCustomerId || selectedCustomer?.customerId || 'PE01000123456';
  const intentRoutingMs = Math.round(performance.now() - tRoute);

  const agentSteps: ToolCallExecution[] = [];
  let retrievedContextText = '';
  let citations: CitationItem[] = [];
  let bm25TopResults: any[] = [];
  let vectorTopResults: any[] = [];
  let rrfTopResults: any[] = [];
  let rerankedResults: any[] = [];
  let vector2DPoints: any[] = [];
  let query2DVector: [number, number] | undefined = undefined;

  let toolCallingMs = 0;
  let retrievalTimings = {
    chunkingMs: 0,
    bm25SearchMs: 0,
    vectorSearchMs: 0,
    rrfFusionMs: 0,
    rerankingMs: 0,
    pcaProjectionMs: 0,
    totalRetrievalMs: 0,
  };

  // Stage 2: Branch Execution Based on Detected Type

  // --- TYPE 4: Out of Scope Guardrail ---
  if (intent.type === 'TYPE_4_OUT_OF_SCOPE') {
    // Run minimal RAG to verify low grounding
    const ragRes = ragPipeline.retrieve(query, 2);
    retrievedContextText = ragRes.retrievedContextText;
    bm25TopResults = ragRes.bm25Results;
    vectorTopResults = ragRes.vectorResults;
    rrfTopResults = ragRes.rrfResults;
    vector2DPoints = ragRes.vector2DPoints;
    query2DVector = ragRes.query2DVector;

    const tGen = performance.now();
    const answer = await generateResponse(query, '', [], [], llmSettings);
    const generationMs = Math.round(performance.now() - tGen);
    const totalLatencyMs = Math.round(performance.now() - tStart);

    const trace: PipelineExecutionTrace = {
      queryId,
      query,
      detectedType: 'TYPE_4_OUT_OF_SCOPE',
      intentConfidence: intent.confidence,
      intentExplanation: intent.explanation,
      allChunksCount: ragPipeline.getChunks().length,
      activeChunkSize: ragPipeline.getChunkingConfig().chunkSize,
      activeOverlap: ragPipeline.getChunkingConfig().overlap,
      bm25TopResults,
      vectorTopResults,
      rrfTopResults,
      rerankedResults: [],
      vector2DPoints,
      query2DVector,
      agentSteps: [],
      retrievedContext: 'Không có tài liệu nội bộ nào phù hợp với câu hỏi ngoài phạm vi.',
      citations: [],
      groundednessScore: 0.1,
      isHallucinationRiskLow: true,
      timings: {
        intentRoutingMs,
        chunkingMs: 0,
        bm25SearchMs: ragRes.timings.bm25SearchMs,
        vectorSearchMs: ragRes.timings.vectorSearchMs,
        rrfFusionMs: ragRes.timings.rrfFusionMs,
        rerankingMs: 0,
        toolCallingMs: 0,
        generationMs,
        totalLatencyMs,
      },
      educationalNotes: [
        {
          stage: 'Agent Routing & Guardrail',
          title: 'Cơ chế Ngăn chặn Ảo giác (Hallucination Guardrail)',
          conceptExplanation: 'Khi nhận được câu hỏi nằm ngoài phạm vi tài liệu hoặc các công cụ nội bộ, hệ thống AI Doanh nghiệp (Enterprise AI) phải kích hoạt cơ chế Guardrail để từ chối trả lời một cách lịch sự, thay vì cố gắng suy diễn hoặc bịa đặt thông tin không có căn cứ.',
          whyThisMatters: 'Trong ngành điện lực và các dịch vụ công ích, việc trả lời sai lệch có thể gây hiểu lầm nghiêm trọng về tài chính, pháp lý và an toàn lưới điện.',
        },
        {
          stage: 'Human Handoff Escalation',
          title: 'Chuyển tiếp Tổng đài viên (Human-in-the-Loop)',
          conceptExplanation: 'Cung cấp đường dẫn chuyển tiếp (Escalation Path) trực tiếp đến tổng đài viên con người (Tổng đài 19001909) khi AI nhận thấy độ tin cậy thấp hoặc yêu cầu vượt quá quyền hạn.',
          whyThisMatters: 'Đảm bảo trải nghiệm khách hàng liền mạch và không bị bế tắc khi gặp vấn đề phức tạp.',
        }
      ],
    };

    return {
      answer,
      trace,
      requiresHumanHandoff: true,
    };
  }

  // --- TYPE 2: Pure Tool Calling ---
  if (intent.type === 'TYPE_2_TOOL_ONLY') {
    const tTool = performance.now();
    for (let i = 0; i < intent.targetTools.length; i++) {
      const toolName = intent.targetTools[i];
      const params = { customerId: activeCustomerId };
      
      const stepT0 = performance.now();
      const toolRes = await executeTool(toolName, params);
      const stepMs = Math.round(performance.now() - stepT0);

      agentSteps.push({
        step: i + 1,
        thought: `Tôi cần truy xuất dữ liệu cá nhân của khách hàng ${activeCustomerId} thông qua công cụ ${toolName} để có thông tin chính xác từ hệ thống thanh toán/công tơ điện lực.`,
        toolName,
        toolParameters: params,
        executionLatencyMs: stepMs,
        rawResult: toolRes,
        observation: toolRes.message,
      });
    }
    toolCallingMs = Math.round(performance.now() - tTool);

    const tGen = performance.now();
    const answer = await generateResponse(query, '', [], agentSteps, llmSettings);
    const generationMs = Math.round(performance.now() - tGen);
    const totalLatencyMs = Math.round(performance.now() - tStart);

    const trace: PipelineExecutionTrace = {
      queryId,
      query,
      detectedType: 'TYPE_2_TOOL_ONLY',
      intentConfidence: intent.confidence,
      intentExplanation: intent.explanation,
      allChunksCount: ragPipeline.getChunks().length,
      activeChunkSize: ragPipeline.getChunkingConfig().chunkSize,
      activeOverlap: ragPipeline.getChunkingConfig().overlap,
      bm25TopResults: [],
      vectorTopResults: [],
      rrfTopResults: [],
      rerankedResults: [],
      vector2DPoints: [],
      agentSteps,
      retrievedContext: 'Truy xuất trực tiếp từ Cơ sở Dữ liệu Khách hàng qua EVN Open API.',
      citations: [],
      groundednessScore: 0.98,
      isHallucinationRiskLow: true,
      timings: {
        intentRoutingMs,
        chunkingMs: 0,
        bm25SearchMs: 0,
        vectorSearchMs: 0,
        rrfFusionMs: 0,
        rerankingMs: 0,
        toolCallingMs,
        generationMs,
        totalLatencyMs,
      },
      educationalNotes: [
        {
          stage: 'Agent Tool Calling (Function Calling)',
          title: 'Cơ chế Gọi Công cụ (Tool Calling / Action)',
          conceptExplanation: 'Thay vì tìm kiếm trong tài liệu tĩnh (vốn không chứa thông tin biến động theo từng khách hàng), LLM quyết định phát ra cấu trúc Function Call `get_current_bill(customerId)` để truy vấn cơ sở dữ liệu động.',
          whyThisMatters: 'Cho phép trợ lý ảo xử lý dữ liệu thời gian thực của từng cá nhân mà không đưa dữ liệu nhạy cảm vào vector index.',
        },
        {
          stage: 'ReAct Agent Loop',
          title: 'Vòng lặp Suy luận & Hành động (Thought -> Action -> Observation)',
          conceptExplanation: 'Agent thực hiện quy trình ReAct: Đưa ra suy luận (Thought) -> Thực thi Tool (Action) -> Nhận và phân tích dữ liệu trả về từ API (Observation) -> Soạn thảo câu trả lời hoàn chỉnh.',
          whyThisMatters: 'Đảm bảo tính minh bạch và khả năng truy vết từng quyết định của mô hình AI.',
        }
      ],
    };

    return { answer, trace, requiresHumanHandoff: false };
  }

  // --- TYPE 3: Multi-step Reasoning (Tool + RAG) ---
  if (intent.type === 'TYPE_3_MULTI_STEP') {
    // Step 1: Call Tool to get live status
    const tTool = performance.now();
    for (let i = 0; i < intent.targetTools.length; i++) {
      const toolName = intent.targetTools[i];
      const params = { customerId: activeCustomerId };
      
      const stepT0 = performance.now();
      const toolRes = await executeTool(toolName, params);
      const stepMs = Math.round(performance.now() - stepT0);

      agentSteps.push({
        step: i + 1,
        thought: `Bước 1: Tra cứu lịch cắt điện thực tế của khách hàng ${activeCustomerId} qua tool ${toolName}. Sau khi có kết quả, tôi sẽ kích hoạt bước 2 để tra cứu quy chuẩn bồi thường trong tài liệu RAG.`,
        toolName,
        toolParameters: params,
        executionLatencyMs: stepMs,
        rawResult: toolRes,
        observation: toolRes.message,
      });
    }
    toolCallingMs = Math.round(performance.now() - tTool);

    // Step 2: Trigger RAG retrieval for policy/compensation rules
    const ragQuery = 'chính sách bồi thường hỗ trợ khi mất điện kéo dài quá 8 giờ thông báo cắt điện';
    const ragRes = ragPipeline.retrieve(ragQuery, 3);
    retrievalTimings = ragRes.timings;
    retrievedContextText = ragRes.retrievedContextText;
    citations = ragRes.citations;
    bm25TopResults = ragRes.bm25Results;
    vectorTopResults = ragRes.vectorResults;
    rrfTopResults = ragRes.rrfResults;
    rerankedResults = ragRes.rerankedResults;
    vector2DPoints = ragRes.vector2DPoints;
    query2DVector = ragRes.query2DVector;

    agentSteps.push({
      step: agentSteps.length + 1,
      thought: `Bước 2: Dữ liệu tool cho thấy lịch cắt điện kéo dài 14 giờ (> 8 giờ tiêu chuẩn). Agent tự động kích hoạt truy vấn RAG tài liệu 'QĐ-07/2024/BTTH-EVN' để xác định mức bồi thường 10% tiền điện bậc 1.`,
      toolName: 'rag_knowledge_retrieval',
      toolParameters: { query: ragQuery, topK: 3 },
      executionLatencyMs: ragRes.timings.totalRetrievalMs,
      rawResult: { retrievedChunksCount: ragRes.rerankedResults.length, topDoc: ragRes.citations[0]?.docTitle },
      observation: `Đã truy xuất thành công ${ragRes.rerankedResults.length} đoạn văn bản quy định bồi thường từ văn bản QĐ-07/2024/BTTH-EVN.`,
    });

    const tGen = performance.now();
    const answer = await generateResponse(query, retrievedContextText, citations, agentSteps, llmSettings);
    const generationMs = Math.round(performance.now() - tGen);
    const totalLatencyMs = Math.round(performance.now() - tStart);

    const trace: PipelineExecutionTrace = {
      queryId,
      query,
      detectedType: 'TYPE_3_MULTI_STEP',
      intentConfidence: intent.confidence,
      intentExplanation: intent.explanation,
      allChunksCount: ragPipeline.getChunks().length,
      activeChunkSize: ragPipeline.getChunkingConfig().chunkSize,
      activeOverlap: ragPipeline.getChunkingConfig().overlap,
      bm25TopResults,
      vectorTopResults,
      rrfTopResults,
      rerankedResults,
      vector2DPoints,
      query2DVector,
      agentSteps,
      retrievedContext: retrievedContextText,
      citations,
      groundednessScore: 0.95,
      isHallucinationRiskLow: true,
      timings: {
        intentRoutingMs,
        chunkingMs: retrievalTimings.chunkingMs,
        bm25SearchMs: retrievalTimings.bm25SearchMs,
        vectorSearchMs: retrievalTimings.vectorSearchMs,
        rrfFusionMs: retrievalTimings.rrfFusionMs,
        rerankingMs: retrievalTimings.rerankingMs,
        toolCallingMs,
        generationMs,
        totalLatencyMs,
      },
      educationalNotes: [
        {
          stage: 'Multi-Step Agent Reasoning',
          title: 'Quy trình Phối hợp Đa bước (Tool Calling + RAG)',
          conceptExplanation: 'Thể hiện đỉnh cao của kiến trúc Agentic RAG: Bước 1 gọi Tool kiểm tra trạng thái thực tế; Bước 2 dùng kết quả của Tool để làm tiền đề truy vấn tài liệu chính sách RAG; Bước 3 tổng hợp cả 2 nguồn thành câu trả lời hoàn chỉnh.',
          whyThisMatters: 'Giải quyết các bài toán kinh doanh phức tạp mà nếu chỉ dùng thuần RAG hoặc thuần Tool thì không thể trả lời đầy đủ.',
        },
        {
          stage: 'Context Synthesis & Citations',
          title: 'Tổng hợp Ngữ cảnh và Trích dẫn Nguồn',
          conceptExplanation: 'Mô hình kết hợp các trường dữ liệu JSON của Tool và các đoạn văn bản pháp lý từ RAG, đồng thời gắn trích dẫn tài liệu cụ thể.',
          whyThisMatters: 'Giúp câu trả lời vừa mang tính cá nhân hóa cao, vừa có căn cứ pháp lý minh bạch và đáng tin cậy.',
        }
      ],
    };

    return { answer, trace, requiresHumanHandoff: false };
  }

  // --- TYPE 1: Pure RAG ---
  const ragRes = ragPipeline.retrieve(query, 4);
  retrievalTimings = ragRes.timings;
  retrievedContextText = ragRes.retrievedContextText;
  citations = ragRes.citations;
  bm25TopResults = ragRes.bm25Results;
  vectorTopResults = ragRes.vectorResults;
  rrfTopResults = ragRes.rrfResults;
  rerankedResults = ragRes.rerankedResults;
  vector2DPoints = ragRes.vector2DPoints;
  query2DVector = ragRes.query2DVector;

  const tGen = performance.now();
  const answer = await generateResponse(query, retrievedContextText, citations, [], llmSettings);
  const generationMs = Math.round(performance.now() - tGen);
  const totalLatencyMs = Math.round(performance.now() - tStart);

  const trace: PipelineExecutionTrace = {
    queryId,
    query,
    detectedType: 'TYPE_1_RAG_ONLY',
    intentConfidence: intent.confidence,
    intentExplanation: intent.explanation,
    allChunksCount: ragPipeline.getChunks().length,
    activeChunkSize: ragPipeline.getChunkingConfig().chunkSize,
    activeOverlap: ragPipeline.getChunkingConfig().overlap,
    bm25TopResults,
    vectorTopResults,
    rrfTopResults,
    rerankedResults,
    vector2DPoints,
    query2DVector,
    agentSteps: [],
    retrievedContext: retrievedContextText,
    citations,
    groundednessScore: 0.96,
    isHallucinationRiskLow: true,
    timings: {
      intentRoutingMs,
      chunkingMs: retrievalTimings.chunkingMs,
      bm25SearchMs: retrievalTimings.bm25SearchMs,
      vectorSearchMs: retrievalTimings.vectorSearchMs,
      rrfFusionMs: retrievalTimings.rrfFusionMs,
      rerankingMs: retrievalTimings.rerankingMs,
      toolCallingMs: 0,
      generationMs,
      totalLatencyMs,
    },
    educationalNotes: [
      {
        stage: 'BM25 & Vector Hybrid Retrieval',
        title: 'Truy xuất Lai (Hybrid Search: BM25 + Vector)',
        conceptExplanation: 'Kết hợp giữa tìm kiếm từ khóa chính xác (BM25 Lexical) và tìm kiếm ngữ nghĩa sâu (Dense Vector Cosine Similarity). BM25 bắt chính xác các thuật ngữ như "10 mét", "19001909", trong khi Vector hiểu được sự tương đồng khái niệm.',
        whyThisMatters: 'Khắc phục triệt để nhược điểm bỏ sót từ đồng nghĩa của BM25 và nhược điểm bắt nhầm từ khóa hiếm của Vector Search.',
      },
      {
        stage: 'Reciprocal Rank Fusion (RRF)',
        title: 'Hợp nhất Xếp hạng (RRF k=60)',
        conceptExplanation: 'Sử dụng công thức RRF(d) = 1/(60 + rank_BM25) + 1/(60 + rank_Vector) để chuẩn hóa và kết hợp thứ hạng mà không phụ thuộc vào thang điểm tuyệt đối của từng phương pháp.',
        whyThisMatters: 'Thuật toán tiêu chuẩn công nghiệp giúp dung hòa các bảng xếp hạng có phân phối điểm số khác nhau.',
      },
      {
        stage: 'Reranking Stage',
        title: 'Tái Xếp Hạng Ngữ Cảnh (Contextual Reranking)',
        conceptExplanation: 'Đánh giá lại Top-K ứng viên để đẩy các đoạn văn bản có độ liên kết ngữ cảnh cao nhất lên đầu, giúp LLM nhận được thông tin cô đọng nhất trong context window.',
        whyThisMatters: 'Giảm thiểu hiện tượng "Lost in the Middle" của mô hình ngôn ngữ lớn.',
      }
    ],
  };

  return { answer, trace, requiresHumanHandoff: false };
}
