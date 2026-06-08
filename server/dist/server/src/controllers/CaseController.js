import { CaseService } from '../services/CaseService.js';
import { PersistenceService } from '../services/PersistenceService.js';
export const CaseController = {
    async getAllCases(_req, reply) {
        try {
            const cases = CaseService.getAllCases();
            const response = {
                success: true,
                data: cases,
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
    async getCaseById(req, reply) {
        try {
            const { id } = req.params;
            const caseData = CaseService.getCaseById(id);
            if (!caseData) {
                const response = {
                    success: false,
                    error: '案件不存在',
                };
                return reply.status(404).send(response);
            }
            const response = {
                success: true,
                data: caseData,
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
    async getCaseWithRelations(req, reply) {
        try {
            const { id } = req.params;
            const caseData = CaseService.getCaseWithRelations(id);
            if (!caseData) {
                const response = {
                    success: false,
                    error: '案件不存在',
                };
                return reply.status(404).send(response);
            }
            const response = {
                success: true,
                data: caseData,
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
    async createCase(req, reply) {
        try {
            const { name, description } = req.body;
            if (!name || name.trim() === '') {
                const response = {
                    success: false,
                    error: '案件名称不能为空',
                };
                return reply.status(400).send(response);
            }
            const newCase = CaseService.createCase({ name, description });
            const response = {
                success: true,
                data: newCase,
                message: '案件创建成功',
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
    async updateCase(req, reply) {
        try {
            const { id } = req.params;
            const updated = CaseService.updateCase(id, req.body);
            if (!updated) {
                const response = {
                    success: false,
                    error: '案件不存在',
                };
                return reply.status(404).send(response);
            }
            const response = {
                success: true,
                data: updated,
                message: '案件更新成功',
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
    async saveCanvasState(req, reply) {
        try {
            const { id } = req.params;
            const { canvasState } = req.body;
            if (!canvasState) {
                const response = {
                    success: false,
                    error: '画布状态不能为空',
                };
                return reply.status(400).send(response);
            }
            const updated = PersistenceService.saveCanvasState(id, canvasState);
            const response = {
                success: true,
                message: '画布状态已保存',
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
    async deleteCase(req, reply) {
        try {
            const { id } = req.params;
            const deleted = CaseService.deleteCase(id);
            if (!deleted) {
                const response = {
                    success: false,
                    error: '案件不存在',
                };
                return reply.status(404).send(response);
            }
            PersistenceService.cancelPending(id);
            const response = {
                success: true,
                message: '案件删除成功',
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
