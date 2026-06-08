import { request } from './client';
import type { Case, CaseWithRelations, CreateCaseDto, UpdateCaseDto, ApiResponse } from '@/types';

export const caseApi = {
  async getAll(): Promise<ApiResponse<Case[]>> {
    return request<Case[]>('/cases');
  },

  async getById(id: string): Promise<ApiResponse<CaseWithRelations>> {
    return request<CaseWithRelations>(`/cases/${id}/full`);
  },

  async create(data: CreateCaseDto): Promise<ApiResponse<Case>> {
    return request<Case>('/cases', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async update(id: string, data: UpdateCaseDto): Promise<ApiResponse<Case>> {
    return request<Case>(`/cases/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async delete(id: string): Promise<ApiResponse<void>> {
    return request<void>(`/cases/${id}`, {
      method: 'DELETE',
    });
  },
};
