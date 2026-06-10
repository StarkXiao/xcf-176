import { request } from './client';
import type {
  InvestigationTask,
  InvestigationTaskStatus,
  CreateInvestigationTaskDto,
  UpdateInvestigationTaskDto,
  ApiResponse,
} from '@/types';

export const investigationTaskApi = {
  async getAll(): Promise<ApiResponse<InvestigationTask[]>> {
    return request<InvestigationTask[]>('/investigation-tasks');
  },

  async getByCaseId(caseId: string): Promise<ApiResponse<InvestigationTask[]>> {
    return request<InvestigationTask[]>(`/investigation-tasks/case/${caseId}`);
  },

  async getByStatus(caseId: string, status: InvestigationTaskStatus): Promise<ApiResponse<InvestigationTask[]>> {
    return request<InvestigationTask[]>(`/investigation-tasks/case/${caseId}/status?status=${status}`);
  },

  async getOverdue(caseId: string): Promise<ApiResponse<InvestigationTask[]>> {
    return request<InvestigationTask[]>(`/investigation-tasks/case/${caseId}/overdue`);
  },

  async getById(id: string): Promise<ApiResponse<InvestigationTask>> {
    return request<InvestigationTask>(`/investigation-tasks/${id}`);
  },

  async create(data: CreateInvestigationTaskDto): Promise<ApiResponse<InvestigationTask>> {
    return request<InvestigationTask>('/investigation-tasks', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async update(id: string, data: UpdateInvestigationTaskDto & { collaboratorId?: string }): Promise<ApiResponse<InvestigationTask>> {
    return request<InvestigationTask>(`/investigation-tasks/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async assign(id: string, assigneeId: string, collaboratorId: string): Promise<ApiResponse<InvestigationTask>> {
    return request<InvestigationTask>(`/investigation-tasks/${id}/assign`, {
      method: 'PUT',
      body: JSON.stringify({ assigneeId, collaboratorId }),
    });
  },

  async linkEvidence(id: string, evidenceId: string, collaboratorId: string): Promise<ApiResponse<InvestigationTask>> {
    return request<InvestigationTask>(`/investigation-tasks/${id}/link/evidence`, {
      method: 'POST',
      body: JSON.stringify({ evidenceId, collaboratorId }),
    });
  },

  async unlinkEvidence(id: string, evidenceId: string, collaboratorId: string): Promise<ApiResponse<InvestigationTask>> {
    return request<InvestigationTask>(`/investigation-tasks/${id}/unlink/evidence`, {
      method: 'POST',
      body: JSON.stringify({ evidenceId, collaboratorId }),
    });
  },

  async linkCollectionItem(id: string, collectionItemId: string, collaboratorId: string): Promise<ApiResponse<InvestigationTask>> {
    return request<InvestigationTask>(`/investigation-tasks/${id}/link/collection`, {
      method: 'POST',
      body: JSON.stringify({ collectionItemId, collaboratorId }),
    });
  },

  async unlinkCollectionItem(id: string, collectionItemId: string, collaboratorId: string): Promise<ApiResponse<InvestigationTask>> {
    return request<InvestigationTask>(`/investigation-tasks/${id}/unlink/collection`, {
      method: 'POST',
      body: JSON.stringify({ collectionItemId, collaboratorId }),
    });
  },

  async linkConnection(id: string, connectionId: string, collaboratorId: string): Promise<ApiResponse<InvestigationTask>> {
    return request<InvestigationTask>(`/investigation-tasks/${id}/link/connection`, {
      method: 'POST',
      body: JSON.stringify({ connectionId, collaboratorId }),
    });
  },

  async unlinkConnection(id: string, connectionId: string, collaboratorId: string): Promise<ApiResponse<InvestigationTask>> {
    return request<InvestigationTask>(`/investigation-tasks/${id}/unlink/connection`, {
      method: 'POST',
      body: JSON.stringify({ connectionId, collaboratorId }),
    });
  },

  async delete(id: string, collaboratorId?: string): Promise<ApiResponse<void>> {
    return request<void>(`/investigation-tasks/${id}`, {
      method: 'DELETE',
      body: JSON.stringify({ collaboratorId }),
    });
  },

  async clearSyncNotes(id: string, collaboratorId?: string): Promise<ApiResponse<InvestigationTask>> {
    return request<InvestigationTask>(`/investigation-tasks/${id}/clear-sync-notes`, {
      method: 'POST',
      body: JSON.stringify({ collaboratorId }),
    });
  },
};
