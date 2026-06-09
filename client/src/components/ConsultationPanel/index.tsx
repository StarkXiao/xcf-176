import React, { useEffect, useMemo, useState } from 'react';
import {
  MessageSquare,
  X,
  Plus,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Send,
  Gavel,
  Flag,
  ArrowLeft,
  Trash2,
  Link2,
} from 'lucide-react';
import { NeonInput } from '@/components/ui/NeonInput';
import { NeonButton } from '@/components/ui/NeonButton';
import { useCaseStore } from '@/store/useCaseStore';
import { useConsultationStore } from '@/store/useConsultationStore';
import { useCollaboratorStore } from '@/store/useCollaboratorStore';
import { useUiStore } from '@/store/useUiStore';
import { useEvidenceStore } from '@/store/useEvidenceStore';
import { CYBERPUNK_COLORS, getGlowColor } from '@/utils/colorUtils';
import { recordAuditLog } from '@/utils/auditHelper';
import type {
  Consultation,
  ConsultationStatus,
  ConsultationDiscussion,
  ConsultationConclusion,
  ConsultationDispute,
  ConsultationWithDetails,
} from '@/types';

const STATUS_LABELS: Record<ConsultationStatus, string> = {
  open: '待讨论',
  in_progress: '讨论中',
  concluded: '已结案',
  cancelled: '已取消',
};

const STATUS_COLORS: Record<ConsultationStatus, string> = {
  open: CYBERPUNK_COLORS.accentCyan,
  in_progress: CYBERPUNK_COLORS.accentYellow,
  concluded: CYBERPUNK_COLORS.accentGreen,
  cancelled: CYBERPUNK_COLORS.textSecondary,
};

type TabType = 'discussions' | 'conclusions' | 'disputes';

