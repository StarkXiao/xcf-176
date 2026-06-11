import fastify from 'fastify';
import { registerCors } from './plugins/cors.js';
import { caseRoutes } from './routes/caseRoutes.js';
import { evidenceRoutes } from './routes/evidenceRoutes.js';
import { connectionRoutes } from './routes/connectionRoutes.js';
import { collaboratorRoutes } from './routes/collaboratorRoutes.js';
import { auditLogRoutes } from './routes/auditLogRoutes.js';
import { evidenceCollectionRoutes } from './routes/evidenceCollectionRoutes.js';
import { consultationRoutes } from './routes/consultationRoutes.js';
import { traceAnalysisRoutes } from './routes/traceAnalysisRoutes.js';
import { investigationTaskRoutes } from './routes/investigationTaskRoutes.js';
import { reportRoutes } from './routes/reportRoutes.js';
import { caseTemplateRoutes } from './routes/caseTemplateRoutes.js';
import { healthRoutes } from './routes/healthRoutes.js';
import { anomalyAlertRoutes } from './routes/anomalyAlertRoutes.js';
import { evidenceVersionRoutes } from './routes/evidenceVersionRoutes.js';
import { crossCaseComparisonRoutes } from './routes/crossCaseComparisonRoutes.js';
import { connectionGroupRoutes } from './routes/connectionGroupRoutes.js';
import { caseSnapshotRoutes } from './routes/caseSnapshotRoutes.js';
import { PersistenceService } from './services/PersistenceService.js';
const server = fastify({
    logger: {
        level: 'info',
    },
});
await registerCors(server);
server.register(healthRoutes, { prefix: '/api/health' });
server.register(caseRoutes, { prefix: '/api/cases' });
server.register(evidenceRoutes, { prefix: '/api/evidence' });
server.register(connectionRoutes, { prefix: '/api/connections' });
server.register(collaboratorRoutes, { prefix: '/api/collaborators' });
server.register(auditLogRoutes, { prefix: '/api/audit-logs' });
server.register(evidenceCollectionRoutes, { prefix: '/api/evidence-collection' });
server.register(consultationRoutes, { prefix: '/api/consultations' });
server.register(traceAnalysisRoutes, { prefix: '/api/trace-analysis' });
server.register(investigationTaskRoutes, { prefix: '/api/investigation-tasks' });
server.register(reportRoutes, { prefix: '/api/reports' });
server.register(caseTemplateRoutes, { prefix: '/api/case-templates' });
server.register(anomalyAlertRoutes, { prefix: '/api/anomaly-alerts' });
server.register(evidenceVersionRoutes, { prefix: '/api/evidence-versions' });
server.register(crossCaseComparisonRoutes, { prefix: '/api/cross-case-comparison' });
server.register(connectionGroupRoutes, { prefix: '/api/connection-groups' });
server.register(caseSnapshotRoutes, { prefix: '/api/case-snapshots' });
const start = async () => {
    try {
        await server.listen({ host: '0.0.0.0', port: 3001 });
        console.log('🚀 Server running on http://0.0.0.0:3001');
        console.log('📊 Health check: http://localhost:3001/api/health');
    }
    catch (err) {
        server.log.error(err);
        process.exit(1);
    }
};
const shutdown = async () => {
    console.log('\n📦 Flushing pending saves...');
    PersistenceService.flushPending();
    console.log('👋 Shutting down server...');
    await server.close();
    process.exit(0);
};
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
start();
