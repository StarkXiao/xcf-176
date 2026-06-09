import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import Fastify from 'fastify';
import type { FastifyInstance } from 'fastify';
import { evidenceCollectionRoutes } from '../routes/evidenceCollectionRoutes.js';
import { getTestDb, resetTestDb, seedTestCase, seedTestCollaborators } from './helpers/testDb.js';

vi.mock('../database/index.js', () => ({
  get default() { return getTestDb(); },
}));

import { AuditLogRepository } from '../repositories/AuditLogRepository.js';

const CASE_ID = 'api-test-case-001';
const COL_A_ID = 'api-col-001';
const COL_A_NAME = '接口操作员A';
const COL_B_ID = 'api-col-002';
const COL_B_NAME = '接口审核员B';

let server: FastifyInstance;

function seedCase() {
  const db = getTestDb();
  seedTestCase(db, CASE_ID, '接口测试案件');
  seedTestCollaborators(db, CASE_ID, [
    { id: COL_A_ID, name: COL_A_NAME, role: 'operator', color: '#00f0ff' },
    { id: COL_B_ID, name: COL_B_NAME, role: 'reviewer', color: '#9945ff' },
  ]);
}

beforeEach(async () => {
  resetTestDb();
  seedCase();
  server = Fastify();
  server.register(evidenceCollectionRoutes, { prefix: '/api/evidence-collection' });
  await server.ready();
});

afterEach(async () => {
  await server.close();
});

describe('EvidenceCollection API - X-Collaborator-Id 透传', () => {
  it('POST / 无X-Collaborator-Id应使用system作为操作人', async () => {
    const response = await server.inject({
      method: 'POST',
      url: '/api/evidence-collection',
      payload: { caseId: CASE_ID, sourceType: 'manual_entry', content: '无头操作人' },
    });
    expect(response.statusCode).toBe(201);
    const body = JSON.parse(response.body);
    expect(body.success).toBe(true);
    const logs = AuditLogRepository.findByCaseId(CASE_ID);
    expect(logs).toHaveLength(1);
    expect(logs[0].collaboratorId).toBe('system');
    expect(logs[0].collaboratorName).toBe('系统');
  });

  it('POST / 带X-Collaborator-Id应透传到审计日志', async () => {
    const response = await server.inject({
      method: 'POST',
      url: '/api/evidence-collection',
      headers: { 'x-collaborator-id': COL_A_ID },
      payload: { caseId: CASE_ID, sourceType: 'manual_entry', content: '透传操作人' },
    });
    expect(response.statusCode).toBe(201);
    const logs = AuditLogRepository.findByCaseId(CASE_ID);
    expect(logs).toHaveLength(1);
    expect(logs[0].collaboratorId).toBe(COL_A_ID);
    expect(logs[0].collaboratorName).toBe(COL_A_NAME);
  });

  it('成员切换：不同操作人归档应记录各自的归属', async () => {
    const createRes = await server.inject({
      method: 'POST',
      url: '/api/evidence-collection',
      headers: { 'x-collaborator-id': COL_A_ID },
      payload: { caseId: CASE_ID, sourceType: 'manual_entry', content: '成员切换归档' },
    });
    const created = JSON.parse(createRes.body).data;
    const archiveRes = await server.inject({
      method: 'POST',
      url: `/api/evidence-collection/${created.id}/archive`,
      headers: { 'x-collaborator-id': COL_B_ID },
    });
    expect(archiveRes.statusCode).toBe(200);
    const logs = AuditLogRepository.findByCaseId(CASE_ID);
    const collectLog = logs.find((l) => l.detail.includes('采集证据'));
    const archiveLog = logs.find((l) => l.detail.includes('归档证据'));
    expect(collectLog!.collaboratorId).toBe(COL_A_ID);
    expect(archiveLog!.collaboratorId).toBe(COL_B_ID);
    expect(archiveLog!.collaboratorName).toBe(COL_B_NAME);
  });
});

describe('EvidenceCollection API - 重复证据', () => {
  it('POST / 重复采集应返回200 + duplicate状态', async () => {
    await server.inject({
      method: 'POST',
      url: '/api/evidence-collection',
      headers: { 'x-collaborator-id': COL_A_ID },
      payload: { caseId: CASE_ID, sourceType: 'manual_entry', content: 'API重复测试' },
    });
    const dupRes = await server.inject({
      method: 'POST',
      url: '/api/evidence-collection',
      headers: { 'x-collaborator-id': COL_A_ID },
      payload: { caseId: CASE_ID, sourceType: 'manual_entry', content: 'API重复测试' },
    });
    expect(dupRes.statusCode).toBe(200);
    const body = JSON.parse(dupRes.body);
    expect(body.success).toBe(true);
    expect(body.data.verificationStatus).toBe('duplicate');
    expect(body.data.duplicateOf).toBeTruthy();
    expect(body.message).toContain('重复');
  });
});

