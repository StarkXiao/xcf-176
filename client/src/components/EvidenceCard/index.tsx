import React, { useCallback, useRef } from 'react';
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
      if ((e.target as HTMLElement).closest('[data-connection-handle]')) return;
      onMouseDown(e, evidence);
    },
    [evidence, onMouseDown]
  );

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
        zIndex: showGlow ? 100 : 10,
        transition: 'box-shadow 0.2s ease, transform 0.2s ease',
        transform: highlighted ? 'scale(1.02)' : 'scale(1)',
      }}
      onMouseDown={handleMouseDown}
      onClick={handleClick}
    >
      <GlowBorder
        color={evidence.color}
        glowIntensity={showGlow ? 0.9 : 0.4}
        pulse={showGlow}
        className="w-full h-full"
      >
        <div
          className="w-full h-full flex flex-col rounded-sm overflow-hidden"
          style={{
            backgroundColor: highlighted
              ? getGlowColor(evidence.color, 0.08)
              : CYBERPUNK_COLORS.bgSecondary,
            boxShadow: showGlow
              ? getBoxShadow(evidence.color, 25)
              : getBoxShadow(evidence.color, 5),
          }}
        >
          <CardHeader evidence={evidence} zoom={zoom} />
          <CardContent evidence={evidence} zoom={zoom} />
          <CardFooter evidence={evidence} zoom={zoom} />
        </div>
      </GlowBorder>

      {connectionHandles.map(({ edge, style }) => (
        <div
          key={edge}
          data-connection-handle
          className="absolute cursor-crosshair rounded-full transition-all hover:scale-150"
          style={{
            ...style,
            width: 12 / zoom,
            height: 12 / zoom,
            backgroundColor: evidence.color,
            boxShadow: `0 0 ${6 / zoom}px ${getGlowColor(evidence.color, 0.8)}`,
            opacity: isSelected ? 1 : 0,
            transition: 'opacity 0.2s ease',
            zIndex: 20,
          }}
          onMouseDown={(e) => handleConnectionHandleMouseDown(e, edge)}
          onMouseEnter={(e) => {
            e.currentTarget.style.opacity = '1';
          }}
        />
      ))}

      <style>{`
        [data-evidence-card]:hover [data-connection-handle] {
          opacity: 1 !important;
        }
      `}</style>
    </div>
  );
};

export default EvidenceCard;
