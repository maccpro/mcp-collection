/**
 * @file run-tests.js
 * @description Enterprise Test Suite for @maccpro/database-mcp (v1.2.3)
 * Validates DialectManager, MigrationEngine, QueryAnalyzer, LockAuditor,
 * SchemaModeler, ConfigTuner, MaintenanceEngine, ExplainAnalyzer, QualityGate,
 * SeederGenerator, PartitionAdvisor, and server.js environment defaults across
 * MariaDB, MySQL, PostgreSQL & SQLite.
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
import { SeederGenerator } from '../engine/seeder-generator.js';
import { PartitionAdvisor } from '../engine/partition-advisor.js';
import { handleToolCall, TOOLS, DEFAULT_DIALECT, DEFAULT_RAM_GB } from '../server.js';

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

async function runTestAsync(name, fn) {
  try {
    await fn();
    console.log(`  [PASS] ${name}`);
    passed++;
  } catch (err) {
    console.error(`  [FAIL] ${name}`);
    console.error(`         ${err.message}`);
    failed++;
  }
}

console.log('\n--- Starting database-mcp Verification Suite (v1.2.3) ---\n');

// ==========================================
// 1. DialectManager Tests
// ==========================================
runTest('DialectManager: dialect normalization including sqlite', () => {
  assert.strictEqual(DialectManager.normalize('POSTGRES'), 'postgresql');
  assert.strictEqual(DialectManager.normalize('pgsql'), 'postgresql');
  assert.strictEqual(DialectManager.normalize('MariaDB'), 'mariadb');
  assert.strictEqual(DialectManager.normalize('MySQL'), 'mysql');
  assert.strictEqual(DialectManager.normalize('sqlite3'), 'sqlite');
  assert.strictEqual(DialectManager.normalize('SQLite'), 'sqlite');
});

runTest('DialectManager: PostgreSQL JSON/JSONB and UUID mapping', () => {
  const jsonCol = DialectManager.mapLaravelColumn('json', 'metadata', {}, 'postgresql');
  assert.ok(jsonCol.includes("$table->jsonb('metadata')"), `PostgreSQL should use jsonb, got: ${jsonCol}`);

  const uuidCol = DialectManager.mapLaravelColumn('uuid', 'id', { primary: true }, 'postgresql');
  assert.ok(uuidCol.includes("$table->uuid('id')->primary()"), 'PostgreSQL should use native uuid primary');
});

runTest('DialectManager: ULID primary key mapping', () => {
  const ulidCol = DialectManager.mapLaravelColumn('ulid', 'id', { primary: true }, 'postgresql');
  assert.ok(ulidCol.includes("$table->ulid('id')->primary()"), `Expected ulid primary, got: ${ulidCol}`);
});

runTest('DialectManager: pgvector vector(embedding, 1536) mapping', () => {
  const vecCol = DialectManager.mapLaravelColumn('vector', 'embedding', { dimensions: 1536 }, 'postgresql');
  assert.ok(vecCol.includes("$table->vector('embedding', 1536);"), `Expected vector type, got: ${vecCol}`);
});

runTest('DialectManager: Polymorphic types (morphs, uuidMorphs, ulidMorphs)', () => {
  const m1 = DialectManager.mapLaravelColumn('morphs', 'taggable');
  assert.strictEqual(m1, "$table->morphs('taggable');");

  const m2 = DialectManager.mapLaravelColumn('uuidMorphs', 'billable');
  assert.strictEqual(m2, "$table->uuidMorphs('billable');");

  const m3 = DialectManager.mapLaravelColumn('ulidMorphs', 'commentable');
  assert.strictEqual(m3, "$table->ulidMorphs('commentable');");
});

runTest('DialectManager: Extended data types (tinyint, enum, after, useCurrent)', () => {
  const tinyCol = DialectManager.mapLaravelColumn('tinyint', 'status', { unsigned: true, default: 1 });
  assert.ok(tinyCol.includes("$table->unsignedTinyInteger('status')->default(1);"), `Got: ${tinyCol}`);

  const enumCol = DialectManager.mapLaravelColumn('enum', 'role', { values: ['admin', 'editor', 'viewer'] });
  assert.ok(enumCol.includes("$table->enum('role', ['admin', 'editor', 'viewer']);"), `Got: ${enumCol}`);

  const afterCol = DialectManager.mapLaravelColumn('string', 'nickname', { after: 'first_name' }, 'mysql');
  assert.ok(afterCol.includes("->after('first_name')"), `Got: ${afterCol}`);

  const currentCol = DialectManager.mapLaravelColumn('timestamp', 'verified_at', { use_current: true });
  assert.ok(currentCol.includes('->useCurrent()'), `Got: ${currentCol}`);
});

runTest('DialectManager: Dynamic foreignId mapping for UUID and ULID', () => {
  const colId = DialectManager.mapLaravelColumn('foreign_id', 'tenant_id', { pk_type: 'id' });
  assert.ok(colId.includes("$table->unsignedBigInteger('tenant_id')"), `Got: ${colId}`);

  const colUuid = DialectManager.mapLaravelColumn('foreign_id', 'tenant_id', { pk_type: 'uuid' });
  assert.ok(colUuid.includes("$table->foreignUuid('tenant_id')"), `Got: ${colUuid}`);

  const colUlid = DialectManager.mapLaravelColumn('foreign_id', 'tenant_id', { pk_type: 'ulid' });
  assert.ok(colUlid.includes("$table->foreignUlid('tenant_id')"), `Got: ${colUlid}`);
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
      { name: 'amount', type: 'decimal', precision: 15, scale: 4 }
    ]
  });

  assert.ok(migration.php_code.includes("Schema::create('invoices'"), 'up() creates invoices');
  assert.ok(migration.php_code.includes("Schema::dropIfExists('invoices')"), 'down() drops invoices');
});

runTest('MigrationEngine: dynamic tenant_id matching primary key (UUID & ULID)', () => {
  const migUuid = MigrationEngine.generate({
    table_name: 'orders',
    operation: 'create_table',
    primary_key: 'uuid',
    include_tenant_id: true,
    columns: [{ name: 'total', type: 'decimal' }]
  });
  assert.ok(migUuid.php_code.includes("$table->foreignUuid('tenant_id')"), `UUID FK failed: ${migUuid.php_code}`);

  const migUlid = MigrationEngine.generate({
    table_name: 'orders',
    operation: 'create_table',
    primary_key: 'ulid',
    include_tenant_id: true,
    columns: [{ name: 'total', type: 'decimal' }]
  });
  assert.ok(migUlid.php_code.includes("$table->foreignUlid('tenant_id')"), `ULID FK failed: ${migUlid.php_code}`);
});

runTest('MigrationEngine: PostgreSQL concurrent index disables transaction wrapping', () => {
  const migration = MigrationEngine.generate({
    table_name: 'users',
    operation: 'add_indexes',
    database_type: 'postgresql',
    concurrent: true,
    indexes: [{ columns: ['email'], name: 'idx_users_email' }]
  });

  assert.ok(migration.php_code.includes('public bool $withinTransaction = false;'), 'Must disable transaction');
  assert.ok(migration.php_code.includes('CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_email'), 'Uses CREATE INDEX CONCURRENTLY');
});

runTest('MigrationEngine: multi-tenant unique constraint scoping', () => {
  const migration = MigrationEngine.generate({
    table_name: 'users',
    operation: 'create_table',
    include_tenant_id: true,
    columns: [{ name: 'email', type: 'string', unique: true }]
  });

  assert.ok(migration.php_code.includes("$table->unique(['tenant_id', 'email']);"), 'Should be tenant-scoped composite unique');
});

runTest('MigrationEngine: composite primary key for pivot tables', () => {
  const migration = MigrationEngine.generate({
    table_name: 'order_product',
    operation: 'create_table',
    primary_key: ['order_id', 'product_id'],
    columns: [{ name: 'quantity', type: 'integer' }]
  });

  assert.ok(migration.php_code.includes("$table->primary(['order_id', 'product_id']);"), 'Composite PK failed');
});

runTest('MigrationEngine: reversible drop_table operation', () => {
  const migration = MigrationEngine.generate({
    table_name: 'temp_logs',
    operation: 'drop_table',
    columns: [{ name: 'message', type: 'text' }]
  });

  assert.ok(migration.php_code.includes("Schema::dropIfExists('temp_logs');"), 'up() drops table');
  assert.ok(migration.php_code.includes("Schema::create('temp_logs'"), 'down() restores table');
});

// ==========================================
// 3. QueryAnalyzer Tests
// ==========================================
runTest('QueryAnalyzer: non-SARGable DATE function detection', () => {
  const query = "SELECT * FROM orders WHERE DATE(created_at) = '2026-10-20' LIMIT 10;";
  const report = QueryAnalyzer.analyze({ query, dialect: 'mariadb' });
  assert.strictEqual(report.issues_detected.some(i => i.type === 'NON_SARGABLE_DATE_FUNCTION'), true);
});

runTest('QueryAnalyzer: ESR composite index order (Equality -> Sort -> Range)', () => {
  const query = "SELECT * FROM orders WHERE status = 'completed' AND amount >= 100.00 ORDER BY created_at DESC;";
  const report = QueryAnalyzer.analyze({ query, dialect: 'mariadb', table: 'orders' });
  const cols = report.recommended_index.columns_in_esr_order;
  assert.deepStrictEqual(cols, ['status', 'created_at', 'amount']);
});

runTest('QueryAnalyzer: alias-aware multi-table JOIN index attribution', () => {
  const query = "SELECT u.name, o.total FROM users u JOIN orders o ON u.id = o.user_id WHERE u.status = 'active' AND o.total >= 500 ORDER BY o.created_at DESC;";
  const report = QueryAnalyzer.analyze({ query, dialect: 'postgresql' });
  assert.strictEqual(report.table, 'users');
  assert.deepStrictEqual(report.recommended_index.columns_in_esr_order, ['status']);
  assert.ok(report.joined_table_indexes.some(j => j.table === 'orders' && j.columns.includes('created_at')));
});

runTest('QueryAnalyzer: Implicit type coercion detection', () => {
  const query = "SELECT * FROM customers WHERE phone_number = 1711223344;";
  const report = QueryAnalyzer.analyze({ query, dialect: 'mysql' });
  assert.ok(report.issues_detected.some(i => i.type === 'IMPLICIT_TYPE_COERCION_HAZARD'));
});

runTest('QueryAnalyzer: AI vector similarity operator detection', () => {
  const query = "SELECT id, title FROM documents ORDER BY embedding <=> '[0.1, 0.2, 0.3]' LIMIT 5;";
  const report = QueryAnalyzer.analyze({ query, dialect: 'postgresql' });
  assert.ok(report.issues_detected.some(i => i.type === 'VECTOR_SIMILARITY_SEARCH_DETECTED'));
});

// ==========================================
// 4. LockAuditor Tests
// ==========================================
runTest('LockAuditor: identify critical lock on column type modification', () => {
  const audit = LockAuditor.audit({
    table: 'orders',
    operations: [{ type: 'change_column_type', column: 'amount' }],
    dialect: 'mariadb'
  });
  assert.strictEqual(audit.highest_risk_level, 'CRITICAL');
});

runTest('LockAuditor: PostgreSQL non-concurrent DROP INDEX hazard detection', () => {
  const audit = LockAuditor.audit({
    table: 'orders',
    operations: [{ type: 'drop_index', column: 'idx_orders_status', concurrent: false }],
    dialect: 'postgresql'
  });
  assert.strictEqual(audit.highest_risk_level, 'HIGH');
  assert.ok(audit.hazards.some(h => h.lock_type === 'AccessExclusiveLock'));
});

// ==========================================
// 5. SchemaModeler Tests
// ==========================================
runTest('SchemaModeler: generate Mermaid ER diagram and multi-tenant policies', () => {
  const schema = SchemaModeler.design({
    project_name: 'HostingSaaS',
    dialect: 'postgresql',
    tenancy_mode: 'discriminator',
    primary_key_type: 'ulid',
    tables: [
      {
        name: 'vps_instances',
        columns: [
          { name: 'hostname', type: 'string', length: 100 },
          { name: 'ip_address', type: 'string', length: 45 }
        ]
      }
    ]
  });

  assert.strictEqual(schema.success, true);
  assert.ok(schema.mermaid_er_diagram.includes('tenants ||--o{ vps_instances'));
  assert.ok(schema.tenant_security_policies.rls_sql.includes('FORCE ROW LEVEL SECURITY'));
});

// ==========================================
// 6. ConfigTuner Tests
// ==========================================
runTest('ConfigTuner: SQLite WAL mode PRAGMA tuning', () => {
  const tuning = ConfigTuner.tune({
    ram_gb: 4,
    dialect: 'sqlite'
  });
  assert.strictEqual(tuning.dialect, 'sqlite');
  assert.ok(tuning.config_file_content.includes('PRAGMA journal_mode = WAL;'));
  assert.ok(tuning.config_file_content.includes('PRAGMA busy_timeout = 5000;'));
});

runTest('ConfigTuner: PgBouncer transaction pooling configuration', () => {
  const pooler = ConfigTuner.tunePooler({
    pooler: 'pgbouncer',
    max_client_connections: 5000,
    vcpu: 8
  });
  assert.strictEqual(pooler.pooler, 'pgbouncer');
  assert.strictEqual(pooler.pool_mode, 'transaction');
  assert.ok(pooler.files['/etc/pgbouncer/pgbouncer.ini'].includes('pool_mode = transaction'));
  assert.ok(pooler.files['/etc/pgbouncer/pgbouncer.ini'].includes('max_client_conn = 5000'));
});

// ==========================================
// 7. MaintenanceEngine Tests
// ==========================================
runTest('MaintenanceEngine: GDPR PII data masking runbook generation', () => {
  const masking = MaintenanceEngine.getDataMaskingRunbook({ dialect: 'postgresql' });
  assert.strictEqual(masking.success, true);
  assert.ok(masking.masking_script_sql.includes('@staging.local'));
  assert.ok(masking.masking_script_sql.includes('personal_access_tokens'));
});

// ==========================================
// 8. ExplainAnalyzer Tests
// ==========================================
runTest('ExplainAnalyzer: PostgreSQL JSON AST parsing with Buffer Hit Ratio and JIT', () => {
  const pgJson = [
    {
      Plan: {
        'Node Type': 'Seq Scan',
        'Relation Name': 'orders',
        'Plan Rows': 1000,
        'Actual Rows': 10,
        'Shared Hit Blocks': 20,
        'Shared Read Blocks': 150
      },
      JIT: {
        Timing: {
          Total: 35.5
        }
      }
    }
  ];

  const report = ExplainAnalyzer.analyze({ plan: pgJson, dialect: 'postgresql', table: 'orders' });
  assert.strictEqual(report.summary.has_sequential_scan, true);
  assert.strictEqual(report.summary.has_cardinality_mismatch, true);
  assert.strictEqual(report.summary.has_buffer_cache_miss, true);
  assert.ok(report.issues.some(i => i.type === 'JIT_COMPILATION_OVERHEAD'));
});

runTest('ExplainAnalyzer: MySQL JSON AST parsing', () => {
  const mysqlJson = {
    query_block: {
      table: {
        table_name: 'users',
        access_type: 'ALL',
        using_filesort: true
      }
    }
  };

  const report = ExplainAnalyzer.analyze({ plan: mysqlJson, dialect: 'mysql' });
  assert.strictEqual(report.summary.has_sequential_scan, true);
  assert.strictEqual(report.summary.has_filesort_or_temp, true);
});

// ==========================================
// 9. SeederGenerator Tests
// ==========================================
runTest('SeederGenerator: Generate Model Factory and Seeder with multi-tenant Faker', () => {
  const seeder = SeederGenerator.generate({
    table_name: 'invoices',
    count: 100,
    is_tenant: true,
    columns: [
      { name: 'invoice_number', type: 'string' },
      { name: 'amount', type: 'decimal' },
      { name: 'status', type: 'enum', values: ['draft', 'paid'] }
    ]
  });

  assert.strictEqual(seeder.success, true);
  assert.ok(seeder.files.factory.code.includes("'tenant_id' => \\App\\Models\\Tenant::factory()"));
  assert.ok(seeder.files.factory.code.includes('randomFloat'));
  assert.ok(seeder.files.seeder.code.includes('Invoice::factory()'));
});

// ==========================================
// 10. PartitionAdvisor Tests
// ==========================================
runTest('PartitionAdvisor: Generate PostgreSQL monthly declarative partitioning', () => {
  const part = PartitionAdvisor.advise({
    table_name: 'audit_logs',
    partition_type: 'range',
    partition_column: 'created_at',
    dialect: 'postgresql'
  });

  assert.strictEqual(part.success, true);
  assert.strictEqual(part.initial_partitions_count, 12);
  assert.ok(part.migration_code.includes('PARTITION BY RANGE (created_at)'));
  assert.ok(part.archival_runbook.detach_sql.includes('DETACH PARTITION'));
});

// ==========================================
// 11. QualityGate Tests
// ==========================================
runTest('QualityGate: block commit on concurrent DDL without withinTransaction = false', () => {
  const badConcurrentMigration = `<?php
use Illuminate\\Database\\Migrations\\Migration;
use Illuminate\\Support\\Facades\\DB;
return new class extends Migration {
    public function up(): void { DB::statement("CREATE INDEX CONCURRENTLY idx ON tbl(col);"); }
    public function down(): void { DB::statement("DROP INDEX CONCURRENTLY idx;"); }
};`;

  const tmpFile = path.join(__dirname, 'temp_bad_concurrent.php');
  fs.writeFileSync(tmpFile, badConcurrentMigration);

  try {
    const gate = QualityGate.evaluate({ files: [tmpFile] });
    assert.strictEqual(gate.gate_status, 'FAIL');
    assert.ok(gate.violations.some(v => v.rule === 'POSTGRES_CONCURRENT_TRANSACTION_ABORT_HAZARD'));
  } finally {
    if (fs.existsSync(tmpFile)) fs.unlinkSync(tmpFile);
  }
});

runTest('QualityGate: flag unscoped unique constraint in tenant migrations', () => {
  const badTenantMigration = `<?php
use Illuminate\\Database\\Migrations\\Migration;
use Illuminate\\Support\\Facades\\Schema;
return new class extends Migration {
    public function up(): void {
        Schema::create('tenant_users', function ($table) {
            $table->unsignedBigInteger('tenant_id');
            $table->string('email');
            $table->unique(['email']);
        });
    }
    public function down(): void { Schema::dropIfExists('tenant_users'); }
};`;

  const tmpFile = path.join(__dirname, 'tenant', 'temp_bad_tenant_migration.php');
  const tmpDir = path.dirname(tmpFile);
  if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });
  fs.writeFileSync(tmpFile, badTenantMigration);

  try {
    const gate = QualityGate.evaluate({ files: [tmpFile] });
    assert.ok(gate.violations.some(v => v.rule === 'TENANT_UNIQUE_NAMESPACE_LEAK'));
  } finally {
    if (fs.existsSync(tmpFile)) fs.unlinkSync(tmpFile);
    if (fs.existsSync(tmpDir)) fs.rmdirSync(tmpDir);
  }
});

// ==========================================
// 12. Forensic Bug Fixes & Hardening (v1.2.1)
// ==========================================
runTest('LockAuditor: non-concurrent add_index is HIGH risk when concurrent omitted', () => {
  const audit = LockAuditor.audit({
    table: 'users',
    operations: [{ type: 'add_index', column: 'email' }],
    dialect: 'postgresql'
  });
  assert.strictEqual(audit.highest_risk_level, 'HIGH', 'Default omitted concurrent must be HIGH risk');
  assert.strictEqual(audit.zero_downtime_compliant, false);
});

runTest('LockAuditor: identify truncate, drop_table, and unindexed FK hazards', () => {
  const audit = LockAuditor.audit({
    table: 'invoices',
    operations: [
      { type: 'truncate_table' },
      { type: 'unindexed_foreign_key', column: 'customer_id' }
    ],
    dialect: 'postgresql'
  });
  assert.strictEqual(audit.highest_risk_level, 'CRITICAL');
  assert.ok(audit.hazards.some(h => h.operation.includes('TRUNCATE TABLE')));
  assert.ok(audit.hazards.some(h => h.operation.includes('UNINDEXED FOREIGN KEY')));
});

runTest('DialectManager: preserve modifiers on uuid, ulid, and polymorphic types', () => {
  const colUuid = DialectManager.mapLaravelColumn('uuid', 'parent_id', { nullable: true, index: true }, 'postgresql');
  assert.ok(colUuid.includes('->nullable()'), `UUID should have nullable: ${colUuid}`);
  assert.ok(colUuid.includes('->index()'), `UUID should have index: ${colUuid}`);

  const colUlid = DialectManager.mapLaravelColumn('ulid', 'tracking_no', { nullable: true, unique: true });
  assert.ok(colUlid.includes('->nullable()'), `ULID should have nullable: ${colUlid}`);
  assert.ok(colUlid.includes('->unique()'), `ULID should have unique: ${colUlid}`);

  const colMorph = DialectManager.mapLaravelColumn('morphs', 'taggable', { nullable: true });
  assert.ok(colMorph.includes('nullableMorphs'), `Morphs should be nullableMorphs: ${colMorph}`);
});

runTest('SchemaModeler: dynamic RLS type casting for UUID and ULID', () => {
  const schemaUuid = SchemaModeler.design({
    project_name: 'UuidSaaS',
    dialect: 'postgresql',
    tenancy_mode: 'discriminator',
    primary_key_type: 'uuid',
    tables: [{ name: 'invoices', columns: [{ name: 'amount', type: 'decimal' }] }]
  });
  assert.ok(schemaUuid.tenant_security_policies.rls_sql.includes('::uuid'), 'RLS should cast to ::uuid');
  assert.ok(schemaUuid.tenant_security_policies.rls_sql.includes('WITH CHECK'), 'RLS should include WITH CHECK');

  const schemaUlid = SchemaModeler.design({
    project_name: 'UlidSaaS',
    dialect: 'postgresql',
    tenancy_mode: 'discriminator',
    primary_key_type: 'ulid',
    tables: [{ name: 'invoices', columns: [{ name: 'amount', type: 'decimal' }] }]
  });
  assert.ok(schemaUlid.tenant_security_policies.rls_sql.includes('::text'), 'RLS should cast to ::text for ULID');
});

runTest('MigrationEngine: scope tenant automatically scopes tenant_id and unique keys', () => {
  const migration = MigrationEngine.generate({
    table_name: 'customers',
    operation: 'create_table',
    scope: 'tenant',
    columns: [{ name: 'phone', type: 'string', unique: true }]
  });
  assert.ok(migration.target_path.includes('database/migrations/tenant/'));
  assert.ok(migration.php_code.includes('tenant_id'), 'Should include tenant_id');
  assert.ok(migration.php_code.includes("$table->unique(['tenant_id', 'phone']);"), 'Should scope unique');
});

runTest('MigrationEngine: PostgreSQL concurrent drop_indexes disables transaction wrapping', () => {
  const migration = MigrationEngine.generate({
    table_name: 'users',
    operation: 'drop_indexes',
    database_type: 'postgresql',
    concurrent: true,
    indexes: [{ columns: ['email'], name: 'idx_users_email' }]
  });
  assert.ok(migration.php_code.includes('public bool $withinTransaction = false;'));
  assert.ok(migration.php_code.includes('DROP INDEX CONCURRENTLY IF EXISTS idx_users_email'));
});

runTest('MigrationEngine: partial index with where condition in PostgreSQL', () => {
  const migration = MigrationEngine.generate({
    table_name: 'orders',
    operation: 'add_indexes',
    database_type: 'postgresql',
    concurrent: true,
    indexes: [{ columns: ['user_id'], name: 'idx_active_orders', where: "status = 'active'" }]
  });
  assert.ok(migration.php_code.includes("WHERE status = 'active'"));
});

runTest('SeederGenerator: automatically bind *_id to parent model factory and plural inflection', () => {
  const seeder = SeederGenerator.generate({
    table_name: 'categories',
    count: 20,
    columns: [
      { name: 'name', type: 'string' },
      { name: 'user_id', type: 'foreign_id' }
    ]
  });
  assert.strictEqual(seeder.model_name, 'Category', 'categories must singularize to Category');
  assert.ok(seeder.files.factory.code.includes("'user_id' => \\App\\Models\\User::factory()"));
});

runTest('QueryAnalyzer: ignore numeric literal WHERE 1 = 1 in ESR index columns', () => {
  const query = "SELECT * FROM orders WHERE 1 = 1 AND status = 'completed' AND amount >= 50.0;";
  const report = QueryAnalyzer.analyze({ query, dialect: 'mariadb', table: 'orders' });
  const cols = report.recommended_index.columns_in_esr_order;
  assert.ok(!cols.includes('1'), `Should not contain numeric literal '1': ${cols}`);
  assert.ok(cols.includes('status'), `Should contain 'status': ${cols}`);
});

runTest('ExplainAnalyzer: MySQL 8.0+ EXPLAIN ANALYZE tree format recognition', () => {
  const treePlan = `
-> Table scan on users  (cost=1.25 rows=10) (actual time=0.045..0.089 rows=10 loops=1)
-> Sort: users.created_at  (actual time=0.100..0.105 rows=10 loops=1)
`;
  const report = ExplainAnalyzer.analyze({ plan: treePlan, dialect: 'mysql' });
  assert.strictEqual(report.summary.has_sequential_scan, true, 'Should detect tree table scan');
  assert.strictEqual(report.summary.has_filesort_or_temp, true, 'Should detect tree sort');
});

runTest('MaintenanceEngine: SQLite runbook and zero-downtime hot backup', () => {
  const runbook = MaintenanceEngine.getRunbook({ dialect: 'sqlite' });
  assert.strictEqual(runbook.dialect, 'sqlite');
  assert.ok(runbook.diagnostic_tasks.some(t => t.diagnostic_sql.includes('PRAGMA integrity_check')));

  const backup = MaintenanceEngine.getBackupRunbook({ dialect: 'sqlite', database_name: 'database.sqlite' });
  assert.strictEqual(backup.dialect, 'sqlite');
  assert.ok(backup.online_backup_api.vacuum_into_command.includes('VACUUM INTO'));
});

runTest('PartitionAdvisor: SQLite unsupported advisory and MySQL Error 1503 advice', () => {
  const sqliteAdv = PartitionAdvisor.advise({ table_name: 'logs', dialect: 'sqlite' });
  assert.strictEqual(sqliteAdv.success, false);
  assert.ok(sqliteAdv.error.includes('SQLite does not support native table partitioning'));

  const mysqlAdv = PartitionAdvisor.advise({ table_name: 'logs', dialect: 'mysql' });
  assert.strictEqual(mysqlAdv.success, true);
  assert.ok(mysqlAdv.migration_code.includes('PRIMARY KEY'));
});

runTest('QualityGate: detect fluent unique constraints in tenant migrations', () => {
  const fluentTenantMigration = `<?php
use Illuminate\\Database\\Migrations\\Migration;
use Illuminate\\Support\\Facades\\Schema;
return new class extends Migration {
    public function up(): void {
        Schema::create('tenant_items', function ($table) {
            $table->unsignedBigInteger('tenant_id');
            $table->string('item_code')->unique();
        });
    }
    public function down(): void { Schema::dropIfExists('tenant_items'); }
};`;

  const tmpFile = path.join(__dirname, 'tenant', 'temp_fluent_tenant.php');
  const tmpDir = path.dirname(tmpFile);
  if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });
  fs.writeFileSync(tmpFile, fluentTenantMigration);

  try {
    const gate = QualityGate.evaluate({ files: [tmpFile] });
    assert.ok(gate.violations.some(v => v.rule === 'TENANT_UNIQUE_NAMESPACE_LEAK' && v.message.includes('item_code')));
  } finally {
    if (fs.existsSync(tmpFile)) fs.unlinkSync(tmpFile);
    if (fs.existsSync(tmpDir)) fs.rmdirSync(tmpDir);
  }
});

runTest('QueryAnalyzer: JOIN ... ON foreign key extraction into joined table ESR', () => {
  const query = `
    SELECT u.name, o.id, o.amount
    FROM users u
    JOIN orders o ON u.id = o.user_id
    WHERE u.status = 'active' AND o.status = 'completed';
  `;
  const report = QueryAnalyzer.analyze({ query, dialect: 'postgresql' });
  const ordersRec = report.joined_table_indexes.find(j => j.table === 'orders');
  assert.ok(ordersRec, 'Must have recommended index for orders table');
  assert.ok(ordersRec.columns.includes('user_id'), `orders index must include user_id from JOIN condition, got: ${ordersRec?.columns}`);
});

runTest('ExplainAnalyzer: PostgreSQL Parallel Seq Scan recognition', () => {
  const parallelPlan = [
    {
      "Plan": {
        "Node Type": "Gather",
        "Total Cost": 1500.0,
        "Plan Rows": 10000,
        "Plans": [
          {
            "Node Type": "Parallel Seq Scan",
            "Relation Name": "transactions",
            "Total Cost": 1200.0,
            "Plan Rows": 5000
          }
        ]
      }
    }
  ];
  const report = ExplainAnalyzer.analyze({ plan: JSON.stringify(parallelPlan), dialect: 'postgresql' });
  assert.strictEqual(report.summary.has_sequential_scan, true, 'Parallel Seq Scan must be recognized as sequential scan');
  assert.ok(report.issues.some(i => i.type === 'SEQUENTIAL_SCAN' && i.target === 'transactions'));
});

runTest('PartitionAdvisor: cutover runbook with batched backfill and atomic swap', () => {
  const advice = PartitionAdvisor.advise({ table_name: 'audit_logs', dialect: 'postgresql', partition_type: 'range' });
  assert.ok(advice.cutover_runbook, 'Must include cutover_runbook');
  assert.ok(advice.cutover_runbook.step2_batched_backfill_sql.includes('BETWEEN :start_id AND :end_id'));
  assert.ok(advice.cutover_runbook.step3_atomic_swap_sql.includes('ALTER TABLE audit_logs RENAME TO audit_logs_old;'));
  assert.strictEqual(advice.cutover_runbook.batch_chunk_size, 10000);

  const mysqlAdv = PartitionAdvisor.advise({ table_name: 'orders', dialect: 'mysql' });
  assert.ok(mysqlAdv.cutover_runbook.step3_atomic_swap_sql.includes('RENAME TABLE orders TO orders_old, orders_partitioned TO orders;'));
});

runTest('MigrationEngine: PostgreSQL modify_column with col.using generates USING clause', () => {
  const migration = MigrationEngine.generate({
    operation: 'modify_column',
    table: 'users',
    dialect: 'postgresql',
    columns: [
      { name: 'role_id', type: 'integer', using: 'role_id::integer', previous_type: 'string' }
    ]
  });
  assert.ok(migration.migration_code.includes('DB::statement("ALTER TABLE users ALTER COLUMN role_id TYPE integer USING role_id::integer;");'));
  assert.ok(migration.migration_code.includes('DB::statement("ALTER TABLE users ALTER COLUMN role_id TYPE string USING role_id::string;");'));
});

runTest('LockAuditor: SQLite modify_column warns of unsupported ALTER and table recreation', () => {
  const audit = LockAuditor.audit({
    dialect: 'sqlite',
    table: 'products',
    estimated_rows: 50000,
    operations: [
      { type: 'modify_column', column: 'price' }
    ]
  });
  assert.strictEqual(audit.highest_risk_level, 'CRITICAL');
  const hazard = audit.hazards.find(h => h.operation.includes('price'));
  assert.ok(hazard, 'Must find hazard for price column');
  assert.ok(hazard.description.includes('SQLite does not support ALTER TABLE ... MODIFY/CHANGE COLUMN'));
  assert.ok(hazard.mitigation.includes('table recreation pattern'));
});

// ==========================================
// 12. Environment Defaults & server.js Tests
// ==========================================
await runTestAsync('server.js: handleToolCall applies environment defaults when arguments are omitted', async () => {
  // Test db_tune_server_config with empty args -> should use default 4GB RAM and dialect
  const resTune = await handleToolCall('db_tune_server_config', {});
  const parsedTune = JSON.parse(resTune.content[0].text);
  assert.ok(parsedTune.config_file_content, 'Must generate config file');
  assert.strictEqual(parsedTune.hardware.ram_gb, DEFAULT_RAM_GB);

  // Test db_generate_migration with minimal args -> uses default dialect
  const resMig = await handleToolCall('db_generate_migration', { table_name: 'test_table' });
  const parsedMig = JSON.parse(resMig.content[0].text);
  assert.ok(parsedMig.migration_code.includes("Schema::create('test_table'"));
  assert.strictEqual(parsedMig.database_type, DEFAULT_DIALECT);

  // Test db_migration_audit with minimal args
  const resAudit = await handleToolCall('db_migration_audit', {
    table: 'orders',
    operations: [{ type: 'add_column', column: 'test' }]
  });
  const parsedAudit = JSON.parse(resAudit.content[0].text);
  assert.strictEqual(parsedAudit.table, 'orders');

  // Test db_explain_analyzer with default dialect
  const resExplain = await handleToolCall('db_explain_analyzer', {
    plan: 'Seq Scan on users'
  });
  const parsedExplain = JSON.parse(resExplain.content[0].text);
  assert.ok(parsedExplain.summary);
});

runTest('server.js: TOOLS schema definitions declare expected defaults', () => {
  const migTool = TOOLS.find(t => t.name === 'db_generate_migration');
  assert.ok(migTool);
  assert.strictEqual(migTool.inputSchema.properties.database_type.default, DEFAULT_DIALECT);

  const tuneTool = TOOLS.find(t => t.name === 'db_tune_server_config');
  assert.ok(tuneTool);
  assert.strictEqual(tuneTool.inputSchema.properties.ram_gb.default, DEFAULT_RAM_GB);

  const poolerTool = TOOLS.find(t => t.name === 'db_tune_connection_pooler');
  assert.ok(poolerTool);
  assert.strictEqual(poolerTool.inputSchema.properties.pooler.default, 'pgbouncer');
});

console.log(`\n--- Test Results: ${passed} Passed, ${failed} Failed ---\n`);

if (failed > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
