import { InvestigationTaskRepository } from '../repositories/InvestigationTaskRepository.js';
import { CollaboratorRepository } from '../repositories/CollaboratorRepository.js';
import { AuditLogRepository } from '../repositories/AuditLogRepository.js';
import { EvidenceCollectionRepository } from '../repositories/EvidenceCollectionRepository.js';
import { v4 as uuidv4 } from 'uuid';
import type {
  InvestigationTask,
  InvestigationTaskPriority,
  InvestigationTaskStatus,
  InvestigationTaskSyncNote,
  SyncNoteImpact,
  SyncSourceChange,
  CreateInvestigationTaskDto,
  UpdateInvestigationTaskDto,
  CreateAuditLogDto,
} from '@shared/types';

const PRIORITY_LEVELS: Record<InvestigationTaskPriority, number> = {
  low: 0,
  normal: 1,
  high: 2,
  critical: 3,
};

function resolvePriorityLevel(p: InvestigationTaskPriority): number {
  return PRIORITY_LEVELS[p] ?? 1;
}

function shouldEscalatePriority(current: InvestigationTaskPriority, target: InvestigationTaskPriority): boolean {
  return resolvePriorityLevel(target) > resolvePriorityLevel(current);
}

function allCollectionItemsArchived(task: InvestigationTask): boolean {
  if (task.collectionItemIds.length === 0) return false;
  return task.collectionItemIds.every((cid) => {
    const item = EvidenceCollectionRepository.findById(cid);
    return item && item.archivedAt;
  });
}

function recordAuditLog(caseId: string, action: string, targetType: string, targetId: string, detail: string, collaboratorId: string): void {
  const collaborator = CollaboratorRepository.findById(collaboratorId);
  const collabName = collaborator?.name ?? '系统';
  const dto: CreateAuditLogDto = {
    caseId,
    collaboratorId,
    action: action as CreateAuditLogDto['action'],
    targetType: targetType as CreateAuditLogDto['targetType'],
    targetId,
    detail,
  };
  AuditLogRepository.create(dto, collabName);
}

function resolveAssigneeName(assigneeId: string | null | undefined): string | null {
  if (!assigneeId) return null;
  const collaborator = CollaboratorRepository.findById(assigneeId);
  return collaborator?.name ?? null;
}

function makeSyncNote(
  sourceType: InvestigationTaskSyncNote['sourceType'],
  sourceId: string,
  detail: string,
  impact: SyncNoteImpact,
): InvestigationTaskSyncNote {
  return {
    id: uuidv4(),
    sourceType,
    sourceId,
    detail,
    impact,
    timestamp: new Date().toISOString(),
  };
}

type SyncAuditAction = 'sync_collection_archived' | 'sync_evidence_updated' | 'sync_connection_updated' | 'sync_priority_escalated';

interface SyncResult {
  patch: UpdateInvestigationTaskDto;
  notes: InvestigationTaskSyncNote[];
  auditEntries: Array<{ action: SyncAuditAction; detail: string }>;
}

