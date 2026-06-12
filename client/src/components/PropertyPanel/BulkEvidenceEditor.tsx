import React, { useMemo, useState, useCallback } from 'react';
import { Layers, Tag, FileText, AlertTriangle, Check, X, Plus, Loader2, Shield, ShieldCheck } from 'lucide-react';
import { NeonInput } from '@/components/ui/NeonInput';
import { NeonButton } from '@/components/ui/NeonButton';
import { TagEditor } from './TagEditor';
import { useEvidenceStore } from '@/store/useEvidenceStore';
import { useCanvasStore } from '@/store/useCanvasStore';
import { useUiStore } from '@/store/useUiStore';
import { useCollaboratorStore } from '@/store/useCollaboratorStore';
import { CYBERPUNK_COLORS, getGlowColor, IMPORTANCE_COLORS, SOURCE_CREDIBILITY_COLORS, SOURCE_CREDIBILITY_LABELS, VERIFICATION_STATUS_COLORS, VERIFICATION_STATUS_LABELS } from '@/utils/colorUtils';
import { recordAuditLog } from '@/utils/auditHelper';
import type { Evidence, UpdateEvidenceDto, ImportanceLevel, EvidenceSourceCredibility, EvidenceVerificationStatus } from '@/types';

interface BulkEvidenceEditorProps {
  evidenceIds: string[];
}

type TagOperation = 'replace' | 'add' | 'remove';
type FieldChangeType = 'none' | 'set';

const importanceOptions: Array<{ value: ImportanceLevel; label: string }> = [
  { value: 'low', label: '低' },
  { value: 'normal', label: '中' },
  { value: 'high', label: '高' },
  { value: 'critical', label: '紧急' },
];

const credibilityOptions: Array<{ value: EvidenceSourceCredibility; label: string }> = [
  { value: 'very_low', label: '极低' },
  { value: 'low', label: '低' },
  { value: 'medium', label: '中' },
  { value: 'high', label: '高' },
  { value: 'very_high', label: '极高' },
];

const verificationOptions: Array<{ value: EvidenceVerificationStatus; label: string }> = [
  { value: 'unverified', label: '未核验' },
  { value: 'pending', label: '核验中' },
  { value: 'verified', label: '已核验' },
  { value: 'failed', label: '核验失败' },
  { value: 'disputed', label: '有争议' },
];

