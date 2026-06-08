import { create } from 'zustand';
import { caseApi } from '@/api/caseApi';
import type { Case, CaseWithRelations } from '@/types';

interface CaseState {
  currentCase: CaseWithRelations | null;
  cases: Case[];
  loading: boolean;
  error: string | null;
  setCurrentCase: (caseData: CaseWithRelations | null) => void;
  loadCases: () => Promise<void>;
  loadCase: (id: string) => Promise<void>;
  createCase: (name: string, description?: string) => Promise<Case | null>;
  updateCase: (id: string, data: Partial<Case>) => Promise<void>;
  deleteCase: (id: string) => Promise<void>;
}

export const useCaseStore = create<CaseState>((set, get) => ({
  currentCase: null,
  cases: [],
  loading: false,
  error: null,

  setCurrentCase: (caseData) => set({ currentCase: caseData }),

  loadCases: async () => {
    set({ loading: true, error: null });
    try {
      const response = await caseApi.getAll();
      if (response.success && response.data) {
        set({ cases: response.data });
      } else {
        set({ error: response.error || 'Failed to load cases' });
      }
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Unknown error' });
    } finally {
      set({ loading: false });
    }
  },

  loadCase: async (id) => {
    set({ loading: true, error: null });
    try {
      const response = await caseApi.getById(id);
      if (response.success && response.data) {
        set({ currentCase: response.data });
      } else {
        set({ error: response.error || 'Failed to load case' });
      }
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Unknown error' });
    } finally {
      set({ loading: false });
    }
  },

  createCase: async (name, description) => {
    set({ loading: true, error: null });
    try {
      const response = await caseApi.create({ name, description });
      if (response.success && response.data) {
        set((state) => ({ cases: [...state.cases, response.data!] }));
        return response.data;
      }
      set({ error: response.error || 'Failed to create case' });
      return null;
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Unknown error' });
      return null;
    } finally {
      set({ loading: false });
    }
  },

  updateCase: async (id, data) => {
    set({ loading: true, error: null });
    try {
      const response = await caseApi.update(id, data);
      if (response.success && response.data) {
        set((state) => ({
          cases: state.cases.map((c) => (c.id === id ? response.data! : c)),
          currentCase: state.currentCase?.id === id
            ? { ...state.currentCase, ...response.data! }
            : state.currentCase,
        }));
      } else {
        set({ error: response.error || 'Failed to update case' });
      }
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Unknown error' });
    } finally {
      set({ loading: false });
    }
  },

  deleteCase: async (id) => {
    set({ loading: true, error: null });
    try {
      const response = await caseApi.delete(id);
      if (response.success) {
        set((state) => ({
          cases: state.cases.filter((c) => c.id !== id),
          currentCase: state.currentCase?.id === id ? null : state.currentCase,
        }));
      } else {
        set({ error: response.error || 'Failed to delete case' });
      }
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Unknown error' });
    } finally {
      set({ loading: false });
    }
  },
}));
