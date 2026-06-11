import { create } from 'zustand';
import { caseApi } from '@/api/caseApi';
import type { Case, CaseWithRelations, CaseSearchFilters, CaseWithAggregatedData } from '@/types';

interface CaseState {
  currentCase: CaseWithRelations | null;
  cases: Case[];
  casesWithMeta: CaseWithAggregatedData[];
  availableTags: string[];
  availableSources: string[];
  loading: boolean;
  error: string | null;
  setCurrentCase: (caseData: CaseWithRelations | null) => void;
  loadCases: () => Promise<void>;
  loadCasesWithMeta: () => Promise<void>;
  loadFilterOptions: () => Promise<void>;
  searchCases: (filters: CaseSearchFilters) => Promise<void>;
  loadCase: (id: string) => Promise<void>;
  createCase: (name: string, description?: string) => Promise<Case | null>;
  updateCase: (id: string, data: Partial<Case>) => Promise<void>;
  deleteCase: (id: string) => Promise<void>;
}

export const useCaseStore = create<CaseState>((set, get) => ({
  currentCase: null,
  cases: [],
  casesWithMeta: [],
  availableTags: [],
  availableSources: [],
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

  loadCasesWithMeta: async () => {
    set({ loading: true, error: null });
    try {
      const response = await caseApi.getAllWithMeta();
      if (response.success && response.data) {
        set({ casesWithMeta: response.data, cases: response.data });
      } else {
        set({ error: response.error || 'Failed to load cases' });
      }
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Unknown error' });
    } finally {
      set({ loading: false });
    }
  },

  loadFilterOptions: async () => {
    try {
      const response = await caseApi.getFilterOptions();
      if (response.success && response.data) {
        set({
          availableTags: response.data.tags,
          availableSources: response.data.sources,
        });
      }
    } catch (error) {
      // ignore error, options will remain empty
    }
  },

  searchCases: async (filters) => {
    set({ loading: true, error: null });
    try {
      const response = await caseApi.search(filters);
      if (response.success && response.data) {
        set({ casesWithMeta: response.data });
      } else {
        set({ error: response.error || 'Failed to search cases' });
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
          casesWithMeta: state.casesWithMeta.filter((c) => c.id !== id),
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
