import { create } from 'zustand';
import { investigationTaskApi } from '@/api/investigationTaskApi';
import type {
  InvestigationTask,
  InvestigationTaskStatus,
  CreateInvestigationTaskDto,
  UpdateInvestigationTaskDto,
} from '@/types';

type TaskFilter = 'all' | InvestigationTaskStatus;

interface InvestigationTaskState {
  tasks: InvestigationTask[];
  currentTask: InvestigationTask | null;
  loading: boolean;
  error: string | null;
  filter: TaskFilter;
  setFilter: (filter: TaskFilter) => void;
  loadTasks: (caseId: string) => Promise<void>;
  loadTaskById: (id: string) => Promise<void>;
  createTask: (data: CreateInvestigationTaskDto) => Promise<InvestigationTask | null>;
  updateTask: (id: string, data: UpdateInvestigationTaskDto, collaboratorId: string) => Promise<void>;
  deleteTask: (id: string, collaboratorId?: string) => Promise<void>;
  assignTask: (id: string, assigneeId: string, collaboratorId: string) => Promise<void>;
  linkEvidence: (id: string, evidenceId: string, collaboratorId: string) => Promise<void>;
  unlinkEvidence: (id: string, evidenceId: string, collaboratorId: string) => Promise<void>;
  linkCollectionItem: (id: string, collectionItemId: string, collaboratorId: string) => Promise<void>;
  unlinkCollectionItem: (id: string, collectionItemId: string, collaboratorId: string) => Promise<void>;
  linkConnection: (id: string, connectionId: string, collaboratorId: string) => Promise<void>;
  unlinkConnection: (id: string, connectionId: string, collaboratorId: string) => Promise<void>;
  setCurrentTask: (task: InvestigationTask | null) => void;
  getFilteredTasks: () => InvestigationTask[];
  getOverdueTasks: () => InvestigationTask[];
}

