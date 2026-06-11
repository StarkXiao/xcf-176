import React, { useEffect, useMemo, useState } from 'react';
import { GitCompare, X, Play, Copy, Shield, Link2, Share2, AlertTriangle, ChevronRight } from 'lucide-react';
import { useCrossCaseComparisonStore } from '@/store/useCrossCaseComparisonStore';
import { useUiStore } from '@/store/useUiStore';
import { CYBERPUNK_COLORS, getGlowColor, IMPORTANCE_COLORS } from '@/utils/colorUtils';
import type {
  CrossCaseMatchConfidence,
  DuplicateEvidenceGroup,
  SharedSourceGroup,
  SimilarStructureGroup,
  CrimeChainLink,
  CrossCaseEvidenceRef,
} from '@/types';

type ActiveTab = 'overview' | 'duplicate' | 'shared_source' | 'similar_structure' | 'crime_chain';

interface TabConfig {
  value: ActiveTab;
  label: string;
  icon: React.ReactNode;
  color: string;
}

const TAB_CONFIG: TabConfig[] = [
  { value: 'overview', label: '总览', icon: <GitCompare size={12} />, color: CYBERPUNK_COLORS.accentCyan },
  { value: 'duplicate', label: '重复证据', icon: <Copy size={12} />, color: CYBERPUNK_COLORS.accentRed },
  { value: 'shared_source', label: '共用来源', icon: <Share2 size={12} />, color: CYBERPUNK_COLORS.accentGreen },
  { value: 'similar_structure', label: '相似结构', icon: <Link2 size={12} />, color: CYBERPUNK_COLORS.accentPurple },
  { value: 'crime_chain', label: '作案链路', icon: <AlertTriangle size={12} />, color: CYBERPUNK_COLORS.accentYellow },
];

const CONFIDENCE_COLORS: Record<CrossCaseMatchConfidence, string> = {
  low: CYBERPUNK_COLORS.accentGreen,
  medium: CYBERPUNK_COLORS.accentYellow,
  high: CYBERPUNK_COLORS.accentRed,
};

const CONFIDENCE_LABELS: Record<CrossCaseMatchConfidence, string> = {
  low: '低',
  medium: '中',
  high: '高',
};

const SOURCE_TYPE_LABELS: Record<string, string> = {
  content_hash: '内容哈希',
  source_name: '来源名称',
  source_url: '来源URL',
};

function ScoreBar({ score, color }: { score: number; color: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: CYBERPUNK_COLORS.bgPrimary }}>
        <div
          className="h-full rounded-full transition-all"
          style={{
            width: `${Math.round(score * 100)}%`,
            backgroundColor: color,
            boxShadow: `0 0 6px ${getGlowColor(color, 0.6)}`,
          }}
        />
      </div>
      <span className="text-xs font-mono w-10 text-right" style={{ color }}>
        {Math.round(score * 100)}%
      </span>
    </div>
  );
}

