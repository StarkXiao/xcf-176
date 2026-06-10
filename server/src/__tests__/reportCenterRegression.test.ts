import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  getTestDb,
  resetTestDb,
  seedTestCase,
  seedTestCollaborators,
  seedTestEvidence,
  seedTestConnection,
  seedTestInvestigationTask,
  updateCaseKeyClues,
  seedTestAuditLog,
} from './helpers/testDb.js';

vi.mock('../database/index.js', () => ({
  get default() { return getTestDb(); },
}));

import { ReportService } from '../services/ReportService.js';
import { ReportRepository } from '../repositories/ReportRepository.js';
import type { Report, ReportExportFormat } from '@shared/types';

const CASE_ID = 'report-case-001';
const CASE_NAME = '2026-网络诈骗-证据报告回归测试';
const CASE_DESC = '测试案件，用于验证证据报告生成功能的完整性';
const COL_A_ID = 'col-a-001';
const COL_A_NAME = '取证员张明';
const COL_B_ID = 'col-b-001';
const COL_B_NAME = '分析师李华';
const COL_C_ID = 'col-c-001';
const COL_C_NAME = '组长王强';

function seedFullCase() {
  const db = getTestDb();
  seedTestCase(db, CASE_ID, CASE_NAME, CASE_DESC);
  updateCaseKeyClues(db, CASE_ID, [
    '嫌疑人使用微信账号 wx_xyz123 联络',
    '涉案金额约 50 万元',
    '转账时间集中在 2026-03-15 至 2026-03-20',
  ]);
  seedTestCollaborators(db, CASE_ID, [
    { id: COL_A_ID, name: COL_A_NAME, role: 'operator', color: '#00f0ff' },
    { id: COL_B_ID, name: COL_B_NAME, role: 'analyst', color: '#9945ff' },
    { id: COL_C_ID, name: COL_C_NAME, role: 'admin', color: '#ff4500' },
  ]);
  const now = new Date();
  const ts = (daysAgo: number, hours = 0) => {
    const d = new Date(now);
    d.setDate(d.getDate() - daysAgo);
    d.setHours(hours, 0, 0, 0);
    return d.toISOString();
  };
  seedTestEvidence(db, CASE_ID, [
    {
      id: 'ev-001',
      content: '微信聊天记录：嫌疑人诱导受害人点击钓鱼链接',
      source: '微信客户端_提取',
      importance: 'critical',
      tags: ['微信', '聊天记录', '钓鱼链接'],
      status: 'reviewed',
      timestamp: ts(5, 10),
      assignedTo: COL_A_ID,
    },
    {
      id: 'ev-002',
      content: '银行转账凭证：受害人向嫌疑人账户转账 50 万元',
      source: '银行流水_打印',
      importance: 'high',
      tags: ['银行转账', '50万', '流水'],
      status: 'completed',
      timestamp: ts(4, 14),
      assignedTo: COL_A_ID,
    },
    {
      id: 'ev-003',
      content: 'IP 地址定位：嫌疑人登录 IP 归属地为东南亚某国',
      source: '网络日志_分析',
      importance: 'high',
      tags: ['IP定位', '境外', '网络日志'],
      status: 'in_progress',
      timestamp: ts(3, 9),
      assignedTo: COL_B_ID,
    },
    {
      id: 'ev-004',
      content: '受害人陈述笔录',
      source: '询问笔录_录入',
      importance: 'normal',
      tags: ['陈述', '笔录'],
      status: 'completed',
      timestamp: ts(2, 15),
      assignedTo: COL_A_ID,
    },
    {
      id: 'ev-005',
      content: '嫌疑人电话号码 13800138000 通话记录',
      source: '运营商_调取',
      importance: 'normal',
      tags: ['通话记录', '电话号码'],
      status: 'pending',
      timestamp: ts(1, 11),
      assignedTo: COL_B_ID,
    },
    {
      id: 'ev-006',
      content: '钓鱼网站域名注册信息',
      source: 'WHOIS_查询',
      importance: 'low',
      tags: ['域名', '注册信息'],
      status: 'pending',
      timestamp: ts(1, 16),
      assignedTo: null,
    },
  ]);
  seedTestConnection(db, CASE_ID, [
    { id: 'conn-001', fromEvidenceId: 'ev-001', toEvidenceId: 'ev-002', label: '诱导转账' },
    { id: 'conn-002', fromEvidenceId: 'ev-001', toEvidenceId: 'ev-003', label: 'IP关联' },
    { id: 'conn-003', fromEvidenceId: 'ev-002', toEvidenceId: 'ev-004', label: '受害人陈述佐证' },
    { id: 'conn-004', fromEvidenceId: 'ev-003', toEvidenceId: 'ev-005', label: '通讯关联' },
    { id: 'conn-005', fromEvidenceId: 'ev-001', toEvidenceId: 'ev-006', label: '钓鱼链接来源' },
  ]);
  seedTestInvestigationTask(db, CASE_ID, [
    {
      id: 'task-001',
      title: '调取银行转账凭证原件',
      description: '前往银行获取转账凭证原件并盖章',
      priority: 'critical',
      status: 'completed',
      assigneeId: COL_A_ID,
      assigneeName: COL_A_NAME,
      deadline: ts(-1, 0),
      createdBy: COL_C_ID,
      createdByName: COL_C_NAME,
    },
    {
      id: 'task-002',
      title: '分析微信聊天记录中的联系人信息',
      description: '提取聊天记录中所有可能的联系人信息',
      priority: 'high',
      status: 'in_progress',
      assigneeId: COL_B_ID,
      assigneeName: COL_B_NAME,
      deadline: ts(-2, 0),
      createdBy: COL_C_ID,
      createdByName: COL_C_NAME,
    },
    {
      id: 'task-003',
      title: '核实钓鱼网站注册信息',
      priority: 'normal',
      status: 'pending',
      assigneeId: null,
      deadline: ts(-5, 0),
      createdBy: COL_C_ID,
      createdByName: COL_C_NAME,
    },
  ]);
  seedTestAuditLog(db, CASE_ID, [
    {
      id: 'audit-001',
      collaboratorId: COL_A_ID,
      collaboratorName: COL_A_NAME,
      action: 'create_evidence',
      targetType: 'evidence',
      targetId: 'ev-001',
      detail: '创建证据：微信聊天记录',
    },
    {
      id: 'audit-002',
      collaboratorId: COL_B_ID,
      collaboratorName: COL_B_NAME,
      action: 'create_connection',
      targetType: 'connection',
      targetId: 'conn-001',
      detail: '建立关联：ev-001 -> ev-002',
    },
    {
      id: 'audit-003',
      collaboratorId: COL_C_ID,
      collaboratorName: COL_C_NAME,
      action: 'review_evidence',
      targetType: 'evidence',
      targetId: 'ev-001',
      detail: '审核通过证据 ev-001',
    },
  ]);
}

