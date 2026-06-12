import React, { useCallback } from 'react';
import { Trash2, Palette, UserCheck, Activity, Shield, ShieldCheck } from 'lucide-react';
import { NeonInput } from '@/components/ui/NeonInput';
import { NeonButton } from '@/components/ui/NeonButton';
import { TagEditor } from './TagEditor';
import { useEvidenceStore } from '@/store/useEvidenceStore';
import { useCanvasStore } from '@/store/useCanvasStore';
import { useCollaboratorStore } from '@/store/useCollaboratorStore';
import {
  CYBERPUNK_COLORS,
  getGlowColor,
  IMPORTANCE_COLORS,
  SOURCE_CREDIBILITY_COLORS,
  SOURCE_CREDIBILITY_LABELS,
  VERIFICATION_STATUS_COLORS,
  VERIFICATION_STATUS_LABELS,
} from '@/utils/colorUtils';
import { recordAuditLog } from '@/utils/auditHelper';
import type { Evidence, ImportanceLevel, TaskStatus, EvidenceSourceCredibility, EvidenceVerificationStatus } from '@/types';

interface EvidenceEditorProps {
  evidence: Evidence;
}

const importanceOptions: Array<{ value: ImportanceLevel; label: string }> = [
  { value: 'low', label: '低' },
  { value: 'normal', label: '中' },
  { value: 'high', label: '高' },
  { value: 'critical', label: '紧急' },
];

const credibilityOptions: Array<{ value: EvidenceSourceCredibility; label: string }> = [
  { value: 'very_low', label: '极低' },
  { value: 'low', label: '低' },
  { value: 'medium', label: '中' },
  { value: 'high', label: '高' },
  { value: 'very_high', label: '极高' },
];

const verificationOptions: Array<{ value: EvidenceVerificationStatus; label: string }> = [
  { value: 'unverified', label: '未核验' },
  { value: 'pending', label: '核验中' },
  { value: 'verified', label: '已核验' },
  { value: 'failed', label: '核验失败' },
  { value: 'disputed', label: '有争议' },
];

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

const statusOptions: Array<{ value: TaskStatus; label: string; color: string }> = [
  { value: 'pending', label: '待处理', color: CYBERPUNK_COLORS.textSecondary },
  { value: 'in_progress', label: '进行中', color: CYBERPUNK_COLORS.accentCyan },
  { value: 'completed', label: '已完成', color: CYBERPUNK_COLORS.accentGreen },
  { value: 'reviewed', label: '已审核', color: CYBERPUNK_COLORS.accentPurple },
];

