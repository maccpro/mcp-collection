/**
 * @file run-tests.js
 * @description Enterprise Test Suite for @maccpro/database-mcp
 * Validates DialectManager, MigrationEngine, QueryAnalyzer, LockAuditor,
 * SchemaModeler, ConfigTuner, MaintenanceEngine, ExplainAnalyzer, and QualityGate across MariaDB, MySQL, and PostgreSQL.
 */

import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { DialectManager } from '../engine/dialect-manager.js';
import { MigrationEngine } from '../engine/migration-engine.js';
import { QueryAnalyzer } from '../engine/query-analyzer.js';
import { LockAuditor } from '../engine/lock-auditor.js';
import { SchemaModeler } from '../engine/schema-modeler.js';
import { ConfigTuner } from '../engine/config-tuner.js';
import { MaintenanceEngine } from '../engine/maintenance-engine.js';
import { ExplainAnalyzer } from '../engine/explain-analyzer.js';
import { QualityGate } from '../engine/quality-gate.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let passed = 0;
let failed = 0;

function runTest(name, fn) {
  try {
    fn();
    console.log(`  [PASS] ${name}`);
    passed++;
  } catch (err) {
    console.error(`  [FAIL] ${name}`);
    console.error(`         ${err.message}`);
    failed++;
  }
}

console.log('\n--- Starting database-mcp Verification Suite ---\n');

// ==========================================
// 1. DialectManager Tests
// ==========================================
runTest('DialectManager: dialect normalization', () => {
  assert.strictEqual(DialectManager.normalize('POSTGRES'), 'postgresql');
  assert.strictEqual(DialectManager.normalize('pgsql'), 'postgresql');
  assert.strictEqual(DialectManager.normalize('MariaDB'), 'mariadb');
  assert.strictEqual(DialectManager.normalize('MySQL'), 'mysql');
});

runTest('DialectManager: PostgreSQL JSON/JSONB and UUID mapping', () => {
  const jsonCol = DialectManager.mapLaravelColumn('json', 'metadata', {}, 'postgresql');
  assert.ok(jsonCol.includes('$table->jsonb(\'metadata\')'), `PostgreSQL should use jsonb, got: ${jsonCol}`);

  const uuidCol = DialectManager.mapLaravelColumn('uuid', 'id', { primary: true }, 'postgresql');
  assert.ok(uuidCol.includes('$table->uuid(\'id\')->primary()'), 'PostgreSQL should use native uuid primary');
});

runTest('DialectManager: ULID primary key mapping', () => {
  const ulidCol = DialectManager.mapLaravelColumn('ulid', 'id', { primary: true }, 'postgresql');
  assert.ok(ulidCol.includes('$table->ulid(\'id\')->primary()'), `Expected ulid primary, got: ${ulidCol}`);
});

runTest('DialectManager: MariaDB JSON mapping', () => {
  const jsonCol = DialectManager.mapLaravelColumn('json', 'metadata', {}, 'mariadb');
  assert.ok(jsonCol.includes('$table->json(\'metadata\')'), 'MariaDB should map to json');
});

runTest('DialectManager: Extended data types (tinyint, enum, after, useCurrent)', () => {
  const tinyCol = DialectManager.mapLaravelColumn('tinyint', 'status', { unsigned: true, default: 1 });
  assert.ok(tinyCol.includes('$table->unsignedTinyInteger(\'status\')->default(1);'), `Got: ${tinyCol}`);

  const enumCol = DialectManager.mapLaravelColumn('enum', 'role', { values: ['admin', 'editor', 'viewer'] });
  assert.ok(enumCol.includes("$table->enum('role', ['admin', 'editor', 'viewer']);"), `Got: ${enumCol}`);

  const afterCol = DialectManager.mapLaravelColumn('string', 'nickname', { after: 'first_name' }, 'mysql');
  assert.ok(afterCol.includes("->after('first_name')"), `Got: ${afterCol}`);

  const currentCol = DialectManager.mapLaravelColumn('timestamp', 'verified_at', { use_current: true });
  assert.ok(currentCol.includes('->useCurrent()'), `Got: ${currentCol}`);
});

runTest('DialectManager: foreignId and foreign_id both map to unsignedBigInteger', () => {
  const col1 = DialectManager.mapLaravelColumn('foreignId', 'tenant_id');
  const col2 = DialectManager.mapLaravelColumn('foreign_id', 'tenant_id');
  assert.ok(col1.includes('$table->unsignedBigInteger(\'tenant_id\')'), `foreignId failed: ${col1}`);
  assert.ok(col2.includes('$table->unsignedBigInteger(\'tenant_id\')'), `foreign_id failed: ${col2}`);
});

