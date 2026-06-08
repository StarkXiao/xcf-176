import React from 'react';
import { useCanvasStore } from '@/store/useCanvasStore';
import { getLinePath } from '@/utils/geometry';
import { CYBERPUNK_COLORS, getGlowColor } from '@/utils/colorUtils';

interface DrawingLineProps {
  zoom: number;
}

export const DrawingLine: React.FC<DrawingLineProps> = ({ zoom }) => {
  const drawingConnection = useCanvasStore((state) => state.drawingConnection);

  if (!drawingConnection) return null;

  const { startX, startY, endX, endY } = drawingConnection;
  const path = getLinePath({ x: startX, y: startY }, { x: endX, y: endY }, 40);

  return (
    <svg className="absolute inset-0 w-full h-full pointer-events-none overflow-visible z-40">
      <defs>
        <filter id="drawing-glow">
          <feGaussianBlur stdDeviation="4" result="coloredBlur" />
          <feMerge>
            <feMergeNode in="coloredBlur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <path
        d={path}
        fill="none"
        stroke={CYBERPUNK_COLORS.accentCyan}
        strokeWidth={3 / zoom}
        strokeDasharray="8,4"
        filter="url(#drawing-glow)"
        style={{
          filter: `drop-shadow(0 0 8px ${getGlowColor(CYBERPUNK_COLORS.accentCyan, 0.8)})`,
          animation: 'dash 0.5s linear infinite',
        }}
      />

      <circle
        cx={startX}
        cy={startY}
        r={8 / zoom}
        fill={CYBERPUNK_COLORS.accentCyan}
        style={{
          filter: `drop-shadow(0 0 6px ${getGlowColor(CYBERPUNK_COLORS.accentCyan, 0.8)})`,
        }}
      />

      <circle
        cx={endX}
        cy={endY}
        r={10 / zoom}
        fill="none"
        stroke={CYBERPUNK_COLORS.accentCyan}
        strokeWidth={2 / zoom}
        style={{
          filter: `drop-shadow(0 0 6px ${getGlowColor(CYBERPUNK_COLORS.accentCyan, 0.8)})`,
          animation: 'pulse 1s ease-in-out infinite',
        }}
      />

      <style>{`
        @keyframes dash {
          to {
            stroke-dashoffset: -12;
          }
        }
        @keyframes pulse {
          0%, 100% {
            r: ${10 / zoom};
            opacity: 1;
          }
          50% {
            r: ${14 / zoom};
            opacity: 0.5;
          }
        }
      `}</style>
    </svg>
  );
};

export default DrawingLine;
