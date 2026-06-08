import React from 'react';
import { twMerge } from 'tailwind-merge';
import { getGlowColor } from '@/utils/colorUtils';

interface GlowBorderProps {
  children: React.ReactNode;
  color?: string;
  glowIntensity?: number;
  borderWidth?: number;
  className?: string;
  pulse?: boolean;
}

export const GlowBorder: React.FC<GlowBorderProps> = ({
  children,
  color = '#00f0ff',
  glowIntensity = 0.6,
  borderWidth = 1,
  className,
  pulse = false,
}) => {
  const glowColor = getGlowColor(color, glowIntensity);
  const strongGlow = getGlowColor(color, glowIntensity * 1.5);

  return (
    <div
      className={twMerge('relative p-[1px] rounded-sm overflow-hidden', className)}
      style={{
        boxShadow: `0 0 20px ${glowColor}, inset 0 0 20px ${getGlowColor(color, 0.1)}`,
        animation: pulse ? 'glow-pulse 2s ease-in-out infinite' : 'none',
      }}
    >
      <div
        className="absolute inset-0 rounded-sm"
        style={{
          background: `linear-gradient(135deg, ${color}40, transparent 50%, ${color}40)`,
          padding: borderWidth,
        }}
      />
      <div
        className="relative rounded-sm"
        style={{
          border: `${borderWidth}px solid ${color}`,
          boxShadow: `0 0 15px ${glowColor}, inset 0 0 10px ${getGlowColor(color, 0.05)}`,
        }}
      >
        {children}
      </div>
      <style>{`
        @keyframes glow-pulse {
          0%, 100% {
            box-shadow: 0 0 20px ${glowColor}, inset 0 0 20px ${getGlowColor(color, 0.1)};
          }
          50% {
            box-shadow: 0 0 40px ${strongGlow}, inset 0 0 30px ${getGlowColor(color, 0.2)};
          }
        }
      `}</style>
    </div>
  );
};

export default GlowBorder;