describe('EvidenceCollection API - 批量归档', () => {
  it('POST /bulk-archive 应批量归档多条证据', async () => {
    const res1 = await server.inject({ method: 'POST', url: '/api/evidence-collection', headers: { 'x-collaborator-id': COL_A_ID }, payload: { caseId: CASE_ID, sourceType: 'manual_entry', content: '批量API-1' } });
    const res2 = await server.inject({ method: 'POST', url: '/api/evidence-collection', headers: { 'x-collaborator-id': COL_A_ID }, payload: { caseId: CASE_ID, sourceType: 'manual_entry', content: '批量API-2' } });
    const id1 = JSON.parse(res1.body).data.id;
    const id2 = JSON.parse(res2.body).data.id;
    const bulkRes = await server.inject({ method: 'POST', url: '/api/evidence-collection/bulk-archive', headers: { 'x-collaborator-id': COL_B_ID }, payload: { ids: [id1, id2] } });
    expect(bulkRes.statusCode).toBe(200);
    const body = JSON.parse(bulkRes.body);
    expect(body.success).toBe(true);
    expect(body.data).toHaveLength(2);
    const logs = AuditLogRepository.findByCaseId(CASE_ID);
    const archiveLogs = logs.filter((l) => l.detail.includes('归档证据'));
    expect(archiveLogs).toHaveLength(2);
    archiveLogs.forEach((l) => { expect(l.collaboratorId).toBe(COL_B_ID); expect(l.collaboratorName).toBe(COL_B_NAME); });
  });

  it('POST /bulk-archive 空数组应返回400', async () => {
    const res = await server.inject({ method: 'POST', url: '/api/evidence-collection/bulk-archive', headers: { 'x-collaborator-id': COL_A_ID }, payload: { ids: [] } });
    expect(res.statusCode).toBe(400);
  });
});

describe('EvidenceCollection API - 删除失败', () => {
  it('DELETE /:id 不存在的ID应返回404', async () => {
    const res = await server.inject({ method: 'DELETE', url: '/api/evidence-collection/non-existent-id', headers: { 'x-collaborator-id': COL_A_ID } });
    expect(res.statusCode).toBe(404);
    expect(JSON.parse(res.body).error).toContain('不存在');
  });

  it('DELETE /:id 删除成功应产生审计并归属正确', async () => {
    const createRes = await server.inject({ method: 'POST', url: '/api/evidence-collection', headers: { 'x-collaborator-id': COL_A_ID }, payload: { caseId: CASE_ID, sourceType: 'manual_entry', content: '待删除' } });
    const id = JSON.parse(createRes.body).data.id;
    await server.inject({ method: 'DELETE', url: `/api/evidence-collection/${id}`, headers: { 'x-collaborator-id': COL_B_ID } });
    const logs = AuditLogRepository.findByCaseId(CASE_ID);
    const deleteLog = logs.find((l) => l.action === 'delete_evidence');
    expect(deleteLog).toBeDefined();
    expect(deleteLog!.collaboratorId).toBe(COL_B_ID);
    expect(deleteLog!.collaboratorName).toBe(COL_B_NAME);
  });
});

describe('EvidenceCollection API - GET 查询', () => {
  it('GET /?caseId=xxx 应返回该案件所有采集项', async () => {
    await server.inject({ method: 'POST', url: '/api/evidence-collection', headers: { 'x-collaborator-id': COL_A_ID }, payload: { caseId: CASE_ID, sourceType: 'manual_entry', content: '查询1' } });
    await server.inject({ method: 'POST', url: '/api/evidence-collection', headers: { 'x-collaborator-id': COL_A_ID }, payload: { caseId: CASE_ID, sourceType: 'file_upload', content: '查询2', fileName: 'test.pdf', fileSize: 1024, fileType: 'application/pdf' } });
    const getRes = await server.inject({ method: 'GET', url: `/api/evidence-collection?caseId=${CASE_ID}` });
    expect(getRes.statusCode).toBe(200);
    expect(JSON.parse(getRes.body).data).toHaveLength(2);
  });

  it('GET / 缺少caseId应返回400', async () => {
    const res = await server.inject({ method: 'GET', url: '/api/evidence-collection' });
    expect(res.statusCode).toBe(400);
  });
});

describe('EvidenceCollection API - 校验接口', () => {
  it('POST /:id/verify 应更新状态并记录操作人', async () => {
    const createRes = await server.inject({ method: 'POST', url: '/api/evidence-collection', headers: { 'x-collaborator-id': COL_A_ID }, payload: { caseId: CASE_ID, sourceType: 'manual_entry', content: '校验接口' } });
    const id = JSON.parse(createRes.body).data.id;
    const verifyRes = await server.inject({ method: 'POST', url: `/api/evidence-collection/${id}/verify`, headers: { 'x-collaborator-id': COL_B_ID } });
    expect(verifyRes.statusCode).toBe(200);
    expect(JSON.parse(verifyRes.body).data.verificationStatus).toBe('verified');
    const verifyLog = AuditLogRepository.findByCaseId(CASE_ID).find((l) => l.action === 'update_evidence');
    expect(verifyLog).toBeDefined();
    expect(verifyLog!.collaboratorId).toBe(COL_B_ID);
  });
});

describe('EvidenceCollection API - 审计记录归属单一可信', () => {
  it('归档全链路应仅在后端产生审计，不重复', async () => {
    const createRes = await server.inject({ method: 'POST', url: '/api/evidence-collection', headers: { 'x-collaborator-id': COL_A_ID }, payload: { caseId: CASE_ID, sourceType: 'manual_entry', content: '审计单一可信' } });
    const id = JSON.parse(createRes.body).data.id;
    await server.inject({ method: 'POST', url: `/api/evidence-collection/${id}/archive`, headers: { 'x-collaborator-id': COL_A_ID } });
    const allLogs = AuditLogRepository.findByCaseId(CASE_ID);
    const createLogs = allLogs.filter((l) => l.detail.includes('采集证据') && !l.detail.includes('重复'));
    const archiveLogs = allLogs.filter((l) => l.detail.includes('归档证据'));
    expect(createLogs).toHaveLength(1);
    expect(archiveLogs).toHaveLength(1);
    expect(allLogs.length).toBe(2);
  });
});
