import { describe, it, expect, beforeEach, vi } from 'vitest';
import { getTestDb, resetTestDb, seedTestCase, seedTestCollaborators } from './helpers/testDb.js';

vi.mock('../database/index.js', () => ({
  get default() { return getTestDb(); },
}));

import { EvidenceCollectionService } from '../services/EvidenceCollectionService.js';
import { EvidenceCollectionRepository } from '../repositories/EvidenceCollectionRepository.js';
import { AuditLogRepository } from '../repositories/AuditLogRepository.js';
import { EvidenceRepository } from '../repositories/EvidenceRepository.js';

const CASE_ID = 'test-case-001';
const COL_A_ID = 'test-col-001';
const COL_A_NAME = '操作员A';
const COL_B_ID = 'test-col-002';
const COL_B_NAME = '审核员B';

function seedCase() {
  const db = getTestDb();
  seedTestCase(db, CASE_ID, '测试案件', '自动化测试案件');
  seedTestCollaborators(db, CASE_ID, [
    { id: COL_A_ID, name: COL_A_NAME, role: 'operator', color: '#00f0ff' },
    { id: COL_B_ID, name: COL_B_NAME, role: 'reviewer', color: '#9945ff' },
  ]);
}

function getAuditLogsByAction(action: string) {
  return AuditLogRepository.findByCaseId(CASE_ID).filter((l) => l.action === action);
}

function getAllAuditLogs() {
  return AuditLogRepository.findByCaseId(CASE_ID);
}

beforeEach(() => {
  resetTestDb();
  seedCase();
});

describe('EvidenceCollectionService - 采集', () => {
  it('手工录入：正常采集应创建已校验项并写审计', () => {
    const result = EvidenceCollectionService.collect(
      { caseId: CASE_ID, sourceType: 'manual_entry', content: '手工录入证据', importance: 'high', tags: ['标签A'] },
      COL_A_ID
    );
    expect(result.isDuplicate).toBe(false);
    expect(result.item.verificationStatus).toBe('verified');
    expect(result.item.content).toBe('手工录入证据');
    expect(result.item.sourceType).toBe('manual_entry');
    expect(result.item.importance).toBe('high');
    const logs = getAuditLogsByAction('create_evidence');
    expect(logs).toHaveLength(1);
    expect(logs[0].collaboratorId).toBe(COL_A_ID);
    expect(logs[0].collaboratorName).toBe(COL_A_NAME);
    expect(logs[0].targetId).toBe(result.item.id);
  });

  it('网页截图：缺少sourceUrl应抛出校验错误', () => {
    expect(() =>
      EvidenceCollectionService.collect({ caseId: CASE_ID, sourceType: 'webpage_screenshot', content: '截图' }, COL_A_ID)
    ).toThrow('网页截图必须提供来源URL');
  });

  it('网页截图：URL格式无效应抛出校验错误', () => {
    expect(() =>
      EvidenceCollectionService.collect({ caseId: CASE_ID, sourceType: 'webpage_screenshot', content: '截图', sourceUrl: 'not-a-url', screenshotDataUrl: 'data:image/png;base64,abc' }, COL_A_ID)
    ).toThrow('来源URL格式无效');
  });

  it('文件上传：缺少文件名应抛出校验错误', () => {
    expect(() =>
      EvidenceCollectionService.collect({ caseId: CASE_ID, sourceType: 'file_upload', content: '文件', fileSize: 1024, fileType: 'application/pdf' }, COL_A_ID)
    ).toThrow('文件上传必须提供文件名');
  });

  it('文件上传：文件大小无效应抛出校验错误', () => {
    expect(() =>
      EvidenceCollectionService.collect({ caseId: CASE_ID, sourceType: 'file_upload', content: '文件', fileName: 'test.pdf', fileSize: 0, fileType: 'application/pdf' }, COL_A_ID)
    ).toThrow('文件大小无效');
  });

  it('手工录入：内容为空应抛出校验错误', () => {
    expect(() =>
      EvidenceCollectionService.collect({ caseId: CASE_ID, sourceType: 'manual_entry', content: '   ' }, COL_A_ID)
    ).toThrow('手工录入内容不能为空');
  });
});

