import type { FastifyRequest, FastifyReply } from 'fastify';
import db from '../database/index.js';
import type { ApiResponse } from '@shared/types';

interface HealthData {
  status: string;
  timestamp: string;
  database: {
    connected: boolean;
    tables: {
      cases: number;
      evidence: number;
      connections: number;
    };
  };
  uptime: number;
}

const startTime = Date.now();

export const HealthController = {
  async check(_req: FastifyRequest, reply: FastifyReply) {
    try {
      const caseCount = db.prepare('SELECT COUNT(*) as count FROM cases').get() as { count: number };
      const evidenceCount = db.prepare('SELECT COUNT(*) as count FROM evidence').get() as { count: number };
      const connectionCount = db.prepare('SELECT COUNT(*) as count FROM connections').get() as { count: number };

      const data: HealthData = {
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

      const response: ApiResponse<HealthData> = {
        success: true,
        data,
      };
      return reply.send(response);
    } catch (error) {
      const data: HealthData = {
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

      const response: ApiResponse<HealthData> = {
        success: false,
        data,
        error: (error as Error).message,
      };
      return reply.status(503).send(response);
    }
  },
};
