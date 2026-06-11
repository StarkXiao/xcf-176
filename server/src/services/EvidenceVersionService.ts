import { EvidenceVersionRepository } from '../repositories/EvidenceVersionRepository.js';
import { EvidenceRepository } from '../repositories/EvidenceRepository.js';
import { ConnectionRepository } from '../repositories/ConnectionRepository.js';
import type {
  Evidence,
  EvidenceVersion,
  CreateEvidenceVersionDto,
  UpdateEvidenceDto,
  CreateEvidenceDto,
  FieldDiff,
  TagChange,
  RelationChange,
  EvidenceChangeType,
  VersionDiffResult,
  Connection,
  CreateConnectionDto,
} from '@shared/types';

const FIELD_LABELS: Record<string, string> = {
  content: '内容',
  source: '来源',
  importance: '重要性',
  tags: '标签',
  positionX: '位置X',
  positionY: '位置Y',
  width: '宽度',
  height: '高度',
  color: '颜色',
  timestamp: '时间戳',
  assignedTo: '负责人',
  status: '状态',
};

const IMPORTANCE_LABELS: Record<string, string> = {
  low: '低',
  normal: '普通',
  high: '高',
  critical: '关键',
};

const STATUS_LABELS: Record<string, string> = {
  pending: '待处理',
  in_progress: '进行中',
  completed: '已完成',
  reviewed: '已审核',
};