describe('EvidenceCollectionService - 去重', () => {
  it('相同内容+来源重复采集应标记为duplicate', () => {
    const first = EvidenceCollectionService.collect({ caseId: CASE_ID, sourceType: 'manual_entry', content: '重复测试' }, COL_A_ID);
    const second = EvidenceCollectionService.collect({ caseId: CASE_ID, sourceType: 'manual_entry', content: '重复测试' }, COL_A_ID);
    expect(first.isDuplicate).toBe(false);
    expect(second.isDuplicate).toBe(true);
    expect(second.item.verificationStatus).toBe('duplicate');
    expect(second.item.duplicateOf).toBe(first.item.id);
  });

  it('不同来源类型但相同内容不算重复', () => {
    EvidenceCollectionService.collect({ caseId: CASE_ID, sourceType: 'manual_entry', content: '跨来源' }, COL_A_ID);
    const fileResult = EvidenceCollectionService.collect({ caseId: CASE_ID, sourceType: 'file_upload', content: '跨来源', fileName: 'test.pdf', fileSize: 1024, fileType: 'application/pdf' }, COL_A_ID);
    expect(fileResult.isDuplicate).toBe(false);
  });

  it('不同案件相同内容不算重复', () => {
    seedTestCase(getTestDb(), 'case-002', '第二个案件');
    EvidenceCollectionService.collect({ caseId: CASE_ID, sourceType: 'manual_entry', content: '跨案件' }, COL_A_ID);
    const other = EvidenceCollectionService.collect({ caseId: 'case-002', sourceType: 'manual_entry', content: '跨案件' }, COL_A_ID);
    expect(other.isDuplicate).toBe(false);
  });

  it('重复采集应写审计并标记为重复', () => {
    const first = EvidenceCollectionService.collect({ caseId: CASE_ID, sourceType: 'manual_entry', content: '审计去重' }, COL_A_ID);
    const second = EvidenceCollectionService.collect({ caseId: CASE_ID, sourceType: 'manual_entry', content: '审计去重' }, COL_B_ID);
    const logs = getAuditLogsByAction('create_evidence');
    expect(logs).toHaveLength(2);
    const dupLog = logs.find((l) => l.targetId === second.item.id);
    expect(dupLog!.collaboratorId).toBe(COL_B_ID);
    expect(dupLog!.detail).toContain('重复');
  });
});

describe('EvidenceCollectionService - 校验', () => {
  it('校验通过应更新状态为verified并写审计', () => {
    const { item } = EvidenceCollectionService.collect({ caseId: CASE_ID, sourceType: 'manual_entry', content: '校验测试' }, COL_A_ID);
    const verified = EvidenceCollectionService.verify(item.id, COL_B_ID);
    expect(verified.verificationStatus).toBe('verified');
    const logs = getAuditLogsByAction('update_evidence');
    expect(logs).toHaveLength(1);
    expect(logs[0].collaboratorId).toBe(COL_B_ID);
    expect(logs[0].collaboratorName).toBe(COL_B_NAME);
  });

  it('重复证据不能校验', () => {
    EvidenceCollectionService.collect({ caseId: CASE_ID, sourceType: 'manual_entry', content: '重复校验' }, COL_A_ID);
    const { item: dupItem } = EvidenceCollectionService.collect({ caseId: CASE_ID, sourceType: 'manual_entry', content: '重复校验' }, COL_A_ID);
    expect(() => EvidenceCollectionService.verify(dupItem.id, COL_A_ID)).toThrow('重复证据无法校验');
  });

  it('已归档证据不能校验', () => {
    const { item } = EvidenceCollectionService.collect({ caseId: CASE_ID, sourceType: 'manual_entry', content: '归档后校验' }, COL_A_ID);
    EvidenceCollectionService.archive(item.id, COL_A_ID);
    expect(() => EvidenceCollectionService.verify(item.id, COL_A_ID)).toThrow('已归档证据无法校验');
  });
});

