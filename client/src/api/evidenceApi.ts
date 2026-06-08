import { request } from './client';
import type { Evidence, CreateEvidenceDto, UpdateEvidenceDto, ApiResponse } from '@/types';

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
};
