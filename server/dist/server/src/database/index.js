import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dataDir = path.join(__dirname, '../../data');
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}
const dbPath = path.join(dataDir, 'cyber.db');
const db = new Database(dbPath);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');
const createTables = () => {
    db.exec(`
    CREATE TABLE IF NOT EXISTS cases (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      canvas_state TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS evidence (
      id TEXT PRIMARY KEY,
      case_id TEXT NOT NULL,
      content TEXT NOT NULL,
      source TEXT DEFAULT 'unknown',
      importance TEXT NOT NULL DEFAULT 'normal',
      tags TEXT DEFAULT '[]',
      position_x REAL NOT NULL DEFAULT 0,
      position_y REAL NOT NULL DEFAULT 0,
      width REAL NOT NULL DEFAULT 200,
      height REAL NOT NULL DEFAULT 120,
      color TEXT DEFAULT '#3b82f6',
      timestamp TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (case_id) REFERENCES cases(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS connections (
      id TEXT PRIMARY KEY,
      case_id TEXT NOT NULL,
      from_evidence_id TEXT NOT NULL,
      to_evidence_id TEXT NOT NULL,
      label TEXT,
      color TEXT DEFAULT '#6b7280',
      line_style TEXT NOT NULL DEFAULT 'solid',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (case_id) REFERENCES cases(id) ON DELETE CASCADE,
      FOREIGN KEY (from_evidence_id) REFERENCES evidence(id) ON DELETE CASCADE,
      FOREIGN KEY (to_evidence_id) REFERENCES evidence(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_evidence_case_id ON evidence(case_id);
    CREATE INDEX IF NOT EXISTS idx_connections_case_id ON connections(case_id);
    CREATE INDEX IF NOT EXISTS idx_connections_from ON connections(from_evidence_id);
    CREATE INDEX IF NOT EXISTS idx_connections_to ON connections(to_evidence_id);
  `);
};
const seedData = () => {
    const caseCount = db.prepare('SELECT COUNT(*) as count FROM cases').get();
    if (caseCount.count > 0)
        return;
    const caseId = 'case-001';
    const now = new Date().toISOString();
    const insertCase = db.prepare(`
    INSERT INTO cases (id, name, description, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?)
  `);
    insertCase.run(caseId, '网络诈骗案', '2024年6月发生的一起涉案金额达500万元的网络投资诈骗案件。嫌疑人通过虚假投资平台诱导多名受害者转账。目前已获取部分聊天记录证据，需要进一步梳理人物关系和资金流向。', now, now);
    const insertEvidence = db.prepare(`
    INSERT INTO evidence (
      id, case_id, content, source, importance, tags,
      position_x, position_y, width, height, color, timestamp, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
    const evidences = [
        {
            id: 'ev-001',
            caseId,
            content: '[微信 2024-06-10 14:32]\n王总：小李啊，最近我这边有个内部投资渠道，年化收益能到35%，一般人我不告诉他。\n小李：王总，这靠谱吗？会不会有风险？\n王总：你放心，我亲戚在证监会上班，有内部消息，已经运作好几年了。',
            source: '微信聊天记录 - 李某手机提取',
            importance: 'high',
            tags: ['聊天记录', '投资诱导', '内部消息'],
            positionX: 100,
            positionY: 100,
            width: 280,
            height: 180,
            color: '#ef4444',
            timestamp: '2024-06-10T14:32:00Z',
        },
        {
            id: 'ev-002',
            caseId,
            content: '[Telegram 2024-06-12 09:15]\n理财顾问-张婷：李先生您好，我是"鼎盛财富"的专属顾问张婷，工号DP00128。\n理财顾问-张婷：您在我们平台注册的体验金已经到账，可以开始体验了。\n小李：好的，我先试试1000块的。',
            source: 'Telegram 聊天记录 - 李某手机提取',
            importance: 'critical',
            tags: ['聊天记录', '虚假平台', '理财顾问'],
            positionX: 450,
            positionY: 80,
            width: 280,
            height: 180,
            color: '#dc2626',
            timestamp: '2024-06-12T09:15:00Z',
        },
        {
            id: 'ev-003',
            caseId,
            content: '[微信 2024-06-15 16:48]\n王总：小李，昨天的20万收益到账了吧？\n小李：到了到了！太感谢王总了！一天就赚了3万！\n王总：我说的没错吧？要是投100万，一天就是15万。\n小李：王总，我准备把房子抵押了，凑500万投进去！',
            source: '微信聊天记录 - 李某手机提取',
            importance: 'critical',
            tags: ['聊天记录', '收益诱惑', '大额投资'],
            positionX: 800,
            positionY: 100,
            width: 280,
            height: 180,
            color: '#dc2626',
            timestamp: '2024-06-15T16:48:00Z',
        },
        {
            id: 'ev-004',
            caseId,
            content: '[银行转账记录 2024-06-16 10:22]\n\n付款人：李某某\n收款人：张某某\n卡号：622848 **** **** 1234\n金额：¥5,000,000.00\n附言：投资款\n\n交易状态：已成功',
            source: '中国农业银行交易流水',
            importance: 'critical',
            tags: ['银行记录', '资金转移', '500万'],
            positionX: 100,
            positionY: 350,
            width: 280,
            height: 160,
            color: '#dc2626',
            timestamp: '2024-06-16T10:22:00Z',
        },
        {
            id: 'ev-005',
            caseId,
            content: '[Telegram 2024-06-18 23:05]\n理财顾问-张婷：李先生，系统检测到您的账户存在异常操作。\n理财顾问-张婷：需要您再缴纳20%的保证金才能解冻账户。\n小李：什么？我刚投了500万啊！\n理财顾问-张婷：这是银监会的规定，没办法的。缴纳后24小时内就可以正常提现了。',
            source: 'Telegram 聊天记录 - 李某手机提取',
            importance: 'high',
            tags: ['聊天记录', '账户冻结', '保证金诈骗'],
            positionX: 450,
            positionY: 330,
            width: 280,
            height: 180,
            color: '#ef4444',
            timestamp: '2024-06-18T23:05:00Z',
        },
        {
            id: 'ev-006',
            caseId,
            content: '[微信 2024-06-20 08:30]\n小李：王总，我的账户被冻结了，张婷说要交保证金。\n王总：小李别急，我帮你问问。\n王总：问清楚了，确实是银监会的新规定。我之前也遇到过，交了就好了。\n王总：机会难得啊，这时候可不能前功尽弃。',
            source: '微信聊天记录 - 李某手机提取',
            importance: 'high',
            tags: ['聊天记录', '团伙配合', '诱导转账'],
            positionX: 800,
            positionY: 350,
            width: 280,
            height: 180,
            color: '#ef4444',
            timestamp: '2024-06-20T08:30:00Z',
        },
        {
            id: 'ev-007',
            caseId,
            content: '[IP 地址分析报告]\n\n"鼎盛财富"平台服务器IP：45.xxx.xxx.128\n注册地：塞舌尔群岛\n实际IP定位：缅甸果敢地区\n\n相关域名注册信息：\n- dscf888.com  注册人：XXX\n- 注册邮箱：fake@email.com\n- 注册时间：2024-03-15',
            source: '网安支队技术分析报告',
            importance: 'high',
            tags: ['技术分析', 'IP定位', '境外服务器'],
            positionX: 100,
            positionY: 580,
            width: 280,
            height: 160,
            color: '#f59e0b',
            timestamp: '2024-06-25T00:00:00Z',
        },
        {
            id: 'ev-008',
            caseId,
            content: '[通话录音 2024-06-21 15:42]\n\n小李：我已经报案了，你们跑不掉的！\n王总（笑）：报案？你去告啊，我人在国外，你能奈我何？\n王总：实话告诉你，什么投资平台，都是我们自己做的。\n王总：你那500万，早就转到境外了，追不回来咯～\n\n（通话时长：3分42秒）',
            source: '李某提供的通话录音',
            importance: 'critical',
            tags: ['录音证据', '嫌疑人承认', '境外窝点'],
            positionX: 450,
            positionY: 580,
            width: 280,
            height: 160,
            color: '#dc2626',
            timestamp: '2024-06-21T15:42:00Z',
        },
        {
            id: 'ev-009',
            caseId,
            content: '[资金流向分析]\n\n李某某 500万\n  ↓\n张某某账户（农业银行）\n  ↓ 2024-06-16 14:32 转出 480万\n  ↓\n刘某某账户（工商银行）\n  ↓ 2024-06-16 16:15 分12笔转出\n  ↓\n多个地下钱庄账户\n  ↓\n境外虚拟货币钱包地址：\n0x7a250d...f88a',
            source: '反洗钱中心协查报告',
            importance: 'critical',
            tags: ['资金流向', '地下钱庄', '虚拟货币'],
            positionX: 800,
            positionY: 580,
            width: 280,
            height: 180,
            color: '#dc2626',
            timestamp: '2024-06-28T00:00:00Z',
        },
    ];
    for (const ev of evidences) {
        insertEvidence.run(ev.id, ev.caseId, ev.content, ev.source, ev.importance, JSON.stringify(ev.tags), ev.positionX, ev.positionY, ev.width, ev.height, ev.color, ev.timestamp, now);
    }
    const insertConnection = db.prepare(`
    INSERT INTO connections (
      id, case_id, from_evidence_id, to_evidence_id,
      label, color, line_style, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
    const connections = [
        {
            id: 'conn-001',
            caseId,
            fromEvidenceId: 'ev-001',
            toEvidenceId: 'ev-002',
            label: '诱导注册',
            color: '#f59e0b',
            lineStyle: 'solid',
        },
        {
            id: 'conn-002',
            caseId,
            fromEvidenceId: 'ev-002',
            toEvidenceId: 'ev-003',
            label: '小额试水后',
            color: '#f59e0b',
            lineStyle: 'solid',
        },
        {
            id: 'conn-003',
            caseId,
            fromEvidenceId: 'ev-003',
            toEvidenceId: 'ev-004',
            label: '500万转账',
            color: '#ef4444',
            lineStyle: 'solid',
        },
        {
            id: 'conn-004',
            caseId,
            fromEvidenceId: 'ev-004',
            toEvidenceId: 'ev-005',
            label: '账户冻结',
            color: '#ef4444',
            lineStyle: 'dashed',
        },
        {
            id: 'conn-005',
            caseId,
            fromEvidenceId: 'ev-005',
            toEvidenceId: 'ev-006',
            label: '同伙配合',
            color: '#ef4444',
            lineStyle: 'solid',
        },
        {
            id: 'conn-006',
            caseId,
            fromEvidenceId: 'ev-006',
            toEvidenceId: 'ev-008',
            label: '嫌疑人承认',
            color: '#ef4444',
            lineStyle: 'solid',
        },
        {
            id: 'conn-007',
            caseId,
            fromEvidenceId: 'ev-004',
            toEvidenceId: 'ev-009',
            label: '资金流向',
            color: '#dc2626',
            lineStyle: 'solid',
        },
        {
            id: 'conn-008',
            caseId,
            fromEvidenceId: 'ev-002',
            toEvidenceId: 'ev-007',
            label: '平台IP关联',
            color: '#6366f1',
            lineStyle: 'dotted',
        },
        {
            id: 'conn-009',
            caseId,
            fromEvidenceId: 'ev-008',
            toEvidenceId: 'ev-007',
            label: '境外窝点',
            color: '#6366f1',
            lineStyle: 'dotted',
        },
    ];
    for (const conn of connections) {
        insertConnection.run(conn.id, conn.caseId, conn.fromEvidenceId, conn.toEvidenceId, conn.label, conn.color, conn.lineStyle, now);
    }
};
createTables();
seedData();
export default db;
