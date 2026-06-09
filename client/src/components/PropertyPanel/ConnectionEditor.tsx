import React, { useCallback } from 'react';
import { Trash2, Palette, PenLine } from 'lucide-react';
import { NeonInput } from '@/components/ui/NeonInput';
import { NeonButton } from '@/components/ui/NeonButton';
import { useCanvasStore } from '@/store/useCanvasStore';
import { useEvidenceStore } from '@/store/useEvidenceStore';
import { connectionApi } from '@/api/connectionApi';
import { captureConnectionSnapshot, recordAuditLog } from '@/utils/auditHelper';
import {
  CYBERPUNK_COLORS,
  getGlowColor,
} from '@/utils/colorUtils';
import type { Connection } from '@/types';

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

  const fromEvidence = getEvidenceById(connection.fromEvidenceId);
  const toEvidence = getEvidenceById(connection.toEvidenceId);

  const handleUpdate = useCallback(
    async (field: string, value: string) => {
      const snapshot = captureConnectionSnapshot(connection);
      const patch: Partial<Connection> = { [field]: value };
      patchConnection(connection.id, patch);

      try {
        await connectionApi.update(connection.id, { [field]: value });
        recordAuditLog(
          'update_connection',
          'connection',
          connection.id,
          `更新关联: ${field === 'label' ? '标签' : field === 'color' ? '颜色' : '线型'}`,
          snapshot
        );
      } catch {
        patchConnection(connection.id, { [field]: (connection as unknown as Record<string, string>)[field] } as Partial<Connection>);
      }
    },
    [connection, patchConnection]
  );

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