// ==========================================
// 2. MigrationEngine Tests
// ==========================================
runTest('MigrationEngine: standard scope create_table reversible', () => {
  const migration = MigrationEngine.generate({
    table_name: 'invoices',
    operation: 'create_table',
    database_type: 'mariadb',
    scope: 'standard',
    columns: [
      { name: 'invoice_number', type: 'string', length: 50, unique: true },
      { name: 'amount', type: 'decimal', total: 12, places: 2 },
      { name: 'status', type: 'string', default: 'unpaid', index: true }
    ]
  });

  assert.strictEqual(migration.scope, 'standard');
  assert.ok(migration.target_path.startsWith('database/migrations/'));
  assert.ok(migration.migration_code.includes('Schema::create(\'invoices\''), 'Must have Schema::create in up()');
  assert.ok(migration.migration_code.includes('Schema::dropIfExists(\'invoices\');'), 'Must drop table in down()');
  assert.ok(migration.artisan_command.includes('php artisan migrate'));
});

runTest('MigrationEngine: ULID primary key generation', () => {
  const migration = MigrationEngine.generate({
    table_name: 'sessions',
    operation: 'create_table',
    primary_key: 'ulid'
  });

  assert.ok(migration.migration_code.includes('$table->ulid(\'id\')->primary();'), `ULID primary key failed. Code: ${migration.migration_code}`);
});

runTest('MigrationEngine: foreign_key on_delete "set null" (with space or underscore)', () => {
  const migration = MigrationEngine.generate({
    table_name: 'orders',
    operation: 'create_table',
    foreign_keys: [
      { column: 'discount_id', references: 'id', on: 'discounts', on_delete: 'set null' },
      { column: 'customer_id', references: 'id', on: 'customers', on_delete: 'cascade' }
    ]
  });

  assert.ok(migration.migration_code.includes('->nullOnDelete()'), `Must handle 'set null' with space. Got: ${migration.migration_code}`);
  assert.ok(migration.migration_code.includes('->cascadeOnDelete()'), `Must handle 'cascade'. Got: ${migration.migration_code}`);
});

runTest('MigrationEngine: modify_column operation reversible', () => {
  const migration = MigrationEngine.generate({
    table_name: 'users',
    operation: 'modify_column',
    columns: [
      { name: 'bio', type: 'text', nullable: true, previous_type: 'string' }
    ]
  });

  assert.ok(migration.migration_code.includes('$table->text(\'bio\')->nullable()->change();'), 'up() must have text change');
  assert.ok(migration.migration_code.includes('$table->string(\'bio\', 255)->change();'), 'down() must restore string change');
});

runTest('MigrationEngine: rename_column and rename_table operations reversible', () => {
  const colRename = MigrationEngine.generate({
    table_name: 'users',
    operation: 'rename_column',
    from: 'username',
    to: 'handle'
  });
  assert.ok(colRename.migration_code.includes("$table->renameColumn('username', 'handle');"));
  assert.ok(colRename.migration_code.includes("$table->renameColumn('handle', 'username');"));

  const tableRename = MigrationEngine.generate({
    table_name: 'old_orders',
    operation: 'rename_table',
    from_table: 'old_orders',
    to_table: 'archived_orders'
  });
  assert.ok(tableRename.migration_code.includes("Schema::rename('old_orders', 'archived_orders');"));
  assert.ok(tableRename.migration_code.includes("Schema::rename('archived_orders', 'old_orders');"));
});

runTest('MigrationEngine: standard timestamp prefix format (YYYY_MM_DD_HHMMSS)', () => {
  const ts = MigrationEngine.formatTimestamp();
  assert.ok(/^\d{4}_\d{2}_\d{2}_\d{6}$/.test(ts), `Timestamp format invalid: ${ts}`);
});

// ==========================================
// 3. QueryAnalyzer Tests
// ==========================================
runTest('QueryAnalyzer: non-SARGable DATE function detection', () => {
  const result = QueryAnalyzer.analyze({
    query: "SELECT * FROM orders WHERE YEAR(created_at) = 2026 AND status = 'completed' ORDER BY amount DESC",
    dialect: 'mariadb'
  });

  assert.strictEqual(result.sargability_score, 'Poor (Table Scan Likely)');
  assert.ok(result.issues_detected.some(i => i.type === 'NON_SARGABLE_DATE_FUNCTION'));
  assert.ok(result.recommended_index.has_recommendation);
  assert.deepStrictEqual(result.recommended_index.columns_in_esr_order, ['status', 'amount']);
});

runTest('QueryAnalyzer: ESR composite index order (Equality -> Sort -> Range)', () => {
  const result = QueryAnalyzer.analyze({
    query: "SELECT id, title FROM posts WHERE category_id = 5 AND view_count > 100 ORDER BY published_at DESC",
    dialect: 'postgresql'
  });

  assert.deepStrictEqual(result.recommended_index.columns_in_esr_order, ['category_id', 'published_at', 'view_count']);
  assert.ok(result.recommended_index.raw_sql.postgresql.includes('CONCURRENTLY'));
});

