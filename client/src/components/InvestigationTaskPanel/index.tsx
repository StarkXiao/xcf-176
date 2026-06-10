import React, { useEffect, useMemo, useState } from 'react';
import {
  ClipboardList,
  X,
  Plus,
  ArrowLeft,
  Trash2,
  Clock,
  User,
  AlertTriangle,
  CheckCircle2,
  Link2,
  Calendar,
  ShieldCheck,
  FileText,
  Bell,
  RefreshCw,
} from 'lucide-react';
import { NeonInput } from '@/components/ui/NeonInput';
import { NeonButton } from '@/components/ui/NeonButton';
import { useCaseStore } from '@/store/useCaseStore';
import { useInvestigationTaskStore } from '@/store/useInvestigationTaskStore';
import { useCollaboratorStore } from '@/store/useCollaboratorStore';
import { useUiStore } from '@/store/useUiStore';
import { useEvidenceStore } from '@/store/useEvidenceStore';
import { useEvidenceCollectionStore } from '@/store/useEvidenceCollectionStore';
import { useCanvasStore } from '@/store/useCanvasStore';
import { CYBERPUNK_COLORS, getGlowColor } from '@/utils/colorUtils';
import { recordAuditLog } from '@/utils/auditHelper';
import type {
  InvestigationTask,
  InvestigationTaskSyncNote,
  InvestigationTaskStatus,
  InvestigationTaskPriority,
  SyncNoteImpact,
} from '@/types';

const IMPACT_LABELS: Record<SyncNoteImpact, string> = {
  status_advanced: '状态推进',
  priority_escalated: '优先级升级',
  info_only: '信息通知',
};

const IMPACT_COLORS: Record<SyncNoteImpact, string> = {
  status_advanced: CYBERPUNK_COLORS.accentRed,
  priority_escalated: CYBERPUNK_COLORS.accentYellow,
  info_only: CYBERPUNK_COLORS.accentCyan,
};

const STATUS_LABELS: Record<InvestigationTaskStatus, string> = {
  pending: '待处理',
  in_progress: '进行中',
  completed: '已完成',
  cancelled: '已取消',
};

const STATUS_COLORS: Record<InvestigationTaskStatus, string> = {
  pending: CYBERPUNK_COLORS.textSecondary,
  in_progress: CYBERPUNK_COLORS.accentYellow,
  completed: CYBERPUNK_COLORS.accentGreen,
  cancelled: CYBERPUNK_COLORS.accentPurple,
};

const PRIORITY_LABELS: Record<InvestigationTaskPriority, string> = {
  low: '低',
  normal: '中',
  high: '高',
  critical: '紧急',
};

const PRIORITY_COLORS: Record<InvestigationTaskPriority, string> = {
  low: CYBERPUNK_COLORS.accentGreen,
  normal: CYBERPUNK_COLORS.accentCyan,
  high: CYBERPUNK_COLORS.accentYellow,
  critical: CYBERPUNK_COLORS.accentRed,
};

const SYNC_NOTE_ICONS: Record<InvestigationTaskSyncNote['sourceType'], string> = {
  collection_archived: '📦',
  evidence_updated: '📝',
  connection_updated: '🔗',
};

const SYNC_NOTE_COLORS: Record<InvestigationTaskSyncNote['sourceType'], string> = {
  collection_archived: CYBERPUNK_COLORS.accentGreen,
  evidence_updated: CYBERPUNK_COLORS.accentYellow,
  connection_updated: CYBERPUNK_COLORS.accentCyan,
};

function getUrgentNoteCount(notes: InvestigationTaskSyncNote[]): number {
  return notes.filter((n) => n.impact === 'status_advanced' || n.impact === 'priority_escalated').length;
}

const FILTER_OPTIONS: Array<{ value: 'all' | InvestigationTaskStatus; label: string }> = [
  { value: 'all', label: '全部' },
  { value: 'pending', label: '待处理' },
  { value: 'in_progress', label: '进行中' },
  { value: 'completed', label: '已完成' },
  { value: 'cancelled', label: '已取消' },
];