function computeSyncPatch(
  task: InvestigationTask,
  sourceType: InvestigationTaskSyncNote['sourceType'],
  sourceId: string,
  detail: string,
  changes: SyncSourceChange[],
  extraPatch?: UpdateInvestigationTaskDto,
): SyncResult {
  const notes: InvestigationTaskSyncNote[] = [];
  const auditEntries: Array<{ action: SyncAuditAction; detail: string }> = [];
  const patch: UpdateInvestigationTaskDto = { ...extraPatch };

  let impact: SyncNoteImpact = 'info_only';
  const statusAdvanced = task.status === 'pending';

  if (statusAdvanced) {
    if (sourceType === 'collection_archived') {
      if (allCollectionItemsArchived(task)) {
        impact = 'status_advanced';
        patch.status = 'in_progress';
      }
    } else if (sourceType === 'evidence_updated') {
      const importanceChange = changes.find((c) => c.field === 'importance');
      const statusChange = changes.find((c) => c.field === 'status');
      if (importanceChange?.newValue === 'critical' || statusChange) {
        impact = 'status_advanced';
        patch.status = 'in_progress';
      }
    } else if (sourceType === 'connection_updated') {
      const labelChange = changes.find((c) => c.field === 'label');
      if (labelChange) {
        impact = 'status_advanced';
        patch.status = 'in_progress';
      }
    }
  }

  if (sourceType === 'evidence_updated') {
    const importanceChange = changes.find((c) => c.field === 'importance');
    if (importanceChange) {
      const newLevel = importanceChange.newValue as InvestigationTaskPriority;
      if (shouldEscalatePriority(task.priority, newLevel)) {
        if (impact === 'info_only') impact = 'priority_escalated';
        patch.priority = newLevel;
        notes.push(makeSyncNote(sourceType, sourceId, `关联证据重要性提升: ${task.priority} → ${newLevel}`, 'priority_escalated'));
        auditEntries.push({
          action: 'sync_priority_escalated',
          detail: `任务优先级升级: ${task.priority} → ${newLevel} (证据重要性变更)`,
        });
      }
    }
  }

  if (sourceType === 'collection_archived') {
    const collectionItem = EvidenceCollectionRepository.findById(sourceId);
    const archiveNote = makeSyncNote(
      sourceType,
      sourceId,
      `采集项「${collectionItem?.content.slice(0, 30) ?? sourceId}」已归档为证据卡片`,
      impact,
    );
    notes.push(archiveNote);
  } else {
    notes.push(makeSyncNote(sourceType, sourceId, detail, impact));
  }

  if (impact === 'status_advanced' && patch.status) {
    auditEntries.push({
      action: sourceType === 'collection_archived' ? 'sync_collection_archived'
        : sourceType === 'evidence_updated' ? 'sync_evidence_updated'
        : 'sync_connection_updated',
      detail: `任务状态自动推进: ${task.status} → ${patch.status} (${detail})`,
    });
  }

  if (impact === 'info_only') {
    auditEntries.push({
      action: sourceType === 'collection_archived' ? 'sync_collection_archived'
        : sourceType === 'evidence_updated' ? 'sync_evidence_updated'
        : 'sync_connection_updated',
      detail,
    });
  }

  patch.syncNotes = [...task.syncNotes, ...notes];
  return { patch, notes, auditEntries };
}

