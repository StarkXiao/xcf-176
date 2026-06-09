import { describe, it, expect, beforeEach, vi } from 'vitest';
import { getTestDb, resetTestDb, seedTestCase, seedTestCollaborators } from './helpers/testDb.js';

vi.mock('../database/index.js', () => ({
  get default() { return getTestDb(); },
}));

import { EvidenceCollectionService } from '../services/EvidenceCollectionService.js';
import { EvidenceCollectionRepository } from '../repositories/EvidenceCollectionRepository.js';
import { AuditLogRepository } from '../repositories/AuditLogRepository.js';
import { EvidenceRepository } from '../repositories/EvidenceRepository.js';

const CASE_ID = 'reg-case-001';
const COL_A_ID = 'reg-col-001';
const COL_A_NAME = '回归操作员A';
const COL_B_ID = 'reg-col-002';
const COL_B_NAME = '回归审核员B';
const COL_C_ID = 'reg-col-003';
const COL_C_NAME = '回归管理员C';

function seedCase() {
  const db = getTestDb();
  seedTestCase(db, CASE_ID, '回归测试案件');
  seedTestCollaborators(db, CASE_ID, [
    { id: COL_A_ID, name: COL_A_NAME, role: 'operator', color: '#00f0ff' },
    { id: COL_B_ID, name: COL_B_NAME, role: 'reviewer', color: '#9945ff' },
    { id: COL_C_ID, name: COL_C_NAME, role: 'admin', color: '#ff4500' },
  ]);
}

function getAllAuditLogs() {
  return AuditLogRepository.findByCaseId(CASE_ID);
}

beforeEach(() => {
  resetTestDb();
  seedCase();
});

describe('回归 - 成员切换全生命周期', () => {
  it('三人接力: A采集 → B校验 → C归档，每步审计归属正确', () => {
    const { item } = EvidenceCollectionService.collect(
      {
        caseId: CASE_ID,
        sourceType: 'manual_entry',
        content: '三人接力生命周期',
        importance: 'high',
        tags: ['回归'],
      },
      COL_A_ID
    );

    expect(item.verificationStatus).toBe('verified');

    const verified = EvidenceCollectionService.verify(item.id, COL_B_ID);
    expect(verified.verificationStatus).toBe('verified');

    const archived = EvidenceCollectionService.archive(item.id, COL_C_ID);
    expect(archived.archivedAt).toBeTruthy();
    expect(archived.archivedEvidenceId).toBeTruthy();

    const evidence = EvidenceRepository.findById(archived.archivedEvidenceId!);
    expect(evidence).not.toBeNull();
    expect(evidence!.content).toBe('三人接力生命周期');

    const logs = getAllAuditLogs();
    expect(logs).toHaveLength(3);

    const collectLog = logs.find((l) => l.detail.includes('采集证据'));
    const verifyLog = logs.find((l) => l.action === 'update_evidence');
    const archiveLog = logs.find((l) => l.detail.includes('归档证据'));

    expect(collectLog!.collaboratorId).toBe(COL_A_ID);
    expect(collectLog!.collaboratorName).toBe(COL_A_NAME);
    expect(verifyLog!.collaboratorId).toBe(COL_B_ID);
    expect(verifyLog!.collaboratorName).toBe(COL_B_NAME);
    expect(archiveLog!.collaboratorId).toBe(COL_C_ID);
    expect(archiveLog!.collaboratorName).toBe(COL_C_NAME);
  });

  it('同一人全链路操作归属一致', () => {
    const { item } = EvidenceCollectionService.collect(
      {
        caseId: CASE_ID,
        sourceType: 'manual_entry',
        content: '单人全链路',
      },
      COL_A_ID
    );

    EvidenceCollectionService.verify(item.id, COL_A_ID);
    EvidenceCollectionService.archive(item.id, COL_A_ID);

    const logs = getAllAuditLogs();
    expect(logs).toHaveLength(3);
    logs.forEach((log) => {
      expect(log.collaboratorId).toBe(COL_A_ID);
      expect(log.collaboratorName).toBe(COL_A_NAME);
    });
  });

  it('成员切换后重复采集应记录最新操作人', () => {
    EvidenceCollectionService.collect(
      {
        caseId: CASE_ID,
        sourceType: 'manual_entry',
        content: '切换后重复采集',
      },
      COL_A_ID
    );

    const { item: dupItem } = EvidenceCollectionService.collect(
      {
        caseId: CASE_ID,
        sourceType: 'manual_entry',
        content: '切换后重复采集',
      },
      COL_B_ID
    );

    expect(dupItem.verificationStatus).toBe('duplicate');

    const logs = getAllAuditLogs();
    expect(logs).toHaveLength(2);

    const dupLog = logs.find((l) => l.targetId === dupItem.id);
    expect(dupLog!.collaboratorId).toBe(COL_B_ID);
    expect(dupLog!.collaboratorName).toBe(COL_B_NAME);
    expect(dupLog!.detail).toContain('重复');
  });
});

