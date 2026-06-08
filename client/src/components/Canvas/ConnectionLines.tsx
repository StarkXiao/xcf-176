import React from 'react';
import { useCanvasStore } from '@/store/useCanvasStore';
import { useEvidenceStore } from '@/store/useEvidenceStore';
import { getNearestEdge, getLinePath, getLineMidpoint } from '@/utils/geometry';
import { CYBERPUNK_COLORS, getGlowColor } from '@/utils/colorUtils';
import type { Connection } from '@/types';

interface ConnectionLinesProps {
  zoom: number;
}

export const ConnectionLines: React.FC<ConnectionLinesProps> = ({ zoom }) => {
  const connections = useCanvasStore((state) => state.connections);
  const getEvidenceById = useEvidenceStore((state) => state.getEvidenceById);
  const removeConnection = useCanvasStore((state) => state.removeConnection);

  const getStrokeDasharray = (style: Connection['lineStyle']) => {
    switch (style) {
      case 'dashed':
        return '10,5';
      case 'dotted':
        return '2,3';
      default:
        return 'none';
    }
  };

  const handleConnectionClick = (e: React.MouseEvent, connectionId: string) => {
    e.stopPropagation();
    if (e.detail === 2) {
      removeConnection(connectionId);
    }
  };

  return (
    <svg className="absolute inset-0 w-full h-full pointer-events-none overflow-visible">
      <defs>
        <filter id="glow">
          <feGaussianBlur stdDeviation="3" result="coloredBlur" />
          <feMerge>
            <feMergeNode in="coloredBlur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {connections.map((connection) => {
        const fromEvidence = getEvidenceById(connection.fromEvidenceId);
        const toEvidence = getEvidenceById(connection.toEvidenceId);

        if (!fromEvidence || !toEvidence) return null;

        const { from, to } = getNearestEdge(fromEvidence, toEvidence);
        const path = getLinePath(from, to, 60);
        const midpoint = getLineMidpoint(from, to);
        const color = connection.color || CYBERPUNK_COLORS.accentCyan;

        return (
          <g key={connection.id} className="pointer-events-auto">
            <path
              d={path}
              fill="none"
              stroke={color}
              strokeWidth={2 / zoom}
              strokeDasharray={getStrokeDasharray(connection.lineStyle)}
              filter="url(#glow)"
              style={{
                filter: `drop-shadow(0 0 6px ${getGlowColor(color, 0.6)})`,
                cursor: 'pointer',
              }}
              onClick={(e) => handleConnectionClick(e, connection.id)}
            />
            <path
              d={path}
              fill="none"
              stroke="transparent"
              strokeWidth={20 / zoom}
              style={{ cursor: 'pointer' }}
              onClick={(e) => handleConnectionClick(e, connection.id)}
            />

            {connection.label && (
              <foreignObject
                x={midpoint.x - 60}
                y={midpoint.y - 15}
                width={120}
                height={30}
                style={{
                  pointerEvents: 'none',
                  overflow: 'visible',
                }}
              >
                <div
                  className="text-center text-xs font-mono px-2 py-1 rounded-sm"
                  style={{
                    backgroundColor: getGlowColor(CYBERPUNK_COLORS.bgPrimary, 0.9),
                    color: color,
                    border: `1px solid ${color}`,
                    textShadow: `0 0 6px ${getGlowColor(color, 0.8)}`,
                  }}
                >
                  {connection.label}
                </div>
              </foreignObject>
            )}

            <circle
              cx={to.x}
              cy={to.y}
              r={6 / zoom}
              fill={color}
              style={{
                filter: `drop-shadow(0 0 4px ${getGlowColor(color, 0.6)})`,
              }}
            />
          </g>
        );
      })}
    </svg>
  );
};

export default ConnectionLines;
