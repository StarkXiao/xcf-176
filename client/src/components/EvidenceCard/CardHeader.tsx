import React from 'react';
import { Tag } from 'lucide-react';
import { StatusIndicator } from '@/components/ui/StatusIndicator';
import { CYBERPUNK_COLORS, getGlowColor } from '@/utils/colorUtils';
import type { Evidence } from '@/types';

interface CardHeaderProps {
  evidence: Evidence;
  zoom: number;
}

export const CardHeader: React.FC<CardHeaderProps> = ({ evidence, zoom }) => {
  return (
    <div
      className="flex items-center justify-between px-2 py-1 border-b"
      style={{
        borderColor: getGlowColor(evidence.color, 0.3),
        backgroundColor: getGlowColor(evidence.color, 0.1),
      }}
    >
      <div className="flex items-center gap-1.5 overflow-hidden">
        <Tag
          size={12 / zoom}
          style={{
            color: evidence.color,
            filter: `drop-shadow(0 0 2px ${getGlowColor(evidence.color, 0.6)})`,
            flexShrink: 0,
          }}
        />
        <div className="flex flex-wrap gap-0.5 overflow-hidden">
          {evidence.tags.slice(0, 2).map((tag) => (
            <span
              key={tag}
              className="px-1 rounded-sm font-mono"
              style={{
                fontSize: `${9 / zoom}px`,
                backgroundColor: getGlowColor(CYBERPUNK_COLORS.accentPurple, 0.2),
                color: CYBERPUNK_COLORS.accentPurple,
              }}
            >
              #{tag}
            </span>
          ))}
          {evidence.tags.length > 2 && (
            <span
              className="font-mono"
              style={{
                fontSize: `${9 / zoom}px`,
                color: CYBERPUNK_COLORS.textSecondary,
              }}
            >
              +{evidence.tags.length - 2}
            </span>
          )}
        </div>
      </div>
      <StatusIndicator importance={evidence.importance} size="sm" pulse={true} />
    </div>
  );
};

export default CardHeader;
