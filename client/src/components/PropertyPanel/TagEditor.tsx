import React, { useState } from 'react';
import { X, Plus } from 'lucide-react';
import { NeonInput } from '@/components/ui/NeonInput';
import { NeonButton } from '@/components/ui/NeonButton';
import { CYBERPUNK_COLORS, getGlowColor } from '@/utils/colorUtils';

interface TagEditorProps {
  tags: string[];
  onTagsChange: (tags: string[]) => void;
}

const PRESET_TAGS = ['重要', '可疑', '关键', '待核实', '已确认', '背景', '人物', '地点', '时间', '物品'];

export const TagEditor: React.FC<TagEditorProps> = ({ tags, onTagsChange }) => {
  const [newTag, setNewTag] = useState('');

  const addTag = (tag: string) => {
    const trimmedTag = tag.trim();
    if (trimmedTag && !tags.includes(trimmedTag)) {
      onTagsChange([...tags, trimmedTag]);
    }
    setNewTag('');
  };

  const removeTag = (tagToRemove: string) => {
    onTagsChange(tags.filter((t) => t !== tagToRemove));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addTag(newTag);
    }
  };

  return (
    <div className="space-y-3">
      <label
        className="block text-xs font-mono uppercase tracking-wider"
        style={{ color: CYBERPUNK_COLORS.textSecondary }}
      >
        标签
      </label>

      <div className="flex gap-2">
        <NeonInput
          placeholder="添加标签..."
          value={newTag}
          onChange={(e) => setNewTag(e.target.value)}
          onKeyDown={handleKeyDown}
          className="flex-1"
          glowColor={CYBERPUNK_COLORS.accentPurple}
        />
        <NeonButton
          size="sm"
          variant="secondary"
          icon={<Plus size={16} />}
          onClick={() => addTag(newTag)}
          disabled={!newTag.trim()}
        />
      </div>

      <div className="flex flex-wrap gap-1.5">
        {tags.map((tag) => (
          <div
            key={tag}
            className="flex items-center gap-1 px-2 py-1 rounded-sm border"
            style={{
              backgroundColor: getGlowColor(CYBERPUNK_COLORS.accentPurple, 0.15),
              borderColor: getGlowColor(CYBERPUNK_COLORS.accentPurple, 0.4),
            }}
          >
            <span
              className="text-xs font-mono"
              style={{ color: CYBERPUNK_COLORS.accentPurple }}
            >
              #{tag}
            </span>
            <button
              className="hover:opacity-80 transition-opacity"
              onClick={() => removeTag(tag)}
            >
              <X size={12} style={{ color: CYBERPUNK_COLORS.accentPurple }} />
            </button>
          </div>
        ))}
        {tags.length === 0 && (
          <span
            className="text-xs font-mono"
            style={{ color: CYBERPUNK_COLORS.textSecondary }}
          >
            暂无标签
          </span>
        )}
      </div>

      <div className="pt-2 border-t" style={{ borderColor: CYBERPUNK_COLORS.borderColor }}>
        <label
          className="block text-xs font-mono mb-2"
          style={{ color: CYBERPUNK_COLORS.textSecondary }}
        >
          快捷标签
        </label>
        <div className="flex flex-wrap gap-1">
          {PRESET_TAGS.filter((t) => !tags.includes(t)).map((tag) => (
            <button
              key={tag}
              className="px-2 py-1 text-xs font-mono border rounded-sm transition-all hover:border-opacity-100"
              style={{
                borderColor: getGlowColor(CYBERPUNK_COLORS.accentPurple, 0.3),
                color: CYBERPUNK_COLORS.textSecondary,
                backgroundColor: 'transparent',
              }}
              onClick={() => addTag(tag)}
            >
              +#{tag}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default TagEditor;