describe('回归 - 删除失败与状态一致性', () => {
  it('删除已归档项后Evidence记录仍存在', () => {
    const { item } = EvidenceCollectionService.collect(
      {
        caseId: CASE_ID,
        sourceType: 'manual_entry',
        content: '删除归档后验证',
      },
      COL_A_ID
    );

    const archived = EvidenceCollectionService.archive(item.id, COL_A_ID);
    const evidenceId = archived.archivedEvidenceId!;

    EvidenceCollectionService.delete(item.id, COL_A_ID);

    expect(EvidenceCollectionRepository.findById(item.id)).toBeNull();
    expect(EvidenceRepository.findById(evidenceId)).not.toBeNull();
  });

  it('删除pending状态项应成功但不产生Evidence记录', () => {
    getTestDb()
      .prepare(
        "INSERT INTO evidence_collection (id, case_id, source_type, content, content_hash, verification_status, collected_at) VALUES (?, ?, ?, ?, ?, ?, ?)"
      )
      .run('ec-pending-del', CASE_ID, 'manual_entry', '待校验删除', 'hash-pending-del', 'pending', new Date().toISOString());

    const deleted = EvidenceCollectionService.delete('ec-pending-del', COL_A_ID);
    expect(deleted).toBe(true);

    const logs = getAllAuditLogs();
    expect(logs).toHaveLength(1);
    expect(logs[0].action).toBe('delete_evidence');
  });

  it('删除不存在的ID不写审计', () => {
    const deleted = EvidenceCollectionService.delete('nonexistent-regression', COL_A_ID);
    expect(deleted).toBe(false);
    expect(getAllAuditLogs()).toHaveLength(0);
  });

  it('删除后再采集相同内容不算重复', () => {
    const { item } = EvidenceCollectionService.collect(
      {
        caseId: CASE_ID,
        sourceType: 'manual_entry',
        content: '删除后重采',
      },
      COL_A_ID
    );

    EvidenceCollectionService.delete(item.id, COL_A_ID);

    const reCollect = EvidenceCollectionService.collect(
      {
        caseId: CASE_ID,
        sourceType: 'manual_entry',
        content: '删除后重采',
      },
      COL_A_ID
    );

    expect(reCollect.isDuplicate).toBe(false);
    expect(reCollect.item.verificationStatus).toBe('verified');
  });
});

describe('回归 - 批量归档成员归属与部分失败', () => {
  it('批量归档中混入重复项应跳过，其余正常归档', () => {
    const item1 = EvidenceCollectionService.collect(
      {
        caseId: CASE_ID,
        sourceType: 'manual_entry',
        content: '批量含重复-正常1',
      },
      COL_A_ID
    );

    EvidenceCollectionService.collect(
      {
        caseId: CASE_ID,
        sourceType: 'manual_entry',
        content: '批量含重复-原始',
      },
      COL_A_ID
    );

    const dupItem = EvidenceCollectionService.collect(
      {
        caseId: CASE_ID,
        sourceType: 'manual_entry',
        content: '批量含重复-原始',
      },
      COL_A_ID
    );

    const results = EvidenceCollectionService.bulkArchive(
      [item1.item.id, dupItem.item.id],
      COL_B_ID
    );

    expect(results).toHaveLength(1);
    expect(results[0].id).toBe(item1.item.id);

    const logs = getAllAuditLogs();
    const archiveLogs = logs.filter((l) => l.detail.includes('归档证据'));
    expect(archiveLogs).toHaveLength(1);
    expect(archiveLogs[0]!.collaboratorId).toBe(COL_B_ID);
  });

  it('批量归档空数组应返回空结果', () => {
    const results = EvidenceCollectionService.bulkArchive([], COL_A_ID);
    expect(results).toHaveLength(0);
  });
});

