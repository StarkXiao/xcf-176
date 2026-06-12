import React, { useCallback, useRef, useState } from 'react';
import { CardHeader } from './CardHeader';
import { CardContent } from './CardContent';
import { CardFooter } from './CardFooter';
import { GlowBorder } from '@/components/ui/GlowBorder';
import { CYBERPUNK_COLORS, getGlowColor, getBoxShadow } from '@/utils/colorUtils';
import { getCardEdges } from '@/utils/geometry';
import type { Evidence } from '@/types';

interface EvidenceCardProps {
  evidence: Evidence;
  isSelected: boolean;
  onMouseDown: (e: React.MouseEvent, evidence: Evidence) => void;
  onClick: (e: React.MouseEvent, evidenceId: string) => void;
  onConnectionStart: (evidenceId: string, x: number, y: number) => void;
  zoom: number;
  highlighted?: boolean;
}

type EdgeZone = 'top' | 'right' | 'bottom' | 'left' | null;

export const EvidenceCard: React.FC<EvidenceCardProps> = ({
  evidence,
  isSelected,
  onMouseDown,
  onClick,
  onConnectionStart,
  zoom,
  highlighted = false,
}) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const [hoveredEdge, setHoveredEdge] = useState<EdgeZone>(null);

  const EDGE_THRESHOLD = 16 / zoom;

  const detectEdgeZone = useCallback((e: React.MouseEvent): EdgeZone => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const w = rect.width;
    const h = rect.height;

    if (x <= EDGE_THRESHOLD && x <= y && x <= h - y) return 'left';
    if (x >= w - EDGE_THRESHOLD && w - x <= y && w - x <= h - y) return 'right';
    if (y <= EDGE_THRESHOLD && y <= x && y <= w - x) return 'top';
    if (y >= h - EDGE_THRESHOLD && h - y <= x && h - y <= w - x) return 'bottom';
    return null;
  }, [EDGE_THRESHOLD]);

  const handleConnectionStart = useCallback(
    (e: React.MouseEvent, edge: EdgeZone) => {
      if (!edge) return;
      e.stopPropagation();
      e.preventDefault();

      const edges = getCardEdges(evidence);
      const startPoint = edges[edge];
      onConnectionStart(evidence.id, startPoint.x, startPoint.y);
    },
    [evidence, onConnectionStart]
  );

  const handleConnectionHandleMouseDown = useCallback(
    (e: React.MouseEvent, edge: 'top' | 'right' | 'bottom' | 'left') => {
      e.stopPropagation();
      e.preventDefault();

      const edges = getCardEdges(evidence);
      const startPoint = edges[edge];
      onConnectionStart(evidence.id, startPoint.x, startPoint.y);
    },
    [evidence, onConnectionStart]
  );

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest('[data-connection-handle]')) return;

      const edge = hoveredEdge;
      if (edge) {
        handleConnectionStart(e, edge);
        return;
      }

      onMouseDown(e, evidence);
    },
    [evidence, onMouseDown, hoveredEdge, handleConnectionStart]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest('[data-connection-handle]')) {
        setHoveredEdge(null);
        return;
      }
      const edge = detectEdgeZone(e);
      setHoveredEdge(edge);
    },
    [detectEdgeZone]
  );

  const handleMouseLeave = useCallback(() => {
    setHoveredEdge(null);
  }, []);

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      onClick(e, evidence.id);
    },
    [evidence.id, onClick]
  );

  const connectionHandles = [
    { edge: 'top', style: { top: 0, left: '50%', transform: 'translate(-50%, -50%)' } },
    { edge: 'right', style: { top: '50%', right: 0, transform: 'translate(50%, -50%)' } },
    { edge: 'bottom', style: { bottom: 0, left: '50%', transform: 'translate(-50%, 50%)' } },
    { edge: 'left', style: { top: '50%', left: 0, transform: 'translate(-50%, -50%)' } },
  ] as const;

  const showGlow = isSelected || highlighted;
  const edgeZoneActive = hoveredEdge !== null;

  return (
    <div
      ref={cardRef}
      data-evidence-card
      data-evidence-id={evidence.id}
      className={`absolute flex flex-col select-none ${highlighted ? 'animate-pulse' : ''}`}
      style={{
        left: evidence.positionX,
        top: evidence.positionY,
        width: evidence.width,
        height: evidence.height,
        zIndex: showGlow ? 100 : edgeZoneActive ? 50 : 10,
        transition: 'box-shadow 0.2s ease, transform 0.2s ease',
        transform: highlighted ? 'scale(1.02)' : 'scale(1)',
        cursor: edgeZoneActive ? 'crosshair' : 'default',
      }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onClick={handleClick}
    >
      <GlowBorder
        color={evidence.color}
        glowIntensity={showGlow ? 0.9 : edgeZoneActive ? 0.7 : 0.4}
        pulse={showGlow || edgeZoneActive}
        className="w-full h-full"
      >
        <div
          className="w-full h-full flex flex-col rounded-sm overflow-hidden relative"
          style={{
            backgroundColor: highlighted
              ? getGlowColor(evidence.color, 0.08)
              : edgeZoneActive
              ? getGlowColor(evidence.color, 0.04)
              : CYBERPUNK_COLORS.bgSecondary,
            boxShadow: showGlow
              ? getBoxShadow(evidence.color, 25)
              : edgeZoneActive
              ? getBoxShadow(evidence.color, 15)
              : getBoxShadow(evidence.color, 5),
          }}
        >
          <CardHeader evidence={evidence} zoom={zoom} />
          <CardContent evidence={evidence} zoom={zoom} />
          <CardFooter evidence={evidence} zoom={zoom} />

          {hoveredEdge && (
            <div
              className="absolute pointer-events-none z-30"
              style={{
                ...(hoveredEdge === 'top' && {
                  top: 0,
                  left: 0,
                  right: 0,
                  height: EDGE_THRESHOLD,
                  background: `linear-gradient(to bottom, ${getGlowColor(CYBERPUNK_COLORS.accentCyan, 0.35)}, transparent)`,
                  borderTop: `2px solid ${CYBERPUNK_COLORS.accentCyan}`,
                  boxShadow: `0 0 12px ${getGlowColor(CYBERPUNK_COLORS.accentCyan, 0.6)}`,
                }),
                ...(hoveredEdge === 'bottom' && {
                  bottom: 0,
                  left: 0,
                  right: 0,
                  height: EDGE_THRESHOLD,
                  background: `linear-gradient(to top, ${getGlowColor(CYBERPUNK_COLORS.accentCyan, 0.35)}, transparent)`,
                  borderBottom: `2px solid ${CYBERPUNK_COLORS.accentCyan}`,
                  boxShadow: `0 0 12px ${getGlowColor(CYBERPUNK_COLORS.accentCyan, 0.6)}`,
                }),
                ...(hoveredEdge === 'left' && {
                  left: 0,
                  top: 0,
                  bottom: 0,
                  width: EDGE_THRESHOLD,
                  background: `linear-gradient(to right, ${getGlowColor(CYBERPUNK_COLORS.accentCyan, 0.35)}, transparent)`,
                  borderLeft: `2px solid ${CYBERPUNK_COLORS.accentCyan}`,
                  boxShadow: `0 0 12px ${getGlowColor(CYBERPUNK_COLORS.accentCyan, 0.6)}`,
                }),
                ...(hoveredEdge === 'right' && {
                  right: 0,
                  top: 0,
                  bottom: 0,
                  width: EDGE_THRESHOLD,
                  background: `linear-gradient(to left, ${getGlowColor(CYBERPUNK_COLORS.accentCyan, 0.35)}, transparent)`,
                  borderRight: `2px solid ${CYBERPUNK_COLORS.accentCyan}`,
                  boxShadow: `0 0 12px ${getGlowColor(CYBERPUNK_COLORS.accentCyan, 0.6)}`,
                }),
              }}
            />
          )}
        </div>
      </GlowBorder>

      {connectionHandles.map(({ edge, style }) => {
        const isHovered = hoveredEdge === edge;
        return (
          <div
            key={edge}
            data-connection-handle
            data-edge={edge}
            className="absolute cursor-crosshair rounded-full transition-all"
            style={{
              ...style,
              width: isHovered ? 18 / zoom : 12 / zoom,
              height: isHovered ? 18 / zoom : 12 / zoom,
              backgroundColor: evidence.color,
              boxShadow: `0 0 ${isHovered ? 12 / zoom : 6 / zoom}px ${getGlowColor(evidence.color, isHovered ? 1 : 0.8)}`,
              opacity: isSelected || isHovered ? 1 : 0.35,
              transition: 'opacity 0.2s ease, width 0.15s ease, height 0.15s ease',
              zIndex: 20,
            }}
            onMouseDown={(e) => handleConnectionHandleMouseDown(e, edge)}
            onMouseEnter={(e) => {
              e.currentTarget.style.opacity = '1';
              setHoveredEdge(edge);
            }}
            onMouseLeave={(e) => {
              if (!isSelected) {
                e.currentTarget.style.opacity = '0.35';
              }
              setHoveredEdge(null);
            }}
            title={`从${edge === 'top' ? '顶部' : edge === 'bottom' ? '底部' : edge === 'left' ? '左侧' : '右侧'}拖拽创建关联`}
          />
        );
      })}

      {edgeZoneActive && hoveredEdge && (
        <div
          className="absolute text-[10px] font-mono px-1.5 py-0.5 rounded-sm whitespace-nowrap z-40 pointer-events-none"
          style={{
            backgroundColor: getGlowColor(CYBERPUNK_COLORS.accentCyan, 0.9),
            color: CYBERPUNK_COLORS.bgPrimary,
            boxShadow: `0 0 8px ${getGlowColor(CYBERPUNK_COLORS.accentCyan, 0.8)}`,
            ...(hoveredEdge === 'top' && {
              top: `-${18 / zoom}px`,
              left: '50%',
              transform: 'translateX(-50%)',
            }),
            ...(hoveredEdge === 'bottom' && {
              bottom: `-${18 / zoom}px`,
              left: '50%',
              transform: 'translateX(-50%)',
            }),
            ...(hoveredEdge === 'left' && {
              left: `-${18 / zoom}px`,
              top: '50%',
              transform: 'translateY(-50%)',
            }),
            ...(hoveredEdge === 'right' && {
              right: `-${18 / zoom}px`,
              top: '50%',
              transform: 'translateY(-50%)',
            }),
          }}
        >
          拖拽创建关联
        </div>
      )}

      <style>{`
        [data-evidence-card]:hover [data-connection-handle] {
          opacity: 1 !important;
        }
      `}</style>
    </div>
  );
};

export default EvidenceCard;
