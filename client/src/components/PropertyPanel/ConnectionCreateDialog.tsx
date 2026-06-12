import React, { useCallback, useEffect, useState } from 'react';
import { X, Link2, Palette, PenLine, Sparkles, AlertTriangle, Loader2, RefreshCw } from 'lucide-react';
import { NeonInput } from '@/components/ui/NeonInput';
import { NeonButton } from '@/components/ui/NeonButton';
import { useEvidenceStore } from '@/store/useEvidenceStore';
import { useCaseStore } from '@/store/useCaseStore';
import { useCaseTemplateStore } from '@/store/useCaseTemplateStore';
import { useUiStore } from '@/store/useUiStore';
import { useCanvasStore } from '@/store/useCanvasStore';
import { connectionApi } from '@/api/connectionApi';
import { captureConnectionSnapshot, recordAuditLog } from '@/utils/auditHelper';
import {
  CYBERPUNK_COLORS,
  getGlowColor,
} from '@/utils/colorUtils';
import type { Connection, TemplateRelationType } from '@/types';

const colorOptions = [
  CYBERPUNK_COLORS.accentCyan,
  CYBERPUNK_COLORS.accentRed,
  CYBERPUNK_COLORS.accentYellow,
  CYBERPUNK_COLORS.accentGreen,
  CYBERPUNK_COLORS.accentPurple,
  '#ff6b6b',
  '#4ecdc4',
  '#45b7d1',
];

const lineStyleOptions: Array<{ value: Connection['lineStyle']; label: string; dash: string }> = [
  { value: 'solid', label: '实线', dash: 'none' },
  { value: 'dashed', label: '虚线', dash: '10,5' },
  { value: 'dotted', label: '点线', dash: '2,3' },
];

