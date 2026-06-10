import { CaseRepository } from '../repositories/CaseRepository.js';
import { EvidenceRepository } from '../repositories/EvidenceRepository.js';
import { ConnectionRepository } from '../repositories/ConnectionRepository.js';
import { CollaboratorRepository } from '../repositories/CollaboratorRepository.js';
import { AuditLogRepository } from '../repositories/AuditLogRepository.js';
import { InvestigationTaskRepository } from '../repositories/InvestigationTaskRepository.js';
import { ReportRepository } from '../repositories/ReportRepository.js';
import db from '../database/index.js';
import type {
  Report,
  ReportCaseSummary,
  ReportRelationshipGraph,
  ReportTimelineEntry,
  ReportTaskSummary,
  ReportEvidenceSummary,
  ReportRelationshipEdge,
  ReportExportFormat,
  CreateReportDto,
  Evidence,
  TaskStatus,
} from '@shared/types';

function buildCaseSummary(caseId: string): ReportCaseSummary {
  const caseData = CaseRepository.findById(caseId);
  if (!caseData) {
    throw new Error(`案件不存在: ${caseId}`);
  }

  const evidence = EvidenceRepository.findByCaseId(caseId);
  const connections = ConnectionRepository.findByCaseId(caseId);
  const collaborators = CollaboratorRepository.findByCaseId(caseId);
  const tasks = InvestigationTaskRepository.findByCaseId(caseId);

  const evidenceByImportance: Record<Evidence['importance'], number> = {
    low: 0,
    normal: 0,
    high: 0,
    critical: 0,
  };
  const evidenceByStatus: Record<TaskStatus, number> = {
    pending: 0,
    in_progress: 0,
    completed: 0,
    reviewed: 0,
  };

  evidence.forEach((e) => {
    evidenceByImportance[e.importance]++;
    evidenceByStatus[e.status]++;
  });

  return {
    caseId: caseData.id,
    caseName: caseData.name,
    caseDescription: caseData.description,
    caseStatus: caseData.status,
    keyClues: caseData.keyClues,
    totalEvidence: evidence.length,
    totalConnections: connections.length,
    totalTasks: tasks.length,
    evidenceByImportance,
    evidenceByStatus,
    collaborators: collaborators.map((c) => ({
      id: c.id,
      name: c.name,
      role: c.role,
    })),
  };
}

function buildRelationshipGraph(caseId: string): ReportRelationshipGraph {
  const evidence = EvidenceRepository.findByCaseId(caseId);
  const connections = ConnectionRepository.findByCaseId(caseId);

  const evidenceMap = new Map<string, Evidence>();
  evidence.forEach((e) => evidenceMap.set(e.id, e));

  const nodes: ReportEvidenceSummary[] = evidence.map((e) => ({
    id: e.id,
    content: e.content,
    source: e.source,
    importance: e.importance,
    tags: e.tags,
    status: e.status,
    timestamp: e.timestamp || e.createdAt,
    assignedTo: e.assignedTo,
  }));

  const edges: ReportRelationshipEdge[] = connections
    .map((c) => {
      const fromEv = evidenceMap.get(c.fromEvidenceId);
      const toEv = evidenceMap.get(c.toEvidenceId);
      return {
        fromEvidenceId: c.fromEvidenceId,
        toEvidenceId: c.toEvidenceId,
        label: c.label,
        fromContent: fromEv ? fromEv.content.slice(0, 40) : c.fromEvidenceId,
        toContent: toEv ? toEv.content.slice(0, 40) : c.toEvidenceId,
      };
    });

  return { nodes, edges };
}

function buildTimeline(caseId: string): ReportTimelineEntry[] {
  const entries: ReportTimelineEntry[] = [];

  const evidence = EvidenceRepository.findByCaseId(caseId);
  evidence.forEach((e) => {
    entries.push({
      timestamp: e.timestamp || e.createdAt,
      type: 'evidence',
      title: e.content.slice(0, 50),
      description: `[${e.importance}] ${e.source} - ${e.content.slice(0, 100)}`,
      referenceId: e.id,
    });
  });

  const connections = ConnectionRepository.findByCaseId(caseId);
  connections.forEach((c) => {
    entries.push({
      timestamp: c.createdAt,
      type: 'connection',
      title: c.label || '关联',
      description: `建立关联: ${c.fromEvidenceId} → ${c.toEvidenceId}`,
      referenceId: c.id,
    });
  });

  const auditLogs = AuditLogRepository.findByCaseId(caseId);
  auditLogs.forEach((al) => {
    entries.push({
      timestamp: al.createdAt,
      type: 'audit',
      title: al.detail.slice(0, 50),
      description: `${al.collaboratorName} - ${al.action}: ${al.detail}`,
      referenceId: al.id,
    });
  });

  const tasks = InvestigationTaskRepository.findByCaseId(caseId);
  tasks.forEach((t) => {
    entries.push({
      timestamp: t.createdAt,
      type: 'task',
      title: t.title,
      description: `${t.priority}优先级 / ${t.status} / ${t.assigneeName ?? '未分配'}`,
      referenceId: t.id,
    });
  });

  entries.sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  return entries;
}

