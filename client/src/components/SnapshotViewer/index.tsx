import React, { useMemo, useState } from 'react';
import { X, RotateCcw, AlertTriangle, ArchiveRestore } from 'lucide-react';
import { CYBERPUNK_COLORS, getGlowColor } from '@/utils/colorUtils';
import type { AuditLog } from '@/types';

interface SnapshotViewerProps {
  log: AuditLog;
  isDeleted?: boolean;
  onRestore: (auditLogId: string) => Promise<void>;
  onClose: () => void;
}

const FIELD_LABELS: Record<string, string> = {
  id: 'ID',
  caseId: '案件ID',
  content: '内容',
  source: '来源',
  importance: '重要性',
  tags: '标签',
  positionX: 'X坐标',
  positionY: 'Y坐标',
  width: '宽度',
  height: '高度',
  color: '颜色',
  timestamp: '时间戳',
  assignedTo: '分配给',
  status: '状态',
  fromEvidenceId: '起点证据',
  toEvidenceId: '终点证据',
  label: '标签名',
  lineStyle: '线型',
};

const IMPORTANCE_MAP: Record<string, string> = {
  low: '低',
  normal: '普通',
  high: '高',
  critical: '关键',
};

const STATUS_MAP: Record<string, string> = {
  pending: '待处理',
  in_progress: '进行中',
  reviewed: '已审核',
  completed: '已完成',
};

const LINE_STYLE_MAP: Record<string, string> = {
  solid: '实线',
  dashed: '虚线',
  dotted: '点线',
};

const HIDDEN_FIELDS = new Set(['id', 'caseId']);

