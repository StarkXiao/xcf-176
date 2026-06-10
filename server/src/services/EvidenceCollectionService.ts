import crypto from 'crypto';
import { EvidenceCollectionRepository } from '../repositories/EvidenceCollectionRepository.js';
import { EvidenceRepository } from '../repositories/EvidenceRepository.js';
import { AuditLogRepository } from '../repositories/AuditLogRepository.js';
import { CollaboratorRepository } from '../repositories/CollaboratorRepository.js';
import { InvestigationTaskService } from './InvestigationTaskService.js';
import type {
  EvidenceCollectionItem,
  CreateCollectionItemDto,
  VerificationStatus,
  EvidenceSourceType,
  CreateAuditLogDto,
} from '@shared/types';

function computeContentHash(content: string, sourceType: EvidenceSourceType, extra?: string): string {
  const raw = `${sourceType}:${content}${extra ? ':' + extra : ''}`;
  return crypto.createHash('sha256').update(raw).digest('hex').slice(0, 32);
}

function verifySource(dto: CreateCollectionItemDto): { valid: boolean; reason?: string } {
  switch (dto.sourceType) {
    case 'webpage_screenshot':
      if (!dto.sourceUrl) return { valid: false, reason: '网页截图必须提供来源URL' };
      try {
        new URL(dto.sourceUrl);
      } catch {
        return { valid: false, reason: '来源URL格式无效' };
      }
      if (!dto.screenshotDataUrl) return { valid: false, reason: '网页截图必须包含截图数据' };
      return { valid: true };
    case 'file_upload':
      if (!dto.fileName) return { valid: false, reason: '文件上传必须提供文件名' };
      if (!dto.fileSize || dto.fileSize <= 0) return { valid: false, reason: '文件大小无效' };
      if (!dto.fileType) return { valid: false, reason: '文件类型未识别' };
      return { valid: true };
    case 'manual_entry':
      if (!dto.content || dto.content.trim().length === 0) return { valid: false, reason: '手工录入内容不能为空' };
      return { valid: true };
    default:
      return { valid: false, reason: '未知来源类型' };
  }
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

export const EvidenceCollectionService = {
  getByCaseId: (caseId: string): EvidenceCollectionItem[] => {
    return EvidenceCollectionRepository.findByCaseId(caseId);
  },

  getById: (id: string): EvidenceCollectionItem | null => {
    return EvidenceCollectionRepository.findById(id);
  },

  collect: (dto: CreateCollectionItemDto, collaboratorId: string): { item: EvidenceCollectionItem; isDuplicate: boolean } => {
    const verification = verifySource(dto);
    if (!verification.valid) {
      throw new Error(verification.reason || '来源校验失败');
    }

    const extra = dto.sourceUrl || dto.fileName || '';
    const contentHash = computeContentHash(dto.content, dto.sourceType, extra);

    const existing = EvidenceCollectionRepository.findByContentHash(dto.caseId, contentHash);
    if (existing) {
      const item = EvidenceCollectionRepository.create(
        { ...dto, contentHash },
        'duplicate' as VerificationStatus,
        existing.id
      );
      recordAuditLog(dto.caseId, 'create_evidence', 'evidence', item.id, `采集证据(重复): ${dto.content.slice(0, 30)}`, collaboratorId);
      return { item, isDuplicate: true };
    }

    const item = EvidenceCollectionRepository.create(
      { ...dto, contentHash },
      'verified' as VerificationStatus
    );
    recordAuditLog(dto.caseId, 'create_evidence', 'evidence', item.id, `采集证据(${dto.sourceType}): ${dto.content.slice(0, 30)}`, collaboratorId);
    return { item, isDuplicate: false };
  },

  verify: (id: string, collaboratorId: string): EvidenceCollectionItem => {
    const item = EvidenceCollectionRepository.findById(id);
    if (!item) throw new Error('采集项不存在');

    if (item.verificationStatus === 'duplicate') {
      throw new Error('重复证据无法校验');
    }
    if (item.archivedAt) {
      throw new Error('已归档证据无法校验');
    }

    const updated = EvidenceCollectionRepository.updateVerificationStatus(id, 'verified');
    recordAuditLog(item.caseId, 'update_evidence', 'evidence', id, `校验通过: ${item.content.slice(0, 30)}`, collaboratorId);
    return updated!;
  },

  archive: (id: string, collaboratorId: string): EvidenceCollectionItem => {
    const item = EvidenceCollectionRepository.findById(id);
    if (!item) throw new Error('采集项不存在');
    if (item.verificationStatus === 'duplicate') throw new Error('重复证据不能归档');
    if (item.verificationStatus !== 'verified') throw new Error('证据未通过校验，不能归档');
    if (item.archivedAt) throw new Error('证据已归档');

    const evidenceDto = {
      caseId: item.caseId,
      content: item.content,
      source: `${item.sourceType}${item.sourceUrl ? ': ' + item.sourceUrl : ''}${item.fileName ? ': ' + item.fileName : ''}`,
      importance: item.importance,
      tags: item.tags,
      positionX: 100 + Math.random() * 400,
      positionY: 100 + Math.random() * 400,
    };

    const createdEvidence = EvidenceRepository.create(evidenceDto);

    const updated = EvidenceCollectionRepository.markArchived(id, createdEvidence.id);

    recordAuditLog(item.caseId, 'create_evidence', 'evidence', createdEvidence.id, `归档证据: ${item.content.slice(0, 30)}`, collaboratorId);

    InvestigationTaskService.onCollectionArchived(id, createdEvidence.id);

    return updated!;
  },

  bulkArchive: (ids: string[], collaboratorId: string): EvidenceCollectionItem[] => {
    const results: EvidenceCollectionItem[] = [];
    for (const id of ids) {
      try {
        const archived = EvidenceCollectionService.archive(id, collaboratorId);
        results.push(archived);
      } catch {
        continue;
      }
    }
    return results;
  },

  delete: (id: string, collaboratorId: string): boolean => {
    const item = EvidenceCollectionRepository.findById(id);
    if (!item) return false;
    const deleted = EvidenceCollectionRepository.delete(id);
    if (deleted) {
      recordAuditLog(item.caseId, 'delete_evidence', 'evidence', id, `删除采集项: ${item.content.slice(0, 30)}`, collaboratorId);
    }
    return deleted;
  },
};
