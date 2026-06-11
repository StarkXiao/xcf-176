import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import type { Case, Evidence, Connection, Collaborator } from '@shared/types';
import { builtInTemplates } from '../data/builtInTemplates.js';

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
      status TEXT NOT NULL DEFAULT 'pending',
      key_clues TEXT DEFAULT '[]',
      canvas_state TEXT,
      template_id TEXT,
      template_metadata TEXT,
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
      assigned_to TEXT DEFAULT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
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

    CREATE TABLE IF NOT EXISTS collaborators (
      id TEXT PRIMARY KEY,
      case_id TEXT NOT NULL,
      name TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'operator',
      color TEXT NOT NULL DEFAULT '#00f0ff',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (case_id) REFERENCES cases(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS audit_logs (
      id TEXT PRIMARY KEY,
      case_id TEXT NOT NULL,
      collaborator_id TEXT NOT NULL,
      collaborator_name TEXT NOT NULL DEFAULT '',
      action TEXT NOT NULL,
      target_type TEXT NOT NULL,
      target_id TEXT NOT NULL,
      detail TEXT NOT NULL DEFAULT '',
      snapshot TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (case_id) REFERENCES cases(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS evidence_collection (
      id TEXT PRIMARY KEY,
      case_id TEXT NOT NULL,
      source_type TEXT NOT NULL,
      content TEXT NOT NULL,
      source_url TEXT,
      file_name TEXT,
      file_size INTEGER,
      file_type TEXT,
      screenshot_data_url TEXT,
      content_hash TEXT NOT NULL,
      importance TEXT NOT NULL DEFAULT 'normal',
      tags TEXT DEFAULT '[]',
      verification_status TEXT NOT NULL DEFAULT 'pending',
      duplicate_of TEXT,
      collected_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      archived_at TEXT,
      archived_evidence_id TEXT,
      FOREIGN KEY (case_id) REFERENCES cases(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS consultations (
      id TEXT PRIMARY KEY,
      case_id TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT DEFAULT '',
      status TEXT NOT NULL DEFAULT 'open',
      initiated_by TEXT NOT NULL,
      evidence_ids TEXT DEFAULT '[]',
      key_clues TEXT DEFAULT '[]',
      concluded_at TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (case_id) REFERENCES cases(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS consultation_discussions (
      id TEXT PRIMARY KEY,
      consultation_id TEXT NOT NULL,
      collaborator_id TEXT NOT NULL,
      collaborator_name TEXT NOT NULL DEFAULT '',
      evidence_id TEXT,
      content TEXT NOT NULL,
      is_dispute INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (consultation_id) REFERENCES consultations(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS consultation_conclusions (
      id TEXT PRIMARY KEY,
      consultation_id TEXT NOT NULL,
      content TEXT NOT NULL,
      decided_by TEXT NOT NULL,
      decided_by_name TEXT NOT NULL DEFAULT '',
      case_status_update TEXT,
      key_clues_update TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (consultation_id) REFERENCES consultations(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS consultation_disputes (
      id TEXT PRIMARY KEY,
      consultation_id TEXT NOT NULL,
      discussion_id TEXT NOT NULL,
      evidence_id TEXT,
      description TEXT NOT NULL,
      raised_by TEXT NOT NULL,
      raised_by_name TEXT NOT NULL DEFAULT '',
      resolution TEXT,
      resolved_by TEXT,
      resolved_by_name TEXT,
      resolved_at TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (consultation_id) REFERENCES consultations(id) ON DELETE CASCADE,
      FOREIGN KEY (discussion_id) REFERENCES consultation_discussions(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS investigation_tasks (
      id TEXT PRIMARY KEY,
      case_id TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT DEFAULT '',
      priority TEXT NOT NULL DEFAULT 'normal',
      status TEXT NOT NULL DEFAULT 'pending',
      assignee_id TEXT,
      assignee_name TEXT DEFAULT NULL,
      deadline TEXT,
      evidence_ids TEXT DEFAULT '[]',
      collection_item_ids TEXT DEFAULT '[]',
      connection_ids TEXT DEFAULT '[]',
      sync_notes TEXT DEFAULT '[]',
      created_by TEXT NOT NULL,
      created_by_name TEXT NOT NULL DEFAULT '',
      completed_at TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (case_id) REFERENCES cases(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_evidence_case_id ON evidence(case_id);
    CREATE INDEX IF NOT EXISTS idx_connections_case_id ON connections(case_id);
    CREATE INDEX IF NOT EXISTS idx_connections_from ON connections(from_evidence_id);
    CREATE INDEX IF NOT EXISTS idx_connections_to ON connections(to_evidence_id);
    CREATE INDEX IF NOT EXISTS idx_collaborators_case_id ON collaborators(case_id);
    CREATE INDEX IF NOT EXISTS idx_audit_logs_case_id ON audit_logs(case_id);
    CREATE INDEX IF NOT EXISTS idx_audit_logs_collaborator_id ON audit_logs(collaborator_id);
    CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);
    CREATE INDEX IF NOT EXISTS idx_evidence_collection_case_id ON evidence_collection(case_id);
    CREATE INDEX IF NOT EXISTS idx_evidence_collection_content_hash ON evidence_collection(content_hash);
    CREATE INDEX IF NOT EXISTS idx_evidence_collection_status ON evidence_collection(verification_status);
    CREATE INDEX IF NOT EXISTS idx_consultations_case_id ON consultations(case_id);
    CREATE INDEX IF NOT EXISTS idx_consultations_status ON consultations(status);
    CREATE INDEX IF NOT EXISTS idx_consultation_discussions_consultation_id ON consultation_discussions(consultation_id);
    CREATE INDEX IF NOT EXISTS idx_consultation_conclusions_consultation_id ON consultation_conclusions(consultation_id);
    CREATE INDEX IF NOT EXISTS idx_consultation_disputes_consultation_id ON consultation_disputes(consultation_id);
    CREATE TABLE IF NOT EXISTS reports (
      id TEXT PRIMARY KEY,
      case_id TEXT NOT NULL,
      title TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'draft',
      case_summary TEXT NOT NULL DEFAULT '{}',
      relationship_graph TEXT NOT NULL DEFAULT '{}',
      timeline TEXT NOT NULL DEFAULT '[]',
      task_summaries TEXT NOT NULL DEFAULT '[]',
      export_format TEXT NOT NULL DEFAULT 'json',
      exported_content TEXT,
      generated_at TEXT,
      exported_at TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (case_id) REFERENCES cases(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_reports_case_id ON reports(case_id);
    CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status);

    CREATE INDEX IF NOT EXISTS idx_investigation_tasks_case_id ON investigation_tasks(case_id);
    CREATE INDEX IF NOT EXISTS idx_investigation_tasks_status ON investigation_tasks(status);
    CREATE INDEX IF NOT EXISTS idx_investigation_tasks_assignee_id ON investigation_tasks(assignee_id);
    CREATE INDEX IF NOT EXISTS idx_investigation_tasks_deadline ON investigation_tasks(deadline);

    CREATE TABLE IF NOT EXISTS case_templates (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      category TEXT NOT NULL DEFAULT 'other',
      description TEXT DEFAULT '',
      icon TEXT,
      color TEXT DEFAULT '#3b82f6',
      evidence_fields TEXT DEFAULT '[]',
      relation_types TEXT DEFAULT '[]',
      investigation_steps TEXT DEFAULT '[]',
      default_tags TEXT DEFAULT '[]',
      is_built_in INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_case_templates_category ON case_templates(category);
    CREATE INDEX IF NOT EXISTS idx_case_templates_built_in ON case_templates(is_built_in);

    CREATE TABLE IF NOT EXISTS anomaly_alerts (
      id TEXT PRIMARY KEY,
      case_id TEXT NOT NULL,
      case_name TEXT NOT NULL,
      type TEXT NOT NULL,
      severity TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      score REAL NOT NULL DEFAULT 0,
      evidence_count INTEGER NOT NULL DEFAULT 0,
      connection_count INTEGER NOT NULL DEFAULT 0,
      critical_evidence_count INTEGER NOT NULL DEFAULT 0,
      high_evidence_count INTEGER NOT NULL DEFAULT 0,
      burst_start TEXT,
      burst_end TEXT,
      evidence_ids TEXT NOT NULL DEFAULT '[]',
      connection_ids TEXT NOT NULL DEFAULT '[]',
      detected_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      reviewed_at TEXT,
      reviewed_by TEXT,
      notes TEXT,
      FOREIGN KEY (case_id) REFERENCES cases(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_anomaly_alerts_case_id ON anomaly_alerts(case_id);
    CREATE INDEX IF NOT EXISTS idx_anomaly_alerts_severity ON anomaly_alerts(severity);
    CREATE INDEX IF NOT EXISTS idx_anomaly_alerts_status ON anomaly_alerts(status);
    CREATE INDEX IF NOT EXISTS idx_anomaly_alerts_type ON anomaly_alerts(type);
    CREATE INDEX IF NOT EXISTS idx_anomaly_alerts_detected_at ON anomaly_alerts(detected_at);

    CREATE TABLE IF NOT EXISTS evidence_versions (
      id TEXT PRIMARY KEY,
      evidence_id TEXT NOT NULL,
      case_id TEXT NOT NULL,
      version_number INTEGER NOT NULL DEFAULT 1,
      change_type TEXT NOT NULL,
      change_summary TEXT NOT NULL DEFAULT '',
      field_diffs TEXT NOT NULL DEFAULT '[]',
      tag_changes TEXT NOT NULL DEFAULT '[]',
      relation_changes TEXT NOT NULL DEFAULT '[]',
      before_state TEXT,
      after_state TEXT,
      related_connections_snapshot TEXT,
      collaborator_id TEXT,
      collaborator_name TEXT,
      restored_from_version_id TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (case_id) REFERENCES cases(id) ON DELETE CASCADE,
      FOREIGN KEY (evidence_id) REFERENCES evidence(id)
    );

    CREATE INDEX IF NOT EXISTS idx_evidence_versions_evidence_id ON evidence_versions(evidence_id);
    CREATE INDEX IF NOT EXISTS idx_evidence_versions_case_id ON evidence_versions(case_id);
    CREATE INDEX IF NOT EXISTS idx_evidence_versions_version_number ON evidence_versions(evidence_id, version_number);
    CREATE INDEX IF NOT EXISTS idx_evidence_versions_created_at ON evidence_versions(created_at);
    CREATE INDEX IF NOT EXISTS idx_evidence_versions_collaborator ON evidence_versions(collaborator_id);
    CREATE INDEX IF NOT EXISTS idx_evidence_versions_change_type ON evidence_versions(change_type);
  `);
};

const runMigrations = () => {
  const evidenceColumns = db.prepare("PRAGMA table_info(evidence)").all() as { name: string }[];
  const evidenceColumnNames = evidenceColumns.map(c => c.name);

  if (!evidenceColumnNames.includes('assigned_to')) {
    db.exec('ALTER TABLE evidence ADD COLUMN assigned_to TEXT DEFAULT NULL');
  }
  if (!evidenceColumnNames.includes('status')) {
    db.exec("ALTER TABLE evidence ADD COLUMN status TEXT NOT NULL DEFAULT 'pending'");
  }

  const caseColumns = db.prepare("PRAGMA table_info(cases)").all() as { name: string }[];
  const caseColumnNames = caseColumns.map(c => c.name);

  if (!caseColumnNames.includes('status')) {
    db.exec("ALTER TABLE cases ADD COLUMN status TEXT NOT NULL DEFAULT 'pending'");
  }
  if (!caseColumnNames.includes('key_clues')) {
    db.exec("ALTER TABLE cases ADD COLUMN key_clues TEXT DEFAULT '[]'");
  }
  if (!caseColumnNames.includes('template_id')) {
    db.exec('ALTER TABLE cases ADD COLUMN template_id TEXT');
  }
  if (!caseColumnNames.includes('template_metadata')) {
    db.exec('ALTER TABLE cases ADD COLUMN template_metadata TEXT');
  }

  const evTableExists = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='evidence_versions'").get() as { name: string } | undefined;
  if (evTableExists) {
    const fkList = db.prepare("PRAGMA foreign_key_list(evidence_versions)").all() as Array<{ id: number; table: string; from: string; to: string; on_delete: string }>;
    const evFk = fkList.find(fk => fk.from === 'evidence_id' && fk.table === 'evidence');
    if (evFk && evFk.on_delete === 'CASCADE') {
      db.pragma('foreign_keys = OFF');
      const transaction = db.transaction(() => {
        db.exec(`
          CREATE TABLE evidence_versions_new (
            id TEXT PRIMARY KEY,
            evidence_id TEXT NOT NULL,
            case_id TEXT NOT NULL,
            version_number INTEGER NOT NULL DEFAULT 1,
            change_type TEXT NOT NULL,
            change_summary TEXT NOT NULL DEFAULT '',
            field_diffs TEXT NOT NULL DEFAULT '[]',
            tag_changes TEXT NOT NULL DEFAULT '[]',
            relation_changes TEXT NOT NULL DEFAULT '[]',
            before_state TEXT,
            after_state TEXT,
            related_connections_snapshot TEXT,
            collaborator_id TEXT,
            collaborator_name TEXT,
            restored_from_version_id TEXT,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (case_id) REFERENCES cases(id) ON DELETE CASCADE,
            FOREIGN KEY (evidence_id) REFERENCES evidence(id)
          );
        `);
        db.exec(`
          INSERT INTO evidence_versions_new SELECT * FROM evidence_versions;
        `);
        db.exec('DROP TABLE evidence_versions;');
        db.exec('ALTER TABLE evidence_versions_new RENAME TO evidence_versions;');
        db.exec('CREATE INDEX IF NOT EXISTS idx_evidence_versions_evidence_id ON evidence_versions(evidence_id);');
        db.exec('CREATE INDEX IF NOT EXISTS idx_evidence_versions_case_id ON evidence_versions(case_id);');
        db.exec('CREATE INDEX IF NOT EXISTS idx_evidence_versions_version_number ON evidence_versions(evidence_id, version_number);');
        db.exec('CREATE INDEX IF NOT EXISTS idx_evidence_versions_created_at ON evidence_versions(created_at);');
        db.exec('CREATE INDEX IF NOT EXISTS idx_evidence_versions_collaborator ON evidence_versions(collaborator_id);');
        db.exec('CREATE INDEX IF NOT EXISTS idx_evidence_versions_change_type ON evidence_versions(change_type);');
      });
      transaction();
      db.pragma('foreign_keys = ON');
    }
  }
};

const seedData = () => {
  const caseCount = db.prepare('SELECT COUNT(*) as count FROM cases').get() as { count: number };
  if (caseCount.count > 0) return;

  const caseId = 'case-001';
  const now = new Date().toISOString();

  const insertCase = db.prepare(`
    INSERT INTO cases (id, name, description, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?)
  `);
  insertCase.run(
    caseId,
    '网络诈骗案',
    '2024年6月发生的一起涉案金额达500万元的网络投资诈骗案件。嫌疑人通过虚假投资平台诱导多名受害者转账。目前已获取部分聊天记录证据，需要进一步梳理人物关系和资金流向。',
    now,
    now
  );

  const insertEvidence = db.prepare(`
    INSERT INTO evidence (
      id, case_id, content, source, importance, tags,
      position_x, position_y, width, height, color, timestamp,
      assigned_to, status, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const evidences: Omit<Evidence, 'createdAt'>[] = [
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
      assignedTo: 'col-002',
      status: 'reviewed',
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
      assignedTo: 'col-001',
      status: 'completed',
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
      assignedTo: 'col-001',
      status: 'in_progress',
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
      assignedTo: 'col-002',
      status: 'reviewed',
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
      assignedTo: 'col-003',
      status: 'in_progress',
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
      assignedTo: null,
      status: 'pending',
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
      assignedTo: 'col-002',
      status: 'completed',
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
      assignedTo: 'col-001',
      status: 'reviewed',
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
      assignedTo: 'col-004',
      status: 'in_progress',
    },
  ];

  for (const ev of evidences) {
    insertEvidence.run(
      ev.id,
      ev.caseId,
      ev.content,
      ev.source,
      ev.importance,
      JSON.stringify(ev.tags),
      ev.positionX,
      ev.positionY,
      ev.width,
      ev.height,
      ev.color,
      ev.timestamp,
      ev.assignedTo ?? null,
      ev.status,
      now
    );
  }

  const insertConnection = db.prepare(`
    INSERT INTO connections (
      id, case_id, from_evidence_id, to_evidence_id,
      label, color, line_style, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const connections: Omit<Connection, 'createdAt'>[] = [
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
    insertConnection.run(
      conn.id,
      conn.caseId,
      conn.fromEvidenceId,
      conn.toEvidenceId,
      conn.label,
      conn.color,
      conn.lineStyle,
      now
    );
  }

  const insertCollaborator = db.prepare(`
    INSERT INTO collaborators (id, case_id, name, role, color, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  const collaborators: { id: string; name: string; role: string; color: string }[] = [
    { id: 'col-001', name: '张队长', role: 'leader', color: '#00f0ff' },
    { id: 'col-002', name: '李分析员', role: 'analyst', color: '#9945ff' },
    { id: 'col-003', name: '王操作员', role: 'operator', color: '#00ff88' },
    { id: 'col-004', name: '赵审核员', role: 'reviewer', color: '#ffcc00' },
  ];

  for (const c of collaborators) {
    insertCollaborator.run(c.id, caseId, c.name, c.role, c.color, now);
  }

  const insertAuditLog = db.prepare(`
    INSERT INTO audit_logs (id, case_id, collaborator_id, collaborator_name, action, target_type, target_id, detail, snapshot, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const auditLogs: { id: string; collaboratorId: string; collaboratorName: string; action: string; targetType: string; targetId: string; detail: string; snapshot: string | null; createdAt: string }[] = [
    { id: 'log-001', collaboratorId: 'col-001', collaboratorName: '张队长', action: 'create_evidence', targetType: 'evidence', targetId: 'ev-001', detail: '创建证据: 微信聊天记录', snapshot: null, createdAt: '2024-06-10T14:35:00Z' },
    { id: 'log-002', collaboratorId: 'col-002', collaboratorName: '李分析员', action: 'create_evidence', targetType: 'evidence', targetId: 'ev-002', detail: '创建证据: Telegram聊天记录', snapshot: null, createdAt: '2024-06-12T09:20:00Z' },
    { id: 'log-003', collaboratorId: 'col-001', collaboratorName: '张队长', action: 'create_connection', targetType: 'connection', targetId: 'conn-001', detail: '创建关系: 诱导注册', snapshot: null, createdAt: '2024-06-12T10:00:00Z' },
    { id: 'log-004', collaboratorId: 'col-001', collaboratorName: '张队长', action: 'create_evidence', targetType: 'evidence', targetId: 'ev-003', detail: '创建证据: 微信聊天记录-收益诱惑', snapshot: null, createdAt: '2024-06-15T17:00:00Z' },
    { id: 'log-005', collaboratorId: 'col-002', collaboratorName: '李分析员', action: 'create_evidence', targetType: 'evidence', targetId: 'ev-004', detail: '创建证据: 银行转账记录-500万', snapshot: null, createdAt: '2024-06-16T10:30:00Z' },
    { id: 'log-006', collaboratorId: 'col-003', collaboratorName: '王操作员', action: 'create_connection', targetType: 'connection', targetId: 'conn-003', detail: '创建关系: 500万转账', snapshot: null, createdAt: '2024-06-16T11:00:00Z' },
    { id: 'log-007', collaboratorId: 'col-002', collaboratorName: '李分析员', action: 'create_evidence', targetType: 'evidence', targetId: 'ev-005', detail: '创建证据: Telegram聊天记录-账户冻结', snapshot: null, createdAt: '2024-06-18T23:10:00Z' },
    { id: 'log-008', collaboratorId: 'col-001', collaboratorName: '张队长', action: 'update_evidence', targetType: 'evidence', targetId: 'ev-003', detail: '更新证据: 微信聊天记录-团伙配合', snapshot: '{"content":"[微信 2024-06-15 16:48]\\n王总：小李，昨天的20万收益到账了吧？","source":"微信聊天记录","importance":"high","tags":["聊天记录","收益诱惑"],"positionX":800,"positionY":100,"width":280,"height":180,"color":"#ef4444","assignedTo":null,"status":"pending"}', createdAt: '2024-06-20T08:30:00Z' },
    { id: 'log-009', collaboratorId: 'col-002', collaboratorName: '李分析员', action: 'create_evidence', targetType: 'evidence', targetId: 'ev-007', detail: '创建证据: IP地址分析报告', snapshot: null, createdAt: '2024-06-25T00:10:00Z' },
    { id: 'log-010', collaboratorId: 'col-001', collaboratorName: '张队长', action: 'create_evidence', targetType: 'evidence', targetId: 'ev-008', detail: '创建证据: 通话录音-嫌疑人承认', snapshot: null, createdAt: '2024-06-21T15:50:00Z' },
    { id: 'log-011', collaboratorId: 'col-002', collaboratorName: '李分析员', action: 'create_evidence', targetType: 'evidence', targetId: 'ev-009', detail: '创建证据: 资金流向分析', snapshot: null, createdAt: '2024-06-28T00:10:00Z' },
    { id: 'log-012', collaboratorId: 'col-001', collaboratorName: '张队长', action: 'assign_evidence', targetType: 'evidence', targetId: 'ev-004', detail: '将证据分配给李分析员', snapshot: '{"content":"[银行转账记录 2024-06-16 10:22]","source":"中国农业银行交易流水","importance":"critical","tags":["银行记录","资金转移"],"positionX":100,"positionY":350,"width":280,"height":160,"color":"#dc2626","assignedTo":null,"status":"pending"}', createdAt: '2024-06-16T11:30:00Z' },
    { id: 'log-013', collaboratorId: 'col-004', collaboratorName: '赵审核员', action: 'change_status', targetType: 'evidence', targetId: 'ev-008', detail: '状态变更: in_progress -> reviewed', snapshot: '{"status":"in_progress","assignedTo":"col-001"}', createdAt: '2024-06-22T09:00:00Z' },
    { id: 'log-014', collaboratorId: 'col-001', collaboratorName: '张队长', action: 'update_connection', targetType: 'connection', targetId: 'conn-001', detail: '更新关联标签: 诱导注册 -> 虚假推荐', snapshot: '{"label":"诱导注册","color":"#06b6d4","lineStyle":"solid"}', createdAt: '2024-06-14T10:00:00Z' },
  ];

  for (const l of auditLogs) {
    insertAuditLog.run(l.id, caseId, l.collaboratorId, l.collaboratorName, l.action, l.targetType, l.targetId, l.detail, l.snapshot, l.createdAt);
  }

  const insertConsultation = db.prepare(`
    INSERT INTO consultations (id, case_id, title, description, status, initiated_by, evidence_ids, key_clues, concluded_at, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const consultations: { id: string; title: string; description: string; status: string; initiatedBy: string; evidenceIds: string[]; keyClues: string[]; concludedAt: string | null; createdAt: string; updatedAt: string }[] = [
    {
      id: 'con-001',
      title: '500万资金流向专项会商',
      description: '围绕500万转账记录和资金流向，讨论资金追回可能性与下一步侦查方向',
      status: 'concluded',
      initiatedBy: 'col-001',
      evidenceIds: ['ev-004', 'ev-009'],
      keyClues: ['地下钱庄中转', '虚拟货币出境'],
      concludedAt: '2024-07-01T10:00:00Z',
      createdAt: '2024-06-29T09:00:00Z',
      updatedAt: '2024-07-01T10:00:00Z',
    },
    {
      id: 'con-002',
      title: '嫌疑人身份确认会商',
      description: '综合聊天记录和IP分析报告，讨论嫌疑人真实身份及抓捕方案',
      status: 'in_progress',
      initiatedBy: 'col-002',
      evidenceIds: ['ev-001', 'ev-007', 'ev-008'],
      keyClues: ['王总与张婷是否同一团伙'],
      concludedAt: null,
      createdAt: '2024-07-02T14:00:00Z',
      updatedAt: '2024-07-02T14:00:00Z',
    },
  ];

  for (const c of consultations) {
    insertConsultation.run(c.id, caseId, c.title, c.description, c.status, c.initiatedBy, JSON.stringify(c.evidenceIds), JSON.stringify(c.keyClues), c.concludedAt, c.createdAt, c.updatedAt);
  }

  const insertDiscussion = db.prepare(`
    INSERT INTO consultation_discussions (id, consultation_id, collaborator_id, collaborator_name, evidence_id, content, is_dispute, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const discussions: { id: string; consultationId: string; collaboratorId: string; collaboratorName: string; evidenceId: string | null; content: string; isDispute: boolean; createdAt: string }[] = [
    { id: 'disc-001', consultationId: 'con-001', collaboratorId: 'col-001', collaboratorName: '张队长', evidenceId: 'ev-004', content: '500万从李某账户转出到张某账户后，14分钟内就转出了480万，速度极快，说明有预案。', isDispute: false, createdAt: '2024-06-29T09:15:00Z' },
    { id: 'disc-002', consultationId: 'con-001', collaboratorId: 'col-002', collaboratorName: '李分析员', evidenceId: 'ev-009', content: '资金经过刘某某账户后分12笔转入地下钱庄，最终流向境外虚拟货币钱包。需要联系反洗钱中心进一步追踪。', isDispute: false, createdAt: '2024-06-29T09:30:00Z' },
    { id: 'disc-003', consultationId: 'con-001', collaboratorId: 'col-003', collaboratorName: '王操作员', evidenceId: null, content: '我认为资金已经完全无法追回，建议直接转刑事起诉，不要再浪费资源追踪。', isDispute: true, createdAt: '2024-06-29T09:45:00Z' },
    { id: 'disc-004', consultationId: 'con-001', collaboratorId: 'col-001', collaboratorName: '张队长', evidenceId: null, content: '不能轻易放弃。即使资金出境，通过国际合作仍有可能冻结部分虚拟货币资产。', isDispute: false, createdAt: '2024-06-29T10:00:00Z' },
    { id: 'disc-005', consultationId: 'con-002', collaboratorId: 'col-002', collaboratorName: '李分析员', evidenceId: 'ev-007', content: 'IP定位显示服务器实际在缅甸果敢，这和通话录音中嫌疑人提到的"在国外"吻合。', isDispute: false, createdAt: '2024-07-02T14:15:00Z' },
    { id: 'disc-006', consultationId: 'con-002', collaboratorId: 'col-004', collaboratorName: '赵审核员', evidenceId: 'ev-001', content: '微信中的"王总"和Telegram的"张婷"是否为同一人操控？两个角色的语气差异较大。', isDispute: false, createdAt: '2024-07-02T14:30:00Z' },
  ];

  for (const d of discussions) {
    insertDiscussion.run(d.id, d.consultationId, d.collaboratorId, d.collaboratorName, d.evidenceId, d.content, d.isDispute ? 1 : 0, d.createdAt);
  }

  const insertConclusion = db.prepare(`
    INSERT INTO consultation_conclusions (id, consultation_id, content, decided_by, decided_by_name, case_status_update, key_clues_update, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const conclusions: { id: string; consultationId: string; content: string; decidedBy: string; decidedByName: string; caseStatusUpdate: string | null; keyCluesUpdate: string[] | null; createdAt: string }[] = [
    {
      id: 'ccl-001',
      consultationId: 'con-001',
      content: '会议决定：1) 继续通过反洗钱中心追踪虚拟货币流向，争取冻结部分资产；2) 联系缅甸警方协助调查果敢地区窝点；3) 对刘某和张某的银行账户进行司法冻结。资金追回工作不应放弃。',
      decidedBy: 'col-001',
      decidedByName: '张队长',
      caseStatusUpdate: 'in_progress',
      keyCluesUpdate: ['地下钱庄中转', '虚拟货币出境', '缅甸果敢窝点'],
      createdAt: '2024-07-01T10:00:00Z',
    },
  ];

  for (const c of conclusions) {
    insertConclusion.run(c.id, c.consultationId, c.content, c.decidedBy, c.decidedByName, c.caseStatusUpdate, c.keyCluesUpdate ? JSON.stringify(c.keyCluesUpdate) : null, c.createdAt);
  }

  const insertDispute = db.prepare(`
    INSERT INTO consultation_disputes (id, consultation_id, discussion_id, evidence_id, description, raised_by, raised_by_name, resolution, resolved_by, resolved_by_name, resolved_at, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const disputes: { id: string; consultationId: string; discussionId: string; evidenceId: string | null; description: string; raisedBy: string; raisedByName: string; resolution: string | null; resolvedBy: string | null; resolvedByName: string | null; resolvedAt: string | null; createdAt: string }[] = [
    {
      id: 'dsp-001',
      consultationId: 'con-001',
      discussionId: 'disc-003',
      evidenceId: null,
      description: '王操作员认为应放弃资金追回，直接转刑事起诉',
      raisedBy: 'col-003',
      raisedByName: '王操作员',
      resolution: '经讨论，保留追回资金的可能性，同时推进刑事程序',
      resolvedBy: 'col-001',
      resolvedByName: '张队长',
      resolvedAt: '2024-07-01T09:30:00Z',
      createdAt: '2024-06-29T09:45:00Z',
    },
  ];

  for (const d of disputes) {
    insertDispute.run(d.id, d.consultationId, d.discussionId, d.evidenceId, d.description, d.raisedBy, d.raisedByName, d.resolution, d.resolvedBy, d.resolvedByName, d.resolvedAt, d.createdAt);
  }

  const insertTask = db.prepare(`
    INSERT INTO investigation_tasks (
      id, case_id, title, description, priority, status,
      assignee_id, assignee_name, deadline,
      evidence_ids, collection_item_ids, connection_ids,
      created_by, created_by_name, completed_at,
      created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const tasks: { id: string; title: string; description: string; priority: string; status: string; assigneeId: string | null; assigneeName: string | null; deadline: string | null; evidenceIds: string[]; collectionItemIds: string[]; connectionIds: string[]; createdBy: string; createdByName: string; completedAt: string | null; createdAt: string; updatedAt: string }[] = [
    {
      id: 'task-001',
      title: '追踪500万资金流向',
      description: '对李某500万转账记录进行深入追踪，联系反洗钱中心获取详细资金链路，重点关注地下钱庄中转和虚拟货币出境路径',
      priority: 'critical',
      status: 'in_progress',
      assigneeId: 'col-002',
      assigneeName: '李分析员',
      deadline: '2024-07-15T23:59:59Z',
      evidenceIds: ['ev-004', 'ev-009'],
      collectionItemIds: [],
      connectionIds: ['conn-007'],
      createdBy: 'col-001',
      createdByName: '张队长',
      completedAt: null,
      createdAt: '2024-06-29T10:30:00Z',
      updatedAt: '2024-07-01T10:00:00Z',
    },
    {
      id: 'task-002',
      title: '确认"王总"真实身份',
      description: '综合微信聊天记录、通话录音和IP分析报告，通过交叉比对确认"王总"的真实身份及与张婷的关系',
      priority: 'critical',
      status: 'pending',
      assigneeId: 'col-001',
      assigneeName: '张队长',
      deadline: '2024-07-10T23:59:59Z',
      evidenceIds: ['ev-001', 'ev-006', 'ev-008'],
      collectionItemIds: [],
      connectionIds: ['conn-001', 'conn-005', 'conn-006'],
      createdBy: 'col-002',
      createdByName: '李分析员',
      completedAt: null,
      createdAt: '2024-07-02T14:30:00Z',
      updatedAt: '2024-07-02T14:30:00Z',
    },
    {
      id: 'task-003',
      title: '调取张婷（DP00128）背景信息',
      description: '通过"鼎盛财富"平台工号DP00128追踪张婷的真实身份，调取其注册信息、银行账户及社交关系',
      priority: 'high',
      status: 'in_progress',
      assigneeId: 'col-003',
      assigneeName: '王操作员',
      deadline: '2024-07-08T23:59:59Z',
      evidenceIds: ['ev-002'],
      collectionItemIds: [],
      connectionIds: ['conn-002'],
      createdBy: 'col-001',
      createdByName: '张队长',
      completedAt: null,
      createdAt: '2024-07-02T15:00:00Z',
      updatedAt: '2024-07-02T15:00:00Z',
    },
    {
      id: 'task-004',
      title: '核实缅甸果敢服务器关联',
      description: '进一步核实IP定位报告中果敢服务器的运营信息，联系缅甸警方获取协查反馈',
      priority: 'high',
      status: 'completed',
      assigneeId: 'col-002',
      assigneeName: '李分析员',
      deadline: '2024-07-05T23:59:59Z',
      evidenceIds: ['ev-007'],
      collectionItemIds: [],
      connectionIds: ['conn-008', 'conn-009'],
      createdBy: 'col-001',
      createdByName: '张队长',
      completedAt: '2024-07-04T16:00:00Z',
      createdAt: '2024-06-29T10:00:00Z',
      updatedAt: '2024-07-04T16:00:00Z',
    },
    {
      id: 'task-005',
      title: '补充保证金诈骗证据链',
      description: '收集账户冻结通知、保证金缴纳记录等补充证据，完善保证金诈骗环节的证据链条',
      priority: 'normal',
      status: 'pending',
      assigneeId: null,
      assigneeName: null,
      deadline: '2024-07-20T23:59:59Z',
      evidenceIds: ['ev-005', 'ev-006'],
      collectionItemIds: [],
      connectionIds: ['conn-004', 'conn-005'],
      createdBy: 'col-003',
      createdByName: '王操作员',
      completedAt: null,
      createdAt: '2024-07-02T16:00:00Z',
      updatedAt: '2024-07-02T16:00:00Z',
    },
  ];

  for (const t of tasks) {
    insertTask.run(
      t.id, caseId, t.title, t.description, t.priority, t.status,
      t.assigneeId, t.assigneeName, t.deadline,
      JSON.stringify(t.evidenceIds), JSON.stringify(t.collectionItemIds), JSON.stringify(t.connectionIds),
      t.createdBy, t.createdByName, t.completedAt,
      t.createdAt, t.updatedAt
    );
  }
};

const seedTemplates = () => {
  const templateCount = db.prepare('SELECT COUNT(*) as count FROM case_templates').get() as { count: number };
  if (templateCount.count > 0) return;

  const insertTemplate = db.prepare(`
    INSERT INTO case_templates (
      id, name, category, description, icon, color,
      evidence_fields, relation_types, investigation_steps, default_tags,
      is_built_in, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const now = new Date().toISOString();
  for (const tpl of builtInTemplates) {
    insertTemplate.run(
      tpl.id,
      tpl.name,
      tpl.category,
      tpl.description ?? null,
      tpl.icon ?? null,
      tpl.color ?? '#3b82f6',
      JSON.stringify(tpl.evidenceFields ?? []),
      JSON.stringify(tpl.relationTypes ?? []),
      JSON.stringify(tpl.investigationSteps ?? []),
      JSON.stringify(tpl.defaultTags ?? []),
      1,
      now,
      now
    );
  }
};

createTables();
runMigrations();
seedData();
seedTemplates();

export default db;
