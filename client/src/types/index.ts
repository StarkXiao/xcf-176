export * from '../../../shared/types';

export interface Point {
  x: number;
  y: number;
}

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface CardEdge {
  top: Point;
  right: Point;
  bottom: Point;
  left: Point;
}

export type LineStyle = 'solid' | 'dashed' | 'dotted';

export type ImportanceLevel = 'low' | 'normal' | 'high' | 'critical';

export interface CyberpunkTheme {
  bgPrimary: string;
  bgSecondary: string;
  accentCyan: string;
  accentRed: string;
  accentYellow: string;
  accentGreen: string;
  textPrimary: string;
  textSecondary: string;
  borderColor: string;
}

export interface SearchFilters {
  keyword: string;
  tags: string[];
  importance?: ImportanceLevel;
  sourceCredibility?: import('../../../shared/types').EvidenceSourceCredibility;
  verificationStatus?: import('../../../shared/types').EvidenceVerificationStatus;
}

export interface DraggedEvidence {
  id: string;
  type: 'sidebar' | 'canvas';
  offsetX?: number;
  offsetY?: number;
}
