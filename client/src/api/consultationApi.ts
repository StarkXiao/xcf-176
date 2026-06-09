import { request } from './client';
import type {
  Consultation,
  ConsultationWithDetails,
  CreateConsultationDto,
  UpdateConsultationDto,
  CreateDiscussionDto,
  CreateConclusionDto,
  CreateDisputeDto,
  ResolveDisputeDto,
  ConsultationDiscussion,
  ConsultationConclusion,
  ConsultationDispute,
  ApiResponse,
} from '@/types';

export const consultationApi = {
  async getAll(): Promise<ApiResponse<Consultation[]>> {
    return request<Consultation[]>('/consultations');
  },

  async getByCaseId(caseId: string): Promise<ApiResponse<Consultation[]>> {
    return request<Consultation[]>(`/consultations/case/${caseId}`);
  },

  async getById(id: string): Promise<ApiResponse<Consultation>> {
    return request<Consultation>(`/consultations/${id}`);
  },

  async getWithDetails(id: string): Promise<ApiResponse<ConsultationWithDetails>> {
    return request<ConsultationWithDetails>(`/consultations/${id}/details`);
  },

  async create(data: CreateConsultationDto): Promise<ApiResponse<Consultation>> {
    return request<Consultation>('/consultations', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async update(id: string, data: UpdateConsultationDto): Promise<ApiResponse<Consultation>> {
    return request<Consultation>(`/consultations/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async delete(id: string): Promise<ApiResponse<void>> {
    return request<void>(`/consultations/${id}`, { method: 'DELETE' });
  },

  async getDiscussions(consultationId: string): Promise<ApiResponse<ConsultationDiscussion[]>> {
    return request<ConsultationDiscussion[]>(`/consultations/${consultationId}/discussions`);
  },

  async addDiscussion(consultationId: string, data: Omit<CreateDiscussionDto, 'consultationId'>): Promise<ApiResponse<ConsultationDiscussion>> {
    return request<ConsultationDiscussion>(`/consultations/${consultationId}/discussions`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async getConclusions(consultationId: string): Promise<ApiResponse<ConsultationConclusion[]>> {
    return request<ConsultationConclusion[]>(`/consultations/${consultationId}/conclusions`);
  },

  async addConclusion(consultationId: string, data: Omit<CreateConclusionDto, 'consultationId'>): Promise<ApiResponse<ConsultationConclusion>> {
    return request<ConsultationConclusion>(`/consultations/${consultationId}/conclusions`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async getDisputes(consultationId: string): Promise<ApiResponse<ConsultationDispute[]>> {
    return request<ConsultationDispute[]>(`/consultations/${consultationId}/disputes`);
  },

  async addDispute(consultationId: string, data: Omit<CreateDisputeDto, 'consultationId'>): Promise<ApiResponse<ConsultationDispute>> {
    return request<ConsultationDispute>(`/consultations/${consultationId}/disputes`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async resolveDispute(consultationId: string, disputeId: string, data: ResolveDisputeDto): Promise<ApiResponse<ConsultationDispute>> {
    return request<ConsultationDispute>(`/consultations/${consultationId}/disputes/${disputeId}/resolve`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },
};
