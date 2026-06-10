import { InvestigationTaskRepository } from '../repositories/InvestigationTaskRepository.js';
import { CollaboratorRepository } from '../repositories/CollaboratorRepository.js';
import { AuditLogRepository } from '../repositories/AuditLogRepository.js';
import { EvidenceCollectionRepository } from '../repositories/EvidenceCollectionRepository.js';
import type {
  InvestigationTask,
  InvestigationTaskStatus,
  CreateInvestigationTaskDto,
  UpdateInvestigationTaskDto,
  CreateAuditLogDto,
} from '@shared/types';

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
