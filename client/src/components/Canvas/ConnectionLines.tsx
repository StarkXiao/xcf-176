import React from 'react';
import { useCanvasStore } from '@/store/useCanvasStore';
import { useEvidenceStore } from '@/store/useEvidenceStore';
import { getNearestEdge, getLinePath, getLineMidpoint } from '@/utils/geometry';
import { captureConnectionSnapshot, recordAuditLog } from '@/utils/auditHelper';
import { connectionApi } from '@/api/connectionApi';
import { CYBERPUNK_COLORS, getGlowColor } from '@/utils/colorUtils';
import type { Connection } from '@/types';

interface ConnectionLinesProps {
  zoom: number;
  visibleConnectionIds?: Set<string> | null;
  highlightConnectionIds?: Set<string> | null;
}

export const ConnectionLines: React.FC<ConnectionLinesProps> = ({
  zoom,
  visibleConnectionIds = null,
  highlightConnectionIds = null,
}) => {
  const connections = useCanvasStore((state) => state.connections);
  const selectedConnectionId = useCanvasStore((state) => state.selectedConnectionId);
  const evidence = useEvidenceStore((state) => state.evidence);
  const removeConnection = useCanvasStore((state) => state.removeConnection);
  const setSelectedConnectionId = useCanvasStore((state) => state.setSelectedConnectionId);
  const setSelectedId = useCanvasStore((state) => state.setSelectedId);
  const setTimelineHighlightId = useCanvasStore((state) => state.setTimelineHighlightId);
  const isConnectionVisible = useCanvasStore((state) => state.isConnectionVisible);
  const connectionGroups = useCanvasStore((state) => state.connectionGroups);

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
    setSelectedConnectionId(connectionId);
    setSelectedId(null);
    setTimelineHighlightId(`cn-${connectionId}`);
    setTimeout(() => setTimelineHighlightId(null), 2000);
  };

  const handleConnectionDoubleClick = async (e: React.MouseEvent, connectionId: string) => {
    e.stopPropagation();
    const conn = connections.find((c) => c.id === connectionId);
    if (!conn) return;

    const snapshot = captureConnectionSnapshot(conn);
    const fromEv = evidence[conn.fromEvidenceId];
    const toEv = evidence[conn.toEvidenceId];
    const fromLabel = fromEv ? fromEv.content.slice(0, 15) : '?';
    const toLabel = toEv ? toEv.content.slice(0, 15) : '?';

    try {
      const res = await connectionApi.delete(connectionId);
      if (!res.success) {
        alert(res.error || '删除关联失败');
        return;
      }
    } catch {
      alert('删除关联失败，请检查网络连接');
      return;
    }

    recordAuditLog(
      'delete_connection',
      'connection',
      connectionId,
      `删除关联: ${fromLabel} → ${toLabel}`,
      snapshot
    );
    removeConnection(connectionId);
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
        const fromEvidence = evidence[connection.fromEvidenceId];
        const toEvidence = evidence[connection.toEvidenceId];

        if (!fromEvidence || !toEvidence) return null;

        const isVisibleProp = visibleConnectionIds === null || visibleConnectionIds.has(connection.id);
        const isStoreVisible = isConnectionVisible(connection.id);
        const isVisible = isVisibleProp && isStoreVisible;
        const isHighlighted = highlightConnectionIds !== null && highlightConnectionIds.has(connection.id);
        const isSelected = selectedConnectionId === connection.id;
        const opacity = isVisible ? (isHighlighted ? 1 : 1) : 0.15;
        const dimmed = !isVisible;

        const group = connectionGroups.find((g) => g.connectionIds.includes(connection.id));
        const displayColor = group && group.visible ? group.color : connection.color;

        const { from, to } = getNearestEdge(fromEvidence, toEvidence);
        const path = getLinePath(from, to, 60);
        const midpoint = getLineMidpoint(from, to);
        const color = displayColor || CYBERPUNK_COLORS.accentCyan;

        return (
          <g
            key={connection.id}
            className={`pointer-events-auto ${isHighlighted ? 'animate-pulse' : ''}`}
            style={{
              opacity,
              transition: 'opacity 0.3s ease',
              filter: dimmed ? 'grayscale(60%)' : 'none',
            }}
          >
            {(isSelected || isHighlighted) && (
              <path
                d={path}
                fill="none"
                stroke={isHighlighted ? CYBERPUNK_COLORS.accentCyan : CYBERPUNK_COLORS.accentYellow}
                strokeWidth={(isHighlighted ? 8 : 6) / zoom}
                strokeDasharray={isHighlighted ? 'none' : '8,4'}
                style={{
                  filter: `drop-shadow(0 0 12px ${getGlowColor(
                    isHighlighted ? CYBERPUNK_COLORS.accentCyan : CYBERPUNK_COLORS.accentYellow,
                    0.8
                  )})`,
                  opacity: 0.7,
                }}
              />
            )}
            <path
              d={path}
              fill="none"
              stroke={color}
              strokeWidth={(isHighlighted ? 3 : 2) / zoom}
              strokeDasharray={getStrokeDasharray(connection.lineStyle)}
              filter="url(#glow)"
              style={{
                filter: `drop-shadow(0 0 ${isHighlighted ? 10 : 6}px ${getGlowColor(color, isHighlighted ? 0.8 : 0.6)})`,
                cursor: dimmed ? 'default' : 'pointer',
                pointerEvents: dimmed ? 'none' : 'auto',
              }}
              onClick={(e) => !dimmed && handleConnectionClick(e, connection.id)}
              onDoubleClick={(e) => !dimmed && handleConnectionDoubleClick(e, connection.id)}
            />
            <path
              d={path}
              fill="none"
              stroke="transparent"
              strokeWidth={20 / zoom}
              style={{
                cursor: dimmed ? 'default' : 'pointer',
                pointerEvents: dimmed ? 'none' : 'auto',
              }}
              onClick={(e) => !dimmed && handleConnectionClick(e, connection.id)}
              onDoubleClick={(e) => !dimmed && handleConnectionDoubleClick(e, connection.id)}
            />

            {connection.label && (
              <foreignObject
                x={midpoint.x - 60}
                y={midpoint.y - 15}
                width={120}
                height={30}
                style={{
                  pointerEvents: dimmed ? 'none' : 'none',
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
                    opacity: dimmed ? 0.4 : 1,
                    transition: 'opacity 0.3s ease',
                  }}
                >
                  {connection.label}
                </div>
              </foreignObject>
            )}

            <circle
              cx={to.x}
              cy={to.y}
              r={(isHighlighted ? 8 : 6) / zoom}
              fill={color}
              style={{
                filter: `drop-shadow(0 0 ${isHighlighted ? 8 : 4}px ${getGlowColor(color, isHighlighted ? 0.9 : 0.6)})`,
              }}
            />
          </g>
        );
      })}
    </svg>
  );
};

export default ConnectionLines;