describe('EvidenceCollectionService - 归档', () => {
  it('归档应创建Evidence记录并写审计', () => {
    const { item } = EvidenceCollectionService.collect({ caseId: CASE_ID, sourceType: 'manual_entry', content: '归档测试', importance: 'critical', tags: ['重要'] }, COL_A_ID);
    const archived = EvidenceCollectionService.archive(item.id, COL_B_ID);
    expect(archived.archivedAt).toBeTruthy();
    expect(archived.archivedEvidenceId).toBeTruthy();
    const ev = EvidenceRepository.findById(archived.archivedEvidenceId!);
    expect(ev).not.toBeNull();
    expect(ev!.content).toBe('归档测试');
    expect(ev!.importance).toBe('critical');
    const logs = getAuditLogsByAction('create_evidence');
    const archiveLog = logs.find((l) => l.detail.includes('归档证据'));
    expect(archiveLog).toBeDefined();
    expect(archiveLog!.collaboratorId).toBe(COL_B_ID);
  });

  it('未校验证据不能归档', () => {
    getTestDb().prepare("INSERT INTO evidence_collection (id, case_id, source_type, content, content_hash, verification_status, collected_at) VALUES (?, ?, ?, ?, ?, ?, ?)")
      .run('ec-pending', CASE_ID, 'manual_entry', '待校验', 'hash-pending', 'pending', new Date().toISOString());
    expect(() => EvidenceCollectionService.archive('ec-pending', COL_A_ID)).toThrow('证据未通过校验，不能归档');
  });

  it('重复证据不能归档', () => {
    EvidenceCollectionService.collect({ caseId: CASE_ID, sourceType: 'manual_entry', content: '重复归档' }, COL_A_ID);
    const { item: dupItem } = EvidenceCollectionService.collect({ caseId: CASE_ID, sourceType: 'manual_entry', content: '重复归档' }, COL_A_ID);
    expect(() => EvidenceCollectionService.archive(dupItem.id, COL_A_ID)).toThrow('重复证据不能归档');
  });

  it('已归档证据不能重复归档', () => {
    const { item } = EvidenceCollectionService.collect({ caseId: CASE_ID, sourceType: 'manual_entry', content: '重复归档2' }, COL_A_ID);
    EvidenceCollectionService.archive(item.id, COL_A_ID);
    expect(() => EvidenceCollectionService.archive(item.id, COL_A_ID)).toThrow('证据已归档');
  });

  it('归档操作应只产生1条审计记录（不重复）', () => {
    const { item } = EvidenceCollectionService.collect({ caseId: CASE_ID, sourceType: 'manual_entry', content: '审计去重验证' }, COL_A_ID);
    EvidenceCollectionService.archive(item.id, COL_A_ID);
    const archiveLogs = getAllAuditLogs().filter((l) => l.detail.includes('归档证据'));
    expect(archiveLogs).toHaveLength(1);
  });
});

describe('EvidenceCollectionService - 批量归档', () => {
  it('应批量归档所有已校验项', () => {
    const item1 = EvidenceCollectionService.collect({ caseId: CASE_ID, sourceType: 'manual_entry', content: '批量1' }, COL_A_ID);
    const item2 = EvidenceCollectionService.collect({ caseId: CASE_ID, sourceType: 'manual_entry', content: '批量2' }, COL_A_ID);
    const results = EvidenceCollectionService.bulkArchive([item1.item.id, item2.item.id], COL_A_ID);
    expect(results).toHaveLength(2);
    results.forEach((r) => { expect(r.archivedAt).toBeTruthy(); expect(r.archivedEvidenceId).toBeTruthy(); });
  });

  it('批量归档中混入无效ID应跳过而不中断', () => {
    const { item } = EvidenceCollectionService.collect({ caseId: CASE_ID, sourceType: 'manual_entry', content: '批量含无效' }, COL_A_ID);
    const results = EvidenceCollectionService.bulkArchive([item.id, 'non-existent-id'], COL_A_ID);
    expect(results).toHaveLength(1);
    expect(results[0].id).toBe(item.id);
  });
});

