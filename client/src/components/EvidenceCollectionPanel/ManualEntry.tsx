import React, { useState } from 'react';
import { PenLine, AlertTriangle } from 'lucide-react';
import { useEvidenceCollectionStore } from '@/store/useEvidenceCollectionStore';
import { NeonInput } from '@/components/ui/NeonInput';
import { NeonButton } from '@/components/ui/NeonButton';
import { CYBERPUNK_COLORS, getGlowColor } from '@/utils/colorUtils';
import type { EvidenceCollectionItem, ImportanceLevel } from '@/types';

interface ManualEntryProps {
  caseId: string;
}

const IMPORTANCE_OPTIONS: Array<{ value: ImportanceLevel; label: string; color: string }> = [
  { value: 'low', label: '低', color: CYBERPUNK_COLORS.accentGreen },
  { value: 'normal', label: '中', color: CYBERPUNK_COLORS.accentCyan },
  { value: 'high', label: '高', color: CYBERPUNK_COLORS.accentYellow },
  { value: 'critical', label: '关键', color: CYBERPUNK_COLORS.accentRed },
];

export const ManualEntry: React.FC<ManualEntryProps> = ({ caseId }) => {
  const collectItem = useEvidenceCollectionStore((s) => s.collectItem);
  const loading = useEvidenceCollectionStore((s) => s.loading);
  const items = useEvidenceCollectionStore((s) => s.items);
  const archiveItem = useEvidenceCollectionStore((s) => s.archiveItem);
  const deleteItem = useEvidenceCollectionStore((s) => s.deleteItem);

  const [content, setContent] = useState('');
  const [importance, setImportance] = useState<ImportanceLevel>('normal');
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [validationError, setValidationError] = useState<string | null>(null);

  const caseItems = items.filter(
    (i) => i.caseId === caseId && i.sourceType === 'manual_entry' && !i.archivedAt
  );

  const addTag = () => {
    const trimmed = tagInput.trim();
    if (trimmed && !tags.includes(trimmed)) {
      setTags([...tags, trimmed]);
      setTagInput('');
    }
  };

  const removeTag = (tag: string) => {
    setTags(tags.filter((t) => t !== tag));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addTag();
    }
  };

  const handleSubmit = async () => {
    setValidationError(null);
    if (!content.trim()) {
      setValidationError('证据内容不能为空');
      return;
    }

    await collectItem({
      caseId,
      sourceType: 'manual_entry',
      content,
      importance,
      tags,
    });
    setContent('');
    setImportance('normal');
    setTags([]);
  };

  return (
    <div className="p-3 space-y-3">
      <div
        className="p-3 rounded-sm border space-y-3"
        style={{
          borderColor: CYBERPUNK_COLORS.borderColor,
          backgroundColor: CYBERPUNK_COLORS.bgTertiary,
        }}
      >
        <div className="flex items-center gap-2 mb-1">
          <PenLine
            size={14}
            style={{
              color: CYBERPUNK_COLORS.accentPurple,
              filter: `drop-shadow(0 0 3px ${getGlowColor(CYBERPUNK_COLORS.accentPurple, 0.5)})`,
            }}
          />
          <span className="text-xs font-mono font-bold" style={{ color: CYBERPUNK_COLORS.accentPurple }}>
            手工录入
          </span>
        </div>

        <div className="space-y-2">
          <textarea
            className="w-full text-xs font-mono px-3 py-2 rounded-sm border resize-y"
            style={{
              backgroundColor: CYBERPUNK_COLORS.bgSecondary,
              borderColor: CYBERPUNK_COLORS.borderColor,
              color: CYBERPUNK_COLORS.textPrimary,
              minHeight: 80,
            }}
            placeholder="输入证据内容..."
            value={content}
            onChange={(e) => {
              setContent(e.target.value);
              setValidationError(null);
            }}
          />
          {validationError && (
            <div
              className="text-xs font-mono"
              style={{ color: CYBERPUNK_COLORS.accentRed }}
            >
              {validationError}
            </div>
          )}

          <div>
            <span
              className="block mb-1 text-xs font-mono"
              style={{ color: CYBERPUNK_COLORS.textSecondary }}
            >
              重要程度
            </span>
            <div className="flex gap-1">
              {IMPORTANCE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  className="px-2 py-1 text-xs font-mono rounded-sm border transition-all"
                  style={{
                    borderColor: importance === opt.value ? opt.color : CYBERPUNK_COLORS.borderColor,
                    color: importance === opt.value ? opt.color : CYBERPUNK_COLORS.textSecondary,
                    backgroundColor:
                      importance === opt.value ? getGlowColor(opt.color, 0.1) : 'transparent',
                  }}
                  onClick={() => setImportance(opt.value)}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <span
              className="block mb-1 text-xs font-mono"
              style={{ color: CYBERPUNK_COLORS.textSecondary }}
            >
              标签
            </span>
            <div className="flex gap-1 flex-wrap mb-1">
              {tags.map((tag) => (
                <span
                  key={tag}
                  className="flex items-center gap-1 px-1.5 py-0.5 text-xs font-mono rounded-sm border"
                  style={{
                    borderColor: CYBERPUNK_COLORS.accentCyan,
                    color: CYBERPUNK_COLORS.accentCyan,
                    backgroundColor: getGlowColor(CYBERPUNK_COLORS.accentCyan, 0.08),
                  }}
                >
                  {tag}
                  <button onClick={() => removeTag(tag)} style={{ color: CYBERPUNK_COLORS.textSecondary }}>
                    ×
                  </button>
                </span>
              ))}
            </div>
            <div className="flex gap-1">
              <NeonInput
                placeholder="添加标签..."
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={handleKeyDown}
                className="flex-1"
              />
              <NeonButton variant="secondary" size="sm" onClick={addTag}>
                +
              </NeonButton>
            </div>
          </div>

          <NeonButton
            variant="primary"
            size="sm"
            icon={<PenLine size={12} />}
            onClick={handleSubmit}
            disabled={loading || !content.trim()}
          >
            {loading ? '提交中...' : '录入证据'}
          </NeonButton>
        </div>
      </div>

      {caseItems.length > 0 && (
        <div className="space-y-1.5">
          <span className="text-xs font-mono" style={{ color: CYBERPUNK_COLORS.textSecondary }}>
            待归档录入 ({caseItems.length})
          </span>
          {caseItems.map((item: EvidenceCollectionItem) => {
            const statusColor =
              item.verificationStatus === 'verified'
                ? CYBERPUNK_COLORS.accentGreen
                : item.verificationStatus === 'duplicate'
                ? CYBERPUNK_COLORS.accentYellow
                : CYBERPUNK_COLORS.accentRed;
            const statusLabel =
              item.verificationStatus === 'verified'
                ? '已校验'
                : item.verificationStatus === 'duplicate'
                ? '重复'
                : '校验失败';

            return (
              <div
                key={item.id}
                className="p-2 rounded-sm border"
                style={{
                  borderColor: CYBERPUNK_COLORS.borderColor,
                  backgroundColor: CYBERPUNK_COLORS.bgTertiary,
                }}
              >
                <div className="flex items-start gap-2">
                  <div
                    className="w-1 flex-shrink-0 rounded-sm"
                    style={{
                      minHeight: 24,
                      backgroundColor: statusColor,
                      boxShadow: `0 0 4px ${getGlowColor(statusColor, 0.4)}`,
                    }}
                  />
                  <div className="flex-1 min-w-0">
                    <div
                      className="text-xs font-mono"
                      style={{ color: CYBERPUNK_COLORS.textPrimary }}
                    >
                      {item.content.slice(0, 60)}
                    </div>
                    {item.tags.length > 0 && (
                      <div className="flex gap-1 flex-wrap mt-1">
                        {item.tags.map((tag) => (
                          <span
                            key={tag}
                            className="px-1 py-0 text-xs font-mono rounded-sm"
                            style={{
                              color: CYBERPUNK_COLORS.accentCyan,
                              backgroundColor: getGlowColor(CYBERPUNK_COLORS.accentCyan, 0.08),
                            }}
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                    <div className="flex items-center gap-1.5 mt-1">
                      <span
                        className="text-xs font-mono px-1 py-0.5 rounded-sm border"
                        style={{
                          borderColor: statusColor,
                          color: statusColor,
                          backgroundColor: getGlowColor(statusColor, 0.08),
                        }}
                      >
                        {statusLabel}
                      </span>
                      <span
                        className="text-xs font-mono px-1 py-0.5 rounded-sm border"
                        style={{
                          borderColor: IMPORTANCE_OPTIONS.find((o) => o.value === item.importance)?.color || CYBERPUNK_COLORS.accentCyan,
                          color: IMPORTANCE_OPTIONS.find((o) => o.value === item.importance)?.color || CYBERPUNK_COLORS.accentCyan,
                          backgroundColor: getGlowColor(
                            IMPORTANCE_OPTIONS.find((o) => o.value === item.importance)?.color || CYBERPUNK_COLORS.accentCyan,
                            0.08
                          ),
                        }}
                      >
                        {IMPORTANCE_OPTIONS.find((o) => o.value === item.importance)?.label || '中'}
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-col gap-1 flex-shrink-0">
                    {item.verificationStatus === 'verified' && (
                      <button
                        className="p-1 rounded-sm"
                        style={{
                          color: CYBERPUNK_COLORS.accentGreen,
                          border: `1px solid ${CYBERPUNK_COLORS.accentGreen}`,
                          backgroundColor: getGlowColor(CYBERPUNK_COLORS.accentGreen, 0.08),
                        }}
                        onClick={() => archiveItem(item.id)}
                        title="归档"
                      >
                        <PenLine size={10} />
                      </button>
                    )}
                    <button
                      className="p-1 rounded-sm"
                      style={{
                        color: CYBERPUNK_COLORS.accentRed,
                        border: `1px solid ${CYBERPUNK_COLORS.accentRed}`,
                        backgroundColor: getGlowColor(CYBERPUNK_COLORS.accentRed, 0.08),
                      }}
                      onClick={() => deleteItem(item.id)}
                      title="删除"
                    >
                      <AlertTriangle size={10} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
