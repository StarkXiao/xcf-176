import React, { useState } from 'react';
import {
  FileText,
  Plus,
  CheckCircle2,
  Clock,
  AlertCircle,
  ChevronRight,
  Link2,
} from 'lucide-react';
import { NeonButton } from '@/components/ui/NeonButton';
import { NeonInput } from '@/components/ui/NeonInput';
import { useCaseStore } from '@/store/useCaseStore';
import { useCaseTemplateStore } from '@/store/useCaseTemplateStore';
import { useEvidenceStore } from '@/store/useEvidenceStore';
import { useInvestigationTaskStore } from '@/store/useInvestigationTaskStore';
import { useUiStore } from '@/store/useUiStore';
import { CYBERPUNK_COLORS, getGlowColor } from '@/utils/colorUtils';
import type { TemplateEvidenceField, TemplateInvestigationStep, TemplateRelationType } from '@/types';

interface FieldState {
  [fieldId: string]: string;
}

export const TemplateEvidenceFields: React.FC = () => {
  const currentCase = useCaseStore((state) => state.currentCase);
  const appliedTemplateData = useCaseTemplateStore((state) => state.appliedTemplateData);
  const evidence = useEvidenceStore((state) => state.getEvidenceArray());
  const addEvidence = useEvidenceStore((state) => state.addEvidence);
  const tasks = useInvestigationTaskStore((state) => state.tasks);
  const linkEvidence = useInvestigationTaskStore((state) => state.linkEvidence);
  const currentCollaboratorId = useUiStore((state) => state.currentCollaboratorId);
  const pendingRelationType = useUiStore((state) => state.pendingRelationType);
  const setPendingRelationType = useUiStore((state) => state.setPendingRelationType);

  const [fieldValues, setFieldValues] = useState<FieldState>({});
  const [expandedField, setExpandedField] = useState<string | null>(null);

  if (!currentCase?.templateId || !appliedTemplateData) {
    return null;
  }

  const { evidenceFields, investigationSteps, template } = appliedTemplateData;

  const getFieldStatus = (field: TemplateEvidenceField) => {
    const fieldEvidence = evidence.filter(
      (e) => e.tags.includes(field.name) || e.content.includes(field.label)
    );
    if (fieldEvidence.length > 0) return 'completed';
    if (fieldValues[field.id]?.trim()) return 'in_progress';
    return 'pending';
  };

  const getStepStatus = (step: TemplateInvestigationStep) => {
    const stepTask = tasks.find((t) => t.title === step.title);
    if (!stepTask) return 'pending';
    return stepTask.status;
  };

  const getFieldColor = (field: TemplateEvidenceField) => {
    const status = getFieldStatus(field);
    if (status === 'completed') return CYBERPUNK_COLORS.accentGreen;
    if (status === 'in_progress') return CYBERPUNK_COLORS.accentYellow;
    return CYBERPUNK_COLORS.textSecondary;
  };

  const getStepColor = (status: string) => {
    if (status === 'completed') return CYBERPUNK_COLORS.accentGreen;
    if (status === 'in_progress') return CYBERPUNK_COLORS.accentYellow;
    if (status === 'cancelled') return CYBERPUNK_COLORS.textSecondary;
    return CYBERPUNK_COLORS.textSecondary;
  };

  const handleFieldValueChange = (fieldId: string, value: string) => {
    setFieldValues((prev) => ({ ...prev, [fieldId]: value }));
  };

  const handleCreateEvidence = async (field: TemplateEvidenceField) => {
    const value = fieldValues[field.id]?.trim();
    if (!value || !currentCollaboratorId) return;

    const newEvidence = await addEvidence({
      caseId: currentCase.id,
      content: `[${field.label}] ${value}`,
      source: field.label,
      importance: field.required ? 'high' : 'normal',
      tags: [field.name, field.label, ...template.defaultTags],
      positionX: Math.random() * 400 + 100,
      positionY: Math.random() * 300 + 100,
    });

    if (newEvidence) {
      setFieldValues((prev) => ({ ...prev, [field.id]: '' }));
      setExpandedField(null);

      const relatedStep = investigationSteps.find((s) =>
        s.evidenceFieldIds?.includes(field.id)
      );
      if (relatedStep) {
        const task = tasks.find((t) => t.title === relatedStep.title);
        if (task && currentCollaboratorId) {
          await linkEvidence(task.id, newEvidence.id, currentCollaboratorId);
        }
      }
    }
  };

  const handleQuickCreateEvidence = (field: TemplateEvidenceField) => {
    setExpandedField(expandedField === field.id ? null : field.id);
  };

  const handleStartConnection = (relationType: TemplateRelationType) => {
    setPendingRelationType(relationType);
  };

  const completedFields = evidenceFields.filter(
    (f) => getFieldStatus(f) === 'completed'
  ).length;
  const totalFields = evidenceFields.length;
  const progress = totalFields > 0 ? Math.round((completedFields / totalFields) * 100) : 0;

  const sortedSteps = [...investigationSteps].sort((a, b) => a.order - b.order);
  const completedSteps = sortedSteps.filter(
    (s) => getStepStatus(s) === 'completed'
  ).length;
  const stepsProgress = sortedSteps.length > 0
    ? Math.round((completedSteps / sortedSteps.length) * 100)
    : 0;

  return (
    <div
      className="h-full flex flex-col border-r"
      style={{
        backgroundColor: CYBERPUNK_COLORS.bgSecondary,
        borderColor: CYBERPUNK_COLORS.borderColor,
      }}
    >
      <div
        className="p-4 border-b"
        style={{ borderColor: CYBERPUNK_COLORS.borderColor }}
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <FileText
              size={18}
              style={{
                color: CYBERPUNK_COLORS.accentCyan,
                filter: `drop-shadow(0 0 6px ${getGlowColor(CYBERPUNK_COLORS.accentCyan, 0.5)})`,
              }}
            />
            <span
              className="font-mono font-bold text-sm uppercase tracking-wider"
              style={{
                color: CYBERPUNK_COLORS.accentCyan,
                textShadow: `0 0 8px ${getGlowColor(CYBERPUNK_COLORS.accentCyan, 0.4)}`,
              }}
            >
              模板证据项
            </span>
          </div>
          <span
            className="text-xs font-mono"
            style={{ color: CYBERPUNK_COLORS.textSecondary }}
          >
            {completedFields}/{totalFields}
          </span>
        </div>

        <div
          className="w-full h-1.5 rounded-full overflow-hidden"
          style={{ backgroundColor: CYBERPUNK_COLORS.bgTertiary }}
        >
          <div
            className="h-full rounded-full transition-all duration-300"
            style={{
              width: `${progress}%`,
              backgroundColor: CYBERPUNK_COLORS.accentCyan,
              boxShadow: `0 0 8px ${getGlowColor(CYBERPUNK_COLORS.accentCyan, 0.6)}`,
            }}
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {evidenceFields.map((field) => {
          const status = getFieldStatus(field);
          const color = getFieldColor(field);
          const isExpanded = expandedField === field.id;

          return (
            <div
              key={field.id}
              className="rounded-sm border overflow-hidden"
              style={{
                borderColor: getGlowColor(color, 0.3),
                backgroundColor: CYBERPUNK_COLORS.bgTertiary,
              }}
            >
              <div
                className="p-3 cursor-pointer transition-all"
                onClick={() => handleQuickCreateEvidence(field)}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2 flex-1 min-w-0">
                    {status === 'completed' ? (
                      <CheckCircle2
                        size={16}
                        className="flex-shrink-0 mt-0.5"
                        style={{ color: CYBERPUNK_COLORS.accentGreen }}
                      />
                    ) : status === 'in_progress' ? (
                      <Clock
                        size={16}
                        className="flex-shrink-0 mt-0.5"
                        style={{ color: CYBERPUNK_COLORS.accentYellow }}
                      />
                    ) : field.required ? (
                      <AlertCircle
                        size={16}
                        className="flex-shrink-0 mt-0.5"
                        style={{ color: CYBERPUNK_COLORS.accentRed }}
                      />
                    ) : (
                      <FileText
                        size={16}
                        className="flex-shrink-0 mt-0.5"
                        style={{ color: CYBERPUNK_COLORS.textSecondary }}
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span
                          className="font-mono text-sm font-bold"
                          style={{ color }}
                        >
                          {field.label}
                        </span>
                        {field.required && (
                          <span
                            className="text-xs font-mono px-1.5 py-0.5 rounded-sm"
                            style={{
                              backgroundColor: getGlowColor(CYBERPUNK_COLORS.accentRed, 0.15),
                              color: CYBERPUNK_COLORS.accentRed,
                              border: `1px solid ${getGlowColor(CYBERPUNK_COLORS.accentRed, 0.3)}`,
                            }}
                          >
                            必填
                          </span>
                        )}
                      </div>
                      {field.description && (
                        <p
                          className="text-xs mt-1"
                          style={{ color: CYBERPUNK_COLORS.textSecondary }}
                        >
                          {field.description}
                        </p>
                      )}
                    </div>
                  </div>
                  <ChevronRight
                    size={16}
                    className="flex-shrink-0 transition-transform"
                    style={{
                      color,
                      transform: isExpanded ? 'rotate(90deg)' : 'none',
                    }}
                  />
                </div>
              </div>

              {isExpanded && (
                <div
                  className="p-3 border-t space-y-2"
                  style={{ borderColor: CYBERPUNK_COLORS.borderColor }}
                >
                  <NeonInput
                    label={`录入${field.label}`}
                    value={fieldValues[field.id] || ''}
                    onChange={(e) => handleFieldValueChange(field.id, e.target.value)}
                    placeholder={field.placeholder || `请输入${field.label}...`}
                    autoFocus
                  />
                  <div className="flex gap-2">
                    <NeonButton
                      size="sm"
                      variant="primary"
                      icon={<Plus size={14} />}
                      onClick={() => handleCreateEvidence(field)}
                      disabled={!fieldValues[field.id]?.trim() || !currentCollaboratorId}
                      className="flex-1"
                    >
                      创建证据卡片
                    </NeonButton>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div
        className="border-t"
        style={{ borderColor: CYBERPUNK_COLORS.borderColor }}
      >
        <div
          className="p-4 border-b"
          style={{ borderColor: CYBERPUNK_COLORS.borderColor }}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Link2
                size={18}
                style={{
                  color: CYBERPUNK_COLORS.accentPurple,
                  filter: `drop-shadow(0 0 6px ${getGlowColor(CYBERPUNK_COLORS.accentPurple, 0.5)})`,
                }}
              />
              <span
                className="font-mono font-bold text-sm uppercase tracking-wider"
                style={{
                  color: CYBERPUNK_COLORS.accentPurple,
                  textShadow: `0 0 8px ${getGlowColor(CYBERPUNK_COLORS.accentPurple, 0.4)}`,
                }}
              >
                预置关系类型
              </span>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {appliedTemplateData.relationTypes.map((rel) => {
              const isSelected = pendingRelationType?.id === rel.id;
              return (
                <button
                  key={rel.id}
                  className="text-xs font-mono px-2 py-1 rounded-sm border transition-all"
                  style={{
                    borderColor: isSelected ? rel.color : getGlowColor(rel.color, 0.4),
                    backgroundColor: isSelected
                      ? getGlowColor(rel.color, 0.25)
                      : getGlowColor(rel.color, 0.08),
                    color: rel.color,
                    boxShadow: isSelected
                      ? `0 0 10px ${getGlowColor(rel.color, 0.5)}`
                      : 'none',
                  }}
                  onClick={() => handleStartConnection(rel)}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = getGlowColor(rel.color, 0.15);
                    e.currentTarget.style.boxShadow = `0 0 8px ${getGlowColor(rel.color, 0.4)}`;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = isSelected
                      ? getGlowColor(rel.color, 0.25)
                      : getGlowColor(rel.color, 0.08);
                    e.currentTarget.style.boxShadow = isSelected
                      ? `0 0 10px ${getGlowColor(rel.color, 0.5)}`
                      : 'none';
                  }}
                  title={isSelected ? '已选中，在画布上拖动创建连接' : `点击选择"${rel.label}"关系类型`}
                >
                  {rel.label}
                  {isSelected && ' ✓'}
                </button>
              );
            })}
          </div>
          {pendingRelationType && (
            <p
              className="text-xs mt-2 px-2 py-1 rounded-sm"
              style={{
                color: pendingRelationType.color,
                backgroundColor: getGlowColor(pendingRelationType.color, 0.1),
                border: `1px dashed ${getGlowColor(pendingRelationType.color, 0.3)}`,
              }}
            >
              已选择关系: {pendingRelationType.label}。请在画布上从证据卡片边缘拖动创建连接。
              <button
                className="ml-2 underline hover:no-underline"
                onClick={() => setPendingRelationType(null)}
              >
                取消
              </button>
            </p>
          )}
        </div>

        <div
          className="p-4 border-b"
          style={{ borderColor: CYBERPUNK_COLORS.borderColor }}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Clock
                size={18}
                style={{
                  color: CYBERPUNK_COLORS.accentYellow,
                  filter: `drop-shadow(0 0 6px ${getGlowColor(CYBERPUNK_COLORS.accentYellow, 0.5)})`,
                }}
              />
              <span
                className="font-mono font-bold text-sm uppercase tracking-wider"
                style={{
                  color: CYBERPUNK_COLORS.accentYellow,
                  textShadow: `0 0 8px ${getGlowColor(CYBERPUNK_COLORS.accentYellow, 0.4)}`,
                }}
              >
                研判进度
              </span>
            </div>
            <span
              className="text-xs font-mono"
              style={{ color: CYBERPUNK_COLORS.textSecondary }}
            >
              {completedSteps}/{sortedSteps.length}
            </span>
          </div>

          <div
            className="w-full h-1.5 rounded-full overflow-hidden mb-3"
            style={{ backgroundColor: CYBERPUNK_COLORS.bgTertiary }}
          >
            <div
              className="h-full rounded-full transition-all duration-300"
              style={{
                width: `${stepsProgress}%`,
                backgroundColor: CYBERPUNK_COLORS.accentYellow,
                boxShadow: `0 0 8px ${getGlowColor(CYBERPUNK_COLORS.accentYellow, 0.6)}`,
              }}
            />
          </div>

          <div className="space-y-1">
            {sortedSteps.map((step) => {
              const status = getStepStatus(step);
              const color = getStepColor(status);

              return (
                <div
                  key={step.id}
                  className="flex items-center gap-2 p-2 rounded-sm"
                  style={{
                    backgroundColor: status === 'in_progress'
                      ? getGlowColor(CYBERPUNK_COLORS.accentYellow, 0.08)
                      : 'transparent',
                  }}
                >
                  <span
                    className="text-xs font-mono w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{
                      backgroundColor: getGlowColor(color, 0.15),
                      color,
                      border: `1px solid ${getGlowColor(color, 0.3)}`,
                    }}
                  >
                    {step.order}
                  </span>
                  <span
                    className="text-xs font-mono flex-1 truncate"
                    style={{ color }}
                  >
                    {step.title}
                  </span>
                  <span
                    className="text-xs font-mono px-1.5 py-0.5 rounded-sm"
                    style={{
                      backgroundColor: getGlowColor(
                        step.priority === 'critical'
                          ? CYBERPUNK_COLORS.accentRed
                          : step.priority === 'high'
                          ? CYBERPUNK_COLORS.accentYellow
                          : CYBERPUNK_COLORS.accentCyan,
                        0.15
                      ),
                      color:
                        step.priority === 'critical'
                          ? CYBERPUNK_COLORS.accentRed
                          : step.priority === 'high'
                          ? CYBERPUNK_COLORS.accentYellow
                          : CYBERPUNK_COLORS.accentCyan,
                    }}
                  >
                    {step.priority === 'critical'
                      ? '紧急'
                      : step.priority === 'high'
                      ? '高'
                      : step.priority === 'normal'
                      ? '中'
                      : '低'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TemplateEvidenceFields;