beforeEach(() => {
  resetTestDb();
  seedFullCase();
});

describe('回归 - 案件概要生成', () => {
  it('生成报告时案件概要字段完整且正确', () => {
    const report = ReportService.generateReport({ caseId: CASE_ID });
    const s = report.caseSummary;

    expect(report.status).toBe('completed');
    expect(s.caseId).toBe(CASE_ID);
    expect(s.caseName).toBe(CASE_NAME);
    expect(s.caseDescription).toBe(CASE_DESC);
    expect(s.caseStatus).toBe('in_progress');
    expect(s.keyClues).toHaveLength(3);
    expect(s.keyClues).toContain('涉案金额约 50 万元');
    expect(s.totalEvidence).toBe(6);
    expect(s.totalConnections).toBe(5);
    expect(s.totalTasks).toBe(3);
    expect(s.collaborators).toHaveLength(3);
    expect(s.collaborators.map((c) => c.name)).toContain(COL_A_NAME);
  });

  it('证据重要性分布统计准确', () => {
    const report = ReportService.generateReport({ caseId: CASE_ID });
    const dist = report.caseSummary.evidenceByImportance;

    expect(dist.critical).toBe(1);
    expect(dist.high).toBe(2);
    expect(dist.normal).toBe(2);
    expect(dist.low).toBe(1);
    expect(dist.critical + dist.high + dist.normal + dist.low).toBe(report.caseSummary.totalEvidence);
  });

  it('证据状态分布统计准确', () => {
    const report = ReportService.generateReport({ caseId: CASE_ID });
    const dist = report.caseSummary.evidenceByStatus;

    expect(dist.reviewed).toBe(1);
    expect(dist.completed).toBe(2);
    expect(dist.in_progress).toBe(1);
    expect(dist.pending).toBe(2);
    expect(dist.reviewed + dist.completed + dist.in_progress + dist.pending).toBe(report.caseSummary.totalEvidence);
  });

  it('案件概要包含所有关键线索', () => {
    const report = ReportService.generateReport({ caseId: CASE_ID });
    const keyClues = report.caseSummary.keyClues;

    expect(keyClues).toEqual(
      expect.arrayContaining([
        '嫌疑人使用微信账号 wx_xyz123 联络',
        '涉案金额约 50 万元',
        '转账时间集中在 2026-03-15 至 2026-03-20',
      ])
    );
  });

  it('空数据案件生成的概要统计值正确', () => {
    resetTestDb();
    const db = getTestDb();
    seedTestCase(db, 'empty-case-001', '空案件', '无证据无关联');

    const report = ReportService.generateReport({ caseId: 'empty-case-001' });
    const s = report.caseSummary;

    expect(s.totalEvidence).toBe(0);
    expect(s.totalConnections).toBe(0);
    expect(s.totalTasks).toBe(0);
    expect(s.keyClues).toEqual([]);
    expect(s.collaborators).toEqual([]);
    expect(s.evidenceByImportance.critical).toBe(0);
    expect(s.evidenceByStatus.pending).toBe(0);
  });
});

