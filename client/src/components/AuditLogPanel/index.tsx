import React, { useEffect, useMemo, useState } from 'react';
import { ScrollText, X, ChevronDown, ChevronUp, Search, Plus, Edit3, Trash2, UserPlus, Activity, Eye, RotateCcw, Users } from 'lucide-react';
import { NeonInput } from '@/components/ui/NeonInput';
import { SnapshotViewer } from '@/components/SnapshotViewer';
import { useCaseStore } from '@/store/useCaseStore';
import { useAuditLogStore } from '@/store/useAuditLogStore';
import { useCollaboratorStore } from '@/store/useCollaboratorStore';
import { useEvidenceStore } from '@/store/useEvidenceStore';
import { useCanvasStore } from '@/store/useCanvasStore';
import { useUiStore } from '@/store/useUiStore';
import { auditLogApi } from '@/api/auditLogApi';
import { recordAuditLog } from '@/utils/auditHelper';
import { CYBERPUNK_COLORS, getGlowColor } from '@/utils/colorUtils';
import type { AuditAction, AuditLog } from '@/types';

type AuditFilter = 'all' | 'create' | 'update' | 'delete' | 'assign' | 'status';

const ACTION_LABELS: { [key in AuditAction]: string } = {
  create_evidence: '录入证据',
  update_evidence: '更新证据',
  delete_evidence: '删除证据',
  move_evidence: '移动证据',
  create_connection: '创建关联',
  delete_connection: '删除关联',
  update_connection: '更新关联',
  assign_evidence: '分配证据',
  change_status: '变更状态',
  add_collaborator: '添加成员',
  remove_collaborator: '移除成员',
  create_case: '创建案件',
  update_case: '更新案件',
  delete_case: '删除案件',
  restore_snapshot: '恢复快照',
};

const ACTION_ICONS: Record<string, React.ReactNode> = {
  create: <Plus size={12} />,
  update: <Edit3 size={12} />,
  delete: <Trash2 size={12} />,
  assign: <UserPlus size={12} />,
  status: <Activity size={12} />,
};

const ACTION_BAR_COLORS: Record<string, string> = {
  create: CYBERPUNK_COLORS.accentGreen,
  update: CYBERPUNK_COLORS.accentYellow,
  delete: CYBERPUNK_COLORS.accentRed,
  assign: CYBERPUNK_COLORS.accentPurple,
  status: CYBERPUNK_COLORS.accentCyan,
};

const FILTER_OPTIONS: Array<{ value: AuditFilter; label: string }> = [
  { value: 'all', label: '全部' },
  { value: 'create', label: '创建' },
  { value: 'update', label: '更新' },
  { value: 'delete', label: '删除' },
  { value: 'assign', label: '分配' },
  { value: 'status', label: '状态' },
];

function getActionPrefix(action: AuditAction): string {
  if (action.startsWith('create') || action.startsWith('add')) return 'create';
  if (action.startsWith('update') || action.startsWith('change_status')) return 'update';
  if (action.startsWith('delete') || action.startsWith('remove')) return 'delete';
  if (action.startsWith('assign')) return 'assign';
  if (action.startsWith('change_status')) return 'status';
  if (action.startsWith('restore')) return 'update';
  return 'update';
}

