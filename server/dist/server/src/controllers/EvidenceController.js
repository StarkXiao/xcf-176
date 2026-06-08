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
                message: '证据删除成功',
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