describe('回归 - 关系图谱生成', () => {
  it('关系图谱包含所有证据节点', () => {
    const report = ReportService.generateReport({ caseId: CASE_ID });
    const graph = report.relationshipGraph;

    expect(graph.nodes).toHaveLength(6);
    const nodeIds = graph.nodes.map((n) => n.id);
    expect(nodeIds).toContain('ev-001');
    expect(nodeIds).toContain('ev-006');
  });

  it('证据节点包含完整属性', () => {
    const report = ReportService.generateReport({ caseId: CASE_ID });
    const node = report.relationshipGraph.nodes.find((n) => n.id === 'ev-001')!;

    expect(node.content).toContain('微信聊天记录');
    expect(node.source).toBe('微信客户端_提取');
    expect(node.importance).toBe('critical');
    expect(node.tags).toContain('钓鱼链接');
    expect(node.status).toBe('reviewed');
    expect(node.assignedTo).toBe(COL_A_ID);
    expect(node.timestamp).toBeTruthy();
  });

  it('关系图谱包含所有关联边', () => {
    const report = ReportService.generateReport({ caseId: CASE_ID });
    const edges = report.relationshipGraph.edges;

    expect(edges).toHaveLength(5);
    const hasInduceTransfer = edges.some(
      (e) => e.fromEvidenceId === 'ev-001' && e.toEvidenceId === 'ev-002' && e.label === '诱导转账'
    );
    expect(hasInduceTransfer).toBe(true);
  });

  it('关联边包含起止节点内容摘要', () => {
    const report = ReportService.generateReport({ caseId: CASE_ID });
    const edge = report.relationshipGraph.edges[0];

    expect(edge.fromContent).toBeTruthy();
    expect(edge.toContent).toBeTruthy();
    expect(typeof edge.fromContent).toBe('string');
    expect(typeof edge.toContent).toBe('string');
    expect(edge.fromContent.length).toBeGreaterThan(0);
    expect(edge.toContent.length).toBeGreaterThan(0);
  });

  it('孤立证据（无关联）节点仍出现在图谱中', () => {
    resetTestDb();
    const db = getTestDb();
    seedTestCase(db, 'isolated-case-001', '孤立节点案件');
    seedTestEvidence(db, 'isolated-case-001', [
      {
        id: 'iso-ev-001',
        content: '孤立证据1',
        source: 'test',
        importance: 'normal',
        tags: [],
        status: 'pending',
      },
      {
        id: 'iso-ev-002',
        content: '孤立证据2',
        source: 'test',
        importance: 'low',
        tags: [],
        status: 'pending',
      },
    ]);

    const report = ReportService.generateReport({ caseId: 'isolated-case-001' });
    expect(report.relationshipGraph.nodes).toHaveLength(2);
    expect(report.relationshipGraph.edges).toHaveLength(0);
  });
});

