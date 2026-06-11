import { useEffect, useRef, useCallback } from 'react';
import { useCaseStore } from '@/store/useCaseStore';
import { useEvidenceStore } from '@/store/useEvidenceStore';
import { useUiStore } from '@/store/useUiStore';
import { useCanvasStore } from '@/store/useCanvasStore';
import { caseApi } from '@/api/caseApi';
import { evidenceApi } from '@/api/evidenceApi';

export function useDebouncedSave(delay: number = 500) {
  const currentCase = useCaseStore((state) => state.currentCase);
  const evidence = useEvidenceStore((state) => state.getEvidenceArray());
  const connections = useCanvasStore((state) => state.connections);
  const zoom = useCanvasStore((state) => state.zoom);
  const panX = useCanvasStore((state) => state.panX);
  const panY = useCanvasStore((state) => state.panY);
  const selectedId = useCanvasStore((state) => state.selectedId);
  const selectedConnectionId = useCanvasStore((state) => state.selectedConnectionId);
  const setSaveStatus = useUiStore((state) => state.setSaveStatus);
  const updateLastSaved = useUiStore((state) => state.updateLastSaved);

  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pendingEvidenceUpdatesRef = useRef<Set<string>>(new Set());

  const scheduleSave = useCallback(() => {
    if (!currentCase) return;

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    setSaveStatus('idle');

    timeoutRef.current = setTimeout(async () => {
      setSaveStatus('saving');

      try {
        const evidenceUpdates = evidence.map((e) => ({
          id: e.id,
          data: {
            positionX: e.positionX,
            positionY: e.positionY,
            content: e.content,
            source: e.source,
            importance: e.importance,
            tags: e.tags,
            color: e.color,
          },
        }));

        if (evidenceUpdates.length > 0) {
          await evidenceApi.bulkUpdate(evidenceUpdates);
        }

        const canvasStore = useCanvasStore.getState();
        await caseApi.update(currentCase.id, {
          canvasState: {
            zoom: canvasStore.zoom,
            panX: canvasStore.panX,
            panY: canvasStore.panY,
            selectedId: canvasStore.selectedId,
            selectedConnectionId: canvasStore.selectedConnectionId,
          },
        });

        setSaveStatus('saved');
        updateLastSaved();

        setTimeout(() => setSaveStatus('idle'), 2000);
      } catch (error) {
        setSaveStatus('error');
        console.error('Save failed:', error);
      }
    }, delay);
  }, [currentCase, evidence, connections, setSaveStatus, updateLastSaved, delay]);

  const markEvidenceDirty = useCallback((evidenceId: string) => {
    pendingEvidenceUpdatesRef.current.add(evidenceId);
    scheduleSave();
  }, [scheduleSave]);

  const forceSave = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    scheduleSave();
  }, [scheduleSave]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (currentCase && evidence.length > 0) {
      scheduleSave();
    }
  }, [
    currentCase?.id,
    evidence.length,
    connections.length,
    zoom,
    panX,
    panY,
    selectedId,
    selectedConnectionId,
  ]);

  return {
    scheduleSave,
    markEvidenceDirty,
    forceSave,
  };
}