export const ConnectionCreateDialog: React.FC = () => {
  const connectionDialogOpen = useUiStore((state) => state.connectionDialogOpen);
  const pendingConnection = useUiStore((state) => state.pendingConnection);
  const closeConnectionDialog = useUiStore((state) => state.closeConnectionDialog);
  const updatePendingConnection = useUiStore((state) => state.updatePendingConnection);
  const connectionCreationError = useUiStore((state) => state.connectionCreationError);
  const setConnectionCreationError = useUiStore((state) => state.setConnectionCreationError);

  const getEvidenceById = useEvidenceStore((state) => state.getEvidenceById);
  const currentCase = useCaseStore((state) => state.currentCase);
  const appliedTemplateData = useCaseTemplateStore((state) => state.appliedTemplateData);
  const addConnection = useCanvasStore((state) => state.addConnection);
  const removeConnection = useCanvasStore((state) => state.removeConnection);
  const setSelectedConnectionId = useCanvasStore((state) => state.setSelectedConnectionId);
  const setSelectedId = useCanvasStore((state) => state.setSelectedId);
  const setPendingRelationType = useUiStore((state) => state.setPendingRelationType);
  const pendingRelationType = useUiStore((state) => state.pendingRelationType);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  useEffect(() => {
    return () => {
      if (pendingConnection?.tempConnectionId && !isSuccess) {
        removeConnection(pendingConnection.tempConnectionId);
      }
    };
  }, [pendingConnection?.tempConnectionId, isSuccess, removeConnection]);

  const fromEvidence = pendingConnection ? getEvidenceById(pendingConnection.fromEvidenceId) : null;
  const toEvidence = pendingConnection ? getEvidenceById(pendingConnection.toEvidenceId) : null;
  const presetRelations: TemplateRelationType[] = appliedTemplateData?.relationTypes ?? [];

  const handleApplyPreset = useCallback(
    (preset: TemplateRelationType) => {
      updatePendingConnection({
        label: preset.label,
        color: preset.color,
        lineStyle: preset.lineStyle,
        relationTypeId: preset.id,
      });
    },
    [updatePendingConnection]
  );

  const handleSubmit = useCallback(async () => {
    if (!pendingConnection || !currentCase) return;

    setIsSubmitting(true);
    setConnectionCreationError(null);

    const { fromEvidenceId, toEvidenceId, label, color, lineStyle, relationTypeId, tempConnectionId } = pendingConnection;

    try {
      const res = await connectionApi.create({
        caseId: currentCase.id,
        fromEvidenceId,
        toEvidenceId,
        label,
        color,
        lineStyle,
        relationTypeId: relationTypeId || undefined,
      });

      if (!res.success || !res.data) {
        throw new Error(res.error || '创建关联失败');
      }

      const realConnection: Connection = res.data;

      if (tempConnectionId) {
        removeConnection(tempConnectionId);
      }

      addConnection(realConnection);

      const snapshot = captureConnectionSnapshot(realConnection);
      const fromLabel = fromEvidence ? fromEvidence.content.slice(0, 20) : '?';
      const toLabel = toEvidence ? toEvidence.content.slice(0, 20) : '?';
      recordAuditLog(
        'create_connection',
        'connection',
        realConnection.id,
        `创建关联: ${fromLabel} → ${toLabel}${label ? ` (${label})` : ''}`,
        snapshot
      );

      if (pendingRelationType) {
        setPendingRelationType(null);
      }

      setIsSuccess(true);
      closeConnectionDialog();
      setSelectedConnectionId(realConnection.id);
      setSelectedId(null);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : '网络请求失败，请检查网络连接';
      setConnectionCreationError(errorMsg);
    } finally {
      setIsSubmitting(false);
    }
  }, [
    pendingConnection,
    currentCase,
    addConnection,
    removeConnection,
    fromEvidence,
    toEvidence,
    pendingRelationType,
    setPendingRelationType,
    closeConnectionDialog,
    setSelectedConnectionId,
    setSelectedId,
    setConnectionCreationError,
    setIsSuccess,
  ]);

  const handleRetry = useCallback(() => {
    setIsRetrying(true);
    setTimeout(() => {
      setIsRetrying(false);
      handleSubmit();
    }, 300);
  }, [handleSubmit]);

  const handleCancel = useCallback(() => {
    if (pendingConnection?.tempConnectionId) {
      removeConnection(pendingConnection.tempConnectionId);
    }
    closeConnectionDialog();
  }, [pendingConnection, removeConnection, closeConnectionDialog]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleCancel();
      } else if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
        if (!isSubmitting && !connectionCreationError) {
          handleSubmit();
        } else if (connectionCreationError) {
          handleRetry();
        }
      }
    },
    [handleCancel, handleSubmit, handleRetry, isSubmitting, connectionCreationError]
  );

  if (!connectionDialogOpen || !pendingConnection) return null;

  const currentPreset = presetRelations.find((r) => r.id === pendingConnection.relationTypeId);

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center"
      style={{
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(4px)',
      }}
      onClick={handleCancel}
      onKeyDown={handleKeyDown}
      role="dialog"
      aria-modal="true"
      aria-labelledby="connection-dialog-title"
    >
      <div
        className="relative w-full max-w-md mx-4 rounded-sm border overflow-hidden"
        style={{
          borderColor: pendingConnection.color,
          backgroundColor: CYBERPUNK_COLORS.bgSecondary,
          boxShadow: `0 0 30px ${getGlowColor(pendingConnection.color, 0.5)}`,
          animation: 'dialogIn 0.2s ease-out',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="flex items-center justify-between px-4 py-3 border-b"
          style={{
            borderColor: getGlowColor(pendingConnection.color, 0.3),
            backgroundColor: getGlowColor(pendingConnection.color, 0.08),
          }}
        >
          <div className="flex items-center gap-2">
            <Link2 size={16} style={{ color: pendingConnection.color }} />
            <h2
              id="connection-dialog-title"
              className="text-sm font-mono uppercase tracking-wider"
              style={{ color: pendingConnection.color }}
            >
              创建关联关系
            </h2>
          </div>
          <button
            className="p-1 rounded-sm transition-colors hover:bg-white/10"
            onClick={handleCancel}
            style={{ color: CYBERPUNK_COLORS.textSecondary }}
            title="关闭 (Esc)"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-4 space-y-4 max-h-[75vh] overflow-y-auto">
          <div
            className="text-xs font-mono p-3 rounded-sm border"
            style={{
              borderColor: pendingConnection.color,
              backgroundColor: getGlowColor(pendingConnection.color, 0.06),
              color: CYBERPUNK_COLORS.textSecondary,
            }}
          >
            <div className="flex items-center gap-2 mb-1">
              <span style={{ color: fromEvidence?.color || CYBERPUNK_COLORS.accentCyan }}>●</span>
              <span
                className="font-medium truncate"
                style={{ color: CYBERPUNK_COLORS.textPrimary }}
                title={fromEvidence?.content}
              >
                {fromEvidence ? fromEvidence.content.slice(0, 30) + (fromEvidence.content.length > 30 ? '...' : '') : '未知证据'}
              </span>
            </div>
            <div className="flex items-center gap-1 ml-4" style={{ color: pendingConnection.color }}>
              ↓ {pendingConnection.label || '关联'}
            </div>
            <div className="flex items-center gap-2 mt-1">
              <span style={{ color: toEvidence?.color || CYBERPUNK_COLORS.accentCyan }}>●</span>
              <span
                className="font-medium truncate"
                style={{ color: CYBERPUNK_COLORS.textPrimary }}
                title={toEvidence?.content}
              >
                {toEvidence ? toEvidence.content.slice(0, 30) + (toEvidence.content.length > 30 ? '...' : '') : '未知证据'}
              </span>
            </div>
          </div>

          {connectionCreationError && (
            <div
              className="flex items-start gap-2 p-3 rounded-sm border text-xs font-mono"
              style={{
                borderColor: CYBERPUNK_COLORS.accentRed,
                backgroundColor: getGlowColor(CYBERPUNK_COLORS.accentRed, 0.08),
                color: CYBERPUNK_COLORS.accentRed,
                animation: 'shake 0.3s ease-out',
              }}
            >
              <AlertTriangle size={16} className="flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <div className="font-semibold mb-1">创建失败</div>
                <div style={{ color: getGlowColor(CYBERPUNK_COLORS.accentRed, 0.9) }}>
                  {connectionCreationError}
                </div>
                <div className="mt-2 text-[10px]" style={{ color: getGlowColor(CYBERPUNK_COLORS.accentRed, 0.7) }}>
                  提示: 已保留您填写的内容，点击"重试"按钮或按 Ctrl+Enter 重新提交
                </div>
              </div>
            </div>
          )}

          {presetRelations.length > 0 && (
            <div className="space-y-2">
              <label
                className="block text-xs font-mono uppercase tracking-wider flex items-center gap-2"
                style={{ color: CYBERPUNK_COLORS.accentCyan }}
              >
                <Sparkles size={14} />
                快速选择模板关系
              </label>
              <div className="flex flex-wrap gap-2">
                {presetRelations.map((preset) => {
                  const isActive = pendingConnection.relationTypeId === preset.id;
                  return (
                    <button
                      key={preset.id}
                      className="px-3 py-1.5 text-xs font-mono rounded-sm border transition-all hover:scale-105"
                      style={{
                        borderColor: isActive ? preset.color : CYBERPUNK_COLORS.borderColor,
                        backgroundColor: isActive
                          ? getGlowColor(preset.color, 0.15)
                          : 'transparent',
                        color: isActive ? preset.color : CYBERPUNK_COLORS.textSecondary,
                        boxShadow: isActive
                          ? `0 0 8px ${getGlowColor(preset.color, 0.4)}`
                          : 'none',
                      }}
                      onClick={() => handleApplyPreset(preset)}
                      title={preset.description}
                    >
                      {preset.label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div>
            <NeonInput
              label="关系说明/标签"
              value={pendingConnection.label}
              onChange={(e) => updatePendingConnection({ label: e.target.value })}
              placeholder="例: 诱导注册、资金转移、因果关系..."
              glowColor={pendingConnection.color}
              error={connectionCreationError ? undefined : undefined}
            />
          </div>

          {currentPreset && (
            <div
              className="flex items-center justify-between p-2 rounded-sm border text-xs"
              style={{
                borderColor: currentPreset.color,
                backgroundColor: getGlowColor(currentPreset.color, 0.08),
              }}
            >
              <div className="flex items-center gap-2">
                <Sparkles size={12} style={{ color: currentPreset.color }} />
                <span style={{ color: currentPreset.color }}>
                  已应用模板: {currentPreset.label}
                </span>
              </div>
              <button
                className="p-1 rounded-sm hover:bg-white/10 transition-colors"
                onClick={() => updatePendingConnection({ relationTypeId: null })}
                title="清除模板应用"
                style={{ color: CYBERPUNK_COLORS.textSecondary }}
              >
                <X size={12} />
              </button>
            </div>
          )}

          <div className="space-y-2">
            <label
              className="block text-xs font-mono uppercase tracking-wider flex items-center gap-2"
              style={{ color: CYBERPUNK_COLORS.textSecondary }}
            >
              <Palette size={14} />
              线条颜色
            </label>
            <div className="flex flex-wrap gap-2">
              {colorOptions.map((color) => (
                <button
                  key={color}
                  className="w-8 h-8 rounded-sm border transition-all hover:scale-110"
                  style={{
                    backgroundColor: color,
                    borderColor: pendingConnection.color === color ? color : CYBERPUNK_COLORS.borderColor,
                    boxShadow:
                      pendingConnection.color === color
                        ? `0 0 15px ${getGlowColor(color, 0.8)}`
                        : 'none',
                  }}
                  onClick={() => updatePendingConnection({ color })}
                  title={color}
                />
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <label
              className="block text-xs font-mono uppercase tracking-wider flex items-center gap-2"
              style={{ color: CYBERPUNK_COLORS.textSecondary }}
            >
              <PenLine size={14} />
              线条样式
            </label>
            <div className="flex gap-2">
              {lineStyleOptions.map((option) => {
                const isActive = pendingConnection.lineStyle === option.value;
                return (
                  <button
                    key={option.value}
                    className="flex-1 px-3 py-2 text-xs font-mono border rounded-sm transition-all"
                    style={{
                      borderColor: isActive ? pendingConnection.color : CYBERPUNK_COLORS.borderColor,
                      color: isActive ? pendingConnection.color : CYBERPUNK_COLORS.textSecondary,
                      backgroundColor: isActive ? getGlowColor(pendingConnection.color, 0.1) : 'transparent',
                      boxShadow: isActive ? `0 0 10px ${getGlowColor(pendingConnection.color, 0.4)}` : 'none',
                    }}
                    onClick={() => updatePendingConnection({ lineStyle: option.value })}
                  >
                    <svg width="100%" height="12" className="mb-1">
                      <line
                        x1="0" y1="6" x2="100%" y2="6"
                        stroke={isActive ? pendingConnection.color : CYBERPUNK_COLORS.textSecondary}
                        strokeWidth="2"
                        strokeDasharray={option.dash}
                      />
                    </svg>
                    {option.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div
          className="flex gap-2 px-4 py-3 border-t"
          style={{
            borderColor: getGlowColor(pendingConnection.color, 0.2),
            backgroundColor: getGlowColor(CYBERPUNK_COLORS.bgTertiary || CYBERPUNK_COLORS.bgPrimary, 0.5),
          }}
        >
          <NeonButton
            variant="secondary"
            onClick={handleCancel}
            className="flex-1"
            size="md"
          >
            取消
          </NeonButton>

          {connectionCreationError ? (
            <NeonButton
              variant="warning"
              icon={isRetrying ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
              onClick={handleRetry}
              className="flex-1"
              size="md"
              disabled={isSubmitting || isRetrying}
            >
              重试
            </NeonButton>
          ) : (
            <NeonButton
              variant="primary"
              icon={isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <Link2 size={16} />}
              onClick={handleSubmit}
              className="flex-1"
              size="md"
              disabled={isSubmitting}
              glowColor={pendingConnection.color}
            >
              {isSubmitting ? '创建中...' : '确认创建'}
            </NeonButton>
          )}
        </div>

        <div
          className="px-4 py-1.5 text-[10px] font-mono text-center border-t"
          style={{
            borderColor: getGlowColor(pendingConnection.color, 0.1),
            color: CYBERPUNK_COLORS.textSecondary,
            backgroundColor: 'rgba(0,0,0,0.3)',
          }}
        >
          快捷键: Esc 取消 | Ctrl/⌘ + Enter {connectionCreationError ? '重试' : '确认创建'}
        </div>

        <style>{`
          @keyframes dialogIn {
            from {
              opacity: 0;
              transform: translateY(-12px) scale(0.97);
            }
            to {
              opacity: 1;
              transform: translateY(0) scale(1);
            }
          }
          @keyframes shake {
            0%, 100% { transform: translateX(0); }
            20% { transform: translateX(-4px); }
            40% { transform: translateX(4px); }
            60% { transform: translateX(-2px); }
            80% { transform: translateX(2px); }
          }
        `}</style>
      </div>
    </div>
  );
};

export default ConnectionCreateDialog;
