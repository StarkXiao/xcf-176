import { create } from 'zustand';
import { evidenceCollectionApi } from '@/api/evidenceCollectionApi';
import { evidenceApi } from '@/api/evidenceApi';
import type {
  EvidenceCollectionItem,
  CreateCollectionItemDto,
  EvidenceSourceType,
  VerificationStatus,
  Evidence,
} from '@/types';

async function computeContentHash(content: string, sourceType: EvidenceSourceType, extra?: string): Promise<string> {
  const raw = `${sourceType}:${content}${extra ? ':' + extra : ''}`;
  const encoder = new TextEncoder();
  const data = encoder.encode(raw);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('').slice(0, 32);
}

function verifySource(item: CreateCollectionItemDto): { valid: boolean; reason?: string } {
  switch (item.sourceType) {
    case 'webpage_screenshot':
      if (!item.sourceUrl) return { valid: false, reason: '网页截图必须提供来源URL' };
      try {
        new URL(item.sourceUrl);
      } catch {
        return { valid: false, reason: '来源URL格式无效' };
      }
      if (!item.screenshotDataUrl) return { valid: false, reason: '网页截图必须包含截图数据' };
      return { valid: true };
    case 'file_upload':
      if (!item.fileName) return { valid: false, reason: '文件上传必须提供文件名' };
      if (!item.fileSize || item.fileSize <= 0) return { valid: false, reason: '文件大小无效' };
      if (!item.fileType) return { valid: false, reason: '文件类型未识别' };
      return { valid: true };
    case 'manual_entry':
      if (!item.content || item.content.trim().length === 0) return { valid: false, reason: '手工录入内容不能为空' };
      return { valid: true };
    default:
      return { valid: false, reason: '未知来源类型' };
  }
}

interface EvidenceCollectionState {
  items: EvidenceCollectionItem[];
  loading: boolean;
  error: string | null;
  loadItems: (caseId: string) => Promise<void>;
  collectItem: (data: CreateCollectionItemDto) => Promise<EvidenceCollectionItem | null>;
  verifyItem: (id: string) => Promise<void>;
  archiveItem: (id: string) => Promise<void>;
  archiveAllVerified: (caseId: string) => Promise<void>;
  deleteItem: (id: string) => Promise<void>;
  getItemsByCase: (caseId: string) => EvidenceCollectionItem[];
  getPendingItems: (caseId: string) => EvidenceCollectionItem[];
  getArchivedItems: (caseId: string) => EvidenceCollectionItem[];
  checkDuplicate: (contentHash: string, caseId: string) => EvidenceCollectionItem | undefined;
}