export const InvestigationTaskPanel: React.FC = () => {
  const currentCase = useCaseStore((s) => s.currentCase);
  const tasks = useInvestigationTaskStore((s) => s.tasks);
  const currentTask = useInvestigationTaskStore((s) => s.currentTask);
  const filter = useInvestigationTaskStore((s) => s.filter);
  const loading = useInvestigationTaskStore((s) => s.loading);
  const loadTasks = useInvestigationTaskStore((s) => s.loadTasks);
  const createTask = useInvestigationTaskStore((s) => s.createTask);
  const updateTask = useInvestigationTaskStore((s) => s.updateTask);
  const deleteTask = useInvestigationTaskStore((s) => s.deleteTask);
  const assignTask = useInvestigationTaskStore((s) => s.assignTask);
  const linkEvidence = useInvestigationTaskStore((s) => s.linkEvidence);
  const unlinkEvidence = useInvestigationTaskStore((s) => s.unlinkEvidence);
  const linkCollectionItem = useInvestigationTaskStore((s) => s.linkCollectionItem);
  const unlinkCollectionItem = useInvestigationTaskStore((s) => s.unlinkCollectionItem);
  const linkConnection = useInvestigationTaskStore((s) => s.linkConnection);
  const unlinkConnection = useInvestigationTaskStore((s) => s.unlinkConnection);
  const clearSyncNotes = useInvestigationTaskStore((s) => s.clearSyncNotes);
  const setCurrentTask = useInvestigationTaskStore((s) => s.setCurrentTask);
  const setFilter = useInvestigationTaskStore((s) => s.setFilter);
  const getFilteredTasks = useInvestigationTaskStore((s) => s.getFilteredTasks);
  const getOverdueTasks = useInvestigationTaskStore((s) => s.getOverdueTasks);
  const togglePanel = useUiStore((s) => s.toggleInvestigationTaskPanel);
  const collaborators = useCollaboratorStore((s) => s.collaborators);
  const currentCollaboratorId = useUiStore((s) => s.currentCollaboratorId);
  const evidenceList = useEvidenceStore((s) => s.getEvidenceArray());
  const collectionItems = useEvidenceCollectionStore((s) => s.items);
  const loadCollectionItems = useEvidenceCollectionStore((s) => s.loadItems);
  const connections = useCanvasStore((s) => s.connections);

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newPriority, setNewPriority] = useState<InvestigationTaskPriority>('normal');
  const [newAssigneeId, setNewAssigneeId] = useState('');
  const [newDeadline, setNewDeadline] = useState('');
  const [newEvidenceIds, setNewEvidenceIds] = useState<string[]>([]);
  const [newCollectionItemIds, setNewCollectionItemIds] = useState<string[]>([]);
  const [newConnectionIds, setNewConnectionIds] = useState<string[]>([]);
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [showLinkEvidence, setShowLinkEvidence] = useState(false);
  const [showLinkCollection, setShowLinkCollection] = useState(false);
  const [showLinkConnection, setShowLinkConnection] = useState(false);
  const [showSyncNotes, setShowSyncNotes] = useState(false);

  useEffect(() => {
    if (currentCase) {
      loadTasks(currentCase.id);
      loadCollectionItems(currentCase.id);
    }
  }, [currentCase, loadTasks, loadCollectionItems]);

  const currentCollaborator = useMemo(() => {
    return collaborators.find((c) => c.id === currentCollaboratorId);
  }, [collaborators, currentCollaboratorId]);

  const filteredTasks = useMemo(() => getFilteredTasks(), [tasks, filter]);
  const overdueTasks = useMemo(() => getOverdueTasks(), [tasks]);

  const totalSyncNotes = useMemo(() => {
    return tasks.reduce((sum, t) => sum + (t.syncNotes?.length ?? 0), 0);
  }, [tasks]);

  const totalUrgentNotes = useMemo(() => {
    return tasks.reduce((sum, t) => sum + getUrgentNoteCount(t.syncNotes ?? []), 0);
  }, [tasks]);

  const getCollectionLabel = (collectionItemId: string) => {
    const item = collectionItems.find((i) => i.id === collectionItemId);
    if (!item) return collectionItemId;
    const statusIcon = item.archivedAt ? '✅' : item.verificationStatus === 'verified' ? '✔' : '⏳';
    return `${statusIcon} ${item.content.slice(0, 24)}${item.content.length > 24 ? '...' : ''}`;
  };

  const getConnectionLabel = (connectionId: string) => {
    const conn = connections.find((c) => c.id === connectionId);
    if (!conn) return connectionId;
    const fromEv = evidenceList.find((e) => e.id === conn.fromEvidenceId);
    const toEv = evidenceList.find((e) => e.id === conn.toEvidenceId);
    const fromLabel = fromEv ? fromEv.content.slice(0, 12) : conn.fromEvidenceId.slice(0, 8);
    const toLabel = toEv ? toEv.content.slice(0, 12) : conn.toEvidenceId.slice(0, 8);
    return `${fromLabel} → ${toLabel}${conn.label ? ` (${conn.label})` : ''}`;
  };

  const getEvidenceLabel = (evidenceId: string) => {
    const ev = evidenceList.find((e) => e.id === evidenceId);
    return ev ? ev.content.slice(0, 30) + (ev.content.length > 30 ? '...' : '') : evidenceId;
  };

  const handleCreate = async () => {
    if (!newTitle.trim() || !currentCase || !currentCollaboratorId) return;
    const result = await createTask({
      caseId: currentCase.id,
      title: newTitle.trim(),
      description: newDesc.trim(),
      priority: newPriority,
      assigneeId: newAssigneeId || null,
      deadline: newDeadline || null,
      evidenceIds: newEvidenceIds,
      collectionItemIds: newCollectionItemIds,
      connectionIds: newConnectionIds,
      createdBy: currentCollaboratorId,
    });
    if (result) {
      await recordAuditLog('create_investigation_task', 'case', result.id, `创建侦查任务: ${result.title}`);
      setNewTitle('');
      setNewDesc('');
      setNewPriority('normal');
      setNewAssigneeId('');
      setNewDeadline('');
      setNewEvidenceIds([]);
      setNewCollectionItemIds([]);
      setNewConnectionIds([]);
      setShowCreateForm(false);
    }
  };

  const handleDelete = async (task: InvestigationTask) => {
    await deleteTask(task.id, currentCollaboratorId ?? undefined);
  };

  const handleStatusChange = async (task: InvestigationTask, status: InvestigationTaskStatus) => {
    if (!currentCollaboratorId) return;
    await updateTask(task.id, { status }, currentCollaboratorId);
    if (status === 'completed') {
      await recordAuditLog('complete_investigation_task', 'case', task.id, `完成任务: ${task.title}`);
    }
  };

  const handleAssign = async (task: InvestigationTask, assigneeId: string) => {
    if (!currentCollaboratorId || !assigneeId) return;
    await assignTask(task.id, assigneeId, currentCollaboratorId);
    await recordAuditLog('assign_investigation_task', 'case', task.id, `分配任务: ${task.title}`);
  };

  const handleLinkEvidence = async (evidenceId: string) => {
    if (!currentCollaboratorId || !currentTask) return;
    await linkEvidence(currentTask.id, evidenceId, currentCollaboratorId);
    await recordAuditLog('link_evidence_to_task', 'case', currentTask.id, `关联证据到任务`);
  };

  const handleUnlinkEvidence = async (evidenceId: string) => {
    if (!currentCollaboratorId || !currentTask) return;
    await unlinkEvidence(currentTask.id, evidenceId, currentCollaboratorId);
  };

  const handleLinkCollection = async (collectionItemId: string) => {
    if (!currentCollaboratorId || !currentTask) return;
    await linkCollectionItem(currentTask.id, collectionItemId, currentCollaboratorId);
    await recordAuditLog('link_collection_to_task', 'case', currentTask.id, `关联采集项到任务`);
  };

  const handleUnlinkCollection = async (collectionItemId: string) => {
    if (!currentCollaboratorId || !currentTask) return;
    await unlinkCollectionItem(currentTask.id, collectionItemId, currentCollaboratorId);
  };

  const handleLinkConnection = async (connectionId: string) => {
    if (!currentCollaboratorId || !currentTask) return;
    await linkConnection(currentTask.id, connectionId, currentCollaboratorId);
    await recordAuditLog('link_connection_to_task', 'case', currentTask.id, `关联关系线到任务`);
  };

  const handleUnlinkConnection = async (connectionId: string) => {
    if (!currentCollaboratorId || !currentTask) return;
    await unlinkConnection(currentTask.id, connectionId, currentCollaboratorId);
  };

  const handleClearSyncNotes = async () => {
    if (!currentTask) return;
    await clearSyncNotes(currentTask.id, currentCollaboratorId ?? undefined);
  };

  const handleInlineEdit = async (field: string, value: string) => {
    if (!currentTask || !currentCollaboratorId) return;
    const update: Record<string, string> = {};
    update[field] = value;
    await updateTask(currentTask.id, update, currentCollaboratorId);
    setEditingField(null);
    setEditValue('');
  };

  const isOverdue = (task: InvestigationTask) => {
    if (!task.deadline || task.status === 'completed' || task.status === 'cancelled') return false;
    return new Date(task.deadline) < new Date();
  };

  const formatDeadline = (deadline: string | null) => {
    if (!deadline) return '';
    const d = new Date(deadline);
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const hh = String(d.getHours()).padStart(2, '0');
    const mi = String(d.getMinutes()).padStart(2, '0');
    return `${mm}-${dd} ${hh}:${mi}`;
  };

  const getDaysRemaining = (deadline: string | null) => {
    if (!deadline) return null;
    const diff = new Date(deadline).getTime() - Date.now();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  const toggleNewEvidenceSelection = (id: string) => {
    setNewEvidenceIds((prev) =>
      prev.includes(id) ? prev.filter((eid) => eid !== id) : [...prev, id]
    );
  };

  const toggleNewCollectionSelection = (id: string) => {
    setNewCollectionItemIds((prev) =>
      prev.includes(id) ? prev.filter((cid) => cid !== id) : [...prev, id]
    );
  };

  const toggleNewConnectionSelection = (id: string) => {
    setNewConnectionIds((prev) =>
      prev.includes(id) ? prev.filter((cid) => cid !== id) : [...prev, id]
    );
  };

  const selectStyle = {
    backgroundColor: CYBERPUNK_COLORS.bgPrimary,
    borderColor: CYBERPUNK_COLORS.borderColor,
    color: CYBERPUNK_COLORS.textPrimary,
  };

  const renderTaskList = () => (
    <div className="flex-1 overflow-y-auto p-3 space-y-2">
      {overdueTasks.length > 0 && (
        <div
          className="rounded-sm border p-2 mb-2 flex items-center gap-2"
          style={{
            borderColor: getGlowColor(CYBERPUNK_COLORS.accentRed, 0.4),
            backgroundColor: getGlowColor(CYBERPUNK_COLORS.accentRed, 0.08),
          }}
        >
          <AlertTriangle size={14} style={{ color: CYBERPUNK_COLORS.accentRed }} />
          <span className="text-xs font-mono" style={{ color: CYBERPUNK_COLORS.accentRed }}>
            {overdueTasks.length} 项任务已逾期
          </span>
        </div>
      )}
      {totalUrgentNotes > 0 && (
        <div
          className="rounded-sm border p-2 mb-2 flex items-center gap-2"
          style={{
            borderColor: getGlowColor(CYBERPUNK_COLORS.accentRed, 0.4),
            backgroundColor: getGlowColor(CYBERPUNK_COLORS.accentRed, 0.08),
          }}
        >
          <AlertTriangle size={14} style={{ color: CYBERPUNK_COLORS.accentRed }} />
          <span className="text-xs font-mono" style={{ color: CYBERPUNK_COLORS.accentRed }}>
            {totalUrgentNotes} 条催办通知（状态推进/优先级升级）
          </span>
        </div>
      )}
      {totalSyncNotes > totalUrgentNotes && (
        <div
          className="rounded-sm border p-2 mb-2 flex items-center gap-2"
          style={{
            borderColor: getGlowColor(CYBERPUNK_COLORS.accentCyan, 0.4),
            backgroundColor: getGlowColor(CYBERPUNK_COLORS.accentCyan, 0.08),
          }}
        >
          <Bell size={14} style={{ color: CYBERPUNK_COLORS.accentCyan }} />
          <span className="text-xs font-mono" style={{ color: CYBERPUNK_COLORS.accentCyan }}>
            {totalSyncNotes - totalUrgentNotes} 条来源同步通知
          </span>
        </div>
      )}
      <div className="flex gap-1 mb-2 flex-wrap">
        {FILTER_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            className="text-xs font-mono px-2 py-0.5 rounded-sm border transition-all"
            style={{
              borderColor: filter === opt.value ? CYBERPUNK_COLORS.accentCyan : CYBERPUNK_COLORS.borderColor,
              color: filter === opt.value ? CYBERPUNK_COLORS.accentCyan : CYBERPUNK_COLORS.textSecondary,
              backgroundColor: filter === opt.value ? getGlowColor(CYBERPUNK_COLORS.accentCyan, 0.1) : 'transparent',
            }}
            onClick={() => setFilter(opt.value)}
          >
            {opt.label}
          </button>
        ))}
      </div>
      {filteredTasks.length === 0 && (
        <div className="text-xs font-mono text-center py-4" style={{ color: CYBERPUNK_COLORS.textSecondary }}>
          暂无侦查任务
        </div>
      )}
      {filteredTasks.map((task) => {
        const statusColor = STATUS_COLORS[task.status];
        const priorityColor = PRIORITY_COLORS[task.priority];
        const overdue = isOverdue(task);
        const daysLeft = getDaysRemaining(task.deadline);
        const syncCount = task.syncNotes?.length ?? 0;
        const urgentCount = getUrgentNoteCount(task.syncNotes ?? []);

        return (
          <div
            key={task.id}
            className="rounded-sm border overflow-hidden cursor-pointer transition-all"
            style={{
              borderColor: overdue ? getGlowColor(CYBERPUNK_COLORS.accentRed, 0.4) : CYBERPUNK_COLORS.borderColor,
              backgroundColor: CYBERPUNK_COLORS.bgTertiary,
            }}
            onClick={() => setCurrentTask(task)}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = CYBERPUNK_COLORS.accentCyan;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = overdue ? getGlowColor(CYBERPUNK_COLORS.accentRed, 0.4) : CYBERPUNK_COLORS.borderColor;
            }}
          >
            <div className="flex">
              <div
                className="w-1 flex-shrink-0"
                style={{
                  backgroundColor: priorityColor,
                  boxShadow: `0 0 6px ${getGlowColor(priorityColor, 0.4)}`,
                }}
              />
              <div className="flex-1 p-2.5">
                <div className="flex items-center gap-2 mb-1">
                  <span
                    className="text-xs font-mono px-1.5 py-0.5 rounded-sm"
                    style={{
                      backgroundColor: getGlowColor(priorityColor, 0.15),
                      color: priorityColor,
                      border: `1px solid ${getGlowColor(priorityColor, 0.3)}`,
                    }}
                  >
                    {PRIORITY_LABELS[task.priority]}
                  </span>
                  <span
                    className="text-xs font-mono px-1.5 py-0.5 rounded-sm"
                    style={{
                      backgroundColor: getGlowColor(statusColor, 0.15),
                      color: statusColor,
                      border: `1px solid ${getGlowColor(statusColor, 0.3)}`,
                    }}
                  >
                    {STATUS_LABELS[task.status]}
                  </span>
                  {urgentCount > 0 && (
                    <span
                      className="text-xs font-mono px-1.5 py-0.5 rounded-sm"
                      style={{
                        backgroundColor: getGlowColor(CYBERPUNK_COLORS.accentRed, 0.15),
                        color: CYBERPUNK_COLORS.accentRed,
                        border: `1px solid ${getGlowColor(CYBERPUNK_COLORS.accentRed, 0.3)}`,
                      }}
                    >
                      <AlertTriangle size={8} className="inline" /> {urgentCount}
                    </span>
                  )}
                  {syncCount > urgentCount && (
                    <span
                      className="text-xs font-mono px-1.5 py-0.5 rounded-sm"
                      style={{
                        backgroundColor: getGlowColor(CYBERPUNK_COLORS.accentCyan, 0.15),
                        color: CYBERPUNK_COLORS.accentCyan,
                        border: `1px solid ${getGlowColor(CYBERPUNK_COLORS.accentCyan, 0.3)}`,
                      }}
                    >
                      <Bell size={8} className="inline" /> {syncCount - urgentCount}
                    </span>
                  )}
                  <span
                    className="text-xs font-mono truncate flex-1"
                    style={{ color: CYBERPUNK_COLORS.textPrimary }}
                  >
                    {task.title}
                  </span>
                </div>
                <div className="flex items-center justify-between mt-1">
                  <div className="flex items-center gap-2">
                    {task.assigneeName && (
                      <span className="text-xs font-mono flex items-center gap-1" style={{ color: CYBERPUNK_COLORS.accentPurple }}>
                        <User size={10} />
                        {task.assigneeName}
                      </span>
                    )}
                    {task.deadline && (
                      <span
                        className="text-xs font-mono flex items-center gap-1"
                        style={{
                          color: overdue
                            ? CYBERPUNK_COLORS.accentRed
                            : daysLeft !== null && daysLeft <= 3
                            ? CYBERPUNK_COLORS.accentYellow
                            : CYBERPUNK_COLORS.textSecondary,
                        }}
                      >
                        <Clock size={10} />
                        {overdue ? '已逾期' : daysLeft !== null ? `${daysLeft}天` : formatDeadline(task.deadline)}
                      </span>
                    )}
                    {task.evidenceIds.length > 0 && (
                      <span className="text-xs font-mono" style={{ color: CYBERPUNK_COLORS.textSecondary }}>
                        {task.evidenceIds.length} 证据
                      </span>
                    )}
                    {task.collectionItemIds.length > 0 && (
                      <span className="text-xs font-mono" style={{ color: CYBERPUNK_COLORS.textSecondary }}>
                        {task.collectionItemIds.length} 采集
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      className="p-0.5 transition-colors"
                      style={{ color: CYBERPUNK_COLORS.textSecondary }}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(task);
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.color = CYBERPUNK_COLORS.accentRed; }}
                      onMouseLeave={(e) => { e.currentTarget.style.color = CYBERPUNK_COLORS.textSecondary; }}
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
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
        placeholder="任务标题"
        value={newTitle}
        onChange={(e) => setNewTitle(e.target.value)}
      />
      <NeonInput
        placeholder="任务描述（可选）"
        value={newDesc}
        onChange={(e) => setNewDesc(e.target.value)}
      />
      <div className="flex gap-2">
        <div className="flex-1">
          <div className="text-xs font-mono mb-1" style={{ color: CYBERPUNK_COLORS.textSecondary }}>
            优先级
          </div>
          <select
            value={newPriority}
            onChange={(e) => setNewPriority(e.target.value as InvestigationTaskPriority)}
            className="w-full text-xs font-mono px-2 py-1.5 border rounded-sm"
            style={{
              ...selectStyle,
              color: PRIORITY_COLORS[newPriority],
            }}
          >
            {(Object.keys(PRIORITY_LABELS) as InvestigationTaskPriority[]).map((p) => (
              <option key={p} value={p}>{PRIORITY_LABELS[p]}</option>
            ))}
          </select>
        </div>
        <div className="flex-1">
          <div className="text-xs font-mono mb-1" style={{ color: CYBERPUNK_COLORS.textSecondary }}>
            责任人
          </div>
          <select
            value={newAssigneeId}
            onChange={(e) => setNewAssigneeId(e.target.value)}
            className="w-full text-xs font-mono px-2 py-1.5 border rounded-sm"
            style={{
              ...selectStyle,
              color: newAssigneeId ? CYBERPUNK_COLORS.accentPurple : CYBERPUNK_COLORS.textSecondary,
            }}
          >
            <option value="">未分配</option>
            {collaborators.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
      </div>
      <div>
        <div className="text-xs font-mono mb-1" style={{ color: CYBERPUNK_COLORS.textSecondary }}>
          <Calendar size={10} className="inline mr-1" />截止时间
        </div>
        <input
          type="datetime-local"
          value={newDeadline}
          onChange={(e) => setNewDeadline(e.target.value)}
          className="w-full text-xs font-mono px-2 py-1.5 border rounded-sm"
          style={selectStyle}
        />
      </div>
      {evidenceList.length > 0 && (
        <div className="space-y-1">
          <div className="text-xs font-mono" style={{ color: CYBERPUNK_COLORS.textSecondary }}>
            <FileText size={10} className="inline mr-1" />关联证据卡片
          </div>
          <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto">
            {evidenceList.map((ev) => (
              <button
                key={ev.id}
                className="text-xs font-mono px-1.5 py-0.5 rounded-sm border transition-all"
                style={{
                  borderColor: newEvidenceIds.includes(ev.id) ? CYBERPUNK_COLORS.accentCyan : CYBERPUNK_COLORS.borderColor,
                  color: newEvidenceIds.includes(ev.id) ? CYBERPUNK_COLORS.accentCyan : CYBERPUNK_COLORS.textSecondary,
                  backgroundColor: newEvidenceIds.includes(ev.id) ? getGlowColor(CYBERPUNK_COLORS.accentCyan, 0.1) : 'transparent',
                }}
                onClick={() => toggleNewEvidenceSelection(ev.id)}
              >
                {ev.content.slice(0, 16)}...
              </button>
            ))}
          </div>
        </div>
      )}
      {collectionItems.filter((i) => !i.archivedAt).length > 0 && (
        <div className="space-y-1">
          <div className="text-xs font-mono" style={{ color: CYBERPUNK_COLORS.textSecondary }}>
            <ShieldCheck size={10} className="inline mr-1" />关联采集项
          </div>
          <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto">
            {collectionItems.filter((i) => !i.archivedAt).map((item) => (
              <button
                key={item.id}
                className="text-xs font-mono px-1.5 py-0.5 rounded-sm border transition-all"
                style={{
                  borderColor: newCollectionItemIds.includes(item.id) ? CYBERPUNK_COLORS.accentGreen : CYBERPUNK_COLORS.borderColor,
                  color: newCollectionItemIds.includes(item.id) ? CYBERPUNK_COLORS.accentGreen : CYBERPUNK_COLORS.textSecondary,
                  backgroundColor: newCollectionItemIds.includes(item.id) ? getGlowColor(CYBERPUNK_COLORS.accentGreen, 0.1) : 'transparent',
                }}
                onClick={() => toggleNewCollectionSelection(item.id)}
              >
                {item.content.slice(0, 16)}...
              </button>
            ))}
          </div>
        </div>
      )}
      {connections.length > 0 && (
        <div className="space-y-1">
          <div className="text-xs font-mono" style={{ color: CYBERPUNK_COLORS.textSecondary }}>
            <Link2 size={10} className="inline mr-1" />关联关系线
          </div>
          <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto">
            {connections.map((conn) => (
              <button
                key={conn.id}
                className="text-xs font-mono px-1.5 py-0.5 rounded-sm border transition-all"
                style={{
                  borderColor: newConnectionIds.includes(conn.id) ? CYBERPUNK_COLORS.accentYellow : CYBERPUNK_COLORS.borderColor,
                  color: newConnectionIds.includes(conn.id) ? CYBERPUNK_COLORS.accentYellow : CYBERPUNK_COLORS.textSecondary,
                  backgroundColor: newConnectionIds.includes(conn.id) ? getGlowColor(CYBERPUNK_COLORS.accentYellow, 0.1) : 'transparent',
                }}
                onClick={() => toggleNewConnectionSelection(conn.id)}
              >
                {getConnectionLabel(conn.id).slice(0, 20)}...
              </button>
            ))}
          </div>
        </div>
      )}
      <div className="flex gap-2">
        <NeonButton size="sm" variant="primary" icon={<Plus size={14} />} onClick={handleCreate}>
          创建任务
        </NeonButton>
        <NeonButton
          size="sm"
          variant="secondary"
          onClick={() => {
            setShowCreateForm(false);
            setNewTitle('');
            setNewDesc('');
            setNewPriority('normal');
            setNewAssigneeId('');
            setNewDeadline('');
            setNewEvidenceIds([]);
            setNewCollectionItemIds([]);
            setNewConnectionIds([]);
          }}
        >
          取消
        </NeonButton>
      </div>
    </div>
  );

  const renderSyncNotes = (task: InvestigationTask) => {
    const notes = task.syncNotes ?? [];
    if (notes.length === 0) return null;
    const urgentCount = getUrgentNoteCount(notes);

    return (
      <div
        className="rounded-sm border p-2.5 space-y-2"
        style={{
          borderColor: urgentCount > 0
            ? getGlowColor(CYBERPUNK_COLORS.accentRed, 0.4)
            : getGlowColor(CYBERPUNK_COLORS.accentCyan, 0.4),
          backgroundColor: urgentCount > 0
            ? getGlowColor(CYBERPUNK_COLORS.accentRed, 0.04)
            : getGlowColor(CYBERPUNK_COLORS.accentCyan, 0.04),
        }}
      >
        <div className="flex items-center justify-between">
          <div className="text-xs font-mono font-bold flex items-center gap-1" style={{
            color: urgentCount > 0 ? CYBERPUNK_COLORS.accentRed : CYBERPUNK_COLORS.accentCyan,
          }}>
            {urgentCount > 0 ? <AlertTriangle size={12} /> : <Bell size={12} />}
            {urgentCount > 0 ? `催办通知 (${urgentCount})` : `同步通知 (${notes.length})`}
          </div>
          <div className="flex gap-1">
            <button
              className="text-xs font-mono px-1.5 py-0.5 rounded-sm border transition-all"
              style={{
                borderColor: CYBERPUNK_COLORS.accentCyan,
                color: CYBERPUNK_COLORS.accentCyan,
              }}
              onClick={() => setShowSyncNotes(!showSyncNotes)}
            >
              {showSyncNotes ? '收起' : '展开'}
            </button>
            <button
              className="text-xs font-mono px-1.5 py-0.5 rounded-sm border transition-all"
              style={{
                borderColor: CYBERPUNK_COLORS.accentGreen,
                color: CYBERPUNK_COLORS.accentGreen,
              }}
              onClick={handleClearSyncNotes}
            >
              全部已读
            </button>
          </div>
        </div>
        {showSyncNotes && (
          <div className="space-y-1 max-h-40 overflow-y-auto">
            {notes.map((note) => {
              const impactColor = IMPACT_COLORS[note.impact ?? 'info_only'];
              const sourceColor = SYNC_NOTE_COLORS[note.sourceType];
              return (
                <div
                  key={note.id}
                  className="flex items-start gap-1.5 text-xs font-mono px-2 py-1.5 rounded-sm"
                  style={{
                    backgroundColor: getGlowColor(sourceColor, 0.08),
                    border: `1px solid ${getGlowColor(note.impact === 'status_advanced' || note.impact === 'priority_escalated' ? impactColor : sourceColor, 0.2)}`,
                  }}
                >
                  <span className="flex-shrink-0">{SYNC_NOTE_ICONS[note.sourceType]}</span>
                  <div className="flex-1">
                    <div className="flex items-center gap-1">
                      <span
                        className="text-xs font-mono px-1 py-0 rounded-sm"
                        style={{
                          color: impactColor,
                          backgroundColor: getGlowColor(impactColor, 0.12),
                          border: `1px solid ${getGlowColor(impactColor, 0.25)}`,
                          fontSize: '9px',
                        }}
                      >
                        {IMPACT_LABELS[note.impact ?? 'info_only']}
                      </span>
                    </div>
                    <div className="mt-0.5" style={{ color: sourceColor }}>{note.detail}</div>
                    <div className="mt-0.5" style={{ color: CYBERPUNK_COLORS.textSecondary, fontSize: '9px' }}>
                      {new Date(note.timestamp).toLocaleString('zh-CN')}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  const renderTaskDetail = () => {
    if (!currentTask) return null;
    const task = currentTask;
    const statusColor = STATUS_COLORS[task.status];
    const priorityColor = PRIORITY_COLORS[task.priority];
    const overdue = isOverdue(task);
    const daysLeft = getDaysRemaining(task.deadline);
    const isActive = task.status !== 'completed' && task.status !== 'cancelled';
    const syncCount = task.syncNotes?.length ?? 0;
    const urgentCount = getUrgentNoteCount(task.syncNotes ?? []);

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
              onClick={() => { setCurrentTask(null); setShowSyncNotes(false); }}
            >
              <ArrowLeft size={16} />
            </button>
            {editingField === 'title' ? (
              <NeonInput
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onBlur={() => handleInlineEdit('title', editValue)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleInlineEdit('title', editValue);
                  if (e.key === 'Escape') setEditingField(null);
                }}
                autoFocus
              />
            ) : (
              <span
                className="text-xs font-mono font-bold flex-1 truncate cursor-pointer"
                style={{ color: CYBERPUNK_COLORS.textPrimary }}
                onDoubleClick={() => {
                  setEditingField('title');
                  setEditValue(task.title);
                }}
              >
                {task.title}
              </span>
            )}
            {urgentCount > 0 && (
              <span
                className="text-xs font-mono px-1.5 py-0.5 rounded-sm cursor-pointer"
                style={{
                  backgroundColor: getGlowColor(CYBERPUNK_COLORS.accentRed, 0.15),
                  color: CYBERPUNK_COLORS.accentRed,
                  border: `1px solid ${getGlowColor(CYBERPUNK_COLORS.accentRed, 0.3)}`,
                }}
                onClick={() => setShowSyncNotes(!showSyncNotes)}
              >
                <AlertTriangle size={8} className="inline" /> {urgentCount} 催办
              </span>
            )}
            {syncCount > urgentCount && (
              <span
                className="text-xs font-mono px-1.5 py-0.5 rounded-sm cursor-pointer"
                style={{
                  backgroundColor: getGlowColor(CYBERPUNK_COLORS.accentCyan, 0.15),
                  color: CYBERPUNK_COLORS.accentCyan,
                  border: `1px solid ${getGlowColor(CYBERPUNK_COLORS.accentCyan, 0.3)}`,
                }}
                onClick={() => setShowSyncNotes(!showSyncNotes)}
              >
                <Bell size={8} className="inline" /> {syncCount - urgentCount}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className="text-xs font-mono px-1.5 py-0.5 rounded-sm"
              style={{
                backgroundColor: getGlowColor(priorityColor, 0.15),
                color: priorityColor,
                border: `1px solid ${getGlowColor(priorityColor, 0.3)}`,
              }}
            >
              {PRIORITY_LABELS[task.priority]}
            </span>
            <span
              className="text-xs font-mono px-1.5 py-0.5 rounded-sm"
              style={{
                backgroundColor: getGlowColor(statusColor, 0.15),
                color: statusColor,
                border: `1px solid ${getGlowColor(statusColor, 0.3)}`,
              }}
            >
              {STATUS_LABELS[task.status]}
            </span>
            {overdue && (
              <span
                className="text-xs font-mono px-1.5 py-0.5 rounded-sm"
                style={{
                  backgroundColor: getGlowColor(CYBERPUNK_COLORS.accentRed, 0.15),
                  color: CYBERPUNK_COLORS.accentRed,
                  border: `1px solid ${getGlowColor(CYBERPUNK_COLORS.accentRed, 0.3)}`,
                }}
              >
                已逾期
              </span>
            )}
          </div>
          {task.description && (
            <div className="text-xs font-mono leading-relaxed" style={{ color: CYBERPUNK_COLORS.textSecondary }}>
              {task.description}
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-3">
          {renderSyncNotes(task)}

          <div
            className="rounded-sm border p-2.5 space-y-2"
            style={{ borderColor: CYBERPUNK_COLORS.borderColor, backgroundColor: CYBERPUNK_COLORS.bgTertiary }}
          >
            <div className="text-xs font-mono font-bold" style={{ color: CYBERPUNK_COLORS.accentCyan }}>
              任务信息
            </div>

            <div className="flex items-center gap-2">
              <User size={12} style={{ color: CYBERPUNK_COLORS.accentPurple }} />
              <span className="text-xs font-mono" style={{ color: CYBERPUNK_COLORS.textSecondary }}>
                责任人:
              </span>
              {task.assigneeName ? (
                <span className="text-xs font-mono" style={{ color: CYBERPUNK_COLORS.accentPurple }}>
                  {task.assigneeName}
                </span>
              ) : (
                <span className="text-xs font-mono" style={{ color: CYBERPUNK_COLORS.textSecondary }}>
                  未分配
                </span>
              )}
            </div>

            {isActive && (
              <div>
                <select
                  value={task.assigneeId ?? ''}
                  onChange={(e) => {
                    if (e.target.value) handleAssign(task, e.target.value);
                  }}
                  className="w-full text-xs font-mono px-2 py-1 border rounded-sm"
                  style={{
                    ...selectStyle,
                    color: task.assigneeId ? CYBERPUNK_COLORS.accentPurple : CYBERPUNK_COLORS.textSecondary,
                  }}
                >
                  <option value="">重新分配...</option>
                  {collaborators.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
            )}

            <div className="flex items-center gap-2">
              <Calendar size={12} style={{ color: overdue ? CYBERPUNK_COLORS.accentRed : CYBERPUNK_COLORS.accentYellow }} />
              <span className="text-xs font-mono" style={{ color: CYBERPUNK_COLORS.textSecondary }}>
                截止时间:
              </span>
              {task.deadline ? (
                <span
                  className="text-xs font-mono"
                  style={{
                    color: overdue
                      ? CYBERPUNK_COLORS.accentRed
                      : daysLeft !== null && daysLeft <= 3
                      ? CYBERPUNK_COLORS.accentYellow
                      : CYBERPUNK_COLORS.textPrimary,
                  }}
                >
                  {formatDeadline(task.deadline)}
                  {daysLeft !== null && !overdue && ` (${daysLeft}天剩余)`}
                  {overdue && ` (逾期${Math.abs(daysLeft!)}天)`}
                </span>
              ) : (
                <span className="text-xs font-mono" style={{ color: CYBERPUNK_COLORS.textSecondary }}>
                  未设置
                </span>
              )}
            </div>

            {isActive && (
              <div>
                <input
                  type="datetime-local"
                  className="w-full text-xs font-mono px-2 py-1 border rounded-sm"
                  style={selectStyle}
                  onChange={(e) => {
                    if (currentCollaboratorId && e.target.value) {
                      updateTask(task.id, { deadline: new Date(e.target.value).toISOString() }, currentCollaboratorId);
                    }
                  }}
                />
              </div>
            )}

            <div className="flex items-center gap-2">
              <span className="text-xs font-mono" style={{ color: CYBERPUNK_COLORS.textSecondary }}>
                创建者: {task.createdByName}
              </span>
            </div>

            {isActive && (
              <div className="flex gap-2 pt-1">
                {task.status === 'pending' && (
                  <NeonButton
                    size="sm"
                    variant="warning"
                    icon={<Clock size={12} />}
                    onClick={() => handleStatusChange(task, 'in_progress')}
                  >
                    开始
                  </NeonButton>
                )}
                {task.status === 'in_progress' && (
                  <NeonButton
                    size="sm"
                    variant="success"
                    icon={<CheckCircle2 size={12} />}
                    onClick={() => handleStatusChange(task, 'completed')}
                  >
                    完成
                  </NeonButton>
                )}
                <NeonButton
                  size="sm"
                  variant="secondary"
                  onClick={() => handleStatusChange(task, 'cancelled')}
                >
                  取消任务
                </NeonButton>
              </div>
            )}
          </div>

          <div
            className="rounded-sm border p-2.5 space-y-2"
            style={{ borderColor: CYBERPUNK_COLORS.borderColor, backgroundColor: CYBERPUNK_COLORS.bgTertiary }}
          >
            <div className="flex items-center justify-between">
              <div className="text-xs font-mono font-bold flex items-center gap-1" style={{ color: CYBERPUNK_COLORS.accentCyan }}>
                <FileText size={12} />
                关联证据 ({task.evidenceIds.length})
              </div>
              {isActive && (
                <button
                  className="text-xs font-mono px-1.5 py-0.5 rounded-sm border transition-all"
                  style={{
                    borderColor: CYBERPUNK_COLORS.accentCyan,
                    color: CYBERPUNK_COLORS.accentCyan,
                    backgroundColor: showLinkEvidence ? getGlowColor(CYBERPUNK_COLORS.accentCyan, 0.1) : 'transparent',
                  }}
                  onClick={() => setShowLinkEvidence(!showLinkEvidence)}
                >
                  +关联
                </button>
              )}
            </div>
            {task.evidenceIds.length === 0 && !showLinkEvidence && (
              <div className="text-xs font-mono" style={{ color: CYBERPUNK_COLORS.textSecondary }}>
                暂无关联证据
              </div>
            )}
            {task.evidenceIds.map((eid) => (
              <div
                key={eid}
                className="flex items-center gap-1 text-xs font-mono px-1.5 py-1 rounded-sm"
                style={{
                  backgroundColor: getGlowColor(CYBERPUNK_COLORS.accentPurple, 0.08),
                  color: CYBERPUNK_COLORS.accentPurple,
                  border: `1px solid ${getGlowColor(CYBERPUNK_COLORS.accentPurple, 0.2)}`,
                }}
              >
                <FileText size={10} />
                <span className="flex-1 truncate">{getEvidenceLabel(eid)}</span>
                {isActive && (
                  <button
                    className="p-0.5 transition-colors flex-shrink-0"
                    style={{ color: CYBERPUNK_COLORS.textSecondary }}
                    onClick={() => handleUnlinkEvidence(eid)}
                    onMouseEnter={(e) => { e.currentTarget.style.color = CYBERPUNK_COLORS.accentRed; }}
                    onMouseLeave={(e) => { e.currentTarget.style.color = CYBERPUNK_COLORS.textSecondary; }}
                  >
                    <X size={10} />
                  </button>
                )}
              </div>
            ))}
            {showLinkEvidence && (
              <div className="flex flex-wrap gap-1 max-h-32 overflow-y-auto">
                {evidenceList
                  .filter((ev) => !task.evidenceIds.includes(ev.id))
                  .map((ev) => (
                    <button
                      key={ev.id}
                      className="text-xs font-mono px-1.5 py-0.5 rounded-sm border transition-all"
                      style={{
                        borderColor: getGlowColor(CYBERPUNK_COLORS.accentCyan, 0.3),
                        color: CYBERPUNK_COLORS.accentCyan,
                        backgroundColor: 'transparent',
                      }}
                      onClick={() => handleLinkEvidence(ev.id)}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = getGlowColor(CYBERPUNK_COLORS.accentCyan, 0.1);
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent';
                      }}
                    >
                      {ev.content.slice(0, 16)}...
                    </button>
                  ))}
              </div>
            )}
          </div>

          <div
            className="rounded-sm border p-2.5 space-y-2"
            style={{ borderColor: CYBERPUNK_COLORS.borderColor, backgroundColor: CYBERPUNK_COLORS.bgTertiary }}
          >
            <div className="flex items-center justify-between">
              <div className="text-xs font-mono font-bold flex items-center gap-1" style={{ color: CYBERPUNK_COLORS.accentCyan }}>
                <ShieldCheck size={12} />
                关联采集项 ({task.collectionItemIds.length})
              </div>
              {isActive && (
                <button
                  className="text-xs font-mono px-1.5 py-0.5 rounded-sm border transition-all"
                  style={{
                    borderColor: CYBERPUNK_COLORS.accentCyan,
                    color: CYBERPUNK_COLORS.accentCyan,
                    backgroundColor: showLinkCollection ? getGlowColor(CYBERPUNK_COLORS.accentCyan, 0.1) : 'transparent',
                  }}
                  onClick={() => setShowLinkCollection(!showLinkCollection)}
                >
                  +关联
                </button>
              )}
            </div>
            {task.collectionItemIds.length === 0 && !showLinkCollection && (
              <div className="text-xs font-mono" style={{ color: CYBERPUNK_COLORS.textSecondary }}>
                暂无关联采集项
              </div>
            )}
            {task.collectionItemIds.map((cid) => (
              <div
                key={cid}
                className="flex items-center gap-1 text-xs font-mono px-1.5 py-1 rounded-sm"
                style={{
                  backgroundColor: getGlowColor(CYBERPUNK_COLORS.accentGreen, 0.08),
                  color: CYBERPUNK_COLORS.accentGreen,
                  border: `1px solid ${getGlowColor(CYBERPUNK_COLORS.accentGreen, 0.2)}`,
                }}
              >
                <ShieldCheck size={10} />
                <span className="flex-1 truncate">{getCollectionLabel(cid)}</span>
                {isActive && (
                  <button
                    className="p-0.5 transition-colors flex-shrink-0"
                    style={{ color: CYBERPUNK_COLORS.textSecondary }}
                    onClick={() => handleUnlinkCollection(cid)}
                    onMouseEnter={(e) => { e.currentTarget.style.color = CYBERPUNK_COLORS.accentRed; }}
                    onMouseLeave={(e) => { e.currentTarget.style.color = CYBERPUNK_COLORS.textSecondary; }}
                  >
                    <X size={10} />
                  </button>
                )}
              </div>
            ))}
            {showLinkCollection && (
              <div className="flex flex-wrap gap-1 max-h-32 overflow-y-auto">
                {collectionItems
                  .filter((item) => !task.collectionItemIds.includes(item.id) && !item.archivedAt)
                  .map((item) => (
                    <button
                      key={item.id}
                      className="text-xs font-mono px-1.5 py-0.5 rounded-sm border transition-all"
                      style={{
                        borderColor: getGlowColor(CYBERPUNK_COLORS.accentGreen, 0.3),
                        color: CYBERPUNK_COLORS.accentGreen,
                        backgroundColor: 'transparent',
                      }}
                      onClick={() => handleLinkCollection(item.id)}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = getGlowColor(CYBERPUNK_COLORS.accentGreen, 0.1);
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent';
                      }}
                    >
                      {item.content.slice(0, 20)}...
                    </button>
                  ))}
              </div>
            )}
          </div>

          <div
            className="rounded-sm border p-2.5 space-y-2"
            style={{ borderColor: CYBERPUNK_COLORS.borderColor, backgroundColor: CYBERPUNK_COLORS.bgTertiary }}
          >
            <div className="flex items-center justify-between">
              <div className="text-xs font-mono font-bold flex items-center gap-1" style={{ color: CYBERPUNK_COLORS.accentCyan }}>
                <Link2 size={12} />
                关联关系线 ({task.connectionIds.length})
              </div>
              {isActive && (
                <button
                  className="text-xs font-mono px-1.5 py-0.5 rounded-sm border transition-all"
                  style={{
                    borderColor: CYBERPUNK_COLORS.accentCyan,
                    color: CYBERPUNK_COLORS.accentCyan,
                    backgroundColor: showLinkConnection ? getGlowColor(CYBERPUNK_COLORS.accentCyan, 0.1) : 'transparent',
                  }}
                  onClick={() => setShowLinkConnection(!showLinkConnection)}
                >
                  +关联
                </button>
              )}
            </div>
            {task.connectionIds.length === 0 && !showLinkConnection && (
              <div className="text-xs font-mono" style={{ color: CYBERPUNK_COLORS.textSecondary }}>
                暂无关联关系线
              </div>
            )}
            {task.connectionIds.map((cid) => (
              <div
                key={cid}
                className="flex items-center gap-1 text-xs font-mono px-1.5 py-1 rounded-sm"
                style={{
                  backgroundColor: getGlowColor(CYBERPUNK_COLORS.accentYellow, 0.08),
                  color: CYBERPUNK_COLORS.accentYellow,
                  border: `1px solid ${getGlowColor(CYBERPUNK_COLORS.accentYellow, 0.2)}`,
                }}
              >
                <Link2 size={10} />
                <span className="flex-1 truncate">{getConnectionLabel(cid)}</span>
                {isActive && (
                  <button
                    className="p-0.5 transition-colors flex-shrink-0"
                    style={{ color: CYBERPUNK_COLORS.textSecondary }}
                    onClick={() => handleUnlinkConnection(cid)}
                    onMouseEnter={(e) => { e.currentTarget.style.color = CYBERPUNK_COLORS.accentRed; }}
                    onMouseLeave={(e) => { e.currentTarget.style.color = CYBERPUNK_COLORS.textSecondary; }}
                  >
                    <X size={10} />
                  </button>
                )}
              </div>
            ))}
            {showLinkConnection && (
              <div className="flex flex-wrap gap-1 max-h-32 overflow-y-auto">
                {connections
                  .filter((conn) => !task.connectionIds.includes(conn.id))
                  .map((conn) => (
                    <button
                      key={conn.id}
                      className="text-xs font-mono px-1.5 py-0.5 rounded-sm border transition-all"
                      style={{
                        borderColor: getGlowColor(CYBERPUNK_COLORS.accentYellow, 0.3),
                        color: CYBERPUNK_COLORS.accentYellow,
                        backgroundColor: 'transparent',
                      }}
                      onClick={() => handleLinkConnection(conn.id)}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = getGlowColor(CYBERPUNK_COLORS.accentYellow, 0.1);
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent';
                      }}
                    >
                      {getConnectionLabel(conn.id).slice(0, 22)}
                    </button>
                  ))}
              </div>
            )}
          </div>
        </div>
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
          <ClipboardList
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
            侦查任务
          </span>
          <span
            className="text-xs font-mono px-1.5 py-0.5 rounded-sm"
            style={{
              backgroundColor: getGlowColor(CYBERPUNK_COLORS.accentCyan, 0.1),
              color: CYBERPUNK_COLORS.accentCyan,
            }}
          >
            {tasks.length}
          </span>
          {totalSyncNotes > 0 && (
            <span
              className="text-xs font-mono px-1.5 py-0.5 rounded-sm flex items-center gap-1"
              style={{
                backgroundColor: getGlowColor(CYBERPUNK_COLORS.accentYellow, 0.15),
                color: CYBERPUNK_COLORS.accentYellow,
                border: `1px solid ${getGlowColor(CYBERPUNK_COLORS.accentYellow, 0.3)}`,
              }}
            >
              <Bell size={10} />
              {totalSyncNotes}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {currentCase && (
            <button
              className="p-1 transition-colors"
              style={{ color: CYBERPUNK_COLORS.textSecondary }}
              onClick={() => { loadTasks(currentCase.id); loadCollectionItems(currentCase.id); }}
              title="刷新"
            >
              <RefreshCw size={14} />
            </button>
          )}
          <button
            onClick={togglePanel}
            className="p-1 transition-colors"
            style={{ color: CYBERPUNK_COLORS.textSecondary }}
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {currentTask ? (
        renderTaskDetail()
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
                新建侦查任务
              </NeonButton>
              {!currentCollaboratorId && (
                <div className="text-xs font-mono mt-1 text-center" style={{ color: CYBERPUNK_COLORS.accentYellow }}>
                  请先选择当前角色
                </div>
              )}
            </div>
          )}
          {showCreateForm && renderCreateForm()}
          {renderTaskList()}
        </>
      )}
    </div>
  );
};

export default InvestigationTaskPanel;
