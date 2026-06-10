import { request } from './client';
import type {
  CaseTemplate,
  CreateCaseTemplateDto,
  UpdateCaseTemplateDto,
  ApplyTemplateDto,
  ApplyTemplateResult,
  ApiResponse,
} from '@/types';

export const caseTemplateApi = {
  async getAll(): Promise<ApiResponse<CaseTemplate[]>> {
    return request<CaseTemplate[]>('/case-templates');
  },

  async getBuiltIn(): Promise<ApiResponse<CaseTemplate[]>> {
    return request<CaseTemplate[]>('/case-templates/built-in');
  },

  async getByCategory(category: string): Promise<ApiResponse<CaseTemplate[]>> {
    return request<CaseTemplate[]>(`/case-templates/category/${category}`);
  },

  async getById(id: string): Promise<ApiResponse<CaseTemplate>> {
    return request<CaseTemplate>(`/case-templates/${id}`);
  },

  async create(data: CreateCaseTemplateDto): Promise<ApiResponse<CaseTemplate>> {
    return request<CaseTemplate>('/case-templates', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async update(id: string, data: UpdateCaseTemplateDto): Promise<ApiResponse<CaseTemplate>> {
    return request<CaseTemplate>(`/case-templates/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async delete(id: string): Promise<ApiResponse<void>> {
    return request<void>(`/case-templates/${id}`, {
      method: 'DELETE',
    });
  },

  async applyTemplate(data: ApplyTemplateDto): Promise<ApiResponse<ApplyTemplateResult>> {
    return request<ApplyTemplateResult>('/case-templates/apply', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
};
