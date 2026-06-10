import { request } from './client';
import type {
  AnomalyAlert,
  AnomalyDetectionResult,
  UpdateAnomalyAlertDto,
  ApiResponse,
} from '@/types';

export const anomalyAlertApi = {
  async getAll(): Promise<ApiResponse<AnomalyAlert[]>> {
    return request<AnomalyAlert[]>('/anomaly-alerts');
  },

  async getPending(): Promise<ApiResponse<AnomalyAlert[]>> {
    return request<AnomalyAlert[]>('/anomaly-alerts/pending');
  },

  async getByCaseId(caseId: string): Promise<ApiResponse<AnomalyAlert[]>> {
    return request<AnomalyAlert[]>(`/anomaly-alerts/case/${caseId}`);
  },

  async getById(id: string): Promise<ApiResponse<AnomalyAlert>> {
    return request<AnomalyAlert>(`/anomaly-alerts/${id}`);
  },

  async update(id: string, data: UpdateAnomalyAlertDto): Promise<ApiResponse<AnomalyAlert>> {
    return request<AnomalyAlert>(`/anomaly-alerts/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async delete(id: string): Promise<ApiResponse<void>> {
    return request<void>(`/anomaly-alerts/${id}`, {
      method: 'DELETE',
    });
  },

  async detectForCase(caseId: string): Promise<ApiResponse<AnomalyDetectionResult>> {
    return request<AnomalyDetectionResult>(`/anomaly-alerts/detect/case/${caseId}`, {
      method: 'POST',
      body: JSON.stringify({}),
    });
  },

  async detectAll(): Promise<ApiResponse<AnomalyDetectionResult[]>> {
    return request<AnomalyDetectionResult[]>('/anomaly-alerts/detect/all', {
      method: 'POST',
      body: JSON.stringify({}),
    });
  },

  async getPriorityCases(): Promise<ApiResponse<AnomalyDetectionResult[]>> {
    return request<AnomalyDetectionResult[]>('/anomaly-alerts/priority-cases', {
      method: 'POST',
      body: JSON.stringify({}),
    });
  },
};
