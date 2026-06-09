import { request } from './client';
import type { Collaborator, CreateCollaboratorDto, UpdateCollaboratorDto, ApiResponse } from '@/types';

export const collaboratorApi = {
  async getByCaseId(caseId: string): Promise<ApiResponse<Collaborator[]>> {
    return request<Collaborator[]>(`/collaborators/case/${caseId}`);
  },

  async create(data: CreateCollaboratorDto): Promise<ApiResponse<Collaborator>> {
    return request<Collaborator>('/collaborators', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async update(id: string, data: UpdateCollaboratorDto): Promise<ApiResponse<Collaborator>> {
    return request<Collaborator>(`/collaborators/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async delete(id: string): Promise<ApiResponse<void>> {
    return request<void>(`/collaborators/${id}`, {
      method: 'DELETE',
    });
  },
};
