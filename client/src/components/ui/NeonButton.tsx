import React from 'react';
import { twMerge } from 'tailwind-merge';
import { CYBERPUNK_COLORS, getBoxShadow, getGlowColor } from '@/utils/colorUtils';

interface NeonButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'success' | 'warning';
  size?: 'sm' | 'md' | 'lg';
  glow?: boolean;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
}

const variantColors: Record<string, string> = {
  primary: CYBERPUNK_COLORS.accentCyan,
  secondary: CYBERPUNK_COLORS.accentPurple,
  danger: CYBERPUNK_COLORS.accentRed,
  success: CYBERPUNK_COLORS.accentGreen,
  warning: CYBERPUNK_COLORS.accentYellow,
};

const sizeClasses: Record<string, string> = {
  sm: 'px-2 py-1 text-xs',
  md: 'px-4 py-2 text-sm',
  lg: 'px-6 py-3 text-base',
};

export const NeonButton: React.FC<NeonButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  glow = true,
  icon,
  iconPosition = 'left',
  className,
  style,
  disabled,
  ...props
}) => {
  const color = variantColors[variant];
  const baseClasses = twMerge(
    'relative font-mono uppercase tracking-wider transition-all duration-200',
    'border rounded-sm focus:outline-none',
    'flex items-center justify-center gap-2',
    'disabled:opacity-50 disabled:cursor-not-allowed',
    sizeClasses[size],
    className
  );

  const buttonStyle: React.CSSProperties = {
    borderColor: color,
    color: color,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    textShadow: glow ? `0 0 10px ${getGlowColor(color, 0.8)}` : 'none',
    boxShadow: glow ? getBoxShadow(color, 5) : 'none',
    ...style,
  };

  const hoverStyle: React.CSSProperties = {
    backgroundColor: getGlowColor(color, 0.15),
    boxShadow: glow ? getBoxShadow(color, 15) : 'none',
  };

  return (
    <button
      className={baseClasses}
      style={buttonStyle}
      disabled={disabled}
      onMouseEnter={(e) => {
        if (!disabled) {
          Object.assign(e.currentTarget.style, hoverStyle);
        }
      }}
      onMouseLeave={(e) => {
        if (!disabled) {
          Object.assign(e.currentTarget.style, buttonStyle);
        }
      }}
      {...props}
    >
      {icon && iconPosition === 'left' && <span>{icon}</span>}
      {children}
      {icon && iconPosition === 'right' && <span>{icon}</span>}
    </button>
  );
};

export default NeonButton;