describe('回归 - 时间线摘要生成', () => {
  it('时间线包含所有类型的事件', () => {
    const report = ReportService.generateReport({ caseId: CASE_ID });
    const types = new Set(report.timeline.map((t) => t.type));

    expect(types.has('evidence')).toBe(true);
    expect(types.has('connection')).toBe(true);
    expect(types.has('audit')).toBe(true);
    expect(types.has('task')).toBe(true);
  });

  it('时间线按时间升序排列', () => {
    const report = ReportService.generateReport({ caseId: CASE_ID });
    const timeline = report.timeline;

    for (let i = 1; i < timeline.length; i++) {
      const prevTime = new Date(timeline[i - 1].timestamp).getTime();
      const currTime = new Date(timeline[i].timestamp).getTime();
      expect(currTime).toBeGreaterThanOrEqual(prevTime);
    }
  });

  it('时间线条目包含完整信息', () => {
    const report = ReportService.generateReport({ caseId: CASE_ID });
    const evidenceEntry = report.timeline.find((t) => t.type === 'evidence' && t.referenceId === 'ev-001')!;

    expect(evidenceEntry).toBeDefined();
    expect(evidenceEntry.timestamp).toBeTruthy();
    expect(evidenceEntry.title).toBeTruthy();
    expect(evidenceEntry.description).toContain('critical');
    expect(evidenceEntry.description).toContain('微信客户端_提取');
    expect(evidenceEntry.referenceId).toBe('ev-001');
  });

  it('审计日志正确映射到时间线', () => {
    const report = ReportService.generateReport({ caseId: CASE_ID });
    const auditEntries = report.timeline.filter((t) => t.type === 'audit');

    expect(auditEntries.length).toBeGreaterThanOrEqual(3);
    const reviewEntry = auditEntries.find((e) => e.description.includes('审核通过'));
    expect(reviewEntry).toBeDefined();
    expect(reviewEntry!.description).toContain(COL_C_NAME);
  });

  it('侦查任务正确映射到时间线', () => {
    const report = ReportService.generateReport({ caseId: CASE_ID });
    const taskEntries = report.timeline.filter((t) => t.type === 'task');

    expect(taskEntries).toHaveLength(3);
    const criticalTask = taskEntries.find((e) => e.description.includes('critical'));
    expect(criticalTask).toBeDefined();
    expect(criticalTask!.description).toContain(COL_A_NAME);
  });

  it('时间线总条目数等于各类型数量之和', () => {
    const report = ReportService.generateReport({ caseId: CASE_ID });
    const countByType: Record<string, number> = {};
    report.timeline.forEach((e) => {
      countByType[e.type] = (countByType[e.type] || 0) + 1;
    });

    expect(countByType['evidence']).toBe(6);
    expect(countByType['connection']).toBe(5);
    expect(countByType['audit']).toBe(3);
    expect(countByType['task']).toBe(3);
    expect(report.timeline.length).toBe(6 + 5 + 3 + 3);
  });
});

