import { ConnectionGroupRepository } from '../repositories/ConnectionGroupRepository.js';
import { ConnectionRepository } from '../repositories/ConnectionRepository.js';
import type { ConnectionGroup, CreateConnectionGroupDto, UpdateConnectionGroupDto, ConnectionTypeStats, BulkUpdateConnectionsByTypeDto, BulkUpdateConnectionsByLabelDto, BulkToggleVisibilityDto, BulkApplyStyleDto } from '@shared/types';
import { AnomalyAlertService } from './AnomalyAlertService.js';

export const ConnectionGroupService = {
  getAllGroups: (): ConnectionGroup[] => {
    return ConnectionGroupRepository.findAll();
  },

  getGroupById: (id: string): ConnectionGroup | null => {
    return ConnectionGroupRepository.findById(id);
  },

  getGroupsByCaseId: (caseId: string): ConnectionGroup[] => {
    return ConnectionGroupRepository.findByCaseId(caseId);
  },

  createGroup: (dto: CreateConnectionGroupDto): ConnectionGroup => {
    return ConnectionGroupRepository.create(dto);
  },

  updateGroup: (id: string, dto: UpdateConnectionGroupDto): ConnectionGroup | null => {
    const group = ConnectionGroupRepository.update(id, dto);
    if (group && dto.color && dto.connectionIds && dto.connectionIds.length > 0) {
      ConnectionRepository.bulkUpdateByIds(dto.connectionIds, { color: dto.color });
    }
    return group;
  },

  deleteGroup: (id: string): boolean => {
    return ConnectionGroupRepository.delete(id);
  },

  getConnectionTypeStats: (caseId: string): ConnectionTypeStats[] => {
    return ConnectionRepository.getTypeStats(caseId);
  },

  bulkUpdateByRelationType: (dto: BulkUpdateConnectionsByTypeDto): { updated: number; connections: any[] } => {
    const updateDto: { color?: string; lineStyle?: any; relationTypeId?: string | null } = {};
    if (dto.color !== undefined) updateDto.color = dto.color;
    if (dto.lineStyle !== undefined) updateDto.lineStyle = dto.lineStyle;

    const updated = ConnectionRepository.bulkUpdateByRelationType(dto.caseId, dto.relationTypeId, updateDto);
    const connections = ConnectionRepository.findByRelationTypeId(dto.caseId, dto.relationTypeId);

    AnomalyAlertService.runDetectionForCase(dto.caseId);

    return { updated, connections };
  },

  bulkUpdateByLabel: (dto: BulkUpdateConnectionsByLabelDto): { updated: number; connections: any[] } => {
    const updateDto: { color?: string; lineStyle?: any; relationTypeId?: string | null } = {};
    if (dto.color !== undefined) updateDto.color = dto.color;
    if (dto.lineStyle !== undefined) updateDto.lineStyle = dto.lineStyle;

    const updated = ConnectionRepository.bulkUpdateByLabel(dto.caseId, dto.label, updateDto);
    const connections = ConnectionRepository.findByLabel(dto.caseId, dto.label);

    AnomalyAlertService.runDetectionForCase(dto.caseId);

    return { updated, connections };
  },

  bulkApplyStyle: (dto: BulkApplyStyleDto): { updated: number } => {
    const updateDto: { color?: string; lineStyle?: any; relationTypeId?: string | null } = {};
    if (dto.color !== undefined) updateDto.color = dto.color;
    if (dto.lineStyle !== undefined) updateDto.lineStyle = dto.lineStyle;
    if (dto.relationTypeId !== undefined) updateDto.relationTypeId = dto.relationTypeId;

    const updated = ConnectionRepository.bulkUpdateByIds(dto.connectionIds, updateDto);

    AnomalyAlertService.runDetectionForCase(dto.caseId);

    return { updated };
  },

  addConnectionToGroup: (groupId: string, connectionId: string): ConnectionGroup | null => {
    return ConnectionGroupRepository.addConnectionToGroup(groupId, connectionId);
  },

  removeConnectionFromGroup: (groupId: string, connectionId: string): ConnectionGroup | null => {
    return ConnectionGroupRepository.removeConnectionFromGroup(groupId, connectionId);
  },

  toggleGroupVisibility: (groupId: string): ConnectionGroup | null => {
    return ConnectionGroupRepository.toggleGroupVisibility(groupId);
  },

  autoCreateGroupsFromTypes: (caseId: string, relationTypes: Array<{ id: string; label: string; color: string; lineStyle: any }>): ConnectionGroup[] => {
    const existingGroups = ConnectionGroupRepository.findByCaseId(caseId);
    const existingTypeIds = new Set(existingGroups.map(g => g.relationTypeId).filter(Boolean));
    const createdGroups: ConnectionGroup[] = [];

    for (const type of relationTypes) {
      if (!existingTypeIds.has(type.id)) {
        const connections = ConnectionRepository.findByLabel(caseId, type.label);
        const connectionIds = connections.map(c => c.id);

        const group = ConnectionGroupRepository.create({
          caseId,
          name: type.label,
          color: type.color,
          lineStyle: type.lineStyle,
          relationTypeId: type.id,
          connectionIds,
        });
        createdGroups.push(group);
      }
    }

    return createdGroups;
  },

  getVisibleConnectionIds: (caseId: string): Set<string> => {
    const groups = ConnectionGroupRepository.findByCaseId(caseId);
    const visibleIds = new Set<string>();

    for (const group of groups) {
      if (group.visible) {
        group.connectionIds.forEach(id => visibleIds.add(id));
      }
    }

    return visibleIds;
  },
};