export const useInvestigationTaskStore = create<InvestigationTaskState>((set, get) => ({
  tasks: [],
  currentTask: null,
  loading: false,
  error: null,
  filter: 'all',

  setFilter: (filter: TaskFilter) => set({ filter }),

  loadTasks: async (caseId: string) => {
    set({ loading: true, error: null });
    try {
      const response = await investigationTaskApi.getByCaseId(caseId);
      if (response.success && response.data) {
        set({ tasks: response.data });
      } else {
        set({ error: response.error || '加载任务列表失败' });
      }
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Unknown error' });
    } finally {
      set({ loading: false });
    }
  },

  loadTaskById: async (id: string) => {
    set({ loading: true, error: null });
    try {
      const response = await investigationTaskApi.getById(id);
      if (response.success && response.data) {
        set({ currentTask: response.data });
      } else {
        set({ error: response.error || '加载任务详情失败' });
      }
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Unknown error' });
    } finally {
      set({ loading: false });
    }
  },

  createTask: async (data: CreateInvestigationTaskDto) => {
    set({ loading: true, error: null });
    try {
      const response = await investigationTaskApi.create(data);
      if (response.success && response.data) {
        set((state) => ({ tasks: [...state.tasks, response.data!] }));
        return response.data;
      }
      set({ error: response.error || '创建任务失败' });
      return null;
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Unknown error' });
      return null;
    } finally {
      set({ loading: false });
    }
  },

  updateTask: async (id: string, data: UpdateInvestigationTaskDto, collaboratorId: string) => {
    set({ loading: true, error: null });
    try {
      const response = await investigationTaskApi.update(id, { ...data, collaboratorId });
      if (response.success && response.data) {
        set((state) => ({
          tasks: state.tasks.map((t) => (t.id === id ? response.data! : t)),
          currentTask: state.currentTask?.id === id ? response.data! : state.currentTask,
        }));
      } else {
        set({ error: response.error || '更新任务失败' });
      }
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Unknown error' });
    } finally {
      set({ loading: false });
    }
  },

  deleteTask: async (id: string, collaboratorId?: string) => {
    set({ loading: true, error: null });
    try {
      const response = await investigationTaskApi.delete(id, collaboratorId);
      if (response.success) {
        set((state) => ({
          tasks: state.tasks.filter((t) => t.id !== id),
          currentTask: state.currentTask?.id === id ? null : state.currentTask,
        }));
      } else {
        set({ error: response.error || '删除任务失败' });
      }
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Unknown error' });
    } finally {
      set({ loading: false });
    }
  },

  assignTask: async (id: string, assigneeId: string, collaboratorId: string) => {
    try {
      const response = await investigationTaskApi.assign(id, assigneeId, collaboratorId);
      if (response.success && response.data) {
        set((state) => ({
          tasks: state.tasks.map((t) => (t.id === id ? response.data! : t)),
          currentTask: state.currentTask?.id === id ? response.data! : state.currentTask,
        }));
      }
    } catch (error) {
      console.error('Assign task failed:', error);
    }
  },

  linkEvidence: async (id: string, evidenceId: string, collaboratorId: string) => {
    try {
      const response = await investigationTaskApi.linkEvidence(id, evidenceId, collaboratorId);
      if (response.success && response.data) {
        set((state) => ({
          tasks: state.tasks.map((t) => (t.id === id ? response.data! : t)),
          currentTask: state.currentTask?.id === id ? response.data! : state.currentTask,
        }));
      }
    } catch (error) {
      console.error('Link evidence failed:', error);
    }
  },

  unlinkEvidence: async (id: string, evidenceId: string, collaboratorId: string) => {
    try {
      const response = await investigationTaskApi.unlinkEvidence(id, evidenceId, collaboratorId);
      if (response.success && response.data) {
        set((state) => ({
          tasks: state.tasks.map((t) => (t.id === id ? response.data! : t)),
          currentTask: state.currentTask?.id === id ? response.data! : state.currentTask,
        }));
      }
    } catch (error) {
      console.error('Unlink evidence failed:', error);
    }
  },

  linkCollectionItem: async (id: string, collectionItemId: string, collaboratorId: string) => {
    try {
      const response = await investigationTaskApi.linkCollectionItem(id, collectionItemId, collaboratorId);
      if (response.success && response.data) {
        set((state) => ({
          tasks: state.tasks.map((t) => (t.id === id ? response.data! : t)),
          currentTask: state.currentTask?.id === id ? response.data! : state.currentTask,
        }));
      }
    } catch (error) {
      console.error('Link collection item failed:', error);
    }
  },

  unlinkCollectionItem: async (id: string, collectionItemId: string, collaboratorId: string) => {
    try {
      const response = await investigationTaskApi.unlinkCollectionItem(id, collectionItemId, collaboratorId);
      if (response.success && response.data) {
        set((state) => ({
          tasks: state.tasks.map((t) => (t.id === id ? response.data! : t)),
          currentTask: state.currentTask?.id === id ? response.data! : state.currentTask,
        }));
      }
    } catch (error) {
      console.error('Unlink collection item failed:', error);
    }
  },

  linkConnection: async (id: string, connectionId: string, collaboratorId: string) => {
    try {
      const response = await investigationTaskApi.linkConnection(id, connectionId, collaboratorId);
      if (response.success && response.data) {
        set((state) => ({
          tasks: state.tasks.map((t) => (t.id === id ? response.data! : t)),
          currentTask: state.currentTask?.id === id ? response.data! : state.currentTask,
        }));
      }
    } catch (error) {
      console.error('Link connection failed:', error);
    }
  },

  unlinkConnection: async (id: string, connectionId: string, collaboratorId: string) => {
    try {
      const response = await investigationTaskApi.unlinkConnection(id, connectionId, collaboratorId);
      if (response.success && response.data) {
        set((state) => ({
          tasks: state.tasks.map((t) => (t.id === id ? response.data! : t)),
          currentTask: state.currentTask?.id === id ? response.data! : state.currentTask,
        }));
      }
    } catch (error) {
      console.error('Unlink connection failed:', error);
    }
  },

  setCurrentTask: (task: InvestigationTask | null) => set({ currentTask: task }),

  getFilteredTasks: () => {
    const { tasks, filter } = get();
    if (filter === 'all') return tasks;
    return tasks.filter((t) => t.status === filter);
  },

  getOverdueTasks: () => {
    const now = new Date().toISOString();
    return get().tasks.filter(
      (t) => t.deadline && t.deadline < now && t.status !== 'completed' && t.status !== 'cancelled'
    );
  },
}));