describe('回归 - 审计记录单一可信不变式', () => {
  it('采集→归档生命周期仅产生2条审计（采集+归档），无冗余', () => {
    const { item } = EvidenceCollectionService.collect(
      {
        caseId: CASE_ID,
        sourceType: 'manual_entry',
        content: '审计不变式验证',
      },
      COL_A_ID
    );

    EvidenceCollectionService.archive(item.id, COL_A_ID);

    const logs = getAllAuditLogs();
    expect(logs).toHaveLength(2);

    const actions = logs.map((l) => l.detail);
    const hasCollect = actions.some((d) => d.includes('采集证据'));
    const hasArchive = actions.some((d) => d.includes('归档证据'));
    expect(hasCollect).toBe(true);
    expect(hasArchive).toBe(true);
  });

  it('采集→校验→归档→删除全链路仅产生4条审计', () => {
    const { item } = EvidenceCollectionService.collect(
      {
        caseId: CASE_ID,
        sourceType: 'file_upload',
        content: '全链路审计计数',
        fileName: 'test.pdf',
        fileSize: 1024,
        fileType: 'application/pdf',
      },
      COL_A_ID
    );

    EvidenceCollectionService.verify(item.id, COL_B_ID);
    EvidenceCollectionService.archive(item.id, COL_C_ID);
    EvidenceCollectionService.delete(item.id, COL_A_ID);

    const logs = getAllAuditLogs();
    expect(logs).toHaveLength(4);

    const actionCounts: Record<string, number> = {};
    logs.forEach((l) => {
      actionCounts[l.action] = (actionCounts[l.action] || 0) + 1;
    });

    expect(actionCounts['create_evidence']).toBe(2);
    expect(actionCounts['update_evidence']).toBe(1);
    expect(actionCounts['delete_evidence']).toBe(1);
  });

  it('重复采集的审计详情应标记重复但操作人正确', () => {
    const first = EvidenceCollectionService.collect(
      {
        caseId: CASE_ID,
        sourceType: 'manual_entry',
        content: '重复审计归属',
      },
      COL_A_ID
    );

    const second = EvidenceCollectionService.collect(
      {
        caseId: CASE_ID,
        sourceType: 'manual_entry',
        content: '重复审计归属',
      },
      COL_B_ID
    );

    const logs = getAllAuditLogs();
    expect(logs).toHaveLength(2);

    const dupLog = logs.find((l) => l.targetId === second.item.id);
    expect(dupLog!.collaboratorId).toBe(COL_B_ID);
    expect(dupLog!.collaboratorName).toBe(COL_B_NAME);
    expect(dupLog!.detail).toContain('重复');
  });

  it('网页截图归档后再采集同类URL（不同内容）不算重复', () => {
    const { item: item1 } = EvidenceCollectionService.collect(
      {
        caseId: CASE_ID,
        sourceType: 'webpage_screenshot',
        content: '截图1',
        sourceUrl: 'https://example.com/page1',
        screenshotDataUrl: 'data:image/png;base64,aaa',
      },
      COL_A_ID
    );

    EvidenceCollectionService.archive(item1.id, COL_A_ID);

    const { item: item2, isDuplicate } = EvidenceCollectionService.collect(
      {
        caseId: CASE_ID,
        sourceType: 'webpage_screenshot',
        content: '截图2',
        sourceUrl: 'https://example.com/page2',
        screenshotDataUrl: 'data:image/png;base64,bbb',
      },
      COL_A_ID
    );

    expect(isDuplicate).toBe(false);
    expect(item2.verificationStatus).toBe('verified');
  });

  it('归档后证据的source字段应包含来源类型和来源标识', () => {
    const { item } = EvidenceCollectionService.collect(
      {
        caseId: CASE_ID,
        sourceType: 'file_upload',
        content: '文件来源字段验证',
        fileName: 'contract.pdf',
        fileSize: 5120,
        fileType: 'application/pdf',
      },
      COL_A_ID
    );

    const archived = EvidenceCollectionService.archive(item.id, COL_A_ID);
    const evidence = EvidenceRepository.findById(archived.archivedEvidenceId!);

    expect(evidence!.source).toContain('file_upload');
    expect(evidence!.source).toContain('contract.pdf');
  });
});

describe('回归 - Repository边界条件', () => {
  it('findByContentHash不应匹配duplicate状态的记录', () => {
    EvidenceCollectionService.collect(
      {
        caseId: CASE_ID,
        sourceType: 'manual_entry',
        content: 'hash边界',
      },
      COL_A_ID
    );

    const { item: dupItem } = EvidenceCollectionService.collect(
      {
        caseId: CASE_ID,
        sourceType: 'manual_entry',
        content: 'hash边界',
      },
      COL_A_ID
    );

    const found = EvidenceCollectionRepository.findByContentHash(CASE_ID, dupItem.contentHash);
    expect(found).not.toBeNull();
    expect(found!.id).not.toBe(dupItem.id);
    expect(found!.verificationStatus).not.toBe('duplicate');
  });

  it('findVerifiedNotArchived应排除未校验和已归档项', () => {
    EvidenceCollectionService.collect(
      {
        caseId: CASE_ID,
        sourceType: 'manual_entry',
        content: '已校验未归档',
      },
      COL_A_ID
    );

    getTestDb()
      .prepare(
        "INSERT INTO evidence_collection (id, case_id, source_type, content, content_hash, verification_status, collected_at) VALUES (?, ?, ?, ?, ?, ?, ?)"
      )
      .run('ec-reg-pending', CASE_ID, 'manual_entry', '未校验', 'hash-reg-pending', 'pending', new Date().toISOString());

    const result = EvidenceCollectionRepository.findVerifiedNotArchived(CASE_ID);
    expect(result).toHaveLength(1);
    expect(result[0].content).toBe('已校验未归档');
  });

  it('deleteByCaseId应删除案件下所有采集项', () => {
    EvidenceCollectionService.collect(
      {
        caseId: CASE_ID,
        sourceType: 'manual_entry',
        content: '案件级删除1',
      },
      COL_A_ID
    );

    EvidenceCollectionService.collect(
      {
        caseId: CASE_ID,
        sourceType: 'manual_entry',
        content: '案件级删除2',
      },
      COL_A_ID
    );

    const count = EvidenceCollectionRepository.deleteByCaseId(CASE_ID);
    expect(count).toBe(2);
    expect(EvidenceCollectionRepository.findByCaseId(CASE_ID)).toHaveLength(0);
  });
});
