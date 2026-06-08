import React, { useState } from 'react';
import { twMerge } from 'tailwind-merge';
import { CYBERPUNK_COLORS, getGlowColor, getBoxShadow } from '@/utils/colorUtils';

interface NeonInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  glowColor?: string;
}

export const NeonInput: React.FC<NeonInputProps> = ({
  label,
  error,
  glowColor = CYBERPUNK_COLORS.accentCyan,
  className,
  style,
  onFocus,
  onBlur,
  ...props
}) => {
  const [isFocused, setIsFocused] = useState(false);

  const inputStyle: React.CSSProperties = {
    borderColor: error
      ? CYBERPUNK_COLORS.accentRed
      : isFocused
      ? glowColor
      : CYBERPUNK_COLORS.borderColor,
    backgroundColor: CYBERPUNK_COLORS.bgSecondary,
    color: CYBERPUNK_COLORS.textPrimary,
    boxShadow: isFocused && !error ? getBoxShadow(glowColor, 8) : 'none',
    transition: 'all 0.2s ease',
    ...style,
  };

  return (
    <div className="w-full">
      {label && (
        <label
          className="block mb-1 text-xs font-mono uppercase tracking-wider"
          style={{ color: CYBERPUNK_COLORS.textSecondary }}
        >
          {label}
        </label>
      )}
      <input
        className={twMerge(
          'w-full px-3 py-2 font-mono text-sm border rounded-sm',
          'focus:outline-none placeholder:text-gray-600',
          className
        )}
        style={inputStyle}
        onFocus={(e) => {
          setIsFocused(true);
          onFocus?.(e);
        }}
        onBlur={(e) => {
          setIsFocused(false);
          onBlur?.(e);
        }}
        {...props}
      />
      {error && (
        <span
          className="block mt-1 text-xs font-mono"
          style={{
            color: CYBERPUNK_COLORS.accentRed,
            textShadow: `0 0 8px ${getGlowColor(CYBERPUNK_COLORS.accentRed, 0.6)}`,
          }}
        >
          {error}
        </span>
      )}
    </div>
  );
};

export default NeonInput;