export const EvidenceEditor: React.FC<EvidenceEditorProps> = ({ evidence }) => {
  const updateEvidence = useEvidenceStore((state) => state.updateEvidence);
  const deleteEvidence = useEvidenceStore((state) => state.deleteEvidence);
  const setSelectedId = useCanvasStore((state) => state.setSelectedId);
  const collaborators = useCollaboratorStore((state) => state.collaborators);

  const handleFieldChange = useCallback(
    (field: keyof Evidence, value: string | number | string[]) => {
      updateEvidence(evidence.id, { [field]: value } as Partial<Evidence>);
    },
    [evidence.id, updateEvidence]
  );

  const handleTagsChange = useCallback(
    (tags: string[]) => {
      handleFieldChange('tags', tags);
    },
    [handleFieldChange]
  );

  const handleDelete = useCallback(async () => {
    if (confirm('确定要删除此证据吗？')) {
      await deleteEvidence(evidence.id);
      setSelectedId(null);
    }
  }, [evidence.id, deleteEvidence, setSelectedId]);

  return (
    <div className="space-y-4">
      <div>
        <NeonInput
          label="内容"
          value={evidence.content}
          onChange={(e) => handleFieldChange('content', e.target.value)}
        />
      </div>

      <div>
        <NeonInput
          label="来源"
          value={evidence.source}
          onChange={(e) => handleFieldChange('source', e.target.value)}
          placeholder="证据来源..."
        />
      </div>

      <div className="space-y-2">
        <label
          className="block text-xs font-mono uppercase tracking-wider"
          style={{ color: CYBERPUNK_COLORS.textSecondary }}
        >
          重要性
        </label>
        <div className="flex gap-2">
          {importanceOptions.map((option) => {
            const isActive = evidence.importance === option.value;
            const color = IMPORTANCE_COLORS[option.value];
            return (
              <button
                key={option.value}
                className="flex-1 px-3 py-2 text-xs font-mono uppercase border rounded-sm transition-all"
                style={{
                  borderColor: isActive ? color : CYBERPUNK_COLORS.borderColor,
                  color: isActive ? color : CYBERPUNK_COLORS.textSecondary,
                  backgroundColor: isActive ? getGlowColor(color, 0.1) : 'transparent',
                  boxShadow: isActive ? `0 0 10px ${getGlowColor(color, 0.4)}` : 'none',
                }}
                onClick={() => handleFieldChange('importance', option.value)}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="space-y-2">
        <label
          className="block text-xs font-mono uppercase tracking-wider flex items-center gap-2"
          style={{ color: CYBERPUNK_COLORS.textSecondary }}
        >
          <Shield size={14} />
          来源可信度
        </label>
        <div className="flex gap-2">
          {credibilityOptions.map((option) => {
            const isActive = evidence.sourceCredibility === option.value;
            const color = SOURCE_CREDIBILITY_COLORS[option.value];
            return (
              <button
                key={option.value}
                className="flex-1 px-3 py-2 text-xs font-mono border rounded-sm transition-all"
                style={{
                  borderColor: isActive ? color : CYBERPUNK_COLORS.borderColor,
                  color: isActive ? color : CYBERPUNK_COLORS.textSecondary,
                  backgroundColor: isActive ? getGlowColor(color, 0.1) : 'transparent',
                  boxShadow: isActive ? `0 0 10px ${getGlowColor(color, 0.4)}` : 'none',
                }}
                onClick={() => handleFieldChange('sourceCredibility', option.value)}
                title={SOURCE_CREDIBILITY_LABELS[option.value]}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="space-y-2">
        <label
          className="block text-xs font-mono uppercase tracking-wider flex items-center gap-2"
          style={{ color: CYBERPUNK_COLORS.textSecondary }}
        >
          <ShieldCheck size={14} />
          核验状态
        </label>
        <div className="flex flex-wrap gap-2">
          {verificationOptions.map((option) => {
            const isActive = evidence.verificationStatus === option.value;
            const color = VERIFICATION_STATUS_COLORS[option.value];
            return (
              <button
                key={option.value}
                className="flex-1 px-2 py-2 text-xs font-mono border rounded-sm transition-all min-w-[70px]"
                style={{
                  borderColor: isActive ? color : CYBERPUNK_COLORS.borderColor,
                  color: isActive ? color : CYBERPUNK_COLORS.textSecondary,
                  backgroundColor: isActive ? getGlowColor(color, 0.1) : 'transparent',
                  boxShadow: isActive ? `0 0 10px ${getGlowColor(color, 0.4)}` : 'none',
                }}
                onClick={() => handleFieldChange('verificationStatus', option.value)}
                title={VERIFICATION_STATUS_LABELS[option.value]}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="space-y-2">
        <label
          className="block text-xs font-mono uppercase tracking-wider flex items-center gap-2"
          style={{ color: CYBERPUNK_COLORS.textSecondary }}
        >
          <Palette size={14} />
          卡片颜色
        </label>
        <div className="flex flex-wrap gap-2">
          {colorOptions.map((color) => (
            <button
              key={color}
              className="w-8 h-8 rounded-sm border transition-all hover:scale-110"
              style={{
                backgroundColor: color,
                borderColor: evidence.color === color ? color : CYBERPUNK_COLORS.borderColor,
                boxShadow:
                  evidence.color === color
                    ? `0 0 15px ${getGlowColor(color, 0.8)}`
                    : 'none',
              }}
              onClick={() => handleFieldChange('color', color)}
            />
          ))}
        </div>
      </div>

      <TagEditor tags={evidence.tags} onTagsChange={handleTagsChange} />

      <div className="space-y-2">
        <label
          className="block text-xs font-mono uppercase tracking-wider flex items-center gap-2"
          style={{ color: CYBERPUNK_COLORS.textSecondary }}
        >
          <UserCheck size={14} />
          负责人
        </label>
        <select
          value={evidence.assignedTo || ''}
          onChange={(e) => {
            const value = e.target.value || null;
            updateEvidence(evidence.id, { assignedTo: value });
            const collaborator = value ? collaborators.find((c) => c.id === value) : null;
            recordAuditLog(
              'assign_evidence',
              'evidence',
              evidence.id,
              collaborator ? `分配给 ${collaborator.name}` : '取消分配'
            );
          }}
          className="w-full px-3 py-2 text-sm font-mono border rounded-sm focus:outline-none"
          style={{
            backgroundColor: CYBERPUNK_COLORS.bgSecondary,
            borderColor: CYBERPUNK_COLORS.borderColor,
            color: CYBERPUNK_COLORS.textPrimary,
          }}
        >
          <option value="">未分配</option>
          {collaborators.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        <label
          className="block text-xs font-mono uppercase tracking-wider flex items-center gap-2"
          style={{ color: CYBERPUNK_COLORS.textSecondary }}
        >
          <Activity size={14} />
          处理状态
        </label>
        <div className="flex gap-2">
          {statusOptions.map((option) => {
            const isActive = evidence.status === option.value;
            return (
              <button
                key={option.value}
                className="flex-1 px-2 py-1.5 text-xs font-mono border rounded-sm transition-all"
                style={{
                  borderColor: isActive ? option.color : CYBERPUNK_COLORS.borderColor,
                  color: isActive ? option.color : CYBERPUNK_COLORS.textSecondary,
                  backgroundColor: isActive ? getGlowColor(option.color, 0.1) : 'transparent',
                  boxShadow: isActive ? `0 0 10px ${getGlowColor(option.color, 0.4)}` : 'none',
                }}
                onClick={() => {
                  updateEvidence(evidence.id, { status: option.value });
                  recordAuditLog(
                    'change_status',
                    'evidence',
                    evidence.id,
                    `状态变更为 ${option.label}`
                  );
                }}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 pt-4 border-t" style={{ borderColor: CYBERPUNK_COLORS.borderColor }}>
        <div>
          <NeonInput
            label="宽度"
            type="number"
            value={evidence.width}
            onChange={(e) => handleFieldChange('width', parseInt(e.target.value) || 200)}
            glowColor={CYBERPUNK_COLORS.accentYellow}
          />
        </div>
        <div>
          <NeonInput
            label="高度"
            type="number"
            value={evidence.height}
            onChange={(e) => handleFieldChange('height', parseInt(e.target.value) || 120)}
            glowColor={CYBERPUNK_COLORS.accentYellow}
          />
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
        <div>ID: {evidence.id.slice(0, 16)}...</div>
        <div>位置: ({evidence.positionX}, {evidence.positionY})</div>
        <div>创建: {new Date(evidence.createdAt).toLocaleString('zh-CN')}</div>
      </div>

      <NeonButton
        variant="danger"
        icon={<Trash2 size={16} />}
        onClick={handleDelete}
        className="w-full"
      >
        删除证据
      </NeonButton>
    </div>
  );
};

export default EvidenceEditor;
