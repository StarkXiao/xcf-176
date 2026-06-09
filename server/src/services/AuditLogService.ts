import { AuditLogRepository } from '../repositories/AuditLogRepository.js';
import { CollaboratorRepository } from '../repositories/CollaboratorRepository.js';
import { EvidenceRepository } from '../repositories/EvidenceRepository.js';
import { ConnectionRepository } from '../repositories/ConnectionRepository.js';
import type { AuditLog, CreateAuditLogDto, TimelineEntry } from '@shared/types';

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
};
