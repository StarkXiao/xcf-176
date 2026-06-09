import { describe, it, expect, beforeEach, vi } from 'vitest';

const { mockCollectionApi, mockRecordAuditLog } = vi.hoisted(() => {
  const mockCollectionApi = {
    getByCaseId: vi.fn(),
    create: vi.fn(),
    verify: vi.fn(),
    archive: vi.fn(),
    delete: vi.fn(),
    bulkArchive: vi.fn(),
  };
  const mockRecordAuditLog = vi.fn();
  return { mockCollectionApi, mockRecordAuditLog };
});

vi.mock('@/api/evidenceCollectionApi', () => ({
  evidenceCollectionApi: mockCollectionApi,
}));

vi.mock('@/api/evidenceApi', () => ({
  evidenceApi: {
    getById: vi.fn(async (id: string) => ({
      success: true,
      data: { id, content: 'mock evidence', caseId: 'fe-test-case-001' },
    })),
  },
}));

vi.mock('@/utils/auditHelper', () => ({
  recordAuditLog: mockRecordAuditLog,
}));

import { useEvidenceCollectionStore } from '@/store/useEvidenceCollectionStore';
import { useUiStore } from '@/store/useUiStore';
import type { EvidenceCollectionItem } from '@/types';

const CASE_ID = 'fe-test-case-001';
const COL_A_ID = 'fe-col-001';
const COL_B_ID = 'fe-col-002';

let mockStoreItems: EvidenceCollectionItem[] = [];
let mockNextId = 1;

