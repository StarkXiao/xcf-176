import { request } from './client';
import type { Connection, CreateConnectionDto, ApiResponse, ConnectionGroup, CreateConnectionGroupDto, UpdateConnectionGroupDto, ConnectionTypeStats, BulkUpdateConnectionsByTypeDto, BulkUpdateConnectionsByLabelDto, BulkApplyStyleDto, TemplateRelationType } from '@/types';

export interface UpdateConnectionDto {
  label?: string;
  color?: string;
  lineStyle?: Connection['lineStyle'];
  relationTypeId?: string | null;
}

export const connectionApi = {
  async getByCaseId(caseId: string): Promise<ApiResponse<Connection[]>> {
    return request<Connection[]>(`/connections?caseId=${caseId}`);
  },

  async create(data: CreateConnectionDto): Promise<ApiResponse<Connection>> {
    return request<Connection>('/connections', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async update(id: string, data: UpdateConnectionDto): Promise<ApiResponse<Connection>> {
    return request<Connection>(`/connections/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async delete(id: string): Promise<ApiResponse<void>> {
    return request<void>(`/connections/${id}`, {
      method: 'DELETE',
    });
  },

  async bulkCreate(connections: CreateConnectionDto[]): Promise<ApiResponse<Connection[]>> {
    return request<Connection[]>('/connections/bulk', {
      method: 'POST',
      body: JSON.stringify({ connections }),
    });
  },

  async getGroupsByCaseId(caseId: string): Promise<ApiResponse<ConnectionGroup[]>> {
    return request<ConnectionGroup[]>(`/connection-groups/case/${caseId}`);
  },

  async getGroupById(id: string): Promise<ApiResponse<ConnectionGroup>> {
    return request<ConnectionGroup>(`/connection-groups/${id}`);
  },

  async createGroup(data: CreateConnectionGroupDto): Promise<ApiResponse<ConnectionGroup>> {
    return request<ConnectionGroup>('/connection-groups', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async updateGroup(id: string, data: UpdateConnectionGroupDto): Promise<ApiResponse<ConnectionGroup>> {
    return request<ConnectionGroup>(`/connection-groups/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async deleteGroup(id: string): Promise<ApiResponse<void>> {
    return request<void>(`/connection-groups/${id}`, {
      method: 'DELETE',
    });
  },

  async getConnectionTypeStats(caseId: string): Promise<ApiResponse<ConnectionTypeStats[]>> {
    return request<ConnectionTypeStats[]>(`/connection-groups/stats/${caseId}`);
  },

  async bulkUpdateByType(data: BulkUpdateConnectionsByTypeDto): Promise<ApiResponse<{ updated: number; connections: Connection[] }>> {
    return request<{ updated: number; connections: Connection[] }>('/connection-groups/bulk/by-type', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async bulkUpdateByLabel(data: BulkUpdateConnectionsByLabelDto): Promise<ApiResponse<{ updated: number; connections: Connection[] }>> {
    return request<{ updated: number; connections: Connection[] }>('/connection-groups/bulk/by-label', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async bulkApplyStyle(data: BulkApplyStyleDto): Promise<ApiResponse<{ updated: number }>> {
    return request<{ updated: number }>('/connection-groups/bulk/apply-style', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async toggleGroupVisibility(id: string): Promise<ApiResponse<ConnectionGroup>> {
    return request<ConnectionGroup>(`/connection-groups/${id}/toggle-visibility`, {
      method: 'POST',
    });
  },

  async addConnectionToGroup(groupId: string, connectionId: string): Promise<ApiResponse<ConnectionGroup>> {
    return request<ConnectionGroup>(`/connection-groups/${groupId}/add-connection`, {
      method: 'POST',
      body: JSON.stringify({ connectionId }),
    });
  },

  async removeConnectionFromGroup(groupId: string, connectionId: string): Promise<ApiResponse<ConnectionGroup>> {
    return request<ConnectionGroup>(`/connection-groups/${groupId}/remove-connection`, {
      method: 'POST',
      body: JSON.stringify({ connectionId }),
    });
  },

  async autoCreateGroupsFromTypes(caseId: string, relationTypes: TemplateRelationType[]): Promise<ApiResponse<ConnectionGroup[]>> {
    return request<ConnectionGroup[]>('/connection-groups/auto-create', {
      method: 'POST',
      body: JSON.stringify({ caseId, relationTypes }),
    });
  },
};