export const EvidenceVersionService = {
  computeFieldDiffs: (
    before: Partial<Evidence> | null,
    after: Partial<Evidence> | null
  ): { fieldDiffs: FieldDiff[]; tagChanges: TagChange[] } => {
    const fieldDiffs: FieldDiff[] = [];
    const tagChanges: TagChange[] = [];

    if (!before || !after) {
      return { fieldDiffs, tagChanges };
    }

    const allFields = new Set([...Object.keys(before), ...Object.keys(after)]);

    for (const field of allFields) {
      const beforeVal = (before as Record<string, unknown>)[field];
      const afterVal = (after as Record<string, unknown>)[field];

      if (field === 'tags') {
        const beforeTags = (beforeVal as string[]) || [];
        const afterTags = (afterVal as string[]) || [];
        const beforeSet = new Set(beforeTags);
        const afterSet = new Set(afterTags);

        for (const tag of afterTags) {
          if (!beforeSet.has(tag)) {
            tagChanges.push({ type: 'add', tag });
          }
        }
        for (const tag of beforeTags) {
          if (!afterSet.has(tag)) {
            tagChanges.push({ type: 'remove', tag });
          }
        }

        if (tagChanges.length > 0) {
          fieldDiffs.push({
            field,
            fieldLabel: FIELD_LABELS[field] || field,
            oldValue: beforeTags,
            newValue: afterTags,
          });
        }
        continue;
      }

      if (JSON.stringify(beforeVal) !== JSON.stringify(afterVal)) {
        fieldDiffs.push({
          field,
          fieldLabel: FIELD_LABELS[field] || field,
          oldValue: beforeVal ?? null,
          newValue: afterVal ?? null,
        });
      }
    }

    return { fieldDiffs, tagChanges };
  },

  determineChangeType: (
    fieldDiffs: FieldDiff[],
    tagChanges: TagChange[],
    relationChanges: RelationChange[]
  ): EvidenceChangeType => {
    if (relationChanges.length > 0) {
      const hasAdd = relationChanges.some((r) => r.type === 'add');
      const hasRemove = relationChanges.some((r) => r.type === 'remove');
      const hasUpdate = relationChanges.some((r) => r.type === 'update');
      if (hasAdd) return 'relation_add';
      if (hasRemove) return 'relation_remove';
      if (hasUpdate) return 'relation_update';
    }

    if (tagChanges.length > 0) {
      return 'update_tags';
    }

    if (fieldDiffs.length === 0) {
      return 'update_content';
    }

    const priorityFields: Array<{ field: string; type: EvidenceChangeType }> = [
      { field: 'content', type: 'update_content' },
      { field: 'importance', type: 'update_importance' },
      { field: 'status', type: 'update_status' },
      { field: 'assignedTo', type: 'update_assignment' },
      { field: 'timestamp', type: 'update_timestamp' },
      { field: 'source', type: 'update_source' },
      { field: 'color', type: 'update_color' },
      { field: 'positionX', type: 'update_position' },
      { field: 'positionY', type: 'update_position' },
      { field: 'width', type: 'update_size' },
      { field: 'height', type: 'update_size' },
    ];

    for (const { field, type } of priorityFields) {
      if (fieldDiffs.some((d) => d.field === field)) {
        return type;
      }
    }

    return 'update_content';
  },

  generateChangeSummary: (
    changeType: EvidenceChangeType,
    fieldDiffs: FieldDiff[],
    tagChanges: TagChange[],
    relationChanges: RelationChange[]
  ): string => {
    const parts: string[] = [];

    for (const diff of fieldDiffs) {
      if (diff.field === 'tags') continue;
      let oldStr = String(diff.oldValue ?? '(空)');
      let newStr = String(diff.newValue ?? '(空)');

      if (diff.field === 'importance') {
        oldStr = IMPORTANCE_LABELS[String(diff.oldValue)] || oldStr;
        newStr = IMPORTANCE_LABELS[String(diff.newValue)] || newStr;
      }
      if (diff.field === 'status') {
        oldStr = STATUS_LABELS[String(diff.oldValue)] || oldStr;
        newStr = STATUS_LABELS[String(diff.newValue)] || newStr;
      }
      if (diff.field === 'content') {
        oldStr = oldStr.length > 30 ? oldStr.slice(0, 30) + '...' : oldStr;
        newStr = newStr.length > 30 ? newStr.slice(0, 30) + '...' : newStr;
      }
      if (diff.field === 'assignedTo') {
        oldStr = oldStr === 'null' || oldStr === '' ? '(未分配)' : oldStr;
        newStr = newStr === 'null' || newStr === '' ? '(未分配)' : newStr;
      }

      parts.push(`${diff.fieldLabel}: ${oldStr} → ${newStr}`);
    }

    for (const tc of tagChanges) {
      parts.push(`${tc.type === 'add' ? '添加标签' : '移除标签'}: ${tc.tag}`);
    }

    for (const rc of relationChanges) {
      if (rc.type === 'add') {
        parts.push(`添加关联: ${rc.fromEvidenceId} → ${rc.toEvidenceId}${rc.newLabel ? ` (${rc.newLabel})` : ''}`);
      } else if (rc.type === 'remove') {
        parts.push(`移除关联: ${rc.fromEvidenceId} → ${rc.toEvidenceId}`);
      } else {
        const labelChanges = [];
        if (rc.oldLabel !== rc.newLabel) labelChanges.push(`标签: ${rc.oldLabel}→${rc.newLabel}`);
        if (rc.oldColor !== rc.newColor) labelChanges.push(`颜色变更`);
        if (rc.oldLineStyle !== rc.newLineStyle) labelChanges.push(`线型变更`);
        parts.push(`更新关联(${rc.connectionId}): ${labelChanges.join(', ')}`);
      }
    }

    if (changeType === 'create') return '创建证据';
    if (changeType === 'delete') return '删除证据';
    if (changeType === 'restore') return '恢复历史版本';

    return parts.length > 0 ? parts.join('; ') : '无显著变更';
  },

  recordEvidenceCreate: (
    evidence: Evidence,
    collaboratorId?: string | null,
    collaboratorName?: string | null
  ): EvidenceVersion => {
    const dto: CreateEvidenceVersionDto = {
      evidenceId: evidence.id,
      caseId: evidence.caseId,
      changeType: 'create',
      changeSummary: '创建证据',
      beforeState: null,
      afterState: { ...evidence },
      fieldDiffs: [],
      tagChanges: [],
      relationChanges: [],
      relatedConnectionsSnapshot: [],
      collaboratorId: collaboratorId ?? null,
      collaboratorName: collaboratorName ?? null,
    };
    return EvidenceVersionRepository.create(dto);
  },

  recordEvidenceUpdate: (
    evidenceId: string,
    dto: UpdateEvidenceDto,
    before: Evidence,
    after: Evidence,
    collaboratorId?: string | null,
    collaboratorName?: string | null
  ): EvidenceVersion | null => {
    const { fieldDiffs, tagChanges } = EvidenceVersionService.computeFieldDiffs(before, after);
    if (fieldDiffs.length === 0 && tagChanges.length === 0) {
      return null;
    }

    const changeType = EvidenceVersionService.determineChangeType(fieldDiffs, tagChanges, []);
    const changeSummary = EvidenceVersionService.generateChangeSummary(changeType, fieldDiffs, tagChanges, []);
    const connections = ConnectionRepository.findByEvidenceId(evidenceId);

    const versionDto: CreateEvidenceVersionDto = {
      evidenceId,
      caseId: after.caseId,
      changeType,
      changeSummary,
      beforeState: { ...before },
      afterState: { ...after },
      fieldDiffs,
      tagChanges,
      relationChanges: [],
      relatedConnectionsSnapshot: connections,
      collaboratorId: collaboratorId ?? null,
      collaboratorName: collaboratorName ?? null,
    };

    return EvidenceVersionRepository.create(versionDto);
  },

  recordEvidenceDelete: (
    evidence: Evidence,
    collaboratorId?: string | null,
    collaboratorName?: string | null
  ): EvidenceVersion => {
    const connections = ConnectionRepository.findByEvidenceId(evidence.id);
    const dto: CreateEvidenceVersionDto = {
      evidenceId: evidence.id,
      caseId: evidence.caseId,
      changeType: 'delete',
      changeSummary: '删除证据',
      beforeState: { ...evidence },
      afterState: null,
      fieldDiffs: [],
      tagChanges: [],
      relationChanges: connections.map((c) => ({
        type: 'remove' as const,
        connectionId: c.id,
        fromEvidenceId: c.fromEvidenceId,
        toEvidenceId: c.toEvidenceId,
        oldLabel: c.label,
        oldColor: c.color,
        oldLineStyle: c.lineStyle,
      })),
      relatedConnectionsSnapshot: connections,
      collaboratorId: collaboratorId ?? null,
      collaboratorName: collaboratorName ?? null,
    };
    return EvidenceVersionRepository.create(dto);
  },

  recordRelationAdd: (
    connection: Connection,
    relatedEvidenceId: string,
    caseId: string,
    collaboratorId?: string | null,
    collaboratorName?: string | null
  ): EvidenceVersion => {
    const evidence = EvidenceRepository.findById(relatedEvidenceId);
    const connections = ConnectionRepository.findByEvidenceId(relatedEvidenceId);
    const relationChange: RelationChange = {
      type: 'add',
      connectionId: connection.id,
      fromEvidenceId: connection.fromEvidenceId,
      toEvidenceId: connection.toEvidenceId,
      newLabel: connection.label,
      newColor: connection.color,
      newLineStyle: connection.lineStyle,
    };

    const changeSummary = EvidenceVersionService.generateChangeSummary('relation_add', [], [], [relationChange]);

    const dto: CreateEvidenceVersionDto = {
      evidenceId: relatedEvidenceId,
      caseId,
      changeType: 'relation_add',
      changeSummary,
      beforeState: evidence ? { ...evidence } : null,
      afterState: evidence ? { ...evidence } : null,
      fieldDiffs: [],
      tagChanges: [],
      relationChanges: [relationChange],
      relatedConnectionsSnapshot: connections,
      collaboratorId: collaboratorId ?? null,
      collaboratorName: collaboratorName ?? null,
    };
    return EvidenceVersionRepository.create(dto);
  },

  recordRelationRemove: (
    connection: Connection,
    relatedEvidenceId: string,
    caseId: string,
    collaboratorId?: string | null,
    collaboratorName?: string | null
  ): EvidenceVersion => {
    const evidence = EvidenceRepository.findById(relatedEvidenceId);
    const connections = ConnectionRepository.findByEvidenceId(relatedEvidenceId);
    const relationChange: RelationChange = {
      type: 'remove',
      connectionId: connection.id,
      fromEvidenceId: connection.fromEvidenceId,
      toEvidenceId: connection.toEvidenceId,
      oldLabel: connection.label,
      oldColor: connection.color,
      oldLineStyle: connection.lineStyle,
    };

    const changeSummary = EvidenceVersionService.generateChangeSummary('relation_remove', [], [], [relationChange]);

    const dto: CreateEvidenceVersionDto = {
      evidenceId: relatedEvidenceId,
      caseId,
      changeType: 'relation_remove',
      changeSummary,
      beforeState: evidence ? { ...evidence } : null,
      afterState: evidence ? { ...evidence } : null,
      fieldDiffs: [],
      tagChanges: [],
      relationChanges: [relationChange],
      relatedConnectionsSnapshot: connections,
      collaboratorId: collaboratorId ?? null,
      collaboratorName: collaboratorName ?? null,
    };
    return EvidenceVersionRepository.create(dto);
  },

  recordRelationUpdate: (
    before: Connection,
    after: Connection,
    relatedEvidenceId: string,
    caseId: string,
    collaboratorId?: string | null,
    collaboratorName?: string | null
  ): EvidenceVersion | null => {
    const hasChange =
      before.label !== after.label ||
      before.color !== after.color ||
      before.lineStyle !== after.lineStyle;

    if (!hasChange) return null;

    const evidence = EvidenceRepository.findById(relatedEvidenceId);
    const connections = ConnectionRepository.findByEvidenceId(relatedEvidenceId);
    const relationChange: RelationChange = {
      type: 'update',
      connectionId: after.id,
      fromEvidenceId: after.fromEvidenceId,
      toEvidenceId: after.toEvidenceId,
      oldLabel: before.label,
      newLabel: after.label,
      oldColor: before.color,
      newColor: after.color,
      oldLineStyle: before.lineStyle,
      newLineStyle: after.lineStyle,
    };

    const changeSummary = EvidenceVersionService.generateChangeSummary('relation_update', [], [], [relationChange]);

    const dto: CreateEvidenceVersionDto = {
      evidenceId: relatedEvidenceId,
      caseId,
      changeType: 'relation_update',
      changeSummary,
      beforeState: evidence ? { ...evidence } : null,
      afterState: evidence ? { ...evidence } : null,
      fieldDiffs: [],
      tagChanges: [],
      relationChanges: [relationChange],
      relatedConnectionsSnapshot: connections,
      collaboratorId: collaboratorId ?? null,
      collaboratorName: collaboratorName ?? null,
    };
    return EvidenceVersionRepository.create(dto);
  },

  getVersionsByEvidenceId: (evidenceId: string): EvidenceVersion[] => {
    return EvidenceVersionRepository.findByEvidenceId(evidenceId);
  },

  getVersionsByCaseId: (caseId: string): EvidenceVersion[] => {
    return EvidenceVersionRepository.findByCaseId(caseId);
  },

  getVersionById: (versionId: string): EvidenceVersion | null => {
    return EvidenceVersionRepository.findById(versionId);
  },

  getLatestVersion: (evidenceId: string): EvidenceVersion | null => {
    return EvidenceVersionRepository.findLatestByEvidenceId(evidenceId);
  },

  getVersionsByDateRange: (caseId: string, startDate: string, endDate: string): EvidenceVersion[] => {
    return EvidenceVersionRepository.findByDateRange(caseId, startDate, endDate);
  },

  getVersionsByCollaborator: (collaboratorId: string): EvidenceVersion[] => {
    return EvidenceVersionRepository.findByCollaboratorId(collaboratorId);
  },

  compareVersions: (versionId: string): VersionDiffResult | null => {
    const version = EvidenceVersionRepository.findById(versionId);
    if (!version) return null;

    const readableSummary = EvidenceVersionService.generateChangeSummary(
      version.changeType,
      version.fieldDiffs,
      version.tagChanges,
      version.relationChanges
    );

    return {
      version,
      fieldDiffs: version.fieldDiffs,
      tagChanges: version.tagChanges,
      relationChanges: version.relationChanges,
      readableSummary,
    };
  },

  restoreToVersion: (
    versionId: string,
    collaboratorId?: string | null,
    collaboratorName?: string | null
  ): Evidence => {
    const targetVersion = EvidenceVersionRepository.findById(versionId);
    if (!targetVersion) {
      throw new Error('目标版本不存在');
    }

    const { changeType, beforeState, afterState, evidenceId, caseId } = targetVersion;

    let restoreState: Partial<Evidence> | null = null;

    if (changeType === 'delete') {
      restoreState = beforeState;
    } else {
      restoreState = afterState;
    }

    if (!restoreState) {
      throw new Error('目标版本无有效状态可恢复');
    }

    const existing = EvidenceRepository.findById(evidenceId);
    const existingIncludeDeleted = EvidenceRepository.findByIdIncludeDeleted(evidenceId);
    const isSoftDeleted = !existing && existingIncludeDeleted;
    const connectionsBefore = ConnectionRepository.findByEvidenceId(evidenceId);

    let restoredEvidence: Evidence;

    if (isSoftDeleted) {
      const beforeForDiff: Evidence = { ...existingIncludeDeleted! };
      const unarchived = EvidenceRepository.restore(evidenceId);
      if (!unarchived) {
        throw new Error('恢复软删除证据失败');
      }
      const updateDto: UpdateEvidenceDto = {};
      if (restoreState.content !== undefined) updateDto.content = restoreState.content;
      if (restoreState.source !== undefined) updateDto.source = restoreState.source;
      if (restoreState.importance !== undefined) updateDto.importance = restoreState.importance;
      if (restoreState.tags !== undefined) updateDto.tags = restoreState.tags;
      if (restoreState.positionX !== undefined) updateDto.positionX = restoreState.positionX;
      if (restoreState.positionY !== undefined) updateDto.positionY = restoreState.positionY;
      if (restoreState.width !== undefined) updateDto.width = restoreState.width;
      if (restoreState.height !== undefined) updateDto.height = restoreState.height;
      if (restoreState.color !== undefined) updateDto.color = restoreState.color;
      if (restoreState.timestamp !== undefined) updateDto.timestamp = restoreState.timestamp;
      if (restoreState.assignedTo !== undefined) updateDto.assignedTo = restoreState.assignedTo;
      if (restoreState.status !== undefined) updateDto.status = restoreState.status;

      const updateResult = EvidenceRepository.update(evidenceId, updateDto);
      restoredEvidence = updateResult ?? unarchived;

      ConnectionRepository.restoreByEvidenceId(evidenceId);

      const diffFromSoftDelete = EvidenceVersionService.computeFieldDiffs(beforeForDiff, restoredEvidence);
      const fd = diffFromSoftDelete.fieldDiffs;
      const tc = diffFromSoftDelete.tagChanges;
      // 立即记录恢复软删除版本并继续下面的关系同步
      const syncNow = () => ({ fieldDiffs: fd, tagChanges: tc });
      const synced = syncNow();

      const connectionChangesPre: RelationChange[] = [];
      if (targetVersion.relatedConnectionsSnapshot) {
        const currentConnsMap = new Map<Connection['id'], Connection>();
        const allCurrentAfterRestore = ConnectionRepository.findByEvidenceId(evidenceId);
        for (const c of allCurrentAfterRestore) currentConnsMap.set(c.id, c);
        const snapshotConnsMap = new Map(targetVersion.relatedConnectionsSnapshot.map((c) => [c.id, c]));
        const snapshotConnIds = new Set(targetVersion.relatedConnectionsSnapshot.map((c) => c.id));

        for (const [connId, sc] of snapshotConnsMap) {
          if (!currentConnsMap.has(connId)) {
            const fromExists = EvidenceRepository.findById(sc.fromEvidenceId);
            const toExists = EvidenceRepository.findById(sc.toEvidenceId);
            if (fromExists && toExists) {
              ConnectionRepository.createWithId(connId, {
                caseId: sc.caseId,
                fromEvidenceId: sc.fromEvidenceId,
                toEvidenceId: sc.toEvidenceId,
                label: sc.label,
                color: sc.color,
                lineStyle: sc.lineStyle,
              } as CreateConnectionDto);
              connectionChangesPre.push({
                type: 'add',
                connectionId: connId,
                fromEvidenceId: sc.fromEvidenceId,
                toEvidenceId: sc.toEvidenceId,
                newLabel: sc.label,
                newColor: sc.color,
                newLineStyle: sc.lineStyle,
              });
            }
          } else {
            const cc = currentConnsMap.get(connId)!;
            const hasChange = cc.label !== sc.label || cc.color !== sc.color || cc.lineStyle !== sc.lineStyle;
            if (hasChange) {
              ConnectionRepository.update(connId, {
                label: sc.label,
                color: sc.color,
                lineStyle: sc.lineStyle,
              });
              connectionChangesPre.push({
                type: 'update',
                connectionId: connId,
                fromEvidenceId: sc.fromEvidenceId,
                toEvidenceId: sc.toEvidenceId,
                oldLabel: cc.label,
                newLabel: sc.label,
                oldColor: cc.color,
                newColor: sc.color,
                oldLineStyle: cc.lineStyle,
                newLineStyle: sc.lineStyle,
              });
            }
          }
        }

        for (const [connId, cc] of currentConnsMap) {
          if (!snapshotConnIds.has(connId)) {
            connectionChangesPre.push({
              type: 'remove',
              connectionId: connId,
              fromEvidenceId: cc.fromEvidenceId,
              toEvidenceId: cc.toEvidenceId,
              oldLabel: cc.label,
              oldColor: cc.color,
              oldLineStyle: cc.lineStyle,
            });
            ConnectionRepository.delete(connId);
          }
        }
      }

      const connectionsAfter = ConnectionRepository.findByEvidenceId(evidenceId);
      const restoreDto: CreateEvidenceVersionDto = {
        evidenceId: restoredEvidence.id,
        caseId: restoredEvidence.caseId,
        changeType: 'restore',
        changeSummary: `恢复到版本 v${targetVersion.versionNumber}（${targetVersion.createdAt.slice(0, 19).replace('T', ' ')}）`,
        beforeState: existing ?? null,
        afterState: { ...restoredEvidence },
        fieldDiffs: synced.fieldDiffs,
        tagChanges: synced.tagChanges,
        relationChanges: connectionChangesPre,
        relatedConnectionsSnapshot: connectionsAfter,
        collaboratorId: collaboratorId ?? null,
        collaboratorName: collaboratorName ?? null,
        restoredFromVersionId: versionId,
      };
      EvidenceVersionRepository.create(restoreDto);
      return restoredEvidence;
    }

    if (!existing) {
      if (!restoreState.caseId) {
        restoreState.caseId = caseId;
      }
      const createDto = restoreState as CreateEvidenceDto;
      if (!createDto.content) {
        throw new Error('恢复数据不完整：缺少内容字段');
      }
      restoredEvidence = EvidenceRepository.createWithId(evidenceId, createDto);
    } else {
      const updateDto: UpdateEvidenceDto = {};
      if (restoreState.content !== undefined) updateDto.content = restoreState.content;
      if (restoreState.source !== undefined) updateDto.source = restoreState.source;
      if (restoreState.importance !== undefined) updateDto.importance = restoreState.importance;
      if (restoreState.tags !== undefined) updateDto.tags = restoreState.tags;
      if (restoreState.positionX !== undefined) updateDto.positionX = restoreState.positionX;
      if (restoreState.positionY !== undefined) updateDto.positionY = restoreState.positionY;
      if (restoreState.width !== undefined) updateDto.width = restoreState.width;
      if (restoreState.height !== undefined) updateDto.height = restoreState.height;
      if (restoreState.color !== undefined) updateDto.color = restoreState.color;
      if (restoreState.timestamp !== undefined) updateDto.timestamp = restoreState.timestamp;
      if (restoreState.assignedTo !== undefined) updateDto.assignedTo = restoreState.assignedTo;
      if (restoreState.status !== undefined) updateDto.status = restoreState.status;

      const result = EvidenceRepository.update(evidenceId, updateDto);
      if (!result) {
        throw new Error('恢复证据失败');
      }
      restoredEvidence = result;
    }

    const { fieldDiffs, tagChanges } = EvidenceVersionService.computeFieldDiffs(
      existing ?? null,
      restoredEvidence
    );

    const connectionChanges: RelationChange[] = [];
    if (targetVersion.relatedConnectionsSnapshot) {
      const currentConnsMap = new Map(connectionsBefore.map((c) => [c.id, c]));
      const snapshotConnsMap = new Map(targetVersion.relatedConnectionsSnapshot.map((c) => [c.id, c]));
      const snapshotConnIds = new Set(targetVersion.relatedConnectionsSnapshot.map((c) => c.id));

      for (const [connId, sc] of snapshotConnsMap) {
        if (!currentConnsMap.has(connId)) {
          const fromExists = EvidenceRepository.findById(sc.fromEvidenceId);
          const toExists = EvidenceRepository.findById(sc.toEvidenceId);
          if (fromExists && toExists) {
            ConnectionRepository.createWithId(connId, {
              caseId: sc.caseId,
              fromEvidenceId: sc.fromEvidenceId,
              toEvidenceId: sc.toEvidenceId,
              label: sc.label,
              color: sc.color,
              lineStyle: sc.lineStyle,
            } as CreateConnectionDto);
            connectionChanges.push({
              type: 'add',
              connectionId: connId,
              fromEvidenceId: sc.fromEvidenceId,
              toEvidenceId: sc.toEvidenceId,
              newLabel: sc.label,
              newColor: sc.color,
              newLineStyle: sc.lineStyle,
            });
          }
        } else {
          const cc = currentConnsMap.get(connId)!;
          const hasChange = cc.label !== sc.label || cc.color !== sc.color || cc.lineStyle !== sc.lineStyle;
          if (hasChange) {
            ConnectionRepository.update(connId, {
              label: sc.label,
              color: sc.color,
              lineStyle: sc.lineStyle,
            });
            connectionChanges.push({
              type: 'update',
              connectionId: connId,
              fromEvidenceId: sc.fromEvidenceId,
              toEvidenceId: sc.toEvidenceId,
              oldLabel: cc.label,
              newLabel: sc.label,
              oldColor: cc.color,
              newColor: sc.color,
              oldLineStyle: cc.lineStyle,
              newLineStyle: sc.lineStyle,
            });
          }
        }
      }

      for (const [connId, cc] of currentConnsMap) {
        if (!snapshotConnIds.has(connId)) {
          connectionChanges.push({
            type: 'remove',
            connectionId: connId,
            fromEvidenceId: cc.fromEvidenceId,
            toEvidenceId: cc.toEvidenceId,
            oldLabel: cc.label,
            oldColor: cc.color,
            oldLineStyle: cc.lineStyle,
          });
          ConnectionRepository.delete(connId);
        }
      }
    }

    const connectionsAfter = ConnectionRepository.findByEvidenceId(evidenceId);

    const restoreDto: CreateEvidenceVersionDto = {
      evidenceId: restoredEvidence.id,
      caseId: restoredEvidence.caseId,
      changeType: 'restore',
      changeSummary: `恢复到版本 v${targetVersion.versionNumber}（${targetVersion.createdAt.slice(0, 19).replace('T', ' ')}）`,
      beforeState: existing ? { ...existing } : null,
      afterState: { ...restoredEvidence },
      fieldDiffs,
      tagChanges,
      relationChanges: connectionChanges,
      relatedConnectionsSnapshot: connectionsAfter,
      collaboratorId: collaboratorId ?? null,
      collaboratorName: collaboratorName ?? null,
      restoredFromVersionId: versionId,
    };

    EvidenceVersionRepository.create(restoreDto);

    return restoredEvidence;
  },

  getVersionStats: (caseId: string): Record<string, unknown> => {
    const versions = EvidenceVersionRepository.findByCaseId(caseId);
    const byChangeType: Record<string, number> = {};
    const byCollaborator: Record<string, { name: string | null; count: number }> = {};
    const byEvidence: Record<string, number> = {};

    for (const v of versions) {
      byChangeType[v.changeType] = (byChangeType[v.changeType] || 0) + 1;

      const key = v.collaboratorId || 'unknown';
      if (!byCollaborator[key]) {
        byCollaborator[key] = { name: v.collaboratorName, count: 0 };
      }
      byCollaborator[key].count++;

      byEvidence[v.evidenceId] = (byEvidence[v.evidenceId] || 0) + 1;
    }

    return {
      totalVersions: versions.length,
      byChangeType,
      byCollaborator,
      byEvidence,
      uniqueEvidenceCount: Object.keys(byEvidence).length,
    };
  },

  _recordRestoreFromDelete: (
    restoredEvidence: Evidence,
    deletedInfo: Evidence & { deletedAt: string; deletedBy: string | null; deletedByName: string | null },
    collaboratorId: string | null,
    collaboratorName: string | null
  ): EvidenceVersion => {
    const beforeState: Partial<Evidence> & { deletedAt?: string; deletedBy?: string | null; deletedByName?: string | null } = { ...deletedInfo };
    delete beforeState.deletedAt;
    delete beforeState.deletedBy;
    delete beforeState.deletedByName;

    const { fieldDiffs, tagChanges } = EvidenceVersionService.computeFieldDiffs(
      beforeState as Partial<Evidence>,
      restoredEvidence
    );

    const connections = ConnectionRepository.findByEvidenceId(restoredEvidence.id);

    const dto: CreateEvidenceVersionDto = {
      evidenceId: restoredEvidence.id,
      caseId: restoredEvidence.caseId,
      changeType: 'restore',
      changeSummary: `恢复已删除的证据（删除于${deletedInfo.deletedAt.slice(0, 19).replace('T', ' ')}，操作人: ${deletedInfo.deletedByName ?? deletedInfo.deletedBy ?? '(未知)'}）`,
      beforeState: beforeState as Partial<Evidence>,
      afterState: { ...restoredEvidence },
      fieldDiffs,
      tagChanges,
      relationChanges: connections.map(c => ({
        type: 'add' as const,
        connectionId: c.id,
        fromEvidenceId: c.fromEvidenceId,
        toEvidenceId: c.toEvidenceId,
        newLabel: c.label,
        newColor: c.color,
        newLineStyle: c.lineStyle,
      })),
      relatedConnectionsSnapshot: connections,
      collaboratorId,
      collaboratorName,
    };
    return EvidenceVersionRepository.create(dto);
  },
};
