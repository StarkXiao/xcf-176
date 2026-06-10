import { create } from 'zustand';
import { caseTemplateApi } from '@/api/caseTemplateApi';
import { useCaseStore } from '@/store/useCaseStore';
import { useInvestigationTaskStore } from '@/store/useInvestigationTaskStore';
import type {
  CaseTemplate,
  ApplyTemplateDto,
  ApplyTemplateResult,
  CreateCaseTemplateDto,
  UpdateCaseTemplateDto,
} from '@/types';

interface CaseTemplateState {
  templates: CaseTemplate[];
  currentTemplate: CaseTemplate | null;
  appliedTemplateData: ApplyTemplateResult | null;
  loading: boolean;
  error: string | null;

  setCurrentTemplate: (template: CaseTemplate | null) => void;
  setAppliedTemplateData: (data: ApplyTemplateResult | null) => void;
  loadTemplates: () => Promise<void>;
  loadBuiltInTemplates: () => Promise<void>;
  loadTemplateById: (id: string) => Promise<void>;
  loadAppliedTemplateForCase: (caseId: string, templateId: string) => Promise<void>;
  createTemplate: (data: CreateCaseTemplateDto) => Promise<CaseTemplate | null>;
  updateTemplate: (id: string, data: UpdateCaseTemplateDto) => Promise<void>;
  deleteTemplate: (id: string) => Promise<void>;
  applyTemplate: (data: ApplyTemplateDto) => Promise<ApplyTemplateResult | null>;
  getTemplateByCategory: (category: string) => CaseTemplate[];
}

export const useCaseTemplateStore = create<CaseTemplateState>((set, get) => ({
  templates: [],
  currentTemplate: null,
  appliedTemplateData: null,
  loading: false,
  error: null,

  setCurrentTemplate: (template) => set({ currentTemplate: template }),
  setAppliedTemplateData: (data) => set({ appliedTemplateData: data }),

  loadTemplates: async () => {
    set({ loading: true, error: null });
    try {
      const response = await caseTemplateApi.getAll();
      if (response.success && response.data) {
        set({ templates: response.data });
      } else {
        set({ error: response.error || 'Failed to load templates' });
      }
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Unknown error' });
    } finally {
      set({ loading: false });
    }
  },

  loadBuiltInTemplates: async () => {
    set({ loading: true, error: null });
    try {
      const response = await caseTemplateApi.getBuiltIn();
      if (response.success && response.data) {
        set({ templates: response.data });
      } else {
        set({ error: response.error || 'Failed to load built-in templates' });
      }
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Unknown error' });
    } finally {
      set({ loading: false });
    }
  },

  loadTemplateById: async (id) => {
    set({ loading: true, error: null });
    try {
      const response = await caseTemplateApi.getById(id);
      if (response.success && response.data) {
        set({ currentTemplate: response.data });
      } else {
        set({ error: response.error || 'Failed to load template' });
      }
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Unknown error' });
    } finally {
      set({ loading: false });
    }
  },

  loadAppliedTemplateForCase: async (caseId, templateId) => {
    set({ loading: true, error: null });
    try {
      const [templateResponse, caseState, tasks] = await Promise.all([
        caseTemplateApi.getById(templateId),
        Promise.resolve().then(() => {
          const state = useCaseStore.getState();
          return {
            case: state.currentCase,
            evidence: state.currentCase?.evidence ?? [],
            connections: state.currentCase?.connections ?? [],
          };
        }),
        Promise.resolve().then(() => {
          const state = useInvestigationTaskStore.getState();
          return state.tasks;
        }),
      ]);

      if (templateResponse.success && templateResponse.data && caseState.case) {
        const appliedData: ApplyTemplateResult = {
          case: caseState.case,
          template: templateResponse.data,
          evidenceFields: templateResponse.data.evidenceFields,
          relationTypes: templateResponse.data.relationTypes,
          investigationSteps: templateResponse.data.investigationSteps,
          createdTasks: tasks,
        };
        set({
          appliedTemplateData: appliedData,
          currentTemplate: templateResponse.data,
        });
      } else {
        set({ error: templateResponse.error || 'Failed to load applied template' });
      }
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Unknown error' });
    } finally {
      set({ loading: false });
    }
  },

  createTemplate: async (data) => {
    set({ loading: true, error: null });
    try {
      const response = await caseTemplateApi.create(data);
      if (response.success && response.data) {
        set((state) => ({ templates: [...state.templates, response.data!] }));
        return response.data;
      }
      set({ error: response.error || 'Failed to create template' });
      return null;
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Unknown error' });
      return null;
    } finally {
      set({ loading: false });
    }
  },

  updateTemplate: async (id, data) => {
    set({ loading: true, error: null });
    try {
      const response = await caseTemplateApi.update(id, data);
      if (response.success && response.data) {
        set((state) => ({
          templates: state.templates.map((t) => (t.id === id ? response.data! : t)),
          currentTemplate: state.currentTemplate?.id === id ? response.data! : state.currentTemplate,
        }));
      } else {
        set({ error: response.error || 'Failed to update template' });
      }
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Unknown error' });
    } finally {
      set({ loading: false });
    }
  },

  deleteTemplate: async (id) => {
    set({ loading: true, error: null });
    try {
      const response = await caseTemplateApi.delete(id);
      if (response.success) {
        set((state) => ({
          templates: state.templates.filter((t) => t.id !== id),
          currentTemplate: state.currentTemplate?.id === id ? null : state.currentTemplate,
        }));
      } else {
        set({ error: response.error || 'Failed to delete template' });
      }
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Unknown error' });
    } finally {
      set({ loading: false });
    }
  },

  applyTemplate: async (data) => {
    set({ loading: true, error: null });
    try {
      const response = await caseTemplateApi.applyTemplate(data);
      if (response.success && response.data) {
        set({
          appliedTemplateData: response.data,
          currentTemplate: response.data.template,
        });
        return response.data;
      }
      set({ error: response.error || 'Failed to apply template' });
      return null;
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Unknown error' });
      return null;
    } finally {
      set({ loading: false });
    }
  },

  getTemplateByCategory: (category) => {
    return get().templates.filter((t) => t.category === category);
  },
}));
