import React from 'react';
import { twMerge } from 'tailwind-merge';

interface ScanlineEffectProps {
  className?: string;
  intensity?: number;
  animated?: boolean;
}

export const ScanlineEffect: React.FC<ScanlineEffectProps> = ({
  className,
  intensity = 0.03,
  animated = true,
}) => {
  return (
    <div
      className={twMerge(
        'pointer-events-none absolute inset-0 z-50 overflow-hidden',
        className
      )}
      style={{
        background: `repeating-linear-gradient(
          0deg,
          rgba(0, 0, 0, ${intensity}),
          rgba(0, 0, 0, ${intensity}) 1px,
          transparent 1px,
          transparent 2px
        )`,
        animation: animated ? 'scanline-move 8s linear infinite' : 'none',
      }}
    >
      <div
        className="absolute inset-0"
        style={{
          background: 'radial-gradient(ellipse at center, transparent 0%, rgba(0,0,0,0.3) 100%)',
        }}
      />
      <style>{`
        @keyframes scanline-move {
          0% {
            background-position: 0 0;
          }
          100% {
            background-position: 0 100%;
          }
        }
      `}</style>
    </div>
  );
};

export default ScanlineEffect;
