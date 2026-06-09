import { describe, it, expect, beforeEach, vi } from 'vitest';
import { getTestDb, resetTestDb, seedTestCase, seedTestCollaborators } from './helpers/testDb.js';

vi.mock('../database/index.js', () => ({
  get default() { return getTestDb(); },
}));

import { TraceAnalysisService } from '../services/TraceAnalysisService.js';
import { EvidenceCollectionService } from '../services/EvidenceCollectionService.js';
import { EvidenceRepository } from '../repositories/EvidenceRepository.js';
import { ConnectionRepository } from '../repositories/ConnectionRepository.js';

const CASE_ID = 'test-case-001';
const COL_A_ID = 'test-col-001';
const COL_A_NAME = '操作员A';

function seedCase() {
  const db = getTestDb();
  seedTestCase(db, CASE_ID, '测试案件', '链路追踪测试');
  seedTestCollaborators(db, CASE_ID, [
    { id: COL_A_ID, name: COL_A_NAME, role: 'operator', color: '#00f0ff' },
  ]);
}

beforeEach(() => {
  resetTestDb();
  seedCase();
});

describe('TraceAnalysisService - 构建链路图', () => {
  it('空案件应返回空图', () => {
    const graph = TraceAnalysisService.buildTraceGraph(CASE_ID);
    expect(graph.nodes).toHaveLength(0);
    expect(graph.edges).toHaveLength(0);
  });

  it('证据应生成evidence节点', () => {
    EvidenceRepository.create({
      caseId: CASE_ID,
      content: '链路测试证据',
      importance: 'high',
      tags: ['标签A'],
    });
    const graph = TraceAnalysisService.buildTraceGraph(CASE_ID);
    expect(graph.nodes).toHaveLength(1);
    expect(graph.nodes[0].kind).toBe('evidence');
    expect(graph.nodes[0].importance).toBe('high');
    expect(graph.nodes[0].referenceId).toBeTruthy();
    expect(graph.nodes[0].tags).toContain('标签A');
  });

  it('采集项应生成collection节点', () => {
    EvidenceCollectionService.collect(
      { caseId: CASE_ID, sourceType: 'manual_entry', content: '采集链路测试', importance: 'normal', tags: [] },
      COL_A_ID
    );
    const graph = TraceAnalysisService.buildTraceGraph(CASE_ID);
    const collectionNodes = graph.nodes.filter((n) => n.kind === 'collection');
    expect(collectionNodes.length).toBeGreaterThanOrEqual(1);
    expect(collectionNodes[0].sourceType).toBe('manual_entry');
  });

  it('证据连接应生成connection类型的边', () => {
    const ev1 = EvidenceRepository.create({ caseId: CASE_ID, content: '证据1' });
    const ev2 = EvidenceRepository.create({ caseId: CASE_ID, content: '证据2' });
    ConnectionRepository.create({
      caseId: CASE_ID,
      fromEvidenceId: ev1.id,
      toEvidenceId: ev2.id,
      label: '因果关系',
    });
    const graph = TraceAnalysisService.buildTraceGraph(CASE_ID);
    const connEdges = graph.edges.filter((e) => e.kind === 'connection');
    expect(connEdges).toHaveLength(1);
    expect(connEdges[0].label).toBe('因果关系');
    expect(connEdges[0].fromNodeId).toBe(`evidence-${ev1.id}`);
    expect(connEdges[0].toNodeId).toBe(`evidence-${ev2.id}`);
  });

  it('重复采集应生成dedup类型的边', () => {
    EvidenceCollectionService.collect(
      { caseId: CASE_ID, sourceType: 'manual_entry', content: '重复链路' },
      COL_A_ID
    );
    EvidenceCollectionService.collect(
      { caseId: CASE_ID, sourceType: 'manual_entry', content: '重复链路' },
      COL_A_ID
    );
    const graph = TraceAnalysisService.buildTraceGraph(CASE_ID);
    const dedupEdges = graph.edges.filter((e) => e.kind === 'dedup');
    expect(dedupEdges).toHaveLength(1);
    expect(dedupEdges[0].label).toBe('重复');
  });

  it('归档采集项应生成source类型的边', () => {
    const { item } = EvidenceCollectionService.collect(
      { caseId: CASE_ID, sourceType: 'manual_entry', content: '归档链路', importance: 'high' },
      COL_A_ID
    );
    EvidenceCollectionService.archive(item.id, COL_A_ID);
    const graph = TraceAnalysisService.buildTraceGraph(CASE_ID);
    const sourceEdges = graph.edges.filter((e) => e.kind === 'source');
    expect(sourceEdges.length).toBeGreaterThanOrEqual(1);
  });

  it('同类型相邻节点应生成temporal边', () => {
    EvidenceRepository.create({ caseId: CASE_ID, content: '时序1', timestamp: '2025-01-01T10:00:00Z' });
    EvidenceRepository.create({ caseId: CASE_ID, content: '时序2', timestamp: '2025-01-01T11:00:00Z' });
    const graph = TraceAnalysisService.buildTraceGraph(CASE_ID);
    const temporalEdges = graph.edges.filter((e) => e.kind === 'temporal');
    expect(temporalEdges.length).toBeGreaterThanOrEqual(1);
  });

  it('不同案件的证据不应出现在同一图中', () => {
    seedTestCase(getTestDb(), 'case-002', '第二案件');
    EvidenceRepository.create({ caseId: CASE_ID, content: '案件1证据' });
    EvidenceRepository.create({ caseId: 'case-002', content: '案件2证据' });
    const graph = TraceAnalysisService.buildTraceGraph(CASE_ID);
    expect(graph.nodes).toHaveLength(1);
    expect(graph.nodes[0].label).toContain('案件1');
  });
});