function buildTaskSummaries(caseId: string): ReportTaskSummary[] {
  const tasks = InvestigationTaskRepository.findByCaseId(caseId);
  return tasks.map((t) => ({
    id: t.id,
    title: t.title,
    priority: t.priority,
    status: t.status,
    assigneeName: t.assigneeName,
    deadline: t.deadline,
  }));
}

function generateJsonExport(report: Report): string {
  return JSON.stringify({
    reportInfo: {
      id: report.id,
      title: report.title,
      generatedAt: report.generatedAt,
      exportedAt: new Date().toISOString(),
      format: 'json',
    },
    caseSummary: report.caseSummary,
    relationshipGraph: report.relationshipGraph,
    timeline: report.timeline,
    taskSummaries: report.taskSummaries,
  }, null, 2);
}

function generateMarkdownExport(report: Report): string {
  const lines: string[] = [];
  const s = report.caseSummary;

  lines.push(`# ${report.title}`);
  lines.push('');
  lines.push(`> 生成时间: ${report.generatedAt ?? 'N/A'}`);
  lines.push(`> 导出时间: ${new Date().toISOString()}`);
  lines.push('');

  lines.push('## 一、案件概要');
  lines.push('');
  lines.push(`- **案件名称**: ${s.caseName}`);
  lines.push(`- **案件状态**: ${s.caseStatus}`);
  lines.push(`- **案件描述**: ${s.caseDescription}`);
  lines.push(`- **关键线索**: ${s.keyClues.join('、') || '无'}`);
  lines.push(`- **证据总数**: ${s.totalEvidence}`);
  lines.push(`- **关联总数**: ${s.totalConnections}`);
  lines.push(`- **侦查任务**: ${s.totalTasks}`);
  lines.push('');

  lines.push('### 证据重要性分布');
  lines.push('');
  for (const [level, count] of Object.entries(s.evidenceByImportance)) {
    if (count > 0) lines.push(`- ${level}: ${count}`);
  }
  lines.push('');

  lines.push('### 证据状态分布');
  lines.push('');
  for (const [status, count] of Object.entries(s.evidenceByStatus)) {
    if (count > 0) lines.push(`- ${status}: ${count}`);
  }
  lines.push('');

  lines.push('### 参与人员');
  lines.push('');
  s.collaborators.forEach((c) => {
    lines.push(`- ${c.name} (${c.role})`);
  });
  lines.push('');

  lines.push('## 二、关系图谱');
  lines.push('');
  lines.push('### 证据节点');
  lines.push('');
  report.relationshipGraph.nodes.forEach((n, i) => {
    lines.push(`${i + 1}. **[${n.importance}]** ${n.content.slice(0, 80)}`);
    lines.push(`   - 来源: ${n.source} | 状态: ${n.status} | 标签: ${n.tags.join(', ') || '无'}`);
  });
  lines.push('');

  lines.push('### 关联关系');
  lines.push('');
  report.relationshipGraph.edges.forEach((e, i) => {
    lines.push(`${i + 1}. **${e.label}**: ${e.fromContent.slice(0, 30)} → ${e.toContent.slice(0, 30)}`);
  });
  lines.push('');

  lines.push('## 三、时间线摘要');
  lines.push('');
  report.timeline.forEach((entry) => {
    const typeLabel = { evidence: '证据', connection: '关联', audit: '操作', task: '任务' }[entry.type];
    lines.push(`- **[${entry.timestamp}]** [${typeLabel}] ${entry.title}`);
    lines.push(`  ${entry.description}`);
  });
  lines.push('');

  lines.push('## 四、侦查任务汇总');
  lines.push('');
  report.taskSummaries.forEach((t) => {
    const deadlineStr = t.deadline ? ` | 截止: ${t.deadline}` : '';
    lines.push(`- **[${t.priority}]** ${t.title} — ${t.status} / ${t.assigneeName ?? '未分配'}${deadlineStr}`);
  });
  lines.push('');

  return lines.join('\n');
}

