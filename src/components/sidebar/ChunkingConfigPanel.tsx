import React, { useState } from 'react';
import { Sliders, RefreshCw, Sparkles, HelpCircle } from 'lucide-react';

interface ChunkingConfigPanelProps {
  chunkSize: number;
  overlap: number;
  totalChunks: number;
  onReindex: (chunkSize: number, overlap: number) => void;
}

export const ChunkingConfigPanel: React.FC<ChunkingConfigPanelProps> = ({
  chunkSize,
  overlap,
  totalChunks,
  onReindex,
}) => {
  const [localChunkSize, setLocalChunkSize] = useState(chunkSize);
  const [localOverlap, setLocalOverlap] = useState(overlap);
  const [isUpdating, setIsUpdating] = useState(false);

  const handleApply = () => {
    setIsUpdating(true);
    setTimeout(() => {
      onReindex(localChunkSize, localOverlap);
      setIsUpdating(false);
    }, 150);
  };

  const hasChanges = localChunkSize !== chunkSize || localOverlap !== overlap;

  return (
    <div className="p-3.5 rounded-2xl glass-card border border-slate-800/80 space-y-3 shadow-lg">
      <div className="flex items-center justify-between">
        <label className="text-xs font-bold uppercase tracking-wider text-slate-200 flex items-center gap-1.5">
          <Sliders className="w-3.5 h-3.5 text-amber-400" />
          <span>Chunking Tuning (Thực nghiệm)</span>
        </label>
        <span className="text-[10px] font-mono text-cyan-400 bg-cyan-950/80 px-2 py-0.5 rounded-full border border-cyan-800/80 font-bold shadow-xs">
          {totalChunks} Chunks
        </span>
      </div>

      <p className="text-[11px] text-slate-400 leading-relaxed">
        Kéo thanh trượt để thay đổi độ dài cắt đoạn và quan sát sự biến thiên của không gian vector 2D PCA & kết quả truy xuất:
      </p>

      {/* Chunk Size */}
      <div className="space-y-1.5">
        <div className="flex justify-between text-xs">
          <span className="text-slate-400">chunk_size:</span>
          <span className="font-mono text-amber-400 font-bold">{localChunkSize} chars</span>
        </div>
        <input
          type="range"
          min="150"
          max="800"
          step="50"
          value={localChunkSize}
          onChange={(e) => setLocalChunkSize(Number(e.target.value))}
          className="w-full accent-amber-500 cursor-pointer h-1.5 bg-slate-800/80 rounded-lg"
        />
        <div className="flex justify-between text-[10px] text-slate-500">
          <span>150 (Đoạn ngắn)</span>
          <span>800 (Đoạn dài)</span>
        </div>
      </div>

      {/* Overlap */}
      <div className="space-y-1.5">
        <div className="flex justify-between text-xs">
          <span className="text-slate-400">overlap:</span>
          <span className="font-mono text-cyan-400 font-bold">{localOverlap} chars</span>
        </div>
        <input
          type="range"
          min="0"
          max="200"
          step="20"
          value={localOverlap}
          onChange={(e) => setLocalOverlap(Number(e.target.value))}
          className="w-full accent-cyan-400 cursor-pointer h-1.5 bg-slate-800/80 rounded-lg"
        />
        <div className="flex justify-between text-[10px] text-slate-500">
          <span>0 (Không chồng lấn)</span>
          <span>200 (Chồng lấn sâu)</span>
        </div>
      </div>

      {/* Action Button */}
      <button
        onClick={handleApply}
        disabled={isUpdating || !hasChanges}
        className={`w-full py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-md ${
          hasChanges
            ? 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 shadow-orange-950/60 hover:scale-[1.02] active:scale-[0.98]'
            : 'bg-slate-900/60 text-slate-500 border border-slate-800/80 cursor-not-allowed'
        }`}
      >
        <RefreshCw className={`w-3.5 h-3.5 ${isUpdating ? 'animate-spin' : ''}`} />
        <span>{hasChanges ? 'Áp dụng & Tái lập Vector Index' : 'Đang ở cấu hình tối ưu'}</span>
      </button>
    </div>
  );
};
