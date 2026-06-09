import React, { useState } from 'react';
import { Users, X, Plus, Trash2 } from 'lucide-react';
import { NeonInput } from '@/components/ui/NeonInput';
import { NeonButton } from '@/components/ui/NeonButton';
import { useCaseStore } from '@/store/useCaseStore';
import { useCollaboratorStore } from '@/store/useCollaboratorStore';
import { useUiStore } from '@/store/useUiStore';
import { CYBERPUNK_COLORS, getGlowColor } from '@/utils/colorUtils';
import { recordAuditLog } from '@/utils/auditHelper';
import type { Collaborator } from '@/types';

const ROLE_LABELS: Record<Collaborator['role'], string> = {
  lead: '负责人',
  analyst: '分析员',
  assistant: '操作员',
  reviewer: '审核员',
};

const ROLE_COLORS: Record<Collaborator['role'], string> = {
  lead: CYBERPUNK_COLORS.accentYellow,
  analyst: CYBERPUNK_COLORS.accentCyan,
  assistant: CYBERPUNK_COLORS.accentGreen,
  reviewer: CYBERPUNK_COLORS.accentPurple,
};

export const CollaboratorPanel: React.FC = () => {
  const currentCase = useCaseStore((s) => s.currentCase);
  const collaborators = useCollaboratorStore((s) => s.collaborators);
  const addCollaborator = useCollaboratorStore((s) => s.addCollaborator);
  const deleteCollaborator = useCollaboratorStore((s) => s.deleteCollaborator);
  const toggleCollaboratorPanel = useUiStore((s) => s.toggleCollaboratorPanel);

  const [name, setName] = useState('');
  const [role, setRole] = useState<Collaborator['role']>('analyst');

  const collaboratorArray = collaborators;

  const handleAdd = async () => {
    if (!name.trim() || !currentCase) return;
    const result = await addCollaborator({
      caseId: currentCase.id,
      name: name.trim(),
      role,
    });
    if (result) {
      await recordAuditLog('add_collaborator', 'collaborator', result.id, `添加成员 ${result.name}`);
      setName('');
    }
  };

  const handleDelete = async (c: Collaborator) => {
    if (!currentCase) return;
    await deleteCollaborator(c.id);
    await recordAuditLog('remove_collaborator', 'collaborator', c.id, `移除成员 ${c.name}`);
  };

  return (
    <div
      className="h-full flex flex-col border-l"
      style={{
        width: 320,
        backgroundColor: CYBERPUNK_COLORS.bgSecondary,
        borderColor: CYBERPUNK_COLORS.borderColor,
      }}
    >
      <div
        className="flex items-center justify-between px-4 py-3 border-b"
        style={{ borderColor: CYBERPUNK_COLORS.borderColor }}
      >
        <div className="flex items-center gap-2">
          <Users
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
            协同成员
          </span>
        </div>
        <button
          onClick={toggleCollaboratorPanel}
          className="p-1 transition-colors"
          style={{ color: CYBERPUNK_COLORS.textSecondary }}
        >
          <X size={16} />
        </button>
      </div>

      <div className="p-3 space-y-3 border-b" style={{ borderColor: CYBERPUNK_COLORS.borderColor }}>
        <NeonInput
          placeholder="成员名称"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <div className="flex gap-2">
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as Collaborator['role'])}
            className="flex-1 px-3 py-2 text-sm font-mono border rounded-sm focus:outline-none"
            style={{
              backgroundColor: CYBERPUNK_COLORS.bgPrimary,
              borderColor: CYBERPUNK_COLORS.borderColor,
              color: CYBERPUNK_COLORS.textPrimary,
            }}
          >
            {Object.entries(ROLE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          <NeonButton size="sm" variant="primary" icon={<Plus size={14} />} onClick={handleAdd}>
            添加
          </NeonButton>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {collaboratorArray.map((c) => {
          const roleColor = ROLE_COLORS[c.role];
          return (
            <div
              key={c.id}
              className="flex items-center gap-3 p-2 rounded-sm border"
              style={{
                borderColor: CYBERPUNK_COLORS.borderColor,
                backgroundColor: CYBERPUNK_COLORS.bgTertiary,
              }}
            >
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-mono font-bold flex-shrink-0"
                style={{
                  backgroundColor: getGlowColor(c.color || roleColor, 0.2),
                  color: c.color || roleColor,
                  boxShadow: `0 0 8px ${getGlowColor(c.color || roleColor, 0.4)}`,
                }}
              >
                {c.name.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div
                  className="text-xs font-mono truncate"
                  style={{ color: CYBERPUNK_COLORS.textPrimary }}
                >
                  {c.name}
                </div>
                <span
                  className="inline-block px-1.5 py-0.5 text-xs font-mono rounded-sm mt-0.5"
                  style={{
                    backgroundColor: getGlowColor(roleColor, 0.15),
                    color: roleColor,
                  }}
                >
                  {ROLE_LABELS[c.role]}
                </span>
              </div>
              <button
                onClick={() => handleDelete(c)}
                className="p-1 transition-colors flex-shrink-0"
                style={{ color: CYBERPUNK_COLORS.textSecondary }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = CYBERPUNK_COLORS.accentRed;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = CYBERPUNK_COLORS.textSecondary;
                }}
              >
                <Trash2 size={14} />
              </button>
            </div>
          );
        })}
        {collaboratorArray.length === 0 && (
          <div
            className="text-xs font-mono text-center py-4"
            style={{ color: CYBERPUNK_COLORS.textSecondary }}
          >
            暂无成员
          </div>
        )}
      </div>
    </div>
  );
};

export default CollaboratorPanel;
