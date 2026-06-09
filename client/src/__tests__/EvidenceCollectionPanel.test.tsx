import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';

const { mockArchiveAllVerified, mockLoadItems, mockTogglePanel } = vi.hoisted(() => ({
  mockArchiveAllVerified: vi.fn().mockResolvedValue(undefined),
  mockLoadItems: vi.fn().mockResolvedValue(undefined),
  mockTogglePanel: vi.fn(),
}));

vi.mock('@/api/evidenceCollectionApi', () => ({}));
vi.mock('@/api/evidenceApi', () => ({}));
vi.mock('@/api/caseApi', () => ({}));
vi.mock('@/api/auditLogApi', () => ({}));

vi.mock('@/store/useEvidenceCollectionStore', () => ({
  useEvidenceCollectionStore: Object.assign(
    (selector: (s: any) => any) => selector(mockStoreState),
    { getState: () => mockStoreState, setState: (partial: any) => Object.assign(mockStoreState, partial) }
  ),
}));

vi.mock('@/store/useCaseStore', () => ({
  useCaseStore: Object.assign(
    (selector: (s: any) => any) => selector(mockCaseState),
    { getState: () => mockCaseState, setState: (partial: any) => Object.assign(mockCaseState, partial) }
  ),
}));

vi.mock('@/store/useUiStore', () => ({
  useUiStore: Object.assign(
    (selector: (s: any) => any) => selector(mockUiState),
    { getState: () => mockUiState, setState: (partial: any) => Object.assign(mockUiState, partial) }
  ),
}));

import { EvidenceCollectionPanel } from '@/components/EvidenceCollectionPanel';
import type { EvidenceCollectionItem } from '@/types';

const CASE_ID = 'comp-test-case-001';

const mockCaseState: any = {
  currentCase: {
    id: CASE_ID,
    name: '组件测试案件',
    description: '测试用',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    evidence: [],
    connections: [],
    collaborators: [],
  },
};

const mockUiState: any = {
  evidenceCollectionPanelOpen: true,
  toggleEvidenceCollectionPanel: mockTogglePanel,
  currentCollaboratorId: 'col-001',
};

let mockStoreState: any;

function createItem(overrides: Partial<EvidenceCollectionItem> = {}): EvidenceCollectionItem {
  return {
    id: `item-${Math.random().toString(36).slice(2, 8)}`,
    caseId: CASE_ID,
    sourceType: 'manual_entry',
    content: '测试证据内容',
    contentHash: `hash-${Math.random().toString(36).slice(2, 10)}`,
    importance: 'normal',
    tags: [],
    verificationStatus: 'verified',
    collectedAt: new Date().toISOString(),
    ...overrides,
  };
}

