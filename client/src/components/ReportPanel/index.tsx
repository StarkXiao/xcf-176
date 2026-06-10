import React, { useEffect, useState } from 'react';
import {
  FileText,
  X,
  Plus,
  RefreshCw,
  Download,
  Trash2,
  ChevronDown,
  ChevronRight,
  Users,
  GitBranch,
  Clock,
  ClipboardList,
  AlertTriangle,
  CheckCircle,
} from 'lucide-react';
import { useReportStore } from '@/store/useReportStore';
import { useCaseStore } from '@/store/useCaseStore';
import { useUiStore } from '@/store/useUiStore';
import { CYBERPUNK_COLORS, getGlowColor, IMPORTANCE_COLORS } from '@/utils/colorUtils';
import type { Report, ReportExportFormat, ReportTimelineEntry } from '@/types';

const STATUS_LABELS: Record<string, string> = {
  draft: '草稿',
  generating: '生成中',
  completed: '已完成',
  exported: '已导出',
};

const STATUS_COLORS: Record<string, string> = {
  draft: CYBERPUNK_COLORS.textSecondary,
  generating: CYBERPUNK_COLORS.accentYellow,
  completed: CYBERPUNK_COLORS.accentGreen,
  exported: CYBERPUNK_COLORS.accentCyan,
};

const IMPORTANCE_LABELS: Record<string, string> = {
  critical: '紧急',
  high: '高',
  normal: '普通',
  low: '低',
};

const TYPE_ICONS: Record<string, React.ReactNode> = {
  evidence: <FileText size={12} />,
  connection: <GitBranch size={12} />,
  audit: <AlertTriangle size={12} />,
  task: <ClipboardList size={12} />,
};

const TYPE_LABELS: Record<string, string> = {
  evidence: '证据',
  connection: '关联',
  audit: '操作',
  task: '任务',
};

function formatTimestamp(ts: string): string {
  const d = new Date(ts);
  if (isNaN(d.getTime())) return ts;
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const mi = String(d.getMinutes()).padStart(2, '0');
  return `${mm}/${dd} ${hh}:${mi}`;
}

type TabKey = 'summary' | 'graph' | 'timeline' | 'tasks';

const TAB_CONFIG: Array<{ key: TabKey; label: string; icon: React.ReactNode }> = [
  { key: 'summary', label: '概要', icon: <FileText size={12} /> },
  { key: 'graph', label: '关系图谱', icon: <GitBranch size={12} /> },
  { key: 'timeline', label: '时间线', icon: <Clock size={12} /> },
  { key: 'tasks', label: '任务', icon: <ClipboardList size={12} /> },
];

