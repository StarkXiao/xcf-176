import db from '../database/index.js';
const startTime = Date.now();
export const HealthController = {
    async check(_req, reply) {
        try {
            const caseCount = db.prepare('SELECT COUNT(*) as count FROM cases').get();
            const evidenceCount = db.prepare('SELECT COUNT(*) as count FROM evidence').get();
            const connectionCount = db.prepare('SELECT COUNT(*) as count FROM connections').get();
            const data = {
                status: 'healthy',
                timestamp: new Date().toISOString(),
                database: {
                    connected: true,
                    tables: {
                        cases: caseCount.count,
                        evidence: evidenceCount.count,
                        connections: connectionCount.count,
                    },
                },
                uptime: Math.floor((Date.now() - startTime) / 1000),
            };
            const response = {
                success: true,
                data,
            };
            return reply.send(response);
        }
        catch (error) {
            const data = {
                status: 'unhealthy',
                timestamp: new Date().toISOString(),
                database: {
                    connected: false,
                    tables: {
                        cases: 0,
                        evidence: 0,
                        connections: 0,
                    },
                },
                uptime: Math.floor((Date.now() - startTime) / 1000),
            };
            const response = {
                success: false,
                data,
                error: error.message,
            };
            return reply.status(503).send(response);
        }
    },
};
