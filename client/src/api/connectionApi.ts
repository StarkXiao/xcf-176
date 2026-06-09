import { request } from './client';
import type { Connection, CreateConnectionDto, ApiResponse } from '@/types';

export interface UpdateConnectionDto {
  label?: string;
  color?: string;
  lineStyle?: Connection['lineStyle'];
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
};
