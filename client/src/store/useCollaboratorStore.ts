import { create } from 'zustand';
import { collaboratorApi } from '@/api/collaboratorApi';
import type { Collaborator, CreateCollaboratorDto, UpdateCollaboratorDto } from '@/types';

interface CollaboratorState {
  collaborators: Collaborator[];
  loading: boolean;
  error: string | null;
  getCollaboratorById: (id: string) => Collaborator | undefined;
  loadCollaborators: (caseId: string) => Promise<void>;
  addCollaborator: (data: CreateCollaboratorDto) => Promise<Collaborator | null>;
  updateCollaborator: (id: string, data: UpdateCollaboratorDto) => Promise<void>;
  deleteCollaborator: (id: string) => Promise<void>;
  setCollaborators: (list: Collaborator[]) => void;
}

export const useCollaboratorStore = create<CollaboratorState>((set, get) => ({
  collaborators: [],
  loading: false,
  error: null,

  getCollaboratorById: (id) => get().collaborators.find((c) => c.id === id),

  loadCollaborators: async (caseId) => {
    set({ loading: true, error: null });
    try {
      const response = await collaboratorApi.getByCaseId(caseId);
      if (response.success && response.data) {
        set({ collaborators: response.data });
      } else {
        set({ error: response.error || 'Failed to load collaborators' });
      }
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Unknown error' });
    } finally {
      set({ loading: false });
    }
  },

  addCollaborator: async (data) => {
    set({ loading: true, error: null });
    try {
      const response = await collaboratorApi.create(data);
      if (response.success && response.data) {
        set((state) => ({
          collaborators: [...state.collaborators, response.data!],
        }));
        return response.data;
      }
      set({ error: response.error || 'Failed to add collaborator' });
      return null;
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Unknown error' });
      return null;
    } finally {
      set({ loading: false });
    }
  },

  updateCollaborator: async (id, data) => {
    set({ loading: true, error: null });
    try {
      const response = await collaboratorApi.update(id, data);
      if (response.success && response.data) {
        set((state) => ({
          collaborators: state.collaborators.map((c) =>
            c.id === id ? response.data! : c
          ),
        }));
      } else {
        set({ error: response.error || 'Failed to update collaborator' });
      }
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Unknown error' });
    } finally {
      set({ loading: false });
    }
  },

  deleteCollaborator: async (id) => {
    set({ loading: true, error: null });
    try {
      const response = await collaboratorApi.delete(id);
      if (response.success) {
        set((state) => ({
          collaborators: state.collaborators.filter((c) => c.id !== id),
        }));
      } else {
        set({ error: response.error || 'Failed to delete collaborator' });
      }
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Unknown error' });
    } finally {
      set({ loading: false });
    }
  },

  setCollaborators: (list) => {
    set({ collaborators: list });
  },
}));
