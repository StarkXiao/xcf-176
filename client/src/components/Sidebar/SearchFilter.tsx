import React, { useState, useMemo } from 'react';
import { Search, Filter, X, Shield, ShieldCheck } from 'lucide-react';
import { NeonInput } from '@/components/ui/NeonInput';
import { useEvidenceStore } from '@/store/useEvidenceStore';
import { CYBERPUNK_COLORS, getGlowColor, IMPORTANCE_COLORS, SOURCE_CREDIBILITY_COLORS, SOURCE_CREDIBILITY_LABELS, VERIFICATION_STATUS_COLORS, VERIFICATION_STATUS_LABELS } from '@/utils/colorUtils';
import type { ImportanceLevel, SearchFilters, EvidenceSourceCredibility, EvidenceVerificationStatus } from '@/types';

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

const credibilityOptions: Array<{ value: EvidenceSourceCredibility | 'all'; label: string }> = [
  { value: 'all', label: '全部' },
  { value: 'very_low', label: '极低' },
  { value: 'low', label: '低' },
  { value: 'medium', label: '中' },
  { value: 'high', label: '高' },
  { value: 'very_high', label: '极高' },
];

const verificationOptions: Array<{ value: EvidenceVerificationStatus | 'all'; label: string }> = [
  { value: 'all', label: '全部' },
  { value: 'unverified', label: '未核验' },
  { value: 'pending', label: '核验中' },
  { value: 'verified', label: '已核验' },
  { value: 'failed', label: '核验失败' },
  { value: 'disputed', label: '有争议' },
];

export const SearchFilter: React.FC<SearchFilterProps> = ({ filters, onFiltersChange }) => {
  const evidence = useEvidenceStore((state) => state.getEvidenceArray());
  const [showTags, setShowTags] = useState(false);
  const [showCredibility, setShowCredibility] = useState(false);
  const [showVerification, setShowVerification] = useState(false);

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

  const handleCredibilityChange = (credibility: EvidenceSourceCredibility | undefined) => {
    onFiltersChange({ ...filters, sourceCredibility: credibility });
  };

  const handleVerificationChange = (verification: EvidenceVerificationStatus | undefined) => {
    onFiltersChange({ ...filters, verificationStatus: verification });
  };

  const toggleTag = (tag: string) => {
    const newTags = filters.tags.includes(tag)
      ? filters.tags.filter((t) => t !== tag)
      : [...filters.tags, tag];
    onFiltersChange({ ...filters, tags: newTags });
  };

  const clearFilters = () => {
    onFiltersChange({
      keyword: '',
      tags: [],
      importance: undefined,
      sourceCredibility: undefined,
      verificationStatus: undefined,
    });
  };

  const hasActiveFilters =
    filters.keyword ||
    filters.tags.length > 0 ||
    filters.importance ||
    filters.sourceCredibility ||
    filters.verificationStatus;

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
          onClick={() => {
            setShowTags(!showTags);
            if (!showTags) {
              setShowCredibility(false);
              setShowVerification(false);
            }
          }}
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

      <div className="space-y-2">
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

        <button
          className="flex items-center gap-1 text-xs font-mono uppercase tracking-wider"
          style={{ color: CYBERPUNK_COLORS.accentGreen }}
          onClick={() => {
            setShowCredibility(!showCredibility);
            if (!showCredibility) {
              setShowVerification(false);
              setShowTags(false);
            }
          }}
        >
          <Shield size={12} />
          来源可信度
        </button>

        {showCredibility && (
          <div className="flex flex-wrap gap-1">
            {credibilityOptions.map((option) => {
              const isActive =
                (option.value === 'all' && !filters.sourceCredibility) ||
                filters.sourceCredibility === option.value;
              const color =
                option.value === 'all'
                  ? CYBERPUNK_COLORS.textSecondary
                  : SOURCE_CREDIBILITY_COLORS[option.value as EvidenceSourceCredibility];
              const label =
                option.value === 'all'
                  ? option.label
                  : SOURCE_CREDIBILITY_LABELS[option.value as EvidenceSourceCredibility];

              return (
                <button
                  key={option.value}
                  className="px-2 py-1 text-xs font-mono border rounded-sm transition-all"
                  style={{
                    borderColor: isActive ? color : CYBERPUNK_COLORS.borderColor,
                    color: isActive ? color : CYBERPUNK_COLORS.textSecondary,
                    backgroundColor: isActive ? getGlowColor(color, 0.1) : 'transparent',
                    boxShadow: isActive ? `0 0 8px ${getGlowColor(color, 0.4)}` : 'none',
                  }}
                  onClick={() =>
                    handleCredibilityChange(option.value === 'all' ? undefined : (option.value as EvidenceSourceCredibility))
                  }
                >
                  {label}
                </button>
              );
            })}
          </div>
        )}

        <button
          className="flex items-center gap-1 text-xs font-mono uppercase tracking-wider"
          style={{ color: CYBERPUNK_COLORS.accentPurple }}
          onClick={() => {
            setShowVerification(!showVerification);
            if (!showVerification) {
              setShowCredibility(false);
              setShowTags(false);
            }
          }}
        >
          <ShieldCheck size={12} />
          核验状态
        </button>

        {showVerification && (
          <div className="flex flex-wrap gap-1">
            {verificationOptions.map((option) => {
              const isActive =
                (option.value === 'all' && !filters.verificationStatus) ||
                filters.verificationStatus === option.value;
              const color =
                option.value === 'all'
                  ? CYBERPUNK_COLORS.textSecondary
                  : VERIFICATION_STATUS_COLORS[option.value as EvidenceVerificationStatus];
              const label =
                option.value === 'all'
                  ? option.label
                  : VERIFICATION_STATUS_LABELS[option.value as EvidenceVerificationStatus];

              return (
                <button
                  key={option.value}
                  className="px-2 py-1 text-xs font-mono border rounded-sm transition-all"
                  style={{
                    borderColor: isActive ? color : CYBERPUNK_COLORS.borderColor,
                    color: isActive ? color : CYBERPUNK_COLORS.textSecondary,
                    backgroundColor: isActive ? getGlowColor(color, 0.1) : 'transparent',
                    boxShadow: isActive ? `0 0 8px ${getGlowColor(color, 0.4)}` : 'none',
                  }}
                  onClick={() =>
                    handleVerificationChange(option.value === 'all' ? undefined : (option.value as EvidenceVerificationStatus))
                  }
                >
                  {label}
                </button>
              );
            })}
          </div>
        )}
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
