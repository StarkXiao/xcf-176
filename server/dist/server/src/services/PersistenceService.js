import { CaseRepository } from '../repositories/CaseRepository.js';
import { EvidenceRepository } from '../repositories/EvidenceRepository.js';
const debounceTimers = new Map();
const DEBOUNCE_DELAY = 500;
const clearDebounce = (key) => {
    const existing = debounceTimers.get(key);
    if (existing) {
        clearTimeout(existing);
        debounceTimers.delete(key);
    }
};
const scheduleDebounce = (key, fn) => {
    clearDebounce(key);
    const timer = setTimeout(fn, DEBOUNCE_DELAY);
    debounceTimers.set(key, timer);
};
export const PersistenceService = {
    saveCanvasState: (caseId, canvasState) => {
        const key = `canvas:${caseId}`;
        return new Promise((resolve) => {
            scheduleDebounce(key, () => {
                const result = CaseRepository.update(caseId, { canvasState });
                resolve(result);
            });
        });
    },
    saveEvidencePosition: (evidenceId, positionX, positionY) => {
        const key = `ev-pos:${evidenceId}`;
        return new Promise((resolve) => {
            scheduleDebounce(key, () => {
                const result = EvidenceRepository.update(evidenceId, { positionX, positionY });
                resolve(result);
            });
        });
    },
    saveEvidenceSize: (evidenceId, width, height) => {
        const key = `ev-size:${evidenceId}`;
        return new Promise((resolve) => {
            scheduleDebounce(key, () => {
                const result = EvidenceRepository.update(evidenceId, { width, height });
                resolve(result);
            });
        });
    },
    saveEvidenceBatch: (caseId, updates) => {
        const key = `ev-batch:${caseId}`;
        scheduleDebounce(key, () => {
            for (const update of updates) {
                const { id, ...dto } = update;
                EvidenceRepository.update(id, dto);
            }
        });
    },
    saveFullCanvas: (data) => {
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
    flushPending: () => {
        for (const [key, timer] of debounceTimers) {
            clearTimeout(timer);
            const parts = key.split(':');
            const type = parts[0];
            // 这里可以实现立即保存逻辑，如果需要的话
        }
        debounceTimers.clear();
    },
    cancelPending: (caseId) => {
        for (const key of debounceTimers.keys()) {
            if (key.includes(caseId)) {
                clearDebounce(key);
            }
        }
    },
};
