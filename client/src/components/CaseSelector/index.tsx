import React, { useState, useEffect, useMemo } from 'react';
import { X, FolderPlus, FolderOpen, Trash2, LayoutTemplate, AlertTriangle, Search, Filter, Calendar, Tag, Database, Gauge } from 'lucide-react';
import { NeonButton } from '@/components/ui/NeonButton';
import { NeonInput } from '@/components/ui/NeonInput';
import { GlowBorder } from '@/components/ui/GlowBorder';
import { TemplateSelector } from '@/components/TemplateSelector';
import { useUiStore } from '@/store/useUiStore';
import { useCaseStore } from '@/store/useCaseStore';
import { useEvidenceStore } from '@/store/useEvidenceStore';
import { useCanvasStore } from '@/store/useCanvasStore';
import { useInvestigationTaskStore } from '@/store/useInvestigationTaskStore';
import { useAnomalyAlertStore } from '@/store/useAnomalyAlertStore';
import { CYBERPUNK_COLORS, getGlowColor, IMPORTANCE_COLORS } from '@/utils/colorUtils';
import type { Case, AnomalyAlertSeverity, CaseSearchFilters, CaseWithAggregatedData, ImportanceLevel } from '@/types';

type ViewMode = 'list' | 'create' | 'template';

const importanceOptions: Array<{ value: ImportanceLevel | 'all'; label: string }> = [
  { value: 'all', label: '全部' },
  { value: 'low', label: '低' },
  { value: 'normal', label: '中' },
  { value: 'high', label: '高' },
  { value: 'critical', label: '紧急' },
];

const dateFieldOptions: Array<{ value: 'createdAt' | 'updatedAt'; label: string }> = [
  { value: 'updatedAt', label: '更新时间' },
  { value: 'createdAt', label: '创建时间' },
];

