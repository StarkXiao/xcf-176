import React, { useCallback } from 'react';
import { Trash2, Palette, PenLine, Sparkles, Link2, X } from 'lucide-react';
import { NeonInput } from '@/components/ui/NeonInput';
import { NeonButton } from '@/components/ui/NeonButton';
import { useCanvasStore } from '@/store/useCanvasStore';
import { useEvidenceStore } from '@/store/useEvidenceStore';
import { useCaseTemplateStore } from '@/store/useCaseTemplateStore';
import { connectionApi } from '@/api/connectionApi';
import { captureConnectionSnapshot, recordAuditLog } from '@/utils/auditHelper';
import {
  CYBERPUNK_COLORS,
  getGlowColor,
} from '@/utils/colorUtils';
import type { Connection, TemplateRelationType } from '@/types';

interface ConnectionEditorProps {
  connection: Connection;
}

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

export const ConnectionEditor: React.FC<ConnectionEditorProps> = ({ connection }) => {
  const patchConnection = useCanvasStore((state) => state.patchConnection);
  const removeConnection = useCanvasStore((state) => state.removeConnection);
  const setSelectedConnectionId = useCanvasStore((state) => state.setSelectedConnectionId);
  const getEvidenceById = useEvidenceStore((state) => state.getEvidenceById);
  const appliedTemplateData = useCaseTemplateStore((state) => state.appliedTemplateData);

  const fromEvidence = getEvidenceById(connection.fromEvidenceId);
  const toEvidence = getEvidenceById(connection.toEvidenceId);

  const presetRelations: TemplateRelationType[] = appliedTemplateData?.relationTypes ?? [];

  const handleUpdate = useCallback(
    async (field: 'label' | 'color' | 'lineStyle', value: string) => {
      const snapshot = captureConnectionSnapshot(connection);
      const patch: Partial<Connection> = { [field]: value };
      patchConnection(connection.id, patch);

      try {
        await connectionApi.update(connection.id, patch);
        recordAuditLog(
          'update_connection',
          'connection',
          connection.id,
          `更新关联: ${field === 'label' ? '标签' : field === 'color' ? '颜色' : '线型'}`,
          snapshot
        );
      } catch {
        patchConnection(connection.id, { [field]: connection[field] } as Partial<Connection>);
      }
    },
    [connection, patchConnection]
  );

  const handleApplyPreset = useCallback(
    async (preset: TemplateRelationType) => {
      const snapshot = captureConnectionSnapshot(connection);
      const patch: Partial<Connection> = {
        label: preset.label,
        color: preset.color,
        lineStyle: preset.lineStyle,
        relationTypeId: preset.id,
      };
      patchConnection(connection.id, patch);

      try {
        await connectionApi.update(connection.id, patch);
        recordAuditLog(
          'update_connection',
          'connection',
          connection.id,
          `应用模板关系: ${preset.label}`,
          snapshot
        );
      } catch {
        patchConnection(connection.id, {
          label: connection.label,
          color: connection.color,
          lineStyle: connection.lineStyle,
          relationTypeId: connection.relationTypeId,
        });
      }
    },
    [connection, patchConnection]
  );

  const handleRelationTypeChange = useCallback(
    async (relationTypeId: string | null) => {
      const snapshot = captureConnectionSnapshot(connection);
      const patch: Partial<Connection> = { relationTypeId };
      patchConnection(connection.id, patch);

      try {
        await connectionApi.update(connection.id, patch);
        recordAuditLog(
          'update_connection',
          'connection',
          connection.id,
          relationTypeId ? '设置关系类型' : '清除关系类型',
          snapshot
        );
      } catch {
        patchConnection(connection.id, { relationTypeId: connection.relationTypeId });
      }
    },
    [connection, patchConnection]
  );

  const currentRelationType = presetRelations.find((r) => r.id === connection.relationTypeId);

  const handleDelete = useCallback(async () => {
    const snapshot = captureConnectionSnapshot(connection);
    const fromLabel = fromEvidence ? fromEvidence.content.slice(0, 15) : '?';
    const toLabel = toEvidence ? toEvidence.content.slice(0, 15) : '?';

    try {
      const res = await connectionApi.delete(connection.id);
      if (!res.success) {
        alert(res.error || '删除关联失败');
        return;
      }
    } catch (err) {
      alert('删除关联失败，请检查网络连接');
      return;
    }

    recordAuditLog(
      'delete_connection',
      'connection',
      connection.id,
      `删除关联: ${fromLabel} → ${toLabel}`,
      snapshot
    );
    removeConnection(connection.id);
    setSelectedConnectionId(null);
  }, [connection, fromEvidence, toEvidence, removeConnection, setSelectedConnectionId]);

  return (
    <div className="space-y-4">
      <div
        className="text-xs font-mono p-2 rounded-sm border"
        style={{
          borderColor: connection.color,
          backgroundColor: getGlowColor(connection.color, 0.06),
          color: CYBERPUNK_COLORS.textSecondary,
        }}
      >
        <div className="flex items-center gap-2 mb-1">
          <span style={{ color: connection.color }}>●</span>
          <span style={{ color: CYBERPUNK_COLORS.textPrimary }}>
            {fromEvidence ? fromEvidence.content.slice(0, 20) : '?'}
          </span>
        </div>
        <div className="flex items-center gap-1 ml-3" style={{ color: CYBERPUNK_COLORS.textSecondary }}>
          ↓ {connection.label || '关联'}
        </div>
        <div className="flex items-center gap-2 mt-1">
          <span style={{ color: connection.color }}>●</span>
          <span style={{ color: CYBERPUNK_COLORS.textPrimary }}>
            {toEvidence ? toEvidence.content.slice(0, 20) : '?'}
          </span>
        </div>
      </div>

      {presetRelations.length > 0 && (
        <div className="space-y-2">
          <label
            className="block text-xs font-mono uppercase tracking-wider flex items-center gap-2"
            style={{ color: CYBERPUNK_COLORS.accentCyan }}
          >
            <Sparkles size={14} />
            模板预置关系
          </label>
          <div className="flex flex-wrap gap-2">
            {presetRelations.map((preset) => {
              const isActive = connection.relationTypeId === preset.id;
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

      <div className="space-y-2">
        <label
          className="block text-xs font-mono uppercase tracking-wider flex items-center gap-2"
          style={{ color: CYBERPUNK_COLORS.textSecondary }}
        >
          <Link2 size={14} />
          关系类型
        </label>
        <div className="space-y-2">
          {currentRelationType ? (
            <div
              className="flex items-center justify-between p-2 rounded-sm border"
              style={{
                borderColor: currentRelationType.color,
                backgroundColor: getGlowColor(currentRelationType.color, 0.08),
              }}
            >
              <div className="flex items-center gap-2">
                <span style={{ color: currentRelationType.color }}>●</span>
                <span
                  className="text-xs font-mono"
                  style={{ color: currentRelationType.color }}
                >
                  {currentRelationType.label}
                </span>
              </div>
              <button
                className="p-1 rounded-sm hover:bg-red-500/20 transition-colors"
                onClick={() => handleRelationTypeChange(null)}
                title="清除关系类型"
                style={{ color: CYBERPUNK_COLORS.accentRed }}
              >
                <X size={14} />
              </button>
            </div>
          ) : (
            <div
              className="p-2 rounded-sm border text-xs font-mono text-center"
              style={{
                borderColor: CYBERPUNK_COLORS.borderColor,
                color: CYBERPUNK_COLORS.textSecondary,
                backgroundColor: CYBERPUNK_COLORS.bgTertiary,
              }}
            >
              未指定关系类型
            </div>
          )}
          {presetRelations.length > 0 && (
            <div>
              <select
                className="w-full p-2 text-xs font-mono rounded-sm border bg-transparent"
                style={{
                  borderColor: CYBERPUNK_COLORS.borderColor,
                  color: CYBERPUNK_COLORS.textPrimary,
                  backgroundColor: CYBERPUNK_COLORS.bgTertiary,
                }}
                value={connection.relationTypeId || ''}
                onChange={(e) => {
                  const value = e.target.value;
                  if (value) {
                    const preset = presetRelations.find((p) => p.id === value);
                    if (preset) {
                      handleApplyPreset(preset);
                    }
                  }
                }}
              >
                <option value="" style={{ backgroundColor: CYBERPUNK_COLORS.bgTertiary }}>
                  选择关系类型...
                </option>
                {presetRelations.map((preset) => (
                  <option
                    key={preset.id}
                    value={preset.id}
                    style={{ backgroundColor: CYBERPUNK_COLORS.bgTertiary }}
                  >
                    {preset.label}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      <div>
        <NeonInput
          label="关系标签"
          value={connection.label}
          onChange={(e) => handleUpdate('label', e.target.value)}
          placeholder="例: 诱导注册、资金转移..."
        />
      </div>

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
                borderColor: connection.color === color ? color : CYBERPUNK_COLORS.borderColor,
                boxShadow:
                  connection.color === color
                    ? `0 0 15px ${getGlowColor(color, 0.8)}`
                    : 'none',
              }}
              onClick={() => handleUpdate('color', color)}
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
            const isActive = connection.lineStyle === option.value;
            return (
              <button
                key={option.value}
                className="flex-1 px-3 py-2 text-xs font-mono border rounded-sm transition-all"
                style={{
                  borderColor: isActive ? CYBERPUNK_COLORS.accentCyan : CYBERPUNK_COLORS.borderColor,
                  color: isActive ? CYBERPUNK_COLORS.accentCyan : CYBERPUNK_COLORS.textSecondary,
                  backgroundColor: isActive ? getGlowColor(CYBERPUNK_COLORS.accentCyan, 0.1) : 'transparent',
                  boxShadow: isActive ? `0 0 10px ${getGlowColor(CYBERPUNK_COLORS.accentCyan, 0.4)}` : 'none',
                }}
                onClick={() => handleUpdate('lineStyle', option.value)}
              >
                <svg width="100%" height="12" className="mb-1">
                  <line
                    x1="0" y1="6" x2="100%" y2="6"
                    stroke={isActive ? CYBERPUNK_COLORS.accentCyan : CYBERPUNK_COLORS.textSecondary}
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

      <div
        className="text-xs font-mono p-2 rounded-sm border"
        style={{
          borderColor: CYBERPUNK_COLORS.borderColor,
          color: CYBERPUNK_COLORS.textSecondary,
          backgroundColor: CYBERPUNK_COLORS.bgTertiary,
        }}
      >
        <div>ID: {connection.id.slice(0, 16)}...</div>
        <div>创建: {new Date(connection.createdAt).toLocaleString('zh-CN')}</div>
      </div>

      <NeonButton
        variant="danger"
        icon={<Trash2 size={16} />}
        onClick={handleDelete}
        className="w-full"
      >
        删除关联
      </NeonButton>
    </div>
  );
};

export default ConnectionEditor;
