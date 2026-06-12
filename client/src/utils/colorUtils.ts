import type { ImportanceLevel } from '@/types';
import type { EvidenceSourceCredibility, EvidenceVerificationStatus } from '../../../shared/types';

export const CYBERPUNK_COLORS = {
  bgPrimary: '#0a0a0f',
  bgSecondary: '#12121a',
  bgTertiary: '#1a1a25',
  accentCyan: '#00f0ff',
  accentRed: '#ff0055',
  accentYellow: '#ffcc00',
  accentGreen: '#00ff88',
  accentPurple: '#9945ff',
  accentOrange: '#ff8800',
  textPrimary: '#e0e0e0',
  textSecondary: '#888899',
  borderColor: '#2a2a3a',
  gridColor: '#1a1a2e',
  gridLineColor: '#252538',
};

export const IMPORTANCE_COLORS: Record<ImportanceLevel, string> = {
  low: CYBERPUNK_COLORS.accentGreen,
  normal: CYBERPUNK_COLORS.accentCyan,
  high: CYBERPUNK_COLORS.accentYellow,
  critical: CYBERPUNK_COLORS.accentRed,
};

export const SOURCE_CREDIBILITY_COLORS: Record<EvidenceSourceCredibility, string> = {
  very_low: '#ff4444',
  low: '#ff8844',
  medium: '#ffcc00',
  high: '#88cc44',
  very_high: '#00ff88',
};

export const VERIFICATION_STATUS_COLORS: Record<EvidenceVerificationStatus, string> = {
  unverified: '#888899',
  pending: '#ffcc00',
  verified: '#00ff88',
  failed: '#ff4444',
  disputed: '#ff8800',
};

export const SOURCE_CREDIBILITY_LABELS: Record<EvidenceSourceCredibility, string> = {
  very_low: '极低',
  low: '低',
  medium: '中',
  high: '高',
  very_high: '极高',
};

export const VERIFICATION_STATUS_LABELS: Record<EvidenceVerificationStatus, string> = {
  unverified: '未核验',
  pending: '核验中',
  verified: '已核验',
  failed: '核验失败',
  disputed: '有争议',
};

export function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null;
}

export function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map((x) => x.toString(16).padStart(2, '0')).join('');
}

export function getGlowColor(color: string, intensity: number = 0.5): string {
  const rgb = hexToRgb(color);
  if (!rgb) return color;
  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${intensity})`;
}

export function getTextShadow(color: string, blur: number = 8): string {
  return `0 0 ${blur}px ${getGlowColor(color, 0.8)}, 0 0 ${blur * 2}px ${getGlowColor(color, 0.4)}`;
}

export function getBoxShadow(color: string, spread: number = 10): string {
  return `0 0 ${spread}px ${getGlowColor(color, 0.6)}, inset 0 0 ${spread / 2}px ${getGlowColor(color, 0.1)}`;
}

export function generateRandomColor(): string {
  const colors = [
    CYBERPUNK_COLORS.accentCyan,
    CYBERPUNK_COLORS.accentRed,
    CYBERPUNK_COLORS.accentYellow,
    CYBERPUNK_COLORS.accentGreen,
    CYBERPUNK_COLORS.accentPurple,
  ];
  return colors[Math.floor(Math.random() * colors.length)];
}

export function lightenColor(hex: string, percent: number): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;

  const r = Math.min(255, Math.round(rgb.r + (255 - rgb.r) * percent));
  const g = Math.min(255, Math.round(rgb.g + (255 - rgb.g) * percent));
  const b = Math.min(255, Math.round(rgb.b + (255 - rgb.b) * percent));

  return rgbToHex(r, g, b);
}

export function darkenColor(hex: string, percent: number): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;

  const r = Math.max(0, Math.round(rgb.r * (1 - percent)));
  const g = Math.max(0, Math.round(rgb.g * (1 - percent)));
  const b = Math.max(0, Math.round(rgb.b * (1 - percent)));

  return rgbToHex(r, g, b);
}
