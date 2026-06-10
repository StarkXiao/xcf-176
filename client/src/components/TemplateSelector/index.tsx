import React, { useState, useEffect } from 'react';
import {
  X,
  LayoutTemplate,
  FileText,
  GitBranch,
  ListTodo,
  Tag,
  ChevronRight,
  ArrowLeft,
  Sparkles,
} from 'lucide-react';
import { NeonButton } from '@/components/ui/NeonButton';
import { NeonInput } from '@/components/ui/NeonInput';
import { GlowBorder } from '@/components/ui/GlowBorder';
import { useCaseTemplateStore } from '@/store/useCaseTemplateStore';
import { useCaseStore } from '@/store/useCaseStore';
import { useEvidenceStore } from '@/store/useEvidenceStore';
import { useCanvasStore } from '@/store/useCanvasStore';
import { useInvestigationTaskStore } from '@/store/useInvestigationTaskStore';
import { useUiStore } from '@/store/useUiStore';
import { CYBERPUNK_COLORS, getGlowColor } from '@/utils/colorUtils';
import type {
  CaseTemplate,
  CaseTemplateCategory,
} from '@/types';

interface TemplateSelectorProps {
  onClose: () => void;
  onBack: () => void;
}

const categoryLabels: Record<CaseTemplateCategory, string> = {
  fraud: '诈骗案件',
  penetration: '渗透攻击',
  ransomware: '勒索软件',
  data_breach: '数据泄露',
  other: '其他',
};

const categoryIcons: Record<CaseTemplateCategory, string> = {
  fraud: '🎭',
  penetration: '🔓',
  ransomware: '🔒',
  data_breach: '📊',
  other: '📋',
};

const categoryColors: Record<CaseTemplateCategory, string> = {
  fraud: CYBERPUNK_COLORS.accentRed,
  penetration: CYBERPUNK_COLORS.accentPurple,
  ransomware: '#dc2626',
  data_breach: CYBERPUNK_COLORS.accentYellow,
  other: CYBERPUNK_COLORS.accentCyan,
};