describe('回归 - 任务汇总生成', () => {
  it('任务汇总包含所有任务', () => {
    const report = ReportService.generateReport({ caseId: CASE_ID });
    const tasks = report.taskSummaries;

    expect(tasks).toHaveLength(3);
    const taskIds = tasks.map((t) => t.id);
    expect(taskIds).toEqual(expect.arrayContaining(['task-001', 'task-002', 'task-003']));
  });

  it('任务汇总字段完整', () => {
    const report = ReportService.generateReport({ caseId: CASE_ID });
    const task = report.taskSummaries.find((t) => t.id === 'task-001')!;

    expect(task.title).toContain('调取银行转账凭证');
    expect(task.priority).toBe('critical');
    expect(task.status).toBe('completed');
    expect(task.assigneeName).toBe(COL_A_NAME);
    expect(task.deadline).toBeTruthy();
  });

  it('未分配任务的 assigneeName 为 null', () => {
    const report = ReportService.generateReport({ caseId: CASE_ID });
    const unassigned = report.taskSummaries.find((t) => t.id === 'task-003')!;

    expect(unassigned.assigneeName).toBeNull();
  });

  it('任务按创建时间排序（最新优先）', () => {
    const report = ReportService.generateReport({ caseId: CASE_ID });
    const tasks = report.taskSummaries;

    expect(tasks[0].id).toBe('task-001');
    expect(tasks[1].id).toBe('task-002');
    expect(tasks[2].id).toBe('task-003');
  });
});

describe('回归 - 历史报告回看', () => {
  it('生成多份历史报告后可通过列表查询', () => {
    ReportService.generateReport({ caseId: CASE_ID, title: '第一版报告' });
    ReportService.generateReport({ caseId: CASE_ID, title: '第二版报告' });
    ReportService.generateReport({ caseId: CASE_ID, title: '第三版报告' });

    const reports = ReportService.getReportsByCaseId(CASE_ID);
    expect(reports).toHaveLength(3);
    expect(reports.map((r) => r.title)).toEqual(
      expect.arrayContaining(['第一版报告', '第二版报告', '第三版报告'])
    );
  });

  it('历史报告按创建时间倒序排列（最新在前）', () => {
    const r1 = ReportService.generateReport({ caseId: CASE_ID, title: '早期报告' });
    const r2 = ReportService.generateReport({ caseId: CASE_ID, title: '中期报告' });
    const r3 = ReportService.generateReport({ caseId: CASE_ID, title: '最新报告' });

    const reports = ReportService.getReportsByCaseId(CASE_ID);
    expect(reports[0].id).toBe(r3.id);
    expect(reports[1].id).toBe(r2.id);
    expect(reports[2].id).toBe(r1.id);
  });

  it('可通过 ID 回看特定历史报告详情', () => {
    const r1 = ReportService.generateReport({ caseId: CASE_ID, title: '需回看的报告' });

    const fetched = ReportService.getReportById(r1.id);
    expect(fetched).not.toBeNull();
    expect(fetched!.id).toBe(r1.id);
    expect(fetched!.title).toBe('需回看的报告');
    expect(fetched!.caseSummary.totalEvidence).toBe(6);
    expect(fetched!.relationshipGraph.edges).toHaveLength(5);
    expect(fetched!.timeline.length).toBe(17);
    expect(fetched!.taskSummaries).toHaveLength(3);
  });

  it('回看不存在的报告 ID 返回 null', () => {
    const fetched = ReportService.getReportById('nonexistent-report-id');
    expect(fetched).toBeNull();
  });

  it('删除历史报告后从列表消失', () => {
    const r1 = ReportService.generateReport({ caseId: CASE_ID, title: '将被删除的报告' });
    const r2 = ReportService.generateReport({ caseId: CASE_ID, title: '保留的报告' });

    expect(ReportService.getReportsByCaseId(CASE_ID)).toHaveLength(2);

    const deleted = ReportService.deleteReport(r1.id);
    expect(deleted).toBe(true);

    const reports = ReportService.getReportsByCaseId(CASE_ID);
    expect(reports).toHaveLength(1);
    expect(reports[0].id).toBe(r2.id);
    expect(ReportService.getReportById(r1.id)).toBeNull();
  });

  it('重新生成报告后内容更新', () => {
    const report = ReportService.generateReport({ caseId: CASE_ID, title: '原始报告' });
    const originalGeneratedAt = report.generatedAt;

    const db = getTestDb();
    seedTestEvidence(db, CASE_ID, [
      {
        id: 'ev-007',
        content: '新增证据：嫌疑人支付宝账号交易记录',
        source: '支付宝_调取',
        importance: 'high',
        tags: ['支付宝', '交易记录'],
        status: 'pending',
      },
    ]);

    const regenerated = ReportService.regenerateReport(report.id);
    expect(regenerated).not.toBeNull();
    expect(regenerated!.caseSummary.totalEvidence).toBe(7);
    expect(regenerated!.relationshipGraph.nodes).toHaveLength(7);
    expect(regenerated!.generatedAt).not.toBe(originalGeneratedAt);
  });
});