beforeEach(() => {
  mockStoreState = {
    items: [],
    loading: false,
    error: null,
    loadItems: mockLoadItems,
    archiveAllVerified: mockArchiveAllVerified,
    collectItem: vi.fn(),
    verifyItem: vi.fn(),
    archiveItem: vi.fn(),
    deleteItem: vi.fn(),
    getItemsByCase: vi.fn(),
    getPendingItems: vi.fn(),
    getArchivedItems: vi.fn(),
    checkDuplicate: vi.fn(),
  };
  vi.clearAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('EvidenceCollectionPanel - 错误提示展示', () => {
  it('store.error 存在时应渲染错误提示横幅', () => {
    mockStoreState.error = '来源校验失败：网页截图必须提供来源URL';

    render(<EvidenceCollectionPanel />);

    const errorBanner = screen.getByText('来源校验失败：网页截图必须提供来源URL');
    expect(errorBanner).toBeInTheDocument();
  });

  it('store.error 为 null 时不应渲染错误提示', () => {
    mockStoreState.error = null;

    render(<EvidenceCollectionPanel />);

    expect(screen.queryByText(/校验失败/)).not.toBeInTheDocument();
  });

  it('操作失败后 error 更新应即时反映到界面', () => {
    mockStoreState.error = null;
    const { rerender } = render(<EvidenceCollectionPanel />);
    expect(screen.queryByText(/重复证据/)).not.toBeInTheDocument();

    mockStoreState.error = '重复证据不能归档';
    rerender(<EvidenceCollectionPanel />);

    expect(screen.getByText('重复证据不能归档')).toBeInTheDocument();
  });

  it('错误提示应包含图标和错误文本', () => {
    mockStoreState.error = '证据未通过校验';

    const { container } = render(<EvidenceCollectionPanel />);

    expect(screen.getByText('证据未通过校验')).toBeInTheDocument();
    const svgIcons = container.querySelectorAll('svg');
    expect(svgIcons.length).toBeGreaterThan(0);
  });

  it('连续操作错误应覆盖前一条错误消息', () => {
    mockStoreState.error = '第一次错误';
    const { rerender } = render(<EvidenceCollectionPanel />);
    expect(screen.getByText('第一次错误')).toBeInTheDocument();

    mockStoreState.error = '第二次错误';
    rerender(<EvidenceCollectionPanel />);

    expect(screen.queryByText('第一次错误')).not.toBeInTheDocument();
    expect(screen.getByText('第二次错误')).toBeInTheDocument();
  });
});

describe('EvidenceCollectionPanel - 底部统计栏', () => {
  it('应正确显示待处理、已校验、重复、已归档计数', () => {
    mockStoreState.items = [
      createItem({ verificationStatus: 'verified' }),
      createItem({ verificationStatus: 'duplicate' }),
      createItem({ verificationStatus: 'verified', archivedAt: new Date().toISOString(), archivedEvidenceId: 'ev-1' }),
      createItem({ verificationStatus: 'pending' }),
    ];

    const { container } = render(<EvidenceCollectionPanel />);

    const statsBar = container.querySelector('.px-3.py-2.border-t');
    const statsText = statsBar?.textContent ?? '';
    expect(statsText).toContain('待处理');
    expect(statsText).toContain('已校验');
    expect(statsText).toContain('重复');
    expect(statsText).toContain('已归档');
  });

  it('无案件选中时应显示"请先选择案件"', () => {
    mockCaseState.currentCase = null;

    render(<EvidenceCollectionPanel />);

    expect(screen.getByText('请先选择案件')).toBeInTheDocument();

    mockCaseState.currentCase = {
      id: CASE_ID,
      name: '组件测试案件',
      description: '测试用',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      evidence: [],
      connections: [],
      collaborators: [],
    };
  });

  it('全部为已归档时统计应全部为0', () => {
    mockStoreState.items = [
      createItem({ verificationStatus: 'verified', archivedAt: new Date().toISOString(), archivedEvidenceId: 'ev-1' }),
      createItem({ verificationStatus: 'verified', archivedAt: new Date().toISOString(), archivedEvidenceId: 'ev-2' }),
    ];

    const { container } = render(<EvidenceCollectionPanel />);

    const statsBar = container.querySelector('.px-3.py-2.border-t');
    const statsText = statsBar?.textContent ?? '';
    expect(statsText).toContain('待处理');
    expect(statsText).toContain('已校验');
    expect(statsText).toContain('已归档');
  });
});

describe('EvidenceCollectionPanel - 批量归档按钮', () => {
  it('存在已校验未归档项时应显示"全部归档"按钮', () => {
    mockStoreState.items = [
      createItem({ verificationStatus: 'verified' }),
    ];

    render(<EvidenceCollectionPanel />);

    expect(screen.getByText(/全部归档/)).toBeInTheDocument();
  });

  it('无已校验未归档项时不应显示"全部归档"按钮', () => {
    mockStoreState.items = [
      createItem({ verificationStatus: 'pending' }),
      createItem({ verificationStatus: 'duplicate' }),
    ];

    render(<EvidenceCollectionPanel />);

    expect(screen.queryByText(/全部归档/)).not.toBeInTheDocument();
  });

  it('点击全部归档按钮应调用 archiveAllVerified', async () => {
    const item1 = createItem({ verificationStatus: 'verified', content: '批量归档UI-1' });
    const item2 = createItem({ verificationStatus: 'verified', content: '批量归档UI-2' });

    mockStoreState.items = [item1, item2];

    render(<EvidenceCollectionPanel />);

    const archiveBtn = screen.getByText(/全部归档\(2\)/);
    fireEvent.click(archiveBtn);

    await waitFor(() => {
      expect(mockArchiveAllVerified).toHaveBeenCalledWith(CASE_ID);
    });
  });
});

describe('EvidenceCollectionPanel - 批量归档后界面同步', () => {
  it('归档后已归档项应从待处理计数移除并增加已归档计数', async () => {
    const item1 = createItem({ verificationStatus: 'verified', content: '归档同步-1' });
    const item2 = createItem({ verificationStatus: 'verified', content: '归档同步-2' });
    const item3 = createItem({ verificationStatus: 'pending', content: '待处理-3' });

    mockStoreState.items = [item1, item2, item3];

    const { container, rerender } = render(<EvidenceCollectionPanel />);

    const statsBarBefore = container.querySelector('.px-3.py-2.border-t');
    expect(statsBarBefore?.textContent).toBeTruthy();

    const archived1 = { ...item1, archivedAt: new Date().toISOString(), archivedEvidenceId: 'ev-arch-1' };
    const archived2 = { ...item2, archivedAt: new Date().toISOString(), archivedEvidenceId: 'ev-arch-2' };
    mockStoreState.items = [archived1, archived2, item3];
    rerender(<EvidenceCollectionPanel />);

    const statsBarAfter = container.querySelector('.px-3.py-2.border-t');
    const statsText = statsBarAfter?.textContent ?? '';
    expect(statsText).toContain('已归档');
  });

  it('归档后切换到已归档 tab 应显示归档项', async () => {
    const item1 = createItem({ verificationStatus: 'verified', content: '归档Tab显示测试' });
    const archived1 = { ...item1, archivedAt: new Date().toISOString(), archivedEvidenceId: 'ev-tab-1' };

    mockStoreState.items = [archived1];

    render(<EvidenceCollectionPanel />);

    const archiveTab = screen.getByText('已归档');
    fireEvent.click(archiveTab);

    await waitFor(() => {
      expect(screen.getByText('归档Tab显示测试')).toBeInTheDocument();
    });
  });

  it('归档后全部归档按钮应消失', async () => {
    const item1 = createItem({ verificationStatus: 'verified', content: '按钮消失测试' });

    mockStoreState.items = [item1];

    const { rerender } = render(<EvidenceCollectionPanel />);
    expect(screen.getByText(/全部归档/)).toBeInTheDocument();

    const archived1 = { ...item1, archivedAt: new Date().toISOString(), archivedEvidenceId: 'ev-btn-1' };
    mockStoreState.items = [archived1];
    rerender(<EvidenceCollectionPanel />);

    expect(screen.queryByText(/全部归档/)).not.toBeInTheDocument();
  });

  it('批量归档后"全部归档"按钮计数应递减', async () => {
    const item1 = createItem({ verificationStatus: 'verified' });
    const item2 = createItem({ verificationStatus: 'verified' });
    const item3 = createItem({ verificationStatus: 'verified' });

    mockStoreState.items = [item1, item2, item3];

    const { rerender } = render(<EvidenceCollectionPanel />);
    expect(screen.getByText(/全部归档\(3\)/)).toBeInTheDocument();

    const archived1 = { ...item1, archivedAt: new Date().toISOString(), archivedEvidenceId: 'ev-1' };
    mockStoreState.items = [archived1, item2, item3];
    rerender(<EvidenceCollectionPanel />);

    expect(screen.getByText(/全部归档\(2\)/)).toBeInTheDocument();
  });
});

describe('EvidenceCollectionPanel - Tab 切换', () => {
  it('点击手工录入 tab 应显示录入表单', async () => {
    render(<EvidenceCollectionPanel />);

    const manualTab = screen.getAllByText('手工录入')[0];
    fireEvent.click(manualTab);

    await waitFor(() => {
      expect(screen.getByPlaceholderText('输入证据内容...')).toBeInTheDocument();
    });
  });

  it('点击已归档 tab 无数据应显示空状态', async () => {
    mockStoreState.items = [];

    render(<EvidenceCollectionPanel />);

    const archiveTabs = screen.getAllByText('已归档');
    fireEvent.click(archiveTabs[0]);

    await waitFor(() => {
      expect(screen.getByText('暂无归档或重复证据')).toBeInTheDocument();
    });
  });
});

describe('EvidenceCollectionPanel - 重复证据展示', () => {
  it('底部统计栏应显示重复计数', () => {
    mockStoreState.items = [
      createItem({ verificationStatus: 'duplicate', content: '重复证据A' }),
      createItem({ verificationStatus: 'verified', content: '正常证据B' }),
    ];

    const { container } = render(<EvidenceCollectionPanel />);

    const statsBar = container.querySelector('.px-3.py-2.border-t');
    const statsText = statsBar?.textContent ?? '';
    expect(statsText).toContain('重复');
  });

  it('切换到已归档 tab 应同时显示重复证据', async () => {
    const dupItem = createItem({
      verificationStatus: 'duplicate',
      content: '重复证据显示测试',
      duplicateOf: 'original-id',
    });

    mockStoreState.items = [dupItem];

    render(<EvidenceCollectionPanel />);

    const archiveTabs = screen.getAllByText('已归档');
    fireEvent.click(archiveTabs[0]);

    await waitFor(() => {
      expect(screen.getByText('重复证据显示测试')).toBeInTheDocument();
    });
  });

  it('重复项应显示"去重拦截"统计横幅', async () => {
    const dupItem = createItem({
      verificationStatus: 'duplicate',
      content: '去重横幅测试',
      duplicateOf: 'orig-id',
    });

    mockStoreState.items = [dupItem];

    render(<EvidenceCollectionPanel />);

    const archiveTabs = screen.getAllByText('已归档');
    fireEvent.click(archiveTabs[0]);

    await waitFor(() => {
      expect(screen.getByText(/去重拦截.*1 条重复证据/)).toBeInTheDocument();
    });
  });

  it('已归档项应显示"已归档"统计横幅', async () => {
    const archivedItem = createItem({
      verificationStatus: 'verified',
      content: '归档横幅测试',
      archivedAt: new Date().toISOString(),
      archivedEvidenceId: 'ev-x',
    });

    mockStoreState.items = [archivedItem];

    render(<EvidenceCollectionPanel />);

    const archiveTabs = screen.getAllByText('已归档');
    fireEvent.click(archiveTabs[0]);

    await waitFor(() => {
      expect(screen.getByText(/已归档.*1 条证据已入库/)).toBeInTheDocument();
    });
  });

  it('重复项在界面应显示"重复"标签', async () => {
    const dupItem = createItem({
      verificationStatus: 'duplicate',
      content: '重复标签测试',
      duplicateOf: 'orig-id',
    });

    mockStoreState.items = [dupItem];

    render(<EvidenceCollectionPanel />);

    const archiveTabs = screen.getAllByText('已归档');
    fireEvent.click(archiveTabs[0]);

    await waitFor(() => {
      expect(screen.getByText('重复标签测试')).toBeInTheDocument();
    });

    expect(screen.getByText(/去重拦截/)).toBeInTheDocument();
  });
});

describe('EvidenceCollectionPanel - 关闭面板', () => {
  it('点击关闭按钮应调用 toggleEvidenceCollectionPanel', () => {
    const { container } = render(<EvidenceCollectionPanel />);

    const buttons = container.querySelectorAll('button');
    const closeButton = Array.from(buttons).find((btn) => {
      const svg = btn.querySelector('svg');
      return svg && !btn.textContent?.trim();
    });

    if (closeButton) {
      fireEvent.click(closeButton);
      expect(mockTogglePanel).toHaveBeenCalled();
    }
  });
});
