export interface Case {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  updatedAt: string;
  canvasState?: CanvasState;
}

export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'reviewed';

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
  assignedTo: string | null;
  status: TaskStatus;
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
  collaborators: Collaborator[];
}

export interface Collaborator {
  id: string;
  caseId: string;
  name: string;
  role: 'lead' | 'analyst' | 'assistant' | 'reviewer';
  color: string;
  createdAt: string;
}

export type AuditAction =
  | 'create_evidence'
  | 'update_evidence'
  | 'delete_evidence'
  | 'move_evidence'
  | 'create_connection'
  | 'delete_connection'
  | 'update_connection'
  | 'assign_evidence'
  | 'change_status'
  | 'add_collaborator'
  | 'remove_collaborator'
  | 'create_case'
  | 'update_case'
  | 'delete_case';

export interface AuditLog {
  id: string;
  caseId: string;
  collaboratorId: string;
  collaboratorName: string;
  action: AuditAction;
  targetType: 'evidence' | 'connection' | 'case' | 'collaborator';
  targetId: string;
  detail: string;
  snapshot?: string;
  createdAt: string;
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
  assignedTo?: string | null;
  status?: TaskStatus;
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
  assignedTo?: string | null;
  status?: TaskStatus;
}

export interface CreateConnectionDto {
  caseId: string;
  fromEvidenceId: string;
  toEvidenceId: string;
  label?: string;
  color?: string;
  lineStyle?: Connection['lineStyle'];
}

export interface CreateCollaboratorDto {
  caseId: string;
  name: string;
  role?: Collaborator['role'];
  color?: string;
}

export interface UpdateCollaboratorDto {
  name?: string;
  role?: Collaborator['role'];
  color?: string;
}

export interface CreateAuditLogDto {
  caseId: string;
  collaboratorId: string;
  action: AuditAction;
  targetType: AuditLog['targetType'];
  targetId: string;
  detail: string;
  snapshot?: string;
}

export interface TimelineEntry {
  id: string;
  type: 'evidence' | 'connection' | 'audit';
  timestamp: string;
  title: string;
  description: string;
  color: string;
  referenceId: string;
  collaboratorName?: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}
