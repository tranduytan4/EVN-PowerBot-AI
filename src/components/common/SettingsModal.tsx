import React, { useState } from 'react';
import { LLMSettings } from '../../services/llmService';
import { X, Key, Cpu, ShieldCheck, Sparkles, Sliders } from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: LLMSettings;
  onSaveSettings: (settings: LLMSettings) => void;
  chunkSize: number;
  overlap: number;
  onReindex: (chunkSize: number, overlap: number) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onSaveSettings,
  chunkSize,
  overlap,
  onReindex,
}) => {
  const [provider, setProvider] = useState<LLMSettings['provider']>(settings.provider);
  const [apiKey, setApiKey] = useState(settings.apiKey || '');
  const [model, setModel] = useState(settings.model || 'gpt-4o-mini');
  const [localChunkSize, setLocalChunkSize] = useState(chunkSize);
  const [localOverlap, setLocalOverlap] = useState(overlap);
  const [reindexSuccess, setReindexSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSave = () => {
    onSaveSettings({
      provider,
      apiKey: apiKey.trim(),
      model,
    });
    onClose();
  };

  const handleTriggerReindex = () => {
    onReindex(localChunkSize, localOverlap);
    setReindexSuccess(true);
    setTimeout(() => setReindexSuccess(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-fadeIn">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-4 sm:px-6 py-3.5 sm:py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-2 sm:gap-2.5">
            <div className="p-1.5 sm:p-2 rounded-lg bg-cyan-950 text-cyan-400 border border-cyan-800/60 flex-shrink-0">
              <Sliders className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-slate-100">Cấu hình Hệ thống & LLM Model</h3>
              <p className="text-[10px] sm:text-xs text-slate-400">Tùy biến bộ sinh ngữ nghĩa & Tham số RAG Pipeline</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 sm:p-6 space-y-4 sm:space-y-5 overflow-y-auto">
          {/* LLM Engine Selection */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <Cpu className="w-4 h-4 text-cyan-400" />
              <span>Chế độ Mô hình Ngôn ngữ (LLM Engine)</span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-2.5">
              <button
                type="button"
                onClick={() => setProvider('local')}
                className={`p-3 rounded-xl border text-left transition-all ${
                  provider === 'local'
                    ? 'border-cyan-500 bg-cyan-950/30 text-cyan-200'
                    : 'border-slate-800 bg-slate-950/50 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-semibold text-xs text-slate-200">Local High-Fidelity Simulator</span>
                  {provider === 'local' && <span className="w-2 h-2 rounded-full bg-cyan-400" />}
                </div>
                <p className="text-[10px] sm:text-[11px] text-slate-400 leading-relaxed">
                  Hoạt động 100% offline trong trình duyệt, phản hồi tức thì, không tốn phí API key.
                </p>
              </button>

              <button
                type="button"
                onClick={() => setProvider('openai')}
                className={`p-3 rounded-xl border text-left transition-all ${
                  provider === 'openai'
                    ? 'border-orange-500 bg-orange-950/30 text-orange-200'
                    : 'border-slate-800 bg-slate-950/50 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-semibold text-xs text-slate-200">OpenAI API (GPT-4o)</span>
                  {provider === 'openai' && <span className="w-2 h-2 rounded-full bg-orange-400" />}
                </div>
                <p className="text-[10px] sm:text-[11px] text-slate-400 leading-relaxed">
                  Gọi trực tiếp OpenAI API với API Key cá nhân của bạn.
                </p>
              </button>
            </div>
          </div>

          {/* API Key Input (if OpenAI selected) */}
          {provider === 'openai' && (
            <div className="space-y-2 p-3 sm:p-3.5 rounded-xl bg-slate-950 border border-slate-800 animate-fadeIn">
              <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <Key className="w-3.5 h-3.5 text-orange-400" />
                <span>OpenAI API Key (sk-...)</span>
              </label>
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="sk-proj-xxxxxxxxxxxxxxxx"
                className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-xs text-slate-100 focus:outline-none focus:border-orange-500 font-mono"
              />
              <p className="text-[10px] text-slate-500">
                🔒 Khóa API được lưu cục bộ trong phiên trình duyệt, không gửi đến bất kỳ máy chủ trung gian nào.
              </p>
            </div>
          )}

          {/* Dynamic Chunking Controls */}
          <div className="space-y-3 pt-3 border-t border-slate-800">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">

                <Sliders className="w-4 h-4 text-amber-400" />
                <span>Tham số Cắt đoạn Tài liệu (Document Chunking)</span>
              </label>
              {reindexSuccess && (
                <span className="text-xs text-emerald-400 font-semibold animate-pulse">
                  ✓ Đã tái lập chỉ mục thành công!
                </span>
              )}
            </div>

            {/* Chunk Size Slider */}
            <div className="space-y-1 bg-slate-950 p-3 rounded-xl border border-slate-800">
              <div className="flex justify-between text-xs text-slate-300">
                <span>Kích thước đoạn (chunk_size):</span>
                <span className="font-mono text-amber-400 font-bold">{localChunkSize} ký tự</span>
              </div>
              <input
                type="range"
                min="150"
                max="800"
                step="50"
                value={localChunkSize}
                onChange={(e) => setLocalChunkSize(Number(e.target.value))}
                className="w-full accent-amber-500 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-500">
                <span>150 (Nhỏ & Chi tiết)</span>
                <span>800 (Lớn & Rộng ngữ cảnh)</span>
              </div>
            </div>

            {/* Overlap Slider */}
            <div className="space-y-1 bg-slate-950 p-3 rounded-xl border border-slate-800">
              <div className="flex justify-between text-xs text-slate-300">
                <span>Độ gối đầu (overlap):</span>
                <span className="font-mono text-cyan-400 font-bold">{localOverlap} ký tự</span>
              </div>
              <input
                type="range"
                min="0"
                max="200"
                step="20"
                value={localOverlap}
                onChange={(e) => setLocalOverlap(Number(e.target.value))}
                className="w-full accent-cyan-500 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-500">
                <span>0 (Không gối)</span>
                <span>200 (Gối đầu nhiều)</span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleTriggerReindex}
              className="w-full py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-amber-300 border border-amber-500/30 transition-all flex items-center justify-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Cập nhật & Tái lập Vector Index ngay</span>
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-950/60 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
          >
            Đóng
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 shadow-md shadow-orange-950 transition-all"
          >
            Lưu thay đổi
          </button>
        </div>
      </div>
    </div>
  );
};