export const CaseSelector: React.FC = () => {
  const caseSelectorOpen = useUiStore((state) => state.caseSelectorOpen);
  const setCaseSelectorOpen = useUiStore((state) => state.setCaseSelectorOpen);
  const {
    loading,
    loadCasesWithMeta,
    loadFilterOptions,
    searchCases,
    loadCase,
    createCase,
    casesWithMeta,
    availableTags,
    availableSources,
  } = useCaseStore();
  const setEvidence = useEvidenceStore((state) => state.setEvidence);
  const setConnections = useCanvasStore((state) => state.setConnections);
  const setZoom = useCanvasStore((state) => state.setZoom);
  const setPan = useCanvasStore((state) => state.setPan);
  const setSelectedId = useCanvasStore((state) => state.setSelectedId);
  const setSelectedConnectionId = useCanvasStore((state) => state.setSelectedConnectionId);
  const { setTasks } = useInvestigationTaskStore();
  const { priorityCases, loadPriorityCases } = useAnomalyAlertStore();
  const setAnomalyAlertPanelOpen = useUiStore((state) => state.setAnomalyAlertPanelOpen);

  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [newCaseName, setNewCaseName] = useState('');
  const [newCaseDescription, setNewCaseDescription] = useState('');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [filters, setFilters] = useState<CaseSearchFilters>({
    keyword: '',
    tags: [],
    sources: [],
    importance: undefined,
    dateRange: undefined,
    dateField: 'updatedAt',
  });
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [preservedCanvasState, setPreservedCanvasState] = useState<{
    zoom: number;
    panX: number;
    panY: number;
    selectedId: string | null;
    selectedConnectionId: string | null;
  } | null>(null);

  useEffect(() => {
    if (caseSelectorOpen) {
      setPreservedCanvasState({
        zoom: useCanvasStore.getState().zoom,
        panX: useCanvasStore.getState().panX,
        panY: useCanvasStore.getState().panY,
        selectedId: useCanvasStore.getState().selectedId,
        selectedConnectionId: useCanvasStore.getState().selectedConnectionId,
      });
      loadCasesWithMeta();
      loadFilterOptions();
      loadPriorityCases();
    } else {
      setPreservedCanvasState(null);
    }
  }, [caseSelectorOpen, loadCasesWithMeta, loadFilterOptions, loadPriorityCases]);

  useEffect(() => {
    if (caseSelectorOpen) {
      const searchFilters: CaseSearchFilters = {
        ...filters,
        dateRange: startDate || endDate ? { start: startDate || undefined, end: endDate || undefined } : undefined,
      };
      searchCases(searchFilters);
    }
  }, [filters, startDate, endDate, caseSelectorOpen, searchCases]);

  const handleClose = () => {
    setCaseSelectorOpen(false);
    setViewMode('list');
    setNewCaseName('');
    setNewCaseDescription('');
    setShowAdvancedFilters(false);
    setFilters({
      keyword: '',
      tags: [],
      sources: [],
      importance: undefined,
      dateRange: undefined,
      dateField: 'updatedAt',
    });
    setStartDate('');
    setEndDate('');
    if (preservedCanvasState) {
      setZoom(preservedCanvasState.zoom);
      setPan(preservedCanvasState.panX, preservedCanvasState.panY);
      setSelectedId(preservedCanvasState.selectedId);
      setSelectedConnectionId(preservedCanvasState.selectedConnectionId);
    }
  };

  const handleCreateCase = async () => {
    if (!newCaseName.trim()) return;

    const newCase = await createCase(newCaseName.trim(), newCaseDescription.trim() || undefined);
    if (newCase) {
      setNewCaseName('');
      setNewCaseDescription('');
      setViewMode('list');
      await handleSelectCase(newCase);
    }
  };

  const handleSelectCase = async (caseData: Case) => {
    await loadCase(caseData.id);

    const currentCase = useCaseStore.getState().currentCase;
    if (currentCase) {
      setEvidence(currentCase.evidence);
      setConnections(currentCase.connections);

      if (currentCase.canvasState) {
        setZoom(currentCase.canvasState.zoom);
        setPan(currentCase.canvasState.panX, currentCase.canvasState.panY);
      } else {
        setZoom(1);
        setPan(0, 0);
      }
      setSelectedId(null);
      setSelectedConnectionId(null);
    }

    setPreservedCanvasState(null);
    handleClose();
  };

  const handleSelectPriorityCase = async (caseData: Case) => {
    await handleSelectCase(caseData);
    setAnomalyAlertPanelOpen(true);
  };

  const handleDeleteCase = async (e: React.MouseEvent, caseId: string) => {
    e.stopPropagation();
    if (confirm('确定要删除此案件吗？所有相关证据将被删除。')) {
      await useCaseStore.getState().deleteCase(caseId);
    }
  };

  const toggleTag = (tag: string) => {
    setFilters((prev) => ({
      ...prev,
      tags: prev.tags.includes(tag) ? prev.tags.filter((t) => t !== tag) : [...prev.tags, tag],
    }));
  };

  const toggleSource = (source: string) => {
    setFilters((prev) => ({
      ...prev,
      sources: prev.sources.includes(source) ? prev.sources.filter((s) => s !== source) : [...prev.sources, source],
    }));
  };

  const clearFilters = () => {
    setFilters({
      keyword: '',
      tags: [],
      sources: [],
      importance: undefined,
      dateRange: undefined,
      dateField: 'updatedAt',
    });
    setStartDate('');
    setEndDate('');
  };

  const hasActiveFilters = useMemo(() => {
    return (
      filters.keyword ||
      filters.tags.length > 0 ||
      filters.sources.length > 0 ||
      filters.importance ||
      startDate ||
      endDate
    );
  }, [filters, startDate, endDate]);

  const displayCases: CaseWithAggregatedData[] = casesWithMeta.length > 0 ? casesWithMeta : [];

  if (!caseSelectorOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      <div
        className="absolute inset-0"
        style={{ backgroundColor: 'rgba(0, 0, 0, 0.8)' }}
        onClick={handleClose}
      />

      <div className="relative z-10 w-full max-w-3xl mx-4 max-h-[90vh] flex flex-col">
        <GlowBorder color={CYBERPUNK_COLORS.accentCyan} glowIntensity={0.6}>
          <div
            className="rounded-sm overflow-hidden flex flex-col max-h-[90vh]"
            style={{ backgroundColor: CYBERPUNK_COLORS.bgSecondary }}
          >
            <div
              className="h-14 px-6 flex items-center justify-between border-b flex-shrink-0"
              style={{ borderColor: CYBERPUNK_COLORS.borderColor }}
            >
              <div className="flex items-center gap-3">
                <FolderOpen
                  size={20}
                  style={{
                    color: CYBERPUNK_COLORS.accentCyan,
                    filter: `drop-shadow(0 0 6px ${getGlowColor(CYBERPUNK_COLORS.accentCyan, 0.6)})`,
                  }}
                />
                <span
                  className="font-mono text-lg uppercase tracking-wider"
                  style={{
                    color: CYBERPUNK_COLORS.accentCyan,
                    textShadow: `0 0 10px ${getGlowColor(CYBERPUNK_COLORS.accentCyan, 0.4)}`,
                  }}
                >
                  选择案件
                </span>
              </div>
              <button onClick={handleClose}>
                <X size={20} style={{ color: CYBERPUNK_COLORS.textSecondary }} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {viewMode === 'list' && (
                <div className="space-y-4">
                  <div className="flex justify-between items-center mb-2">
                    <span
                      className="text-sm font-mono"
                      style={{ color: CYBERPUNK_COLORS.textSecondary }}
                    >
                      共 {displayCases.length} 个案件
                    </span>
                    <div className="flex gap-2">
                      <NeonButton
                        size="sm"
                        variant="secondary"
                        icon={<LayoutTemplate size={14} />}
                        onClick={() => setViewMode('template')}
                      >
                        从模板创建
                      </NeonButton>
                      <NeonButton
                        size="sm"
                        variant="primary"
                        icon={<FolderPlus size={14} />}
                        onClick={() => setViewMode('create')}
                      >
                        新建案件
                      </NeonButton>
                    </div>
                  </div>

                  <div className="space-y-3 p-3 border rounded-sm" style={{ borderColor: CYBERPUNK_COLORS.borderColor }}>
                    <div className="relative">
                      <Search
                        size={16}
                        className="absolute left-3 top-1/2 -translate-y-1/2"
                        style={{ color: CYBERPUNK_COLORS.textSecondary }}
                      />
                      <NeonInput
                        placeholder="搜索案件名称、描述、标签或来源..."
                        value={filters.keyword}
                        onChange={(e) => setFilters((prev) => ({ ...prev, keyword: e.target.value }))}
                        className="pl-9"
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <button
                        className="flex items-center gap-1 text-xs font-mono uppercase tracking-wider"
                        style={{ color: CYBERPUNK_COLORS.accentCyan }}
                        onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                      >
                        <Filter size={14} />
                        {showAdvancedFilters ? '收起筛选' : '高级筛选'}
                      </button>
                      {hasActiveFilters && (
                        <button
                          className="flex items-center gap-1 text-xs font-mono"
                          style={{ color: CYBERPUNK_COLORS.accentRed }}
                          onClick={clearFilters}
                        >
                          <X size={14} />
                          清除筛选
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
                              setFilters((prev) => ({
                                ...prev,
                                importance: option.value === 'all' ? undefined : (option.value as ImportanceLevel),
                              }))
                            }
                          >
                            <Gauge size={10} className="inline mr-1" />
                            {option.label}
                          </button>
                        );
                      })}
                    </div>

                    {showAdvancedFilters && (
                      <div className="space-y-4 pt-3 border-t" style={{ borderColor: CYBERPUNK_COLORS.borderColor }}>
                        {availableTags.length > 0 && (
                          <div>
                            <div className="flex items-center gap-1 mb-2 text-xs font-mono uppercase tracking-wider" style={{ color: CYBERPUNK_COLORS.accentPurple }}>
                              <Tag size={12} />
                              标签筛选 {filters.tags.length > 0 && `(${filters.tags.length})`}
                            </div>
                            <div className="flex flex-wrap gap-1">
                              {availableTags.map((tag) => {
                                const isActive = filters.tags.includes(tag);
                                return (
                                  <button
                                    key={tag}
                                    className="px-2 py-1 text-xs font-mono border rounded-sm transition-all"
                                    style={{
                                      borderColor: isActive ? CYBERPUNK_COLORS.accentPurple : CYBERPUNK_COLORS.borderColor,
                                      color: isActive ? CYBERPUNK_COLORS.accentPurple : CYBERPUNK_COLORS.textSecondary,
                                      backgroundColor: isActive ? getGlowColor(CYBERPUNK_COLORS.accentPurple, 0.1) : 'transparent',
                                    }}
                                    onClick={() => toggleTag(tag)}
                                  >
                                    #{tag}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {availableSources.length > 0 && (
                          <div>
                            <div className="flex items-center gap-1 mb-2 text-xs font-mono uppercase tracking-wider" style={{ color: CYBERPUNK_COLORS.accentGreen }}>
                              <Database size={12} />
                              来源筛选 {filters.sources.length > 0 && `(${filters.sources.length})`}
                            </div>
                            <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto">
                              {availableSources.slice(0, 30).map((source) => {
                                const isActive = filters.sources.includes(source);
                                const displayName = source.length > 25 ? source.slice(0, 25) + '...' : source;
                                return (
                                  <button
                                    key={source}
                                    className="px-2 py-1 text-xs font-mono border rounded-sm transition-all"
                                    style={{
                                      borderColor: isActive ? CYBERPUNK_COLORS.accentGreen : CYBERPUNK_COLORS.borderColor,
                                      color: isActive ? CYBERPUNK_COLORS.accentGreen : CYBERPUNK_COLORS.textSecondary,
                                      backgroundColor: isActive ? getGlowColor(CYBERPUNK_COLORS.accentGreen, 0.1) : 'transparent',
                                    }}
                                    onClick={() => toggleSource(source)}
                                    title={source}
                                  >
                                    {displayName}
                                  </button>
                                );
                              })}
                              {availableSources.length > 30 && (
                                <span className="px-2 py-1 text-xs font-mono" style={{ color: CYBERPUNK_COLORS.textSecondary }}>
                                  +{availableSources.length - 30} 更多
                                </span>
                              )}
                            </div>
                          </div>
                        )}

                        <div>
                          <div className="flex items-center gap-1 mb-2 text-xs font-mono uppercase tracking-wider" style={{ color: CYBERPUNK_COLORS.accentYellow }}>
                            <Calendar size={12} />
                            时间范围
                          </div>
                          <div className="flex flex-wrap gap-2 items-center">
                            <select
                              className="px-2 py-1 text-xs font-mono border rounded-sm focus:outline-none"
                              style={{
                                borderColor: CYBERPUNK_COLORS.borderColor,
                                backgroundColor: CYBERPUNK_COLORS.bgTertiary,
                                color: CYBERPUNK_COLORS.textPrimary,
                              }}
                              value={filters.dateField}
                              onChange={(e) => setFilters((prev) => ({ ...prev, dateField: e.target.value as 'createdAt' | 'updatedAt' }))}
                            >
                              {dateFieldOptions.map((opt) => (
                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                              ))}
                            </select>
                            <input
                              type="date"
                              className="px-2 py-1 text-xs font-mono border rounded-sm focus:outline-none"
                              style={{
                                borderColor: CYBERPUNK_COLORS.borderColor,
                                backgroundColor: CYBERPUNK_COLORS.bgTertiary,
                                color: CYBERPUNK_COLORS.textPrimary,
                              }}
                              value={startDate}
                              onChange={(e) => setStartDate(e.target.value)}
                            />
                            <span className="text-xs font-mono" style={{ color: CYBERPUNK_COLORS.textSecondary }}>至</span>
                            <input
                              type="date"
                              className="px-2 py-1 text-xs font-mono border rounded-sm focus:outline-none"
                              style={{
                                borderColor: CYBERPUNK_COLORS.borderColor,
                                backgroundColor: CYBERPUNK_COLORS.bgTertiary,
                                color: CYBERPUNK_COLORS.textPrimary,
                              }}
                              value={endDate}
                              onChange={(e) => setEndDate(e.target.value)}
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {displayCases.length === 0 ? (
                    <div
                      className="text-center py-12 font-mono"
                      style={{ color: CYBERPUNK_COLORS.textSecondary }}
                    >
                      <FolderOpen
                        size={48}
                        className="mx-auto mb-4 opacity-30"
                        style={{ color: CYBERPUNK_COLORS.textSecondary }}
                      />
                      <p>{hasActiveFilters ? '没有匹配的案件' : '暂无案件'}</p>
                      <p className="text-xs mt-2">{hasActiveFilters ? '尝试调整筛选条件' : '点击上方按钮创建新案件'}</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {displayCases.map((caseItem) => {
                        const priority = priorityCases.find((p) => p.caseId === caseItem.id);
                        const severityColor: Record<AnomalyAlertSeverity, string> = {
                          warning: CYBERPUNK_COLORS.accentYellow,
                          high: '#ff6b35',
                          critical: CYBERPUNK_COLORS.accentRed,
                        };
                        return (
                          <div
                            key={caseItem.id}
                            className="group flex items-center justify-between p-4 border rounded-sm cursor-pointer transition-all hover:border-opacity-100"
                            style={{
                              borderColor: priority ? getGlowColor(severityColor[priority.priorityLevel], 0.4) : CYBERPUNK_COLORS.borderColor,
                              backgroundColor: CYBERPUNK_COLORS.bgTertiary,
                            }}
                            onClick={() => handleSelectCase(caseItem)}
                            onMouseEnter={(e) => {
                              const hoverColor = priority ? severityColor[priority.priorityLevel] : CYBERPUNK_COLORS.accentCyan;
                              e.currentTarget.style.borderColor = hoverColor;
                              e.currentTarget.style.boxShadow = `0 0 15px ${getGlowColor(hoverColor, 0.3)}`;
                            }}
                            onMouseLeave={(e) => {
                              const leaveColor = priority ? getGlowColor(severityColor[priority.priorityLevel], 0.4) : CYBERPUNK_COLORS.borderColor;
                              e.currentTarget.style.borderColor = leaveColor;
                              e.currentTarget.style.boxShadow = 'none';
                            }}
                          >
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <h3
                                  className="font-mono font-bold truncate"
                                  style={{ color: CYBERPUNK_COLORS.textPrimary }}
                                >
                                  {caseItem.name}
                                </h3>
                                <span
                                  className="text-xs font-mono px-1.5 py-0.5 rounded-sm"
                                  style={{
                                    backgroundColor: getGlowColor(CYBERPUNK_COLORS.textSecondary, 0.15),
                                    color: CYBERPUNK_COLORS.textSecondary,
                                  }}
                                >
                                  {caseItem.evidenceCount} 条证据
                                </span>
                                {caseItem.highestImportance && (
                                  <span
                                    className="text-xs font-mono px-1.5 py-0.5 rounded-sm"
                                    style={{
                                      backgroundColor: getGlowColor(IMPORTANCE_COLORS[caseItem.highestImportance], 0.2),
                                      color: IMPORTANCE_COLORS[caseItem.highestImportance],
                                      border: `1px solid ${getGlowColor(IMPORTANCE_COLORS[caseItem.highestImportance], 0.3)}`,
                                    }}
                                  >
                                    最高: {caseItem.highestImportance === 'critical' ? '紧急' : caseItem.highestImportance === 'high' ? '高' : caseItem.highestImportance === 'normal' ? '中' : '低'}
                                  </span>
                                )}
                                {priority && priority.alerts.filter((a) => a.status === 'pending').length > 0 && (
                                  <button
                                    className="flex items-center gap-1 text-xs font-mono px-1.5 py-0.5 rounded-sm flex-shrink-0 transition-all hover:opacity-80"
                                    style={{
                                      backgroundColor: getGlowColor(severityColor[priority.priorityLevel], 0.2),
                                      color: severityColor[priority.priorityLevel],
                                      border: `1px solid ${getGlowColor(severityColor[priority.priorityLevel], 0.3)}`,
                                    }}
                                    onClick={async (e) => {
                                      e.stopPropagation();
                                      await handleSelectPriorityCase(caseItem);
                                    }}
                                    title={`${priority.alerts.filter((a) => a.status === 'pending').length} 个待处理预警，点击查看`}
                                  >
                                    <AlertTriangle size={10} />
                                    {priority.alerts.filter((a) => a.status === 'pending').length}
                                  </button>
                                )}
                              </div>
                              {caseItem.description && (
                                <p
                                  className="text-sm mt-1 truncate"
                                  style={{ color: CYBERPUNK_COLORS.textSecondary }}
                                >
                                  {caseItem.description}
                                </p>
                              )}
                              {caseItem.allTags.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-2">
                                  {caseItem.allTags.slice(0, 5).map((tag) => (
                                    <span
                                      key={tag}
                                      className="px-1.5 py-0.5 text-xs font-mono rounded-sm"
                                      style={{
                                        backgroundColor: getGlowColor(CYBERPUNK_COLORS.accentPurple, 0.1),
                                        color: CYBERPUNK_COLORS.accentPurple,
                                        border: `1px solid ${getGlowColor(CYBERPUNK_COLORS.accentPurple, 0.2)}`,
                                      }}
                                    >
                                      #{tag}
                                    </span>
                                  ))}
                                  {caseItem.allTags.length > 5 && (
                                    <span className="text-xs font-mono" style={{ color: CYBERPUNK_COLORS.textSecondary }}>
                                      +{caseItem.allTags.length - 5}
                                    </span>
                                  )}
                                </div>
                              )}
                              <div
                                className="text-xs mt-2 font-mono flex items-center gap-2 flex-wrap"
                                style={{ color: CYBERPUNK_COLORS.textSecondary }}
                              >
                                <span>更新于: {new Date(caseItem.updatedAt).toLocaleString('zh-CN')}</span>
                                {priority && (
                                  <span style={{ color: severityColor[priority.priorityLevel] }}>
                                    评分 {Math.round(priority.overallScore * 100)}/100
                                  </span>
                                )}
                              </div>
                            </div>
                            <button
                              className="ml-4 p-2 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-900/20 rounded-sm"
                              onClick={(e) => handleDeleteCase(e, caseItem.id)}
                            >
                              <Trash2
                                size={16}
                                style={{ color: CYBERPUNK_COLORS.accentRed }}
                              />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {viewMode === 'create' && (
                <div className="space-y-4">
                  <h3
                    className="font-mono text-lg uppercase tracking-wider"
                    style={{
                      color: CYBERPUNK_COLORS.accentCyan,
                      textShadow: `0 0 8px ${getGlowColor(CYBERPUNK_COLORS.accentCyan, 0.4)}`,
                    }}
                  >
                    创建新案件
                  </h3>

                  <NeonInput
                    label="案件名称"
                    value={newCaseName}
                    onChange={(e) => setNewCaseName(e.target.value)}
                    placeholder="输入案件名称..."
                    autoFocus
                  />

                  <div>
                    <label
                      className="block mb-1 text-xs font-mono uppercase tracking-wider"
                      style={{ color: CYBERPUNK_COLORS.textSecondary }}
                    >
                      案件描述
                    </label>
                    <textarea
                      className="w-full px-3 py-2 font-mono text-sm border rounded-sm focus:outline-none resize-none"
                      style={{
                        borderColor: CYBERPUNK_COLORS.borderColor,
                        backgroundColor: CYBERPUNK_COLORS.bgSecondary,
                        color: CYBERPUNK_COLORS.textPrimary,
                        minHeight: '100px',
                      }}
                      value={newCaseDescription}
                      onChange={(e) => setNewCaseDescription(e.target.value)}
                      placeholder="输入案件描述（可选）..."
                    />
                  </div>

                  <div className="flex gap-3 pt-4">
                    <NeonButton
                      variant="primary"
                      onClick={handleCreateCase}
                      disabled={!newCaseName.trim() || loading}
                      className="flex-1"
                    >
                      {loading ? '创建中...' : '创建案件'}
                    </NeonButton>
                    <NeonButton
                      variant="secondary"
                      onClick={() => {
                        setViewMode('list');
                        setNewCaseName('');
                        setNewCaseDescription('');
                      }}
                      className="flex-1"
                    >
                      返回列表
                    </NeonButton>
                  </div>
                </div>
              )}

              {viewMode === 'template' && (
                <TemplateSelector
                  onClose={handleClose}
                  onBack={() => setViewMode('list')}
                />
              )}
            </div>
          </div>
        </GlowBorder>
      </div>
    </div>
  );
};

export default CaseSelector;
