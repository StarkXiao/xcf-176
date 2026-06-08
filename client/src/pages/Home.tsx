import React, { useEffect } from 'react';
import { Toolbar } from '@/components/Toolbar';
import { Sidebar } from '@/components/Sidebar';
import { Canvas } from '@/components/Canvas';
import { PropertyPanel } from '@/components/PropertyPanel';
import { CaseSelector } from '@/components/CaseSelector';
import { ScanlineEffect } from '@/components/ui/ScanlineEffect';
import { useUiStore } from '@/store/useUiStore';
import { useCaseStore } from '@/store/useCaseStore';
import { useDebouncedSave } from '@/hooks/useDebouncedSave';
import { CYBERPUNK_COLORS } from '@/utils/colorUtils';

const Home: React.FC = () => {
  const currentCase = useCaseStore((state) => state.currentCase);
  const caseSelectorOpen = useUiStore((state) => state.caseSelectorOpen);
  const setCaseSelectorOpen = useUiStore((state) => state.setCaseSelectorOpen);

  useDebouncedSave(500);

  useEffect(() => {
    if (!currentCase && !caseSelectorOpen) {
      setCaseSelectorOpen(true);
    }
  }, [currentCase, caseSelectorOpen, setCaseSelectorOpen]);

  return (
    <div
      className="h-screen flex flex-col overflow-hidden"
      style={{ backgroundColor: CYBERPUNK_COLORS.bgPrimary }}
    >
      <Toolbar />

      <div className="flex-1 flex overflow-hidden">
        <Sidebar />
        <Canvas />
        <PropertyPanel />
      </div>

      <CaseSelector />
      <ScanlineEffect />
    </div>
  );
};

export default Home;
