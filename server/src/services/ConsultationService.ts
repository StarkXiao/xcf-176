import { ConsultationRepository } from '../repositories/ConsultationRepository.js';
import { CaseRepository } from '../repositories/CaseRepository.js';
import type {
  Consultation,
  ConsultationWithDetails,
  CreateConsultationDto,
  UpdateConsultationDto,
  CreateDiscussionDto,
  CreateConclusionDto,
  CreateDisputeDto,
  ResolveDisputeDto,
  ConsultationConclusion,
  ConsultationDispute,
  ConsultationDiscussion,
} from '@shared/types';

export const ConsultationService = {
  getAllConsultations: (): Consultation[] => {
    return ConsultationRepository.findAll();
  },

  getConsultationById: (id: string): Consultation | null => {
    return ConsultationRepository.findById(id);
  },

  getConsultationsByCaseId: (caseId: string): Consultation[] => {
    return ConsultationRepository.findByCaseId(caseId);
  },

  getConsultationWithDetails: (id: string): ConsultationWithDetails | null => {
    return ConsultationRepository.findWithDetails(id);
  },

  createConsultation: (dto: CreateConsultationDto): Consultation => {
    return ConsultationRepository.create(dto);
  },

  updateConsultation: (id: string, dto: UpdateConsultationDto): Consultation | null => {
    return ConsultationRepository.update(id, dto);
  },

  deleteConsultation: (id: string): boolean => {
    return ConsultationRepository.delete(id);
  },

  addDiscussion: (dto: CreateDiscussionDto): ConsultationDiscussion => {
    if (dto.isDispute) {
      ConsultationRepository.update(dto.consultationId, { status: 'in_progress' });
    } else {
      const consultation = ConsultationRepository.findById(dto.consultationId);
      if (consultation && consultation.status === 'open') {
        ConsultationRepository.update(dto.consultationId, { status: 'in_progress' });
      }
    }
    return ConsultationRepository.addDiscussion(dto);
  },

  addConclusion: (dto: CreateConclusionDto): ConsultationConclusion => {
    const consultation = ConsultationRepository.findById(dto.consultationId);
    if (!consultation) throw new Error('Consultation not found');

    const now = new Date().toISOString();
    ConsultationRepository.update(dto.consultationId, {
      status: 'concluded',
      concludedAt: now,
    });

    if (dto.caseStatusUpdate || dto.keyCluesUpdate) {
      const caseUpdate: Record<string, unknown> = {};
      if (dto.keyCluesUpdate && dto.keyCluesUpdate.length > 0) {
        const existingClues = consultation.keyClues ?? [];
        const mergedClues = [...new Set([...existingClues, ...dto.keyCluesUpdate])];
        ConsultationRepository.update(dto.consultationId, { keyClues: mergedClues });
      }
    }

    const conclusion = ConsultationRepository.addConclusion(dto);

    if (dto.caseStatusUpdate) {
      const caseData = CaseRepository.findById(consultation.caseId);
      if (caseData) {
        CaseRepository.update(consultation.caseId, {
          description: caseData.description,
        });
      }
    }

    return conclusion;
  },

  addDispute: (dto: CreateDisputeDto): ConsultationDispute => {
    return ConsultationRepository.addDispute(dto);
  },

  resolveDispute: (id: string, dto: ResolveDisputeDto): ConsultationDispute | null => {
    return ConsultationRepository.resolveDispute(id, dto);
  },

  getDiscussions: (consultationId: string): ConsultationDiscussion[] => {
    return ConsultationRepository.findDiscussions(consultationId);
  },

  getConclusions: (consultationId: string): ConsultationConclusion[] => {
    return ConsultationRepository.findConclusions(consultationId);
  },

  getDisputes: (consultationId: string): ConsultationDispute[] => {
    return ConsultationRepository.findDisputes(consultationId);
  },
};
