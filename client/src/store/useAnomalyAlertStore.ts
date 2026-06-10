import { create } from 'zustand';
import { anomalyAlertApi } from '@/api/anomalyAlertApi';
import type { AnomalyAlert, AnomalyDetectionResult, UpdateAnomalyAlertDto } from '@/types';

interface AnomalyAlertState {
  alerts: AnomalyAlert[];
  priorityCases: AnomalyDetectionResult[];
  currentCaseResult: AnomalyDetectionResult | null;
  loading: boolean;
  error: string | null;
  setAlerts: (alerts: AnomalyAlert[]) => void;
  loadAlerts: () => Promise<void>;
  loadPendingAlerts: () => Promise<void>;
  loadAlertsByCaseId: (caseId: string) => Promise<void>;
  loadPriorityCases: () => Promise<void>;
  detectForCase: (caseId: string) => Promise<AnomalyDetectionResult | null>;
  detectAll: () => Promise<void>;
  updateAlert: (id: string, data: UpdateAnomalyAlertDto) => Promise<void>;
  deleteAlert: (id: string) => Promise<void>;
  dismissAlert: (id: string, reviewedBy?: string) => Promise<void>;
  resolveAlert: (id: string, reviewedBy?: string) => Promise<void>;
}

export const useAnomalyAlertStore = create<AnomalyAlertState>((set, get) => ({
  alerts: [],
  priorityCases: [],
  currentCaseResult: null,
  loading: false,
  error: null,

  setAlerts: (alerts: AnomalyAlert[]) => set({ alerts }),

  loadAlerts: async () => {
    set({ loading: true, error: null });
    try {
      const response = await anomalyAlertApi.getAll();
      if (response.success && response.data) {
        set({ alerts: response.data });
      } else {
        set({ error: response.error || '加载预警列表失败' });
      }
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Unknown error' });
    } finally {
      set({ loading: false });
    }
  },

  loadPendingAlerts: async () => {
    set({ loading: true, error: null });
    try {
      const response = await anomalyAlertApi.getPending();
      if (response.success && response.data) {
        set({ alerts: response.data });
      } else {
        set({ error: response.error || '加载待处理预警失败' });
      }
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Unknown error' });
    } finally {
      set({ loading: false });
    }
  },

  loadAlertsByCaseId: async (caseId: string) => {
    set({ loading: true, error: null });
    try {
      const response = await anomalyAlertApi.getByCaseId(caseId);
      if (response.success && response.data) {
        set({ alerts: response.data });
      } else {
        set({ error: response.error || '加载案件预警失败' });
      }
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Unknown error' });
    } finally {
      set({ loading: false });
    }
  },

  loadPriorityCases: async () => {
    set({ loading: true, error: null });
    try {
      const response = await anomalyAlertApi.getPriorityCases();
      if (response.success && response.data) {
        set({ priorityCases: response.data });
      } else {
        set({ error: response.error || '加载优先案件失败' });
      }
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Unknown error' });
    } finally {
      set({ loading: false });
    }
  },

  detectForCase: async (caseId: string) => {
    set({ loading: true, error: null });
    try {
      const response = await anomalyAlertApi.detectForCase(caseId);
      if (response.success && response.data) {
        set({ currentCaseResult: response.data });
        const alertsState = get().alerts;
        const otherAlerts = alertsState.filter((a) => a.caseId !== caseId);
        set({ alerts: [...otherAlerts, ...response.data.alerts] });
        return response.data;
      }
      set({ error: response.error || '检测失败' });
      return null;
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Unknown error' });
      return null;
    } finally {
      set({ loading: false });
    }
  },

  detectAll: async () => {
    set({ loading: true, error: null });
    try {
      const response = await anomalyAlertApi.detectAll();
      if (response.success && response.data) {
        set({ priorityCases: response.data });
        const allAlerts = response.data.flatMap((r) => r.alerts);
        set({ alerts: allAlerts });
      } else {
        set({ error: response.error || '全量检测失败' });
      }
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Unknown error' });
    } finally {
      set({ loading: false });
    }
  },

  updateAlert: async (id: string, data: UpdateAnomalyAlertDto) => {
    try {
      const response = await anomalyAlertApi.update(id, data);
      if (response.success && response.data) {
        set((state) => ({
          alerts: state.alerts.map((a) => (a.id === id ? response.data! : a)),
        }));
      }
    } catch (error) {
      console.error('Update alert failed:', error);
    }
  },

  deleteAlert: async (id: string) => {
    try {
      const response = await anomalyAlertApi.delete(id);
      if (response.success) {
        set((state) => ({
          alerts: state.alerts.filter((a) => a.id !== id),
        }));
      }
    } catch (error) {
      console.error('Delete alert failed:', error);
    }
  },

  dismissAlert: async (id: string, reviewedBy?: string) => {
    await get().updateAlert(id, { status: 'dismissed', reviewedBy });
  },

  resolveAlert: async (id: string, reviewedBy?: string) => {
    await get().updateAlert(id, { status: 'resolved', reviewedBy });
  },
}));
