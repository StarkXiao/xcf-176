import { useCallback, useRef } from 'react';
import { useCaseStore } from '@/store/useCaseStore';
import { useEvidenceStore } from '@/store/useEvidenceStore';
import { useCanvasStore } from '@/store/useCanvasStore';
import type { Evidence } from '@/types';

interface DragState {
  isDragging: boolean;
  draggedEvidence: Evidence | null;
  offset: { x: number; y: number };
}

export function useDragDrop(screenToWorld: (x: number, y: number) => { x: number; y: number }) {
  const currentCase = useCaseStore((state) => state.currentCase);
  const updateEvidencePosition = useEvidenceStore((state) => state.updateEvidencePosition);
  const zoom = useCanvasStore((state) => state.zoom);
  const panX = useCanvasStore((state) => state.panX);
  const panY = useCanvasStore((state) => state.panY);
  const canvasRef = useRef<HTMLDivElement>(null);

  const dragState = useRef<DragState>({
    isDragging: false,
    draggedEvidence: null,
    offset: { x: 0, y: 0 },
  });

  const handleDragStart = useCallback((e: React.DragEvent, evidence: Evidence) => {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', evidence.id);
    dragState.current = {
      isDragging: true,
      draggedEvidence: evidence,
      offset: { x: 0, y: 0 },
    };
  }, []);

  const handleDragEnd = useCallback(() => {
    dragState.current = {
      isDragging: false,
      draggedEvidence: null,
      offset: { x: 0, y: 0 },
    };
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }, []);

  const handleDropFromSidebar = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    if (!currentCase) return;

    const evidenceId = e.dataTransfer.getData('text/plain');
    if (!evidenceId) return;

    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const worldPos = screenToWorld(e.clientX, e.clientY);

    const addEvidence = useEvidenceStore.getState().addEvidence;
    await addEvidence({
      caseId: currentCase.id,
      content: '新证据',
      source: '手动添加',
      importance: 'normal',
      tags: [],
      positionX: worldPos.x - 100,
      positionY: worldPos.y - 50,
      width: 200,
      height: 120,
      color: '#00f0ff',
      timestamp: new Date().toISOString(),
    });
  }, [currentCase, screenToWorld]);

  const handleCardMouseDown = useCallback((e: React.MouseEvent, evidence: Evidence) => {
    if (e.button !== 0) return;

    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    dragState.current = {
      isDragging: true,
      draggedEvidence: evidence,
      offset: {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      },
    };

    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!dragState.current.draggedEvidence) return;

      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;

      const x = (moveEvent.clientX - rect.left - panX) / zoom - dragState.current.offset.x;
      const y = (moveEvent.clientY - rect.top - panY) / zoom - dragState.current.offset.y;

      updateEvidencePosition(
        dragState.current.draggedEvidence.id,
        Math.round(x),
        Math.round(y)
      );
    };

    const handleMouseUp = () => {
      dragState.current = {
        isDragging: false,
        draggedEvidence: null,
        offset: { x: 0, y: 0 },
      };
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [zoom, panX, panY, updateEvidencePosition]);

  return {
    canvasRef,
    handleDragStart,
    handleDragEnd,
    handleDragOver,
    handleDropFromSidebar,
    handleCardMouseDown,
  };
}