export const InvestigationTaskService = {
  getAllTasks: (): InvestigationTask[] => {
    return InvestigationTaskRepository.findAll();
  },

  getTasksByCaseId: (caseId: string): InvestigationTask[] => {
    return InvestigationTaskRepository.findByCaseId(caseId);
  },

  getTaskById: (id: string): InvestigationTask | null => {
    return InvestigationTaskRepository.findById(id);
  },

  getTasksByStatus: (caseId: string, status: InvestigationTaskStatus): InvestigationTask[] => {
    return InvestigationTaskRepository.findByStatus(caseId, status);
  },

  getOverdueTasks: (caseId: string): InvestigationTask[] => {
    return InvestigationTaskRepository.findOverdue(caseId);
  },

  getTasksByAssignee: (assigneeId: string): InvestigationTask[] => {
    return InvestigationTaskRepository.findByAssigneeId(assigneeId);
  },

  createTask: (dto: CreateInvestigationTaskDto): InvestigationTask => {
    const collaborator = CollaboratorRepository.findById(dto.createdBy);
    const createdByName = collaborator?.name ?? '';
    const assigneeName = resolveAssigneeName(dto.assigneeId);
    const task = InvestigationTaskRepository.create(dto, assigneeName ?? undefined, createdByName);

    recordAuditLog(dto.caseId, 'create_investigation_task', 'case', task.id, `创建侦查任务: ${task.title}`, dto.createdBy);
    return InvestigationTaskRepository.findById(task.id)!;
  },

  updateTask: (id: string, dto: UpdateInvestigationTaskDto, collaboratorId: string): InvestigationTask | null => {
    const existing = InvestigationTaskRepository.findById(id);
    if (!existing) return null;

    const assigneeName = resolveAssigneeName(dto.assigneeId);
    const updated = InvestigationTaskRepository.update(id, dto, assigneeName ?? undefined);
    if (!updated) return null;

    if (dto.status !== undefined && dto.status !== existing.status) {
      recordAuditLog(existing.caseId, 'update_investigation_task', 'case', id, `任务状态: ${existing.status} → ${dto.status}`, collaboratorId);
    }

    if (dto.assigneeId !== undefined && dto.assigneeId !== existing.assigneeId) {
      recordAuditLog(existing.caseId, 'assign_investigation_task', 'case', id, `分配给: ${assigneeName ?? dto.assigneeId}`, collaboratorId);
    }

    if (dto.status === 'completed') {
      recordAuditLog(existing.caseId, 'complete_investigation_task', 'case', id, `完成任务: ${existing.title}`, collaboratorId);
    }

    return updated;
  },

  assignTask: (id: string, assigneeId: string, collaboratorId: string): InvestigationTask | null => {
    const existing = InvestigationTaskRepository.findById(id);
    if (!existing) return null;

    const assigneeName = resolveAssigneeName(assigneeId);
    const updated = InvestigationTaskRepository.update(id, { assigneeId }, assigneeName ?? undefined);
    if (!updated) return null;

    recordAuditLog(existing.caseId, 'assign_investigation_task', 'case', id, `分配给: ${assigneeName ?? assigneeId}`, collaboratorId);
    return updated;
  },

  linkEvidence: (id: string, evidenceId: string, collaboratorId: string): InvestigationTask | null => {
    const existing = InvestigationTaskRepository.findById(id);
    if (!existing) return null;

    if (existing.evidenceIds.includes(evidenceId)) return existing;

    const updatedIds = [...existing.evidenceIds, evidenceId];
    const updated = InvestigationTaskRepository.update(id, { evidenceIds: updatedIds });
    if (!updated) return null;

    recordAuditLog(existing.caseId, 'link_evidence_to_task', 'case', id, `关联证据: ${evidenceId}`, collaboratorId);
    return updated;
  },

  unlinkEvidence: (id: string, evidenceId: string, collaboratorId: string): InvestigationTask | null => {
    const existing = InvestigationTaskRepository.findById(id);
    if (!existing) return null;

    const updatedIds = existing.evidenceIds.filter((eid) => eid !== evidenceId);
    const updated = InvestigationTaskRepository.update(id, { evidenceIds: updatedIds });
    if (!updated) return null;

    recordAuditLog(existing.caseId, 'link_evidence_to_task', 'case', id, `取消关联证据: ${evidenceId}`, collaboratorId);
    return updated;
  },

  linkCollectionItem: (id: string, collectionItemId: string, collaboratorId: string): InvestigationTask | null => {
    const existing = InvestigationTaskRepository.findById(id);
    if (!existing) return null;

    if (existing.collectionItemIds.includes(collectionItemId)) return existing;

    const updatedIds = [...existing.collectionItemIds, collectionItemId];
    const updated = InvestigationTaskRepository.update(id, { collectionItemIds: updatedIds });
    if (!updated) return null;

    const collectionItem = EvidenceCollectionRepository.findById(collectionItemId);
    recordAuditLog(existing.caseId, 'link_collection_to_task', 'case', id, `关联采集项: ${collectionItem?.content.slice(0, 30) ?? collectionItemId}`, collaboratorId);
    return updated;
  },

  unlinkCollectionItem: (id: string, collectionItemId: string, collaboratorId: string): InvestigationTask | null => {
    const existing = InvestigationTaskRepository.findById(id);
    if (!existing) return null;

    const updatedIds = existing.collectionItemIds.filter((cid) => cid !== collectionItemId);
    const updated = InvestigationTaskRepository.update(id, { collectionItemIds: updatedIds });
    if (!updated) return null;

    recordAuditLog(existing.caseId, 'link_collection_to_task', 'case', id, `取消关联采集项: ${collectionItemId}`, collaboratorId);
    return updated;
  },

  linkConnection: (id: string, connectionId: string, collaboratorId: string): InvestigationTask | null => {
    const existing = InvestigationTaskRepository.findById(id);
    if (!existing) return null;

    if (existing.connectionIds.includes(connectionId)) return existing;

    const updatedIds = [...existing.connectionIds, connectionId];
    const updated = InvestigationTaskRepository.update(id, { connectionIds: updatedIds });
    if (!updated) return null;

    recordAuditLog(existing.caseId, 'link_connection_to_task', 'case', id, `关联关系线: ${connectionId}`, collaboratorId);
    return updated;
  },

  unlinkConnection: (id: string, connectionId: string, collaboratorId: string): InvestigationTask | null => {
    const existing = InvestigationTaskRepository.findById(id);
    if (!existing) return null;

    const updatedIds = existing.connectionIds.filter((cid) => cid !== connectionId);
    const updated = InvestigationTaskRepository.update(id, { connectionIds: updatedIds });
    if (!updated) return null;

    recordAuditLog(existing.caseId, 'link_connection_to_task', 'case', id, `取消关联关系线: ${connectionId}`, collaboratorId);
    return updated;
  },

  onCollectionArchived: (collectionItemId: string, evidenceId: string): InvestigationTask[] => {
    const affectedTasks = InvestigationTaskRepository.findByCollectionItemId(collectionItemId);
    const updatedTasks: InvestigationTask[] = [];

    for (const task of affectedTasks) {
      if (task.status === 'completed' || task.status === 'cancelled') continue;

      const evidencePatch: UpdateInvestigationTaskDto = {};
      if (!task.evidenceIds.includes(evidenceId)) {
        evidencePatch.evidenceIds = [...task.evidenceIds, evidenceId];
      }

      const { patch, auditEntries } = computeSyncPatch(
        task,
        'collection_archived',
        collectionItemId,
        '采集项归档',
        [],
        evidencePatch,
      );

      const updated = InvestigationTaskRepository.update(task.id, patch);
      if (updated) {
        for (const entry of auditEntries) {
          recordAuditLog(task.caseId, entry.action, 'case', task.id, entry.detail, 'system');
        }
        updatedTasks.push(updated);
      }
    }

    return updatedTasks;
  },

  onConnectionUpdated: (connectionId: string, changes: SyncSourceChange[]): InvestigationTask[] => {
    const affectedTasks = InvestigationTaskRepository.findByConnectionId(connectionId);
    const updatedTasks: InvestigationTask[] = [];
    const changeDetail = changes.map((c) => `${c.field}: ${c.oldValue} → ${c.newValue}`).join(', ');

    for (const task of affectedTasks) {
      if (task.status === 'completed' || task.status === 'cancelled') continue;

      const { patch, auditEntries } = computeSyncPatch(
        task,
        'connection_updated',
        connectionId,
        `关联关系线变更: ${changeDetail}`,
        changes,
      );

      const updated = InvestigationTaskRepository.update(task.id, patch);
      if (updated) {
        for (const entry of auditEntries) {
          recordAuditLog(task.caseId, entry.action, 'case', task.id, entry.detail, 'system');
        }
        updatedTasks.push(updated);
      }
    }

    return updatedTasks;
  },

  onEvidenceUpdated: (evidenceId: string, changes: SyncSourceChange[]): InvestigationTask[] => {
    const affectedTasks = InvestigationTaskRepository.findByEvidenceId(evidenceId);
    const updatedTasks: InvestigationTask[] = [];
    const changeDetail = changes.map((c) => `${c.field}: ${c.oldValue} → ${c.newValue}`).join(', ');

    for (const task of affectedTasks) {
      if (task.status === 'completed' || task.status === 'cancelled') continue;

      const { patch, auditEntries } = computeSyncPatch(
        task,
        'evidence_updated',
        evidenceId,
        `关联证据变更: ${changeDetail}`,
        changes,
      );

      const updated = InvestigationTaskRepository.update(task.id, patch);
      if (updated) {
        for (const entry of auditEntries) {
          recordAuditLog(task.caseId, entry.action, 'case', task.id, entry.detail, 'system');
        }
        updatedTasks.push(updated);
      }
    }

    return updatedTasks;
  },

  clearSyncNotes: (id: string, collaboratorId: string): InvestigationTask | null => {
    const existing = InvestigationTaskRepository.findById(id);
    if (!existing) return null;

    const updated = InvestigationTaskRepository.update(id, { syncNotes: [] });
    if (updated && existing.syncNotes.length > 0) {
      recordAuditLog(existing.caseId, 'update_investigation_task', 'case', id, `已确认${existing.syncNotes.length}条同步通知`, collaboratorId);
    }
    return updated;
  },

  deleteTask: (id: string, collaboratorId: string): boolean => {
    const existing = InvestigationTaskRepository.findById(id);
    if (!existing) return false;

    const deleted = InvestigationTaskRepository.delete(id);
    if (deleted) {
      recordAuditLog(existing.caseId, 'update_investigation_task', 'case', id, `删除任务: ${existing.title}`, collaboratorId);
    }
    return deleted;
  },
};
