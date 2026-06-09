export interface Case {
  id: string;
  name: string;
  description: string;
  status: TaskStatus;
  keyClues: string[];
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

export type ConsultationStatus = 'open' | 'in_progress' | 'concluded' | 'cancelled';

export interface Consultation {
  id: string;
  caseId: string;
  title: string;
  description: string;
  status: ConsultationStatus;
  initiatedBy: string;
  evidenceIds: string[];
  keyClues: string[];
  concludedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ConsultationDiscussion {
  id: string;
  consultationId: string;
  collaboratorId: string;
  collaboratorName: string;
  evidenceId?: string;
  content: string;
  isDispute: boolean;
  createdAt: string;
}

export interface ConsultationConclusion {
  id: string;
  consultationId: string;
  content: string;
  decidedBy: string;
  decidedByName: string;
  caseStatusUpdate?: TaskStatus;
  keyCluesUpdate?: string[];
  createdAt: string;
}

export interface ConsultationDispute {
  id: string;
  consultationId: string;
  discussionId: string;
  evidenceId?: string;
  description: string;
  raisedBy: string;
  raisedByName: string;
  resolution?: string;
  resolvedBy?: string;
  resolvedByName?: string;
  resolvedAt?: string;
  createdAt: string;
}

export interface CreateConsultationDto {
  caseId: string;
  title: string;
  description?: string;
  initiatedBy: string;
  evidenceIds?: string[];
  keyClues?: string[];
}

export interface UpdateConsultationDto {
  title?: string;
  description?: string;
  status?: ConsultationStatus;
  evidenceIds?: string[];
  keyClues?: string[];
  concludedAt?: string;
}

export interface CreateDiscussionDto {
  consultationId: string;
  collaboratorId: string;
  collaboratorName: string;
  evidenceId?: string;
  content: string;
  isDispute?: boolean;
}

export interface CreateConclusionDto {
  consultationId: string;
  content: string;
  decidedBy: string;
  decidedByName: string;
  caseStatusUpdate?: TaskStatus;
  keyCluesUpdate?: string[];
}

export interface CreateDisputeDto {
  consultationId: string;
  discussionId: string;
  evidenceId?: string;
  description: string;
  raisedBy: string;
  raisedByName: string;
}

export interface ResolveDisputeDto {
  resolution: string;
  resolvedBy: string;
  resolvedByName: string;
}

export interface ConsultationWithDetails extends Consultation {
  discussions: ConsultationDiscussion[];
  conclusions: ConsultationConclusion[];
  disputes: ConsultationDispute[];
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
  | 'delete_case'
  | 'restore_snapshot'
  | 'create_consultation'
  | 'update_consultation'
  | 'add_discussion'
  | 'add_conclusion'
  | 'raise_dispute'
  | 'resolve_dispute';

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
  status?: TaskStatus;
  keyClues?: string[];
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

export type EvidenceSourceType = 'webpage_screenshot' | 'file_upload' | 'manual_entry';

export type VerificationStatus = 'pending' | 'verified' | 'failed' | 'duplicate';

export interface EvidenceCollectionItem {
  id: string;
  caseId: string;
  sourceType: EvidenceSourceType;
  content: string;
  sourceUrl?: string;
  fileName?: string;
  fileSize?: number;
  fileType?: string;
  screenshotDataUrl?: string;
  contentHash: string;
  importance: Evidence['importance'];
  tags: string[];
  verificationStatus: VerificationStatus;
  duplicateOf?: string;
  collectedAt: string;
  archivedAt?: string;
  archivedEvidenceId?: string;
}

export interface CreateCollectionItemDto {
  caseId: string;
  sourceType: EvidenceSourceType;
  content: string;
  sourceUrl?: string;
  fileName?: string;
  fileSize?: number;
  fileType?: string;
  screenshotDataUrl?: string;
  importance?: Evidence['importance'];
  tags?: string[];
}

export type TraceNodeKind = 'evidence' | 'collection' | 'audit';
export type TraceEdgeKind = 'connection' | 'temporal' | 'source' | 'dedup';
export type TracePerspective = 'timeline' | 'source' | 'relationship' | 'importance';

export interface TraceNode {
  id: string;
  kind: TraceNodeKind;
  label: string;
  timestamp: string;
  sourceType?: EvidenceSourceType;
  importance?: Evidence['importance'];
  referenceId: string;
  tags: string[];
  collaboratorName?: string;
}

export interface TraceEdge {
  id: string;
  fromNodeId: string;
  toNodeId: string;
  label: string;
  kind: TraceEdgeKind;
}

export interface TraceGraph {
  nodes: TraceNode[];
  edges: TraceEdge[];
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}
