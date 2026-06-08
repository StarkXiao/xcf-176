import React from 'react';
import { Clock, Globe } from 'lucide-react';
import { CYBERPUNK_COLORS, getGlowColor } from '@/utils/colorUtils';
import type { Evidence } from '@/types';

interface CardFooterProps {
  evidence: Evidence;
  zoom: number;
}

export const CardFooter: React.FC<CardFooterProps> = ({ evidence, zoom }) => {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div
      className="flex items-center justify-between px-2 py-1 border-t"
      style={{
        borderColor: getGlowColor(evidence.color, 0.2),
        backgroundColor: getGlowColor(CYBERPUNK_COLORS.bgTertiary, 0.9),
      }}
    >
      <div className="flex items-center gap-1">
        <Clock
          size={10 / zoom}
          style={{ color: CYBERPUNK_COLORS.textSecondary }}
        />
        <span
          className="font-mono"
          style={{
            fontSize: `${9 / zoom}px`,
            color: CYBERPUNK_COLORS.textSecondary,
          }}
        >
          {formatDate(evidence.timestamp)}
        </span>
      </div>
      {evidence.source && (
        <div className="flex items-center gap-1 max-w-[50%]">
          <Globe
            size={10 / zoom}
            style={{ color: CYBERPUNK_COLORS.textSecondary, flexShrink: 0 }}
          />
          <span
            className="font-mono truncate"
            style={{
              fontSize: `${9 / zoom}px`,
              color: CYBERPUNK_COLORS.textSecondary,
            }}
          >
            {evidence.source}
          </span>
        </div>
      )}
    </div>
  );
};

export default CardFooter;
