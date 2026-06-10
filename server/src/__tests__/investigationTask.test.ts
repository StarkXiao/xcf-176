import { describe, it, expect, beforeEach, vi } from 'vitest';
import { getTestDb, resetTestDb, seedTestCase, seedTestCollaborators } from './helpers/testDb.js';

vi.mock('../database/index.js', () => ({
  get default() { return getTestDb(); },
}));

import { InvestigationTaskService } from '../services/InvestigationTaskService.js';
import { InvestigationTaskRepository } from '../repositories/InvestigationTaskRepository.js';
import { AuditLogRepository } from '../repositories/AuditLogRepository.js';
import { EvidenceRepository } from '../repositories/EvidenceRepository.js';
import { EvidenceCollectionRepository } from '../repositories/EvidenceCollectionRepository.js';
import type { SyncSourceChange } from '@shared/types';

const CASE_ID = 'test-case-001';
const COL_A_ID = 'test-col-001';
const COL_A_NAME = '张队长';
const COL_B_ID = 'test-col-002';
const COL_B_NAME = '李分析员';

function seedCase() {
  const db = getTestDb();
  seedTestCase(db, CASE_ID, '测试案件', '自动化测试案件');
  seedTestCollaborators(db, CASE_ID, [
    { id: COL_A_ID, name: COL_A_NAME, role: 'leader', color: '#00f0ff' },
    { id: COL_B_ID, name: COL_B_NAME, role: 'analyst', color: '#9945ff' },
  ]);
}

function seedEvidence(evidenceId: string, caseId: string, content: string) {
  const db = getTestDb();
  const now = new Date().toISOString();
  db.prepare(
    "INSERT OR IGNORE INTO evidence (id, case_id, content, source, importance, tags, position_x, position_y, width, height, color, status, created_at) VALUES (?, ?, ?, 'test', 'normal', '[]', 0, 0, 200, 120, '#3b82f6', 'pending', ?)"
  ).run(evidenceId, caseId, content, now);
}

function seedCollectionItem(id: string, caseId: string, content: string, status: string = 'verified') {
  const db = getTestDb();
  const now = new Date().toISOString();
  db.prepare(
    "INSERT INTO evidence_collection (id, case_id, source_type, content, content_hash, verification_status, collected_at) VALUES (?, ?, 'manual_entry', ?, ?, ?, ?)"
  ).run(id, caseId, content, `hash-${id}`, status, now);
}

function archiveCollectionItem(id: string, evidenceId: string) {
  const db = getTestDb();
  const now = new Date().toISOString();
  db.prepare(
    "UPDATE evidence_collection SET archived_at = ?, archived_evidence_id = ? WHERE id = ?"
  ).run(now, evidenceId, id);
}

function getAuditLogsByAction(action: string) {
  return AuditLogRepository.findByCaseId(CASE_ID).filter((l) => l.action === action);
}

beforeEach(() => {
  resetTestDb();
  seedCase();
});

describe('InvestigationTaskService - 创建任务', () => {
  it('应成功创建任务并写审计日志', () => {
    const task = InvestigationTaskService.createTask({
      caseId: CASE_ID,
      title: '追踪资金流向',
      description: '深入追踪500万资金',
      priority: 'critical',
      createdBy: COL_A_ID,
    });
    expect(task.title).toBe('追踪资金流向');
    expect(task.status).toBe('pending');
    expect(task.priority).toBe('critical');
    expect(task.caseId).toBe(CASE_ID);
    expect(task.createdBy).toBe(COL_A_ID);
    expect(task.createdByName).toBe(COL_A_NAME);
    expect(task.syncNotes).toEqual([]);
    const logs = getAuditLogsByAction('create_investigation_task');
    expect(logs).toHaveLength(1);
    expect(logs[0].detail).toContain('追踪资金流向');
  });

  it('创建任务时指定责任人应正确记录', () => {
    const task = InvestigationTaskService.createTask({
      caseId: CASE_ID,
      title: '调取背景信息',
      assigneeId: COL_B_ID,
      deadline: '2024-08-01T23:59:59Z',
      createdBy: COL_A_ID,
    });
    expect(task.assigneeId).toBe(COL_B_ID);
    expect(task.assigneeName).toBe(COL_B_NAME);
    expect(task.deadline).toBe('2024-08-01T23:59:59Z');
  });

  it('创建任务时关联证据应正确记录', () => {
    seedEvidence('ev-test-001', CASE_ID, '测试证据');
    const task = InvestigationTaskService.createTask({
      caseId: CASE_ID,
      title: '分析证据',
      evidenceIds: ['ev-test-001'],
      connectionIds: ['conn-001'],
      createdBy: COL_A_ID,
    });
    expect(task.evidenceIds).toEqual(['ev-test-001']);
    expect(task.connectionIds).toEqual(['conn-001']);
  });
});

