import React from 'react';
import { CYBERPUNK_COLORS } from '@/utils/colorUtils';

interface GridBackgroundProps {
  gridSize?: number;
  majorGridSize?: number;
}

export const GridBackground: React.FC<GridBackgroundProps> = ({
  gridSize = 20,
  majorGridSize = 100,
}) => {
  return (
    <svg
      className="absolute inset-0 w-full h-full pointer-events-none"
      style={{ backgroundColor: CYBERPUNK_COLORS.bgPrimary }}
    >
      <defs>
        <pattern
          id="grid-small"
          width={gridSize}
          height={gridSize}
          patternUnits="userSpaceOnUse"
        >
          <path
            d={`M ${gridSize} 0 L 0 0 0 ${gridSize}`}
            fill="none"
            stroke={CYBERPUNK_COLORS.gridLineColor}
            strokeWidth="0.5"
            opacity="0.3"
          />
        </pattern>

        <pattern
          id="grid-major"
          width={majorGridSize}
          height={majorGridSize}
          patternUnits="userSpaceOnUse"
        >
          <rect
            width={majorGridSize}
            height={majorGridSize}
            fill="url(#grid-small)"
          />
          <path
            d={`M ${majorGridSize} 0 L 0 0 0 ${majorGridSize}`}
            fill="none"
            stroke={CYBERPUNK_COLORS.gridLineColor}
            strokeWidth="1"
            opacity="0.5"
          />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#grid-major)" />
    </svg>
  );
};

export default GridBackground;
