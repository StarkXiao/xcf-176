import React from 'react';
import { FileText } from 'lucide-react';
import { StatusIndicator } from '@/components/ui/StatusIndicator';
import { GlowBorder } from '@/components/ui/GlowBorder';
import { useCollaboratorStore } from '@/store/useCollaboratorStore';
import { CYBERPUNK_COLORS, getGlowColor } from '@/utils/colorUtils';
import type { Evidence, TaskStatus } from '@/types';

const STATUS_LABELS: Record<TaskStatus, string> = {
  pending: '待处理',
  in_progress: '进行中',
  completed: '已完成',
  reviewed: '已审核',
};

const STATUS_COLORS: Record<TaskStatus, string> = {
  pending: CYBERPUNK_COLORS.textSecondary,
  in_progress: CYBERPUNK_COLORS.accentCyan,
  completed: CYBERPUNK_COLORS.accentGreen,
  reviewed: CYBERPUNK_COLORS.accentPurple,
};

interface EvidenceListItemProps {
  evidence: Evidence;
  onDragStart: (e: React.DragEvent, evidence: Evidence) => void;
  onDragEnd: () => void;
  onClick: () => void;
  isSelected: boolean;
}

export const EvidenceListItem: React.FC<EvidenceListItemProps> = ({
  evidence,
  onDragStart,
  onDragEnd,
  onClick,
  isSelected,
}) => {
  const getCollaboratorById = useCollaboratorStore((s) => s.getCollaboratorById);
  const assignedCollaborator = evidence.assignedTo ? getCollaboratorById(evidence.assignedTo) : null;
  const statusColor = STATUS_COLORS[evidence.status];

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, evidence)}
      onDragEnd={onDragEnd}
      onClick={onClick}
      className="cursor-move"
    >
      <GlowBorder
        color={evidence.color}
        glowIntensity={isSelected ? 0.6 : 0.3}
        pulse={isSelected}
      >
        <div
          className="p-3 transition-all"
          style={{
            backgroundColor: isSelected
              ? getGlowColor(evidence.color, 0.1)
              : CYBERPUNK_COLORS.bgTertiary,
          }}
        >
          <div className="flex items-start gap-2">
            <FileText
              size={16}
              style={{
                color: evidence.color,
                filter: `drop-shadow(0 0 4px ${getGlowColor(evidence.color, 0.5)})`,
                flexShrink: 0,
                marginTop: 2,
              }}
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <span
                  className="text-xs font-mono font-bold truncate"
                  style={{
                    color: evidence.color,
                    textShadow: `0 0 6px ${getGlowColor(evidence.color, 0.4)}`,
                  }}
                >
                  {evidence.content.slice(0, 30)}
                  {evidence.content.length > 30 && '...'}
                </span>
                <StatusIndicator importance={evidence.importance} size="sm" pulse={false} />
              </div>

              {evidence.source && (
                <div
                  className="text-xs mt-1 truncate"
                  style={{ color: CYBERPUNK_COLORS.textSecondary }}
                >
                  来源: {evidence.source}
                </div>
              )}

              <div className="flex items-center justify-between mt-2">
                <div className="flex flex-wrap gap-1">
                  {evidence.tags.slice(0, 2).map((tag) => (
                    <span
                      key={tag}
                      className="px-1.5 py-0.5 text-xs font-mono rounded-sm"
                      style={{
                        backgroundColor: getGlowColor(CYBERPUNK_COLORS.accentPurple, 0.2),
                        color: CYBERPUNK_COLORS.accentPurple,
                      }}
                    >
                      #{tag}
                    </span>
                  ))}
                  {evidence.tags.length > 2 && (
                    <span
                      className="px-1.5 py-0.5 text-xs font-mono"
                      style={{ color: CYBERPUNK_COLORS.textSecondary }}
                    >
                      +{evidence.tags.length - 2}
                    </span>
                  )}
                </div>
                <span
                  className="text-xs font-mono"
                  style={{ color: CYBERPUNK_COLORS.textSecondary }}
                >
                  {formatDate(evidence.timestamp)}
                </span>
              </div>

              <div className="flex items-center justify-between mt-2">
                {assignedCollaborator ? (
                  <div className="flex items-center gap-1.5">
                    <div
                      className="w-4 h-4 rounded-full flex items-center justify-center text-xs font-mono flex-shrink-0"
                      style={{
                        backgroundColor: getGlowColor(assignedCollaborator.color, 0.2),
                        color: assignedCollaborator.color,
                        fontSize: 8,
                      }}
                    >
                      {assignedCollaborator.name.charAt(0).toUpperCase()}
                    </div>
                    <span
                      className="text-xs font-mono truncate"
                      style={{ color: CYBERPUNK_COLORS.textSecondary }}
                    >
                      {assignedCollaborator.name}
                    </span>
                  </div>
                ) : (
                  <span
                    className="text-xs font-mono"
                    style={{ color: CYBERPUNK_COLORS.textSecondary }}
                  >
                    未分配
                  </span>
                )}
                <span
                  className="px-1.5 py-0.5 text-xs font-mono rounded-sm"
                  style={{
                    backgroundColor: getGlowColor(statusColor, 0.15),
                    color: statusColor,
                  }}
                >
                  {STATUS_LABELS[evidence.status]}
                </span>
              </div>
            </div>
          </div>
        </div>
      </GlowBorder>
    </div>
  );
};

export default EvidenceListItem;
