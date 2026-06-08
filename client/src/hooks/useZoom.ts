import { useCallback } from 'react';
import { useCanvasStore } from '@/store/useCanvasStore';

const MIN_ZOOM = 0.25;
const MAX_ZOOM = 2;
const ZOOM_STEP = 0.1;

export function useZoom() {
  const zoom = useCanvasStore((state) => state.zoom);
  const setZoom = useCanvasStore((state) => state.setZoom);
  const resetView = useCanvasStore((state) => state.resetView);

  const zoomIn = useCallback(() => {
    setZoom(zoom + ZOOM_STEP);
  }, [zoom, setZoom]);

  const zoomOut = useCallback(() => {
    setZoom(zoom - ZOOM_STEP);
  }, [zoom, setZoom]);

  const setZoomLevel = useCallback((level: number) => {
    const clampedLevel = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, level));
    setZoom(clampedLevel);
  }, [setZoom]);

  const handleWheelZoom = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const delta = e.deltaY > 0 ? -ZOOM_STEP : ZOOM_STEP;
    setZoom(zoom + delta);
  }, [zoom, setZoom]);

  return {
    zoom,
    zoomIn,
    zoomOut,
    setZoomLevel,
    handleWheelZoom,
    resetView,
    MIN_ZOOM,
    MAX_ZOOM,
  };
}
