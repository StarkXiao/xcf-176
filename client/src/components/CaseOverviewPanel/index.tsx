import React, { useEffect, useState } from 'react';
import {
  X,
  Database,
  Link2,
  Users,
  AlertTriangle,
  Tag,
  Activity,
  FileText,
  RefreshCw,
  Gauge,
  Clock,
  Shield,
  ShieldCheck,
} from 'lucide-react';
import { GlowBorder } from '@/components/ui/GlowBorder';
import { CYBERPUNK_COLORS, getGlowColor, IMPORTANCE_COLORS, SOURCE_CREDIBILITY_COLORS, SOURCE_CREDIBILITY_LABELS, VERIFICATION_STATUS_COLORS, VERIFICATION_STATUS_LABELS } from '@/utils/colorUtils';
import { caseApi } from '@/api/caseApi';
import { useCaseStore } from '@/store/useCaseStore';
import { useUiStore } from '@/store/useUiStore';
import type { CaseOverview, ImportanceLevel, AuditAction } from '@/types';

const importanceLabels: Record<ImportanceLevel, string> = {
  low: '低',
  normal: '中',
  high: '高',
  critical: '紧急',
};

const actionLabels: Record<AuditAction, string> = {
  create_evidence: '创建证据',
  update_evidence: '更新证据',
  delete_evidence: '删除证据',
  move_evidence: '移动证据',
  create_connection: '创建关联',
  delete_connection: '删除关联',
  update_connection: '更新关联',
  assign_evidence: '分配证据',
  change_status: '变更状态',
  add_collaborator: '添加协作者',
  remove_collaborator: '移除协作者',
  create_case: '创建案件',
  update_case: '更新案件',
  delete_case: '删除案件',
  restore_snapshot: '恢复快照',
  create_consultation: '创建会商',
  update_consultation: '更新会商',
  add_discussion: '添加讨论',
  add_conclusion: '添加结论',
  raise_dispute: '提出争议',
  resolve_dispute: '解决争议',
  create_investigation_task: '创建任务',
  update_investigation_task: '更新任务',
  assign_investigation_task: '分配任务',
  complete_investigation_task: '完成任务',
  link_evidence_to_task: '关联证据到任务',
  link_collection_to_task: '关联采集到任务',
  link_connection_to_task: '关联连接到任务',
  sync_collection_archived: '同步采集归档',
  sync_evidence_updated: '同步证据更新',
  sync_connection_updated: '同步连接更新',
  sync_priority_escalated: '同步优先级升级',
};

