import { useRef, useCallback, useEffect } from 'react';
import { useCanvasStore } from '@/store/useCanvasStore';
import { useZoom } from './useZoom';

export function useCanvas() {
  const canvasRef = useRef<HTMLDivElement>(null);
  const { zoom, setZoomLevel, handleWheelZoom } = useZoom();
  const panX = useCanvasStore((state) => state.panX);
  const panY = useCanvasStore((state) => state.panY);
  const setPan = useCanvasStore((state) => state.setPan);
  const isPanning = useCanvasStore((state) => state.isPanning);
  const setIsPanning = useCanvasStore((state) => state.setIsPanning);
  const drawingConnection = useCanvasStore((state) => state.drawingConnection);
  const setSelectedId = useCanvasStore((state) => state.setSelectedId);

  const isDragging = useRef(false);
  const lastPosition = useRef({ x: 0, y: 0 });

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return;
    if (drawingConnection) return;

    const target = e.target as HTMLElement;
    if (target.closest('[data-evidence-card]')) return;
    if (target.closest('[data-connection-handle]')) return;

    isDragging.current = true;
    setIsPanning(true);
    lastPosition.current = { x: e.clientX, y: e.clientY };
    setSelectedId(null);
  }, [drawingConnection, setIsPanning, setSelectedId]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging.current) return;

    const dx = e.clientX - lastPosition.current.x;
    const dy = e.clientY - lastPosition.current.y;

    setPan(panX + dx, panY + dy);
    lastPosition.current = { x: e.clientX, y: e.clientY };
  }, [panX, panY, setPan]);

  const handleMouseUp = useCallback(() => {
    isDragging.current = false;
    setIsPanning(false);
  }, [setIsPanning]);

  const handleMouseLeave = useCallback(() => {
    isDragging.current = false;
    setIsPanning(false);
  }, [setIsPanning]);

  const screenToWorld = useCallback((screenX: number, screenY: number) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };

    const x = (screenX - rect.left - panX) / zoom;
    const y = (screenY - rect.top - panY) / zoom;

    return { x, y };
  }, [panX, panY, zoom]);

  const worldToScreen = useCallback((worldX: number, worldY: number) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };

    const x = worldX * zoom + panX + rect.left;
    const y = worldY * zoom + panY + rect.top;

    return { x, y };
  }, [panX, panY, zoom]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      handleWheelZoom(e as unknown as React.WheelEvent);
    };

    canvas.addEventListener('wheel', handleWheel, { passive: false });

    return () => {
      canvas.removeEventListener('wheel', handleWheel);
    };
  }, [handleWheelZoom]);

  return {
    canvasRef,
    zoom,
    panX,
    panY,
    isPanning,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleMouseLeave,
    screenToWorld,
    worldToScreen,
    setZoomLevel,
  };
}
