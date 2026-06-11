import { CaseRepository } from '../repositories/CaseRepository.js';
import { EvidenceRepository } from '../repositories/EvidenceRepository.js';
import { ConnectionRepository } from '../repositories/ConnectionRepository.js';
import { ConnectionGroupRepository } from '../repositories/ConnectionGroupRepository.js';
import { CaseSnapshotRepository } from '../repositories/CaseSnapshotRepository.js';
import type {
  CaseSnapshot,
  CaseSnapshotExportFormat,
  CreateCaseSnapshotDto,
  UpdateCaseSnapshotDto,
  Evidence,
  Connection,
  ConnectionGroup,
} from '@shared/types';

function generateJsonExport(snapshot: CaseSnapshot): string {
  return JSON.stringify({
    snapshotInfo: {
      id: snapshot.id,
      title: snapshot.title,
      description: snapshot.description,
      caseId: snapshot.caseId,
      caseName: snapshot.caseName,
      createdBy: snapshot.createdByName,
      createdAt: snapshot.createdAt,
      exportedAt: new Date().toISOString(),
      format: 'json',
    },
    filterState: snapshot.filterState,
    canvasLayout: {
      zoom: snapshot.canvasLayout.zoom,
      panX: snapshot.canvasLayout.panX,
      panY: snapshot.canvasLayout.panY,
      visibleConnectionIds: snapshot.canvasLayout.visibleConnectionIds,
      hiddenConnectionIds: snapshot.canvasLayout.hiddenConnectionIds,
      timeRangeFilter: snapshot.canvasLayout.timeRangeFilter,
      timelineMode: snapshot.canvasLayout.timelineMode,
      evidencePositions: snapshot.canvasLayout.evidencePositions,
    },
    relationshipNotes: snapshot.relationshipNotes,
    evidence: snapshot.evidence,
    connections: snapshot.connections,
    connectionGroups: snapshot.connectionGroups,
  }, null, 2);
}

