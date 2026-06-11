export interface Case {
  id: string;
  name: string;
  description: string;
  status: TaskStatus;
  keyClues: string[];
  createdAt: string;
  updatedAt: string;
  canvasState?: CanvasState;
  templateId?: string;
  templateMetadata?: {
    templateName: string;
    category: CaseTemplateCategory;
    evidenceFieldIds: string[];
    relationTypeIds: string[];
    investigationStepIds: string[];
  };
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
  | 'resolve_dispute'
  | 'create_investigation_task'
  | 'update_investigation_task'
  | 'assign_investigation_task'
  | 'complete_investigation_task'
  | 'link_evidence_to_task'
  | 'link_collection_to_task'
  | 'link_connection_to_task'
  | 'sync_collection_archived'
  | 'sync_evidence_updated'
  | 'sync_connection_updated'
  | 'sync_priority_escalated';

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
  templateId?: string | null;
  templateMetadata?: Case['templateMetadata'] | null;
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

export type InvestigationTaskPriority = 'low' | 'normal' | 'high' | 'critical';
export type InvestigationTaskStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled';

export type SyncNoteImpact = 'status_advanced' | 'priority_escalated' | 'info_only';

export interface InvestigationTaskSyncNote {
  id: string;
  sourceType: 'collection_archived' | 'evidence_updated' | 'connection_updated';
  sourceId: string;
  detail: string;
  impact: SyncNoteImpact;
  timestamp: string;
}

export interface SyncSourceChange {
  field: string;
  oldValue: string;
  newValue: string;
}

export interface InvestigationTask {
  id: string;
  caseId: string;
  title: string;
  description: string;
  priority: InvestigationTaskPriority;
  status: InvestigationTaskStatus;
  assigneeId: string | null;
  assigneeName: string | null;
  deadline: string | null;
  evidenceIds: string[];
  collectionItemIds: string[];
  connectionIds: string[];
  syncNotes: InvestigationTaskSyncNote[];
  createdBy: string;
  createdByName: string;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateInvestigationTaskDto {
  caseId: string;
  title: string;
  description?: string;
  priority?: InvestigationTaskPriority;
  assigneeId?: string | null;
  deadline?: string | null;
  evidenceIds?: string[];
  collectionItemIds?: string[];
  connectionIds?: string[];
  createdBy: string;
}

export interface UpdateInvestigationTaskDto {
  title?: string;
  description?: string;
  priority?: InvestigationTaskPriority;
  status?: InvestigationTaskStatus;
  assigneeId?: string | null;
  deadline?: string | null;
  evidenceIds?: string[];
  collectionItemIds?: string[];
  connectionIds?: string[];
  syncNotes?: InvestigationTaskSyncNote[];
}

export type ReportStatus = 'draft' | 'generating' | 'completed' | 'exported';
export type ReportExportFormat = 'json' | 'html' | 'markdown';

export interface ReportEvidenceSummary {
  id: string;
  content: string;
  source: string;
  importance: Evidence['importance'];
  tags: string[];
  status: TaskStatus;
  timestamp: string;
  assignedTo: string | null;
}

export interface ReportRelationshipEdge {
  fromEvidenceId: string;
  toEvidenceId: string;
  label: string;
  fromContent: string;
  toContent: string;
}

export interface ReportRelationshipGraph {
  nodes: ReportEvidenceSummary[];
  edges: ReportRelationshipEdge[];
}

export interface ReportTimelineEntry {
  timestamp: string;
  type: 'evidence' | 'connection' | 'audit' | 'task';
  title: string;
  description: string;
  referenceId: string;
}

export interface ReportTaskSummary {
  id: string;
  title: string;
  priority: InvestigationTaskPriority;
  status: InvestigationTaskStatus;
  assigneeName: string | null;
  deadline: string | null;
}

export interface ReportCaseSummary {
  caseId: string;
  caseName: string;
  caseDescription: string;
  caseStatus: TaskStatus;
  keyClues: string[];
  totalEvidence: number;
  totalConnections: number;
  totalTasks: number;
  evidenceByImportance: Record<Evidence['importance'], number>;
  evidenceByStatus: Record<TaskStatus, number>;
  collaborators: Array<{ id: string; name: string; role: string }>;
}

export interface Report {
  id: string;
  caseId: string;
  title: string;
  status: ReportStatus;
  caseSummary: ReportCaseSummary;
  relationshipGraph: ReportRelationshipGraph;
  timeline: ReportTimelineEntry[];
  taskSummaries: ReportTaskSummary[];
  exportFormat: ReportExportFormat;
  exportedContent: string | null;
  generatedAt: string | null;
  exportedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateReportDto {
  caseId: string;
  title?: string;
  exportFormat?: ReportExportFormat;
}

export interface UpdateReportDto {
  title?: string;
  status?: ReportStatus;
  exportFormat?: ReportExportFormat;
}

export type CaseTemplateCategory = 'fraud' | 'penetration' | 'ransomware' | 'data_breach' | 'other';

export interface TemplateEvidenceField {
  id: string;
  name: string;
  label: string;
  description?: string;
  dataType: 'text' | 'longtext' | 'date' | 'url' | 'file' | 'number';
  required: boolean;
  defaultValue?: string;
  placeholder?: string;
}

export interface TemplateRelationType {
  id: string;
  label: string;
  description?: string;
  color: string;
  lineStyle: 'solid' | 'dashed' | 'dotted';
  fromTypes: string[];
  toTypes: string[];
}

export interface TemplateInvestigationStep {
  id: string;
  title: string;
  description: string;
  priority: InvestigationTaskPriority;
  order: number;
  dependsOn?: string[];
  evidenceFieldIds?: string[];
}

export interface CaseTemplate {
  id: string;
  name: string;
  category: CaseTemplateCategory;
  description: string;
  icon?: string;
  color: string;
  evidenceFields: TemplateEvidenceField[];
  relationTypes: TemplateRelationType[];
  investigationSteps: TemplateInvestigationStep[];
  defaultTags: string[];
  isBuiltIn: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCaseTemplateDto {
  name: string;
  category: CaseTemplateCategory;
  description?: string;
  icon?: string;
  color?: string;
  evidenceFields?: TemplateEvidenceField[];
  relationTypes?: TemplateRelationType[];
  investigationSteps?: TemplateInvestigationStep[];
  defaultTags?: string[];
}

export interface UpdateCaseTemplateDto {
  name?: string;
  category?: CaseTemplateCategory;
  description?: string;
  icon?: string;
  color?: string;
  evidenceFields?: TemplateEvidenceField[];
  relationTypes?: TemplateRelationType[];
  investigationSteps?: TemplateInvestigationStep[];
  defaultTags?: string[];
}

export interface ApplyTemplateDto {
  templateId: string;
  caseName: string;
  caseDescription?: string;
  createdBy: string;
}

export interface ApplyTemplateResult {
  case: CaseWithRelations;
  template: CaseTemplate;
  evidenceFields: TemplateEvidenceField[];
  relationTypes: TemplateRelationType[];
  investigationSteps: TemplateInvestigationStep[];
  createdTasks: InvestigationTask[];
}

export type AnomalyAlertType = 'high_importance' | 'dense_connections' | 'temporal_burst' | 'combined';
export type AnomalyAlertSeverity = 'warning' | 'high' | 'critical';
export type AnomalyAlertStatus = 'pending' | 'reviewed' | 'dismissed' | 'resolved';

export interface AnomalyAlert {
  id: string;
  caseId: string;
  caseName: string;
  type: AnomalyAlertType;
  severity: AnomalyAlertSeverity;
  status: AnomalyAlertStatus;
  title: string;
  description: string;
  score: number;
  evidenceCount: number;
  connectionCount: number;
  criticalEvidenceCount: number;
  highEvidenceCount: number;
  burstStart?: string;
  burstEnd?: string;
  evidenceIds: string[];
  connectionIds: string[];
  detectedAt: string;
  reviewedAt?: string;
  reviewedBy?: string;
  notes?: string;
}

export interface AnomalyDetectionResult {
  caseId: string;
  caseName: string;
  alerts: AnomalyAlert[];
  overallScore: number;
  priorityLevel: AnomalyAlertSeverity;
  summary: string;
  recommendations: string[];
}

export interface HighImportanceDetectionConfig {
  criticalThreshold?: number;
  highThreshold?: number;
  minEvidenceCount?: number;
}

export interface DenseConnectionsDetectionConfig {
  minConnectionsPerEvidence?: number;
  minClusterSize?: number;
  connectionDensityThreshold?: number;
}

export interface TemporalBurstDetectionConfig {
  timeWindowHours?: number;
  minEvidenceInWindow?: number;
  burstMultiplier?: number;
}

export interface AnomalyDetectionConfig {
  highImportance?: HighImportanceDetectionConfig;
  denseConnections?: DenseConnectionsDetectionConfig;
  temporalBurst?: TemporalBurstDetectionConfig;
  combinedAlertThreshold?: number;
}

export interface UpdateAnomalyAlertDto {
  status?: AnomalyAlertStatus;
  notes?: string;
  reviewedBy?: string;
}

export type EvidenceChangeType =
  | 'create'
  | 'update_content'
  | 'update_tags'
  | 'update_importance'
  | 'update_status'
  | 'update_position'
  | 'update_size'
  | 'update_color'
  | 'update_assignment'
  | 'update_timestamp'
  | 'update_source'
  | 'relation_add'
  | 'relation_remove'
  | 'relation_update'
  | 'delete'
  | 'restore';

export interface FieldDiff {
  field: string;
  fieldLabel: string;
  oldValue: unknown;
  newValue: unknown;
}

export interface TagChange {
  type: 'add' | 'remove';
  tag: string;
}

export interface RelationChange {
  type: 'add' | 'remove' | 'update';
  connectionId: string;
  fromEvidenceId?: string;
  toEvidenceId?: string;
  oldLabel?: string;
  newLabel?: string;
  oldColor?: string;
  newColor?: string;
  oldLineStyle?: string;
  newLineStyle?: string;
}

export interface EvidenceVersion {
  id: string;
  evidenceId: string;
  caseId: string;
  versionNumber: number;
  changeType: EvidenceChangeType;
  changeSummary: string;
  fieldDiffs: FieldDiff[];
  tagChanges: TagChange[];
  relationChanges: RelationChange[];
  beforeState: Partial<Evidence> | null;
  afterState: Partial<Evidence> | null;
  relatedConnectionsSnapshot: Connection[] | null;
  collaboratorId: string | null;
  collaboratorName: string | null;
  restoredFromVersionId?: string;
  createdAt: string;
}

export interface CreateEvidenceVersionDto {
  evidenceId: string;
  caseId: string;
  changeType: EvidenceChangeType;
  changeSummary?: string;
  beforeState?: Partial<Evidence> | null;
  afterState?: Partial<Evidence> | null;
  fieldDiffs?: FieldDiff[];
  tagChanges?: TagChange[];
  relationChanges?: RelationChange[];
  relatedConnectionsSnapshot?: Connection[] | null;
  collaboratorId?: string | null;
  collaboratorName?: string | null;
  restoredFromVersionId?: string;
}

export interface RestoreEvidenceVersionDto {
  versionId: string;
  collaboratorId?: string | null;
  collaboratorName?: string | null;
}

export interface VersionDiffResult {
  version: EvidenceVersion;
  fieldDiffs: FieldDiff[];
  tagChanges: TagChange[];
  relationChanges: RelationChange[];
  readableSummary: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}