export const CaseOverviewPanel: React.FC = () => {
  const overviewPanelOpen = useUiStore((state) => state.overviewPanelOpen);
  const setOverviewPanelOpen = useUiStore((state) => state.setOverviewPanelOpen);
  const currentCase = useCaseStore((state) => state.currentCase);

  const [overview, setOverview] = useState<CaseOverview | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadOverview = async () => {
    if (!currentCase) return;
    setLoading(true);
    setError(null);
    try {
      const response = await caseApi.getOverview(currentCase.id);
      if (response.success && response.data) {
        setOverview(response.data);
      } else {
        setError(response.error || '获取概览数据失败');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '获取概览数据失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (overviewPanelOpen && currentCase) {
      loadOverview();
    }
  }, [overviewPanelOpen, currentCase]);

  if (!overviewPanelOpen) return null;

  const totalImportanceCount = overview
    ? Object.values(overview.evidenceByImportance).reduce((a, b) => a + b, 0)
    : 0;

  const maxTagCount = overview?.tagDistribution[0]?.count || 1;

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center">
      <div
        className="absolute inset-0"
        style={{ backgroundColor: 'rgba(0, 0, 0, 0.75)' }}
        onClick={() => setOverviewPanelOpen(false)}
      />

      <div className="relative z-10 w-full max-w-5xl mx-4 max-h-[85vh] flex flex-col">
        <GlowBorder color={CYBERPUNK_COLORS.accentCyan} glowIntensity={0.5}>
          <div
            className="rounded-sm overflow-hidden flex flex-col max-h-[85vh]"
            style={{ backgroundColor: CYBERPUNK_COLORS.bgSecondary }}
          >
            <div
              className="h-14 px-6 flex items-center justify-between border-b flex-shrink-0"
              style={{ borderColor: CYBERPUNK_COLORS.borderColor }}
            >
              <div className="flex items-center gap-3">
                <Activity
                  size={20}
                  style={{
                    color: CYBERPUNK_COLORS.accentCyan,
                    filter: `drop-shadow(0 0 6px ${getGlowColor(CYBERPUNK_COLORS.accentCyan, 0.6)})`,
                  }}
                />
                <span
                  className="font-mono text-lg uppercase tracking-wider"
                  style={{
                    color: CYBERPUNK_COLORS.accentCyan,
                    textShadow: `0 0 10px ${getGlowColor(CYBERPUNK_COLORS.accentCyan, 0.4)}`,
                  }}
                >
                  案件概览 - {currentCase?.name || '未知案件'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={loadOverview}
                  disabled={loading}
                  className="p-2 rounded-sm transition-all hover:bg-opacity-50"
                  style={{ color: CYBERPUNK_COLORS.textSecondary }}
                  title="刷新数据"
                >
                  <RefreshCw
                    size={18}
                    className={loading ? 'animate-spin' : ''}
                  />
                </button>
                <button onClick={() => setOverviewPanelOpen(false)}>
                  <X size={20} style={{ color: CYBERPUNK_COLORS.textSecondary }} />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {error && (
                <div
                  className="mb-4 p-3 border rounded-sm font-mono text-sm"
                  style={{
                    borderColor: CYBERPUNK_COLORS.accentRed,
                    backgroundColor: getGlowColor(CYBERPUNK_COLORS.accentRed, 0.1),
                    color: CYBERPUNK_COLORS.accentRed,
                  }}
                >
                  {error}
                </div>
              )}

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-3 space-y-4">
                  <h3
                    className="font-mono text-sm uppercase tracking-wider flex items-center gap-2"
                    style={{ color: CYBERPUNK_COLORS.accentPurple }}
                  >
                    <Database size={16} />
                    数据汇总
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <StatCard
                      icon={<Database size={24} />}
                      label="证据总数"
                      value={overview?.totalEvidence ?? 0}
                      color={CYBERPUNK_COLORS.accentCyan}
                    />
                    <StatCard
                      icon={<Link2 size={24} />}
                      label="关联总数"
                      value={overview?.totalConnections ?? 0}
                      color={CYBERPUNK_COLORS.accentPurple}
                    />
                    <StatCard
                      icon={<Users size={24} />}
                      label="协作者数"
                      value={overview?.totalCollaborators ?? 0}
                      color={CYBERPUNK_COLORS.accentGreen}
                    />
                    <StatCard
                      icon={<AlertTriangle size={24} />}
                      label="紧急证据"
                      value={overview?.evidenceByImportance.critical ?? 0}
                      color={CYBERPUNK_COLORS.accentRed}
                    />
                  </div>
                </div>

                <div className="lg:col-span-2 space-y-4">
                  <h3
                    className="font-mono text-sm uppercase tracking-wider flex items-center gap-2"
                    style={{ color: CYBERPUNK_COLORS.accentYellow }}
                  >
                    <Gauge size={16} />
                    重要级别占比
                  </h3>
                  <div
                    className="p-4 border rounded-sm space-y-3"
                    style={{
                      borderColor: CYBERPUNK_COLORS.borderColor,
                      backgroundColor: CYBERPUNK_COLORS.bgTertiary,
                    }}
                  >
                    {(['critical', 'high', 'normal', 'low'] as ImportanceLevel[]).map((level) => {
                      const count = overview?.evidenceByImportance[level] ?? 0;
                      const percentage = totalImportanceCount > 0 ? (count / totalImportanceCount) * 100 : 0;
                      const color = IMPORTANCE_COLORS[level];
                      return (
                        <div key={level}>
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-2">
                              <div
                                className="w-3 h-3 rounded-sm"
                                style={{
                                  backgroundColor: color,
                                  boxShadow: `0 0 6px ${getGlowColor(color, 0.6)}`,
                                }}
                              />
                              <span
                                className="font-mono text-sm"
                                style={{ color: CYBERPUNK_COLORS.textPrimary }}
                              >
                                {importanceLabels[level]}
                              </span>
                            </div>
                            <span
                              className="font-mono text-sm"
                              style={{ color: CYBERPUNK_COLORS.textSecondary }}
                            >
                              {count} 条 ({percentage.toFixed(1)}%)
                            </span>
                          </div>
                          <div
                            className="h-2 rounded-sm overflow-hidden"
                            style={{ backgroundColor: CYBERPUNK_COLORS.bgSecondary }}
                          >
                            <div
                              className="h-full transition-all duration-500"
                              style={{
                                width: `${percentage}%`,
                                backgroundColor: color,
                                boxShadow: `0 0 8px ${getGlowColor(color, 0.6)}`,
                              }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-4">
                  <h3
                    className="font-mono text-sm uppercase tracking-wider flex items-center gap-2"
                    style={{ color: CYBERPUNK_COLORS.accentGreen }}
                  >
                    <Tag size={16} />
                    关键标签分布
                  </h3>
                  <div
                    className="p-4 border rounded-sm"
                    style={{
                      borderColor: CYBERPUNK_COLORS.borderColor,
                      backgroundColor: CYBERPUNK_COLORS.bgTertiary,
                    }}
                  >
                    {!overview || overview.tagDistribution.length === 0 ? (
                      <div
                        className="text-center py-6 font-mono text-sm"
                        style={{ color: CYBERPUNK_COLORS.textSecondary }}
                      >
                        暂无标签数据
                      </div>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {overview.tagDistribution.map((item) => {
                          const intensity = 0.15 + (item.count / maxTagCount) * 0.35;
                          return (
                            <div
                              key={item.tag}
                              className="px-2.5 py-1 font-mono text-xs rounded-sm border flex items-center gap-1.5"
                              style={{
                                borderColor: getGlowColor(CYBERPUNK_COLORS.accentPurple, 0.3 + (item.count / maxTagCount) * 0.4),
                                backgroundColor: getGlowColor(CYBERPUNK_COLORS.accentPurple, intensity),
                                color: CYBERPUNK_COLORS.accentPurple,
                              }}
                            >
                              <Tag size={10} />
                              {item.tag}
                              <span
                                className="px-1 rounded-sm"
                                style={{
                                  backgroundColor: getGlowColor(CYBERPUNK_COLORS.accentPurple, 0.3),
                                  color: CYBERPUNK_COLORS.textPrimary,
                                }}
                              >
                                {item.count}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>

                <div className="lg:col-span-2 space-y-4">
                  <h3
                    className="font-mono text-sm uppercase tracking-wider flex items-center gap-2"
                    style={{ color: CYBERPUNK_COLORS.accentGreen }}
                  >
                    <Shield size={16} />
                    来源可信度分布
                  </h3>
                  <div
                    className="p-4 border rounded-sm space-y-3"
                    style={{
                      borderColor: CYBERPUNK_COLORS.borderColor,
                      backgroundColor: CYBERPUNK_COLORS.bgTertiary,
                    }}
                  >
                    {(['very_high', 'high', 'medium', 'low', 'very_low'] as const).map((level) => {
                      const count = overview?.evidenceBySourceCredibility[level] ?? 0;
                      const percentage = totalImportanceCount > 0 ? (count / totalImportanceCount) * 100 : 0;
                      const color = SOURCE_CREDIBILITY_COLORS[level];
                      return (
                        <div key={level}>
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-2">
                              <div
                                className="w-3 h-3 rounded-sm"
                                style={{
                                  backgroundColor: color,
                                  boxShadow: `0 0 6px ${getGlowColor(color, 0.6)}`,
                                }}
                              />
                              <span
                                className="font-mono text-sm"
                                style={{ color: CYBERPUNK_COLORS.textPrimary }}
                              >
                                {SOURCE_CREDIBILITY_LABELS[level]}
                              </span>
                            </div>
                            <span
                              className="font-mono text-sm"
                              style={{ color: CYBERPUNK_COLORS.textSecondary }}
                            >
                              {count} 条 ({percentage.toFixed(1)}%)
                            </span>
                          </div>
                          <div
                            className="h-2 rounded-sm overflow-hidden"
                            style={{ backgroundColor: CYBERPUNK_COLORS.bgSecondary }}
                          >
                            <div
                              className="h-full transition-all duration-500"
                              style={{
                                width: `${percentage}%`,
                                backgroundColor: color,
                                boxShadow: `0 0 8px ${getGlowColor(color, 0.6)}`,
                              }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-4">
                  <h3
                    className="font-mono text-sm uppercase tracking-wider flex items-center gap-2"
                    style={{ color: CYBERPUNK_COLORS.accentPurple }}
                  >
                    <ShieldCheck size={16} />
                    核验状态分布
                  </h3>
                  <div
                    className="p-4 border rounded-sm space-y-3"
                    style={{
                      borderColor: CYBERPUNK_COLORS.borderColor,
                      backgroundColor: CYBERPUNK_COLORS.bgTertiary,
                    }}
                  >
                    {(['verified', 'pending', 'unverified', 'failed', 'disputed'] as const).map((status) => {
                      const count = overview?.evidenceByVerificationStatus[status] ?? 0;
                      const percentage = totalImportanceCount > 0 ? (count / totalImportanceCount) * 100 : 0;
                      const color = VERIFICATION_STATUS_COLORS[status];
                      return (
                        <div key={status}>
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-2">
                              <div
                                className="w-3 h-3 rounded-sm"
                                style={{
                                  backgroundColor: color,
                                  boxShadow: `0 0 6px ${getGlowColor(color, 0.6)}`,
                                }}
                              />
                              <span
                                className="font-mono text-sm"
                                style={{ color: CYBERPUNK_COLORS.textPrimary }}
                              >
                                {VERIFICATION_STATUS_LABELS[status]}
                              </span>
                            </div>
                            <span
                              className="font-mono text-sm"
                              style={{ color: CYBERPUNK_COLORS.textSecondary }}
                            >
                              {count} 条 ({percentage.toFixed(1)}%)
                            </span>
                          </div>
                          <div
                            className="h-2 rounded-sm overflow-hidden"
                            style={{ backgroundColor: CYBERPUNK_COLORS.bgSecondary }}
                          >
                            <div
                              className="h-full transition-all duration-500"
                              style={{
                                width: `${percentage}%`,
                                backgroundColor: color,
                                boxShadow: `0 0 8px ${getGlowColor(color, 0.6)}`,
                              }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="lg:col-span-3 space-y-4">
                  <h3
                    className="font-mono text-sm uppercase tracking-wider flex items-center gap-2"
                    style={{ color: CYBERPUNK_COLORS.accentCyan }}
                  >
                    <Clock size={16} />
                    最新变更记录
                  </h3>
                  <div
                    className="border rounded-sm overflow-hidden"
                    style={{
                      borderColor: CYBERPUNK_COLORS.borderColor,
                      backgroundColor: CYBERPUNK_COLORS.bgTertiary,
                    }}
                  >
                    {!overview || overview.recentChanges.length === 0 ? (
                      <div
                        className="text-center py-8 font-mono text-sm"
                        style={{ color: CYBERPUNK_COLORS.textSecondary }}
                      >
                        暂无变更记录
                      </div>
                    ) : (
                      <div className="divide-y" style={{ borderColor: CYBERPUNK_COLORS.borderColor }}>
                        {overview.recentChanges.map((change) => {
                          const actionLabel = actionLabels[change.action] || change.action;
                          return (
                            <div
                              key={change.id}
                              className="p-3 flex items-start gap-3 hover:bg-opacity-50 transition-colors"
                              style={{
                                backgroundColor: 'transparent',
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.backgroundColor = getGlowColor(CYBERPUNK_COLORS.accentCyan, 0.05);
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor = 'transparent';
                              }}
                            >
                              <div
                                className="w-8 h-8 rounded-sm flex items-center justify-center flex-shrink-0 mt-0.5"
                                style={{
                                  backgroundColor: getGlowColor(CYBERPUNK_COLORS.accentCyan, 0.15),
                                  border: `1px solid ${getGlowColor(CYBERPUNK_COLORS.accentCyan, 0.3)}`,
                                }}
                              >
                                <FileText
                                  size={14}
                                  style={{ color: CYBERPUNK_COLORS.accentCyan }}
                                />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span
                                    className="font-mono text-sm"
                                    style={{ color: CYBERPUNK_COLORS.textPrimary }}
                                  >
                                    {actionLabel}
                                  </span>
                                  <span
                                    className="text-xs font-mono px-1.5 py-0.5 rounded-sm"
                                    style={{
                                      backgroundColor: getGlowColor(CYBERPUNK_COLORS.accentYellow, 0.15),
                                      color: CYBERPUNK_COLORS.accentYellow,
                                    }}
                                  >
                                    {change.targetType}
                                  </span>
                                </div>
                                <p
                                  className="text-sm mt-1"
                                  style={{ color: CYBERPUNK_COLORS.textSecondary }}
                                >
                                  {change.detail}
                                </p>
                                <div className="flex items-center gap-3 mt-1.5 text-xs font-mono">
                                  <span style={{ color: CYBERPUNK_COLORS.accentGreen }}>
                                    {change.collaboratorName}
                                  </span>
                                  <span style={{ color: CYBERPUNK_COLORS.textSecondary }}>
                                    {new Date(change.createdAt).toLocaleString('zh-CN')}
                                  </span>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </GlowBorder>
      </div>
    </div>
  );
};

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: number;
  color: string;
}

const StatCard: React.FC<StatCardProps> = ({ icon, label, value, color }) => (
  <div
    className="p-4 border rounded-sm"
    style={{
      borderColor: getGlowColor(color, 0.3),
      backgroundColor: CYBERPUNK_COLORS.bgTertiary,
    }}
  >
    <div className="flex items-center gap-3 mb-2">
      <div
        className="w-10 h-10 rounded-sm flex items-center justify-center"
        style={{
          backgroundColor: getGlowColor(color, 0.15),
          border: `1px solid ${getGlowColor(color, 0.3)}`,
        }}
      >
        <div style={{ color }}>{icon}</div>
      </div>
      <div>
        <div
          className="text-2xl font-mono font-bold"
          style={{
            color,
            textShadow: `0 0 8px ${getGlowColor(color, 0.5)}`,
          }}
        >
          {value}
        </div>
        <div
          className="text-xs font-mono uppercase tracking-wider"
          style={{ color: CYBERPUNK_COLORS.textSecondary }}
        >
          {label}
        </div>
      </div>
    </div>
  </div>
);

export default CaseOverviewPanel;
