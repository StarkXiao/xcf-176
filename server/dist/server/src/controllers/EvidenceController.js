import { EvidenceService } from '../services/EvidenceService.js';
import { PersistenceService } from '../services/PersistenceService.js';
export const EvidenceController = {
    async getAllEvidence(_req, reply) {
        try {
            const evidence = EvidenceService.getAllEvidence();
            const response = {
                success: true,
                data: evidence,
            };
            return reply.send(response);
        }
        catch (error) {
            const response = {
                success: false,
                error: error.message,
            };
            return reply.status(500).send(response);
        }
    },
    async getEvidenceById(req, reply) {
        try {
            const { id } = req.params;
            const evidence = EvidenceService.getEvidenceById(id);
            if (!evidence) {
                const response = {
                    success: false,
                    error: '证据不存在',
                };
                return reply.status(404).send(response);
            }
            const response = {
                success: true,
                data: evidence,
            };
            return reply.send(response);
        }
        catch (error) {
            const response = {
                success: false,
                error: error.message,
            };
            return reply.status(500).send(response);
        }
    },
    async getEvidenceByCaseId(req, reply) {
        try {
            const { caseId } = req.params;
            const evidence = EvidenceService.getEvidenceByCaseId(caseId);
            const response = {
                success: true,
                data: evidence,
            };
            return reply.send(response);
        }
        catch (error) {
            const response = {
                success: false,
                error: error.message,
            };
            return reply.status(500).send(response);
        }
    },
    async searchEvidence(req, reply) {
        try {
            const { caseId } = req.params;
            const filter = req.body;
            const evidence = EvidenceService.searchEvidence(caseId, filter);
            const response = {
                success: true,
                data: evidence,
            };
            return reply.send(response);
        }
        catch (error) {
            const response = {
                success: false,
                error: error.message,
            };
            return reply.status(500).send(response);
        }
    },
    async getTags(req, reply) {
        try {
            const { caseId } = req.params;
            const tags = EvidenceService.getAllTags(caseId);
            const response = {
                success: true,
                data: tags,
            };
            return reply.send(response);
        }
        catch (error) {
            const response = {
                success: false,
                error: error.message,
            };
            return reply.status(500).send(response);
        }
    },
    async createEvidence(req, reply) {
        try {
            const { caseId, content } = req.body;
            if (!caseId || !content || content.trim() === '') {
                const response = {
                    success: false,
                    error: '案件ID和内容不能为空',
                };
                return reply.status(400).send(response);
            }
            const newEvidence = EvidenceService.createEvidence(req.body);
            const response = {
                success: true,
                data: newEvidence,
                message: '证据创建成功',
            };
            return reply.status(201).send(response);
        }
        catch (error) {
            const response = {
                success: false,
                error: error.message,
            };
            return reply.status(500).send(response);
        }
    },
    async updateEvidence(req, reply) {
        try {
            const { id } = req.params;
            const updated = EvidenceService.updateEvidence(id, req.body);
            if (!updated) {
                const response = {
                    success: false,
                    error: '证据不存在',
                };
                return reply.status(404).send(response);
            }
            const response = {
                success: true,
                data: updated,
                message: '证据更新成功',
            };
            return reply.send(response);
        }
        catch (error) {
            const response = {
                success: false,
                error: error.message,
            };
            return reply.status(500).send(response);
        }
    },
    async updatePosition(req, reply) {
        try {
            const { id } = req.params;
            const { positionX, positionY } = req.body;
            if (positionX === undefined || positionY === undefined) {
                const response = {
                    success: false,
                    error: '位置参数不完整',
                };
                return reply.status(400).send(response);
            }
            PersistenceService.saveEvidencePosition(id, positionX, positionY);
            const response = {
                success: true,
                message: '位置已保存',
            };
            return reply.send(response);
        }
        catch (error) {
            const response = {
                success: false,
                error: error.message,
            };
            return reply.status(500).send(response);
        }
    },
    async updateSize(req, reply) {
        try {
            const { id } = req.params;
            const { width, height } = req.body;
            if (width === undefined || height === undefined) {
                const response = {
                    success: false,
                    error: '尺寸参数不完整',
                };
                return reply.status(400).send(response);
            }
            PersistenceService.saveEvidenceSize(id, width, height);
            const response = {
                success: true,
                message: '尺寸已保存',
            };
            return reply.send(response);
        }
        catch (error) {
            const response = {
                success: false,
                error: error.message,
            };
            return reply.status(500).send(response);
        }
    },
    async deleteEvidence(req, reply) {
        try {
            const { id } = req.params;
            const deleted = EvidenceService.deleteEvidence(id);
            if (!deleted) {
                const response = {
                    success: false,
                    error: '证据不存在',
                };
                return reply.status(404).send(response);
            }
            const response = {
                success: true,
                message: '证据已移至回收站，版本历史已保留',
            };
            return reply.send(response);
        }
        catch (error) {
            const response = {
                success: false,
                error: error.message,
            };
            return reply.status(500).send(response);
        }
    },
    async getAllDeletedEvidence(_req, reply) {
        try {
            const deleted = EvidenceService.getAllDeletedEvidence();
            const response = {
                success: true,
                data: deleted,
            };
            return reply.send(response);
        }
        catch (error) {
            const response = {
                success: false,
                error: error.message,
            };
            return reply.status(500).send(response);
        }
    },
    async getDeletedByCaseId(req, reply) {
        try {
            const { caseId } = req.params;
            const deleted = EvidenceService.getDeletedEvidenceByCaseId(caseId);
            const response = {
                success: true,
                data: deleted,
            };
            return reply.send(response);
        }
        catch (error) {
            const response = {
                success: false,
                error: error.message,
            };
            return reply.status(500).send(response);
        }
    },
    async getDeletedById(req, reply) {
        try {
            const { id } = req.params;
            const deleted = EvidenceService.getDeletedEvidenceById(id);
            if (!deleted) {
                const response = {
                    success: false,
                    error: '该证据不在回收站中',
                };
                return reply.status(404).send(response);
            }
            const response = {
                success: true,
                data: deleted,
            };
            return reply.send(response);
        }
        catch (error) {
            const response = {
                success: false,
                error: error.message,
            };
            return reply.status(500).send(response);
        }
    },
    async restoreDeletedEvidence(req, reply) {
        try {
            const { id } = req.params;
            const { collaboratorId, collaboratorName } = req.body;
            const result = EvidenceService.restoreDeletedEvidence(id, collaboratorId ?? null, collaboratorName ?? null);
            if (!result.evidence) {
                const response = {
                    success: false,
                    error: '恢复失败：该证据不在回收站中',
                };
                return reply.status(404).send(response);
            }
            let message = '证据已从回收站恢复';
            if (result.skippedConnections.length > 0) {
                message += `，跳过${result.skippedConnections.length}个连接（另一端证据未恢复）`;
            }
            const response = {
                success: true,
                data: result,
                message,
            };
            return reply.send(response);
        }
        catch (error) {
            const response = {
                success: false,
                error: error.message,
            };
            return reply.status(500).send(response);
        }
    },
    async purgeDeletedEvidence(req, reply) {
        try {
            const { id } = req.params;
            const purged = EvidenceService.purgeDeletedEvidence(id);
            if (!purged) {
                const response = {
                    success: false,
                    error: '彻底清除失败：该证据不在回收站中',
                };
                return reply.status(404).send(response);
            }
            const response = {
                success: true,
                message: '证据及其版本历史已被彻底清除（不可恢复）',
            };
            return reply.send(response);
        }
        catch (error) {
            const response = {
                success: false,
                error: error.message,
            };
            return reply.status(500).send(response);
        }
    },
    async purgeAllDeleted(req, reply) {
        try {
            const { days } = req.body;
            const result = EvidenceService.purgeAllDeleted(days);
            const response = {
                success: true,
                data: result,
                message: `已彻底清除 ${result.purgedEvidenceCount} 条回收站证据${days !== undefined ? `（早于 ${days} 天）` : ''}`,
            };
            return reply.send(response);
        }
        catch (error) {
            const response = {
                success: false,
                error: error.message,
            };
            return reply.status(500).send(response);
        }
    },
    async bulkUpdateEvidence(req, reply) {
        try {
            const { updates, collaboratorId, collaboratorName } = req.body;
            if (!updates || !Array.isArray(updates) || updates.length === 0) {
                const response = {
                    success: false,
                    error: '更新列表不能为空',
                };
                return reply.status(400).send(response);
            }
            const updated = EvidenceService.bulkUpdateEvidence(updates, collaboratorId ?? null, collaboratorName ?? null);
            const response = {
                success: true,
                data: updated,
                message: `批量更新了 ${updated.length} 条证据`,
            };
            return reply.send(response);
        }
        catch (error) {
            const response = {
                success: false,
                error: error.message,
            };
            return reply.status(500).send(response);
        }
    },
};