describe('InvestigationTaskService - 更新任务', () => {
  it('应成功更新任务状态并写审计日志', () => {
    const task = InvestigationTaskService.createTask({
      caseId: CASE_ID,
      title: '测试任务',
      createdBy: COL_A_ID,
    });
    const updated = InvestigationTaskService.updateTask(task.id, { status: 'in_progress' }, COL_A_ID);
    expect(updated!.status).toBe('in_progress');
    const logs = getAuditLogsByAction('update_investigation_task');
    expect(logs).toHaveLength(1);
    expect(logs[0].detail).toContain('pending');
    expect(logs[0].detail).toContain('in_progress');
  });

  it('完成任务应设置completedAt并写审计', () => {
    const task = InvestigationTaskService.createTask({
      caseId: CASE_ID,
      title: '待完成任务',
      createdBy: COL_A_ID,
    });
    InvestigationTaskService.updateTask(task.id, { status: 'in_progress' }, COL_A_ID);
    const completed = InvestigationTaskService.updateTask(task.id, { status: 'completed' }, COL_A_ID);
    expect(completed!.status).toBe('completed');
    expect(completed!.completedAt).toBeTruthy();
    const completeLogs = getAuditLogsByAction('complete_investigation_task');
    expect(completeLogs).toHaveLength(1);
    expect(completeLogs[0].detail).toContain('待完成任务');
  });

  it('更新不存在的任务应返回null', () => {
    const result = InvestigationTaskService.updateTask('non-existent', { title: 'x' }, COL_A_ID);
    expect(result).toBeNull();
  });

  it('更新任务截止时间应正确记录', () => {
    const task = InvestigationTaskService.createTask({
      caseId: CASE_ID,
      title: '设截止时间',
      createdBy: COL_A_ID,
    });
    const updated = InvestigationTaskService.updateTask(task.id, { deadline: '2024-09-01T00:00:00Z' }, COL_A_ID);
    expect(updated!.deadline).toBe('2024-09-01T00:00:00Z');
  });
});

describe('InvestigationTaskService - 分配任务', () => {
  it('应成功分配责任人并写审计', () => {
    const task = InvestigationTaskService.createTask({
      caseId: CASE_ID,
      title: '待分配任务',
      createdBy: COL_A_ID,
    });
    const assigned = InvestigationTaskService.assignTask(task.id, COL_B_ID, COL_A_ID);
    expect(assigned!.assigneeId).toBe(COL_B_ID);
    expect(assigned!.assigneeName).toBe(COL_B_NAME);
    const logs = getAuditLogsByAction('assign_investigation_task');
    expect(logs).toHaveLength(1);
    expect(logs[0].detail).toContain(COL_B_NAME);
  });

  it('分配不存在的任务应返回null', () => {
    const result = InvestigationTaskService.assignTask('non-existent', COL_B_ID, COL_A_ID);
    expect(result).toBeNull();
  });
});

