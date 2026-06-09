import { AuditLogRepository } from '../repositories/AuditLogRepository.js';
import { CollaboratorRepository } from '../repositories/CollaboratorRepository.js';
import { EvidenceRepository } from '../repositories/EvidenceRepository.js';
import { ConnectionRepository } from '../repositories/ConnectionRepository.js';
import type { AuditLog, CreateAuditLogDto, TimelineEntry, Evidence, Connection, UpdateEvidenceDto, CreateEvidenceDto, CreateConnectionDto } from '@shared/types';

interface RestoreResult {
  evidence?: Evidence;
  connection?: Connection;
  recreated?: boolean;
}

export const AuditLogService = {
  getAllAuditLogs: (): AuditLog[] => {
    return AuditLogRepository.findAll();
  },

  getAuditLogById: (id: string): AuditLog | null => {
    return AuditLogRepository.findById(id);
  },

  getAuditLogsByCaseId: (caseId: string): AuditLog[] => {
    return AuditLogRepository.findByCaseId(caseId);
  },

  getAuditLogsByCollaboratorId: (collaboratorId: string): AuditLog[] => {
    return AuditLogRepository.findByCollaboratorId(collaboratorId);
  },

  createAuditLog: (dto: CreateAuditLogDto): AuditLog => {
    const collaborator = CollaboratorRepository.findById(dto.collaboratorId);
    const collabName = collaborator?.name ?? '';
    return AuditLogRepository.create(dto, collabName);
  },

  getTimelineByCaseId: (caseId: string): TimelineEntry[] => {
    const entries: TimelineEntry[] = [];

    const evidence = EvidenceRepository.findByCaseId(caseId);
    for (const ev of evidence) {
      if (ev.timestamp) {
        entries.push({
          id: `ev-tl-${ev.id}`,
          type: 'evidence',
          timestamp: ev.timestamp,
          title: ev.content.slice(0, 40) + (ev.content.length > 40 ? '...' : ''),
          description: `来源: ${ev.source || '未知'}`,
          color: ev.color,
          referenceId: ev.id,
        });
      }
    }

    const connections = ConnectionRepository.findByCaseId(caseId);
    for (const conn of connections) {
      entries.push({
        id: `conn-tl-${conn.id}`,
        type: 'connection',
        timestamp: conn.createdAt,
        title: conn.label || '关系连线',
        description: '证据关联',
        color: conn.color,
        referenceId: conn.id,
      });
    }

    const logs = AuditLogRepository.findByCaseId(caseId);
    for (const log of logs) {
      entries.push({
        id: `log-tl-${log.id}`,
        type: 'audit',
        timestamp: log.createdAt,
        title: log.detail,
        description: `操作人: ${log.collaboratorName}`,
        color: '#9945ff',
        referenceId: log.id,
        collaboratorName: log.collaboratorName,
      });
    }

    entries.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    return entries;
  },

  restoreFromSnapshot: (auditLogId: string): RestoreResult => {
    const log = AuditLogRepository.findById(auditLogId);
    if (!log || !log.snapshot) {
      throw new Error('审计日志不存在或无快照数据');
    }

    let snapshot: Record<string, unknown>;
    try {
      snapshot = JSON.parse(log.snapshot) as Record<string, unknown>;
    } catch {
      throw new Error('快照数据格式错误');
    }

    const result: RestoreResult = {};

    if (log.targetType === 'evidence') {
      const existing = EvidenceRepository.findById(log.targetId);

      if (existing) {
        const dto: UpdateEvidenceDto = {};
        if (snapshot.content !== undefined) dto.content = snapshot.content as string;
        if (snapshot.source !== undefined) dto.source = snapshot.source as string;
        if (snapshot.importance !== undefined) dto.importance = snapshot.importance as Evidence['importance'];
        if (snapshot.tags !== undefined) dto.tags = snapshot.tags as string[];
        if (snapshot.positionX !== undefined) dto.positionX = snapshot.positionX as number;
        if (snapshot.positionY !== undefined) dto.positionY = snapshot.positionY as number;
        if (snapshot.width !== undefined) dto.width = snapshot.width as number;
        if (snapshot.height !== undefined) dto.height = snapshot.height as number;
        if (snapshot.color !== undefined) dto.color = snapshot.color as string;
        if (snapshot.timestamp !== undefined) dto.timestamp = snapshot.timestamp as string;
        if (snapshot.assignedTo !== undefined) dto.assignedTo = snapshot.assignedTo as string | null;
        if (snapshot.status !== undefined) dto.status = snapshot.status as Evidence['status'];

        const updated = EvidenceRepository.update(log.targetId, dto);
        result.evidence = updated ?? undefined;
      } else {
        const caseId = (snapshot.caseId as string) || log.caseId;
        const createDto: CreateEvidenceDto = {
          caseId,
          content: (snapshot.content as string) || '已恢复证据',
          source: (snapshot.source as string) || '快照恢复',
          importance: (snapshot.importance as Evidence['importance']) || 'normal',
          tags: (snapshot.tags as string[]) || [],
          positionX: (snapshot.positionX as number) ?? 100,
          positionY: (snapshot.positionY as number) ?? 100,
          width: (snapshot.width as number) ?? 200,
          height: (snapshot.height as number) ?? 120,
          color: (snapshot.color as string) || '#3b82f6',
          timestamp: (snapshot.timestamp as string) || '',
          assignedTo: (snapshot.assignedTo as string | null) ?? null,
          status: (snapshot.status as Evidence['status']) || 'pending',
        };

        const recreated = EvidenceRepository.createWithId(log.targetId, createDto);
        result.evidence = recreated;
        result.recreated = true;
      }
    } else if (log.targetType === 'connection') {
      const existing = ConnectionRepository.findById(log.targetId);

      if (existing) {
        const dto: Partial<Pick<Connection, 'label' | 'color' | 'lineStyle'>> = {};
        if (snapshot.label !== undefined) dto.label = snapshot.label as string;
        if (snapshot.color !== undefined) dto.color = snapshot.color as string;
        if (snapshot.lineStyle !== undefined) dto.lineStyle = snapshot.lineStyle as Connection['lineStyle'];

        const updated = ConnectionRepository.update(log.targetId, dto);
        result.connection = updated ?? undefined;
      } else {
        const caseId = (snapshot.caseId as string) || log.caseId;
        const fromEvidenceId = snapshot.fromEvidenceId as string | undefined;
        const toEvidenceId = snapshot.toEvidenceId as string | undefined;

        if (!fromEvidenceId || !toEvidenceId) {
          throw new Error('快照缺少关联端点信息，无法重建已删除关联');
        }

        const fromExists = EvidenceRepository.findById(fromEvidenceId);
        const toExists = EvidenceRepository.findById(toEvidenceId);
        if (!fromExists || !toExists) {
          throw new Error('关联端点证据不存在，无法重建已删除关联');
        }

        const createDto: CreateConnectionDto = {
          caseId,
          fromEvidenceId,
          toEvidenceId,
          label: (snapshot.label as string) || '',
          color: (snapshot.color as string) || '#6b7280',
          lineStyle: (snapshot.lineStyle as Connection['lineStyle']) || 'solid',
        };

        const recreated = ConnectionRepository.createWithId(log.targetId, createDto);
        result.connection = recreated;
        result.recreated = true;
      }
    }

    return result;
  },
};
