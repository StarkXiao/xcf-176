import { request } from './client';
import type { Evidence, DeletedEvidenceInfo, CreateEvidenceDto, UpdateEvidenceDto, ApiResponse } from '@/types';

export const evidenceApi = {
  async getByCaseId(caseId: string): Promise<ApiResponse<Evidence[]>> {
    return request<Evidence[]>(`/evidence?caseId=${caseId}`);
  },

  async getById(id: string): Promise<ApiResponse<Evidence>> {
    return request<Evidence>(`/evidence/${id}`);
  },

  async create(data: CreateEvidenceDto): Promise<ApiResponse<Evidence>> {
    return request<Evidence>('/evidence', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async update(id: string, data: UpdateEvidenceDto): Promise<ApiResponse<Evidence>> {
    return request<Evidence>(`/evidence/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async delete(id: string): Promise<ApiResponse<void>> {
    return request<void>(`/evidence/${id}`, {
      method: 'DELETE',
    });
  },

  async bulkUpdate(updates: Array<{ id: string; data: UpdateEvidenceDto }>): Promise<ApiResponse<Evidence[]>> {
    return request<Evidence[]>('/evidence/bulk', {
      method: 'PUT',
      body: JSON.stringify({ updates }),
    });
  },

  async getAllDeleted(): Promise<ApiResponse<DeletedEvidenceInfo[]>> {
    return request<DeletedEvidenceInfo[]>('/evidence/recycle-bin/all');
  },

  async getDeletedByCaseId(caseId: string): Promise<ApiResponse<DeletedEvidenceInfo[]>> {
    return request<DeletedEvidenceInfo[]>(`/evidence/recycle-bin/case/${caseId}`);
  },

  async getDeletedById(id: string): Promise<ApiResponse<DeletedEvidenceInfo>> {
    return request<DeletedEvidenceInfo>(`/evidence/recycle-bin/${id}`);
  },

  async restoreDeleted(
    id: string,
    collaboratorId?: string,
    collaboratorName?: string
  ): Promise<ApiResponse<Evidence>> {
    return request<Evidence>(`/evidence/recycle-bin/${id}/restore`, {
      method: 'POST',
      body: JSON.stringify({ collaboratorId, collaboratorName }),
    });
  },

  async purgeDeleted(id: string): Promise<ApiResponse<void>> {
    return request<void>(`/evidence/recycle-bin/${id}/purge`, {
      method: 'DELETE',
    });
  },

  async purgeAllDeleted(days?: number): Promise<ApiResponse<{ purgedEvidenceCount: number }>> {
    return request<{ purgedEvidenceCount: number }>('/evidence/recycle-bin/purge-all', {
      method: 'POST',
      body: JSON.stringify({ days }),
    });
  },
};