describe('InvestigationTaskService - 关联证据', () => {
  it('应成功关联证据并写审计', () => {
    seedEvidence('ev-link-001', CASE_ID, '关联证据');
    const task = InvestigationTaskService.createTask({
      caseId: CASE_ID,
      title: '关联测试',
      createdBy: COL_A_ID,
    });
    const updated = InvestigationTaskService.linkEvidence(task.id, 'ev-link-001', COL_A_ID);
    expect(updated!.evidenceIds).toContain('ev-link-001');
    const logs = getAuditLogsByAction('link_evidence_to_task');
    expect(logs).toHaveLength(1);
  });

  it('重复关联同一证据不应增加', () => {
    seedEvidence('ev-dup-001', CASE_ID, '重复关联');
    const task = InvestigationTaskService.createTask({
      caseId: CASE_ID,
      title: '去重测试',
      createdBy: COL_A_ID,
    });
    InvestigationTaskService.linkEvidence(task.id, 'ev-dup-001', COL_A_ID);
    const updated = InvestigationTaskService.linkEvidence(task.id, 'ev-dup-001', COL_A_ID);
    expect(updated!.evidenceIds.filter((id) => id === 'ev-dup-001')).toHaveLength(1);
  });

  it('应成功取消关联证据', () => {
    seedEvidence('ev-unlink-001', CASE_ID, '取消关联');
    const task = InvestigationTaskService.createTask({
      caseId: CASE_ID,
      title: '取消关联测试',
      evidenceIds: ['ev-unlink-001'],
      createdBy: COL_A_ID,
    });
    const updated = InvestigationTaskService.unlinkEvidence(task.id, 'ev-unlink-001', COL_A_ID);
    expect(updated!.evidenceIds).not.toContain('ev-unlink-001');
  });

  it('关联不存在的任务应返回null', () => {
    const result = InvestigationTaskService.linkEvidence('non-existent', 'ev-001', COL_A_ID);
    expect(result).toBeNull();
  });
});

describe('InvestigationTaskService - 关联采集项', () => {
  it('应成功关联采集项并写审计', () => {
    seedCollectionItem('col-001', CASE_ID, '采集项内容');

    const task = InvestigationTaskService.createTask({
      caseId: CASE_ID,
      title: '采集项关联测试',
      createdBy: COL_A_ID,
    });
    const updated = InvestigationTaskService.linkCollectionItem(task.id, 'col-001', COL_A_ID);
    expect(updated!.collectionItemIds).toContain('col-001');
    const logs = getAuditLogsByAction('link_collection_to_task');
    expect(logs).toHaveLength(1);
  });

  it('应成功取消关联采集项', () => {
    seedCollectionItem('col-002', CASE_ID, '取消关联采集');

    const task = InvestigationTaskService.createTask({
      caseId: CASE_ID,
      title: '取消采集项关联',
      collectionItemIds: ['col-002'],
      createdBy: COL_A_ID,
    });
    const updated = InvestigationTaskService.unlinkCollectionItem(task.id, 'col-002', COL_A_ID);
    expect(updated!.collectionItemIds).not.toContain('col-002');
  });
});

describe('InvestigationTaskService - 关联关系线', () => {
  it('应成功关联关系线并写审计', () => {
    const task = InvestigationTaskService.createTask({
      caseId: CASE_ID,
      title: '关系线关联测试',
      createdBy: COL_A_ID,
    });
    const updated = InvestigationTaskService.linkConnection(task.id, 'conn-link-001', COL_A_ID);
    expect(updated!.connectionIds).toContain('conn-link-001');
    const logs = getAuditLogsByAction('link_connection_to_task');
    expect(logs).toHaveLength(1);
  });

  it('应成功取消关联关系线', () => {
    const task = InvestigationTaskService.createTask({
      caseId: CASE_ID,
      title: '取消关系线关联',
      connectionIds: ['conn-unlink-001'],
      createdBy: COL_A_ID,
    });
    const updated = InvestigationTaskService.unlinkConnection(task.id, 'conn-unlink-001', COL_A_ID);
    expect(updated!.connectionIds).not.toContain('conn-unlink-001');
  });
});

