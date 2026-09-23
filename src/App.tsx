import React, { useState, useEffect } from 'react';
import { 
  ViewMode, 
  ActiveTab, 
  CustomerProfile, 
  Message, 
  DocumentItem, 
  ChunkItem 
} from './types';
import customersData from './data/customers.json';
import { ragPipeline } from './services/ragPipeline';
import { processQueryWithAgent } from './services/agentEngine';
import { LLMSettings } from './services/llmService';

import { Header } from './components/common/Header';
import { SettingsModal } from './components/common/SettingsModal';
import { HumanHandoffModal } from './components/common/HumanHandoffModal';

import { CustomerSelector } from './components/sidebar/CustomerSelector';
import { KnowledgeBaseExplorer } from './components/sidebar/KnowledgeBaseExplorer';
import { ChunkingConfigPanel } from './components/sidebar/ChunkingConfigPanel';

import { ChatArea } from './components/chat/ChatArea';
import { ArchitectureTab } from './components/tabs/ArchitectureTab';
import { RagComparisonTab } from './components/tabs/RagComparisonTab';
import { MonitoringDashboardTab } from './components/tabs/MonitoringDashboardTab';
import { LangGraphLabTab } from './components/tabs/LangGraphLabTab';

export const App: React.FC = () => {
  const customers = customersData as CustomerProfile[];
  
  // App States
  const [viewMode, setViewMode] = useState<ViewMode>('engineer');
  const [activeTab, setActiveTab] = useState<ActiveTab>('chat');
  const [isDarkMode, setIsDarkMode] = useState<boolean>(true);
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerProfile>(customers[0]);
  
  const [documents, setDocuments] = useState<DocumentItem[]>(ragPipeline.getDocuments());
  const [chunks, setChunks] = useState<ChunkItem[]>(ragPipeline.getChunks());
  const [chunkConfig, setChunkConfig] = useState(ragPipeline.getChunkingConfig());

  const [llmSettings, setLlmSettings] = useState<LLMSettings>({ provider: 'local' });
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  
  const [isHandoffOpen, setIsHandoffOpen] = useState(false);
  const [handoffQuery, setHandoffQuery] = useState('');

  const [isLoading, setIsLoading] = useState(false);

  // Initial Welcome Message
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome-msg',
      sender: 'assistant',
      content: `Xin chào Quý khách! Tôi là **EVN PowerBot AI** — Trợ lý Ảo Thông minh của Tập đoàn Điện lực Việt Nam (EVN).

Tôi được trang bị kiến trúc kết hợp **RAG (Retrieval-Augmented Generation)** và **AI Agent (Tool Calling)**, sẵn sàng hỗ trợ Quý khách:

1. 📖 **Tra cứu Quy chuẩn & Chính sách (Type 1 - Pure RAG):** An toàn điện, biểu giá bậc thang, quy trình báo mất điện, lắp công tơ mới.
2. 📊 **Tra cứu Dữ liệu Khách hàng (Type 2 - Pure Tool):** Chỉ số công tơ, hóa đơn tiền điện tháng này, lịch sử thanh toán.
3. ⚡ **Suy luận Đa bước (Type 3 - Multi-step RAG + Agent):** Kiểm tra lịch cắt điện bảo trì theo địa bàn và tự động tra cứu chính sách bồi thường tương ứng.
4. 🛡️ **Bảo vệ Tránh Ảo giác (Type 4 - Guardrail):** Từ chối câu hỏi ngoài phạm vi và hỗ trợ chuyển tiếp Tổng đài 19001909.

Quý khách có thể bấm chọn nhanh các câu hỏi mẫu bên dưới hoặc nhập câu hỏi trực tiếp!`,
      timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
    },
  ]);

  // Sync Dark mode with HTML tag
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  // Handle re-chunking
  const handleReindex = (chunkSize: number, overlap: number) => {
    const res = ragPipeline.reindex(chunkSize, overlap);
    setChunks(ragPipeline.getChunks());
    setChunkConfig(ragPipeline.getChunkingConfig());
  };

  // Handle Send Message
  const handleSendMessage = async (queryText: string) => {
    const userMessage: Message = {
      id: `user-${Date.now()}`,
      sender: 'user',
      content: queryText,
      timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);

    try {
      const result = await processQueryWithAgent(queryText, selectedCustomer, llmSettings);

      const assistantMessage: Message = {
        id: `assistant-${Date.now()}`,
        sender: 'assistant',
        content: result.answer,
        timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
        queryType: result.trace.detectedType,
        trace: result.trace,
        requiresHumanHandoff: result.requiresHumanHandoff,
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Error processing query:', error);
      const errorMessage: Message = {
        id: `error-${Date.now()}`,
        sender: 'assistant',
        content: 'Đã xảy ra lỗi trong quá trình xử lý pipeline. Vui lòng thử lại hoặc chuyển tiếp tổng đài 19001909.',
        timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearMessages = () => {
    setMessages([
      {
        id: 'welcome-reset',
        sender: 'assistant',
        content: `Đã làm mới phiên hội thoại. Quý khách vui lòng chọn câu hỏi mẫu hoặc nhập thông tin cần tra cứu.`,
        timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
      },
    ]);
  };

  const handleOpenHandoff = (query: string) => {
    setHandoffQuery(query);
    setIsHandoffOpen(true);
  };

  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  return (
    <div className="h-screen w-screen flex flex-col bg-slate-950 text-slate-100 font-sans overflow-hidden relative">
      {/* Background Video Layer & Cinematic Ambient Overlay */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <video
          autoPlay
          loop
          muted
          playsInline
          className="w-full h-full object-cover opacity-25 scale-105 filter saturate-125 transition-opacity duration-1000"
          src="https://cdn.sceneai.art/Hero%20Section%20Video/01d1f8de-fec0-4bf5-8b48-9fc2dbc8c6b0.mp4"
        />
        <div className="absolute inset-0 cinematic-overlay" />
      </div>

      {/* Main App Container */}
      <div className="relative z-10 flex flex-col h-full w-full overflow-hidden">
        {/* Top Header */}
        <Header
          viewMode={viewMode}
          setViewMode={setViewMode}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          isDarkMode={isDarkMode}
          setIsDarkMode={setIsDarkMode}
          selectedCustomer={selectedCustomer}
          onOpenSettings={() => setIsSettingsOpen(true)}
          onToggleMobileSidebar={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
        />

        {/* Main Workspace Body */}
        <div className="flex-1 flex overflow-hidden relative">
          {/* Left Sidebar (Desktop - Only visible on Chat Tab) */}
          {activeTab === 'chat' && (
            <aside
              className={`border-r border-white/10 glass-panel flex flex-col h-full overflow-hidden transition-all duration-300 hidden md:flex flex-shrink-0 ${
                isSidebarCollapsed ? 'w-0 border-none' : 'w-72 lg:w-88 xl:w-96'
              }`}
            >
              <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-5">
                {/* Customer Profile Scenario Selector */}
                <CustomerSelector
                  selectedCustomer={selectedCustomer}
                  onSelectCustomer={setSelectedCustomer}
                />

                {/* Chunking Tuner */}
                <ChunkingConfigPanel
                  chunkSize={chunkConfig.chunkSize}
                  overlap={chunkConfig.overlap}
                  totalChunks={chunks.length}
                  onReindex={handleReindex}
                />

                {/* Knowledge Base Explorer */}
                <KnowledgeBaseExplorer
                  documents={documents}
                  chunks={chunks}
                />
              </div>
            </aside>
          )}

          {/* Mobile Slide-Over Sidebar Drawer */}
          {activeTab === 'chat' && isMobileSidebarOpen && (
            <div className="fixed inset-0 z-50 flex md:hidden animate-fadeIn">
              {/* Backdrop */}
              <div
                className="fixed inset-0 bg-black/80 backdrop-blur-md transition-opacity"
                onClick={() => setIsMobileSidebarOpen(false)}
              />

              {/* Slide-over panel */}
              <div className="relative w-5/6 max-w-sm glass-panel border-r border-white/10 h-full flex flex-col shadow-2xl z-10 overflow-hidden">
                <div className="p-3.5 border-b border-white/10 bg-slate-900/90 flex items-center justify-between">
                  <span className="font-bold text-xs uppercase tracking-wider text-cyan-400">
                    Cấu hình Demo & Tri thức
                  </span>
                  <button
                    onClick={() => setIsMobileSidebarOpen(false)}
                    className="px-2.5 py-1 rounded-lg bg-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-700"
                  >
                    Đóng
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-6">
                  <CustomerSelector
                    selectedCustomer={selectedCustomer}
                    onSelectCustomer={(c) => {
                      setSelectedCustomer(c);
                      setIsMobileSidebarOpen(false);
                    }}
                  />

                  <ChunkingConfigPanel
                    chunkSize={chunkConfig.chunkSize}
                    overlap={chunkConfig.overlap}
                    totalChunks={chunks.length}
                    onReindex={handleReindex}
                  />

                  <KnowledgeBaseExplorer
                    documents={documents}
                    chunks={chunks}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Center Main View Area */}
          <main className="flex-1 flex flex-col h-full overflow-hidden bg-transparent min-w-0">
            {activeTab === 'chat' && (
              <ChatArea
                messages={messages}
                isLoading={isLoading}
                onSendMessage={handleSendMessage}
                onClearMessages={handleClearMessages}
                viewMode={viewMode}
                selectedCustomer={selectedCustomer}
                onOpenHandoff={handleOpenHandoff}
                onToggleMobileSidebar={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
                isSidebarCollapsed={isSidebarCollapsed}
                onToggleDesktopSidebar={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
              />
            )}

            {activeTab === 'langgraph' && (
              <LangGraphLabTab selectedCustomer={selectedCustomer} />
            )}

            {activeTab === 'architecture' && <ArchitectureTab />}

            {activeTab === 'comparison' && (
              <RagComparisonTab selectedCustomer={selectedCustomer} />
            )}

            {activeTab === 'monitoring' && (
              <MonitoringDashboardTab
                totalChunks={chunks.length}
                totalDocs={documents.length}
              />
            )}
          </main>
        </div>

        {/* Settings Modal */}
        <SettingsModal
          isOpen={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
          settings={llmSettings}
          onSaveSettings={setLlmSettings}
          chunkSize={chunkConfig.chunkSize}
          overlap={chunkConfig.overlap}
          onReindex={handleReindex}
        />

        {/* Human Handoff Modal */}
        <HumanHandoffModal
          isOpen={isHandoffOpen}
          onClose={() => setIsHandoffOpen(false)}
          selectedCustomer={selectedCustomer}
          query={handoffQuery}
        />
      </div>
    </div>
  );
};


