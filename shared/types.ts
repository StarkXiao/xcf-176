export interface Case {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  updatedAt: string;
  canvasState?: CanvasState;
}

export interface Evidence {
  id: string;
  caseId: string;
  content: string;
  source: string;
  importance: 'low' | 'normal' | 'high' | 'critical';
  tags: string[];
  positionX: number;
  positionY: number;
  width: number;
  height: number;
  color: string;
  timestamp: string;
  createdAt: string;
}

export interface Connection {
  id: string;
  caseId: string;
  fromEvidenceId: string;
  toEvidenceId: string;
  label: string;
  color: string;
  lineStyle: 'solid' | 'dashed' | 'dotted';
  createdAt: string;
}

export interface CanvasState {
  zoom: number;
  panX: number;
  panY: number;
}

export interface SearchFilter {
  keyword: string;
  tags: string[];
  importance?: Evidence['importance'];
  dateRange?: { start: string; end: string };
}

export interface CaseWithRelations extends Case {
  evidence: Evidence[];
  connections: Connection[];
}

export interface CreateCaseDto {
  name: string;
  description?: string;
}

export interface UpdateCaseDto {
  name?: string;
  description?: string;
  canvasState?: CanvasState;
}

export interface CreateEvidenceDto {
  caseId: string;
  content: string;
  source?: string;
  importance?: Evidence['importance'];
  tags?: string[];
  positionX?: number;
  positionY?: number;
  width?: number;
  height?: number;
  color?: string;
  timestamp?: string;
}

export interface UpdateEvidenceDto {
  content?: string;
  source?: string;
  importance?: Evidence['importance'];
  tags?: string[];
  positionX?: number;
  positionY?: number;
  width?: number;
  height?: number;
  color?: string;
  timestamp?: string;
}

export interface CreateConnectionDto {
  caseId: string;
  fromEvidenceId: string;
  toEvidenceId: string;
  label?: string;
  color?: string;
  lineStyle?: Connection['lineStyle'];
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}