export const BulkEvidenceEditor: React.FC<BulkEvidenceEditorProps> = ({ evidenceIds }) => {
  const bulkUpdateEvidence = useEvidenceStore((state) => state.bulkUpdateEvidence);
  const evidence = useEvidenceStore((state) => state.evidence);
  const clearSelection = useCanvasStore((state) => state.clearSelection);
  const currentCollaboratorId = useUiStore((state) => state.currentCollaboratorId);
  const collaborators = useCollaboratorStore((state) => state.collaborators);
  const currentCollaborator = useMemo(() => {
    return collaborators.find((c) => c.id === currentCollaboratorId);
  }, [collaborators, currentCollaboratorId]);

  const selectedEvidence = useMemo(() => {
    return evidenceIds
      .map((id) => evidence[id])
      .filter((e): e is Evidence => e !== undefined);
  }, [evidenceIds, evidence]);

  const [sourceChangeType, setSourceChangeType] = useState<FieldChangeType>('none');
  const [sourceValue, setSourceValue] = useState('');

  const [importanceChangeType, setImportanceChangeType] = useState<FieldChangeType>('none');
  const [importanceValue, setImportanceValue] = useState<ImportanceLevel>('normal');

  const [credibilityChangeType, setCredibilityChangeType] = useState<FieldChangeType>('none');
  const [credibilityValue, setCredibilityValue] = useState<EvidenceSourceCredibility>('medium');

  const [verificationChangeType, setVerificationChangeType] = useState<FieldChangeType>('none');
  const [verificationValue, setVerificationValue] = useState<EvidenceVerificationStatus>('unverified');

  const [tagOperation, setTagOperation] = useState<TagOperation>('add');
  const [tagValue, setTagValue] = useState<string[]>([]);

  const [isApplying, setIsApplying] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  const summary = useMemo(() => {
    const sources = new Set<string>();
    const importances = new Set<ImportanceLevel>();
    const credibilities = new Set<EvidenceSourceCredibility>();
    const verifications = new Set<EvidenceVerificationStatus>();
    const allTags = new Set<string>();

    selectedEvidence.forEach((e) => {
      if (e.source) sources.add(e.source);
      importances.add(e.importance);
      credibilities.add(e.sourceCredibility);
      verifications.add(e.verificationStatus);
      e.tags.forEach((t) => allTags.add(t));
    });

    return {
      count: selectedEvidence.length,
      sources: Array.from(sources),
      importances: Array.from(importances),
      credibilities: Array.from(credibilities),
      verifications: Array.from(verifications),
      allTags: Array.from(allTags),
    };
  }, [selectedEvidence]);

  const handleApply = useCallback(async () => {
    if (selectedEvidence.length === 0) return;

    const hasChanges =
      sourceChangeType !== 'none' ||
      importanceChangeType !== 'none' ||
      credibilityChangeType !== 'none' ||
      verificationChangeType !== 'none' ||
      (tagValue.length > 0 && tagOperation !== 'replace' ? true : tagOperation === 'replace');

    if (!hasChanges) {
      setResult({ success: false, message: '请至少选择一项要修改的内容' });
      return;
    }

    setIsApplying(true);
    setResult(null);

    try {
      const updates: Array<{ id: string; data: UpdateEvidenceDto }> = [];

      for (const ev of selectedEvidence) {
        const data: UpdateEvidenceDto = {};

        if (sourceChangeType === 'set') {
          data.source = sourceValue;
        }

        if (importanceChangeType === 'set') {
          data.importance = importanceValue;
        }

        if (credibilityChangeType === 'set') {
          data.sourceCredibility = credibilityValue;
        }

        if (verificationChangeType === 'set') {
          data.verificationStatus = verificationValue;
        }

        if (tagOperation === 'replace') {
          data.tags = [...tagValue];
        } else if (tagOperation === 'add' && tagValue.length > 0) {
          const newTags = new Set(ev.tags);
          tagValue.forEach((t) => newTags.add(t));
          data.tags = Array.from(newTags);
        } else if (tagOperation === 'remove' && tagValue.length > 0) {
          data.tags = ev.tags.filter((t) => !tagValue.includes(t));
        }

        if (Object.keys(data).length > 0) {
          updates.push({ id: ev.id, data });
        }
      }

      if (updates.length === 0) {
        setResult({ success: false, message: '没有需要更新的内容' });
        setIsApplying(false);
        return;
      }

      await bulkUpdateEvidence(
        updates,
        currentCollaboratorId ?? undefined,
        currentCollaborator?.name
      );

      const changeDetails: string[] = [];
      if (sourceChangeType === 'set') changeDetails.push(`来源→${sourceValue || '(空)'}`);
      if (importanceChangeType === 'set') {
        const impLabel = importanceOptions.find((o) => o.value === importanceValue)?.label;
        changeDetails.push(`重要性→${impLabel}`);
      }
      if (credibilityChangeType === 'set') {
        const credLabel = credibilityOptions.find((o) => o.value === credibilityValue)?.label;
        changeDetails.push(`可信度→${credLabel}`);
      }
      if (verificationChangeType === 'set') {
        const verLabel = verificationOptions.find((o) => o.value === verificationValue)?.label;
        changeDetails.push(`核验状态→${verLabel}`);
      }
      if (tagValue.length > 0) {
        const opLabel = tagOperation === 'replace' ? '替换标签' : tagOperation === 'add' ? '添加标签' : '移除标签';
        changeDetails.push(`${opLabel} [${tagValue.join(', ')}]`);
      }

      recordAuditLog(
        'update_evidence',
        'evidence',
        selectedEvidence[0].id,
        `批量更新 ${updates.length} 条证据: ${changeDetails.join('; ')}`
      );

      setResult({
        success: true,
        message: `成功更新 ${updates.length} 条证据`,
      });

      setSourceChangeType('none');
      setSourceValue('');
      setImportanceChangeType('none');
      setCredibilityChangeType('none');
      setVerificationChangeType('none');
      setTagOperation('add');
      setTagValue([]);
    } catch (error) {
      setResult({
        success: false,
        message: error instanceof Error ? error.message : '更新失败',
      });
    } finally {
      setIsApplying(false);
    }
  }, [
    selectedEvidence,
    sourceChangeType,
    sourceValue,
    importanceChangeType,
    importanceValue,
    credibilityChangeType,
    credibilityValue,
    verificationChangeType,
    verificationValue,
    tagOperation,
    tagValue,
    bulkUpdateEvidence,
    currentCollaboratorId,
    currentCollaborator,
  ]);

  const handleTagsChange = useCallback((tags: string[]) => {
    setTagValue(tags);
  }, []);

  return (
    <div className="space-y-5">
      <div
        className="p-3 rounded-sm border"
        style={{
          borderColor: CYBERPUNK_COLORS.accentCyan,
          backgroundColor: getGlowColor(CYBERPUNK_COLORS.accentCyan, 0.08),
        }}
      >
        <div className="flex items-center gap-2 mb-2">
          <Layers
            size={16}
            style={{
              color: CYBERPUNK_COLORS.accentCyan,
              filter: `drop-shadow(0 0 4px ${getGlowColor(CYBERPUNK_COLORS.accentCyan, 0.6)})`,
            }}
          />
          <span
            className="font-mono text-sm uppercase tracking-wider"
            style={{
              color: CYBERPUNK_COLORS.accentCyan,
              textShadow: `0 0 6px ${getGlowColor(CYBERPUNK_COLORS.accentCyan, 0.4)}`,
            }}
          >
            批量编辑模式
          </span>
        </div>
        <div
          className="text-xs font-mono"
          style={{ color: CYBERPUNK_COLORS.textSecondary }}
        >
          已选择 <span style={{ color: CYBERPUNK_COLORS.accentCyan }}>{summary.count}</span> 条证据
        </div>
      </div>

      <div
        className="p-3 rounded-sm border text-xs font-mono space-y-2"
        style={{
          borderColor: CYBERPUNK_COLORS.borderColor,
          backgroundColor: CYBERPUNK_COLORS.bgTertiary,
        }}
      >
        <div className="flex items-start gap-2">
          <FileText size={12} style={{ color: CYBERPUNK_COLORS.textSecondary, marginTop: 2 }} />
          <div>
            <span style={{ color: CYBERPUNK_COLORS.textSecondary }}>来源: </span>
            <span style={{ color: CYBERPUNK_COLORS.textPrimary }}>
              {summary.sources.length === 0 ? '(无)' : summary.sources.length === 1 ? summary.sources[0] : `${summary.sources[0]} 等 ${summary.sources.length} 种`}
            </span>
          </div>
        </div>
        <div className="flex items-start gap-2">
          <AlertTriangle size={12} style={{ color: CYBERPUNK_COLORS.textSecondary, marginTop: 2 }} />
          <div>
            <span style={{ color: CYBERPUNK_COLORS.textSecondary }}>重要性: </span>
            <span style={{ color: CYBERPUNK_COLORS.textPrimary }}>
              {summary.importances.length === 1
                ? importanceOptions.find((o) => o.value === summary.importances[0])?.label
                : `${summary.importances.length} 种混合`}
            </span>
          </div>
        </div>
        <div className="flex items-start gap-2">
          <Shield size={12} style={{ color: CYBERPUNK_COLORS.textSecondary, marginTop: 2 }} />
          <div>
            <span style={{ color: CYBERPUNK_COLORS.textSecondary }}>可信度: </span>
            <span style={{ color: CYBERPUNK_COLORS.textPrimary }}>
              {summary.credibilities.length === 1
                ? SOURCE_CREDIBILITY_LABELS[summary.credibilities[0]]
                : `${summary.credibilities.length} 种混合`}
            </span>
          </div>
        </div>
        <div className="flex items-start gap-2">
          <ShieldCheck size={12} style={{ color: CYBERPUNK_COLORS.textSecondary, marginTop: 2 }} />
          <div>
            <span style={{ color: CYBERPUNK_COLORS.textSecondary }}>核验状态: </span>
            <span style={{ color: CYBERPUNK_COLORS.textPrimary }}>
              {summary.verifications.length === 1
                ? VERIFICATION_STATUS_LABELS[summary.verifications[0]]
                : `${summary.verifications.length} 种混合`}
            </span>
          </div>
        </div>
        <div className="flex items-start gap-2">
          <Tag size={12} style={{ color: CYBERPUNK_COLORS.textSecondary, marginTop: 2 }} />
          <div>
            <span style={{ color: CYBERPUNK_COLORS.textSecondary }}>标签: </span>
            <span style={{ color: CYBERPUNK_COLORS.textPrimary }}>
              {summary.allTags.length === 0 ? '(无)' : `${summary.allTags.length} 个`}
            </span>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label
            className="text-xs font-mono uppercase tracking-wider flex items-center gap-2"
            style={{ color: CYBERPUNK_COLORS.textSecondary }}
          >
            <FileText size={14} />
            来源
          </label>
          <div className="flex gap-1">
            <button
              className={`px-2 py-0.5 text-xs font-mono rounded-sm border transition-all ${
                sourceChangeType === 'none' ? 'opacity-100' : 'opacity-50'
              }`}
              style={{
                borderColor: sourceChangeType === 'none' ? CYBERPUNK_COLORS.accentCyan : CYBERPUNK_COLORS.borderColor,
                color: sourceChangeType === 'none' ? CYBERPUNK_COLORS.accentCyan : CYBERPUNK_COLORS.textSecondary,
                backgroundColor: sourceChangeType === 'none' ? getGlowColor(CYBERPUNK_COLORS.accentCyan, 0.1) : 'transparent',
              }}
              onClick={() => setSourceChangeType('none')}
            >
              不改
            </button>
            <button
              className={`px-2 py-0.5 text-xs font-mono rounded-sm border transition-all ${
                sourceChangeType === 'set' ? 'opacity-100' : 'opacity-50'
              }`}
              style={{
                borderColor: sourceChangeType === 'set' ? CYBERPUNK_COLORS.accentGreen : CYBERPUNK_COLORS.borderColor,
                color: sourceChangeType === 'set' ? CYBERPUNK_COLORS.accentGreen : CYBERPUNK_COLORS.textSecondary,
                backgroundColor: sourceChangeType === 'set' ? getGlowColor(CYBERPUNK_COLORS.accentGreen, 0.1) : 'transparent',
              }}
              onClick={() => setSourceChangeType('set')}
            >
              设置
            </button>
          </div>
        </div>
        {sourceChangeType === 'set' && (
          <NeonInput
            placeholder="输入新的来源..."
            value={sourceValue}
            onChange={(e) => setSourceValue(e.target.value)}
          />
        )}
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label
            className="text-xs font-mono uppercase tracking-wider flex items-center gap-2"
            style={{ color: CYBERPUNK_COLORS.textSecondary }}
          >
            <AlertTriangle size={14} />
            重要级别
          </label>
          <div className="flex gap-1">
            <button
              className={`px-2 py-0.5 text-xs font-mono rounded-sm border transition-all ${
                importanceChangeType === 'none' ? 'opacity-100' : 'opacity-50'
              }`}
              style={{
                borderColor: importanceChangeType === 'none' ? CYBERPUNK_COLORS.accentCyan : CYBERPUNK_COLORS.borderColor,
                color: importanceChangeType === 'none' ? CYBERPUNK_COLORS.accentCyan : CYBERPUNK_COLORS.textSecondary,
                backgroundColor: importanceChangeType === 'none' ? getGlowColor(CYBERPUNK_COLORS.accentCyan, 0.1) : 'transparent',
              }}
              onClick={() => setImportanceChangeType('none')}
            >
              不改
            </button>
            <button
              className={`px-2 py-0.5 text-xs font-mono rounded-sm border transition-all ${
                importanceChangeType === 'set' ? 'opacity-100' : 'opacity-50'
              }`}
              style={{
                borderColor: importanceChangeType === 'set' ? CYBERPUNK_COLORS.accentGreen : CYBERPUNK_COLORS.borderColor,
                color: importanceChangeType === 'set' ? CYBERPUNK_COLORS.accentGreen : CYBERPUNK_COLORS.textSecondary,
                backgroundColor: importanceChangeType === 'set' ? getGlowColor(CYBERPUNK_COLORS.accentGreen, 0.1) : 'transparent',
              }}
              onClick={() => setImportanceChangeType('set')}
            >
              设置
            </button>
          </div>
        </div>
        {importanceChangeType === 'set' && (
          <div className="flex gap-2">
            {importanceOptions.map((option) => {
              const isActive = importanceValue === option.value;
              const color = IMPORTANCE_COLORS[option.value];
              return (
                <button
                  key={option.value}
                  className="flex-1 px-3 py-2 text-xs font-mono uppercase border rounded-sm transition-all"
                  style={{
                    borderColor: isActive ? color : CYBERPUNK_COLORS.borderColor,
                    color: isActive ? color : CYBERPUNK_COLORS.textSecondary,
                    backgroundColor: isActive ? getGlowColor(color, 0.1) : 'transparent',
                    boxShadow: isActive ? `0 0 10px ${getGlowColor(color, 0.4)}` : 'none',
                  }}
                  onClick={() => setImportanceValue(option.value)}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label
            className="text-xs font-mono uppercase tracking-wider flex items-center gap-2"
            style={{ color: CYBERPUNK_COLORS.textSecondary }}
          >
            <Shield size={14} />
            来源可信度
          </label>
          <div className="flex gap-1">
            <button
              className={`px-2 py-0.5 text-xs font-mono rounded-sm border transition-all ${
                credibilityChangeType === 'none' ? 'opacity-100' : 'opacity-50'
              }`}
              style={{
                borderColor: credibilityChangeType === 'none' ? CYBERPUNK_COLORS.accentCyan : CYBERPUNK_COLORS.borderColor,
                color: credibilityChangeType === 'none' ? CYBERPUNK_COLORS.accentCyan : CYBERPUNK_COLORS.textSecondary,
                backgroundColor: credibilityChangeType === 'none' ? getGlowColor(CYBERPUNK_COLORS.accentCyan, 0.1) : 'transparent',
              }}
              onClick={() => setCredibilityChangeType('none')}
            >
              不改
            </button>
            <button
              className={`px-2 py-0.5 text-xs font-mono rounded-sm border transition-all ${
                credibilityChangeType === 'set' ? 'opacity-100' : 'opacity-50'
              }`}
              style={{
                borderColor: credibilityChangeType === 'set' ? CYBERPUNK_COLORS.accentGreen : CYBERPUNK_COLORS.borderColor,
                color: credibilityChangeType === 'set' ? CYBERPUNK_COLORS.accentGreen : CYBERPUNK_COLORS.textSecondary,
                backgroundColor: credibilityChangeType === 'set' ? getGlowColor(CYBERPUNK_COLORS.accentGreen, 0.1) : 'transparent',
              }}
              onClick={() => setCredibilityChangeType('set')}
            >
              设置
            </button>
          </div>
        </div>
        {credibilityChangeType === 'set' && (
          <div className="flex gap-2">
            {credibilityOptions.map((option) => {
              const isActive = credibilityValue === option.value;
              const color = SOURCE_CREDIBILITY_COLORS[option.value];
              return (
                <button
                  key={option.value}
                  className="flex-1 px-2 py-2 text-xs font-mono border rounded-sm transition-all"
                  style={{
                    borderColor: isActive ? color : CYBERPUNK_COLORS.borderColor,
                    color: isActive ? color : CYBERPUNK_COLORS.textSecondary,
                    backgroundColor: isActive ? getGlowColor(color, 0.1) : 'transparent',
                    boxShadow: isActive ? `0 0 10px ${getGlowColor(color, 0.4)}` : 'none',
                  }}
                  onClick={() => setCredibilityValue(option.value)}
                  title={SOURCE_CREDIBILITY_LABELS[option.value]}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label
            className="text-xs font-mono uppercase tracking-wider flex items-center gap-2"
            style={{ color: CYBERPUNK_COLORS.textSecondary }}
          >
            <ShieldCheck size={14} />
            核验状态
          </label>
          <div className="flex gap-1">
            <button
              className={`px-2 py-0.5 text-xs font-mono rounded-sm border transition-all ${
                verificationChangeType === 'none' ? 'opacity-100' : 'opacity-50'
              }`}
              style={{
                borderColor: verificationChangeType === 'none' ? CYBERPUNK_COLORS.accentCyan : CYBERPUNK_COLORS.borderColor,
                color: verificationChangeType === 'none' ? CYBERPUNK_COLORS.accentCyan : CYBERPUNK_COLORS.textSecondary,
                backgroundColor: verificationChangeType === 'none' ? getGlowColor(CYBERPUNK_COLORS.accentCyan, 0.1) : 'transparent',
              }}
              onClick={() => setVerificationChangeType('none')}
            >
              不改
            </button>
            <button
              className={`px-2 py-0.5 text-xs font-mono rounded-sm border transition-all ${
                verificationChangeType === 'set' ? 'opacity-100' : 'opacity-50'
              }`}
              style={{
                borderColor: verificationChangeType === 'set' ? CYBERPUNK_COLORS.accentGreen : CYBERPUNK_COLORS.borderColor,
                color: verificationChangeType === 'set' ? CYBERPUNK_COLORS.accentGreen : CYBERPUNK_COLORS.textSecondary,
                backgroundColor: verificationChangeType === 'set' ? getGlowColor(CYBERPUNK_COLORS.accentGreen, 0.1) : 'transparent',
              }}
              onClick={() => setVerificationChangeType('set')}
            >
              设置
            </button>
          </div>
        </div>
        {verificationChangeType === 'set' && (
          <div className="flex flex-wrap gap-2">
            {verificationOptions.map((option) => {
              const isActive = verificationValue === option.value;
              const color = VERIFICATION_STATUS_COLORS[option.value];
              return (
                <button
                  key={option.value}
                  className="flex-1 px-2 py-2 text-xs font-mono border rounded-sm transition-all min-w-[70px]"
                  style={{
                    borderColor: isActive ? color : CYBERPUNK_COLORS.borderColor,
                    color: isActive ? color : CYBERPUNK_COLORS.textSecondary,
                    backgroundColor: isActive ? getGlowColor(color, 0.1) : 'transparent',
                    boxShadow: isActive ? `0 0 10px ${getGlowColor(color, 0.4)}` : 'none',
                  }}
                  onClick={() => setVerificationValue(option.value)}
                  title={VERIFICATION_STATUS_LABELS[option.value]}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label
            className="text-xs font-mono uppercase tracking-wider flex items-center gap-2"
            style={{ color: CYBERPUNK_COLORS.textSecondary }}
          >
            <Tag size={14} />
            标签操作
          </label>
        </div>
        <div className="flex gap-1">
          {([
            { value: 'add' as TagOperation, label: '添加' },
            { value: 'remove' as TagOperation, label: '移除' },
            { value: 'replace' as TagOperation, label: '替换' },
          ]).map((op) => {
            const isActive = tagOperation === op.value;
            return (
              <button
                key={op.value}
                className="flex-1 px-2 py-1.5 text-xs font-mono border rounded-sm transition-all"
                style={{
                  borderColor: isActive ? CYBERPUNK_COLORS.accentPurple : CYBERPUNK_COLORS.borderColor,
                  color: isActive ? CYBERPUNK_COLORS.accentPurple : CYBERPUNK_COLORS.textSecondary,
                  backgroundColor: isActive ? getGlowColor(CYBERPUNK_COLORS.accentPurple, 0.1) : 'transparent',
                  boxShadow: isActive ? `0 0 10px ${getGlowColor(CYBERPUNK_COLORS.accentPurple, 0.4)}` : 'none',
                }}
                onClick={() => setTagOperation(op.value)}
              >
                {op.label}
              </button>
            );
          })}
        </div>
        <TagEditor tags={tagValue} onTagsChange={handleTagsChange} />
        {tagOperation === 'replace' && tagValue.length === 0 && (
          <div
            className="text-xs font-mono flex items-center gap-1"
            style={{ color: CYBERPUNK_COLORS.accentYellow }}
          >
            <AlertTriangle size={12} />
            替换模式下，空标签将清除所有证据的标签
          </div>
        )}
      </div>

      {result && (
        <div
          className={`p-3 rounded-sm border text-xs font-mono flex items-center gap-2`}
          style={{
            borderColor: result.success ? CYBERPUNK_COLORS.accentGreen : CYBERPUNK_COLORS.accentRed,
            backgroundColor: getGlowColor(
              result.success ? CYBERPUNK_COLORS.accentGreen : CYBERPUNK_COLORS.accentRed,
              0.1
            ),
            color: result.success ? CYBERPUNK_COLORS.accentGreen : CYBERPUNK_COLORS.accentRed,
          }}
        >
          {result.success ? <Check size={14} /> : <X size={14} />}
          {result.message}
        </div>
      )}

      <div className="space-y-2 pt-4 border-t" style={{ borderColor: CYBERPUNK_COLORS.borderColor }}>
        <NeonButton
          variant="success"
          icon={isApplying ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
          onClick={handleApply}
          disabled={isApplying || selectedEvidence.length === 0}
          className="w-full"
        >
          {isApplying ? '应用中...' : '应用批量修改'}
        </NeonButton>
        <NeonButton
          variant="secondary"
          onClick={clearSelection}
          disabled={isApplying}
          className="w-full"
        >
          取消选择，退出批量模式
        </NeonButton>
      </div>

      <div
        className="text-xs font-mono p-2 rounded-sm border"
        style={{
          borderColor: CYBERPUNK_COLORS.borderColor,
          color: CYBERPUNK_COLORS.textSecondary,
          backgroundColor: CYBERPUNK_COLORS.bgTertiary,
        }}
      >
        <div className="mb-1">提示：</div>
        <div>• 按住 Ctrl/Cmd 点击可多选证据</div>
        <div>• 修改后关系线和属性面板会自动刷新</div>
      </div>
    </div>
  );
};

export default BulkEvidenceEditor;