function createMockItem(overrides: Partial<EvidenceCollectionItem> = {}): EvidenceCollectionItem {
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

function addItemToBoth(item: EvidenceCollectionItem) {
  mockStoreItems.push(item);
  const current = useEvidenceCollectionStore.getState().items;
  useEvidenceCollectionStore.setState({ items: [...current, item] });
}

beforeEach(() => {
  mockStoreItems = [];
  mockNextId = 1;
  vi.clearAllMocks();
  useEvidenceCollectionStore.setState({ items: [], loading: false, error: null });
  useUiStore.setState({
    currentCollaboratorId: COL_A_ID,
  } as Partial<ReturnType<typeof useUiStore.getState>>);

  mockCollectionApi.getByCaseId.mockImplementation(async (caseId: string) => ({
    success: true,
    data: mockStoreItems.filter((i) => i.caseId === caseId),
  }));

  mockCollectionApi.create.mockImplementation(async (data: Record<string, unknown>) => {
    const item = createMockItem({
      caseId: data.caseId as string,
      sourceType: data.sourceType as EvidenceCollectionItem['sourceType'],
      content: data.content as string,
      contentHash: data.contentHash as string,
      importance: (data.importance as EvidenceCollectionItem['importance']) || 'normal',
      tags: (data.tags as string[]) || [],
      verificationStatus: 'verified',
    });
    mockStoreItems.push(item);
    return { success: true, data: item };
  });

  mockCollectionApi.verify.mockImplementation(async (id: string) => {
    const item = mockStoreItems.find((i) => i.id === id);
    if (!item) return { success: false, error: '采集项不存在' };
    item.verificationStatus = 'verified';
    return { success: true, data: { ...item, verificationStatus: 'verified' as const } };
  });

  mockCollectionApi.archive.mockImplementation(async (id: string) => {
    const item = mockStoreItems.find((i) => i.id === id);
    if (!item) return { success: false, error: '采集项不存在' };
    if (item.verificationStatus === 'duplicate') return { success: false, error: '重复证据不能归档' };
    if (item.verificationStatus !== 'verified') return { success: false, error: '证据未通过校验' };
    if (item.archivedAt) return { success: false, error: '证据已归档' };
    item.archivedAt = new Date().toISOString();
    item.archivedEvidenceId = `fe-ev-${item.id}`;
    return { success: true, data: { ...item, archivedAt: item.archivedAt, archivedEvidenceId: item.archivedEvidenceId } };
  });

  mockCollectionApi.delete.mockImplementation(async (id: string) => {
    const idx = mockStoreItems.findIndex((i) => i.id === id);
    if (idx === -1) return { success: false, error: '采集项不存在' };
    mockStoreItems.splice(idx, 1);
    return { success: true };
  });

  mockCollectionApi.bulkArchive.mockImplementation(async (ids: string[]) => {
    const results: EvidenceCollectionItem[] = [];
    for (const id of ids) {
      const item = mockStoreItems.find((i) => i.id === id);
      if (item && item.verificationStatus === 'verified' && !item.archivedAt) {
        item.archivedAt = new Date().toISOString();
        item.archivedEvidenceId = `fe-ev-${item.id}`;
        results.push({ ...item });
      }
    }
    return { success: true, data: results, message: `成功归档 ${results.length} 条证据` };
  });
});

describe('前端协作场景 - 成员切换', () => {
  it('切换currentCollaboratorId后采集应正常工作', async () => {
    const store = useEvidenceCollectionStore.getState();

    useUiStore.setState({ currentCollaboratorId: COL_A_ID });
    await store.collectItem({
      caseId: CASE_ID,
      sourceType: 'manual_entry',
      content: '操作员A采集',
    });

    useUiStore.setState({ currentCollaboratorId: COL_B_ID });
    await store.collectItem({
      caseId: CASE_ID,
      sourceType: 'manual_entry',
      content: '审核员B采集',
    });

    expect(mockCollectionApi.create).toHaveBeenCalledTimes(2);
  });

  it('成员切换后archiveItem应调用后端归档API', async () => {
    const item = createMockItem({
      caseId: CASE_ID,
      content: '成员切换归档测试',
      verificationStatus: 'verified',
    });
    addItemToBoth(item);

    useUiStore.setState({ currentCollaboratorId: COL_B_ID });

    const store = useEvidenceCollectionStore.getState();
    await store.archiveItem(item.id);

    expect(mockCollectionApi.archive).toHaveBeenCalledWith(item.id);
  });
});

describe('前端协作场景 - 重复证据', () => {
  it('前端checkDuplicate应阻止重复内容提交到后端', async () => {
    const raw = 'manual_entry:前端去重测试';
    const encoder = new TextEncoder();
    const hashData = encoder.encode(raw);
    const hashBuffer = await crypto.subtle.digest('SHA-256', hashData);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const realContentHash = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('').slice(0, 32);

    const existingItem = createMockItem({
      caseId: CASE_ID,
      content: '前端去重测试',
      contentHash: realContentHash,
      verificationStatus: 'verified',
    });
    addItemToBoth(existingItem);

    const store = useEvidenceCollectionStore.getState();
    const result = await store.collectItem({
      caseId: CASE_ID,
      sourceType: 'manual_entry',
      content: '前端去重测试',
    });

    expect(result).not.toBeNull();
    expect(result!.verificationStatus).toBe('duplicate');
    expect(result!.duplicateOf).toBe(existingItem.id);
    expect(mockCollectionApi.create).not.toHaveBeenCalled();
  });

  it('不同案件相同内容不算重复', async () => {
    const itemInOtherCase = createMockItem({
      caseId: 'other-case-id',
      content: '跨案件内容',
      contentHash: 'fe-hash-cross-001',
      verificationStatus: 'verified',
    });
    useEvidenceCollectionStore.setState({ items: [itemInOtherCase] });

    const store = useEvidenceCollectionStore.getState();
    await store.collectItem({
      caseId: CASE_ID,
      sourceType: 'manual_entry',
      content: '跨案件内容',
    });

    expect(mockCollectionApi.create).toHaveBeenCalled();
  });

  it('重复证据在getPendingItems中应被排除', () => {
    const normalItem = createMockItem({ caseId: CASE_ID, content: '正常项', verificationStatus: 'verified' });
    const dupItem = createMockItem({ caseId: CASE_ID, content: '重复项', verificationStatus: 'duplicate' });

    useEvidenceCollectionStore.setState({ items: [normalItem, dupItem] });

    const store = useEvidenceCollectionStore.getState();
    const pending = store.getPendingItems(CASE_ID);

    expect(pending).toHaveLength(1);
    expect(pending[0].id).toBe(normalItem.id);
  });
});

describe('前端协作场景 - 归档流程', () => {
  it('archiveItem应调用后端归档API而非addEvidence', async () => {
    const item = createMockItem({
      caseId: CASE_ID,
      content: '归档流程测试',
      verificationStatus: 'verified',
    });
    addItemToBoth(item);

    const store = useEvidenceCollectionStore.getState();
    await store.archiveItem(item.id);

    expect(mockCollectionApi.archive).toHaveBeenCalledWith(item.id);
  });

  it('未校验证据归档应显示错误', async () => {
    const item = createMockItem({
      caseId: CASE_ID,
      content: '未校验归档测试',
      verificationStatus: 'pending',
    });
    addItemToBoth(item);

    const store = useEvidenceCollectionStore.getState();
    await store.archiveItem(item.id);

    const state = useEvidenceCollectionStore.getState();
    expect(state.error).toContain('校验');
    expect(mockCollectionApi.archive).not.toHaveBeenCalled();
  });

  it('重复证据归档应显示错误', async () => {
    const item = createMockItem({
      caseId: CASE_ID,
      content: '重复归档测试',
      verificationStatus: 'duplicate',
      duplicateOf: 'some-other-id',
    });
    addItemToBoth(item);

    const store = useEvidenceCollectionStore.getState();
    await store.archiveItem(item.id);

    const state = useEvidenceCollectionStore.getState();
    expect(state.error).toContain('重复');
    expect(mockCollectionApi.archive).not.toHaveBeenCalled();
  });

  it('归档成功后本地状态应更新archivedAt', async () => {
    const item = createMockItem({
      caseId: CASE_ID,
      content: '归档状态更新测试',
      verificationStatus: 'verified',
    });
    addItemToBoth(item);

    const store = useEvidenceCollectionStore.getState();
    await store.archiveItem(item.id);

    const state = useEvidenceCollectionStore.getState();
    const updated = state.items.find((i) => i.id === item.id);
    expect(updated!.archivedAt).toBeTruthy();
    expect(updated!.archivedEvidenceId).toBeTruthy();
  });
});

describe('前端协作场景 - 批量归档', () => {
  it('archiveAllVerified应归档所有已校验未归档项', async () => {
    const item1 = createMockItem({ caseId: CASE_ID, content: '批量归档1', verificationStatus: 'verified' });
    const item2 = createMockItem({ caseId: CASE_ID, content: '批量归档2', verificationStatus: 'verified' });
    const item3 = createMockItem({ caseId: CASE_ID, content: '未校验项', verificationStatus: 'pending' });

    addItemToBoth(item1);
    addItemToBoth(item2);
    addItemToBoth(item3);

    const store = useEvidenceCollectionStore.getState();
    await store.archiveAllVerified(CASE_ID);

    expect(mockCollectionApi.archive).toHaveBeenCalledTimes(2);
  });

  it('archiveAllVerified不包含其他案件的证据', async () => {
    const itemInCase = createMockItem({ caseId: CASE_ID, content: '本案件', verificationStatus: 'verified' });
    const itemInOtherCase = createMockItem({ caseId: 'other-case-id', content: '其他案件', verificationStatus: 'verified' });

    addItemToBoth(itemInCase);
    addItemToBoth(itemInOtherCase);

    const store = useEvidenceCollectionStore.getState();
    await store.archiveAllVerified(CASE_ID);

    expect(mockCollectionApi.archive).toHaveBeenCalledTimes(1);
    expect(mockCollectionApi.archive).toHaveBeenCalledWith(itemInCase.id);
  });
});

describe('前端协作场景 - 删除', () => {
  it('deleteItem应从本地状态中移除', async () => {
    const item = createMockItem({ caseId: CASE_ID, content: '待删除项' });
    addItemToBoth(item);

    const store = useEvidenceCollectionStore.getState();
    await store.deleteItem(item.id);

    const state = useEvidenceCollectionStore.getState();
    expect(state.items.find((i) => i.id === item.id)).toBeUndefined();
    expect(mockCollectionApi.delete).toHaveBeenCalledWith(item.id);
  });

  it('deleteItem API失败不应清空本地状态', async () => {
    const item = createMockItem({ caseId: CASE_ID, content: '删除失败测试' });
    addItemToBoth(item);
    mockCollectionApi.delete.mockResolvedValueOnce({ success: false, error: '不存在' });

    const store = useEvidenceCollectionStore.getState();
    await store.deleteItem(item.id);

    expect(useEvidenceCollectionStore.getState().items).toHaveLength(1);
  });
});

describe('前端协作场景 - 审计一致性', () => {
  it('前端store不应调用recordAuditLog（由后端单一可信）', async () => {
    const item = createMockItem({ caseId: CASE_ID, content: '审计一致性测试', verificationStatus: 'verified' });
    addItemToBoth(item);

    const store = useEvidenceCollectionStore.getState();
    await store.collectItem({ caseId: CASE_ID, sourceType: 'manual_entry', content: '前端不写审计' });
    await store.archiveItem(item.id);
    await store.deleteItem(item.id);

    expect(mockRecordAuditLog).not.toHaveBeenCalled();
  });
});

describe('前端协作场景 - 加载与状态', () => {
  it('loadItems应从后端同步最新数据', async () => {
    const item = createMockItem({ caseId: CASE_ID, content: '加载测试' });
    mockStoreItems.push(item);

    const store = useEvidenceCollectionStore.getState();
    await store.loadItems(CASE_ID);

    expect(mockCollectionApi.getByCaseId).toHaveBeenCalledWith(CASE_ID);
    const state = useEvidenceCollectionStore.getState();
    expect(state.items).toHaveLength(1);
    expect(state.items[0].content).toBe('加载测试');
  });

  it('verifyItem应更新本地verificationStatus', async () => {
    const item = createMockItem({ caseId: CASE_ID, content: '校验状态更新', verificationStatus: 'pending' });
    addItemToBoth(item);

    const store = useEvidenceCollectionStore.getState();
    await store.verifyItem(item.id);

    const state = useEvidenceCollectionStore.getState();
    const updated = state.items.find((i) => i.id === item.id);
    expect(updated!.verificationStatus).toBe('verified');
  });

  it('getArchivedItems应仅返回已归档项', () => {
    const archivedItem = createMockItem({
      caseId: CASE_ID,
      content: '已归档',
      archivedAt: new Date().toISOString(),
      archivedEvidenceId: 'ev-001',
    });
    const pendingItem = createMockItem({ caseId: CASE_ID, content: '待处理', verificationStatus: 'pending' });

    useEvidenceCollectionStore.setState({ items: [archivedItem, pendingItem] });

    const store = useEvidenceCollectionStore.getState();
    const archived = store.getArchivedItems(CASE_ID);
    expect(archived).toHaveLength(1);
    expect(archived[0].id).toBe(archivedItem.id);
  });
});