function generateMarkdownExport(snapshot: CaseSnapshot): string {
  const lines: string[] = [];

  lines.push(`# ${snapshot.title}`);
  lines.push('');
  lines.push(`> 案件: ${snapshot.caseName}`);
  lines.push(`> 创建人: ${snapshot.createdByName}`);
  lines.push(`> 创建时间: ${snapshot.createdAt}`);
  lines.push(`> 导出时间: ${new Date().toISOString()}`);
  lines.push('');

  if (snapshot.description) {
    lines.push('## 快照说明');
    lines.push('');
    lines.push(snapshot.description);
    lines.push('');
  }

  lines.push('## 一、当前筛选结果');
  lines.push('');
  const fs = snapshot.filterState;
  lines.push(`- **关键词**: ${fs.keyword || '无'}`);
  lines.push(`- **标签筛选**: ${fs.tags.length > 0 ? fs.tags.join(', ') : '无'}`);
  lines.push(`- **重要性筛选**: ${fs.importance || '全部'}`);
  lines.push(`- **匹配证据数**: ${fs.matchedEvidenceIds.length}`);
  lines.push('');

  if (fs.matchedEvidenceIds.length > 0) {
    lines.push('### 匹配证据列表');
    lines.push('');
    fs.matchedEvidenceIds.forEach((id, idx) => {
      const ev = snapshot.evidence.find((e) => e.id === id);
      if (ev) {
        lines.push(`${idx + 1}. **[${ev.importance}]** ${ev.content.slice(0, 60)}`);
        lines.push(`   - 来源: ${ev.source} | 标签: ${ev.tags.join(', ') || '无'}`);
      }
    });
    lines.push('');
  }

  lines.push('## 二、画布布局');
  lines.push('');
  const cl = snapshot.canvasLayout;
  lines.push(`- **缩放比例**: ${Math.round(cl.zoom * 100)}%`);
  lines.push(`- **视图偏移**: X=${cl.panX.toFixed(0)}, Y=${cl.panY.toFixed(0)}`);
  lines.push(`- **时间线模式**: ${cl.timelineMode ? '开启' : '关闭'}`);
  if (cl.timeRangeFilter.start || cl.timeRangeFilter.end) {
    lines.push(`- **时间范围**: ${cl.timeRangeFilter.start || '开始'} ~ ${cl.timeRangeFilter.end || '结束'}`);
  }
  lines.push(`- **可见连线数**: ${cl.visibleConnectionIds ? cl.visibleConnectionIds.length : '全部'}`);
  lines.push(`- **隐藏连线数**: ${cl.hiddenConnectionIds.length}`);
  lines.push('');

  lines.push('### 证据位置布局');
  lines.push('');
  lines.push('| # | 证据ID | 内容 | 位置(X,Y) | 尺寸(W×H) |');
  lines.push('|---|--------|------|-----------|-----------|');
  cl.evidencePositions.forEach((pos, idx) => {
    const ev = snapshot.evidence.find((e) => e.id === pos.evidenceId);
    const content = ev ? ev.content.slice(0, 30) : pos.evidenceId;
    lines.push(`| ${idx + 1} | ${pos.evidenceId.slice(0, 8)} | ${content} | (${pos.positionX}, ${pos.positionY}) | ${pos.width}×${pos.height} |`);
  });
  lines.push('');

  lines.push('## 三、关系说明');
  lines.push('');
  if (snapshot.relationshipNotes.length === 0) {
    lines.push('暂无关系说明备注。');
    lines.push('');
  } else {
    snapshot.relationshipNotes.forEach((note, idx) => {
      lines.push(`### ${idx + 1}. ${note.label}`);
      lines.push('');
      lines.push(`- **连线ID**: ${note.connectionId.slice(0, 8)}`);
      lines.push(`- **起点**: ${note.fromEvidenceContent.slice(0, 40)}`);
      lines.push(`- **终点**: ${note.toEvidenceContent.slice(0, 40)}`);
      lines.push(`- **说明**: ${note.description}`);
      lines.push('');
    });
  }

  lines.push('## 四、证据列表');
  lines.push('');
  lines.push('| # | 重要性 | 内容 | 来源 | 状态 | 标签 |');
  lines.push('|---|--------|------|------|------|------|');
  snapshot.evidence.forEach((ev, idx) => {
    lines.push(`| ${idx + 1} | ${ev.importance} | ${ev.content.slice(0, 40)} | ${ev.source} | ${ev.status} | ${ev.tags.join(', ') || '-'} |`);
  });
  lines.push('');

  lines.push('## 五、关系连线');
  lines.push('');
  lines.push('| # | 标签 | 起点 → 终点 |');
  lines.push('|---|------|-------------|');
  snapshot.connections.forEach((conn, idx) => {
    const fromEv = snapshot.evidence.find((e) => e.id === conn.fromEvidenceId);
    const toEv = snapshot.evidence.find((e) => e.id === conn.toEvidenceId);
    const fromContent = fromEv ? fromEv.content.slice(0, 20) : conn.fromEvidenceId;
    const toContent = toEv ? toEv.content.slice(0, 20) : conn.toEvidenceId;
    lines.push(`| ${idx + 1} | ${conn.label || '-'} | ${fromContent} → ${toContent} |`);
  });
  lines.push('');

  if (snapshot.connectionGroups.length > 0) {
    lines.push('## 六、关系分组');
    lines.push('');
    snapshot.connectionGroups.forEach((g, idx) => {
      lines.push(`${idx + 1}. **${g.name}** (${g.connectionIds.length}条连线, ${g.visible ? '可见' : '隐藏'})`);
    });
    lines.push('');
  }

  return lines.join('\n');
}

