import React from 'react';
import {
  LayoutTemplate,
  FileText,
  GitBranch,
  ListTodo,
  ChevronDown,
} from 'lucide-react';
import { useCaseStore } from '@/store/useCaseStore';
import { useCaseTemplateStore } from '@/store/useCaseTemplateStore';
import { useInvestigationTaskStore } from '@/store/useInvestigationTaskStore';
import { CYBERPUNK_COLORS, getGlowColor } from '@/utils/colorUtils';
import type { CaseTemplateCategory } from '@/types';

const categoryLabels: Record<CaseTemplateCategory, string> = {
  fraud: '诈骗案件',
  penetration: '渗透攻击',
  ransomware: '勒索软件',
  data_breach: '数据泄露',
  other: '其他',
};

const categoryColors: Record<CaseTemplateCategory, string> = {
  fraud: CYBERPUNK_COLORS.accentRed,
  penetration: CYBERPUNK_COLORS.accentPurple,
  ransomware: '#dc2626',
  data_breach: CYBERPUNK_COLORS.accentYellow,
  other: CYBERPUNK_COLORS.accentCyan,
};

export const TemplateInfoBadge: React.FC = () => {
  const currentCase = useCaseStore((state) => state.currentCase);
  const appliedTemplateData = useCaseTemplateStore((state) => state.appliedTemplateData);
  const tasks = useInvestigationTaskStore((state) => state.tasks);

  if (!currentCase?.templateId || !currentCase?.templateMetadata) {
    return null;
  }

  const metadata = currentCase.templateMetadata;
  const color = categoryColors[metadata.category];
  const template = appliedTemplateData?.template;

  const completedTasks = tasks.filter((t) => t.status === 'completed').length;
  const totalTasks = metadata.investigationStepIds.length;
  const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  return (
    <div className="flex items-center gap-3">
      <div
        className="flex items-center gap-2 px-3 py-1.5 rounded-sm border"
        style={{
          borderColor: getGlowColor(color, 0.4),
          backgroundColor: getGlowColor(color, 0.08),
        }}
      >
        <LayoutTemplate
          size={16}
          style={{
            color,
            filter: `drop-shadow(0 0 6px ${getGlowColor(color, 0.5)})`,
          }}
        />
        <div>
          <div
            className="text-xs font-mono font-bold"
            style={{ color }}
          >
            {metadata.templateName}
          </div>
          <div
            className="text-[10px] font-mono"
            style={{ color: CYBERPUNK_COLORS.textSecondary }}
          >
            {categoryLabels[metadata.category]}
          </div>
        </div>
      </div>

      {template && (
        <>
          <div
            className="flex items-center gap-1.5 px-2 py-1 rounded-sm"
            style={{ backgroundColor: CYBERPUNK_COLORS.bgTertiary }}
          >
            <FileText
              size={12}
              style={{ color: CYBERPUNK_COLORS.accentCyan }}
            />
            <span
              className="text-xs font-mono"
              style={{ color: CYBERPUNK_COLORS.textSecondary }}
            >
              {template.evidenceFields.length} 证据项
            </span>
          </div>

          <div
            className="flex items-center gap-1.5 px-2 py-1 rounded-sm"
            style={{ backgroundColor: CYBERPUNK_COLORS.bgTertiary }}
          >
            <GitBranch
              size={12}
              style={{ color: CYBERPUNK_COLORS.accentPurple }}
            />
            <span
              className="text-xs font-mono"
              style={{ color: CYBERPUNK_COLORS.textSecondary }}
            >
              {template.relationTypes.length} 关系类型
            </span>
          </div>

          <div
            className="flex items-center gap-1.5 px-2 py-1 rounded-sm"
            style={{ backgroundColor: CYBERPUNK_COLORS.bgTertiary }}
          >
            <ListTodo
              size={12}
              style={{ color: CYBERPUNK_COLORS.accentYellow }}
            />
            <div className="flex items-center gap-1.5">
              <div
                className="w-16 h-1.5 rounded-full overflow-hidden"
                style={{ backgroundColor: CYBERPUNK_COLORS.bgSecondary }}
              >
                <div
                  className="h-full rounded-full transition-all duration-300"
                  style={{
                    width: `${progress}%`,
                    backgroundColor: CYBERPUNK_COLORS.accentYellow,
                    boxShadow: `0 0 6px ${getGlowColor(CYBERPUNK_COLORS.accentYellow, 0.5)}`,
                  }}
                />
              </div>
              <span
                className="text-xs font-mono"
                style={{ color: CYBERPUNK_COLORS.textSecondary }}
              >
                {completedTasks}/{totalTasks}
              </span>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default TemplateInfoBadge;
