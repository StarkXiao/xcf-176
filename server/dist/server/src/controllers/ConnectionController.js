import { ConnectionService } from '../services/ConnectionService.js';
export const ConnectionController = {
    async getAllConnections(_req, reply) {
        try {
            const connections = ConnectionService.getAllConnections();
            const response = {
                success: true,
                data: connections,
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
    async getConnectionById(req, reply) {
        try {
            const { id } = req.params;
            const connection = ConnectionService.getConnectionById(id);
            if (!connection) {
                const response = {
                    success: false,
                    error: '连线不存在',
                };
                return reply.status(404).send(response);
            }
            const response = {
                success: true,
                data: connection,
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
    async getConnectionsByCaseId(req, reply) {
        try {
            const { caseId } = req.params;
            const connections = ConnectionService.getConnectionsByCaseId(caseId);
            const response = {
                success: true,
                data: connections,
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
    async getConnectionsByEvidenceId(req, reply) {
        try {
            const { evidenceId } = req.params;
            const connections = ConnectionService.getConnectionsByEvidenceId(evidenceId);
            const response = {
                success: true,
                data: connections,
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
    async createConnection(req, reply) {
        try {
            const { caseId, fromEvidenceId, toEvidenceId } = req.body;
            if (!caseId || !fromEvidenceId || !toEvidenceId) {
                const response = {
                    success: false,
                    error: '案件ID、起始证据ID和目标证据ID不能为空',
                };
                return reply.status(400).send(response);
            }
            if (fromEvidenceId === toEvidenceId) {
                const response = {
                    success: false,
                    error: '不能连接自己',
                };
                return reply.status(400).send(response);
            }
            const newConnection = ConnectionService.createConnection(req.body);
            const response = {
                success: true,
                data: newConnection,
                message: '连线创建成功',
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
    async updateConnection(req, reply) {
        try {
            const { id } = req.params;
            const updated = ConnectionService.updateConnection(id, req.body);
            if (!updated) {
                const response = {
                    success: false,
                    error: '连线不存在',
                };
                return reply.status(404).send(response);
            }
            const response = {
                success: true,
                data: updated,
                message: '连线更新成功',
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
    async deleteConnection(req, reply) {
        try {
            const { id } = req.params;
            const deleted = ConnectionService.deleteConnection(id);
            if (!deleted) {
                const response = {
                    success: false,
                    error: '连线不存在',
                };
                return reply.status(404).send(response);
            }
            const response = {
                success: true,
                message: '连线删除成功',
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
    async deleteConnectionsByCaseId(req, reply) {
        try {
            const { caseId } = req.params;
            const count = ConnectionService.deleteConnectionsByCaseId(caseId);
            const response = {
                success: true,
                data: { deleted: count },
                message: `已删除 ${count} 条连线`,
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