describe('InvestigationTaskService - 查询', () => {
  it('应按案件ID查询任务', () => {
    InvestigationTaskService.createTask({ caseId: CASE_ID, title: '任务1', createdBy: COL_A_ID });
    InvestigationTaskService.createTask({ caseId: CASE_ID, title: '任务2', createdBy: COL_A_ID });
    const tasks = InvestigationTaskService.getTasksByCaseId(CASE_ID);
    expect(tasks).toHaveLength(2);
  });

  it('应按状态查询任务', () => {
    InvestigationTaskService.createTask({ caseId: CASE_ID, title: '任务1', createdBy: COL_A_ID });
    const task2 = InvestigationTaskService.createTask({ caseId: CASE_ID, title: '任务2', createdBy: COL_A_ID });
    InvestigationTaskService.updateTask(task2.id, { status: 'in_progress' }, COL_A_ID);
    const pending = InvestigationTaskService.getTasksByStatus(CASE_ID, 'pending');
    const inProgress = InvestigationTaskService.getTasksByStatus(CASE_ID, 'in_progress');
    expect(pending).toHaveLength(1);
    expect(inProgress).toHaveLength(1);
  });

  it('应查询逾期任务', () => {
    InvestigationTaskService.createTask({
      caseId: CASE_ID,
      title: '已逾期任务',
      deadline: '2020-01-01T00:00:00Z',
      createdBy: COL_A_ID,
    });
    InvestigationTaskService.createTask({
      caseId: CASE_ID,
      title: '未逾期任务',
      deadline: '2099-12-31T23:59:59Z',
      createdBy: COL_A_ID,
    });
    const overdue = InvestigationTaskService.getOverdueTasks(CASE_ID);
    expect(overdue).toHaveLength(1);
    expect(overdue[0].title).toBe('已逾期任务');
  });

  it('已完成的任务不应出现在逾期列表', () => {
    const task = InvestigationTaskService.createTask({
      caseId: CASE_ID,
      title: '完成但逾期',
      deadline: '2020-01-01T00:00:00Z',
      createdBy: COL_A_ID,
    });
    InvestigationTaskService.updateTask(task.id, { status: 'completed' }, COL_A_ID);
    const overdue = InvestigationTaskService.getOverdueTasks(CASE_ID);
    expect(overdue).toHaveLength(0);
  });
});

describe('InvestigationTaskService - 删除', () => {
  it('应成功删除任务并写审计', () => {
    const task = InvestigationTaskService.createTask({
      caseId: CASE_ID,
      title: '待删除任务',
      createdBy: COL_A_ID,
    });
    const deleted = InvestigationTaskService.deleteTask(task.id, COL_A_ID);
    expect(deleted).toBe(true);
    expect(InvestigationTaskService.getTaskById(task.id)).toBeNull();
    const logs = getAuditLogsByAction('update_investigation_task');
    const deleteLog = logs.find((l) => l.detail.includes('删除任务'));
    expect(deleteLog).toBeDefined();
  });

  it('删除不存在的任务应返回false', () => {
    expect(InvestigationTaskService.deleteTask('non-existent', COL_A_ID)).toBe(false);
  });
});