export const ConsultationPanel: React.FC = () => {
  const currentCase = useCaseStore((s) => s.currentCase);
  const consultations = useConsultationStore((s) => s.consultations);
  const currentConsultation = useConsultationStore((s) => s.currentConsultation);
  const loadConsultations = useConsultationStore((s) => s.loadConsultations);
  const loadConsultationDetails = useConsultationStore((s) => s.loadConsultationDetails);
  const createConsultation = useConsultationStore((s) => s.createConsultation);
  const deleteConsultation = useConsultationStore((s) => s.deleteConsultation);
  const addDiscussion = useConsultationStore((s) => s.addDiscussion);
  const addConclusion = useConsultationStore((s) => s.addConclusion);
  const addDispute = useConsultationStore((s) => s.addDispute);
  const resolveDispute = useConsultationStore((s) => s.resolveDispute);
  const setCurrentConsultation = useConsultationStore((s) => s.setCurrentConsultation);
  const toggleConsultationPanel = useUiStore((s) => s.toggleConsultationPanel);
  const collaborators = useCollaboratorStore((s) => s.collaborators);
  const currentCollaboratorId = useUiStore((s) => s.currentCollaboratorId);
  const evidenceList = useEvidenceStore((s) => s.getEvidenceArray());

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [selectedEvidenceIds, setSelectedEvidenceIds] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<TabType>('discussions');
  const [discussionText, setDiscussionText] = useState('');
  const [selectedDiscussionEvidence, setSelectedDiscussionEvidence] = useState<string>('');
  const [conclusionText, setConclusionText] = useState('');
  const [disputeDescription, setDisputeDescription] = useState('');
  const [disputeDiscussionId, setDisputeDiscussionId] = useState('');
  const [resolutionText, setResolutionText] = useState('');
  const [resolvingDisputeId, setResolvingDisputeId] = useState<string | null>(null);
  const [expandedDisputeId, setExpandedDisputeId] = useState<string | null>(null);

  useEffect(() => {
    if (currentCase) {
      loadConsultations(currentCase.id);
    }
  }, [currentCase, loadConsultations]);

  const currentCollaborator = useMemo(() => {
    return collaborators.find((c) => c.id === currentCollaboratorId);
  }, [collaborators, currentCollaboratorId]);

  const handleCreate = async () => {
    if (!newTitle.trim() || !currentCase || !currentCollaboratorId) return;
    const result = await createConsultation({
      caseId: currentCase.id,
      title: newTitle.trim(),
      description: newDesc.trim(),
      initiatedBy: currentCollaboratorId,
      evidenceIds: selectedEvidenceIds,
    });
    if (result) {
      await recordAuditLog('create_consultation', 'case', result.id, `发起会商: ${result.title}`);
      setNewTitle('');
      setNewDesc('');
      setSelectedEvidenceIds([]);
      setShowCreateForm(false);
    }
  };

  const handleDelete = async (c: Consultation) => {
    await deleteConsultation(c.id);
  };

  const handleOpenConsultation = async (id: string) => {
    await loadConsultationDetails(id);
    setActiveTab('discussions');
  };

  const handleBackToList = () => {
    setCurrentConsultation(null);
  };

  const handleAddDiscussion = async () => {
    if (!discussionText.trim() || !currentConsultation || !currentCollaboratorId) return;
    await addDiscussion(currentConsultation.id, {
      collaboratorId: currentCollaboratorId,
      collaboratorName: currentCollaborator?.name ?? '',
      evidenceId: selectedDiscussionEvidence || undefined,
      content: discussionText.trim(),
      isDispute: false,
    });
    await recordAuditLog('add_discussion', 'case', currentConsultation.id, `添加讨论: ${discussionText.trim().slice(0, 30)}`);
    setDiscussionText('');
    setSelectedDiscussionEvidence('');
  };

  const handleAddConclusion = async () => {
    if (!conclusionText.trim() || !currentConsultation || !currentCollaboratorId) return;
    await addConclusion(currentConsultation.id, {
      content: conclusionText.trim(),
      decidedBy: currentCollaboratorId,
      decidedByName: currentCollaborator?.name ?? '',
    });
    await recordAuditLog('add_conclusion', 'case', currentConsultation.id, `形成结论: ${conclusionText.trim().slice(0, 30)}`);
    setConclusionText('');
  };

  const handleRaiseDispute = async () => {
    if (!disputeDescription.trim() || !currentConsultation || !currentCollaboratorId || !disputeDiscussionId) return;
    await addDispute(currentConsultation.id, {
      discussionId: disputeDiscussionId,
      description: disputeDescription.trim(),
      raisedBy: currentCollaboratorId,
      raisedByName: currentCollaborator?.name ?? '',
    });
    await recordAuditLog('raise_dispute', 'case', currentConsultation.id, `提出争议: ${disputeDescription.trim().slice(0, 30)}`);
    setDisputeDescription('');
    setDisputeDiscussionId('');
  };

  const handleResolveDispute = async (disputeId: string) => {
    if (!resolutionText.trim() || !currentConsultation || !currentCollaboratorId) return;
    await resolveDispute(currentConsultation.id, disputeId, {
      resolution: resolutionText.trim(),
      resolvedBy: currentCollaboratorId,
      resolvedByName: currentCollaborator?.name ?? '',
    });
    await recordAuditLog('resolve_dispute', 'case', disputeId, `解决争议: ${resolutionText.trim().slice(0, 30)}`);
    setResolutionText('');
    setResolvingDisputeId(null);
  };

  const formatTimestamp = (ts: string) => {
    const d = new Date(ts);
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const hh = String(d.getHours()).padStart(2, '0');
    const mi = String(d.getMinutes()).padStart(2, '0');
    return `${mm}-${dd} ${hh}:${mi}`;
  };

  const getEvidenceLabel = (evidenceId: string) => {
    const ev = evidenceList.find((e) => e.id === evidenceId);
    return ev ? ev.content.slice(0, 30) + '...' : evidenceId;
  };

  const toggleEvidenceSelection = (id: string) => {
    setSelectedEvidenceIds((prev) =>
      prev.includes(id) ? prev.filter((eid) => eid !== id) : [...prev, id]
    );
  };

  const renderConsultationList = () => (
    <div className="flex-1 overflow-y-auto p-3 space-y-2">
      {consultations.length === 0 && (
        <div className="text-xs font-mono text-center py-4" style={{ color: CYBERPUNK_COLORS.textSecondary }}>
          暂无会商记录
        </div>
      )}
      {consultations.map((c) => {
        const statusColor = STATUS_COLORS[c.status];
        return (
          <div
            key={c.id}
            className="rounded-sm border overflow-hidden cursor-pointer transition-all"
            style={{
              borderColor: CYBERPUNK_COLORS.borderColor,
              backgroundColor: CYBERPUNK_COLORS.bgTertiary,
            }}
            onClick={() => handleOpenConsultation(c.id)}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = CYBERPUNK_COLORS.accentCyan;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = CYBERPUNK_COLORS.borderColor;
            }}
          >
            <div className="flex">
              <div
                className="w-1 flex-shrink-0"
                style={{
                  backgroundColor: statusColor,
                  boxShadow: `0 0 6px ${getGlowColor(statusColor, 0.4)}`,
                }}
              />
              <div className="flex-1 p-2.5">
                <div className="flex items-center gap-2 mb-1">
                  <span
                    className="text-xs font-mono px-1.5 py-0.5 rounded-sm"
                    style={{
                      backgroundColor: getGlowColor(statusColor, 0.15),
                      color: statusColor,
                      border: `1px solid ${getGlowColor(statusColor, 0.3)}`,
                    }}
                  >
                    {STATUS_LABELS[c.status]}
                  </span>
                  <span
                    className="text-xs font-mono truncate flex-1"
                    style={{ color: CYBERPUNK_COLORS.textPrimary }}
                  >
                    {c.title}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono" style={{ color: CYBERPUNK_COLORS.textSecondary }}>
                    {c.evidenceIds.length} 条证据 · {c.keyClues.length} 条线索
                  </span>
                  <div className="flex items-center gap-1">
                    <span className="text-xs font-mono" style={{ color: CYBERPUNK_COLORS.textSecondary }}>
                      {formatTimestamp(c.createdAt)}
                    </span>
                    <button
                      className="p-0.5 transition-colors"
                      style={{ color: CYBERPUNK_COLORS.textSecondary }}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(c);
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.color = CYBERPUNK_COLORS.accentRed; }}
                      onMouseLeave={(e) => { e.currentTarget.style.color = CYBERPUNK_COLORS.textSecondary; }}
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
                {c.keyClues.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {c.keyClues.slice(0, 3).map((clue, idx) => (
                      <span
                        key={idx}
                        className="text-xs font-mono px-1 py-0 rounded-sm"
                        style={{
                          backgroundColor: getGlowColor(CYBERPUNK_COLORS.accentYellow, 0.1),
                          color: CYBERPUNK_COLORS.accentYellow,
                          border: `1px solid ${getGlowColor(CYBERPUNK_COLORS.accentYellow, 0.2)}`,
                        }}
                      >
                        {clue}
                      </span>
                    ))}
                    {c.keyClues.length > 3 && (
                      <span className="text-xs font-mono" style={{ color: CYBERPUNK_COLORS.textSecondary }}>
                        +{c.keyClues.length - 3}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );

  const renderCreateForm = () => (
    <div
      className="p-3 space-y-2 border-b"
      style={{ borderColor: CYBERPUNK_COLORS.borderColor, backgroundColor: CYBERPUNK_COLORS.bgTertiary }}
    >
      <NeonInput
        placeholder="会商标题"
        value={newTitle}
        onChange={(e) => setNewTitle(e.target.value)}
      />
      <NeonInput
        placeholder="会商描述（可选）"
        value={newDesc}
        onChange={(e) => setNewDesc(e.target.value)}
      />
      {evidenceList.length > 0 && (
        <div className="space-y-1">
          <div className="text-xs font-mono" style={{ color: CYBERPUNK_COLORS.textSecondary }}>
            <Link2 size={10} className="inline mr-1" />关联证据卡片
          </div>
          <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto">
            {evidenceList.map((ev) => (
              <button
                key={ev.id}
                className="text-xs font-mono px-1.5 py-0.5 rounded-sm border transition-all"
                style={{
                  borderColor: selectedEvidenceIds.includes(ev.id) ? CYBERPUNK_COLORS.accentCyan : CYBERPUNK_COLORS.borderColor,
                  color: selectedEvidenceIds.includes(ev.id) ? CYBERPUNK_COLORS.accentCyan : CYBERPUNK_COLORS.textSecondary,
                  backgroundColor: selectedEvidenceIds.includes(ev.id) ? getGlowColor(CYBERPUNK_COLORS.accentCyan, 0.1) : 'transparent',
                }}
                onClick={() => toggleEvidenceSelection(ev.id)}
              >
                {ev.content.slice(0, 16)}...
              </button>
            ))}
          </div>
        </div>
      )}
      <div className="flex gap-2">
        <NeonButton size="sm" variant="primary" icon={<Plus size={14} />} onClick={handleCreate}>
          发起会商
        </NeonButton>
        <NeonButton
          size="sm"
          variant="secondary"
          onClick={() => {
            setShowCreateForm(false);
            setNewTitle('');
            setNewDesc('');
            setSelectedEvidenceIds([]);
          }}
        >
          取消
        </NeonButton>
      </div>
    </div>
  );

  const renderDiscussionItem = (d: ConsultationDiscussion) => (
    <div
      key={d.id}
      className="rounded-sm border overflow-hidden"
      style={{
        borderColor: d.isDispute ? getGlowColor(CYBERPUNK_COLORS.accentRed, 0.3) : CYBERPUNK_COLORS.borderColor,
        backgroundColor: CYBERPUNK_COLORS.bgTertiary,
      }}
    >
      <div className="flex">
        <div
          className="w-1 flex-shrink-0"
          style={{
            backgroundColor: d.isDispute ? CYBERPUNK_COLORS.accentRed : CYBERPUNK_COLORS.accentCyan,
          }}
        />
        <div className="flex-1 p-2.5">
          <div className="flex items-center gap-2 mb-1">
            <div
              className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-mono font-bold flex-shrink-0"
              style={{
                backgroundColor: getGlowColor(CYBERPUNK_COLORS.accentPurple, 0.2),
                color: CYBERPUNK_COLORS.accentPurple,
              }}
            >
              {d.collaboratorName.charAt(0)}
            </div>
            <span className="text-xs font-mono" style={{ color: CYBERPUNK_COLORS.textPrimary }}>
              {d.collaboratorName}
            </span>
            {d.isDispute && (
              <span
                className="text-xs font-mono px-1 rounded-sm"
                style={{
                  color: CYBERPUNK_COLORS.accentRed,
                  backgroundColor: getGlowColor(CYBERPUNK_COLORS.accentRed, 0.1),
                }}
              >
                争议
              </span>
            )}
            <span className="text-xs font-mono ml-auto" style={{ color: CYBERPUNK_COLORS.textSecondary }}>
              {formatTimestamp(d.createdAt)}
            </span>
          </div>
          <div className="text-xs font-mono leading-relaxed" style={{ color: CYBERPUNK_COLORS.textPrimary }}>
            {d.content}
          </div>
          {d.evidenceId && (
            <div
              className="mt-1.5 flex items-center gap-1 text-xs font-mono px-1.5 py-0.5 rounded-sm"
              style={{
                backgroundColor: getGlowColor(CYBERPUNK_COLORS.accentPurple, 0.08),
                color: CYBERPUNK_COLORS.accentPurple,
                border: `1px solid ${getGlowColor(CYBERPUNK_COLORS.accentPurple, 0.2)}`,
              }}
            >
              <Link2 size={10} />
              {getEvidenceLabel(d.evidenceId)}
            </div>
          )}
          {currentConsultation && currentConsultation.status !== 'concluded' && !d.isDispute && (
            <button
              className="mt-1.5 flex items-center gap-1 text-xs font-mono px-1.5 py-0.5 rounded-sm border transition-all"
              style={{
                borderColor: getGlowColor(CYBERPUNK_COLORS.accentRed, 0.3),
                color: CYBERPUNK_COLORS.accentRed,
                backgroundColor: 'transparent',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = getGlowColor(CYBERPUNK_COLORS.accentRed, 0.08);
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
              onClick={() => {
                setDisputeDiscussionId(d.id);
                setActiveTab('disputes');
              }}
            >
              <Flag size={10} />
              提出争议
            </button>
          )}
        </div>
      </div>
    </div>
  );

  const renderConclusionItem = (c: ConsultationConclusion) => (
    <div
      key={c.id}
      className="rounded-sm border overflow-hidden"
      style={{
        borderColor: getGlowColor(CYBERPUNK_COLORS.accentGreen, 0.3),
        backgroundColor: CYBERPUNK_COLORS.bgTertiary,
      }}
    >
      <div className="flex">
        <div
          className="w-1 flex-shrink-0"
          style={{
            backgroundColor: CYBERPUNK_COLORS.accentGreen,
            boxShadow: `0 0 6px ${getGlowColor(CYBERPUNK_COLORS.accentGreen, 0.4)}`,
          }}
        />
        <div className="flex-1 p-2.5">
          <div className="flex items-center gap-2 mb-1">
            <CheckCircle2 size={14} style={{ color: CYBERPUNK_COLORS.accentGreen }} />
            <span className="text-xs font-mono" style={{ color: CYBERPUNK_COLORS.accentGreen }}>
              结论纪要
            </span>
            <span className="text-xs font-mono" style={{ color: CYBERPUNK_COLORS.textSecondary }}>
              {c.decidedByName}
            </span>
            <span className="text-xs font-mono ml-auto" style={{ color: CYBERPUNK_COLORS.textSecondary }}>
              {formatTimestamp(c.createdAt)}
            </span>
          </div>
          <div className="text-xs font-mono leading-relaxed" style={{ color: CYBERPUNK_COLORS.textPrimary }}>
            {c.content}
          </div>
          {c.keyCluesUpdate && c.keyCluesUpdate.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1.5">
              {c.keyCluesUpdate.map((clue, idx) => (
                <span
                  key={idx}
                  className="text-xs font-mono px-1 py-0 rounded-sm"
                  style={{
                    backgroundColor: getGlowColor(CYBERPUNK_COLORS.accentYellow, 0.1),
                    color: CYBERPUNK_COLORS.accentYellow,
                  }}
                >
                  {clue}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const renderDisputeItem = (d: ConsultationDispute) => {
    const isExpanded = expandedDisputeId === d.id;
    const isResolving = resolvingDisputeId === d.id;

    return (
      <div
        key={d.id}
        className="rounded-sm border overflow-hidden"
        style={{
          borderColor: getGlowColor(CYBERPUNK_COLORS.accentRed, 0.3),
          backgroundColor: CYBERPUNK_COLORS.bgTertiary,
        }}
      >
        <div className="flex">
          <div
            className="w-1 flex-shrink-0"
            style={{
              backgroundColor: d.resolution ? CYBERPUNK_COLORS.accentGreen : CYBERPUNK_COLORS.accentRed,
            }}
          />
          <div className="flex-1 p-2.5">
            <div className="flex items-center gap-2 mb-1">
              <AlertTriangle size={14} style={{ color: d.resolution ? CYBERPUNK_COLORS.accentGreen : CYBERPUNK_COLORS.accentRed }} />
              <span
                className="text-xs font-mono px-1 rounded-sm"
                style={{
                  color: d.resolution ? CYBERPUNK_COLORS.accentGreen : CYBERPUNK_COLORS.accentRed,
                  backgroundColor: d.resolution ? getGlowColor(CYBERPUNK_COLORS.accentGreen, 0.1) : getGlowColor(CYBERPUNK_COLORS.accentRed, 0.1),
                }}
              >
                {d.resolution ? '已解决' : '待解决'}
              </span>
              <span className="text-xs font-mono" style={{ color: CYBERPUNK_COLORS.textSecondary }}>
                {d.raisedByName}
              </span>
              <span className="text-xs font-mono ml-auto" style={{ color: CYBERPUNK_COLORS.textSecondary }}>
                {formatTimestamp(d.createdAt)}
              </span>
            </div>
            <div className="text-xs font-mono leading-relaxed" style={{ color: CYBERPUNK_COLORS.textPrimary }}>
              {d.description}
            </div>
            {d.evidenceId && (
              <div
                className="mt-1.5 flex items-center gap-1 text-xs font-mono px-1.5 py-0.5 rounded-sm"
                style={{
                  backgroundColor: getGlowColor(CYBERPUNK_COLORS.accentPurple, 0.08),
                  color: CYBERPUNK_COLORS.accentPurple,
                }}
              >
                <Link2 size={10} />
                {getEvidenceLabel(d.evidenceId)}
              </div>
            )}
            {d.resolution && (
              <div
                className="mt-1.5 text-xs font-mono p-1.5 rounded-sm"
                style={{
                  backgroundColor: getGlowColor(CYBERPUNK_COLORS.accentGreen, 0.08),
                  color: CYBERPUNK_COLORS.accentGreen,
                }}
              >
                ✓ {d.resolution} — {d.resolvedByName}
              </div>
            )}
            {!d.resolution && currentConsultation && currentConsultation.status !== 'concluded' && (
              <>
                <button
                  className="mt-1.5 flex items-center gap-1 text-xs font-mono px-1.5 py-0.5 rounded-sm border transition-all"
                  style={{
                    borderColor: CYBERPUNK_COLORS.accentYellow,
                    color: CYBERPUNK_COLORS.accentYellow,
                    backgroundColor: 'transparent',
                  }}
                  onClick={() => setResolvingDisputeId(isResolving ? null : d.id)}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = getGlowColor(CYBERPUNK_COLORS.accentYellow, 0.08);
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }}
                >
                  <Gavel size={10} />
                  {isResolving ? '取消' : '解决争议'}
                </button>
                {isResolving && (
                  <div className="mt-2 space-y-2">
                    <NeonInput
                      placeholder="解决方案..."
                      value={resolutionText}
                      onChange={(e) => setResolutionText(e.target.value)}
                    />
                    <NeonButton
                      size="sm"
                      variant="success"
                      icon={<CheckCircle2 size={14} />}
                      onClick={() => handleResolveDispute(d.id)}
                    >
                      确认解决
                    </NeonButton>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderDetail = () => {
    if (!currentConsultation) return null;
    const c = currentConsultation;
    const statusColor = STATUS_COLORS[c.status];
    const isOpen = c.status !== 'concluded';

    const tabs: Array<{ key: TabType; label: string; icon: React.ReactNode; count: number }> = [
      { key: 'discussions', label: '讨论', icon: <MessageSquare size={12} />, count: c.discussions.length },
      { key: 'conclusions', label: '结论', icon: <FileText size={12} />, count: c.conclusions.length },
      { key: 'disputes', label: '争议', icon: <AlertTriangle size={12} />, count: c.disputes.length },
    ];

    return (
      <div className="flex-1 flex flex-col overflow-hidden">
        <div
          className="p-3 border-b space-y-2"
          style={{ borderColor: CYBERPUNK_COLORS.borderColor, backgroundColor: CYBERPUNK_COLORS.bgTertiary }}
        >
          <div className="flex items-center gap-2">
            <button
              className="p-1 transition-colors"
              style={{ color: CYBERPUNK_COLORS.accentCyan }}
              onClick={handleBackToList}
            >
              <ArrowLeft size={16} />
            </button>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-mono font-bold truncate" style={{ color: CYBERPUNK_COLORS.textPrimary }}>
                {c.title}
              </div>
              <div className="flex items-center gap-2 mt-1">
                <span
                  className="text-xs font-mono px-1.5 py-0.5 rounded-sm"
                  style={{
                    backgroundColor: getGlowColor(statusColor, 0.15),
                    color: statusColor,
                    border: `1px solid ${getGlowColor(statusColor, 0.3)}`,
                  }}
                >
                  {STATUS_LABELS[c.status]}
                </span>
                <span className="text-xs font-mono" style={{ color: CYBERPUNK_COLORS.textSecondary }}>
                  {formatTimestamp(c.createdAt)}
                </span>
              </div>
            </div>
          </div>
          {c.description && (
            <div className="text-xs font-mono leading-relaxed" style={{ color: CYBERPUNK_COLORS.textSecondary }}>
              {c.description}
            </div>
          )}
          {c.evidenceIds.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {c.evidenceIds.map((eid) => (
                <span
                  key={eid}
                  className="text-xs font-mono px-1.5 py-0.5 rounded-sm border"
                  style={{
                    borderColor: getGlowColor(CYBERPUNK_COLORS.accentPurple, 0.3),
                    color: CYBERPUNK_COLORS.accentPurple,
                    backgroundColor: getGlowColor(CYBERPUNK_COLORS.accentPurple, 0.05),
                  }}
                >
                  <Link2 size={10} className="inline mr-0.5" />
                  {getEvidenceLabel(eid)}
                </span>
              ))}
            </div>
          )}
          {c.keyClues.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {c.keyClues.map((clue, idx) => (
                <span
                  key={idx}
                  className="text-xs font-mono px-1 py-0 rounded-sm"
                  style={{
                    backgroundColor: getGlowColor(CYBERPUNK_COLORS.accentYellow, 0.1),
                    color: CYBERPUNK_COLORS.accentYellow,
                  }}
                >
                  {clue}
                </span>
              ))}
            </div>
          )}
        </div>

        <div
          className="flex border-b"
          style={{ borderColor: CYBERPUNK_COLORS.borderColor }}
        >
          {tabs.map((tab) => (
            <button
              key={tab.key}
              className="flex-1 flex items-center justify-center gap-1 py-2 text-xs font-mono transition-all"
              style={{
                color: activeTab === tab.key ? CYBERPUNK_COLORS.accentCyan : CYBERPUNK_COLORS.textSecondary,
                borderBottom: activeTab === tab.key ? `2px solid ${CYBERPUNK_COLORS.accentCyan}` : '2px solid transparent',
                backgroundColor: activeTab === tab.key ? getGlowColor(CYBERPUNK_COLORS.accentCyan, 0.05) : 'transparent',
              }}
              onClick={() => setActiveTab(tab.key)}
            >
              {tab.icon}
              {tab.label}
              <span
                className="px-1 rounded-sm"
                style={{
                  backgroundColor: activeTab === tab.key ? getGlowColor(CYBERPUNK_COLORS.accentCyan, 0.15) : getGlowColor(CYBERPUNK_COLORS.borderColor, 0.3),
                }}
              >
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {activeTab === 'discussions' && (
            <>
              {c.discussions.length === 0 && (
                <div className="text-xs font-mono text-center py-4" style={{ color: CYBERPUNK_COLORS.textSecondary }}>
                  暂无讨论，发起第一条讨论吧
                </div>
              )}
              {c.discussions.map(renderDiscussionItem)}
            </>
          )}

          {activeTab === 'conclusions' && (
            <>
              {c.conclusions.length === 0 && (
                <div className="text-xs font-mono text-center py-4" style={{ color: CYBERPUNK_COLORS.textSecondary }}>
                  暂无结论纪要
                </div>
              )}
              {c.conclusions.map(renderConclusionItem)}
            </>
          )}

          {activeTab === 'disputes' && (
            <>
              {c.disputes.length === 0 && disputeDiscussionId === '' && (
                <div className="text-xs font-mono text-center py-4" style={{ color: CYBERPUNK_COLORS.textSecondary }}>
                  暂无争议记录
                </div>
              )}
              {c.disputes.map(renderDisputeItem)}
              {isOpen && disputeDiscussionId && (
                <div
                  className="rounded-sm border p-2.5 space-y-2"
                  style={{
                    borderColor: getGlowColor(CYBERPUNK_COLORS.accentRed, 0.3),
                    backgroundColor: CYBERPUNK_COLORS.bgTertiary,
                  }}
                >
                  <div className="text-xs font-mono" style={{ color: CYBERPUNK_COLORS.accentRed }}>
                    <Flag size={12} className="inline mr-1" />
                    对讨论提出争议
                  </div>
                  <NeonInput
                    placeholder="争议描述..."
                    value={disputeDescription}
                    onChange={(e) => setDisputeDescription(e.target.value)}
                  />
                  <div className="flex gap-2">
                    <NeonButton size="sm" variant="danger" icon={<Flag size={14} />} onClick={handleRaiseDispute}>
                      提交争议
                    </NeonButton>
                    <NeonButton
                      size="sm"
                      variant="secondary"
                      onClick={() => {
                        setDisputeDescription('');
                        setDisputeDiscussionId('');
                      }}
                    >
                      取消
                    </NeonButton>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {isOpen && currentCollaboratorId && (
          <div className="p-3 border-t space-y-2" style={{ borderColor: CYBERPUNK_COLORS.borderColor }}>
            {activeTab === 'discussions' && (
              <div className="flex gap-2">
                <div className="flex-1">
                  <NeonInput
                    placeholder="输入讨论内容..."
                    value={discussionText}
                    onChange={(e) => setDiscussionText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleAddDiscussion();
                      }
                    }}
                  />
                </div>
                {evidenceList.length > 0 && (
                  <select
                    value={selectedDiscussionEvidence}
                    onChange={(e) => setSelectedDiscussionEvidence(e.target.value)}
                    className="w-28 text-xs font-mono px-1 py-1 border rounded-sm"
                    style={{
                      backgroundColor: CYBERPUNK_COLORS.bgPrimary,
                      borderColor: CYBERPUNK_COLORS.borderColor,
                      color: selectedDiscussionEvidence ? CYBERPUNK_COLORS.accentPurple : CYBERPUNK_COLORS.textSecondary,
                    }}
                  >
                    <option value="">关联证据</option>
                    {evidenceList.map((ev) => (
                      <option key={ev.id} value={ev.id}>
                        {ev.content.slice(0, 12)}...
                      </option>
                    ))}
                  </select>
                )}
                <NeonButton size="sm" variant="primary" icon={<Send size={14} />} onClick={handleAddDiscussion}>
                  发送
                </NeonButton>
              </div>
            )}
            {activeTab === 'conclusions' && (
              <div className="space-y-2">
                <NeonInput
                  placeholder="输入结论纪要..."
                  value={conclusionText}
                  onChange={(e) => setConclusionText(e.target.value)}
                />
                <NeonButton
                  size="sm"
                  variant="success"
                  icon={<Gavel size={14} />}
                  onClick={handleAddConclusion}
                >
                  形成结论并结案
                </NeonButton>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div
      className="h-full flex flex-col border-l"
      style={{
        width: 380,
        backgroundColor: CYBERPUNK_COLORS.bgSecondary,
        borderColor: CYBERPUNK_COLORS.borderColor,
      }}
    >
      <div
        className="flex items-center justify-between px-4 py-3 border-b"
        style={{ borderColor: CYBERPUNK_COLORS.borderColor }}
      >
        <div className="flex items-center gap-2">
          <MessageSquare
            size={18}
            style={{
              color: CYBERPUNK_COLORS.accentCyan,
              filter: `drop-shadow(0 0 4px ${getGlowColor(CYBERPUNK_COLORS.accentCyan, 0.6)})`,
            }}
          />
          <span
            className="text-sm font-mono font-bold"
            style={{
              color: CYBERPUNK_COLORS.accentCyan,
              textShadow: `0 0 8px ${getGlowColor(CYBERPUNK_COLORS.accentCyan, 0.6)}`,
            }}
          >
            案件会商
          </span>
        </div>
        <button
          onClick={toggleConsultationPanel}
          className="p-1 transition-colors"
          style={{ color: CYBERPUNK_COLORS.textSecondary }}
        >
          <X size={16} />
        </button>
      </div>

      {currentConsultation ? (
        renderDetail()
      ) : (
        <>
          {!showCreateForm && (
            <div className="p-3 border-b" style={{ borderColor: CYBERPUNK_COLORS.borderColor }}>
              <NeonButton
                size="sm"
                variant="primary"
                icon={<Plus size={14} />}
                onClick={() => setShowCreateForm(true)}
                className="w-full"
                disabled={!currentCollaboratorId}
              >
                发起会商
              </NeonButton>
              {!currentCollaboratorId && (
                <div className="text-xs font-mono mt-1 text-center" style={{ color: CYBERPUNK_COLORS.accentYellow }}>
                  请先选择当前角色
                </div>
              )}
            </div>
          )}
          {showCreateForm && renderCreateForm()}
          {renderConsultationList()}
        </>
      )}
    </div>
  );
};

export default ConsultationPanel;
