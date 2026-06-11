import React, { useState, useEffect } from 'react';
import { X, FolderPlus, FolderOpen, Trash2, LayoutTemplate, AlertTriangle } from 'lucide-react';
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
import { CYBERPUNK_COLORS, getGlowColor } from '@/utils/colorUtils';
import type { Case, AnomalyAlertSeverity } from '@/types';

type ViewMode = 'list' | 'create' | 'template';

export const CaseSelector: React.FC = () => {
  const caseSelectorOpen = useUiStore((state) => state.caseSelectorOpen);
  const setCaseSelectorOpen = useUiStore((state) => state.setCaseSelectorOpen);
  const { cases, loading, loadCases, createCase, loadCase } = useCaseStore();
  const setEvidence = useEvidenceStore((state) => state.setEvidence);
  const setConnections = useCanvasStore((state) => state.setConnections);
  const setZoom = useCanvasStore((state) => state.setZoom);
  const setPan = useCanvasStore((state) => state.setPan);
  const setSelectedId = useCanvasStore((state) => state.setSelectedId);
  const { setTasks } = useInvestigationTaskStore();
  const { priorityCases, loadPriorityCases } = useAnomalyAlertStore();
  const setAnomalyAlertPanelOpen = useUiStore((state) => state.setAnomalyAlertPanelOpen);

  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [newCaseName, setNewCaseName] = useState('');
  const [newCaseDescription, setNewCaseDescription] = useState('');

  useEffect(() => {
    if (caseSelectorOpen) {
      loadCases();
      loadPriorityCases();
    }
  }, [caseSelectorOpen, loadCases, loadPriorityCases]);

  const handleClose = () => {
    setCaseSelectorOpen(false);
    setViewMode('list');
    setNewCaseName('');
    setNewCaseDescription('');
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
    }

    setSelectedId(null);
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

  if (!caseSelectorOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      <div
        className="absolute inset-0"
        style={{ backgroundColor: 'rgba(0, 0, 0, 0.8)' }}
        onClick={handleClose}
      />

      <div className="relative z-10 w-full max-w-2xl mx-4">
        <GlowBorder color={CYBERPUNK_COLORS.accentCyan} glowIntensity={0.6}>
          <div
            className="rounded-sm overflow-hidden"
            style={{ backgroundColor: CYBERPUNK_COLORS.bgSecondary }}
          >
            <div
              className="h-14 px-6 flex items-center justify-between border-b"
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

            <div className="p-6 max-h-[60vh] overflow-y-auto">
              {viewMode === 'list' && (
                <div className="space-y-3">
                  <div className="flex justify-between items-center mb-4">
                    <span
                      className="text-sm font-mono"
                      style={{ color: CYBERPUNK_COLORS.textSecondary }}
                    >
                      共 {cases.length} 个案件
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

                  {cases.length === 0 ? (
                    <div
                      className="text-center py-12 font-mono"
                      style={{ color: CYBERPUNK_COLORS.textSecondary }}
                    >
                      <FolderOpen
                        size={48}
                        className="mx-auto mb-4 opacity-30"
                        style={{ color: CYBERPUNK_COLORS.textSecondary }}
                      />
                      <p>暂无案件</p>
                      <p className="text-xs mt-2">点击上方按钮创建新案件</p>
                    </div>
                  ) : (
                    cases.map((caseItem) => {
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
                            <div className="flex items-center gap-2">
                              <h3
                                className="font-mono font-bold truncate"
                                style={{ color: CYBERPUNK_COLORS.textPrimary }}
                              >
                                {caseItem.name}
                              </h3>
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
                            <div
                              className="text-xs mt-2 font-mono flex items-center gap-2"
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
                    })
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