export const SnapshotViewer: React.FC<SnapshotViewerProps> = ({ log, isDeleted, onRestore, onClose }) => {
  const [restoring, setRestoring] = useState(false);
  const [confirmRestore, setConfirmRestore] = useState(false);

  const snapshot = useMemo(() => {
    if (!log.snapshot) return null;
    try {
      return JSON.parse(log.snapshot) as Record<string, unknown>;
    } catch {
      return null;
    }
  }, [log.snapshot]);

  const canRestore = (log.targetType === 'evidence' || log.targetType === 'connection') && !!snapshot;

  const handleRestore = async () => {
    if (!confirmRestore) {
      setConfirmRestore(true);
      return;
    }
    setRestoring(true);
    try {
      await onRestore(log.id);
    } finally {
      setRestoring(false);
      setConfirmRestore(false);
    }
  };

  const formatValue = (key: string, value: unknown): string => {
    if (value === null || value === undefined) return '-';
    if (Array.isArray(value)) return (value as string[]).join(', ');
    if (key === 'importance') return IMPORTANCE_MAP[String(value)] || String(value);
    if (key === 'status') return STATUS_MAP[String(value)] || String(value);
    if (key === 'lineStyle') return LINE_STYLE_MAP[String(value)] || String(value);
    if (key === 'tags') return Array.isArray(value) ? (value as string[]).join(', ') : String(value);
    if (key === 'fromEvidenceId' || key === 'toEvidenceId') return String(value).slice(0, 8) + '...';
    return String(value);
  };

  const restoreLabel = isDeleted ? '一键重建' : '一键恢复';
  const confirmLabel = isDeleted ? '确认重建此已删除项？' : '确认恢复到此快照状态？';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: 'rgba(0,0,0,0.7)' }}
      onClick={onClose}
    >
      <div
        className="w-[520px] max-h-[80vh] flex flex-col border rounded-sm"
        style={{
          backgroundColor: CYBERPUNK_COLORS.bgSecondary,
          borderColor: isDeleted ? CYBERPUNK_COLORS.accentRed : CYBERPUNK_COLORS.accentCyan,
          boxShadow: `0 0 20px ${getGlowColor(isDeleted ? CYBERPUNK_COLORS.accentRed : CYBERPUNK_COLORS.accentCyan, 0.3)}`,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="flex items-center justify-between px-4 py-3 border-b"
          style={{ borderColor: CYBERPUNK_COLORS.borderColor }}
        >
          <div className="flex items-center gap-2">
            {isDeleted ? (
              <ArchiveRestore
                size={16}
                style={{
                  color: CYBERPUNK_COLORS.accentRed,
                  filter: `drop-shadow(0 0 4px ${getGlowColor(CYBERPUNK_COLORS.accentRed, 0.6)})`,
                }}
              />
            ) : (
              <RotateCcw
                size={16}
                style={{
                  color: CYBERPUNK_COLORS.accentCyan,
                  filter: `drop-shadow(0 0 4px ${getGlowColor(CYBERPUNK_COLORS.accentCyan, 0.6)})`,
                }}
              />
            )}
            <span
              className="text-sm font-mono font-bold"
              style={{
                color: isDeleted ? CYBERPUNK_COLORS.accentRed : CYBERPUNK_COLORS.accentCyan,
                textShadow: `0 0 8px ${getGlowColor(isDeleted ? CYBERPUNK_COLORS.accentRed : CYBERPUNK_COLORS.accentCyan, 0.6)}`,
              }}
            >
              {isDeleted ? '已删除项 · 快照重建' : '快照回看'}
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1 transition-colors"
            style={{ color: CYBERPUNK_COLORS.textSecondary }}
          >
            <X size={16} />
          </button>
        </div>

        <div className="px-4 py-3 border-b space-y-2" style={{ borderColor: CYBERPUNK_COLORS.borderColor }}>
          <div className="flex items-center gap-4">
            <span className="text-xs font-mono" style={{ color: CYBERPUNK_COLORS.textSecondary }}>
              操作人:
            </span>
            <span className="text-xs font-mono" style={{ color: CYBERPUNK_COLORS.accentYellow }}>
              {log.collaboratorName || '未知'}
            </span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-xs font-mono" style={{ color: CYBERPUNK_COLORS.textSecondary }}>
              操作:
            </span>
            <span className="text-xs font-mono" style={{ color: CYBERPUNK_COLORS.textPrimary }}>
              {log.detail}
            </span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-xs font-mono" style={{ color: CYBERPUNK_COLORS.textSecondary }}>
              时间:
            </span>
            <span className="text-xs font-mono" style={{ color: CYBERPUNK_COLORS.textPrimary }}>
              {new Date(log.createdAt).toLocaleString('zh-CN')}
            </span>
          </div>
          {isDeleted && (
            <div
              className="flex items-center gap-1.5 px-2 py-1 rounded-sm"
              style={{
                backgroundColor: getGlowColor(CYBERPUNK_COLORS.accentRed, 0.1),
                border: `1px solid ${CYBERPUNK_COLORS.accentRed}`,
              }}
            >
              <AlertTriangle size={12} style={{ color: CYBERPUNK_COLORS.accentRed }} />
              <span className="text-xs font-mono" style={{ color: CYBERPUNK_COLORS.accentRed }}>
                此{log.targetType === 'evidence' ? '证据' : '关联'}已被删除，恢复将从快照重建
              </span>
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {snapshot ? (
            <div className="space-y-1.5">
              <div
                className="text-xs font-mono mb-2 px-2 py-1 rounded-sm"
                style={{
                  color: CYBERPUNK_COLORS.accentPurple,
                  backgroundColor: getGlowColor(CYBERPUNK_COLORS.accentPurple, 0.08),
                }}
              >
                {isDeleted ? '完整快照（将用于重建）' : '操作前状态快照'}
              </div>
              {Object.entries(snapshot)
                .filter(([key]) => !HIDDEN_FIELDS.has(key))
                .map(([key, value]) => (
                  <div
                    key={key}
                    className="flex items-start border-b py-1.5"
                    style={{ borderColor: CYBERPUNK_COLORS.borderColor }}
                  >
                    <span
                      className="text-xs font-mono w-20 flex-shrink-0"
                      style={{ color: CYBERPUNK_COLORS.textSecondary }}
                    >
                      {FIELD_LABELS[key] || key}
                    </span>
                    <span
                      className="text-xs font-mono break-all"
                      style={{ color: CYBERPUNK_COLORS.textPrimary }}
                    >
                      {formatValue(key, value)}
                    </span>
                  </div>
                ))}
            </div>
          ) : (
            <div
              className="text-xs font-mono text-center py-6"
              style={{ color: CYBERPUNK_COLORS.textSecondary }}
            >
              此操作未记录快照
            </div>
          )}
        </div>

        {canRestore && (
          <div
            className="px-4 py-3 border-t flex items-center justify-between"
            style={{ borderColor: CYBERPUNK_COLORS.borderColor }}
          >
            {confirmRestore && (
              <div className="flex items-center gap-1.5">
                <AlertTriangle size={14} style={{ color: CYBERPUNK_COLORS.accentYellow }} />
                <span className="text-xs font-mono" style={{ color: CYBERPUNK_COLORS.accentYellow }}>
                  {confirmLabel}
                </span>
              </div>
            )}
            {!confirmRestore && <div />}
            <div className="flex items-center gap-2">
              {confirmRestore && (
                <button
                  className="px-3 py-1.5 text-xs font-mono rounded-sm border transition-all"
                  style={{
                    borderColor: CYBERPUNK_COLORS.borderColor,
                    color: CYBERPUNK_COLORS.textSecondary,
                  }}
                  onClick={() => setConfirmRestore(false)}
                >
                  取消
                </button>
              )}
              <button
                className="px-3 py-1.5 text-xs font-mono rounded-sm border transition-all flex items-center gap-1.5"
                style={{
                  borderColor: confirmRestore ? CYBERPUNK_COLORS.accentRed : isDeleted ? CYBERPUNK_COLORS.accentRed : CYBERPUNK_COLORS.accentCyan,
                  color: confirmRestore ? CYBERPUNK_COLORS.accentRed : isDeleted ? CYBERPUNK_COLORS.accentRed : CYBERPUNK_COLORS.accentCyan,
                  backgroundColor: confirmRestore
                    ? getGlowColor(CYBERPUNK_COLORS.accentRed, 0.1)
                    : isDeleted
                    ? getGlowColor(CYBERPUNK_COLORS.accentRed, 0.1)
                    : getGlowColor(CYBERPUNK_COLORS.accentCyan, 0.1),
                  boxShadow: confirmRestore || isDeleted
                    ? `0 0 8px ${getGlowColor(CYBERPUNK_COLORS.accentRed, 0.3)}`
                    : `0 0 8px ${getGlowColor(CYBERPUNK_COLORS.accentCyan, 0.3)}`,
                }}
                onClick={handleRestore}
                disabled={restoring}
              >
                {isDeleted ? <ArchiveRestore size={12} /> : <RotateCcw size={12} />}
                {restoring ? (isDeleted ? '重建中...' : '恢复中...') : confirmRestore ? (isDeleted ? '确认重建' : '确认恢复') : restoreLabel}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SnapshotViewer;
