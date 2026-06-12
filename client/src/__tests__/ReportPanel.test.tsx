import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';

const {
  mockGenerateReport,
  mockLoadReports,
  mockSelectReport,
  mockRegenerateReport,
  mockExportReport,
  mockDeleteReport,
  mockClearCurrentReport,
  mockClearError,
  mockToggleReportPanel,
} = vi.hoisted(() => ({
  mockGenerateReport: vi.fn(),
  mockLoadReports: vi.fn(),
  mockSelectReport: vi.fn(),
  mockRegenerateReport: vi.fn(),
  mockExportReport: vi.fn(),
  mockDeleteReport: vi.fn(),
  mockClearCurrentReport: vi.fn(),
  mockClearError: vi.fn(),
  mockToggleReportPanel: vi.fn(),
}));

vi.mock('@/api/reportApi', () => ({}));
vi.mock('@/api/caseApi', () => ({}));
vi.mock('@/api/evidenceApi', () => ({}));

vi.mock('@/store/useReportStore', () => ({
  useReportStore: Object.assign(
    (selector: (s: any) => any) => selector(mockReportState),
    { getState: () => mockReportState, setState: (partial: any) => Object.assign(mockReportState, partial) }
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

import { ReportPanel } from '@/components/ReportPanel';
import type { Report, ReportCaseSummary, ReportRelationshipGraph, ReportTimelineEntry, ReportTaskSummary } from '@/types';

const CASE_ID = 'report-test-case-001';

const mockCaseState: any = {
  currentCase: {
    id: CASE_ID,
    name: '测试案件A',
    description: '案件描述',
    status: 'in_progress',
    keyClues: ['线索1', '线索2'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
};

const mockUiState: any = {
  reportPanelOpen: true,
  toggleReportPanel: mockToggleReportPanel,
};

let mockReportState: any;

function createMockCaseSummary(overrides: Partial<ReportCaseSummary> = {}): ReportCaseSummary {
  return {
    caseId: CASE_ID,
    caseName: '测试案件A',
    caseDescription: '案件描述',
    caseStatus: 'in_progress',
    keyClues: ['线索1', '线索2'],
    totalEvidence: 5,
    totalConnections: 3,
    totalTasks: 2,
    evidenceByImportance: { critical: 1, high: 2, normal: 1, low: 1 },
    evidenceBySourceCredibility: { very_high: 1, high: 2, medium: 1, low: 1, very_low: 0 },
    evidenceByVerificationStatus: { verified: 2, pending: 1, unverified: 1, failed: 0, disputed: 1 },
    evidenceByStatus: { pending: 1, in_progress: 1, completed: 2, reviewed: 1 },
    collaborators: [
      { id: 'col-1', name: '张三', role: 'operator' },
      { id: 'col-2', name: '李四', role: 'analyst' },
    ],
    ...overrides,
  };
}

function createMockRelationshipGraph(): ReportRelationshipGraph {
  return {
    nodes: [
      {
        id: 'ev-1',
        content: '证据1：聊天记录',
        source: '微信',
        sourceCredibility: 'high',
        verificationStatus: 'verified',
        importance: 'critical',
        tags: ['聊天', '微信'],
        status: 'reviewed',
        timestamp: '2026-06-01T10:00:00.000Z',
        assignedTo: 'col-1',
      },
      {
        id: 'ev-2',
        content: '证据2：转账记录',
        source: '银行',
        sourceCredibility: 'very_high',
        verificationStatus: 'verified',
        importance: 'high',
        tags: ['转账', '银行'],
        status: 'completed',
        timestamp: '2026-06-02T10:00:00.000Z',
        assignedTo: 'col-2',
      },
    ],
    edges: [
      {
        fromEvidenceId: 'ev-1',
        toEvidenceId: 'ev-2',
        label: '诱导转账',
        fromContent: '证据1：聊天记录',
        toContent: '证据2：转账记录',
      },
    ],
  };
}

function createMockTimeline(): ReportTimelineEntry[] {
  return [
    {
      timestamp: '2026-06-01T10:00:00.000Z',
      type: 'evidence',
      title: '证据1创建',
      description: '创建证据1',
      referenceId: 'ev-1',
    },
    {
      timestamp: '2026-06-02T10:00:00.000Z',
      type: 'connection',
      title: '建立关联',
      description: 'ev-1 -> ev-2',
      referenceId: 'conn-1',
    },
    {
      timestamp: '2026-06-03T10:00:00.000Z',
      type: 'task',
      title: '任务1创建',
      description: '任务1描述',
      referenceId: 'task-1',
    },
    {
      timestamp: '2026-06-04T10:00:00.000Z',
      type: 'audit',
      title: '审核通过',
      description: '审核证据1',
      referenceId: 'audit-1',
    },
  ];
}

function createMockTaskSummaries(): ReportTaskSummary[] {
  return [
    {
      id: 'task-1',
      title: '调取银行流水',
      priority: 'critical',
      status: 'completed',
      assigneeName: '张三',
      deadline: '2026-06-10T00:00:00.000Z',
    },
    {
      id: 'task-2',
      title: '分析聊天记录',
      priority: 'high',
      status: 'in_progress',
      assigneeName: '李四',
      deadline: '2026-06-15T00:00:00.000Z',
    },
  ];
}

function createMockReport(overrides: Partial<Report> = {}): Report {
  return {
    id: `report-${Math.random().toString(36).slice(2, 8)}`,
    caseId: CASE_ID,
    title: '测试报告',
    status: 'completed',
    caseSummary: createMockCaseSummary(),
    relationshipGraph: createMockRelationshipGraph(),
    timeline: createMockTimeline(),
    taskSummaries: createMockTaskSummaries(),
    exportFormat: 'json',
    exportedContent: null,
    generatedAt: '2026-06-05T10:00:00.000Z',
    exportedAt: null,
    createdAt: '2026-06-05T10:00:00.000Z',
    updatedAt: '2026-06-05T10:00:00.000Z',
    ...overrides,
  };
}

beforeEach(() => {
  mockReportState = {
    reports: [],
    currentReport: null,
    loading: false,
    generating: false,
    exporting: false,
    error: null,
    loadReports: mockLoadReports,
    generateReport: mockGenerateReport,
    regenerateReport: mockRegenerateReport,
    exportReport: mockExportReport,
    deleteReport: mockDeleteReport,
    selectReport: mockSelectReport,
    clearCurrentReport: mockClearCurrentReport,
    clearError: mockClearError,
  };
  mockCaseState.currentCase = {
    id: CASE_ID,
    name: '测试案件A',
    description: '案件描述',
    status: 'in_progress',
    keyClues: ['线索1', '线索2'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  vi.clearAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('ReportPanel - 空态提示', () => {
  it('无报告时应显示空态提示', () => {
    mockReportState.reports = [];
    mockReportState.currentReport = null;

    render(<ReportPanel />);

    expect(screen.getByText('证据报告中心')).toBeInTheDocument();
    expect(screen.getByText('暂无报告，点击「生成报告」开始')).toBeInTheDocument();
  });

  it('无案件时界面不崩溃且显示生成按钮', () => {
    mockCaseState.currentCase = null;
    mockReportState.reports = [];

    render(<ReportPanel />);

    expect(screen.getByText('证据报告中心')).toBeInTheDocument();
    const generateButton = screen.getByText('生成报告');
    expect(generateButton).toBeInTheDocument();
  });

  it('空态下生成按钮可点击', () => {
    mockGenerateReport.mockResolvedValue(createMockReport());
    mockReportState.reports = [];
    mockReportState.currentReport = null;

    render(<ReportPanel />);

    fireEvent.click(screen.getByText('生成报告'));

    expect(mockGenerateReport).toHaveBeenCalledTimes(1);
  });
});

describe('ReportPanel - 报告列表回看', () => {
  it('有历史报告时应显示报告列表标题', () => {
    const reports = [
      createMockReport({ id: 'r1', title: '第一版报告', createdAt: '2026-06-01T10:00:00.000Z' }),
      createMockReport({ id: 'r2', title: '第二版报告', createdAt: '2026-06-02T10:00:00.000Z' }),
    ];
    mockReportState.reports = reports;
    mockReportState.currentReport = null;

    render(<ReportPanel />);

    expect(screen.getByText('历史报告')).toBeInTheDocument();
  });

  it('报告列表显示所有报告标题', () => {
    const reports = [
      createMockReport({ id: 'r1', title: '第一版报告' }),
      createMockReport({ id: 'r2', title: '第二版报告' }),
      createMockReport({ id: 'r3', title: '第三版报告' }),
    ];
    mockReportState.reports = reports;
    mockReportState.currentReport = null;

    render(<ReportPanel />);

    expect(screen.getByText('第一版报告')).toBeInTheDocument();
    expect(screen.getByText('第二版报告')).toBeInTheDocument();
    expect(screen.getByText('第三版报告')).toBeInTheDocument();
  });

  it('报告列表项显示统计信息', () => {
    const report = createMockReport({
      id: 'r1',
      title: '统计测试报告',
      caseSummary: createMockCaseSummary({
        totalEvidence: 10,
        totalConnections: 5,
        totalTasks: 3,
      }),
    });
    mockReportState.reports = [report];
    mockReportState.currentReport = null;

    render(<ReportPanel />);

    const listItem = screen.getByText('统计测试报告').closest('button');
    const text = listItem?.textContent || '';
    expect(text).toContain('10');
    expect(text).toContain('5');
    expect(text).toContain('3');
  });

  it('点击报告列表项调用 selectReport', () => {
    const report = createMockReport({ id: 'r-select-test', title: '可点击报告' });
    mockReportState.reports = [report];
    mockReportState.currentReport = null;

    render(<ReportPanel />);

    fireEvent.click(screen.getByText('可点击报告'));

    expect(mockSelectReport).toHaveBeenCalledWith('r-select-test');
    expect(mockSelectReport).toHaveBeenCalledTimes(1);
  });

  it('报告状态标签正确显示', () => {
    const draftReport = createMockReport({ id: 'r-draft', title: '草稿报告', status: 'draft' });
    const completedReport = createMockReport({ id: 'r-completed', title: '已完成报告', status: 'completed' });
    const exportedReport = createMockReport({ id: 'r-exported', title: '已导出报告', status: 'exported' });
    mockReportState.reports = [draftReport, completedReport, exportedReport];
    mockReportState.currentReport = null;

    render(<ReportPanel />);

    expect(screen.getByText('草稿')).toBeInTheDocument();
    expect(screen.getByText('已完成')).toBeInTheDocument();
    expect(screen.getByText('已导出')).toBeInTheDocument();
  });

  it('生成中状态时按钮文字变为生成中...', () => {
    mockReportState.reports = [];
    mockReportState.currentReport = null;
    mockReportState.generating = true;

    render(<ReportPanel />);

    expect(screen.getByText('生成中...')).toBeInTheDocument();
  });
});

describe('ReportPanel - 页签切换', () => {
  beforeEach(() => {
    const report = createMockReport({ id: 'r-tab-test', title: '页签测试报告' });
    mockReportState.reports = [report];
    mockReportState.currentReport = report;
  });

  it('选中报告后显示四个页签', () => {
    render(<ReportPanel />);

    const tabs = screen.getAllByText(/概要|关系图谱|时间线|任务/);
    expect(tabs.length).toBeGreaterThanOrEqual(4);
  });

  it('默认显示概要页签内容', () => {
    render(<ReportPanel />);

    expect(screen.getByText('重要性分布')).toBeInTheDocument();
    expect(screen.getByText('参与人员')).toBeInTheDocument();
  });

  it('点击关系图谱页签切换显示图谱内容', () => {
    render(<ReportPanel />);

    const tabButtons = screen.getAllByRole('button').filter(
      (btn) => btn.textContent?.includes('关系图谱')
    );
    fireEvent.click(tabButtons[0]);

    expect(screen.getByText('证据1：聊天记录')).toBeInTheDocument();
    expect(screen.getByText('证据2：转账记录')).toBeInTheDocument();
  });

  it('点击时间线页签切换显示时间线内容', () => {
    render(<ReportPanel />);

    const tabButtons = screen.getAllByRole('button').filter(
      (btn) => btn.textContent?.includes('时间线')
    );
    fireEvent.click(tabButtons[0]);

    expect(screen.getByText('证据1创建')).toBeInTheDocument();
    expect(screen.getByText('建立关联')).toBeInTheDocument();
    expect(screen.getByText('任务1创建')).toBeInTheDocument();
    expect(screen.getByText('审核通过')).toBeInTheDocument();
  });

  it('点击任务页签切换显示任务内容', () => {
    render(<ReportPanel />);

    const tabButtons = screen.getAllByRole('button').filter(
      (btn) => btn.textContent?.includes('任务') && !btn.textContent?.includes('侦查')
    );
    fireEvent.click(tabButtons[0]);

    expect(screen.getByText('调取银行流水')).toBeInTheDocument();
    expect(screen.getByText('分析聊天记录')).toBeInTheDocument();
  });

  it('多次切换页签后状态正确', () => {
    render(<ReportPanel />);

    const getTabButton = (label: string) =>
      screen.getAllByRole('button').find((btn) => btn.textContent === label);

    fireEvent.click(getTabButton('任务')!);
    expect(screen.getByText('调取银行流水')).toBeInTheDocument();

    fireEvent.click(getTabButton('概要')!);
    expect(screen.getByText('重要性分布')).toBeInTheDocument();

    fireEvent.click(getTabButton('时间线')!);
    expect(screen.getByText('证据1创建')).toBeInTheDocument();

    fireEvent.click(getTabButton('关系图谱')!);
    expect(screen.getByText('证据1：聊天记录')).toBeInTheDocument();
  });
});

describe('ReportPanel - 导出按钮交互', () => {
  beforeEach(() => {
    const report = createMockReport({ id: 'r-export-test', title: '导出测试报告' });
    mockReportState.reports = [report];
    mockReportState.currentReport = report;
    mockReportState.exporting = false;
  });

  it('有选中报告时显示导出按钮', () => {
    render(<ReportPanel />);

    const exportButtons = screen.getAllByRole('button').filter(
      (btn) => btn.textContent?.includes('导出')
    );
    expect(exportButtons.length).toBeGreaterThan(0);
  });

  it('导出中状态按钮文字变化', () => {
    mockReportState.exporting = true;

    render(<ReportPanel />);

    expect(screen.getByText('导出中...')).toBeInTheDocument();
  });

  it('点击导出按钮显示导出菜单', () => {
    render(<ReportPanel />);

    const exportButton = screen.getAllByRole('button').find(
      (btn) => btn.textContent === '导出'
    );
    fireEvent.click(exportButton!);

    expect(screen.getByText('HTML 网页')).toBeInTheDocument();
    expect(screen.getByText('Markdown')).toBeInTheDocument();
    expect(screen.getByText('JSON 数据')).toBeInTheDocument();
  });

  it('选择 HTML 导出格式调用 exportReport', () => {
    mockExportReport.mockResolvedValue({
      ...createMockReport(),
      exportFormat: 'html',
      exportedContent: '<html>test</html>',
    });

    render(<ReportPanel />);

    const exportButton = screen.getAllByRole('button').find(
      (btn) => btn.textContent === '导出'
    );
    fireEvent.click(exportButton!);
    fireEvent.click(screen.getByText('HTML 网页'));

    expect(mockExportReport).toHaveBeenCalledTimes(1);
    expect(mockExportReport).toHaveBeenCalledWith('r-export-test', 'html');
  });

  it('选择 Markdown 导出格式调用 exportReport', () => {
    mockExportReport.mockResolvedValue({
      ...createMockReport(),
      exportFormat: 'markdown',
      exportedContent: '# test',
    });

    render(<ReportPanel />);

    const exportButton = screen.getAllByRole('button').find(
      (btn) => btn.textContent === '导出'
    );
    fireEvent.click(exportButton!);
    fireEvent.click(screen.getByText('Markdown'));

    expect(mockExportReport).toHaveBeenCalledTimes(1);
    expect(mockExportReport).toHaveBeenCalledWith('r-export-test', 'markdown');
  });

  it('选择 JSON 导出格式调用 exportReport', () => {
    mockExportReport.mockResolvedValue({
      ...createMockReport(),
      exportFormat: 'json',
      exportedContent: '{}',
    });

    render(<ReportPanel />);

    const exportButton = screen.getAllByRole('button').find(
      (btn) => btn.textContent === '导出'
    );
    fireEvent.click(exportButton!);
    fireEvent.click(screen.getByText('JSON 数据'));

    expect(mockExportReport).toHaveBeenCalledTimes(1);
    expect(mockExportReport).toHaveBeenCalledWith('r-export-test', 'json');
  });

  it('无选中报告时不显示导出和刷新按钮', () => {
    mockReportState.reports = [createMockReport({ id: 'r1', title: '报告1' })];
    mockReportState.currentReport = null;

    render(<ReportPanel />);

    const exportButtons = screen.queryAllByText('导出');
    const refreshButtons = screen.queryAllByText('刷新');
    expect(exportButtons.length).toBe(0);
    expect(refreshButtons.length).toBe(0);
  });

  it('刷新按钮调用 regenerateReport', () => {
    mockRegenerateReport.mockResolvedValue(createMockReport());

    render(<ReportPanel />);

    const refreshButtons = screen.getAllByRole('button').filter(
      (btn) => btn.textContent === '刷新'
    );
    fireEvent.click(refreshButtons[0]);

    expect(mockRegenerateReport).toHaveBeenCalledTimes(1);
    expect(mockRegenerateReport).toHaveBeenCalledWith('r-export-test');
  });
});

describe('ReportPanel - 删除后的界面同步', () => {
  it('删除当前报告后回到列表视图', () => {
    const report1 = createMockReport({ id: 'r-del-1', title: '将被删除的报告' });
    const report2 = createMockReport({ id: 'r-del-2', title: '保留的报告' });
    mockReportState.reports = [report1, report2];
    mockReportState.currentReport = report1;

    const { rerender } = render(<ReportPanel />);
    expect(screen.getByText('将被删除的报告')).toBeInTheDocument();

    mockReportState.reports = [report2];
    mockReportState.currentReport = null;
    rerender(<ReportPanel />);

    expect(screen.queryByText('重要性分布')).not.toBeInTheDocument();
    expect(screen.getByText('保留的报告')).toBeInTheDocument();
  });

  it('删除最后一个报告后显示空态', () => {
    const report = createMockReport({ id: 'r-last', title: '最后一个报告' });
    mockReportState.reports = [report];
    mockReportState.currentReport = report;

    const { rerender } = render(<ReportPanel />);
    expect(screen.getByText('最后一个报告')).toBeInTheDocument();

    mockReportState.reports = [];
    mockReportState.currentReport = null;
    rerender(<ReportPanel />);

    expect(screen.getByText('暂无报告，点击「生成报告」开始')).toBeInTheDocument();
  });

  it('删除后列表数量正确减少', () => {
    const r1 = createMockReport({ id: 'r1', title: '报告1' });
    const r2 = createMockReport({ id: 'r2', title: '报告2' });
    const r3 = createMockReport({ id: 'r3', title: '报告3' });
    mockReportState.reports = [r1, r2, r3];
    mockReportState.currentReport = null;

    const { rerender } = render(<ReportPanel />);
    expect(screen.getByText('报告1')).toBeInTheDocument();
    expect(screen.getByText('报告2')).toBeInTheDocument();
    expect(screen.getByText('报告3')).toBeInTheDocument();

    mockReportState.reports = [r1, r3];
    rerender(<ReportPanel />);

    expect(screen.queryByText('报告2')).not.toBeInTheDocument();
    expect(screen.getByText('报告1')).toBeInTheDocument();
    expect(screen.getByText('报告3')).toBeInTheDocument();
  });

  it('删除后报告数为 2 个', () => {
    const r1 = createMockReport({ id: 'r1', title: '报告A' });
    const r2 = createMockReport({ id: 'r2', title: '报告B' });
    const r3 = createMockReport({ id: 'r3', title: '报告C' });
    mockReportState.reports = [r1, r2, r3];
    mockReportState.currentReport = null;

    const { rerender } = render(<ReportPanel />);

    mockReportState.reports = [r1, r2];
    rerender(<ReportPanel />);

    expect(screen.getAllByText(/报告[A-C]/)).toHaveLength(2);
  });
});

describe('ReportPanel - 生成报告交互', () => {
  it('点击生成报告按钮调用 generateReport', () => {
    mockGenerateReport.mockResolvedValue(createMockReport());
    mockReportState.reports = [];
    mockReportState.currentReport = null;

    render(<ReportPanel />);

    fireEvent.click(screen.getByText('生成报告'));

    expect(mockGenerateReport).toHaveBeenCalledTimes(1);
    expect(mockGenerateReport).toHaveBeenCalledWith(CASE_ID);
  });

  it('生成报告后自动选中新报告', () => {
    const newReport = createMockReport({ id: 'r-new', title: '新生成的报告' });
    mockReportState.reports = [];
    mockReportState.currentReport = null;
    mockGenerateReport.mockResolvedValue(newReport);

    const { rerender } = render(<ReportPanel />);
    fireEvent.click(screen.getByText('生成报告'));

    mockReportState.reports = [newReport];
    mockReportState.currentReport = newReport;
    rerender(<ReportPanel />);

    expect(screen.getByText('新生成的报告')).toBeInTheDocument();
    expect(screen.getByText('重要性分布')).toBeInTheDocument();
  });
});

describe('ReportPanel - 错误提示', () => {
  it('有错误时显示错误提示', () => {
    mockReportState.error = '生成报告失败：网络错误';
    mockReportState.reports = [];
    mockReportState.currentReport = null;

    render(<ReportPanel />);

    expect(screen.getByText('生成报告失败：网络错误')).toBeInTheDocument();
  });

  it('无错误时不显示错误提示', () => {
    mockReportState.error = null;
    mockReportState.reports = [];
    mockReportState.currentReport = null;

    render(<ReportPanel />);

    expect(screen.queryByText(/失败/)).not.toBeInTheDocument();
  });

  it('错误清除后界面同步更新', () => {
    mockReportState.error = '临时错误';
    mockReportState.reports = [];

    const { rerender } = render(<ReportPanel />);
    expect(screen.getByText('临时错误')).toBeInTheDocument();

    mockReportState.error = null;
    rerender(<ReportPanel />);

    expect(screen.queryByText('临时错误')).not.toBeInTheDocument();
  });
});

describe('ReportPanel - 案件概要详情验证', () => {
  beforeEach(() => {
    const report = createMockReport({
      id: 'r-detail',
      title: '详情验证报告',
      caseSummary: createMockCaseSummary({
        caseName: '案件详情名称',
        caseDescription: '案件详情描述',
        keyClues: ['关键线索A', '关键线索B', '关键线索C'],
        totalEvidence: 15,
        totalConnections: 8,
        totalTasks: 4,
      }),
    });
    mockReportState.reports = [report];
    mockReportState.currentReport = report;
  });

  it('概要页显示案件名称', () => {
    render(<ReportPanel />);

    expect(screen.getByText('案件详情名称')).toBeInTheDocument();
  });

  it('概要页显示案件描述', () => {
    render(<ReportPanel />);

    expect(screen.getByText('案件详情描述')).toBeInTheDocument();
  });

  it('概要页显示所有关键线索', () => {
    render(<ReportPanel />);

    expect(screen.getByText('关键线索A')).toBeInTheDocument();
    expect(screen.getByText('关键线索B')).toBeInTheDocument();
    expect(screen.getByText('关键线索C')).toBeInTheDocument();
  });

  it('概要页显示统计数字', () => {
    render(<ReportPanel />);

    expect(screen.getByText('15')).toBeInTheDocument();
    expect(screen.getByText('8')).toBeInTheDocument();
    expect(screen.getByText('4')).toBeInTheDocument();
  });

  it('概要页显示参与人员', () => {
    render(<ReportPanel />);

    expect(screen.getByText('张三')).toBeInTheDocument();
    expect(screen.getByText('李四')).toBeInTheDocument();
    expect(screen.getByText('operator')).toBeInTheDocument();
    expect(screen.getByText('analyst')).toBeInTheDocument();
  });

  it('概要页显示重要性分布', () => {
    render(<ReportPanel />);

    expect(screen.getByText('重要性分布')).toBeInTheDocument();
  });

  it('概要页显示参与人员标题', () => {
    render(<ReportPanel />);

    expect(screen.getByText('参与人员')).toBeInTheDocument();
  });
});

describe('ReportPanel - 时间线详情验证', () => {
  beforeEach(() => {
    const report = createMockReport({
      id: 'r-timeline',
      title: '时间线验证报告',
      timeline: createMockTimeline(),
    });
    mockReportState.reports = [report];
    mockReportState.currentReport = report;
  });

  function clickTimelineTab() {
    const tabButtons = screen.getAllByRole('button').filter(
      (btn) => btn.textContent?.includes('时间线')
    );
    fireEvent.click(tabButtons[0]);
  }

  it('时间线条目包含类型标签', () => {
    render(<ReportPanel />);
    clickTimelineTab();

    const evidenceTags = screen.getAllByText('证据');
    const connectionTags = screen.getAllByText('关联');
    const taskTags = screen.getAllByText('任务');
    const auditTags = screen.getAllByText('操作');

    expect(evidenceTags.length).toBeGreaterThanOrEqual(1);
    expect(connectionTags.length).toBeGreaterThanOrEqual(1);
    expect(taskTags.length).toBeGreaterThanOrEqual(1);
    expect(auditTags.length).toBeGreaterThanOrEqual(1);
  });

  it('时间线条目数量正确', () => {
    render(<ReportPanel />);
    clickTimelineTab();

    const items = screen.getAllByText(/创建|建立|审核/);
    expect(items.length).toBeGreaterThanOrEqual(4);
  });

  it('时间线包含证据类型条目', () => {
    render(<ReportPanel />);
    clickTimelineTab();

    expect(screen.getByText('证据1创建')).toBeInTheDocument();
  });

  it('时间线包含关联类型条目', () => {
    render(<ReportPanel />);
    clickTimelineTab();

    expect(screen.getByText('建立关联')).toBeInTheDocument();
  });

  it('时间线包含任务类型条目', () => {
    render(<ReportPanel />);
    clickTimelineTab();

    expect(screen.getByText('任务1创建')).toBeInTheDocument();
  });

  it('时间线包含审计类型条目', () => {
    render(<ReportPanel />);
    clickTimelineTab();

    expect(screen.getByText('审核通过')).toBeInTheDocument();
  });
});

describe('ReportPanel - 任务汇总详情验证', () => {
  beforeEach(() => {
    const report = createMockReport({
      id: 'r-tasks',
      title: '任务验证报告',
      taskSummaries: createMockTaskSummaries(),
    });
    mockReportState.reports = [report];
    mockReportState.currentReport = report;
  });

  function clickTaskTab() {
    const tabButtons = screen.getAllByRole('button').filter(
      (btn) => btn.textContent === '任务'
    );
    fireEvent.click(tabButtons[0]);
  }

  it('任务页显示所有任务标题', () => {
    render(<ReportPanel />);
    clickTaskTab();

    expect(screen.getByText('调取银行流水')).toBeInTheDocument();
    expect(screen.getByText('分析聊天记录')).toBeInTheDocument();
  });

  it('任务显示优先级标签', () => {
    render(<ReportPanel />);
    clickTaskTab();

    const criticalBadges = screen.getAllByText('紧急');
    const highBadges = screen.getAllByText('高');

    expect(criticalBadges.length).toBeGreaterThan(0);
    expect(highBadges.length).toBeGreaterThan(0);
  });

  it('任务显示负责人', () => {
    render(<ReportPanel />);
    clickTaskTab();

    expect(screen.getByText('张三')).toBeInTheDocument();
    expect(screen.getByText('李四')).toBeInTheDocument();
  });

  it('任务显示状态文字', () => {
    render(<ReportPanel />);
    clickTaskTab();

    const completedStatuses = screen.getAllByText('已完成');
    const inProgressStatuses = screen.getAllByText('进行中');

    expect(completedStatuses.length).toBeGreaterThanOrEqual(1);
    expect(inProgressStatuses.length).toBeGreaterThanOrEqual(1);
  });

  it('任务数为 2 个', () => {
    render(<ReportPanel />);
    clickTaskTab();

    const tasks = screen.getAllByText(/调取银行流水|分析聊天记录/);
    expect(tasks.length).toBe(2);
  });
});

describe('ReportPanel - 关系图谱详情验证', () => {
  beforeEach(() => {
    const report = createMockReport({
      id: 'r-graph',
      title: '图谱验证报告',
      relationshipGraph: createMockRelationshipGraph(),
    });
    mockReportState.reports = [report];
    mockReportState.currentReport = report;
  });

  function clickGraphTab() {
    const tabButtons = screen.getAllByRole('button').filter(
      (btn) => btn.textContent?.includes('关系图谱')
    );
    fireEvent.click(tabButtons[0]);
  }

  it('关系图谱显示节点和关联统计', () => {
    render(<ReportPanel />);
    clickGraphTab();

    const statsText = screen.getByText(/节点/);
    expect(statsText).toBeInTheDocument();
    expect(statsText.textContent).toContain('2');
    expect(statsText.textContent).toContain('1');
  });

  it('点击节点可展开查看详情', () => {
    render(<ReportPanel />);
    clickGraphTab();

    const nodeButton = screen.getByText('证据1：聊天记录').closest('button');
    fireEvent.click(nodeButton!);

    expect(screen.getByText(/来源:/)).toBeInTheDocument();
    expect(screen.getByText(/状态:/)).toBeInTheDocument();
  });

  it('展开节点显示来源信息', () => {
    render(<ReportPanel />);
    clickGraphTab();

    const nodeButton = screen.getByText('证据1：聊天记录').closest('button');
    fireEvent.click(nodeButton!);

    expect(screen.getByText('微信')).toBeInTheDocument();
  });

  it('展开节点显示关联关系', () => {
    render(<ReportPanel />);
    clickGraphTab();

    const nodeButton = screen.getByText('证据1：聊天记录').closest('button');
    fireEvent.click(nodeButton!);

    expect(screen.getByText(/关联关系:/)).toBeInTheDocument();
    expect(screen.getByText(/诱导转账/)).toBeInTheDocument();
  });

  it('节点显示重要性标签', () => {
    render(<ReportPanel />);
    clickGraphTab();

    expect(screen.getByText('紧急')).toBeInTheDocument();
    expect(screen.getByText('高')).toBeInTheDocument();
  });

  it('证据节点数为 2 个', () => {
    render(<ReportPanel />);
    clickGraphTab();

    const nodes = screen.getAllByText(/证据[12]：/);
    expect(nodes.length).toBe(2);
  });
});

describe('ReportPanel - 报告标题栏验证', () => {
  beforeEach(() => {
    const report = createMockReport({
      id: 'r-header',
      title: '标题测试报告',
      status: 'exported',
      generatedAt: '2026-06-05T10:00:00.000Z',
      exportedAt: '2026-06-06T10:00:00.000Z',
    });
    mockReportState.reports = [report];
    mockReportState.currentReport = report;
  });

  it('选中报告后显示报告标题', () => {
    render(<ReportPanel />);

    expect(screen.getByText('标题测试报告')).toBeInTheDocument();
  });

  it('显示报告状态标签', () => {
    render(<ReportPanel />);

    expect(screen.getByText('已导出')).toBeInTheDocument();
  });

  it('显示工具栏操作按钮', () => {
    render(<ReportPanel />);

    const buttons = screen.getAllByRole('button');
    const hasRefresh = buttons.some((btn) => btn.textContent === '刷新');
    const hasExport = buttons.some((btn) => btn.textContent === '导出');

    expect(hasRefresh).toBe(true);
    expect(hasExport).toBe(true);
  });
});
