import { auditLogApi } from '@/api/auditLogApi';
import { useUiStore } from '@/store/useUiStore';
import { useCaseStore } from '@/store/useCaseStore';
import type { CreateAuditLogDto, AuditAction, Evidence, Connection } from '@/types';

const DEFAULT_COLLABORATOR_ID = 'system';

function buildEvidenceSnapshot(ev: Evidence): string {
  return JSON.stringify({
    content: ev.content,
    source: ev.source,
    importance: ev.importance,
    tags: ev.tags,
    positionX: ev.positionX,
    positionY: ev.positionY,
    width: ev.width,
    height: ev.height,
    color: ev.color,
    timestamp: ev.timestamp,
    assignedTo: ev.assignedTo,
    status: ev.status,
  });
}

function buildConnectionSnapshot(conn: Connection): string {
  return JSON.stringify({
    label: conn.label,
    color: conn.color,
    lineStyle: conn.lineStyle,
  });
}

export function captureEvidenceSnapshot(ev: Evidence): string {
  return buildEvidenceSnapshot(ev);
}

export function captureConnectionSnapshot(conn: Connection): string {
  return buildConnectionSnapshot(conn);
}

export async function recordAuditLog(
  action: AuditAction,
  targetType: CreateAuditLogDto['targetType'],
  targetId: string,
  detail: string,
  snapshot?: string
): Promise<void> {
  const currentCase = useCaseStore.getState().currentCase;
  if (!currentCase) return;

  const collaboratorId = useUiStore.getState().currentCollaboratorId || DEFAULT_COLLABORATOR_ID;

  const dto: CreateAuditLogDto = {
    caseId: currentCase.id,
    collaboratorId,
    action,
    targetType,
    targetId,
    detail,
    snapshot,
  };

  try {
    await auditLogApi.create(dto);
  } catch (error) {
    console.error('Failed to record audit log:', error);
  }
}
