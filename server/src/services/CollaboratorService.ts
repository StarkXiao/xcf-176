import { CollaboratorRepository } from '../repositories/CollaboratorRepository.js';
import type { Collaborator, CreateCollaboratorDto, UpdateCollaboratorDto } from '@shared/types';

export const CollaboratorService = {
  getAllCollaborators: (): Collaborator[] => {
    return CollaboratorRepository.findAll();
  },

  getCollaboratorById: (id: string): Collaborator | null => {
    return CollaboratorRepository.findById(id);
  },

  getCollaboratorsByCaseId: (caseId: string): Collaborator[] => {
    return CollaboratorRepository.findByCaseId(caseId);
  },

  createCollaborator: (dto: CreateCollaboratorDto): Collaborator => {
    return CollaboratorRepository.create(dto);
  },

  updateCollaborator: (id: string, dto: UpdateCollaboratorDto): Collaborator | null => {
    return CollaboratorRepository.update(id, dto);
  },

  deleteCollaborator: (id: string): boolean => {
    return CollaboratorRepository.delete(id);
  },
};
