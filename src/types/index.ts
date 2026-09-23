// ==========================================
// EVN AI Assistant - Type Definitions
// ==========================================

export type QueryType = 
  | 'TYPE_1_RAG_ONLY' 
  | 'TYPE_2_TOOL_ONLY' 
  | 'TYPE_3_MULTI_STEP' 
  | 'TYPE_4_OUT_OF_SCOPE';

export interface DocumentMetadata {
  id: string;
  docCode: string;
  title: string;
  department: string;
  effectiveDate: string;
  docType: string;
  category: string;
  summary: string;
}

export interface DocumentDateFilter {
  startDate?: string; // YYYY-MM-DD
  endDate?: string;   // YYYY-MM-DD
}

export interface DocumentItem extends DocumentMetadata {
  content: string;
  sections: {
    heading: string;
    text: string;
  }[];
}

export interface ChunkItem {
  id: string;
  docId: string;
  docCode: string;
  docTitle: string;
  sectionHeading: string;
  department: string;
  effectiveDate: string;
  content: string;
  chunkIndex: number;
  totalChunksInDoc: number;
  tokenCount: number;
  vector?: number[];
  pca2d?: [number, number];
}

export interface BM25Result {
  chunkId: string;
  chunk: ChunkItem;
  score: number;
  rank: number;
  matchedTerms: string[];
}

export interface VectorResult {
  chunkId: string;
  chunk: ChunkItem;
  similarity: number;
  rank: number;
}

export interface RRFResult {
  chunkId: string;
  chunk: ChunkItem;
  rrfScore: number;
  rank: number;
  bm25Score: number;
  bm25Rank: number;
  vectorSimilarity: number;
  vectorRank: number;
}

export interface RerankResult {
  chunkId: string;
  chunk: ChunkItem;
  originalRank: number;
  newRank: number;
  rankDelta: number; // positive = moved up, negative = moved down, 0 = unchanged
  crossScore: number;
  relevanceReason: string;
}

export interface Vector2DPoint {
  id: string;
  label: string;
  x: number;
  y: number;
  category: string;
  docCode: string;
  isQuery?: boolean;
  similarityToQuery?: number;
  isRetrievedTopK?: boolean;
}

export interface CitationItem {
  chunkId: string;
  docCode: string;
  docTitle: string;
  sectionHeading: string;
  department: string;
  effectiveDate: string;
  excerpt: string;
  similarityScore: number;
}

// ---------------- Tool Calling & Customer Types ----------------

export interface MeterReading {
  meterId: string;
  meterType: string; // 'Điện tử 1 pha' | 'Điện tử 3 pha' | 'Cơ'
  prevReadingDate: string;
  currReadingDate: string;
  prevIndexKwh: number;
  currIndexKwh: number;
  consumptionKwh: number;
  lastTransmissionStatus: 'Bình thường' | 'Cảnh báo lệch pha' | 'Mất kết nối';
}

export interface TierDetail {
  tier: number;
  name: string;
  kwh: number;
  unitPrice: number;
  amount: number;
}

export interface ElectricityBill {
  billCode: string;
  month: string; // '08/2026'
  fromDate: string;
  toDate: string;
  totalKwh: number;
  tierDetails: TierDetail[];
  subtotal: number;
  vatRate: number; // 0.08
  vatAmount: number;
  totalAmount: number;
  paymentStatus: 'ĐÃ THANH TOÁN' | 'CHƯA THANH TOÁN' | 'QUÁ HẠN';
  dueDate: string;
  paymentChannel?: string;
  paymentDate?: string;
}

export interface PaymentRecord {
  billCode: string;
  month: string;
  amount: number;
  paidAt: string;
  channel: string;
  transactionRef: string;
  status: 'Thành công' | 'Đang xử lý';
}

export interface MaintenanceOutage {
  hasOutage: boolean;
  scheduleId?: string;
  areaCode: string;
  substation: string;
  startTime?: string;
  endTime?: string;
  durationHours?: number;
  reason?: string;
  affectedCustomersCount?: number;
  noticePublishedDate?: string;
  compensationEligible?: boolean;
  status?: 'Đã lên lịch' | 'Đang thực hiện' | 'Đã hoàn tất' | 'Hủy';
}

export interface CustomerProfile {
  customerId: string; // 'PE01000123456'
  fullName: string;
  phone: string;
  address: string;
  district: string;
  city: string;
  customerType: 'Sinh hoạt gia đình' | 'Kinh doanh dịch vụ' | 'Sản xuất công nghiệp';
  transformerSubstation: string;
  meterReading: MeterReading;
  currentBill: ElectricityBill;
  paymentHistory: PaymentRecord[];
  outageSchedule: MaintenanceOutage;
  activeTickets: string[];
}