describe('InvestigationTaskService - 同步引擎: 采集项归档', () => {
  it('采集项归档时应自动关联证据到任务并添加同步通知', () => {
    seedCollectionItem('col-sync-001', CASE_ID, '待归档采集项');
    seedEvidence('ev-sync-001', CASE_ID, '归档生成的证据');

    const task = InvestigationTaskService.createTask({
      caseId: CASE_ID,
      title: '同步测试任务',
      collectionItemIds: ['col-sync-001'],
      createdBy: COL_A_ID,
    });

    const updatedTasks = InvestigationTaskService.onCollectionArchived('col-sync-001', 'ev-sync-001');
    expect(updatedTasks).toHaveLength(1);

    const updated = InvestigationTaskRepository.findById(task.id)!;
    expect(updated.evidenceIds).toContain('ev-sync-001');
    expect(updated.syncNotes.length).toBe(1);
    expect(updated.syncNotes[0].sourceType).toBe('collection_archived');
    expect(updated.syncNotes[0].sourceId).toBe('col-sync-001');
    expect(updated.syncNotes[0].detail).toContain('待归档采集项');
    expect(updated.syncNotes[0].impact).toBe('info_only');

    const logs = getAuditLogsByAction('sync_collection_archived');
    expect(logs).toHaveLength(1);
  });

  it('已完成任务不应被采集项归档同步影响', () => {
    seedCollectionItem('col-done-001', CASE_ID, '已完成任务的采集项');
    seedEvidence('ev-done-001', CASE_ID, '证据');

    InvestigationTaskService.createTask({
      caseId: CASE_ID,
      title: '已完成任务',
      collectionItemIds: ['col-done-001'],
      createdBy: COL_A_ID,
      assigneeId: COL_B_ID,
    });
    const tasks = InvestigationTaskService.getTasksByCaseId(CASE_ID);
    InvestigationTaskService.updateTask(tasks[0].id, { status: 'in_progress' }, COL_A_ID);
    InvestigationTaskService.updateTask(tasks[0].id, { status: 'completed' }, COL_A_ID);

    const updatedTasks = InvestigationTaskService.onCollectionArchived('col-done-001', 'ev-done-001');
    expect(updatedTasks).toHaveLength(0);
  });

  it('所有关联采集项归档后pending任务应自动推进为in_progress且impact为status_advanced', () => {
    seedCollectionItem('col-all-001', CASE_ID, '采集项1');
    archiveCollectionItem('col-all-001', 'ev-old-001');

    const task = InvestigationTaskService.createTask({
      caseId: CASE_ID,
      title: '全部归档推进',
      collectionItemIds: ['col-all-001'],
      createdBy: COL_A_ID,
    });

    InvestigationTaskService.onCollectionArchived('col-all-001', 'ev-old-001');
    const updated = InvestigationTaskRepository.findById(task.id)!;
    expect(updated.status).toBe('in_progress');
    expect(updated.syncNotes[0].impact).toBe('status_advanced');
  });

  it('部分采集项归档时不应推进状态且impact为info_only', () => {
    seedCollectionItem('col-part-001', CASE_ID, '采集项1');
    seedCollectionItem('col-part-002', CASE_ID, '采集项2');

    const task = InvestigationTaskService.createTask({
      caseId: CASE_ID,
      title: '部分归档',
      collectionItemIds: ['col-part-001', 'col-part-002'],
      createdBy: COL_A_ID,
    });

    InvestigationTaskService.onCollectionArchived('col-part-001', 'ev-part-001');
    const updated = InvestigationTaskRepository.findById(task.id)!;
    expect(updated.status).toBe('pending');
    expect(updated.syncNotes[0].impact).toBe('info_only');
  });
});

