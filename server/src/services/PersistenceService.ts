import { CaseRepository } from '../repositories/CaseRepository.js';
import { EvidenceRepository } from '../repositories/EvidenceRepository.js';
import { ConnectionRepository } from '../repositories/ConnectionRepository.js';
import type { Case, Evidence, Connection, CanvasState, UpdateEvidenceDto } from '@shared/types';

interface CanvasSaveData {
  caseId: string;
  canvasState?: CanvasState;
  evidence?: Array<{ id: string; positionX: number; positionY: number; width?: number; height?: number }>;
  connections?: Connection[];
}

const debounceTimers = new Map<string, NodeJS.Timeout>();

const DEBOUNCE_DELAY = 500;

const clearDebounce = (key: string) => {
  const existing = debounceTimers.get(key);
  if (existing) {
    clearTimeout(existing);
    debounceTimers.delete(key);
  }
};

const scheduleDebounce = (key: string, fn: () => void) => {
  clearDebounce(key);
  const timer = setTimeout(fn, DEBOUNCE_DELAY);
  debounceTimers.set(key, timer);
};

export const PersistenceService = {
  saveCanvasState: (caseId: string, canvasState: CanvasState): Case | null => {
    const key = `canvas:${caseId}`;
    return new Promise((resolve) => {
      scheduleDebounce(key, () => {
        const result = CaseRepository.update(caseId, { canvasState });
        resolve(result);
      });
    }) as unknown as Case | null;
  },

  saveEvidencePosition: (evidenceId: string, positionX: number, positionY: number): Evidence | null => {
    const key = `ev-pos:${evidenceId}`;
    return new Promise((resolve) => {
      scheduleDebounce(key, () => {
        const result = EvidenceRepository.update(evidenceId, { positionX, positionY });
        resolve(result);
      });
    }) as unknown as Evidence | null;
  },

  saveEvidenceSize: (evidenceId: string, width: number, height: number): Evidence | null => {
    const key = `ev-size:${evidenceId}`;
    return new Promise((resolve) => {
      scheduleDebounce(key, () => {
        const result = EvidenceRepository.update(evidenceId, { width, height });
        resolve(result);
      });
    }) as unknown as Evidence | null;
  },

  saveEvidenceBatch: (caseId: string, updates: Array<{ id: string } & UpdateEvidenceDto>): void => {
    const key = `ev-batch:${caseId}`;
    scheduleDebounce(key, () => {
      for (const update of updates) {
        const { id, ...dto } = update;
        EvidenceRepository.update(id, dto);
      }
    });
  },

  saveFullCanvas: (data: CanvasSaveData): void => {
    const key = `full-canvas:${data.caseId}`;
    scheduleDebounce(key, () => {
      if (data.canvasState) {
        CaseRepository.update(data.caseId, { canvasState: data.canvasState });
      }
      if (data.evidence) {
        for (const ev of data.evidence) {
          EvidenceRepository.update(ev.id, {
            positionX: ev.positionX,
            positionY: ev.positionY,
            width: ev.width,
            height: ev.height,
          });
        }
      }
    });
  },

  flushPending: (): void => {
    for (const [key, timer] of debounceTimers) {
      clearTimeout(timer);
      const parts = key.split(':');
      const type = parts[0];
      // 这里可以实现立即保存逻辑，如果需要的话
    }
    debounceTimers.clear();
  },

  cancelPending: (caseId: string): void => {
    for (const key of debounceTimers.keys()) {
      if (key.includes(caseId)) {
        clearDebounce(key);
      }
    }
  },
};