function CaseSummarySection({ report }: { report: Report }) {
  const s = report.caseSummary;
  return (
    <div className="space-y-3">
      <div
        className="p-3 rounded-sm border"
        style={{
          borderColor: CYBERPUNK_COLORS.borderColor,
          backgroundColor: CYBERPUNK_COLORS.bgTertiary,
        }}
      >
        <div className="flex items-center gap-2 mb-2">
          <span
            className="text-xs font-mono px-1.5 py-0 rounded-sm"
            style={{
              color: STATUS_COLORS[s.caseStatus],
              backgroundColor: getGlowColor(STATUS_COLORS[s.caseStatus] || CYBERPUNK_COLORS.accentCyan, 0.1),
            }}
          >
            {STATUS_LABELS[s.caseStatus] ?? s.caseStatus}
          </span>
          <span className="text-sm font-mono font-bold" style={{ color: CYBERPUNK_COLORS.textPrimary }}>
            {s.caseName}
          </span>
        </div>
        <div className="text-xs font-mono mb-2" style={{ color: CYBERPUNK_COLORS.textSecondary }}>
          {s.caseDescription}
        </div>
        {s.keyClues.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {s.keyClues.map((clue) => (
              <span
                key={clue}
                className="text-xs font-mono px-1.5 py-0 rounded-sm"
                style={{
                  color: CYBERPUNK_COLORS.accentPurple,
                  backgroundColor: getGlowColor(CYBERPUNK_COLORS.accentPurple, 0.1),
                  border: `1px solid ${getGlowColor(CYBERPUNK_COLORS.accentPurple, 0.3)}`,
                }}
              >
                {clue}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-3 gap-2">
        <div
          className="p-2 rounded-sm border text-center"
          style={{
            borderColor: CYBERPUNK_COLORS.borderColor,
            backgroundColor: CYBERPUNK_COLORS.bgTertiary,
          }}
        >
          <div className="text-lg font-bold font-mono" style={{ color: CYBERPUNK_COLORS.accentCyan }}>
            {s.totalEvidence}
          </div>
          <div className="text-xs font-mono" style={{ color: CYBERPUNK_COLORS.textSecondary }}>
            证据
          </div>
        </div>
        <div
          className="p-2 rounded-sm border text-center"
          style={{
            borderColor: CYBERPUNK_COLORS.borderColor,
            backgroundColor: CYBERPUNK_COLORS.bgTertiary,
          }}
        >
          <div className="text-lg font-bold font-mono" style={{ color: CYBERPUNK_COLORS.accentPurple }}>
            {s.totalConnections}
          </div>
          <div className="text-xs font-mono" style={{ color: CYBERPUNK_COLORS.textSecondary }}>
            关联
          </div>
        </div>
        <div
          className="p-2 rounded-sm border text-center"
          style={{
            borderColor: CYBERPUNK_COLORS.borderColor,
            backgroundColor: CYBERPUNK_COLORS.bgTertiary,
          }}
        >
          <div className="text-lg font-bold font-mono" style={{ color: CYBERPUNK_COLORS.accentGreen }}>
            {s.totalTasks}
          </div>
          <div className="text-xs font-mono" style={{ color: CYBERPUNK_COLORS.textSecondary }}>
            任务
          </div>
        </div>
      </div>

      <div className="space-y-1.5">
        <div className="text-xs font-mono font-bold" style={{ color: CYBERPUNK_COLORS.accentCyan }}>
          重要性分布
        </div>
        {(['critical', 'high', 'normal', 'low'] as const).map((level) => {
          const count = s.evidenceByImportance[level];
          if (count === 0) return null;
          const total = s.totalEvidence || 1;
          const pct = Math.round((count / total) * 100);
          return (
            <div key={level} className="flex items-center gap-2">
              <span
                className="text-xs font-mono w-10"
                style={{ color: IMPORTANCE_COLORS[level] }}
              >
                {IMPORTANCE_LABELS[level]}
              </span>
              <div className="flex-1 h-2 rounded-full" style={{ backgroundColor: CYBERPUNK_COLORS.bgPrimary }}>
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${pct}%`,
                    backgroundColor: IMPORTANCE_COLORS[level],
                    boxShadow: `0 0 4px ${getGlowColor(IMPORTANCE_COLORS[level], 0.5)}`,
                  }}
                />
              </div>
              <span className="text-xs font-mono w-6 text-right" style={{ color: CYBERPUNK_COLORS.textSecondary }}>
                {count}
              </span>
            </div>
          );
        })}
      </div>

      {s.collaborators.length > 0 && (
        <div className="space-y-1.5">
          <div className="text-xs font-mono font-bold flex items-center gap-1" style={{ color: CYBERPUNK_COLORS.accentCyan }}>
            <Users size={12} />
            参与人员
          </div>
          {s.collaborators.map((c) => (
            <div
              key={c.id}
              className="flex items-center gap-2 px-2 py-1 rounded-sm"
              style={{ backgroundColor: CYBERPUNK_COLORS.bgTertiary }}
            >
              <span className="text-xs font-mono" style={{ color: CYBERPUNK_COLORS.textPrimary }}>{c.name}</span>
              <span className="text-xs font-mono" style={{ color: CYBERPUNK_COLORS.textSecondary }}>{c.role}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function RelationshipGraphSection({ report }: { report: Report }) {
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const graph = report.relationshipGraph;

  const toggleNode = (id: string) => {
    setExpandedNodes((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-mono" style={{ color: CYBERPUNK_COLORS.textSecondary }}>
          {graph.nodes.length} 节点 / {graph.edges.length} 关联
        </span>
      </div>

      {graph.nodes.length === 0 && (
        <div className="text-xs font-mono py-4 text-center" style={{ color: CYBERPUNK_COLORS.textSecondary }}>
          暂无证据节点
        </div>
      )}

      {graph.nodes.map((node) => {
        const isExpanded = expandedNodes.has(node.id);
        const connectedEdges = graph.edges.filter(
          (e) => e.fromEvidenceId === node.id || e.toEvidenceId === node.id
        );
        return (
          <div
            key={node.id}
            className="rounded-sm border"
            style={{
              borderColor: getGlowColor(IMPORTANCE_COLORS[node.importance], 0.3),
              backgroundColor: CYBERPUNK_COLORS.bgTertiary,
            }}
          >
            <button
              className="w-full flex items-center gap-2 px-2 py-1.5 text-left"
              onClick={() => toggleNode(node.id)}
            >
              {isExpanded ? <ChevronDown size={12} style={{ color: CYBERPUNK_COLORS.textSecondary }} /> : <ChevronRight size={12} style={{ color: CYBERPUNK_COLORS.textSecondary }} />}
              <span
                className="text-xs font-mono px-1 rounded-sm"
                style={{
                  color: IMPORTANCE_COLORS[node.importance],
                  backgroundColor: getGlowColor(IMPORTANCE_COLORS[node.importance], 0.1),
                }}
              >
                {IMPORTANCE_LABELS[node.importance]}
              </span>
              <span className="text-xs font-mono flex-1 truncate" style={{ color: CYBERPUNK_COLORS.textPrimary }}>
                {node.content.slice(0, 60)}
              </span>
              {connectedEdges.length > 0 && (
                <span className="text-xs font-mono" style={{ color: CYBERPUNK_COLORS.accentPurple }}>
                  {connectedEdges.length}关联
                </span>
              )}
            </button>
            {isExpanded && (
              <div className="px-3 pb-2 space-y-1">
                <div className="text-xs font-mono" style={{ color: CYBERPUNK_COLORS.textSecondary }}>
                  来源: {node.source}
                </div>
                <div className="text-xs font-mono" style={{ color: CYBERPUNK_COLORS.textSecondary }}>
                  状态: {STATUS_LABELS[node.status] ?? node.status}
                </div>
                {node.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {node.tags.map((tag) => (
                      <span
                        key={tag}
                        className="text-xs font-mono px-1 rounded-sm"
                        style={{
                          color: CYBERPUNK_COLORS.accentPurple,
                          backgroundColor: getGlowColor(CYBERPUNK_COLORS.accentPurple, 0.1),
                        }}
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
                {connectedEdges.length > 0 && (
                  <div className="mt-1 space-y-0.5">
                    <div className="text-xs font-mono font-bold" style={{ color: CYBERPUNK_COLORS.accentPurple }}>
                      关联关系:
                    </div>
                    {connectedEdges.map((edge) => {
                      const isFrom = edge.fromEvidenceId === node.id;
                      return (
                        <div key={`${edge.fromEvidenceId}-${edge.toEvidenceId}`} className="text-xs font-mono pl-2" style={{ color: CYBERPUNK_COLORS.textSecondary }}>
                          {isFrom ? '→' : '←'} {edge.label}: {isFrom ? edge.toContent.slice(0, 30) : edge.fromContent.slice(0, 30)}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function TimelineSection({ report }: { report: Report }) {
  const entries = report.timeline;
  return (
    <div className="space-y-1">
      {entries.length === 0 && (
        <div className="text-xs font-mono py-4 text-center" style={{ color: CYBERPUNK_COLORS.textSecondary }}>
          暂无时间线条目
        </div>
      )}
      {entries.map((entry: ReportTimelineEntry, idx: number) => {
        const typeColor: Record<string, string> = {
          evidence: CYBERPUNK_COLORS.accentCyan,
          connection: CYBERPUNK_COLORS.accentPurple,
          audit: CYBERPUNK_COLORS.accentYellow,
          task: CYBERPUNK_COLORS.accentGreen,
        };
        const color = typeColor[entry.type] ?? CYBERPUNK_COLORS.textSecondary;
        return (
          <div
            key={`${entry.referenceId}-${idx}`}
            className="flex gap-2 py-1.5 px-2 rounded-sm"
            style={{ borderLeft: `2px solid ${color}`, backgroundColor: CYBERPUNK_COLORS.bgTertiary }}
          >
            <div className="flex-shrink-0 mt-0.5" style={{ color }}>{TYPE_ICONS[entry.type]}</div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono" style={{ color: CYBERPUNK_COLORS.accentCyan }}>
                  {formatTimestamp(entry.timestamp)}
                </span>
                <span
                  className="text-xs font-mono px-1 rounded-sm"
                  style={{ color, backgroundColor: getGlowColor(color, 0.1) }}
                >
                  {TYPE_LABELS[entry.type]}
                </span>
              </div>
              <div className="text-xs font-mono truncate" style={{ color: CYBERPUNK_COLORS.textPrimary }}>
                {entry.title}
              </div>
              <div className="text-xs font-mono truncate" style={{ color: CYBERPUNK_COLORS.textSecondary }}>
                {entry.description}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function TaskSummarySection({ report }: { report: Report }) {
  const tasks = report.taskSummaries;
  return (
    <div className="space-y-2">
      {tasks.length === 0 && (
        <div className="text-xs font-mono py-4 text-center" style={{ color: CYBERPUNK_COLORS.textSecondary }}>
          暂无侦查任务
        </div>
      )}
      {tasks.map((t) => (
        <div
          key={t.id}
          className="p-2 rounded-sm border"
          style={{
            borderColor: getGlowColor(IMPORTANCE_COLORS[t.priority] ?? CYBERPUNK_COLORS.borderColor, 0.3),
            backgroundColor: CYBERPUNK_COLORS.bgTertiary,
          }}
        >
          <div className="flex items-center gap-2 mb-1">
            <span
              className="text-xs font-mono px-1 rounded-sm"
              style={{
                color: IMPORTANCE_COLORS[t.priority],
                backgroundColor: getGlowColor(IMPORTANCE_COLORS[t.priority], 0.1),
              }}
            >
              {IMPORTANCE_LABELS[t.priority]}
            </span>
            <span className="text-xs font-mono font-bold flex-1 truncate" style={{ color: CYBERPUNK_COLORS.textPrimary }}>
              {t.title}
            </span>
            {t.status === 'completed' && <CheckCircle size={12} style={{ color: CYBERPUNK_COLORS.accentGreen }} />}
          </div>
          <div className="flex items-center gap-3">
            <span
              className="text-xs font-mono px-1 rounded-sm"
              style={{
                color: STATUS_COLORS[t.status] ?? CYBERPUNK_COLORS.textSecondary,
                backgroundColor: getGlowColor(STATUS_COLORS[t.status] ?? CYBERPUNK_COLORS.borderColor, 0.1),
              }}
            >
              {STATUS_LABELS[t.status] ?? t.status}
            </span>
            <span className="text-xs font-mono" style={{ color: CYBERPUNK_COLORS.textSecondary }}>
              {t.assigneeName ?? '未分配'}
            </span>
            {t.deadline && (
              <span className="text-xs font-mono" style={{ color: CYBERPUNK_COLORS.accentYellow }}>
                截止: {formatTimestamp(t.deadline)}
              </span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

export const ReportPanel: React.FC = () => {
  const currentCase = useCaseStore((s) => s.currentCase);
  const toggleReportPanel = useUiStore((s) => s.toggleReportPanel);
  const reports = useReportStore((s) => s.reports);
  const currentReport = useReportStore((s) => s.currentReport);
  const loading = useReportStore((s) => s.loading);
  const generating = useReportStore((s) => s.generating);
  const exporting = useReportStore((s) => s.exporting);
  const error = useReportStore((s) => s.error);
  const loadReports = useReportStore((s) => s.loadReports);
  const generateReport = useReportStore((s) => s.generateReport);
  const regenerateReport = useReportStore((s) => s.regenerateReport);
  const exportReport = useReportStore((s) => s.exportReport);
  const deleteReport = useReportStore((s) => s.deleteReport);
  const selectReport = useReportStore((s) => s.selectReport);
  const clearCurrentReport = useReportStore((s) => s.clearCurrentReport);

  const [activeTab, setActiveTab] = useState<TabKey>('summary');
  const [exportFormat, setExportFormat] = useState<ReportExportFormat>('html');
  const [showExportMenu, setShowExportMenu] = useState(false);

  useEffect(() => {
    if (currentCase) {
      loadReports(currentCase.id);
    }
  }, [currentCase, loadReports]);

  const handleGenerate = async () => {
    if (!currentCase) return;
    await generateReport(currentCase.id);
  };

  const handleRegenerate = async () => {
    if (!currentReport) return;
    await regenerateReport(currentReport.id);
  };

  const handleExport = async (format: ReportExportFormat) => {
    if (!currentReport) return;
    const result = await exportReport(currentReport.id, format);
    setShowExportMenu(false);
    if (result?.exportedContent) {
      const blob = new Blob([result.exportedContent], {
        type: format === 'html' ? 'text/html' : format === 'markdown' ? 'text/markdown' : 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${currentReport.title}.${format === 'markdown' ? 'md' : format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  const handleDelete = async () => {
    if (!currentReport) return;
    await deleteReport(currentReport.id);
  };

  return (
    <div
      className="h-full flex flex-col border-l"
      style={{
        width: 520,
        backgroundColor: CYBERPUNK_COLORS.bgSecondary,
        borderColor: CYBERPUNK_COLORS.borderColor,
      }}
    >
      <div
        className="flex items-center justify-between px-4 py-3 border-b"
        style={{ borderColor: CYBERPUNK_COLORS.borderColor }}
      >
        <div className="flex items-center gap-2">
          <FileText
            size={18}
            style={{
              color: CYBERPUNK_COLORS.accentGreen,
              filter: `drop-shadow(0 0 4px ${getGlowColor(CYBERPUNK_COLORS.accentGreen, 0.6)})`,
            }}
          />
          <span
            className="text-sm font-mono font-bold"
            style={{
              color: CYBERPUNK_COLORS.accentGreen,
              textShadow: `0 0 8px ${getGlowColor(CYBERPUNK_COLORS.accentGreen, 0.6)}`,
            }}
          >
            证据报告中心
          </span>
        </div>
        <button
          onClick={toggleReportPanel}
          className="p-1 transition-colors"
          style={{ color: CYBERPUNK_COLORS.textSecondary }}
        >
          <X size={16} />
        </button>
      </div>

      <div className="flex items-center gap-2 px-3 py-2 border-b" style={{ borderColor: CYBERPUNK_COLORS.borderColor }}>
        <button
          className="flex items-center gap-1 px-2 py-1 text-xs font-mono rounded-sm border transition-all"
          style={{
            borderColor: CYBERPUNK_COLORS.accentGreen,
            color: CYBERPUNK_COLORS.accentGreen,
            backgroundColor: getGlowColor(CYBERPUNK_COLORS.accentGreen, 0.1),
          }}
          onClick={handleGenerate}
          disabled={generating || !currentCase}
        >
          <Plus size={12} />
          {generating ? '生成中...' : '生成报告'}
        </button>

        {currentReport && (
          <>
            <button
              className="flex items-center gap-1 px-2 py-1 text-xs font-mono rounded-sm border transition-all"
              style={{
                borderColor: CYBERPUNK_COLORS.accentCyan,
                color: CYBERPUNK_COLORS.accentCyan,
                backgroundColor: getGlowColor(CYBERPUNK_COLORS.accentCyan, 0.1),
              }}
              onClick={handleRegenerate}
              disabled={generating}
            >
              <RefreshCw size={12} className={generating ? 'animate-spin' : ''} />
              刷新
            </button>

            <div className="relative">
              <button
                className="flex items-center gap-1 px-2 py-1 text-xs font-mono rounded-sm border transition-all"
                style={{
                  borderColor: CYBERPUNK_COLORS.accentYellow,
                  color: CYBERPUNK_COLORS.accentYellow,
                  backgroundColor: getGlowColor(CYBERPUNK_COLORS.accentYellow, 0.1),
                }}
                onClick={() => setShowExportMenu(!showExportMenu)}
                disabled={exporting}
              >
                <Download size={12} />
                {exporting ? '导出中...' : '导出'}
              </button>
              {showExportMenu && (
                <div
                  className="absolute top-8 left-0 z-10 rounded-sm border py-1"
                  style={{
                    borderColor: CYBERPUNK_COLORS.borderColor,
                    backgroundColor: CYBERPUNK_COLORS.bgTertiary,
                    minWidth: 120,
                  }}
                >
                  {(['html', 'markdown', 'json'] as ReportExportFormat[]).map((fmt) => (
                    <button
                      key={fmt}
                      className="w-full text-left px-3 py-1.5 text-xs font-mono hover:opacity-80"
                      style={{ color: CYBERPUNK_COLORS.textPrimary }}
                      onClick={() => handleExport(fmt)}
                    >
                      {fmt === 'html' ? 'HTML 网页' : fmt === 'markdown' ? 'Markdown' : 'JSON 数据'}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <button
              className="flex items-center gap-1 px-2 py-1 text-xs font-mono rounded-sm border transition-all ml-auto"
              style={{
                borderColor: CYBERPUNK_COLORS.accentRed,
                color: CYBERPUNK_COLORS.accentRed,
                backgroundColor: getGlowColor(CYBERPUNK_COLORS.accentRed, 0.1),
              }}
              onClick={handleDelete}
            >
              <Trash2 size={12} />
            </button>
          </>
        )}
      </div>

      {error && (
        <div
          className="px-3 py-1.5 text-xs font-mono border-b"
          style={{
            color: CYBERPUNK_COLORS.accentRed,
            backgroundColor: getGlowColor(CYBERPUNK_COLORS.accentRed, 0.05),
            borderColor: CYBERPUNK_COLORS.borderColor,
          }}
        >
          {error}
        </div>
      )}

      {currentReport ? (
        <>
          <div className="px-3 py-2 border-b" style={{ borderColor: CYBERPUNK_COLORS.borderColor }}>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold" style={{ color: CYBERPUNK_COLORS.textPrimary }}>
                {currentReport.title}
              </span>
              <span
                className="text-xs font-mono px-1 rounded-sm"
                style={{
                  color: STATUS_COLORS[currentReport.status],
                  backgroundColor: getGlowColor(STATUS_COLORS[currentReport.status] || CYBERPUNK_COLORS.borderColor, 0.1),
                }}
              >
                {STATUS_LABELS[currentReport.status]}
              </span>
            </div>
            <div className="text-xs font-mono" style={{ color: CYBERPUNK_COLORS.textSecondary }}>
              {currentReport.generatedAt ? `生成于 ${formatTimestamp(currentReport.generatedAt)}` : ''}
              {currentReport.exportedAt ? ` · 导出于 ${formatTimestamp(currentReport.exportedAt)}` : ''}
            </div>
          </div>

          <div className="flex gap-1 px-3 py-1.5 border-b" style={{ borderColor: CYBERPUNK_COLORS.borderColor }}>
            {TAB_CONFIG.map((tab) => (
              <button
                key={tab.key}
                className="flex items-center gap-1 px-2 py-1 text-xs font-mono rounded-sm border transition-all"
                style={{
                  borderColor: activeTab === tab.key ? CYBERPUNK_COLORS.accentGreen : CYBERPUNK_COLORS.borderColor,
                  color: activeTab === tab.key ? CYBERPUNK_COLORS.accentGreen : CYBERPUNK_COLORS.textSecondary,
                  backgroundColor: activeTab === tab.key ? getGlowColor(CYBERPUNK_COLORS.accentGreen, 0.1) : 'transparent',
                }}
                onClick={() => setActiveTab(tab.key)}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto p-3">
            {activeTab === 'summary' && <CaseSummarySection report={currentReport} />}
            {activeTab === 'graph' && <RelationshipGraphSection report={currentReport} />}
            {activeTab === 'timeline' && <TimelineSection report={currentReport} />}
            {activeTab === 'tasks' && <TaskSummarySection report={currentReport} />}
          </div>
        </>
      ) : (
        <div className="flex-1 overflow-y-auto">
          {reports.length > 0 ? (
            <div className="p-3 space-y-2">
              <div className="text-xs font-mono font-bold mb-2" style={{ color: CYBERPUNK_COLORS.accentCyan }}>
                历史报告
              </div>
              {reports.map((r) => (
                <button
                  key={r.id}
                  className="w-full text-left p-2 rounded-sm border transition-all"
                  style={{
                    borderColor: CYBERPUNK_COLORS.borderColor,
                    backgroundColor: CYBERPUNK_COLORS.bgTertiary,
                  }}
                  onClick={() => selectReport(r.id)}
                >
                  <div className="flex items-center gap-2">
                    <FileText size={12} style={{ color: CYBERPUNK_COLORS.accentGreen }} />
                    <span className="text-xs font-mono font-bold flex-1 truncate" style={{ color: CYBERPUNK_COLORS.textPrimary }}>
                      {r.title}
                    </span>
                    <span
                      className="text-xs font-mono px-1 rounded-sm"
                      style={{
                        color: STATUS_COLORS[r.status],
                        backgroundColor: getGlowColor(STATUS_COLORS[r.status] || CYBERPUNK_COLORS.borderColor, 0.1),
                      }}
                    >
                      {STATUS_LABELS[r.status]}
                    </span>
                  </div>
                  <div className="text-xs font-mono mt-1" style={{ color: CYBERPUNK_COLORS.textSecondary }}>
                    {r.caseSummary.totalEvidence} 证据 · {r.caseSummary.totalConnections} 关联 · {r.caseSummary.totalTasks} 任务
                  </div>
                  <div className="text-xs font-mono" style={{ color: CYBERPUNK_COLORS.textSecondary }}>
                    {formatTimestamp(r.createdAt)}
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div
              className="flex flex-col items-center justify-center h-full text-xs font-mono gap-2"
              style={{ color: CYBERPUNK_COLORS.textSecondary }}
            >
              <FileText size={32} style={{ opacity: 0.3 }} />
              <span>暂无报告，点击「生成报告」开始</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ReportPanel;
