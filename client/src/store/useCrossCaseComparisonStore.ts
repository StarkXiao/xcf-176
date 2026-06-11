import { create } from 'zustand';
import { crossCaseComparisonApi } from '@/api/crossCaseComparisonApi';
import type {
  CrossCaseComparisonConfig,
  CrossCaseComparisonResult,
  CrossCaseMatchType,
  DuplicateEvidenceGroup,
  SharedSourceGroup,
  SimilarStructureGroup,
  CrimeChainLink,
} from '@/types';

type ActiveTab = 'overview' | 'duplicate' | 'shared_source' | 'similar_structure' | 'crime_chain';

interface CrossCaseComparisonState {
  result: CrossCaseComparisonResult | null;
  loading: boolean;
  error: string | null;
  activeTab: ActiveTab;
  selectedGroupId: string | null;
  config: CrossCaseComparisonConfig;
  setConfig: (config: CrossCaseComparisonConfig) => void;
  setActiveTab: (tab: ActiveTab) => void;
  setSelectedGroupId: (id: string | null) => void;
  runComparison: (config?: CrossCaseComparisonConfig) => Promise<void>;
  getActiveGroups: () => Array<DuplicateEvidenceGroup | SharedSourceGroup | SimilarStructureGroup | CrimeChainLink>;
}

export const useCrossCaseComparisonStore = create<CrossCaseComparisonState>((set, get) => ({
  result: null,
  loading: false,
  error: null,
  activeTab: 'overview',
  selectedGroupId: null,
  config: {},

  setConfig: (config) => set({ config }),

  setActiveTab: (tab) => set({ activeTab: tab, selectedGroupId: null }),

  setSelectedGroupId: (id) => set({ selectedGroupId: id }),

  runComparison: async (config) => {
    set({ loading: true, error: null });
    try {
      const cfg = config || get().config;
      const response = await crossCaseComparisonApi.compare(cfg);
      if (response.success && response.data) {
        set({ result: response.data, config: cfg });
      } else {
        set({ error: response.error || '跨案件比对失败' });
      }
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Unknown error' });
    } finally {
      set({ loading: false });
    }
  },

  getActiveGroups: () => {
    const { result, activeTab } = get();
    if (!result) return [];
    switch (activeTab) {
      case 'duplicate':
        return result.duplicateEvidenceGroups;
      case 'shared_source':
        return result.sharedSourceGroups;
      case 'similar_structure':
        return result.similarStructureGroups;
      case 'crime_chain':
        return result.crimeChainLinks;
      default:
        return [];
    }
  },
}));
