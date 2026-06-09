import { vi } from 'vitest';
import type { EvidenceCollectionItem, ApiResponse } from '@/types';

export const CASE_ID = 'fe-test-case-001';
export const COL_A_ID = 'fe-col-001';
export const COL_A_NAME = '前端操作员A';
export const COL_B_ID = 'fe-col-002';
export const COL_B_NAME = '前端审核员B';

let mockStoreItems: EvidenceCollectionItem[] = [];
let mockNextId = 1;

export function resetMockData() {
  mockStoreItems = [];
  mockNextId = 1;
}

function delay(ms: number = 0): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function createMockItem(overrides: Partial<EvidenceCollectionItem> = {}): EvidenceCollectionItem {
  const id = `fe-ec-${String(mockNextId++).padStart(3, '0')}`;
  return {
    id,
    caseId: CASE_ID,
    sourceType: 'manual_entry',
    content: '测试证据内容',
    contentHash: `hash-${id}`,
    importance: 'normal',
    tags: [],
    verificationStatus: 'verified',
    collectedAt: new Date().toISOString(),
    ...overrides,
  };
}

export const mockEvidenceCollectionApi = {
  getByCaseId: vi.fn(async (caseId: string): Promise<ApiResponse<EvidenceCollectionItem[]>> => {
    await delay();
    return { success: true, data: mockStoreItems.filter((i) => i.caseId === caseId) };
  }),

  create: vi.fn(async (data: Record<string, unknown>): Promise<ApiResponse<EvidenceCollectionItem>> => {
    await delay();
    const item = createMockItem({
      caseId: data.caseId as string,
      sourceType: data.sourceType as EvidenceCollectionItem['sourceType'],
      content: data.content as string,
      sourceUrl: data.sourceUrl as string | undefined,
      fileName: data.fileName as string | undefined,
      fileSize: data.fileSize as number | undefined,
      fileType: data.fileType as string | undefined,
      screenshotDataUrl: data.screenshotDataUrl as string | undefined,
      contentHash: data.contentHash as string,
      importance: (data.importance as EvidenceCollectionItem['importance']) || 'normal',
      tags: (data.tags as string[]) || [],
      verificationStatus: 'verified',
    });
    mockStoreItems.push(item);
    return { success: true, data: item };
  }),

  verify: vi.fn(async (id: string): Promise<ApiResponse<EvidenceCollectionItem>> => {
    await delay();
    const item = mockStoreItems.find((i) => i.id === id);
    if (!item) return { success: false, error: '采集项不存在' };
    item.verificationStatus = 'verified';
    return { success: true, data: item };
  }),

  archive: vi.fn(async (id: string): Promise<ApiResponse<EvidenceCollectionItem>> => {
    await delay();
    const item = mockStoreItems.find((i) => i.id === id);
    if (!item) return { success: false, error: '采集项不存在' };
    if (item.verificationStatus === 'duplicate') return { success: false, error: '重复证据不能归档' };
    if (item.verificationStatus !== 'verified') return { success: false, error: '证据未通过校验' };
    if (item.archivedAt) return { success: false, error: '证据已归档' };
    const archivedEvidenceId = `fe-ev-${item.id}`;
    item.archivedAt = new Date().toISOString();
    item.archivedEvidenceId = archivedEvidenceId;
    return { success: true, data: item };
  }),

  delete: vi.fn(async (id: string): Promise<ApiResponse<void>> => {
    await delay();
    const idx = mockStoreItems.findIndex((i) => i.id === id);
    if (idx === -1) return { success: false, error: '采集项不存在' };
    mockStoreItems.splice(idx, 1);
    return { success: true };
  }),

  bulkArchive: vi.fn(async (ids: string[]): Promise<ApiResponse<EvidenceCollectionItem[]>> => {
    await delay();
    const results: EvidenceCollectionItem[] = [];
    for (const id of ids) {
      const item = mockStoreItems.find((i) => i.id === id);
      if (item && item.verificationStatus === 'verified' && !item.archivedAt) {
        item.archivedAt = new Date().toISOString();
        item.archivedEvidenceId = `fe-ev-${item.id}`;
        results.push(item);
      }
    }
    return { success: true, data: results, message: `成功归档 ${results.length} 条证据` };
  }),
};

export function getMockStoreItems(): EvidenceCollectionItem[] {
  return mockStoreItems;
}

export function addMockItem(item: EvidenceCollectionItem): void {
  mockStoreItems.push(item);
}