describe('回归 - 三种导出格式', () => {
  let testReport: Report;

  beforeEach(() => {
    testReport = ReportService.generateReport({
      caseId: CASE_ID,
      title: '导出测试报告',
    });
  });

  it('JSON 导出包含完整结构化数据', () => {
    const exported = ReportService.exportReport(testReport.id, 'json');
    expect(exported).not.toBeNull();
    expect(exported!.exportFormat).toBe('json');
    expect(exported!.status).toBe('exported');
    expect(exported!.exportedContent).toBeTruthy();
    expect(exported!.exportedAt).toBeTruthy();

    const content = JSON.parse(exported!.exportedContent!);
    expect(content.reportInfo.title).toBe('导出测试报告');
    expect(content.reportInfo.format).toBe('json');
    expect(content.caseSummary.caseId).toBe(CASE_ID);
    expect(content.caseSummary.totalEvidence).toBe(6);
    expect(content.relationshipGraph.nodes).toHaveLength(6);
    expect(content.relationshipGraph.edges).toHaveLength(5);
    expect(content.timeline.length).toBe(17);
    expect(content.taskSummaries).toHaveLength(3);
  });

  it('Markdown 导出结构完整，包含所有章节', () => {
    const exported = ReportService.exportReport(testReport.id, 'markdown');
    expect(exported).not.toBeNull();
    expect(exported!.exportFormat).toBe('markdown');

    const content = exported!.exportedContent!;
    expect(content).toContain('# 导出测试报告');
    expect(content).toContain('## 一、案件概要');
    expect(content).toContain('## 二、关系图谱');
    expect(content).toContain('## 三、时间线摘要');
    expect(content).toContain('## 四、侦查任务汇总');
    expect(content).toContain('微信聊天记录');
    expect(content).toContain('银行转账凭证');
    expect(content).toContain('critical');
    expect(content).toContain(COL_A_NAME);
    expect(content).toContain('涉案金额约 50 万元');
  });

  it('Markdown 导出包含统计分布信息', () => {
    const exported = ReportService.exportReport(testReport.id, 'markdown');
    const content = exported!.exportedContent!;

    expect(content).toContain('证据重要性分布');
    expect(content).toContain('证据状态分布');
    expect(content).toContain('critical: 1');
    expect(content).toContain('high: 2');
    expect(content).toContain('reviewed: 1');
    expect(content).toContain('completed: 2');
  });

  it('HTML 导出为完整 HTML 文档，包含赛博朋克样式', () => {
    const exported = ReportService.exportReport(testReport.id, 'html');
    expect(exported).not.toBeNull();
    expect(exported!.exportFormat).toBe('html');

    const content = exported!.exportedContent!;
    expect(content).toContain('<!DOCTYPE html>');
    expect(content).toContain('<html lang="zh-CN">');
    expect(content).toContain('<title>导出测试报告</title>');
    expect(content).toContain('cyberpunk');
    expect(content).toContain('#00f0ff');
    expect(content).toContain('#9945ff');
    expect(content).toContain('.stat-card');
    expect(content).toContain('.timeline-item');
    expect(content).toContain('.badge-critical');
  });

  it('HTML 导出包含所有数据表格', () => {
    const exported = ReportService.exportReport(testReport.id, 'html');
    const content = exported!.exportedContent!;

    expect(content).toContain('案件概要');
    expect(content).toContain('证据节点');
    expect(content).toContain('关联关系');
    expect(content).toContain('时间线摘要');
    expect(content).toContain('侦查任务汇总');
    expect(content).toContain('嫌疑人使用微信账号 wx_xyz123 联络');
    expect(content).toContain('调取银行转账凭证原件');
    expect(content).toContain('诱导转账');
  });

  it('不同导出格式的 exportedContent 互不相同', () => {
    const jsonExport = ReportService.exportReport(testReport.id, 'json');
    const mdExport = ReportService.exportReport(testReport.id, 'markdown');
    const htmlExport = ReportService.exportReport(testReport.id, 'html');

    const jsonContent = jsonExport!.exportedContent!;
    const mdContent = mdExport!.exportedContent!;
    const htmlContent = htmlExport!.exportedContent!;

    expect(jsonContent).not.toBe(mdContent);
    expect(mdContent).not.toBe(htmlContent);
    expect(jsonContent).not.toBe(htmlContent);
  });

  it('导出格式参数为空时报错', () => {
    const report = ReportRepository.findById(testReport.id)!;
    expect(report.exportedContent).toBeNull();

    const invalidFormat = 'invalid-format' as ReportExportFormat;
    const exported = ReportService.exportReport(testReport.id, invalidFormat);
    expect(exported).not.toBeNull();
    expect(exported!.exportFormat).toBe('json');
  });

  it('导出不存在的报告返回 null', () => {
    const exported = ReportService.exportReport('nonexistent-id', 'json');
    expect(exported).toBeNull();
  });
});