export const useEvidenceCollectionStore = create<EvidenceCollectionState>((set, get) => ({
  items: [],
  loading: false,
  error: null,

  loadItems: async (caseId: string) => {
    set({ loading: true, error: null });
    try {
      const response = await evidenceCollectionApi.getByCaseId(caseId);
      if (response.success && response.data) {
        set({ items: response.data });
      } else {
        set({ error: response.error || '加载采集列表失败' });
      }
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Unknown error' });
    } finally {
      set({ loading: false });
    }
  },

  collectItem: async (data: CreateCollectionItemDto) => {
    set({ loading: true, error: null });
    try {
      const verification = verifySource(data);
      if (!verification.valid) {
        set({ error: verification.reason || '来源校验失败', loading: false });
        return null;
      }

      const extra = data.sourceUrl || data.fileName || '';
      const contentHash = await computeContentHash(data.content, data.sourceType, extra);

      const existing = get().checkDuplicate(contentHash, data.caseId);
      if (existing) {
        const duplicateItem: EvidenceCollectionItem = {
          id: existing.id,
          caseId: data.caseId,
          sourceType: data.sourceType,
          content: data.content,
          sourceUrl: data.sourceUrl,
          fileName: data.fileName,
          fileSize: data.fileSize,
          fileType: data.fileType,
          screenshotDataUrl: data.screenshotDataUrl,
          contentHash,
          importance: data.importance || 'normal',
          tags: data.tags || [],
          verificationStatus: 'duplicate' as VerificationStatus,
          duplicateOf: existing.id,
          collectedAt: new Date().toISOString(),
        };
        set((state) => ({
          items: [...state.items, duplicateItem],
          loading: false,
          error: '发现重复证据，已标记为重复',
        }));
        return duplicateItem;
      }

      const dtoWithHash = { ...data, contentHash };
      const response = await evidenceCollectionApi.create(dtoWithHash);
      if (response.success && response.data) {
        const item: EvidenceCollectionItem = {
          ...response.data,
          contentHash,
          verificationStatus: 'verified' as VerificationStatus,
        };
        set((state) => ({ items: [...state.items, item] }));
        return item;
      }
      set({ error: response.error || '采集证据失败', loading: false });
      return null;
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Unknown error', loading: false });
      return null;
    }
  },

  verifyItem: async (id: string) => {
    try {
      const response = await evidenceCollectionApi.verify(id);
      if (response.success && response.data) {
        set((state) => ({
          items: state.items.map((item) =>
            item.id === id ? { ...item, verificationStatus: response.data!.verificationStatus } : item
          ),
        }));
      }
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Unknown error' });
    }
  },

  archiveItem: async (id: string) => {
    set({ loading: true, error: null });
    try {
      const item = get().items.find((i) => i.id === id);
      if (!item) {
        set({ error: '未找到采集项', loading: false });
        return;
      }
      if (item.verificationStatus === 'duplicate') {
        set({ error: '重复证据不能归档', loading: false });
        return;
      }
      if (item.verificationStatus !== 'verified') {
        set({ error: '证据未通过校验，不能归档', loading: false });
        return;
      }

      const response = await evidenceCollectionApi.archive(id);
      if (response.success && response.data) {
        const archived = response.data;
        const archivedEvidenceId = archived.archivedEvidenceId;

        if (archivedEvidenceId) {
          const evidenceResponse = await evidenceApi.getById(archivedEvidenceId);
          if (evidenceResponse.success && evidenceResponse.data) {
            const { useEvidenceStore } = await import('./useEvidenceStore');
            useEvidenceStore.getState().setEvidence([
              ...useEvidenceStore.getState().getEvidenceArray(),
              evidenceResponse.data as Evidence,
            ]);
          }
        }

        set((state) => ({
          items: state.items.map((i) =>
            i.id === id
              ? { ...i, archivedAt: archived.archivedAt || new Date().toISOString(), archivedEvidenceId }
              : i
          ),
        }));
      }
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Unknown error' });
    } finally {
      set({ loading: false });
    }
  },

  archiveAllVerified: async (caseId: string) => {
    const verifiedItems = get().items.filter(
      (item) => item.caseId === caseId && item.verificationStatus === 'verified' && !item.archivedAt
    );
    for (const item of verifiedItems) {
      await get().archiveItem(item.id);
    }
  },

  deleteItem: async (id: string) => {
    try {
      const response = await evidenceCollectionApi.delete(id);
      if (response.success) {
        set((state) => ({
          items: state.items.filter((item) => item.id !== id),
        }));
      }
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Unknown error' });
    }
  },

  getItemsByCase: (caseId: string) => {
    return get().items.filter((item) => item.caseId === caseId);
  },

  getPendingItems: (caseId: string) => {
    return get().items.filter(
      (item) => item.caseId === caseId && !item.archivedAt && item.verificationStatus !== 'duplicate'
    );
  },

  getArchivedItems: (caseId: string) => {
    return get().items.filter((item) => item.caseId === caseId && !!item.archivedAt);
  },

  checkDuplicate: (contentHash: string, caseId: string) => {
    return get().items.find(
      (item) => item.caseId === caseId && item.contentHash === contentHash && item.verificationStatus !== 'duplicate'
    );
  },
}));
