import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  X,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Eye,
  ChevronDown,
  ChevronUp,
  ShieldAlert,
  Network,
  Clock,
  Zap,
} from 'lucide-react';
import { NeonButton } from '@/components/ui/NeonButton';
import { useCaseStore } from '@/store/useCaseStore';
import { useAnomalyAlertStore } from '@/store/useAnomalyAlertStore';
import { useUiStore } from '@/store/useUiStore';
import { CYBERPUNK_COLORS, getGlowColor } from '@/utils/colorUtils';
import type {
  AnomalyAlert,
  AnomalyAlertSeverity,
  AnomalyAlertStatus,
  AnomalyAlertType,
  AnomalyDetectionResult,
} from '@/types';

const SEVERITY_LABELS: Record<AnomalyAlertSeverity, string> = {
  warning: '警告',
  high: '高风险',
  critical: '重大风险',
};

const SEVERITY_COLORS: Record<AnomalyAlertSeverity, string> = {
  warning: CYBERPUNK_COLORS.accentYellow,
  high: '#ff6b35',
  critical: CYBERPUNK_COLORS.accentRed,
};

const STATUS_LABELS: Record<AnomalyAlertStatus, string> = {
  pending: '待处理',
  reviewed: '已审阅',
  dismissed: '已忽略',
  resolved: '已解决',
};

const TYPE_LABELS: Record<AnomalyAlertType, string> = {
  high_importance: '高重要度证据',
  dense_connections: '密集关联网络',
  temporal_burst: '时间集中爆发',
  combined: '综合异常预警',
};

const TYPE_ICONS: Record<AnomalyAlertType, React.ReactNode> = {
  high_importance: <ShieldAlert size={14} />,
  dense_connections: <Network size={14} />,
  temporal_burst: <Clock size={14} />,
  combined: <Zap size={14} />,
};

const TYPE_COLORS: Record<AnomalyAlertType, string> = {
  high_importance: CYBERPUNK_COLORS.accentRed,
  dense_connections: CYBERPUNK_COLORS.accentCyan,
  temporal_burst: CYBERPUNK_COLORS.accentYellow,
  combined: '#ff6b35',
};

type FilterMode = 'all' | 'pending' | AnomalyAlertSeverity;

function ScoreBar({ score }: { score: number }) {
  const pct = Math.round(score * 100);
  const color = score >= 0.8 ? SEVERITY_COLORS.critical : score >= 0.5 ? SEVERITY_COLORS.high : SEVERITY_COLORS.warning;
  return (
    <div className="flex items-center gap-2">
      <div
        className="flex-1 h-2 rounded-full overflow-hidden"
        style={{ backgroundColor: getGlowColor(color, 0.15) }}
      >
        <div
          className="h-full rounded-full transition-all"
          style={{
            width: `${pct}%`,
            backgroundColor: color,
            boxShadow: `0 0 6px ${getGlowColor(color, 0.5)}`,
          }}
        />
      </div>
      <span
        className="text-xs font-mono w-8 text-right"
        style={{ color, textShadow: `0 0 4px ${getGlowColor(color, 0.4)}` }}
      >
        {pct}
      </span>
    </div>
  );
}