export const TemplateSelector: React.FC<TemplateSelectorProps> = ({ onClose, onBack }) => {
  const { templates, loading, loadBuiltInTemplates, applyTemplate } = useCaseTemplateStore();
  const { loadCase, createCase } = useCaseStore();
  const setEvidence = useEvidenceStore((state) => state.setEvidence);
  const setConnections = useCanvasStore((state) => state.setConnections);
  const setZoom = useCanvasStore((state) => state.setZoom);
  const setPan = useCanvasStore((state) => state.setPan);
  const setSelectedId = useCanvasStore((state) => state.setSelectedId);
  const { setTasks } = useInvestigationTaskStore();
  const currentCollaboratorId = useUiStore((state) => state.currentCollaboratorId);

  const [selectedTemplate, setSelectedTemplate] = useState<CaseTemplate | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [caseName, setCaseName] = useState('');
  const [caseDescription, setCaseDescription] = useState('');
  const [applying, setApplying] = useState(false);

  useEffect(() => {
    loadBuiltInTemplates();
  }, [loadBuiltInTemplates]);

  const handleTemplateClick = (template: CaseTemplate) => {
    setSelectedTemplate(template);
    setShowConfirm(true);
    setCaseName('');
    setCaseDescription(template.description);
  };

  const handleApplyTemplate = async () => {
    if (!selectedTemplate || !caseName.trim() || !currentCollaboratorId) return;

    setApplying(true);
    try {
      const result = await applyTemplate({
        templateId: selectedTemplate.id,
        caseName: caseName.trim(),
        caseDescription: caseDescription.trim() || undefined,
        createdBy: currentCollaboratorId,
      });

      if (result) {
        await loadCase(result.case.id);

        const currentCase = useCaseStore.getState().currentCase;
        if (currentCase) {
          setEvidence(currentCase.evidence);
          setConnections(currentCase.connections);
          setTasks(result.createdTasks);

          if (currentCase.canvasState) {
            setZoom(currentCase.canvasState.zoom);
            setPan(currentCase.canvasState.panX, currentCase.canvasState.panY);
          } else {
            setZoom(1);
            setPan(0, 0);
          }
        }

        setSelectedId(null);
        onClose();
      }
    } catch (error) {
      console.error('Failed to apply template:', error);
      alert('应用模板失败，请重试');
    } finally {
      setApplying(false);
    }
  };

  const handleCreateEmpty = async () => {
    if (!caseName.trim()) return;

    setApplying(true);
    try {
      const newCase = await createCase(
        caseName.trim(),
        caseDescription.trim() || undefined
      );

      if (newCase) {
        await loadCase(newCase.id);

        const currentCase = useCaseStore.getState().currentCase;
        if (currentCase) {
          setEvidence(currentCase.evidence);
          setConnections(currentCase.connections);
          setTasks([]);

          if (currentCase.canvasState) {
            setZoom(currentCase.canvasState.zoom);
            setPan(currentCase.canvasState.panX, currentCase.canvasState.panY);
          } else {
            setZoom(1);
            setPan(0, 0);
          }
        }

        setSelectedId(null);
        onClose();
      }
    } catch (error) {
      console.error('Failed to create case:', error);
      alert('创建案件失败，请重试');
    } finally {
      setApplying(false);
    }
  };

  const renderTemplateCard = (template: CaseTemplate) => {
    const color = categoryColors[template.category];

    return (
      <div
        key={template.id}
        className="group relative rounded-sm border cursor-pointer transition-all overflow-hidden"
        style={{
          borderColor: CYBERPUNK_COLORS.borderColor,
          backgroundColor: CYBERPUNK_COLORS.bgTertiary,
        }}
        onClick={() => handleTemplateClick(template)}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = color;
          e.currentTarget.style.boxShadow = `0 0 20px ${getGlowColor(color, 0.3)}`;
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = CYBERPUNK_COLORS.borderColor;
          e.currentTarget.style.boxShadow = 'none';
        }}
      >
        <div
          className="h-1"
          style={{
            backgroundColor: color,
            boxShadow: `0 0 8px ${getGlowColor(color, 0.5)}`,
          }}
        />

        <div className="p-4">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-3">
              <span
                className="text-3xl"
                style={{
                  filter: `drop-shadow(0 0 8px ${getGlowColor(color, 0.5)})`,
                }}
              >
                {template.icon || categoryIcons[template.category]}
              </span>
              <div>
                <h3
                  className="font-mono font-bold"
                  style={{ color: CYBERPUNK_COLORS.textPrimary }}
                >
                  {template.name}
                </h3>
                <span
                  className="text-xs font-mono px-2 py-0.5 rounded-sm"
                  style={{
                    backgroundColor: getGlowColor(color, 0.15),
                    color: color,
                    border: `1px solid ${getGlowColor(color, 0.3)}`,
                  }}
                >
                  {categoryLabels[template.category]}
                </span>
              </div>
            </div>
            <ChevronRight
              size={20}
              className="opacity-0 group-hover:opacity-100 transition-opacity"
              style={{ color }}
            />
          </div>

          <p
            className="text-sm mb-4 line-clamp-2"
            style={{ color: CYBERPUNK_COLORS.textSecondary }}
          >
            {template.description}
          </p>

          <div className="flex items-center gap-4 text-xs font-mono">
            <div
              className="flex items-center gap-1"
              style={{ color: CYBERPUNK_COLORS.accentCyan }}
            >
              <FileText size={12} />
              <span>{template.evidenceFields.length} 证据项</span>
            </div>
            <div
              className="flex items-center gap-1"
              style={{ color: CYBERPUNK_COLORS.accentPurple }}
            >
              <GitBranch size={12} />
              <span>{template.relationTypes.length} 关系类型</span>
            </div>
            <div
              className="flex items-center gap-1"
              style={{ color: CYBERPUNK_COLORS.accentYellow }}
            >
              <ListTodo size={12} />
              <span>{template.investigationSteps.length} 研判步骤</span>
            </div>
          </div>

          {template.defaultTags.length > 0 && (
            <div className="flex items-center gap-1 mt-3 flex-wrap">
              <Tag size={10} style={{ color: CYBERPUNK_COLORS.textSecondary }} />
              {template.defaultTags.slice(0, 3).map((tag) => (
                <span
                  key={tag}
                  className="text-xs font-mono px-1.5 py-0.5 rounded-sm"
                  style={{
                    backgroundColor: CYBERPUNK_COLORS.bgSecondary,
                    color: CYBERPUNK_COLORS.textSecondary,
                    border: `1px solid ${CYBERPUNK_COLORS.borderColor}`,
                  }}
                >
                  {tag}
                </span>
              ))}
              {template.defaultTags.length > 3 && (
                <span
                  className="text-xs font-mono"
                  style={{ color: CYBERPUNK_COLORS.textSecondary }}
                >
                  +{template.defaultTags.length - 3}
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderConfirmDialog = () => {
    if (!selectedTemplate || !showConfirm) return null;

    const color = categoryColors[selectedTemplate.category];

    return (
      <div className="fixed inset-0 z-[110] flex items-center justify-center">
        <div
          className="absolute inset-0"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.9)' }}
          onClick={() => setShowConfirm(false)}
        />

        <div className="relative z-10 w-full max-w-xl mx-4">
          <GlowBorder color={color} glowIntensity={0.6}>
            <div
              className="rounded-sm overflow-hidden"
              style={{ backgroundColor: CYBERPUNK_COLORS.bgSecondary }}
            >
              <div
                className="h-14 px-6 flex items-center justify-between border-b"
                style={{ borderColor: CYBERPUNK_COLORS.borderColor }}
              >
                <div className="flex items-center gap-3">
                  <button
                    className="p-1 transition-colors"
                    style={{ color }}
                    onClick={() => setShowConfirm(false)}
                  >
                    <ArrowLeft size={18} />
                  </button>
                  <span
                    className="text-2xl"
                    style={{ filter: `drop-shadow(0 0 8px ${getGlowColor(color, 0.5)})` }}
                  >
                    {selectedTemplate.icon || categoryIcons[selectedTemplate.category]}
                  </span>
                  <div>
                    <h3
                      className="font-mono font-bold"
                      style={{ color: CYBERPUNK_COLORS.textPrimary }}
                    >
                      {selectedTemplate.name}
                    </h3>
                    <span
                      className="text-xs font-mono"
                      style={{ color: CYBERPUNK_COLORS.textSecondary }}
                    >
                      {categoryLabels[selectedTemplate.category]}
                    </span>
                  </div>
                </div>
                <button onClick={() => setShowConfirm(false)}>
                  <X size={20} style={{ color: CYBERPUNK_COLORS.textSecondary }} />
                </button>
              </div>

              <div className="p-6 space-y-4">
                <p
                  className="text-sm"
                  style={{ color: CYBERPUNK_COLORS.textSecondary }}
                >
                  {selectedTemplate.description}
                </p>

                <div className="grid grid-cols-3 gap-3">
                  <div
                    className="p-3 rounded-sm border text-center"
                    style={{
                      borderColor: getGlowColor(CYBERPUNK_COLORS.accentCyan, 0.3),
                      backgroundColor: getGlowColor(CYBERPUNK_COLORS.accentCyan, 0.08),
                    }}
                  >
                    <FileText
                      size={20}
                      className="mx-auto mb-1"
                      style={{ color: CYBERPUNK_COLORS.accentCyan }}
                    />
                    <div
                      className="font-mono font-bold text-lg"
                      style={{ color: CYBERPUNK_COLORS.accentCyan }}
                    >
                      {selectedTemplate.evidenceFields.length}
                    </div>
                    <div
                      className="text-xs font-mono"
                      style={{ color: CYBERPUNK_COLORS.textSecondary }}
                    >
                      证据项
                    </div>
                  </div>
                  <div
                    className="p-3 rounded-sm border text-center"
                    style={{
                      borderColor: getGlowColor(CYBERPUNK_COLORS.accentPurple, 0.3),
                      backgroundColor: getGlowColor(CYBERPUNK_COLORS.accentPurple, 0.08),
                    }}
                  >
                    <GitBranch
                      size={20}
                      className="mx-auto mb-1"
                      style={{ color: CYBERPUNK_COLORS.accentPurple }}
                    />
                    <div
                      className="font-mono font-bold text-lg"
                      style={{ color: CYBERPUNK_COLORS.accentPurple }}
                    >
                      {selectedTemplate.relationTypes.length}
                    </div>
                    <div
                      className="text-xs font-mono"
                      style={{ color: CYBERPUNK_COLORS.textSecondary }}
                    >
                      关系类型
                    </div>
                  </div>
                  <div
                    className="p-3 rounded-sm border text-center"
                    style={{
                      borderColor: getGlowColor(CYBERPUNK_COLORS.accentYellow, 0.3),
                      backgroundColor: getGlowColor(CYBERPUNK_COLORS.accentYellow, 0.08),
                    }}
                  >
                    <ListTodo
                      size={20}
                      className="mx-auto mb-1"
                      style={{ color: CYBERPUNK_COLORS.accentYellow }}
                    />
                    <div
                      className="font-mono font-bold text-lg"
                      style={{ color: CYBERPUNK_COLORS.accentYellow }}
                    >
                      {selectedTemplate.investigationSteps.length}
                    </div>
                    <div
                      className="text-xs font-mono"
                      style={{ color: CYBERPUNK_COLORS.textSecondary }}
                    >
                      研判步骤
                    </div>
                  </div>
                </div>

                <NeonInput
                  label="案件名称"
                  value={caseName}
                  onChange={(e) => setCaseName(e.target.value)}
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
                      minHeight: '80px',
                    }}
                    value={caseDescription}
                    onChange={(e) => setCaseDescription(e.target.value)}
                    placeholder="输入案件描述（可选）..."
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <NeonButton
                    variant="primary"
                    onClick={handleApplyTemplate}
                    disabled={!caseName.trim() || applying || loading}
                    className="flex-1"
                    icon={<Sparkles size={14} />}
                  >
                    {applying ? '创建中...' : '应用模板创建'}
                  </NeonButton>
                  <NeonButton
                    variant="secondary"
                    onClick={() => setShowConfirm(false)}
                    className="flex-1"
                  >
                    返回选择
                  </NeonButton>
                </div>
              </div>
            </div>
          </GlowBorder>
        </div>
      </div>
    );
  };

  return (
    <>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <button
            className="flex items-center gap-2 text-xs font-mono px-2 py-1 rounded-sm border transition-all"
            style={{
              borderColor: CYBERPUNK_COLORS.borderColor,
              color: CYBERPUNK_COLORS.textSecondary,
            }}
            onClick={onBack}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = CYBERPUNK_COLORS.accentCyan;
              e.currentTarget.style.color = CYBERPUNK_COLORS.accentCyan;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = CYBERPUNK_COLORS.borderColor;
              e.currentTarget.style.color = CYBERPUNK_COLORS.textSecondary;
            }}
          >
            <ArrowLeft size={14} />
            返回案件列表
          </button>

          <div className="flex items-center gap-2">
            <LayoutTemplate
              size={16}
              style={{ color: CYBERPUNK_COLORS.accentCyan }}
            />
            <span
              className="text-sm font-mono"
              style={{ color: CYBERPUNK_COLORS.textSecondary }}
            >
              选择案件模板
            </span>
          </div>
        </div>

        {loading ? (
          <div
            className="text-center py-12 font-mono"
            style={{ color: CYBERPUNK_COLORS.textSecondary }}
          >
            加载模板中...
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {templates.map(renderTemplateCard)}

            <div
              className="group rounded-sm border-2 border-dashed cursor-pointer transition-all flex flex-col items-center justify-center p-8 min-h-[240px]"
              style={{
                borderColor: CYBERPUNK_COLORS.borderColor,
                backgroundColor: 'transparent',
              }}
              onClick={() => {
                setSelectedTemplate(null);
                setShowConfirm(true);
                setCaseName('');
                setCaseDescription('');
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = CYBERPUNK_COLORS.accentGreen;
                e.currentTarget.style.backgroundColor = getGlowColor(CYBERPUNK_COLORS.accentGreen, 0.05);
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = CYBERPUNK_COLORS.borderColor;
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              <LayoutTemplate
                size={40}
                className="mb-3 opacity-50 group-hover:opacity-100 transition-opacity"
                style={{ color: CYBERPUNK_COLORS.accentGreen }}
              />
              <span
                className="font-mono font-bold mb-1"
                style={{ color: CYBERPUNK_COLORS.accentGreen }}
              >
                创建空白案件
              </span>
              <span
                className="text-xs font-mono"
                style={{ color: CYBERPUNK_COLORS.textSecondary }}
              >
                不使用任何模板，从零开始
              </span>
            </div>
          </div>
        )}
      </div>

      {showConfirm && selectedTemplate === null && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center">
          <div
            className="absolute inset-0"
            style={{ backgroundColor: 'rgba(0, 0, 0, 0.9)' }}
            onClick={() => setShowConfirm(false)}
          />

          <div className="relative z-10 w-full max-w-lg mx-4">
            <GlowBorder color={CYBERPUNK_COLORS.accentGreen} glowIntensity={0.6}>
              <div
                className="rounded-sm overflow-hidden"
                style={{ backgroundColor: CYBERPUNK_COLORS.bgSecondary }}
              >
                <div
                  className="h-14 px-6 flex items-center justify-between border-b"
                  style={{ borderColor: CYBERPUNK_COLORS.borderColor }}
                >
                  <div className="flex items-center gap-3">
                    <button
                      className="p-1 transition-colors"
                      style={{ color: CYBERPUNK_COLORS.accentGreen }}
                      onClick={() => setShowConfirm(false)}
                    >
                      <ArrowLeft size={18} />
                    </button>
                    <LayoutTemplate
                      size={24}
                      style={{ color: CYBERPUNK_COLORS.accentGreen }}
                    />
                    <h3
                      className="font-mono font-bold"
                      style={{ color: CYBERPUNK_COLORS.textPrimary }}
                    >
                      创建空白案件
                    </h3>
                  </div>
                  <button onClick={() => setShowConfirm(false)}>
                    <X size={20} style={{ color: CYBERPUNK_COLORS.textSecondary }} />
                  </button>
                </div>

                <div className="p-6 space-y-4">
                  <NeonInput
                    label="案件名称"
                    value={caseName}
                    onChange={(e) => setCaseName(e.target.value)}
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
                        minHeight: '80px',
                      }}
                      value={caseDescription}
                      onChange={(e) => setCaseDescription(e.target.value)}
                      placeholder="输入案件描述（可选）..."
                    />
                  </div>

                  <div className="flex gap-3 pt-2">
                    <NeonButton
                      variant="primary"
                      onClick={handleCreateEmpty}
                      disabled={!caseName.trim() || applying || loading}
                      className="flex-1"
                    >
                      {applying ? '创建中...' : '创建案件'}
                    </NeonButton>
                    <NeonButton
                      variant="secondary"
                      onClick={() => setShowConfirm(false)}
                      className="flex-1"
                    >
                      返回选择
                    </NeonButton>
                  </div>
                </div>
              </div>
            </GlowBorder>
          </div>
        </div>
      )}

      {renderConfirmDialog()}
    </>
  );
};

export default TemplateSelector;