export interface ToolDefinition {
  name: string;
  description: string;
  parameters: {
    type: string;
    properties: Record<string, {
      type: string;
      description: string;
      enum?: string[];
    }>;
    required: string[];
  };
}

export interface ToolCallExecution {
  step: number;
  thought: string;
  toolName: string;
  toolParameters: Record<string, any>;
  executionLatencyMs: number;
  rawResult: any;
  observation: string;
}

export interface PipelineStageTiming {
  intentRoutingMs: number;
  chunkingMs: number;
  bm25SearchMs: number;
  vectorSearchMs: number;
  rrfFusionMs: number;
  rerankingMs: number;
  toolCallingMs: number;
  generationMs: number;
  totalLatencyMs: number;
}

export interface PipelineExecutionTrace {
  queryId: string;
  query: string;
  detectedType: QueryType;
  intentConfidence: number;
  intentExplanation: string;
  
  // RAG Pipeline Stages
  allChunksCount: number;
  activeChunkSize: number;
  activeOverlap: number;
  
  bm25TopResults: BM25Result[];
  vectorTopResults: VectorResult[];
  rrfTopResults: RRFResult[];
  rerankedResults: RerankResult[];
  
  vector2DPoints: Vector2DPoint[];
  query2DVector?: [number, number];

  // Agent Steps
  agentSteps: ToolCallExecution[];
  
  // Generation & Citations
  retrievedContext: string;
  citations: CitationItem[];
  groundednessScore: number; // 0.0 - 1.0
  isHallucinationRiskLow: boolean;
  
  // Timing
  timings: PipelineStageTiming;
  
  // Educational Explanations (in Vietnamese)
  educationalNotes: {
    stage: string;
    title: string;
    conceptExplanation: string;
    whyThisMatters: string;
  }[];
}

export interface Message {
  id: string;
  sender: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  queryType?: QueryType;
  trace?: PipelineExecutionTrace;
  requiresHumanHandoff?: boolean;
  handoffStatus?: 'none' | 'requested' | 'connected';
}

export type ViewMode = 'customer' | 'engineer';
export type ActiveTab = 'chat' | 'architecture' | 'comparison' | 'monitoring' | 'langgraph';

// ---------------- LangGraph Learning Lab Types ----------------

export type LangGraphNodeStatus = 'PENDING' | 'RUNNING' | 'COMPLETED' | 'PAUSED' | 'ERROR';

export interface LangGraphTraceStep {
  step_number: number;
  node_name: string;
  timestamp: string;
  duration_ms: number;
  decision?: string;
  input_state_summary: Record<string, any>;
  output_state_delta: Record<string, any>;
  tool_name?: string;
  tool_input?: Record<string, any>;
  tool_output?: Record<string, any>;
  explanation_vi: string;
}

export interface LangGraphState {
  question: string;
  thread_id: string;
  intent?: string;
  customer_id?: string;
  kwh?: number;
  selected_tool?: string;
  tool_input?: Record<string, any>;
  tool_output?: Record<string, any>;
  retrieved_documents: Array<{
    docCode: string;
    docTitle: string;
    heading: string;
    department?: string;
    effectiveDate?: string;
    content: string;
    score?: number;
  }>;
  citations: Array<{
    docCode: string;
    docTitle: string;
    heading: string;
    effectiveDate?: string;
  }>;
  needs_compensation_rag?: boolean;
  needs_retry?: boolean;
  requires_human?: boolean;
  approved?: boolean;
  approval_comment?: string;
  inspection_request?: {
    action: string;
    customerId: string;
    reason: string;
    department: string;
    sla: string;
  };
  retry_count: number;
  max_retries: number;
  answer?: string;
  confidence?: number;
  execution_status: LangGraphNodeStatus;
  trace: LangGraphTraceStep[];
}

export interface LangGraphTopologyNode {
  id: string;
  label: string;
  node_type: 'entry' | 'router' | 'tool' | 'evaluator' | 'human' | 'generator' | 'exit';
  description: string;
}

export interface LangGraphTopologyEdge {
  source: string;
  target: string;
  is_conditional: boolean;
  condition_label?: string;
}

export interface LangGraphTopology {
  nodes: LangGraphTopologyNode[];
  edges: LangGraphTopologyEdge[];
}

