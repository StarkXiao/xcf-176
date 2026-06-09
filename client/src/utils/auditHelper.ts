import { auditLogApi } from '@/api/auditLogApi';
import { useUiStore } from '@/store/useUiStore';
import { useCaseStore } from '@/store/useCaseStore';
import type { CreateAuditLogDto, AuditAction } from '@/types';

const DEFAULT_COLLABORATOR_ID = 'system';

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
