import React, { useState } from 'react';
import { Vector2DPoint } from '../../types';
import { Compass, Sparkles, HelpCircle, Eye } from 'lucide-react';

interface VectorSpace2DPlotProps {
  points: Vector2DPoint[];
}

export const VectorSpace2DPlot: React.FC<VectorSpace2DPlotProps> = ({ points }) => {
  const [hoveredPoint, setHoveredPoint] = useState<Vector2DPoint | null>(null);

  if (!points || points.length === 0) {
    return (
      <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 text-center text-xs text-slate-400">
        Không có dữ liệu không gian vector cho truy vấn này.
      </div>
    );
  }

  const queryPoint = points.find(p => p.isQuery);
  const docPoints = points.filter(p => !p.isQuery);

  // Group by docCode for legend
  const uniqueDocs = Array.from(new Set(docPoints.map(p => p.docCode)));

  const getDocColor = (docCode: string) => {
    const colors = [
      '#06B6D4', // Cyan (ATĐ)
      '#F59E0B', // Amber (SCD)
      '#10B981', // Emerald (TG)
      '#8B5CF6', // Purple (BT)
      '#EC4899', // Pink (BG)
      '#3B82F6', // Blue (LĐ)
      '#F97316', // Orange (BTTH)
      '#14B8A6', // Teal (TKĐ)
    ];
    const idx = Math.abs(docCode.charCodeAt(0) + docCode.charCodeAt(docCode.length - 1)) % colors.length;
    return colors[idx];
  };

  return (
    <div className="space-y-3">
      {/* Explanation Banner */}
      <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 flex items-start justify-between gap-3 text-xs text-slate-300">
        <div className="flex items-start gap-2">
          <Compass className="w-4 h-4 text-cyan-400 flex-shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold text-cyan-300 block mb-0.5">
              Trực quan hóa Không gian Vector 2D (Giảm chiều qua PCA 128D → 2D):
            </span>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Các đoạn văn bản có ý nghĩa tương đồng nằm gần nhau tạo thành các cụm (Clusters). Vector câu hỏi của bạn (⭐ màu đỏ cam) sẽ nằm gần nhất với các đoạn tài liệu được truy xuất (Top-K viền sáng).
            </p>
          </div>
        </div>
      </div>

      {/* SVG Canvas Area */}
      <div className="relative w-full h-[250px] sm:h-[320px] bg-slate-950/90 rounded-2xl border border-slate-800 overflow-hidden select-none">
        {/* Grid Background Lines */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none stroke-slate-800/40" strokeWidth="1">
          <line x1="50%" y1="0" x2="50%" y2="100%" strokeDasharray="4 4" />
          <line x1="0" y1="50%" x2="100%" y2="50%" strokeDasharray="4 4" />
          <circle cx="50%" cy="50%" r="25%" fill="none" strokeDasharray="2 2" />
          <circle cx="50%" cy="50%" r="45%" fill="none" strokeDasharray="2 2" />
        </svg>

        {/* Scatter Plot Points */}
        <svg className="w-full h-full">
          {/* Connection lines from query to retrieved top-K chunks */}
          {queryPoint && docPoints.filter(p => p.isRetrievedTopK).map(topP => (
            <line
              key={`line-${topP.id}`}
              x1={`${queryPoint.x}%`}
              y1={`${queryPoint.y}%`}
              x2={`${topP.x}%`}
              y2={`${topP.y}%`}
              stroke="rgba(14, 165, 233, 0.4)"
              strokeWidth="1.5"
              strokeDasharray="3 3"
              className="animate-pulse"
            />
          ))}

          {/* Document Chunks Points */}
          {docPoints.map((p) => {
            const color = getDocColor(p.docCode);
            const isTopK = p.isRetrievedTopK;
            const isHovered = hoveredPoint?.id === p.id;

            return (
              <g
                key={p.id}
                className="cursor-pointer transition-transform"
                onMouseEnter={() => setHoveredPoint(p)}
                onMouseLeave={() => setHoveredPoint(null)}
              >
                {/* Top-K Halo Glow */}
                {isTopK && (
                  <circle
                    cx={`${p.x}%`}
                    cy={`${p.y}%`}
                    r={isHovered ? 14 : 10}
                    fill={color}
                    fillOpacity="0.25"
                    className="animate-ping"
                  />
                )}
                {/* Point */}
                <circle
                  cx={`${p.x}%`}
                  cy={`${p.y}%`}
                  r={isHovered ? 8 : isTopK ? 6 : 4}
                  fill={color}
                  stroke={isTopK ? '#FFFFFF' : '#0F172A'}
                  strokeWidth={isTopK ? 2 : 1}
                />
              </g>
            );
          })}

          {/* User Query Point */}
          {queryPoint && (
            <g
              className="cursor-pointer"
              onMouseEnter={() => setHoveredPoint(queryPoint)}
              onMouseLeave={() => setHoveredPoint(null)}
            >
              <circle
                cx={`${queryPoint.x}%`}
                cy={`${queryPoint.y}%`}
                r="16"
                fill="#F37021"
                fillOpacity="0.2"
                className="animate-pulse"
              />
              <circle
                cx={`${queryPoint.x}%`}
                cy={`${queryPoint.y}%`}
                r="7"
                fill="#F97316"
                stroke="#FFFFFF"
                strokeWidth="2.5"
              />
              <text
                x={`${queryPoint.x}%`}
                y={`${queryPoint.y - 4}%`}
                fill="#F97316"
                fontSize="11"
                fontWeight="bold"
                textAnchor="middle"
              >
                ⭐ Query
              </text>
            </g>
          )}
        </svg>

        {/* Hover Tooltip Overlay */}
        {hoveredPoint && (
          <div className="absolute bottom-2 left-2 right-2 sm:bottom-3 sm:left-3 sm:right-3 p-2 sm:p-2.5 rounded-xl bg-slate-900/95 border border-cyan-500/60 shadow-xl backdrop-blur text-xs pointer-events-none animate-fadeIn flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 sm:gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 sm:gap-2 mb-0.5 flex-wrap">
                <span className="font-mono font-bold text-cyan-400 text-[11px] sm:text-xs">{hoveredPoint.label}</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-300">
                  {hoveredPoint.docCode}
                </span>
                {hoveredPoint.isRetrievedTopK && (
                  <span className="text-[9px] sm:text-[10px] px-1.5 py-0.2 rounded bg-emerald-950 text-emerald-400 border border-emerald-800 font-semibold">
                    ✓ Top-K Retrieved
                  </span>
                )}
              </div>
              <p className="text-slate-300 text-[10px] sm:text-[11px] truncate max-w-xs sm:max-w-[500px]">
                {hoveredPoint.category}
              </p>
            </div>
            <div className="font-mono text-[9px] sm:text-[10px] text-slate-400 text-right flex-shrink-0">
              PCA Coord: ({hoveredPoint.x}, {hoveredPoint.y})
            </div>
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-2 p-2 sm:p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80 text-[10px]">
        <span className="text-slate-400 font-semibold mr-1">Chú giải:</span>
        <div className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-full bg-orange-500 ring-2 ring-white/50" />
          <span className="text-orange-300 font-bold">Query Vector</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 ring-2 ring-white" />
          <span className="text-cyan-300 font-semibold">Top-K Match</span>
        </div>
        {uniqueDocs.slice(0, 4).map(doc => (
          <div key={doc} className="flex items-center gap-1 text-slate-400">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: getDocColor(doc) }} />
            <span>{doc}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