describe('EvidenceCollectionService - 删除', () => {
  it('删除已存在项应返回true并写审计', () => {
    const { item } = EvidenceCollectionService.collect({ caseId: CASE_ID, sourceType: 'manual_entry', content: '删除测试' }, COL_A_ID);
    const deleted = EvidenceCollectionService.delete(item.id, COL_B_ID);
    expect(deleted).toBe(true);
    const logs = getAuditLogsByAction('delete_evidence');
    expect(logs).toHaveLength(1);
    expect(logs[0].collaboratorId).toBe(COL_B_ID);
  });

  it('删除不存在的项应返回false且不写审计', () => {
    expect(EvidenceCollectionService.delete('non-existent-id', COL_A_ID)).toBe(false);
    expect(getAuditLogsByAction('delete_evidence')).toHaveLength(0);
  });
});

describe('EvidenceCollectionService - 审计归属校验', () => {
  it('不同操作人采集应正确记录归属', () => {
    const resultA = EvidenceCollectionService.collect({ caseId: CASE_ID, sourceType: 'manual_entry', content: 'A采集' }, COL_A_ID);
    const resultB = EvidenceCollectionService.collect({ caseId: CASE_ID, sourceType: 'manual_entry', content: 'B采集' }, COL_B_ID);
    const logs = getAuditLogsByAction('create_evidence');
    expect(logs).toHaveLength(2);
    expect(logs.find((l) => l.targetId === resultA.item.id)!.collaboratorId).toBe(COL_A_ID);
    expect(logs.find((l) => l.targetId === resultB.item.id)!.collaboratorId).toBe(COL_B_ID);
  });

  it('系统操作人（无collaborator记录）应标记为系统', () => {
    EvidenceCollectionService.collect({ caseId: CASE_ID, sourceType: 'manual_entry', content: '系统操作人' }, 'unknown-user');
    const logs = getAuditLogsByAction('create_evidence');
    expect(logs).toHaveLength(1);
    expect(logs[0].collaboratorName).toBe('系统');
  });

  it('完整生命周期应产生2条审计: 采集+归档', () => {
    const { item } = EvidenceCollectionService.collect({ caseId: CASE_ID, sourceType: 'manual_entry', content: '生命周期' }, COL_A_ID);
    EvidenceCollectionService.archive(item.id, COL_A_ID);
    const logs = getAllAuditLogs();
    expect(logs.find((l) => l.detail.includes('采集证据'))).toBeDefined();
    expect(logs.find((l) => l.detail.includes('归档证据'))).toBeDefined();
  });
});

describe('EvidenceCollectionService - 网页截图全流程', () => {
  it('正常网页截图采集+归档', () => {
    const { item } = EvidenceCollectionService.collect({ caseId: CASE_ID, sourceType: 'webpage_screenshot', content: '截图内容', sourceUrl: 'https://example.com/page', screenshotDataUrl: 'data:image/png;base64,abc123', importance: 'high' }, COL_A_ID);
    expect(item.verificationStatus).toBe('verified');
    const archived = EvidenceCollectionService.archive(item.id, COL_A_ID);
    expect(archived.archivedAt).toBeTruthy();
    const ev = EvidenceRepository.findById(archived.archivedEvidenceId!);
    expect(ev!.source).toContain('webpage_screenshot');
    expect(ev!.source).toContain('https://example.com/page');
  });
});

describe('EvidenceCollectionService - 文件上传全流程', () => {
  it('正常文件上传采集+归档', () => {
    const { item } = EvidenceCollectionService.collect({ caseId: CASE_ID, sourceType: 'file_upload', content: '文件摘要', fileName: 'report.pdf', fileSize: 2048000, fileType: 'application/pdf', tags: ['报告'] }, COL_A_ID);
    expect(item.fileName).toBe('report.pdf');
    const archived = EvidenceCollectionService.archive(item.id, COL_B_ID);
    const ev = EvidenceRepository.findById(archived.archivedEvidenceId!);
    expect(ev!.source).toContain('report.pdf');
  });
});
