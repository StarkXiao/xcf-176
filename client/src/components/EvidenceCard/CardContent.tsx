import React from 'react';
import { CYBERPUNK_COLORS, getGlowColor } from '@/utils/colorUtils';
import type { Evidence } from '@/types';

interface CardContentProps {
  evidence: Evidence;
  zoom: number;
}

export const CardContent: React.FC<CardContentProps> = ({ evidence, zoom }) => {
  return (
    <div
      className="px-3 py-2 flex-1 overflow-hidden"
      style={{ backgroundColor: getGlowColor(CYBERPUNK_COLORS.bgSecondary, 0.8) }}
    >
      <p
        className="font-mono leading-relaxed"
        style={{
          fontSize: `${11 / zoom}px`,
          color: CYBERPUNK_COLORS.textPrimary,
          display: '-webkit-box',
          WebkitLineClamp: 4,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}
      >
        {evidence.content}
      </p>
    </div>
  );
};

export default CardContent;