runTest('QueryAnalyzer: Table alias stripping and OR condition detection', () => {
  const result = QueryAnalyzer.analyze({
    query: "SELECT o.id, o.amount FROM orders o WHERE o.status = 'paid' OR o.status = 'pending' ORDER BY o.created_at DESC",
    dialect: 'mysql'
  });

  assert.strictEqual(result.table, 'orders');
  assert.ok(result.issues_detected.some(i => i.type === 'OR_PREDICATE_INDEX_MERGE_HAZARD'));
});

runTest('QueryAnalyzer: Deep OFFSET pagination trap detection', () => {
  const result = QueryAnalyzer.analyze({
    query: "SELECT id, name FROM customers ORDER BY id ASC LIMIT 20 OFFSET 50000",
    dialect: 'postgresql'
  });

  assert.ok(result.issues_detected.some(i => i.type === 'DEEP_OFFSET_PAGINATION_TRAP'));
  assert.ok(result.recommendations.some(r => r.category === 'PAGINATION_FIX'));
});

// ==========================================
// 4. LockAuditor Tests
// ==========================================
runTest('LockAuditor: identify critical lock on column type modification', () => {
  const audit = LockAuditor.audit({
    table: 'payments',
    dialect: 'postgresql',
    estimated_rows: 2000000,
    operations: [
      { type: 'modify_column', column: 'amount' }
    ]
  });

  assert.strictEqual(audit.highest_risk_level, 'CRITICAL');
  assert.strictEqual(audit.zero_downtime_compliant, false);
  assert.ok(audit.hazards.some(h => h.lock_type.includes('AccessExclusiveLock')));
});

runTest('LockAuditor: PostgreSQL volatile default lock hazard detection', () => {
  const audit = LockAuditor.audit({
    table: 'audit_logs',
    dialect: 'postgresql',
    operations: [
      { type: 'add_column', column: 'logged_at', default: 'NOW()' }
    ]
  });

  assert.ok(audit.hazards.some(h => h.description.includes('volatile default expression')));
});

// ==========================================
// 5. SchemaModeler Tests
// ==========================================
runTest('SchemaModeler: generate Mermaid ER diagram and multi-tenant policies with valid syntax', () => {
  const schema = SchemaModeler.design({
    project_name: 'JoypurERP',
    dialect: 'postgresql',
    tenancy_mode: 'discriminator',
    tables: [
      {
        name: 'customers',
        columns: [
          { name: 'name', type: 'string' },
          { name: 'email', type: 'string', unique: true }
        ]
      },
      {
        name: 'invoices',
        columns: [
          { name: 'customer_id', type: 'foreign_id', references: 'customers' },
          { name: 'amount', type: 'decimal' }
        ]
      }
    ]
  });

  assert.ok(schema.mermaid_er_diagram.includes('erDiagram'));
  assert.ok(!schema.mermaid_er_diagram.includes('id ||--o{'), 'Must not have id ||--o{ broken syntax');
  assert.ok(schema.ordered_migrations.length >= 3, 'Should generate tenants, customers, and invoices migrations');
  assert.ok(schema.tenant_security_policies.strategy.includes('Row-Level Security'));
  assert.ok(schema.tenant_security_policies.rls_sql.includes('FORCE ROW LEVEL SECURITY'), 'Must include FORCE ROW LEVEL SECURITY');
});

runTest('SchemaModeler: schema-per-tenant isolation support', () => {
  const schema = SchemaModeler.design({
    project_name: 'MultiTenantCloud',
    dialect: 'postgresql',
    tenancy_mode: 'schema',
    tables: [{ name: 'subscriptions', columns: [{ name: 'plan', type: 'string' }] }]
  });

  assert.strictEqual(schema.tenancy_mode, 'schema');
  assert.ok(schema.tenant_security_policies.strategy.includes('Schema-per-Tenant'));
});

// ==========================================
// 6. ConfigTuner Tests
// ==========================================
runTest('ConfigTuner: MariaDB 16GB NVMe server tuning with slow log and sysctl', () => {
  const tuning = ConfigTuner.tune({
    ram_gb: 16,
    vcpu: 8,
    disk_type: 'nvme',
    server_type: 'dedicated',
    dialect: 'mariadb'
  });

  assert.strictEqual(tuning.dialect, 'mariadb');
  assert.strictEqual(tuning.computed_parameters.innodb_io_capacity, 4000);
  assert.ok(tuning.config_file_content.includes('slow_query_log                 = 1'));
  assert.ok(tuning.linux_os_tuning.sysctl['vm.swappiness'] === 10);
});