function AlertCard({
  alert,
  onDismiss,
  onResolve,
  onReview,
  onSelectCase,
}: {
  alert: AnomalyAlert;
  onDismiss: (id: string) => void;
  onResolve: (id: string) => void;
  onReview: (id: string) => void;
  onSelectCase: (caseId: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const severityColor = SEVERITY_COLORS[alert.severity];
  const typeColor = TYPE_COLORS[alert.type];

  return (
    <div
      className="border rounded-sm overflow-hidden"
      style={{
        borderColor: getGlowColor(severityColor, 0.3),
        backgroundColor: CYBERPUNK_COLORS.bgTertiary,
      }}
    >
      <div
        className="px-3 py-2 flex items-start gap-2 cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <div
          className="mt-0.5 flex-shrink-0 w-2 h-2 rounded-full"
          style={{
            backgroundColor: severityColor,
            boxShadow: `0 0 6px ${getGlowColor(severityColor, 0.6)}`,
          }}
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span style={{ color: typeColor }}>{TYPE_ICONS[alert.type]}</span>
            <span
              className="text-xs font-mono px-1.5 py-0.5 rounded-sm"
              style={{
                backgroundColor: getGlowColor(typeColor, 0.2),
                color: typeColor,
              }}
            >
              {TYPE_LABELS[alert.type]}
            </span>
            <span
              className="text-xs font-mono px-1.5 py-0.5 rounded-sm"
              style={{
                backgroundColor: getGlowColor(severityColor, 0.2),
                color: severityColor,
              }}
            >
              {SEVERITY_LABELS[alert.severity]}
            </span>
          </div>
          <div
            className="text-sm font-mono truncate"
            style={{ color: CYBERPUNK_COLORS.textPrimary }}
          >
            {alert.title}
          </div>
          <div className="mt-1">
            <ScoreBar score={alert.score} />
          </div>
        </div>
        <div className="flex-shrink-0">
          {expanded ? (
            <ChevronUp size={14} style={{ color: CYBERPUNK_COLORS.textSecondary }} />
          ) : (
            <ChevronDown size={14} style={{ color: CYBERPUNK_COLORS.textSecondary }} />
          )}
        </div>
      </div>

      {expanded && (
        <div className="px-3 pb-3 space-y-2">
          <div
            className="text-xs font-mono leading-relaxed"
            style={{ color: CYBERPUNK_COLORS.textSecondary }}
          >
            {alert.description}
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs font-mono">
            <div style={{ color: CYBERPUNK_COLORS.textSecondary }}>
              证据数: <span style={{ color: CYBERPUNK_COLORS.textPrimary }}>{alert.evidenceCount}</span>
            </div>
            <div style={{ color: CYBERPUNK_COLORS.textSecondary }}>
              关联数: <span style={{ color: CYBERPUNK_COLORS.textPrimary }}>{alert.connectionCount}</span>
            </div>
            {alert.criticalEvidenceCount > 0 && (
              <div style={{ color: CYBERPUNK_COLORS.textSecondary }}>
                关键证据: <span style={{ color: SEVERITY_COLORS.critical }}>{alert.criticalEvidenceCount}</span>
              </div>
            )}
            {alert.highEvidenceCount > 0 && (
              <div style={{ color: CYBERPUNK_COLORS.textSecondary }}>
                高重要度: <span style={{ color: SEVERITY_COLORS.high }}>{alert.highEvidenceCount}</span>
              </div>
            )}
            {alert.burstStart && (
              <div className="col-span-2" style={{ color: CYBERPUNK_COLORS.textSecondary }}>
                爆发时段: <span style={{ color: CYBERPUNK_COLORS.accentYellow }}>
                  {new Date(alert.burstStart).toLocaleString('zh-CN')} ~ {alert.burstEnd ? new Date(alert.burstEnd).toLocaleString('zh-CN') : '-'}
                </span>
              </div>
            )}
          </div>

          <div
            className="text-xs font-mono"
            style={{ color: CYBERPUNK_COLORS.textSecondary }}
          >
            状态: <span style={{ color: CYBERPUNK_COLORS.textPrimary }}>{STATUS_LABELS[alert.status]}</span>
            {' | '}
            检测时间: {new Date(alert.detectedAt).toLocaleString('zh-CN')}
          </div>

          {alert.status === 'pending' && (
            <div className="flex gap-2 pt-1">
              <NeonButton
                size="sm"
                variant="success"
                icon={<CheckCircle2 size={12} />}
                onClick={(e: React.MouseEvent) => {
                  e.stopPropagation();
                  onResolve(alert.id);
                }}
              >
                已解决
              </NeonButton>
              <NeonButton
                size="sm"
                variant="secondary"
                icon={<Eye size={12} />}
                onClick={(e: React.MouseEvent) => {
                  e.stopPropagation();
                  onReview(alert.id);
                }}
              >
                已审阅
              </NeonButton>
              <NeonButton
                size="sm"
                variant="warning"
                icon={<XCircle size={12} />}
                onClick={(e: React.MouseEvent) => {
                  e.stopPropagation();
                  onDismiss(alert.id);
                }}
              >
                忽略
              </NeonButton>
            </div>
          )}

          <NeonButton
            size="sm"
            variant="primary"
            icon={<AlertTriangle size={12} />}
            onClick={(e: React.MouseEvent) => {
              e.stopPropagation();
              onSelectCase(alert.caseId);
            }}
          >
            前往案件
          </NeonButton>
        </div>
      )}
    </div>
  );
}

function PriorityCaseCard({
  result,
  onSelectCase,
}: {
  result: AnomalyDetectionResult;
  onSelectCase: (caseId: string) => void;
}) {
  const severityColor = SEVERITY_COLORS[result.priorityLevel];
  return (
    <div
      className="border rounded-sm p-3 cursor-pointer transition-all"
      style={{
        borderColor: getGlowColor(severityColor, 0.3),
        backgroundColor: CYBERPUNK_COLORS.bgTertiary,
      }}
      onClick={() => onSelectCase(result.caseId)}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = severityColor;
        e.currentTarget.style.boxShadow = `0 0 12px ${getGlowColor(severityColor, 0.3)}`;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = getGlowColor(severityColor, 0.3);
        e.currentTarget.style.boxShadow = 'none';
      }}
    >
      <div className="flex items-center justify-between mb-2">
        <span
          className="font-mono text-sm font-bold truncate"
          style={{ color: CYBERPUNK_COLORS.textPrimary }}
        >
          {result.caseName}
        </span>
        <span
          className="text-xs font-mono px-1.5 py-0.5 rounded-sm flex-shrink-0 ml-2"
          style={{
            backgroundColor: getGlowColor(severityColor, 0.2),
            color: severityColor,
          }}
        >
          {SEVERITY_LABELS[result.priorityLevel]}
        </span>
      </div>
      <ScoreBar score={result.overallScore} />
      <div
        className="text-xs font-mono mt-1"
        style={{ color: CYBERPUNK_COLORS.textSecondary }}
      >
        {result.alerts.length} 个预警
      </div>
    </div>
  );
}