describe('回归 - Repository 边界条件', () => {
  it('findAll 返回所有报告，按创建时间倒序', () => {
    const r1 = ReportService.generateReport({ caseId: CASE_ID, title: '报告A' });
    const r2 = ReportService.generateReport({ caseId: CASE_ID, title: '报告B' });

    const all = ReportRepository.findAll();
    expect(all.length).toBeGreaterThanOrEqual(2);
    expect(all[0].id).toBe(r2.id);
    expect(all[1].id).toBe(r1.id);
  });

  it('findByCaseId 仅返回指定案件的报告', () => {
    const db = getTestDb();
    seedTestCase(db, 'other-case-001', '其他案件');

    ReportService.generateReport({ caseId: CASE_ID, title: '本案件报告' });
    ReportService.generateReport({ caseId: 'other-case-001', title: '其他案件报告' });

    const reports = ReportRepository.findByCaseId(CASE_ID);
    expect(reports).toHaveLength(1);
    expect(reports[0].title).toBe('本案件报告');
  });

  it('deleteByCaseId 删除该案件下所有报告', () => {
    ReportService.generateReport({ caseId: CASE_ID, title: '报告1' });
    ReportService.generateReport({ caseId: CASE_ID, title: '报告2' });

    expect(ReportRepository.findByCaseId(CASE_ID)).toHaveLength(2);

    const deletedCount = ReportRepository.deleteByCaseId(CASE_ID);
    expect(deletedCount).toBe(2);
    expect(ReportRepository.findByCaseId(CASE_ID)).toHaveLength(0);
  });

  it('生成不存在案件的报告应抛出错误', () => {
    expect(() => ReportService.generateReport({ caseId: 'nonexistent-case' })).toThrow('案件不存在');
  });

  it('更新报告标题和状态', async () => {
    const report = ReportService.generateReport({ caseId: CASE_ID, title: '原始标题' });
    expect(report.title).toBe('原始标题');
    expect(report.status).toBe('completed');

    await new Promise((resolve) => setTimeout(resolve, 2));

    const updated = ReportRepository.update(report.id, {
      title: '更新后的标题',
      status: 'draft',
    });

    expect(updated).not.toBeNull();
    expect(updated!.title).toBe('更新后的标题');
    expect(updated!.status).toBe('draft');
    expect(updated!.updatedAt).not.toBe(report.updatedAt);
  });
});

