import React, { useState, useMemo } from 'react';
import { Search, Filter, X } from 'lucide-react';
import { NeonInput } from '@/components/ui/NeonInput';
import { useEvidenceStore } from '@/store/useEvidenceStore';
import { CYBERPUNK_COLORS, getGlowColor, IMPORTANCE_COLORS } from '@/utils/colorUtils';
import type { ImportanceLevel, SearchFilters } from '@/types';

interface SearchFilterProps {
  filters: SearchFilters;
  onFiltersChange: (filters: SearchFilters) => void;
}

const importanceOptions: Array<{ value: ImportanceLevel | 'all'; label: string }> = [
  { value: 'all', label: '全部' },
  { value: 'low', label: '低' },
  { value: 'normal', label: '中' },
  { value: 'high', label: '高' },
  { value: 'critical', label: '紧急' },
];

export const SearchFilter: React.FC<SearchFilterProps> = ({ filters, onFiltersChange }) => {
  const evidence = useEvidenceStore((state) => state.getEvidenceArray());
  const [showTags, setShowTags] = useState(false);

  const allTags = useMemo(() => {
    const tagSet = new Set<string>();
    evidence.forEach((e) => e.tags.forEach((t) => tagSet.add(t)));
    return Array.from(tagSet).sort();
  }, [evidence]);

  const handleKeywordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onFiltersChange({ ...filters, keyword: e.target.value });
  };

  const handleImportanceChange = (importance: ImportanceLevel | undefined) => {
    onFiltersChange({ ...filters, importance });
  };

  const toggleTag = (tag: string) => {
    const newTags = filters.tags.includes(tag)
      ? filters.tags.filter((t) => t !== tag)
      : [...filters.tags, tag];
    onFiltersChange({ ...filters, tags: newTags });
  };

  const clearFilters = () => {
    onFiltersChange({ keyword: '', tags: [], importance: undefined });
  };

  const hasActiveFilters = filters.keyword || filters.tags.length > 0 || filters.importance;

  return (
    <div className="p-3 space-y-3 border-b" style={{ borderColor: CYBERPUNK_COLORS.borderColor }}>
      <div className="relative">
        <Search
          size={16}
          className="absolute left-3 top-1/2 -translate-y-1/2"
          style={{ color: CYBERPUNK_COLORS.textSecondary }}
        />
        <NeonInput
          placeholder="搜索证据..."
          value={filters.keyword}
          onChange={handleKeywordChange}
          className="pl-9"
        />
      </div>

      <div className="flex items-center justify-between">
        <button
          className="flex items-center gap-1 text-xs font-mono uppercase tracking-wider"
          style={{ color: CYBERPUNK_COLORS.accentCyan }}
          onClick={() => setShowTags(!showTags)}
        >
          <Filter size={14} />
          筛选
        </button>
        {hasActiveFilters && (
          <button
            className="flex items-center gap-1 text-xs font-mono"
            style={{ color: CYBERPUNK_COLORS.accentRed }}
            onClick={clearFilters}
          >
            <X size={14} />
            清除
          </button>
        )}
      </div>

      <div className="flex flex-wrap gap-1">
        {importanceOptions.map((option) => {
          const isActive =
            (option.value === 'all' && !filters.importance) ||
            filters.importance === option.value;
          const color =
            option.value === 'all'
              ? CYBERPUNK_COLORS.textSecondary
              : IMPORTANCE_COLORS[option.value as ImportanceLevel];

          return (
            <button
              key={option.value}
              className="px-2 py-1 text-xs font-mono uppercase border rounded-sm transition-all"
              style={{
                borderColor: isActive ? color : CYBERPUNK_COLORS.borderColor,
                color: isActive ? color : CYBERPUNK_COLORS.textSecondary,
                backgroundColor: isActive ? getGlowColor(color, 0.1) : 'transparent',
                boxShadow: isActive ? `0 0 8px ${getGlowColor(color, 0.4)}` : 'none',
              }}
              onClick={() =>
                handleImportanceChange(option.value === 'all' ? undefined : (option.value as ImportanceLevel))
              }
            >
              {option.label}
            </button>
          );
        })}
      </div>

      {showTags && allTags.length > 0 && (
        <div className="flex flex-wrap gap-1 pt-2 border-t" style={{ borderColor: CYBERPUNK_COLORS.borderColor }}>
          {allTags.map((tag) => {
            const isActive = filters.tags.includes(tag);
            return (
              <button
                key={tag}
                className="px-2 py-1 text-xs font-mono border rounded-sm transition-all"
                style={{
                  borderColor: isActive
                    ? CYBERPUNK_COLORS.accentPurple
                    : CYBERPUNK_COLORS.borderColor,
                  color: isActive ? CYBERPUNK_COLORS.accentPurple : CYBERPUNK_COLORS.textSecondary,
                  backgroundColor: isActive
                    ? getGlowColor(CYBERPUNK_COLORS.accentPurple, 0.1)
                    : 'transparent',
                }}
                onClick={() => toggleTag(tag)}
              >
                #{tag}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default SearchFilter;