function EvidenceRefCard({ ref: evRef, compact = false }: { ref: CrossCaseEvidenceRef; compact?: boolean }) {
  return (
    <div
      className="p-2 rounded-sm border"
      style={{
        borderColor: CYBERPUNK_COLORS.borderColor,
        backgroundColor: getGlowColor(CYBERPUNK_COLORS.bgTertiary, 0.5),
      }}
    >
      <div className="flex items-center gap-1.5 mb-1">
        <span
          className="text-xs font-mono px-1 py-0 rounded-sm"
          style={{
            color: CYBERPUNK_COLORS.accentCyan,
            backgroundColor: getGlowColor(CYBERPUNK_COLORS.accentCyan, 0.1),
            border: `1px solid ${getGlowColor(CYBERPUNK_COLORS.accentCyan, 0.3)}`,
          }}
        >
          {evRef.caseName.length > 8 ? evRef.caseName.slice(0, 8) + '...' : evRef.caseName}
        </span>
        {evRef.evidenceImportance && (
          <span
            className="text-xs font-mono px-1 py-0 rounded-sm"
            style={{
              color: IMPORTANCE_COLORS[evRef.evidenceImportance],
              backgroundColor: getGlowColor(IMPORTANCE_COLORS[evRef.evidenceImportance], 0.1),
            }}
          >
            {evRef.evidenceImportance}
          </span>
        )}
      </div>
      {!compact && (
        <>
          <div
            className="text-xs font-mono mb-1 leading-relaxed"
            style={{ color: CYBERPUNK_COLORS.textPrimary }}
          >
            {evRef.evidenceContent.length > 60
              ? evRef.evidenceContent.slice(0, 60) + '...'
              : evRef.evidenceContent}
          </div>
          <div className="text-xs font-mono" style={{ color: CYBERPUNK_COLORS.textSecondary }}>
            来源: {evRef.evidenceSource.length > 20 ? evRef.evidenceSource.slice(0, 20) + '...' : evRef.evidenceSource}
          </div>
          {evRef.evidenceTags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1">
              {evRef.evidenceTags.slice(0, 3).map((tag) => (
                <span
                  key={tag}
                  className="text-xs font-mono px-1 py-0 rounded-sm"
                  style={{
                    color: CYBERPUNK_COLORS.accentPurple,
                    backgroundColor: getGlowColor(CYBERPUNK_COLORS.accentPurple, 0.1),
                    border: `1px solid ${getGlowColor(CYBERPUNK_COLORS.accentPurple, 0.2)}`,
                  }}
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function MatchGroupCard({
  group,
  isSelected,
  onClick,
}: {
  group: DuplicateEvidenceGroup | SharedSourceGroup | SimilarStructureGroup | CrimeChainLink;
  isSelected: boolean;
  onClick: () => void;
}) {
  const borderColor = isSelected
    ? CONFIDENCE_COLORS[group.confidence]
    : CYBERPUNK_COLORS.borderColor;

  return (
    <div
      className="p-2.5 rounded-sm border cursor-pointer transition-all"
      style={{
        borderColor,
        backgroundColor: isSelected
          ? getGlowColor(CONFIDENCE_COLORS[group.confidence], 0.08)
          : CYBERPUNK_COLORS.bgTertiary,
      }}
      onClick={onClick}
    >
      <div className="flex items-center justify-between mb-1.5">
        <span
          className="text-xs font-mono px-1.5 py-0 rounded-sm font-bold"
          style={{
            color: CONFIDENCE_COLORS[group.confidence],
            backgroundColor: getGlowColor(CONFIDENCE_COLORS[group.confidence], 0.15),
            border: `1px solid ${getGlowColor(CONFIDENCE_COLORS[group.confidence], 0.3)}`,
          }}
        >
          {CONFIDENCE_LABELS[group.confidence]}
        </span>
        <ScoreBar score={group.score} color={CONFIDENCE_COLORS[group.confidence]} />
      </div>
      <div className="text-xs font-mono leading-relaxed mb-1.5" style={{ color: CYBERPUNK_COLORS.textPrimary }}>
        {group.description}
      </div>

      {group.matchType === 'shared_source' && (
        <div className="flex items-center gap-2 mb-1.5">
          <span className="text-xs font-mono" style={{ color: CYBERPUNK_COLORS.textSecondary }}>
            类型: {SOURCE_TYPE_LABELS[(group as SharedSourceGroup).sourceType]}
          </span>
          <span className="text-xs font-mono" style={{ color: CYBERPUNK_COLORS.textSecondary }}>
            涉及{(group as SharedSourceGroup).evidenceRefs.length}条证据
          </span>
        </div>
      )}

      {group.matchType === 'similar_structure' && (
        <div className="flex items-center gap-2 mb-1.5">
          <span className="text-xs font-mono" style={{ color: CYBERPUNK_COLORS.textSecondary }}>
            重叠率: {Math.round((group as SimilarStructureGroup).overlapRatio * 100)}%
          </span>
        </div>
      )}

      {group.matchType === 'crime_chain' && (
        <div className="flex flex-wrap gap-1 mb-1.5">
          {(group as CrimeChainLink).linkedCases.map((lc) => (
            <span
              key={lc.caseId}
              className="text-xs font-mono px-1 py-0 rounded-sm"
              style={{
                color: CYBERPUNK_COLORS.accentCyan,
                backgroundColor: getGlowColor(CYBERPUNK_COLORS.accentCyan, 0.1),
                border: `1px solid ${getGlowColor(CYBERPUNK_COLORS.accentCyan, 0.2)}`,
              }}
            >
              {lc.caseName.length > 6 ? lc.caseName.slice(0, 6) + '..' : lc.caseName}
              {lc.role ? `(${lc.role})` : ''}
            </span>
          ))}
        </div>
      )}

      {group.matchType === 'duplicate_evidence' && (
        <div className="flex items-center gap-1 mb-1.5">
          {(group as DuplicateEvidenceGroup).similarityFields.map((field) => (
            <span
              key={field}
              className="text-xs font-mono px-1 py-0 rounded-sm"
              style={{
                color: CYBERPUNK_COLORS.accentGreen,
                backgroundColor: getGlowColor(CYBERPUNK_COLORS.accentGreen, 0.1),
              }}
            >
              {field === 'content' ? '内容' : field === 'tags' ? '标签' : '来源'}
            </span>
          ))}
        </div>
      )}

      <div className="flex items-center gap-1">
        <ChevronRight size={10} style={{ color: CYBERPUNK_COLORS.textSecondary }} />
        <span className="text-xs font-mono" style={{ color: CYBERPUNK_COLORS.textSecondary }}>
          {group.evidenceRefs.length}条关联证据
        </span>
      </div>
    </div>
  );
}

export const CrossCaseComparisonPanel: React.FC = () => {
  const result = useCrossCaseComparisonStore((s) => s.result);
  const loading = useCrossCaseComparisonStore((s) => s.loading);
  const error = useCrossCaseComparisonStore((s) => s.error);
  const activeTab = useCrossCaseComparisonStore((s) => s.activeTab);
  const setActiveTab = useCrossCaseComparisonStore((s) => s.setActiveTab);
  const selectedGroupId = useCrossCaseComparisonStore((s) => s.selectedGroupId);
  const setSelectedGroupId = useCrossCaseComparisonStore((s) => s.setSelectedGroupId);
  const runComparison = useCrossCaseComparisonStore((s) => s.runComparison);
  const togglePanel = useUiStore((s) => s.toggleCrossCaseComparisonPanel);

  const [includeDuplicate, setIncludeDuplicate] = useState(true);
  const [includeSharedSource, setIncludeSharedSource] = useState(true);
  const [includeSimilarStructure, setIncludeSimilarStructure] = useState(true);
  const [includeCrimeChain, setIncludeCrimeChain] = useState(true);

  useEffect(() => {
    runComparison({
      includeDuplicateEvidence: includeDuplicate,
      includeSharedSource: includeSharedSource,
      includeSimilarStructure: includeSimilarStructure,
      includeCrimeChain: includeCrimeChain,
    });
  }, []);

  const handleRunComparison = () => {
    runComparison({
      includeDuplicateEvidence: includeDuplicate,
      includeSharedSource: includeSharedSource,
      includeSimilarStructure: includeSimilarStructure,
      includeCrimeChain: includeCrimeChain,
    });
  };

  const activeGroups = useMemo(() => {
    if (!result) return [];
    switch (activeTab) {
      case 'duplicate':
        return result.duplicateEvidenceGroups;
      case 'shared_source':
        return result.sharedSourceGroups;
      case 'similar_structure':
        return result.similarStructureGroups;
      case 'crime_chain':
        return result.crimeChainLinks;
      default:
        return [];
    }
  }, [result, activeTab]);

  const selectedGroup = useMemo(() => {
    if (!selectedGroupId || !result) return null;
    const allGroups = [
      ...result.duplicateEvidenceGroups,
      ...result.sharedSourceGroups,
      ...result.similarStructureGroups,
      ...result.crimeChainLinks,
    ];
    return allGroups.find((g) => g.id === selectedGroupId) || null;
  }, [selectedGroupId, result]);

  return (
    <div
      className="h-full flex flex-col border-l"
      style={{
        width: 540,
        backgroundColor: CYBERPUNK_COLORS.bgSecondary,
        borderColor: CYBERPUNK_COLORS.borderColor,
      }}
    >
      <div
        className="flex items-center justify-between px-4 py-3 border-b"
        style={{ borderColor: CYBERPUNK_COLORS.borderColor }}
      >
        <div className="flex items-center gap-2">
          <GitCompare
            size={18}
            style={{
              color: CYBERPUNK_COLORS.accentRed,
              filter: `drop-shadow(0 0 4px ${getGlowColor(CYBERPUNK_COLORS.accentRed, 0.6)})`,
            }}
          />
          <span
            className="text-sm font-mono font-bold"
            style={{
              color: CYBERPUNK_COLORS.accentRed,
              textShadow: `0 0 8px ${getGlowColor(CYBERPUNK_COLORS.accentRed, 0.6)}`,
            }}
          >
            跨案件比对
          </span>
        </div>
        <button
          onClick={togglePanel}
          className="p-1 transition-colors"
          style={{ color: CYBERPUNK_COLORS.textSecondary }}
        >
          <X size={16} />
        </button>
      </div>

      <div className="flex gap-1 p-3 border-b" style={{ borderColor: CYBERPUNK_COLORS.borderColor }}>
        {TAB_CONFIG.map((t) => {
          const count =
            result && t.value !== 'overview'
              ? t.value === 'duplicate'
                ? result.duplicateEvidenceGroups.length
                : t.value === 'shared_source'
                ? result.sharedSourceGroups.length
                : t.value === 'similar_structure'
                ? result.similarStructureGroups.length
                : result.crimeChainLinks.length
              : undefined;
          return (
            <button
              key={t.value}
              className="flex items-center gap-1 px-2 py-1 text-xs font-mono rounded-sm border transition-all"
              style={{
                borderColor: activeTab === t.value ? t.color : CYBERPUNK_COLORS.borderColor,
                color: activeTab === t.value ? t.color : CYBERPUNK_COLORS.textSecondary,
                backgroundColor: activeTab === t.value ? getGlowColor(t.color, 0.1) : 'transparent',
              }}
              onClick={() => setActiveTab(t.value)}
            >
              {t.icon}
              {t.label}
              {count !== undefined && count > 0 && (
                <span
                  className="ml-0.5 px-1 rounded-full text-xs"
                  style={{
                    backgroundColor: getGlowColor(t.color, 0.2),
                    color: t.color,
                    fontSize: '9px',
                  }}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {activeTab === 'overview' && (
        <div className="flex-1 overflow-y-auto p-3 space-y-3">
          <div
            className="p-3 rounded-sm border"
            style={{
              borderColor: CYBERPUNK_COLORS.accentCyan,
              backgroundColor: getGlowColor(CYBERPUNK_COLORS.accentCyan, 0.05),
            }}
          >
            <div className="flex items-center gap-2 mb-2">
              <Shield size={14} style={{ color: CYBERPUNK_COLORS.accentCyan }} />
              <span className="text-xs font-mono font-bold" style={{ color: CYBERPUNK_COLORS.accentCyan }}>
                比对配置
              </span>
            </div>
            <div className="space-y-1.5">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeDuplicate}
                  onChange={(e) => setIncludeDuplicate(e.target.checked)}
                  className="accent-red-500"
                />
                <span className="text-xs font-mono" style={{ color: CYBERPUNK_COLORS.textPrimary }}>
                  重复证据检测
                </span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeSharedSource}
                  onChange={(e) => setIncludeSharedSource(e.target.checked)}
                  className="accent-green-500"
                />
                <span className="text-xs font-mono" style={{ color: CYBERPUNK_COLORS.textPrimary }}>
                  共用来源识别
                </span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeSimilarStructure}
                  onChange={(e) => setIncludeSimilarStructure(e.target.checked)}
                  className="accent-purple-500"
                />
                <span className="text-xs font-mono" style={{ color: CYBERPUNK_COLORS.textPrimary }}>
                  相似结构发现
                </span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeCrimeChain}
                  onChange={(e) => setIncludeCrimeChain(e.target.checked)}
                  className="accent-yellow-500"
                />
                <span className="text-xs font-mono" style={{ color: CYBERPUNK_COLORS.textPrimary }}>
                  作案链路发现
                </span>
              </label>
            </div>
            <button
              className="mt-2.5 flex items-center gap-1.5 px-3 py-1.5 rounded-sm border text-xs font-mono font-bold transition-all"
              style={{
                borderColor: CYBERPUNK_COLORS.accentRed,
                color: CYBERPUNK_COLORS.accentRed,
                backgroundColor: getGlowColor(CYBERPUNK_COLORS.accentRed, 0.1),
              }}
              onClick={handleRunComparison}
              disabled={loading}
            >
              <Play size={12} />
              {loading ? '比对中...' : '开始比对'}
            </button>
          </div>

          {error && (
            <div
              className="p-2.5 rounded-sm border text-xs font-mono"
              style={{
                borderColor: CYBERPUNK_COLORS.accentRed,
                backgroundColor: getGlowColor(CYBERPUNK_COLORS.accentRed, 0.1),
                color: CYBERPUNK_COLORS.accentRed,
              }}
            >
              {error}
            </div>
          )}

          {result && (
            <>
              <div
                className="p-3 rounded-sm border"
                style={{
                  borderColor: CYBERPUNK_COLORS.borderColor,
                  backgroundColor: CYBERPUNK_COLORS.bgTertiary,
                }}
              >
                <div className="text-xs font-mono mb-2 leading-relaxed" style={{ color: CYBERPUNK_COLORS.textPrimary }}>
                  {result.summary}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="p-2 rounded-sm border" style={{ borderColor: CYBERPUNK_COLORS.borderColor }}>
                    <div className="text-xs font-mono" style={{ color: CYBERPUNK_COLORS.textSecondary }}>比对案件数</div>
                    <div className="text-lg font-mono font-bold" style={{ color: CYBERPUNK_COLORS.accentCyan }}>
                      {result.totalCasesCompared}
                    </div>
                  </div>
                  <div className="p-2 rounded-sm border" style={{ borderColor: CYBERPUNK_COLORS.borderColor }}>
                    <div className="text-xs font-mono" style={{ color: CYBERPUNK_COLORS.textSecondary }}>关联置信度</div>
                    <div
                      className="text-lg font-mono font-bold"
                      style={{ color: CONFIDENCE_COLORS[result.overallScore >= 0.7 ? 'high' : result.overallScore >= 0.4 ? 'medium' : 'low'] }}
                    >
                      {Math.round(result.overallScore * 100)}%
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div
                  className="p-2 rounded-sm border cursor-pointer transition-all"
                  style={{ borderColor: CYBERPUNK_COLORS.accentRed, backgroundColor: getGlowColor(CYBERPUNK_COLORS.accentRed, 0.05) }}
                  onClick={() => setActiveTab('duplicate')}
                >
                  <div className="flex items-center gap-1 mb-1">
                    <Copy size={10} style={{ color: CYBERPUNK_COLORS.accentRed }} />
                    <span className="text-xs font-mono" style={{ color: CYBERPUNK_COLORS.textSecondary }}>重复证据</span>
                  </div>
                  <div className="text-xl font-mono font-bold" style={{ color: CYBERPUNK_COLORS.accentRed }}>
                    {result.duplicateEvidenceGroups.length}
                  </div>
                </div>
                <div
                  className="p-2 rounded-sm border cursor-pointer transition-all"
                  style={{ borderColor: CYBERPUNK_COLORS.accentGreen, backgroundColor: getGlowColor(CYBERPUNK_COLORS.accentGreen, 0.05) }}
                  onClick={() => setActiveTab('shared_source')}
                >
                  <div className="flex items-center gap-1 mb-1">
                    <Share2 size={10} style={{ color: CYBERPUNK_COLORS.accentGreen }} />
                    <span className="text-xs font-mono" style={{ color: CYBERPUNK_COLORS.textSecondary }}>共用来源</span>
                  </div>
                  <div className="text-xl font-mono font-bold" style={{ color: CYBERPUNK_COLORS.accentGreen }}>
                    {result.sharedSourceGroups.length}
                  </div>
                </div>
                <div
                  className="p-2 rounded-sm border cursor-pointer transition-all"
                  style={{ borderColor: CYBERPUNK_COLORS.accentPurple, backgroundColor: getGlowColor(CYBERPUNK_COLORS.accentPurple, 0.05) }}
                  onClick={() => setActiveTab('similar_structure')}
                >
                  <div className="flex items-center gap-1 mb-1">
                    <Link2 size={10} style={{ color: CYBERPUNK_COLORS.accentPurple }} />
                    <span className="text-xs font-mono" style={{ color: CYBERPUNK_COLORS.textSecondary }}>相似结构</span>
                  </div>
                  <div className="text-xl font-mono font-bold" style={{ color: CYBERPUNK_COLORS.accentPurple }}>
                    {result.similarStructureGroups.length}
                  </div>
                </div>
                <div
                  className="p-2 rounded-sm border cursor-pointer transition-all"
                  style={{ borderColor: CYBERPUNK_COLORS.accentYellow, backgroundColor: getGlowColor(CYBERPUNK_COLORS.accentYellow, 0.05) }}
                  onClick={() => setActiveTab('crime_chain')}
                >
                  <div className="flex items-center gap-1 mb-1">
                    <AlertTriangle size={10} style={{ color: CYBERPUNK_COLORS.accentYellow }} />
                    <span className="text-xs font-mono" style={{ color: CYBERPUNK_COLORS.textSecondary }}>作案链路</span>
                  </div>
                  <div className="text-xl font-mono font-bold" style={{ color: CYBERPUNK_COLORS.accentYellow }}>
                    {result.crimeChainLinks.length}
                  </div>
                </div>
              </div>

              {result.recommendations.length > 0 && (
                <div
                  className="p-3 rounded-sm border"
                  style={{
                    borderColor: CYBERPUNK_COLORS.accentYellow,
                    backgroundColor: getGlowColor(CYBERPUNK_COLORS.accentYellow, 0.05),
                  }}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle size={14} style={{ color: CYBERPUNK_COLORS.accentYellow }} />
                    <span className="text-xs font-mono font-bold" style={{ color: CYBERPUNK_COLORS.accentYellow }}>
                      侦查建议
                    </span>
                  </div>
                  <div className="space-y-1.5">
                    {result.recommendations.map((rec, idx) => (
                      <div key={idx} className="flex items-start gap-2">
                        <span
                          className="text-xs font-mono font-bold flex-shrink-0"
                          style={{ color: CYBERPUNK_COLORS.accentYellow }}
                        >
                          {idx + 1}.
                        </span>
                        <span className="text-xs font-mono leading-relaxed" style={{ color: CYBERPUNK_COLORS.textPrimary }}>
                          {rec}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {!result && !loading && !error && (
            <div
              className="flex items-center justify-center h-40 text-xs font-mono"
              style={{ color: CYBERPUNK_COLORS.textSecondary }}
            >
              点击"开始比对"进行跨案件线索比对
            </div>
          )}

          {loading && (
            <div
              className="flex items-center justify-center h-40 text-xs font-mono"
              style={{ color: CYBERPUNK_COLORS.accentCyan }}
            >
              正在比对中...
            </div>
          )}
        </div>
      )}

      {activeTab !== 'overview' && (
        <div className="flex-1 flex overflow-hidden">
          <div
            className="w-1/2 overflow-y-auto p-3 space-y-2 border-r"
            style={{ borderColor: CYBERPUNK_COLORS.borderColor }}
          >
            {activeGroups.length === 0 ? (
              <div
                className="flex items-center justify-center h-40 text-xs font-mono"
                style={{ color: CYBERPUNK_COLORS.textSecondary }}
              >
                未发现此类关联
              </div>
            ) : (
              activeGroups.map((group) => (
                <MatchGroupCard
                  key={group.id}
                  group={group}
                  isSelected={selectedGroupId === group.id}
                  onClick={() => setSelectedGroupId(group.id)}
                />
              ))
            )}
          </div>

          <div className="w-1/2 overflow-y-auto p-3">
            {selectedGroup ? (
              <div className="space-y-2.5">
                <div
                  className="p-2.5 rounded-sm border"
                  style={{
                    borderColor: CONFIDENCE_COLORS[selectedGroup.confidence],
                    backgroundColor: getGlowColor(CONFIDENCE_COLORS[selectedGroup.confidence], 0.05),
                  }}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span
                      className="text-xs font-mono font-bold px-1.5 py-0 rounded-sm"
                      style={{
                        color: CONFIDENCE_COLORS[selectedGroup.confidence],
                        backgroundColor: getGlowColor(CONFIDENCE_COLORS[selectedGroup.confidence], 0.15),
                      }}
                    >
                      置信度: {CONFIDENCE_LABELS[selectedGroup.confidence]}
                    </span>
                    <ScoreBar score={selectedGroup.score} color={CONFIDENCE_COLORS[selectedGroup.confidence]} />
                  </div>
                  <div className="text-xs font-mono leading-relaxed" style={{ color: CYBERPUNK_COLORS.textPrimary }}>
                    {selectedGroup.description}
                  </div>
                </div>

                {selectedGroup.matchType === 'crime_chain' && (
                  <div
                    className="p-2.5 rounded-sm border"
                    style={{
                      borderColor: CYBERPUNK_COLORS.accentYellow,
                      backgroundColor: getGlowColor(CYBERPUNK_COLORS.accentYellow, 0.05),
                    }}
                  >
                    <div className="text-xs font-mono font-bold mb-1.5" style={{ color: CYBERPUNK_COLORS.accentYellow }}>
                      链路模式
                    </div>
                    <div className="text-xs font-mono mb-1.5" style={{ color: CYBERPUNK_COLORS.textPrimary }}>
                      {(selectedGroup as CrimeChainLink).chainPattern}
                    </div>
                    <div className="space-y-1">
                      {(selectedGroup as CrimeChainLink).linkedCases.map((lc) => (
                        <div key={lc.caseId} className="flex items-center gap-2">
                          <div
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: CYBERPUNK_COLORS.accentCyan, boxShadow: `0 0 4px ${getGlowColor(CYBERPUNK_COLORS.accentCyan, 0.5)}` }}
                          />
                          <span className="text-xs font-mono" style={{ color: CYBERPUNK_COLORS.textPrimary }}>
                            {lc.caseName}
                          </span>
                          {lc.role && (
                            <span
                              className="text-xs font-mono px-1 py-0 rounded-sm"
                              style={{
                                color: CYBERPUNK_COLORS.accentYellow,
                                backgroundColor: getGlowColor(CYBERPUNK_COLORS.accentYellow, 0.1),
                              }}
                            >
                              {lc.role}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {selectedGroup.matchType === 'similar_structure' && (
                  <div
                    className="p-2.5 rounded-sm border"
                    style={{
                      borderColor: CYBERPUNK_COLORS.accentPurple,
                      backgroundColor: getGlowColor(CYBERPUNK_COLORS.accentPurple, 0.05),
                    }}
                  >
                    <div className="text-xs font-mono font-bold mb-1.5" style={{ color: CYBERPUNK_COLORS.accentPurple }}>
                      关系标签对比
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <div className="text-xs font-mono mb-1" style={{ color: CYBERPUNK_COLORS.textSecondary }}>
                          {(selectedGroup as SimilarStructureGroup).caseNameA}
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {(selectedGroup as SimilarStructureGroup).connectionLabelsA.map((label) => (
                            <span
                              key={label}
                              className="text-xs font-mono px-1 py-0 rounded-sm"
                              style={{
                                color: CYBERPUNK_COLORS.accentPurple,
                                backgroundColor: getGlowColor(CYBERPUNK_COLORS.accentPurple, 0.1),
                              }}
                            >
                              {label}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs font-mono mb-1" style={{ color: CYBERPUNK_COLORS.textSecondary }}>
                          {(selectedGroup as SimilarStructureGroup).caseNameB}
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {(selectedGroup as SimilarStructureGroup).connectionLabelsB.map((label) => (
                            <span
                              key={label}
                              className="text-xs font-mono px-1 py-0 rounded-sm"
                              style={{
                                color: CYBERPUNK_COLORS.accentPurple,
                                backgroundColor: getGlowColor(CYBERPUNK_COLORS.accentPurple, 0.1),
                              }}
                            >
                              {label}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {selectedGroup.matchType === 'shared_source' && (
                  <div
                    className="p-2.5 rounded-sm border"
                    style={{
                      borderColor: CYBERPUNK_COLORS.accentGreen,
                      backgroundColor: getGlowColor(CYBERPUNK_COLORS.accentGreen, 0.05),
                    }}
                  >
                    <div className="text-xs font-mono font-bold mb-1" style={{ color: CYBERPUNK_COLORS.accentGreen }}>
                      来源详情
                    </div>
                    <div className="text-xs font-mono mb-1" style={{ color: CYBERPUNK_COLORS.textSecondary }}>
                      类型: {SOURCE_TYPE_LABELS[(selectedGroup as SharedSourceGroup).sourceType]}
                    </div>
                    <div
                      className="text-xs font-mono p-2 rounded-sm break-all"
                      style={{
                        color: CYBERPUNK_COLORS.textPrimary,
                        backgroundColor: CYBERPUNK_COLORS.bgPrimary,
                        border: `1px solid ${CYBERPUNK_COLORS.borderColor}`,
                      }}
                    >
                      {(selectedGroup as SharedSourceGroup).sourceIdentifier}
                    </div>
                  </div>
                )}

                {selectedGroup.matchType === 'duplicate_evidence' && (
                  <div
                    className="p-2.5 rounded-sm border"
                    style={{
                      borderColor: CYBERPUNK_COLORS.accentRed,
                      backgroundColor: getGlowColor(CYBERPUNK_COLORS.accentRed, 0.05),
                    }}
                  >
                    <div className="text-xs font-mono font-bold mb-1" style={{ color: CYBERPUNK_COLORS.accentRed }}>
                      相似维度
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {(selectedGroup as DuplicateEvidenceGroup).similarityFields.map((field) => (
                        <span
                          key={field}
                          className="text-xs font-mono px-1.5 py-0 rounded-sm"
                          style={{
                            color: CYBERPUNK_COLORS.accentRed,
                            backgroundColor: getGlowColor(CYBERPUNK_COLORS.accentRed, 0.1),
                            border: `1px solid ${getGlowColor(CYBERPUNK_COLORS.accentRed, 0.3)}`,
                          }}
                        >
                          {field === 'content' ? '内容相似' : field === 'tags' ? '标签重叠' : '来源相同'}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <div className="text-xs font-mono font-bold mb-1.5" style={{ color: CYBERPUNK_COLORS.textSecondary }}>
                    涉及证据 ({selectedGroup.evidenceRefs.length})
                  </div>
                  <div className="space-y-2">
                    {selectedGroup.evidenceRefs.map((ref) => (
                      <EvidenceRefCard key={`${ref.caseId}-${ref.evidenceId}`} ref={ref} />
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div
                className="flex items-center justify-center h-full text-xs font-mono"
                style={{ color: CYBERPUNK_COLORS.textSecondary }}
              >
                选择左侧分组查看详情
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default CrossCaseComparisonPanel;