describe('InvestigationTaskService - 同步引擎: 关系线变更', () => {
  it('关系线标签变更时pending任务应自动推进为in_progress且impact为status_advanced', () => {
    const task = InvestigationTaskService.createTask({
      caseId: CASE_ID,
      title: '关系线同步测试',
      connectionIds: ['conn-sync-001'],
      createdBy: COL_A_ID,
    });

    const changes: SyncSourceChange[] = [
      { field: 'label', oldValue: '旧标签', newValue: '新标签' },
    ];
    const updatedTasks = InvestigationTaskService.onConnectionUpdated('conn-sync-001', changes);
    expect(updatedTasks).toHaveLength(1);

    const updated = InvestigationTaskRepository.findById(task.id)!;
    expect(updated.status).toBe('in_progress');
    expect(updated.syncNotes.length).toBe(1);
    expect(updated.syncNotes[0].sourceType).toBe('connection_updated');
    expect(updated.syncNotes[0].impact).toBe('status_advanced');
    expect(updated.syncNotes[0].detail).toContain('label');

    const logs = getAuditLogsByAction('sync_connection_updated');
    expect(logs).toHaveLength(1);
  });

  it('关系线线型变更时pending任务impact为info_only不推进状态', () => {
    const task = InvestigationTaskService.createTask({
      caseId: CASE_ID,
      title: '线型变更测试',
      connectionIds: ['conn-style-001'],
      createdBy: COL_A_ID,
    });

    const changes: SyncSourceChange[] = [
      { field: 'lineStyle', oldValue: 'solid', newValue: 'dashed' },
    ];
    const updatedTasks = InvestigationTaskService.onConnectionUpdated('conn-style-001', changes);
    expect(updatedTasks).toHaveLength(1);

    const updated = InvestigationTaskRepository.findById(task.id)!;
    expect(updated.status).toBe('pending');
    expect(updated.syncNotes[0].impact).toBe('info_only');
  });

  it('in_progress任务收到关系线标签变更不应再推进', () => {
    const task = InvestigationTaskService.createTask({
      caseId: CASE_ID,
      title: '已推进任务',
      connectionIds: ['conn-adv-001'],
      createdBy: COL_A_ID,
    });
    InvestigationTaskService.updateTask(task.id, { status: 'in_progress' }, COL_A_ID);

    const changes: SyncSourceChange[] = [
      { field: 'label', oldValue: '旧', newValue: '新' },
    ];
    InvestigationTaskService.onConnectionUpdated('conn-adv-001', changes);
    const updated = InvestigationTaskRepository.findById(task.id)!;
    expect(updated.status).toBe('in_progress');
    expect(updated.syncNotes[0].impact).toBe('info_only');
  });

  it('无关联关系线的任务不应收到通知', () => {
    InvestigationTaskService.createTask({
      caseId: CASE_ID,
      title: '无关任务',
      createdBy: COL_A_ID,
    });

    const changes: SyncSourceChange[] = [
      { field: 'label', oldValue: '旧', newValue: '新' },
    ];
    const updatedTasks = InvestigationTaskService.onConnectionUpdated('conn-sync-002', changes);
    expect(updatedTasks).toHaveLength(0);
  });
});