function generateHtmlExport(snapshot: CaseSnapshot): string {
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
<title>${esc(snapshot.title)}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: -apple-system, "Microsoft YaHei", sans-serif; background: #0a0a0f; color: #e0e0e0; padding: 40px; line-height: 1.6; }
  .container { max-width: 1000px; margin: 0 auto; }
  h1 { color: #00f0ff; font-size: 26px; margin-bottom: 8px; border-bottom: 2px solid #00f0ff33; padding-bottom: 12px; }
  h2 { color: #9945ff; font-size: 18px; margin: 28px 0 14px; border-left: 4px solid #9945ff; padding-left: 12px; }
  h3 { color: #00f0ff; font-size: 14px; margin: 14px 0 8px; }
  .meta { color: #6b7280; font-size: 12px; margin-bottom: 20px; }
  .meta span { margin-right: 16px; }
  .description-box { background: #1a1a2e; border: 1px solid #2a2a3e; border-radius: 6px; padding: 16px; margin: 12px 0; color: #d1d5db; font-size: 13px; }
  .badge { display: inline-block; padding: 2px 8px; border-radius: 3px; font-size: 11px; font-weight: bold; margin-right: 4px; }
  .badge-critical { background: #dc262633; color: #dc2626; border: 1px solid #dc262655; }
  .badge-high { background: #ef444433; color: #ef4444; border: 1px solid #ef444455; }
  .badge-normal { background: #3b82f633; color: #3b82f6; border: 1px solid #3b82f655; }
  .badge-low { background: #6b728033; color: #6b7280; border: 1px solid #6b728055; }
  .tag { display: inline-block; background: #9945ff22; color: #9945ff; border: 1px solid #9945ff44; padding: 2px 8px; border-radius: 3px; font-size: 11px; margin: 2px; }
  table { width: 100%; border-collapse: collapse; margin: 12px 0; font-size: 13px; }
  th { background: #1a1a2e; color: #00f0ff; padding: 8px 12px; text-align: left; border-bottom: 1px solid #2a2a3e; }
  td { padding: 8px 12px; border-bottom: 1px solid #1a1a2e; vertical-align: top; }
  tr:hover { background: #1a1a2e44; }
  .section-divider { border: none; border-top: 1px solid #2a2a3e; margin: 20px 0; }
  .stats-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin: 12px 0; }
  .stat-card { background: #1a1a2e; border: 1px solid #2a2a3e; border-radius: 6px; padding: 14px; text-align: center; }
  .stat-card .number { font-size: 24px; font-weight: bold; color: #00f0ff; }
  .stat-card .label { font-size: 12px; color: #6b7280; margin-top: 4px; }
  .note-card { background: #1a1a2e; border: 1px solid #2a2a3e; border-left: 3px solid #00f0ff; border-radius: 4px; padding: 12px; margin: 8px 0; }
  .note-card .note-label { color: #00f0ff; font-size: 13px; font-weight: bold; margin-bottom: 6px; }
  .note-card .note-meta { color: #6b7280; font-size: 11px; margin-bottom: 6px; }
  .note-card .note-desc { color: #d1d5db; font-size: 13px; }
</style>
</head>
<body>
<div class="container">
  <h1>${esc(snapshot.title)}</h1>
  <div class="meta">
    <span>📁 案件: ${esc(snapshot.caseName)}</span>
    <span>👤 创建人: ${esc(snapshot.createdByName)}</span>
    <span>🕐 创建时间: ${snapshot.createdAt}</span>
    <span>📤 导出时间: ${new Date().toISOString()}</span>
  </div>

  ${snapshot.description ? `<div class="description-box">${esc(snapshot.description)}</div>` : ''}

  <hr class="section-divider">
  <h2>一、当前筛选结果</h2>

  <div class="stats-grid">
    <div class="stat-card"><div class="number">${snapshot.filterState.matchedEvidenceIds.length}</div><div class="label">匹配证据数</div></div>
    <div class="stat-card"><div class="number">${snapshot.filterState.tags.length}</div><div class="label">筛选标签数</div></div>
    <div class="stat-card"><div class="number">${snapshot.filterState.keyword ? '有' : '无'}</div><div class="label">关键词</div></div>
  </div>

  <table>
    <tr><th style="width: 100px;">筛选条件</th><th>值</th></tr>
    <tr><td>关键词</td><td>${esc(snapshot.filterState.keyword || '无')}</td></tr>
    <tr><td>标签筛选</td><td>${snapshot.filterState.tags.length > 0 ? snapshot.filterState.tags.map((t) => `<span class="tag">#${esc(t)}</span>`).join(' ') : '无'}</td></tr>
    <tr><td>重要性</td><td>${snapshot.filterState.importance ? `<span class="badge badge-${snapshot.filterState.importance}">${snapshot.filterState.importance}</span>` : '全部'}</td></tr>
  </table>

  ${
    snapshot.filterState.matchedEvidenceIds.length > 0
      ? `<h3>匹配证据列表</h3><table>
    <tr><th>#</th><th>重要性</th><th>内容</th><th>来源</th><th>标签</th></tr>
    ${snapshot.filterState.matchedEvidenceIds
      .map((id, idx) => {
        const ev = snapshot.evidence.find((e) => e.id === id);
        if (!ev) return '';
        return `<tr><td>${idx + 1}</td><td><span class="badge badge-${ev.importance}">${ev.importance}</span></td><td>${esc(ev.content.slice(0, 60))}</td><td>${esc(ev.source)}</td><td>${ev.tags.map((t) => `<span class="tag">#${esc(t)}</span>`).join(' ') || '-'}</td></tr>`;
      })
      .join('')}
  </table>`
      : ''
  }

  <hr class="section-divider">
  <h2>二、画布布局</h2>

  <table>
    <tr><th style="width: 160px;">布局参数</th><th>值</th></tr>
    <tr><td>缩放比例</td><td>${Math.round(snapshot.canvasLayout.zoom * 100)}%</td></tr>
    <tr><td>视图偏移</td><td>X: ${snapshot.canvasLayout.panX.toFixed(0)}, Y: ${snapshot.canvasLayout.panY.toFixed(0)}</td></tr>
    <tr><td>时间线模式</td><td>${snapshot.canvasLayout.timelineMode ? '✅ 开启' : '❌ 关闭'}</td></tr>
    <tr><td>时间范围过滤</td><td>${
      snapshot.canvasLayout.timeRangeFilter.start || snapshot.canvasLayout.timeRangeFilter.end
        ? `${snapshot.canvasLayout.timeRangeFilter.start || '开始'} ~ ${snapshot.canvasLayout.timeRangeFilter.end || '结束'}`
        : '未设置'
    }</td></tr>
    <tr><td>可见连线</td><td>${snapshot.canvasLayout.visibleConnectionIds ? snapshot.canvasLayout.visibleConnectionIds.length + ' 条' : '全部'}</td></tr>
    <tr><td>隐藏连线</td><td>${snapshot.canvasLayout.hiddenConnectionIds.length} 条</td></tr>
  </table>

  <h3>证据位置布局</h3>
  <table>
    <tr><th>#</th><th>证据ID</th><th>内容</th><th>位置 (X, Y)</th><th>尺寸</th></tr>
    ${snapshot.canvasLayout.evidencePositions
      .map((pos, idx) => {
        const ev = snapshot.evidence.find((e) => e.id === pos.evidenceId);
        const content = ev ? ev.content.slice(0, 40) : pos.evidenceId;
        return `<tr><td>${idx + 1}</td><td style="font-family: monospace; font-size: 11px;">${pos.evidenceId.slice(0, 8)}</td><td>${esc(content)}</td><td>(${pos.positionX}, ${pos.positionY})</td><td>${pos.width} × ${pos.height}</td></tr>`;
      })
      .join('')}
  </table>

  <hr class="section-divider">
  <h2>三、关系说明</h2>

  ${
    snapshot.relationshipNotes.length === 0
      ? '<p style="color: #6b7280; font-size: 13px;">暂无关系说明备注。</p>'
      : snapshot.relationshipNotes
          .map(
            (note, idx) => `<div class="note-card">
        <div class="note-label">${idx + 1}. ${esc(note.label)}</div>
        <div class="note-meta">
          <span style="margin-right: 12px;">起点: ${esc(note.fromEvidenceContent.slice(0, 30))}</span>
          <span>终点: ${esc(note.toEvidenceContent.slice(0, 30))}</span>
        </div>
        <div class="note-desc">${esc(note.description)}</div>
      </div>`
          )
          .join('')
  }

  <hr class="section-divider">
  <h2>四、证据列表 (${snapshot.evidence.length})</h2>
  <table>
    <tr><th>#</th><th>重要性</th><th>内容</th><th>来源</th><th>状态</th><th>标签</th></tr>
    ${snapshot.evidence
      .map(
        (ev, idx) => `<tr>
      <td>${idx + 1}</td>
      <td><span class="badge badge-${ev.importance}">${ev.importance}</span></td>
      <td>${esc(ev.content.slice(0, 50))}</td>
      <td>${esc(ev.source)}</td>
      <td>${statusLabel[ev.status] ?? ev.status}</td>
      <td>${ev.tags.map((t) => `<span class="tag">#${esc(t)}</span>`).join(' ') || '-'}</td>
    </tr>`
      )
      .join('')}
  </table>

  <hr class="section-divider">
  <h2>五、关系连线 (${snapshot.connections.length})</h2>
  <table>
    <tr><th>#</th><th>标签</th><th>起点证据</th><th>终点证据</th></tr>
    ${snapshot.connections
      .map((conn, idx) => {
        const fromEv = snapshot.evidence.find((e) => e.id === conn.fromEvidenceId);
        const toEv = snapshot.evidence.find((e) => e.id === conn.toEvidenceId);
        const fromContent = fromEv ? fromEv.content.slice(0, 30) : conn.fromEvidenceId;
        const toContent = toEv ? toEv.content.slice(0, 30) : conn.toEvidenceId;
        return `<tr>
          <td>${idx + 1}</td>
          <td><strong style="color: ${conn.color};">${esc(conn.label || '-')}</strong></td>
          <td>${esc(fromContent)}</td>
          <td>${esc(toContent)}</td>
        </tr>`;
      })
      .join('')}
  </table>

  ${
    snapshot.connectionGroups.length > 0
      ? `<hr class="section-divider">
  <h2>六、关系分组 (${snapshot.connectionGroups.length})</h2>
  <table>
    <tr><th>#</th><th>分组名称</th><th>连线数</th><th>可见性</th></tr>
    ${snapshot.connectionGroups
      .map(
        (g, idx) => `<tr>
      <td>${idx + 1}</td>
      <td><strong style="color: ${g.color};">${esc(g.name)}</strong></td>
      <td>${g.connectionIds.length} 条</td>
      <td>${g.visible ? '✅ 可见' : '❌ 隐藏'}</td>
    </tr>`
      )
      .join('')}
  </table>`
      : ''
  }
</div>
</body>
</html>`;

  return html;
}

export const CaseSnapshotService = {
  getAllSnapshots: (): CaseSnapshot[] => {
    return CaseSnapshotRepository.findAll();
  },

  getSnapshotsByCaseId: (caseId: string): CaseSnapshot[] => {
    return CaseSnapshotRepository.findByCaseId(caseId);
  },

  getSnapshotById: (id: string): CaseSnapshot | null => {
    return CaseSnapshotRepository.findById(id);
  },

  createSnapshot: (dto: CreateCaseSnapshotDto): CaseSnapshot => {
    const caseData = CaseRepository.findById(dto.caseId);
    if (!caseData) {
      throw new Error(`案件不存在: ${dto.caseId}`);
    }

    const evidence = EvidenceRepository.findByCaseId(dto.caseId);
    const connections = ConnectionRepository.findByCaseId(dto.caseId);
    const connectionGroups = ConnectionGroupRepository.findByCaseId(dto.caseId);

    return CaseSnapshotRepository.create(
      dto,
      caseData.name,
      evidence as Evidence[],
      connections as Connection[],
      connectionGroups as ConnectionGroup[],
    );
  },

  updateSnapshot: (id: string, dto: UpdateCaseSnapshotDto): CaseSnapshot | null => {
    return CaseSnapshotRepository.update(id, dto);
  },

  exportSnapshot: (id: string, format: CaseSnapshotExportFormat): CaseSnapshot | null => {
    const snapshot = CaseSnapshotRepository.findById(id);
    if (!snapshot) return null;

    let validFormat: CaseSnapshotExportFormat;
    switch (format) {
      case 'markdown':
      case 'html':
        validFormat = format;
        break;
      case 'json':
      default:
        validFormat = 'json';
        break;
    }

    let content: string;
    switch (validFormat) {
      case 'markdown':
        content = generateMarkdownExport(snapshot);
        break;
      case 'html':
        content = generateHtmlExport(snapshot);
        break;
      case 'json':
      default:
        content = generateJsonExport(snapshot);
        break;
    }

    return CaseSnapshotRepository.updateExportedContent(id, content, validFormat);
  },

  deleteSnapshot: (id: string): boolean => {
    return CaseSnapshotRepository.delete(id);
  },
};