export const AuditLogPanel: React.FC = () => {
  const currentCase = useCaseStore((s) => s.currentCase);
  const auditLogs = useAuditLogStore((s) => s.auditLogs);
  const loadAuditLogs = useAuditLogStore((s) => s.loadAuditLogs);
  const toggleAuditLogPanel = useUiStore((s) => s.toggleAuditLogPanel);
  const collaborators = useCollaboratorStore((s) => s.collaborators);

  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<AuditFilter>('all');
  const [memberFilter, setMemberFilter] = useState<string>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [viewingLog, setViewingLog] = useState<AuditLog | null>(null);

  useEffect(() => {
    if (currentCase) {
      loadAuditLogs(currentCase.id);
    }
  }, [currentCase, loadAuditLogs]);

  const filtered = useMemo(() => {
    let result = auditLogs;

    if (filter !== 'all') {
      result = result.filter((l) => getActionPrefix(l.action) === filter);
    }

    if (memberFilter !== 'all') {
      result = result.filter((l) => l.collaboratorId === memberFilter);
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (l) =>
          l.detail.slice(0, 30).toLowerCase().includes(q) ||
          l.collaboratorName.toLowerCase().includes(q) ||
          l.detail.toLowerCase().includes(q)
      );
    }

    return result;
  }, [auditLogs, filter, memberFilter, search]);

  const formatTimestamp = (ts: string) => {
    const d = new Date(ts);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const hh = String(d.getHours()).padStart(2, '0');
    const mi = String(d.getMinutes()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd} ${hh}:${mi}`;
  };

  const handleRestore = async (auditLogId: string) => {
    try {
      const response = await auditLogApi.restoreFromSnapshot(auditLogId);
      if (response.success && response.data) {
        const { evidence: restoredEvidence, connection: restoredConnection } = response.data;
        if (restoredEvidence) {
          useEvidenceStore.getState().setEvidence([
            ...useEvidenceStore.getState().getEvidenceArray().map((e) =>
              e.id === restoredEvidence.id ? restoredEvidence : e
            ),
          ]);
          recordAuditLog('restore_snapshot', 'evidence', restoredEvidence.id, `恢复证据快照: ${restoredEvidence.content.slice(0, 30)}`);
        }
        if (restoredConnection) {
          useCanvasStore.getState().updateConnection(restoredConnection);
          recordAuditLog('restore_snapshot', 'connection', restoredConnection.id, `恢复关联快照: ${restoredConnection.label || '关系连线'}`);
        }
        if (currentCase) {
          loadAuditLogs(currentCase.id);
        }
        setViewingLog(null);
      }
    } catch (error) {
      console.error('Restore failed:', error);
    }
  };

  return (
    <div
      className="h-full flex flex-col border-l"
      style={{
        width: 360,
        backgroundColor: CYBERPUNK_COLORS.bgSecondary,
        borderColor: CYBERPUNK_COLORS.borderColor,
      }}
    >
      <div
        className="flex items-center justify-between px-4 py-3 border-b"
        style={{ borderColor: CYBERPUNK_COLORS.borderColor }}
      >
        <div className="flex items-center gap-2">
          <ScrollText
            size={18}
            style={{
              color: CYBERPUNK_COLORS.accentCyan,
              filter: `drop-shadow(0 0 4px ${getGlowColor(CYBERPUNK_COLORS.accentCyan, 0.6)})`,
            }}
          />
          <span
            className="text-sm font-mono font-bold"
            style={{
              color: CYBERPUNK_COLORS.accentCyan,
              textShadow: `0 0 8px ${getGlowColor(CYBERPUNK_COLORS.accentCyan, 0.6)}`,
            }}
          >
            操作留痕
          </span>
        </div>
        <button
          onClick={toggleAuditLogPanel}
          className="p-1 transition-colors"
          style={{ color: CYBERPUNK_COLORS.textSecondary }}
        >
          <X size={16} />
        </button>
      </div>

      <div className="p-3 space-y-2 border-b" style={{ borderColor: CYBERPUNK_COLORS.borderColor }}>
        <div className="relative">
          <Search
            size={14}
            className="absolute left-2.5 top-1/2 -translate-y-1/2"
            style={{ color: CYBERPUNK_COLORS.textSecondary }}
          />
          <NeonInput
            placeholder="搜索操作记录..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8"
          />
        </div>
        <div className="flex flex-wrap gap-1">
          {FILTER_OPTIONS.map((f) => (
            <button
              key={f.value}
              className="px-2 py-1 text-xs font-mono rounded-sm border transition-all"
              style={{
                borderColor: filter === f.value ? CYBERPUNK_COLORS.accentCyan : CYBERPUNK_COLORS.borderColor,
                color: filter === f.value ? CYBERPUNK_COLORS.accentCyan : CYBERPUNK_COLORS.textSecondary,
                backgroundColor: filter === f.value ? getGlowColor(CYBERPUNK_COLORS.accentCyan, 0.1) : 'transparent',
              }}
              onClick={() => setFilter(f.value)}
            >
              {f.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1.5">
          <Users size={12} style={{ color: CYBERPUNK_COLORS.textSecondary }} />
          <select
            value={memberFilter}
            onChange={(e) => setMemberFilter(e.target.value)}
            className="flex-1 text-xs font-mono px-2 py-1 rounded-sm border"
            style={{
              backgroundColor: CYBERPUNK_COLORS.bgPrimary,
              borderColor: CYBERPUNK_COLORS.borderColor,
              color: memberFilter === 'all' ? CYBERPUNK_COLORS.textSecondary : CYBERPUNK_COLORS.accentPurple,
            }}
          >
            <option value="all">全部成员</option>
            {collaborators.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.role})
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {filtered.length === 0 && (
          <div
            className="text-xs font-mono text-center py-4"
            style={{ color: CYBERPUNK_COLORS.textSecondary }}
          >
            暂无操作记录
          </div>
        )}
        {filtered.map((log) => {
          const prefix = getActionPrefix(log.action);
          const barColor = ACTION_BAR_COLORS[prefix] || CYBERPUNK_COLORS.accentYellow;
          const isExpanded = expandedId === log.id;
          const hasSnapshot = !!log.snapshot;
          const canRestore = (log.targetType === 'evidence' || log.targetType === 'connection') && hasSnapshot;

          return (
            <div
              key={log.id}
              className="rounded-sm border overflow-hidden"
              style={{
                borderColor: CYBERPUNK_COLORS.borderColor,
                backgroundColor: CYBERPUNK_COLORS.bgTertiary,
              }}
            >
              <div className="flex">
                <div
                  className="w-1 flex-shrink-0"
                  style={{
                    backgroundColor: barColor,
                    boxShadow: `0 0 6px ${getGlowColor(barColor, 0.4)}`,
                  }}
                />
                <div className="flex-1 p-2.5">
                  <div className="flex items-center gap-2 mb-1">
                    <div
                      className="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0"
                      style={{
                        backgroundColor: getGlowColor(barColor, 0.2),
                        color: barColor,
                      }}
                    >
                      {ACTION_ICONS[prefix] || <Edit3 size={12} />}
                    </div>
                    <span
                      className="text-xs font-mono"
                      style={{ color: barColor }}
                    >
                      {ACTION_LABELS[log.action] || log.action}
                    </span>
                    <span
                      className="text-xs font-mono truncate flex-1"
                      style={{ color: CYBERPUNK_COLORS.textPrimary }}
                    >
                      {log.detail.slice(0, 30)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span
                      className="text-xs font-mono"
                      style={{ color: CYBERPUNK_COLORS.textSecondary }}
                    >
                      {log.collaboratorName}
                    </span>
                    <span
                      className="text-xs font-mono"
                      style={{ color: CYBERPUNK_COLORS.textSecondary }}
                    >
                      {formatTimestamp(log.createdAt)}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 mt-1.5">
                    {hasSnapshot && (
                      <button
                        className="flex items-center gap-1 px-1.5 py-0.5 text-xs font-mono rounded-sm border transition-all"
                        style={{
                          borderColor: CYBERPUNK_COLORS.accentPurple,
                          color: CYBERPUNK_COLORS.accentPurple,
                          backgroundColor: getGlowColor(CYBERPUNK_COLORS.accentPurple, 0.08),
                        }}
                        onClick={() => setViewingLog(log)}
                        title="查看快照"
                      >
                        <Eye size={10} />
                        快照
                      </button>
                    )}
                    {canRestore && (
                      <button
                        className="flex items-center gap-1 px-1.5 py-0.5 text-xs font-mono rounded-sm border transition-all"
                        style={{
                          borderColor: CYBERPUNK_COLORS.accentCyan,
                          color: CYBERPUNK_COLORS.accentCyan,
                          backgroundColor: getGlowColor(CYBERPUNK_COLORS.accentCyan, 0.08),
                        }}
                        onClick={() => setViewingLog(log)}
                        title="恢复到此状态"
                      >
                        <RotateCcw size={10} />
                        恢复
                      </button>
                    )}
                    {hasSnapshot && !canRestore && (
                      <button
                        className="p-0.5 transition-colors"
                        style={{ color: CYBERPUNK_COLORS.textSecondary }}
                        onClick={() => setExpandedId(isExpanded ? null : log.id)}
                      >
                        {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                      </button>
                    )}
                  </div>
                  {isExpanded && log.snapshot && (
                    <div
                      className="mt-1.5 text-xs font-mono p-1.5 rounded-sm"
                      style={{
                        backgroundColor: CYBERPUNK_COLORS.bgPrimary,
                        color: CYBERPUNK_COLORS.textSecondary,
                        maxHeight: 120,
                        overflow: 'auto',
                      }}
                    >
                      {log.snapshot}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {viewingLog && (
        <SnapshotViewer
          log={viewingLog}
          onRestore={handleRestore}
          onClose={() => setViewingLog(null)}
        />
      )}
    </div>
  );
};

export default AuditLogPanel;
