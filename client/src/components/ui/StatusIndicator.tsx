import React from 'react';
import { twMerge } from 'tailwind-merge';
import { getGlowColor } from '@/utils/colorUtils';
import type { ImportanceLevel } from '@/types';

interface StatusIndicatorProps {
  status?: 'online' | 'offline' | 'warning' | 'saving' | 'saved' | 'error' | 'idle';
  importance?: ImportanceLevel;
  size?: 'sm' | 'md' | 'lg';
  pulse?: boolean;
  label?: string;
  className?: string;
}

const statusColors: Record<string, string> = {
  online: '#00ff88',
  offline: '#ff0055',
  warning: '#ffcc00',
  saving: '#ffcc00',
  saved: '#00ff88',
  error: '#ff0055',
  idle: '#888899',
};

const importanceColors: Record<ImportanceLevel, string> = {
  low: '#00ff88',
  normal: '#00f0ff',
  high: '#ffcc00',
  critical: '#ff0055',
};

const sizeClasses: Record<string, string> = {
  sm: 'w-2 h-2',
  md: 'w-3 h-3',
  lg: 'w-4 h-4',
};

export const StatusIndicator: React.FC<StatusIndicatorProps> = ({
  status,
  importance,
  size = 'md',
  pulse = true,
  label,
  className,
}) => {
  const color = importance ? importanceColors[importance] : status ? statusColors[status] : '#888899';
  const glowColor = getGlowColor(color, 0.8);

  return (
    <div className={twMerge('flex items-center gap-2', className)}>
      <div
        className={twMerge('rounded-full relative', sizeClasses[size])}
        style={{
          backgroundColor: color,
          boxShadow: `0 0 10px ${glowColor}, 0 0 20px ${getGlowColor(color, 0.4)}`,
          animation: pulse ? 'blink 1.5s ease-in-out infinite' : 'none',
        }}
      >
        <div
          className="absolute inset-0 rounded-full"
          style={{
            backgroundColor: color,
            opacity: 0.5,
            filter: 'blur(2px)',
          }}
        />
      </div>
      {label && (
        <span
          className="text-xs font-mono"
          style={{
            color,
            textShadow: `0 0 8px ${glowColor}`,
          }}
        >
          {label}
        </span>
      )}
      <style>{`
        @keyframes blink {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.4;
          }
        }
      `}</style>
    </div>
  );
};

export default StatusIndicator;