export const AnomalyAlertPanel: React.FC = () => {
  const currentCase = useCaseStore((state) => state.currentCase);
  const { alerts, priorityCases, loading, loadAlertsByCaseId, loadPriorityCases, detectForCase, dismissAlert, resolveAlert, updateAlert } = useAnomalyAlertStore();
  const setCaseSelectorOpen = useUiStore((state) => state.setCaseSelectorOpen);
  const [viewMode, setViewMode] = useState<'alerts' | 'priority'>('alerts');
  const [filter, setFilter] = useState<FilterMode>('pending');

  useEffect(() => {
    if (currentCase) {
      loadAlertsByCaseId(currentCase.id);
    } else {
      loadPriorityCases();
    }
  }, [currentCase, loadAlertsByCaseId, loadPriorityCases]);

  const filteredAlerts = useMemo(() => {
    if (filter === 'all') return alerts;
    if (filter === 'pending') return alerts.filter((a) => a.status === 'pending');
    return alerts.filter((a) => a.severity === filter);
  }, [alerts, filter]);

  const pendingCount = alerts.filter((a) => a.status === 'pending').length;

  const handleRefresh = async () => {
    if (currentCase) {
      await detectForCase(currentCase.id);
    } else {
      await loadPriorityCases();
    }
  };

  const handleSelectCase = (caseId: string) => {
    const loadCase = useCaseStore.getState().loadCase;
    loadCase(caseId);
  };

  return (
    <div
      className="w-96 border-l flex flex-col"
      style={{
        backgroundColor: CYBERPUNK_COLORS.bgSecondary,
        borderColor: CYBERPUNK_COLORS.borderColor,
      }}
    >
      <div
        className="h-12 px-4 flex items-center justify-between border-b"
        style={{ borderColor: CYBERPUNK_COLORS.borderColor }}
      >
        <div className="flex items-center gap-2">
          <AlertTriangle
            size={16}
            style={{
              color: CYBERPUNK_COLORS.accentRed,
              filter: `drop-shadow(0 0 4px ${getGlowColor(CYBERPUNK_COLORS.accentRed, 0.6)})`,
            }}
          />
          <span
            className="font-mono text-sm uppercase tracking-wider"
            style={{
              color: CYBERPUNK_COLORS.accentRed,
              textShadow: `0 0 8px ${getGlowColor(CYBERPUNK_COLORS.accentRed, 0.4)}`,
            }}
          >
            线索预警
          </span>
          {pendingCount > 0 && (
            <span
              className="text-xs font-mono px-1.5 py-0.5 rounded-sm"
              style={{
                backgroundColor: getGlowColor(CYBERPUNK_COLORS.accentRed, 0.2),
                color: CYBERPUNK_COLORS.accentRed,
              }}
            >
              {pendingCount}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <NeonButton
            size="sm"
            variant="secondary"
            icon={<RefreshCw size={14} className={loading ? 'animate-spin' : ''} />}
            onClick={handleRefresh}
          />
          <button onClick={() => useUiStore.getState().toggleAnomalyAlertPanel()}>
            <X size={16} style={{ color: CYBERPUNK_COLORS.textSecondary }} />
          </button>
        </div>
      </div>

      <div
        className="px-3 py-2 flex gap-1 border-b"
        style={{ borderColor: CYBERPUNK_COLORS.borderColor }}
      >
        <NeonButton
          size="sm"
          variant={viewMode === 'alerts' ? 'primary' : 'secondary'}
          onClick={() => setViewMode('alerts')}
        >
          预警列表
        </NeonButton>
        <NeonButton
          size="sm"
          variant={viewMode === 'priority' ? 'primary' : 'secondary'}
          onClick={() => setViewMode('priority')}
        >
          优先案件
        </NeonButton>
      </div>

      {viewMode === 'alerts' && (
        <div
          className="px-3 py-2 flex gap-1 flex-wrap border-b"
          style={{ borderColor: CYBERPUNK_COLORS.borderColor }}
        >
          {(['pending', 'all', 'critical', 'high', 'warning'] as FilterMode[]).map((f) => (
            <button
              key={f}
              className="text-xs font-mono px-2 py-1 rounded-sm transition-all"
              style={{
                backgroundColor: filter === f ? getGlowColor(CYBERPUNK_COLORS.accentCyan, 0.2) : 'transparent',
                color: filter === f ? CYBERPUNK_COLORS.accentCyan : CYBERPUNK_COLORS.textSecondary,
                border: filter === f ? `1px solid ${getGlowColor(CYBERPUNK_COLORS.accentCyan, 0.3)}` : '1px solid transparent',
              }}
              onClick={() => setFilter(f)}
            >
              {f === 'pending' ? '待处理' : f === 'all' ? '全部' : SEVERITY_LABELS[f]}
            </button>
          ))}
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {loading && alerts.length === 0 ? (
          <div
            className="text-center py-8 font-mono text-sm"
            style={{ color: CYBERPUNK_COLORS.textSecondary }}
          >
            加载中...
          </div>
        ) : viewMode === 'alerts' ? (
          filteredAlerts.length === 0 ? (
            <div
              className="text-center py-8 font-mono text-sm"
              style={{ color: CYBERPUNK_COLORS.textSecondary }}
            >
              {filter === 'pending' ? '无待处理预警' : '无匹配预警'}
            </div>
          ) : (
            filteredAlerts.map((alert) => (
              <AlertCard
                key={alert.id}
                alert={alert}
                onDismiss={(id) => dismissAlert(id, useUiStore.getState().currentCollaboratorId ?? undefined)}
                onResolve={(id) => resolveAlert(id, useUiStore.getState().currentCollaboratorId ?? undefined)}
                onReview={(id) => updateAlert(id, { status: 'reviewed', reviewedBy: useUiStore.getState().currentCollaboratorId ?? undefined })}
                onSelectCase={handleSelectCase}
              />
            ))
          )
        ) : priorityCases.length === 0 ? (
          <div
            className="text-center py-8 font-mono text-sm"
            style={{ color: CYBERPUNK_COLORS.textSecondary }}
          >
            暂无优先核查案件
          </div>
        ) : (
          priorityCases.map((result) => (
            <PriorityCaseCard
              key={result.caseId}
              result={result}
              onSelectCase={handleSelectCase}
            />
          ))
        )}
      </div>
    </div>
  );
};

export default AnomalyAlertPanel;