runTest('ConfigTuner: PostgreSQL 32GB server tuning with track_io_timing and hugepages', () => {
  const tuning = ConfigTuner.tune({
    ram_gb: 32,
    vcpu: 16,
    disk_type: 'nvme',
    server_type: 'dedicated',
    dialect: 'postgresql'
  });

  assert.strictEqual(tuning.dialect, 'postgresql');
  assert.ok(tuning.config_file_content.includes('track_io_timing = on'));
  assert.ok(tuning.config_file_content.includes('checkpoint_timeout = 15min'));
  assert.strictEqual(tuning.linux_os_tuning.transparent_hugepage, 'madvise');
});

// ==========================================
// 7. MaintenanceEngine Tests
// ==========================================
runTest('MaintenanceEngine: generate PostgreSQL bloat and defragmentation runbook', () => {
  const runbook = MaintenanceEngine.getRunbook({ dialect: 'postgresql', task: 'bloat' });
  assert.strictEqual(runbook.dialect, 'postgresql');
  assert.ok(runbook.diagnostic_tasks.length > 0);
  assert.ok(runbook.diagnostic_tasks[0].diagnostic_sql.includes('pg_stat_user_tables'));
});

runTest('MaintenanceEngine: generate Disaster Recovery backup runbook', () => {
  const dr = MaintenanceEngine.getBackupRunbook({ dialect: 'postgresql', database_name: 'joypur_prod' });
  assert.strictEqual(dr.dialect, 'postgresql');
  assert.ok(dr.logical_backup.backup_command.includes('pg_dump'));
  assert.ok(dr.physical_backup_pitr.basebackup_command.includes('pg_basebackup'));
});

// ==========================================
// 8. ExplainAnalyzer Tests
// ==========================================
runTest('ExplainAnalyzer: PostgreSQL Seq Scan and disk spill detection', () => {
  const samplePgPlan = `
Seq Scan on orders  (cost=0.00..35.50 rows=1000 width=40) (actual rows=1000)
  Filter: (status = 'paid'::text)
  Sort Method: external merge  Disk: 4096kB
`;
  const report = ExplainAnalyzer.analyze({ plan: samplePgPlan, dialect: 'postgresql', table: 'orders' });
  assert.strictEqual(report.summary.has_sequential_scan, true);
  assert.strictEqual(report.summary.has_disk_spill, true);
  assert.ok(report.issues.some(i => i.type === 'SEQUENTIAL_SCAN'));
});

runTest('ExplainAnalyzer: MySQL type: ALL full table scan detection', () => {
  const sampleMySQLPlan = `
id | select_type | table  | type | possible_keys | key  | rows | Extra
1  | SIMPLE      | users  | ALL  | NULL          | NULL | 50000| Using filesort
`;
  const report = ExplainAnalyzer.analyze({ plan: sampleMySQLPlan, dialect: 'mysql', table: 'users' });
  assert.strictEqual(report.summary.has_sequential_scan, true);
  assert.strictEqual(report.summary.has_filesort_or_temp, true);
});

// ==========================================
// 9. QualityGate Tests
// ==========================================
runTest('QualityGate: evaluate pass on clean reversible migration in memory', () => {
  const validMigration = `<?php
use Illuminate\\Database\\Migrations\\Migration;
use Illuminate\\Support\\Facades\\Schema;
return new class extends Migration {
    public function up(): void { Schema::create('test', function ($table) {}); }
    public function down(): void { Schema::dropIfExists('test'); }
};`;

  const tmpFile = path.join(__dirname, 'temp_migration_test.php');
  fs.writeFileSync(tmpFile, validMigration);

  try {
    const gate = QualityGate.evaluate({ files: [tmpFile] });
    assert.strictEqual(gate.gate_status, 'PASS');
  } finally {
    if (fs.existsSync(tmpFile)) fs.unlinkSync(tmpFile);
  }
});

runTest('QualityGate: evaluate fail on missing down() method', () => {
  const invalidMigration = `<?php
use Illuminate\\Database\\Migrations\\Migration;
use Illuminate\\Support\\Facades\\Schema;
return new class extends Migration {
    public function up(): void { Schema::create('test', function ($table) {}); }
};`;

  const tmpFile = path.join(__dirname, 'temp_bad_migration.php');
  fs.writeFileSync(tmpFile, invalidMigration);

  try {
    const gate = QualityGate.evaluate({ files: [tmpFile] });
    assert.strictEqual(gate.gate_status, 'FAIL');
    assert.ok(gate.violations.some(v => v.rule === 'MISSING_DOWN_METHOD'));
  } finally {
    if (fs.existsSync(tmpFile)) fs.unlinkSync(tmpFile);
  }
});

console.log(`\n--- Test Results: ${passed} Passed, ${failed} Failed ---\n`);

if (failed > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
