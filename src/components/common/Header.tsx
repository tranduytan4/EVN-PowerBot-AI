import React, { useState } from 'react';
import { ViewMode, ActiveTab, CustomerProfile } from '../../types';
import { 
  Zap, 
  Cpu, 
  User, 
  Sun, 
  Moon, 
  Settings, 
  GitFork, 
  Layers, 
  BarChart3, 
  MessageSquare,
  Menu,
  X,
  SlidersHorizontal,
  Network
} from 'lucide-react';

interface HeaderProps {
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  isDarkMode: boolean;
  setIsDarkMode: (dark: boolean) => void;
  selectedCustomer: CustomerProfile;
  onOpenSettings: () => void;
  onToggleMobileSidebar?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  viewMode,
  setViewMode,
  activeTab,
  setActiveTab,
  isDarkMode,
  setIsDarkMode,
  selectedCustomer,
  onOpenSettings,
  onToggleMobileSidebar,
}) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const tabs: { id: ActiveTab; label: string; icon: React.ReactNode }[] = [
    { id: 'chat', label: 'Hội thoại Trợ lý', icon: <MessageSquare className="w-3.5 h-3.5" /> },
    { id: 'langgraph', label: 'LangGraph Lab', icon: <Network className="w-3.5 h-3.5 text-emerald-400" /> },
    { id: 'architecture', label: 'Kiến trúc RAG & Agent', icon: <Layers className="w-3.5 h-3.5" /> },
    { id: 'comparison', label: 'So sánh RAG', icon: <GitFork className="w-3.5 h-3.5" /> },
    { id: 'monitoring', label: 'Dashboard Giám sát', icon: <BarChart3 className="w-3.5 h-3.5" /> },
  ];

  const handleSelectTab = (tab: ActiveTab) => {
    setActiveTab(tab);
    setIsMobileMenuOpen(false);
  };

  return (
    <header className="h-16 border-b border-white/10 glass-nav px-4 lg:px-8 flex items-center justify-between z-30 select-none relative animate-fade-in-up">
      {/* Left: Brand Logo & Mobile Menu */}
      <div className="flex items-center gap-3 sm:gap-4">
        {/* Mobile Menu Trigger */}
        <button
          type="button"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="p-2 rounded-xl glass-card text-slate-300 md:hidden border border-white/10"
          title="Menu điều hướng"
          aria-label="Toggle menu"
        >
          {isMobileMenuOpen ? <X className="w-4 h-4 text-cyan-400" /> : <Menu className="w-4 h-4" />}
        </button>

        {/* Minimalist Brand Logo (Inspired by prompt reference) */}
        <div className="flex items-center gap-2.5 cursor-pointer" onClick={() => setActiveTab('chat')}>
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 p-0.5 shadow-lg shadow-orange-500/25 flex items-center justify-center">
            <div className="w-full h-full bg-slate-950 rounded-[6px] flex items-center justify-center">
              <Zap className="w-4 h-4 text-amber-400 fill-amber-400" />
            </div>
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="text-lg lg:text-xl font-semibold tracking-tight text-white">
                EVN PowerBot AI
              </span>
              <span className="text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full bg-cyan-950/80 text-cyan-300 border border-cyan-500/30">
                PROD
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Desktop Navigation Menu (14px regular font, 90% opacity white) */}
      <nav className="hidden md:flex items-center gap-1.5 lg:gap-2">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-[14px] font-normal transition-all duration-200 ${
                isActive
                  ? 'bg-white/10 text-white font-medium shadow-sm border border-white/20 backdrop-blur-md'
                  : 'text-white/80 hover:text-white hover:bg-white/5'
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Right-side Action Controls */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Active Customer Profile Badge */}
        <div className="hidden 2xl:flex items-center gap-2 px-3 py-1 rounded-full glass-card text-xs">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-white/70">KH:</span>
          <span className="font-medium text-white">{selectedCustomer.fullName}</span>
          <span className="text-cyan-400 font-mono text-[11px]">({selectedCustomer.customerId})</span>
        </div>

        {/* View Mode Toggle: Customer vs Engineer (Glass Outline Pill) */}
        <div className="flex items-center p-0.5 rounded-full glass-card border border-white/10">
          <button
            onClick={() => setViewMode('customer')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[12px] font-medium transition-all duration-300 ${
              viewMode === 'customer'
                ? 'bg-white text-slate-950 shadow-md font-semibold'
                : 'text-white/75 hover:text-white'
            }`}
            title="Chế độ Khách hàng (Customer Mode)"
          >
            <User className="w-3.5 h-3.5" />
            <span>Khách hàng</span>
          </button>

          <button
            onClick={() => setViewMode('engineer')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[12px] font-medium transition-all duration-300 ${
              viewMode === 'engineer'
                ? 'bg-gradient-to-r from-cyan-500 to-blue-500 text-white shadow-md font-semibold'
                : 'text-white/75 hover:text-white'
            }`}
            title="Chế độ Kỹ sư (Under-the-Hood Mode - Vector, RRF, LangGraph)"
          >
            <Cpu className="w-3.5 h-3.5" />
            <span className="hidden lg:inline">Kỹ sư (RAG Lab)</span>
            <span className="lg:hidden">Kỹ sư</span>
          </button>
        </div>

        {/* Dark/Light mode toggle */}
        <button
          onClick={() => setIsDarkMode(!isDarkMode)}
          className="p-2 rounded-full glass-btn-outline flex-shrink-0"
          title={isDarkMode ? 'Chuyển sang Giao diện Sáng' : 'Chuyển sang Giao diện Tối'}
        >
          {isDarkMode ? <Sun className="w-3.5 h-3.5 text-amber-300" /> : <Moon className="w-3.5 h-3.5 text-slate-300" />}
        </button>

        {/* Settings Modal Button */}
        <button
          onClick={onOpenSettings}
          className="p-2 rounded-full glass-btn-outline flex-shrink-0"
          title="Cài đặt LLM API & Tham số"
        >
          <Settings className="w-3.5 h-3.5 text-white" />
        </button>
      </div>

      {/* Mobile Navigation Dropdown Menu */}
      {isMobileMenuOpen && (
        <div className="absolute top-16 left-0 right-0 glass-panel p-4 shadow-2xl backdrop-blur-2xl md:hidden flex flex-col gap-2 animate-fade-in-up z-40 border-b border-white/10">
          <div className="px-2 py-1 text-[11px] font-bold uppercase tracking-wider text-white/60 border-b border-white/10 mb-1 flex items-center justify-between">
            <span>Chọn Chế độ Khám phá:</span>
            <span className="text-cyan-400 font-mono text-[11px]">{selectedCustomer.fullName}</span>
          </div>

          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => handleSelectTab(tab.id)}
              className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-normal text-[14px] text-left transition-all ${
                activeTab === tab.id
                  ? 'bg-white/15 text-white font-medium border border-white/20'
                  : 'text-white/80 hover:bg-white/5'
              }`}
            >
              <div className="p-1 rounded-lg bg-white/10 text-cyan-300">
                {tab.icon}
              </div>
              <span>{tab.label}</span>
            </button>
          ))}

          {activeTab === 'chat' && onToggleMobileSidebar && (
            <div className="pt-2 mt-1 border-t border-white/10">
              <button
                type="button"
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  onToggleMobileSidebar();
                }}
                className="w-full flex items-center gap-2 px-3.5 py-2 rounded-xl glass-card text-xs font-semibold text-amber-300 border border-amber-500/30 transition-all"
              >
                <SlidersHorizontal className="w-4 h-4 text-amber-400" />
                <span>Mở Bảng Khách hàng & Cấu hình Chunking</span>
              </button>
            </div>
          )}
        </div>
      )}
    </header>
  );
};