function generateHtmlExport(report: Report): string {
  const s = report.caseSummary;
  const esc = (str: string) => str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  const importanceColor: Record<string, string> = {
    critical: '#dc2626',
    high: '#ef4444',
    normal: '#3b82f6',
    low: '#6b7280',
  };

  const statusLabel: Record<string, string> = {
    pending: '待处理',
    in_progress: '进行中',
    completed: '已完成',
    reviewed: '已审核',
  };

  let html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${esc(report.title)}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: -apple-system, "Microsoft YaHei", sans-serif; background: #0a0a0f; color: #e0e0e0; padding: 40px; line-height: 1.6; }
  .container { max-width: 960px; margin: 0 auto; }
  h1 { color: #00f0ff; font-size: 24px; margin-bottom: 8px; border-bottom: 2px solid #00f0ff33; padding-bottom: 12px; }
  h2 { color: #9945ff; font-size: 18px; margin: 32px 0 16px; border-left: 4px solid #9945ff; padding-left: 12px; }
  h3 { color: #00f0ff; font-size: 14px; margin: 16px 0 8px; }
  .meta { color: #6b7280; font-size: 12px; margin-bottom: 24px; }
  .stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin: 16px 0; }
  .stat-card { background: #1a1a2e; border: 1px solid #2a2a3e; border-radius: 6px; padding: 16px; text-align: center; }
  .stat-card .number { font-size: 28px; font-weight: bold; color: #00f0ff; }
  .stat-card .label { font-size: 12px; color: #6b7280; }
  .badge { display: inline-block; padding: 2px 8px; border-radius: 3px; font-size: 11px; font-weight: bold; margin-right: 4px; }
  .badge-critical { background: #dc262633; color: #dc2626; border: 1px solid #dc262655; }
  .badge-high { background: #ef444433; color: #ef4444; border: 1px solid #ef444455; }
  .badge-normal { background: #3b82f633; color: #3b82f6; border: 1px solid #3b82f655; }
  .badge-low { background: #6b728033; color: #6b7280; border: 1px solid #6b728055; }
  table { width: 100%; border-collapse: collapse; margin: 12px 0; font-size: 13px; }
  th { background: #1a1a2e; color: #00f0ff; padding: 8px 12px; text-align: left; border-bottom: 1px solid #2a2a3e; }
  td { padding: 8px 12px; border-bottom: 1px solid #1a1a2e; }
  tr:hover { background: #1a1a2e44; }
  .timeline-item { padding: 8px 0; border-left: 2px solid #2a2a3e; padding-left: 16px; margin-left: 8px; }
  .timeline-item .ts { color: #00f0ff; font-size: 12px; font-family: monospace; }
  .timeline-item .type { color: #9945ff; font-size: 11px; }
  .timeline-item .desc { color: #9ca3af; font-size: 12px; }
  .section-divider { border: none; border-top: 1px solid #2a2a3e; margin: 24px 0; }
  .clue-tag { display: inline-block; background: #9945ff22; color: #9945ff; border: 1px solid #9945ff44; padding: 2px 8px; border-radius: 3px; font-size: 11px; margin: 2px; }
  .collab-row td { color: #d1d5db; }
  .edge-row td { color: #9ca3af; }
  .task-row td { color: #d1d5db; }
</style>
</head>
<body>
<div class="container">
  <h1>${esc(report.title)}</h1>
  <div class="meta">生成时间: ${report.generatedAt ?? 'N/A'} | 导出时间: ${new Date().toISOString()}</div>

  <h2>一、案件概要</h2>
  <p><strong>案件名称:</strong> ${esc(s.caseName)}</p>
  <p><strong>案件状态:</strong> ${statusLabel[s.caseStatus] ?? s.caseStatus}</p>
  <p><strong>案件描述:</strong> ${esc(s.caseDescription)}</p>
  <p><strong>关键线索:</strong> ${s.keyClues.map((c) => `<span class="clue-tag">${esc(c)}</span>`).join(' ') || '无'}</p>

  <div class="stats">
    <div class="stat-card"><div class="number">${s.totalEvidence}</div><div class="label">证据总数</div></div>
    <div class="stat-card"><div class="number">${s.totalConnections}</div><div class="label">关联总数</div></div>
    <div class="stat-card"><div class="number">${s.totalTasks}</div><div class="label">侦查任务</div></div>
  </div>

  <h3>证据重要性分布</h3>
  <table>
    <tr><th>重要性</th><th>数量</th></tr>
    ${Object.entries(s.evidenceByImportance).filter(([, v]) => v > 0).map(([k, v]) => `<tr><td><span class="badge badge-${k}">${k}</span></td><td>${v}</td></tr>`).join('')}
  </table>

  <h3>证据状态分布</h3>
  <table>
    <tr><th>状态</th><th>数量</th></tr>
    ${Object.entries(s.evidenceByStatus).filter(([, v]) => v > 0).map(([k, v]) => `<tr><td>${statusLabel[k] ?? k}</td><td>${v}</td></tr>`).join('')}
  </table>

  <h3>参与人员</h3>
  <table>
    <tr><th>姓名</th><th>角色</th></tr>
    ${s.collaborators.map((c) => `<tr class="collab-row"><td>${esc(c.name)}</td><td>${c.role}</td></tr>`).join('')}
  </table>

  <hr class="section-divider">
  <h2>二、关系图谱</h2>

  <h3>证据节点 (${report.relationshipGraph.nodes.length})</h3>
  <table>
    <tr><th>#</th><th>重要性</th><th>内容</th><th>来源</th><th>状态</th><th>标签</th></tr>
    ${report.relationshipGraph.nodes.map((n, i) => `<tr><td>${i + 1}</td><td><span class="badge badge-${n.importance}">${n.importance}</span></td><td>${esc(n.content.slice(0, 60))}</td><td>${esc(n.source)}</td><td>${statusLabel[n.status] ?? n.status}</td><td>${n.tags.map((t) => `<span class="clue-tag">${esc(t)}</span>`).join(' ')}</td></tr>`).join('')}
  </table>

  <h3>关联关系 (${report.relationshipGraph.edges.length})</h3>
  <table>
    <tr><th>#</th><th>标签</th><th>起点</th><th>终点</th></tr>
    ${report.relationshipGraph.edges.map((e, i) => `<tr class="edge-row"><td>${i + 1}</td><td><strong>${esc(e.label)}</strong></td><td>${esc(e.fromContent.slice(0, 40))}</td><td>${esc(e.toContent.slice(0, 40))}</td></tr>`).join('')}
  </table>

  <hr class="section-divider">
  <h2>三、时间线摘要</h2>
  ${report.timeline.map((entry) => {
    const typeLabel = { evidence: '证据', connection: '关联', audit: '操作', task: '任务' }[entry.type];
    return `<div class="timeline-item">
      <div class="ts">${entry.timestamp}</div>
      <div><span class="type">[${typeLabel}]</span> <strong>${esc(entry.title)}</strong></div>
      <div class="desc">${esc(entry.description)}</div>
    </div>`;
  }).join('')}

  <hr class="section-divider">
  <h2>四、侦查任务汇总</h2>
  <table>
    <tr><th>优先级</th><th>标题</th><th>状态</th><th>负责人</th><th>截止日期</th></tr>
    ${report.taskSummaries.map((t) => `<tr class="task-row"><td><span class="badge badge-${t.priority}">${t.priority}</span></td><td>${esc(t.title)}</td><td>${statusLabel[t.status] ?? t.status}</td><td>${t.assigneeName ?? '未分配'}</td><td>${t.deadline ?? '-'}</td></tr>`).join('')}
  </table>
</div>
</body>
</html>`;

  return html;
}

export const ReportService = {
  getAllReports: (): Report[] => {
    return ReportRepository.findAll();
  },

  getReportsByCaseId: (caseId: string): Report[] => {
    return ReportRepository.findByCaseId(caseId);
  },

  getReportById: (id: string): Report | null => {
    return ReportRepository.findById(id);
  },

  generateReport: (dto: CreateReportDto): Report => {
    const caseData = CaseRepository.findById(dto.caseId);
    if (!caseData) {
      throw new Error(`案件不存在: ${dto.caseId}`);
    }

    const caseSummary = buildCaseSummary(dto.caseId);
    const relationshipGraph = buildRelationshipGraph(dto.caseId);
    const timeline = buildTimeline(dto.caseId);
    const taskSummaries = buildTaskSummaries(dto.caseId);

    return ReportRepository.create(
      dto,
      caseSummary,
      relationshipGraph,
      timeline,
      taskSummaries,
    );
  },

  regenerateReport: (id: string): Report | null => {
    const existing = ReportRepository.findById(id);
    if (!existing) return null;

    const caseSummary = buildCaseSummary(existing.caseId);
    const relationshipGraph = buildRelationshipGraph(existing.caseId);
    const timeline = buildTimeline(existing.caseId);
    const taskSummaries = buildTaskSummaries(existing.caseId);

    const now = new Date().toISOString();
    db.prepare(
      'UPDATE reports SET case_summary = ?, relationship_graph = ?, timeline = ?, task_summaries = ?, generated_at = ?, updated_at = ? WHERE id = ?'
    ).run(
      JSON.stringify(caseSummary),
      JSON.stringify(relationshipGraph),
      JSON.stringify(timeline),
      JSON.stringify(taskSummaries),
      now,
      now,
      id,
    );

    return ReportRepository.findById(id);
  },

  exportReport: (id: string, format: ReportExportFormat): Report | null => {
    const report = ReportRepository.findById(id);
    if (!report) return null;

    let content: string;
    switch (format) {
      case 'markdown':
        content = generateMarkdownExport(report);
        break;
      case 'html':
        content = generateHtmlExport(report);
        break;
      case 'json':
      default:
        content = generateJsonExport(report);
        break;
    }

    return ReportRepository.updateExportedContent(id, content, format);
  },

  deleteReport: (id: string): boolean => {
    return ReportRepository.delete(id);
  },
};