describe('InvestigationTaskService - 同步引擎: 证据变更', () => {
  it('证据内容变更时给关联任务添加info_only通知', () => {
    seedEvidence('ev-sync-002', CASE_ID, '变更证据');

    const task = InvestigationTaskService.createTask({
      caseId: CASE_ID,
      title: '证据同步测试',
      evidenceIds: ['ev-sync-002'],
      createdBy: COL_A_ID,
    });

    const changes: SyncSourceChange[] = [
      { field: 'content', oldValue: '变更证据', newValue: '更新后证据' },
    ];
    const updatedTasks = InvestigationTaskService.onEvidenceUpdated('ev-sync-002', changes);
    expect(updatedTasks).toHaveLength(1);

    const updated = InvestigationTaskRepository.findById(task.id)!;
    expect(updated.syncNotes.length).toBe(1);
    expect(updated.syncNotes[0].sourceType).toBe('evidence_updated');
    expect(updated.syncNotes[0].impact).toBe('info_only');

    const logs = getAuditLogsByAction('sync_evidence_updated');
    expect(logs).toHaveLength(1);
  });

  it('证据重要性提升为critical时pending任务应推进为in_progress', () => {
    seedEvidence('ev-imp-001', CASE_ID, '重要证据');

    const task = InvestigationTaskService.createTask({
      caseId: CASE_ID,
      title: '重要性提升测试',
      evidenceIds: ['ev-imp-001'],
      priority: 'normal',
      createdBy: COL_A_ID,
    });

    const changes: SyncSourceChange[] = [
      { field: 'importance', oldValue: 'normal', newValue: 'critical' },
    ];
    InvestigationTaskService.onEvidenceUpdated('ev-imp-001', changes);

    const updated = InvestigationTaskRepository.findById(task.id)!;
    expect(updated.status).toBe('in_progress');
  });

  it('证据重要性提升时应同步升级任务优先级并写审计', () => {
    seedEvidence('ev-esc-001', CASE_ID, '升级证据');

    const task = InvestigationTaskService.createTask({
      caseId: CASE_ID,
      title: '优先级升级测试',
      evidenceIds: ['ev-esc-001'],
      priority: 'low',
      createdBy: COL_A_ID,
    });

    const changes: SyncSourceChange[] = [
      { field: 'importance', oldValue: 'normal', newValue: 'high' },
    ];
    InvestigationTaskService.onEvidenceUpdated('ev-esc-001', changes);

    const updated = InvestigationTaskRepository.findById(task.id)!;
    expect(updated.priority).toBe('high');

    const escalationLogs = getAuditLogsByAction('sync_priority_escalated');
    expect(escalationLogs).toHaveLength(1);
    expect(escalationLogs[0].detail).toContain('low');
    expect(escalationLogs[0].detail).toContain('high');
  });

  it('证据重要性降低时不应降级任务优先级', () => {
    seedEvidence('ev-down-001', CASE_ID, '降级证据');

    const task = InvestigationTaskService.createTask({
      caseId: CASE_ID,
      title: '不可降级测试',
      evidenceIds: ['ev-down-001'],
      priority: 'critical',
      createdBy: COL_A_ID,
    });

    const changes: SyncSourceChange[] = [
      { field: 'importance', oldValue: 'critical', newValue: 'low' },
    ];
    InvestigationTaskService.onEvidenceUpdated('ev-down-001', changes);

    const updated = InvestigationTaskRepository.findById(task.id)!;
    expect(updated.priority).toBe('critical');
  });

  it('证据状态变更时pending任务应推进为in_progress', () => {
    seedEvidence('ev-status-001', CASE_ID, '状态变更证据');

    const task = InvestigationTaskService.createTask({
      caseId: CASE_ID,
      title: '状态推进测试',
      evidenceIds: ['ev-status-001'],
      createdBy: COL_A_ID,
    });

    const changes: SyncSourceChange[] = [
      { field: 'status', oldValue: 'pending', newValue: 'in_progress' },
    ];
    InvestigationTaskService.onEvidenceUpdated('ev-status-001', changes);

    const updated = InvestigationTaskRepository.findById(task.id)!;
    expect(updated.status).toBe('in_progress');
    const statusNote = updated.syncNotes.find((n) => n.impact === 'status_advanced');
    expect(statusNote).toBeDefined();
  });
});

describe('InvestigationTaskService - 清除同步通知', () => {
  it('应清除任务的同步通知并写审计', () => {
    seedCollectionItem('col-clear-001', CASE_ID, '清除通知采集项');
    seedEvidence('ev-clear-001', CASE_ID, '证据');

    InvestigationTaskService.createTask({
      caseId: CASE_ID,
      title: '清除通知测试',
      collectionItemIds: ['col-clear-001'],
      createdBy: COL_A_ID,
    });
    const tasks = InvestigationTaskService.getTasksByCaseId(CASE_ID);
    InvestigationTaskService.onCollectionArchived('col-clear-001', 'ev-clear-001');

    const beforeClear = InvestigationTaskRepository.findById(tasks[0].id)!;
    expect(beforeClear.syncNotes.length).toBeGreaterThan(0);

    const cleared = InvestigationTaskService.clearSyncNotes(tasks[0].id, COL_A_ID);
    expect(cleared!.syncNotes).toEqual([]);
  });

  it('清除不存在任务的同步通知应返回null', () => {
    const result = InvestigationTaskService.clearSyncNotes('non-existent', COL_A_ID);
    expect(result).toBeNull();
  });
});
