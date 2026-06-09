import { create } from 'zustand';
import { consultationApi } from '@/api/consultationApi';
import type {
  Consultation,
  ConsultationWithDetails,
  CreateConsultationDto,
  UpdateConsultationDto,
  CreateDiscussionDto,
  CreateConclusionDto,
  CreateDisputeDto,
  ResolveDisputeDto,
} from '@/types';

interface ConsultationState {
  consultations: Consultation[];
  currentConsultation: ConsultationWithDetails | null;
  loading: boolean;
  error: string | null;
  loadConsultations: (caseId: string) => Promise<void>;
  loadConsultationDetails: (id: string) => Promise<void>;
  createConsultation: (data: CreateConsultationDto) => Promise<Consultation | null>;
  updateConsultation: (id: string, data: UpdateConsultationDto) => Promise<void>;
  deleteConsultation: (id: string) => Promise<void>;
  addDiscussion: (consultationId: string, data: Omit<CreateDiscussionDto, 'consultationId'>) => Promise<void>;
  addConclusion: (consultationId: string, data: Omit<CreateConclusionDto, 'consultationId'>) => Promise<void>;
  addDispute: (consultationId: string, data: Omit<CreateDisputeDto, 'consultationId'>) => Promise<void>;
  resolveDispute: (consultationId: string, disputeId: string, data: ResolveDisputeDto) => Promise<void>;
  setCurrentConsultation: (consultation: ConsultationWithDetails | null) => void;
}

export const useConsultationStore = create<ConsultationState>((set, get) => ({
  consultations: [],
  currentConsultation: null,
  loading: false,
  error: null,

  loadConsultations: async (caseId) => {
    set({ loading: true, error: null });
    try {
      const response = await consultationApi.getByCaseId(caseId);
      if (response.success && response.data) {
        set({ consultations: response.data });
      } else {
        set({ error: response.error || '加载会商列表失败' });
      }
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Unknown error' });
    } finally {
      set({ loading: false });
    }
  },

  loadConsultationDetails: async (id) => {
    set({ loading: true, error: null });
    try {
      const response = await consultationApi.getWithDetails(id);
      if (response.success && response.data) {
        set({ currentConsultation: response.data });
      } else {
        set({ error: response.error || '加载会商详情失败' });
      }
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Unknown error' });
    } finally {
      set({ loading: false });
    }
  },

  createConsultation: async (data) => {
    set({ loading: true, error: null });
    try {
      const response = await consultationApi.create(data);
      if (response.success && response.data) {
        set((state) => ({ consultations: [...state.consultations, response.data!] }));
        return response.data;
      }
      set({ error: response.error || '创建会商失败' });
      return null;
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Unknown error' });
      return null;
    } finally {
      set({ loading: false });
    }
  },

  updateConsultation: async (id, data) => {
    set({ loading: true, error: null });
    try {
      const response = await consultationApi.update(id, data);
      if (response.success && response.data) {
        set((state) => ({
          consultations: state.consultations.map((c) => (c.id === id ? response.data! : c)),
          currentConsultation: state.currentConsultation?.id === id
            ? { ...response.data!, discussions: state.currentConsultation.discussions, conclusions: state.currentConsultation.conclusions, disputes: state.currentConsultation.disputes }
            : state.currentConsultation,
        }));
      } else {
        set({ error: response.error || '更新会商失败' });
      }
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Unknown error' });
    } finally {
      set({ loading: false });
    }
  },

  deleteConsultation: async (id) => {
    set({ loading: true, error: null });
    try {
      const response = await consultationApi.delete(id);
      if (response.success) {
        set((state) => ({
          consultations: state.consultations.filter((c) => c.id !== id),
          currentConsultation: state.currentConsultation?.id === id ? null : state.currentConsultation,
        }));
      } else {
        set({ error: response.error || '删除会商失败' });
      }
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Unknown error' });
    } finally {
      set({ loading: false });
    }
  },

  addDiscussion: async (consultationId, data) => {
    try {
      const response = await consultationApi.addDiscussion(consultationId, data);
      if (response.success && response.data) {
        const current = get().currentConsultation;
        if (current && current.id === consultationId) {
          set({
            currentConsultation: {
              ...current,
              discussions: [...current.discussions, response.data!],
            },
          });
        }
        const consultations = get().consultations;
        const target = consultations.find((c) => c.id === consultationId);
        if (target && target.status === 'open') {
          set({
            consultations: consultations.map((c) =>
              c.id === consultationId ? { ...c, status: 'in_progress' as const, updatedAt: new Date().toISOString() } : c
            ),
          });
        }
      }
    } catch (error) {
      console.error('Add discussion failed:', error);
    }
  },

  addConclusion: async (consultationId, data) => {
    try {
      const response = await consultationApi.addConclusion(consultationId, data);
      if (response.success && response.data) {
        const current = get().currentConsultation;
        if (current && current.id === consultationId) {
          set({
            currentConsultation: {
              ...current,
              status: 'concluded',
              concludedAt: new Date().toISOString(),
              conclusions: [...current.conclusions, response.data!],
            },
          });
        }
        set((state) => ({
          consultations: state.consultations.map((c) =>
            c.id === consultationId ? { ...c, status: 'concluded' as const, concludedAt: new Date().toISOString(), updatedAt: new Date().toISOString() } : c
          ),
        }));
      }
    } catch (error) {
      console.error('Add conclusion failed:', error);
    }
  },

  addDispute: async (consultationId, data) => {
    try {
      const response = await consultationApi.addDispute(consultationId, data);
      if (response.success && response.data) {
        const current = get().currentConsultation;
        if (current && current.id === consultationId) {
          set({
            currentConsultation: {
              ...current,
              disputes: [...current.disputes, response.data!],
            },
          });
        }
      }
    } catch (error) {
      console.error('Add dispute failed:', error);
    }
  },

  resolveDispute: async (consultationId, disputeId, data) => {
    try {
      const response = await consultationApi.resolveDispute(consultationId, disputeId, data);
      if (response.success && response.data) {
        const current = get().currentConsultation;
        if (current && current.id === consultationId) {
          set({
            currentConsultation: {
              ...current,
              disputes: current.disputes.map((d) => (d.id === disputeId ? response.data! : d)),
            },
          });
        }
      }
    } catch (error) {
      console.error('Resolve dispute failed:', error);
    }
  },

  setCurrentConsultation: (consultation) => {
    set({ currentConsultation: consultation });
  },
}));