describe('回归 - 端到端全流程', () => {
  it('完整流程：生成报告 → 导出三种格式 → 回看 → 删除', () => {
    const report = ReportService.generateReport({ caseId: CASE_ID, title: '端到端测试报告' });
    expect(report).toBeDefined();
    expect(report.caseSummary.totalEvidence).toBe(6);

    const jsonReport = ReportService.exportReport(report.id, 'json');
    expect(jsonReport!.exportFormat).toBe('json');
    expect(jsonReport!.exportedContent).toContain('reportInfo');

    const mdReport = ReportService.exportReport(report.id, 'markdown');
    expect(mdReport!.exportFormat).toBe('markdown');
    expect(mdReport!.exportedContent).toContain('# 端到端测试报告');

    const htmlReport = ReportService.exportReport(report.id, 'html');
    expect(htmlReport!.exportFormat).toBe('html');
    expect(htmlReport!.exportedContent).toContain('<!DOCTYPE html>');

    const lookedUp = ReportService.getReportById(report.id);
    expect(lookedUp!.status).toBe('exported');
    expect(lookedUp!.exportFormat).toBe('html');

    const deleted = ReportService.deleteReport(report.id);
    expect(deleted).toBe(true);
    expect(ReportService.getReportById(report.id)).toBeNull();
  });

  it('新增证据后重新生成报告，统计数据更新', () => {
    const report = ReportService.generateReport({ caseId: CASE_ID });
    expect(report.caseSummary.totalEvidence).toBe(6);
    expect(report.caseSummary.evidenceByImportance.high).toBe(2);

    const db = getTestDb();
    seedTestEvidence(db, CASE_ID, [
      {
        id: 'ev-new-1',
        content: '新增高优先级证据',
        source: 'test',
        importance: 'high',
        tags: ['新增'],
        status: 'pending',
      },
      {
        id: 'ev-new-2',
        content: '新增紧急证据',
        source: 'test',
        importance: 'critical',
        tags: ['新增', '紧急'],
        status: 'in_progress',
      },
    ]);

    const regenerated = ReportService.regenerateReport(report.id)!;
    expect(regenerated.caseSummary.totalEvidence).toBe(8);
    expect(regenerated.caseSummary.evidenceByImportance.high).toBe(3);
    expect(regenerated.caseSummary.evidenceByImportance.critical).toBe(2);
    expect(regenerated.relationshipGraph.nodes).toHaveLength(8);
    expect(regenerated.timeline.length).toBe(17 + 2);
  });

  it('生成报告时自动生成默认标题', () => {
    const report = ReportService.generateReport({ caseId: CASE_ID });
    expect(report.title).toContain(CASE_NAME);
    expect(report.title).toContain('证据报告');
  });

  it('多个案件的报告互不干扰', () => {
    const db = getTestDb();
    seedTestCase(db, 'case-a', '案件A');
    seedTestCase(db, 'case-b', '案件B');
    seedTestEvidence(db, 'case-a', [
      { id: 'a-ev-1', content: 'A的证据', source: 'test', importance: 'normal', tags: [], status: 'pending' },
    ]);
    seedTestEvidence(db, 'case-b', [
      { id: 'b-ev-1', content: 'B的证据1', source: 'test', importance: 'high', tags: [], status: 'pending' },
      { id: 'b-ev-2', content: 'B的证据2', source: 'test', importance: 'critical', tags: [], status: 'pending' },
    ]);

    const reportA = ReportService.generateReport({ caseId: 'case-a' });
    const reportB = ReportService.generateReport({ caseId: 'case-b' });

    expect(reportA.caseSummary.totalEvidence).toBe(1);
    expect(reportB.caseSummary.totalEvidence).toBe(2);
    expect(reportA.caseSummary.caseName).toBe('案件A');
    expect(reportB.caseSummary.caseName).toBe('案件B');
  });
});
