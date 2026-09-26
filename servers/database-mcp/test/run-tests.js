/**
 * @file run-tests.js
 * @description Enterprise Test Suite for @maccpro/database-mcp
 * Validates DialectManager, MigrationEngine, QueryAnalyzer, LockAuditor,
 * SchemaModeler, ConfigTuner, and MaintenanceEngine across MariaDB, MySQL, and PostgreSQL.
 */

import assert from 'node:assert';
import { DialectManager } from '../engine/dialect-manager.js';
import { MigrationEngine } from '../engine/migration-engine.js';
import { QueryAnalyzer } from '../engine/query-analyzer.js';
import { LockAuditor } from '../engine/lock-auditor.js';
import { SchemaModeler } from '../engine/schema-modeler.js';
import { ConfigTuner } from '../engine/config-tuner.js';
import { MaintenanceEngine } from '../engine/maintenance-engine.js';

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

// 1. DialectManager Tests
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


runTest('DialectManager: MariaDB JSON mapping', () => {
  const jsonCol = DialectManager.mapLaravelColumn('json', 'metadata', {}, 'mariadb');
  assert.ok(jsonCol.includes('$table->json(\'metadata\')'), 'MariaDB should map to json');
});

// 2. MigrationEngine Tests
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

runTest('MigrationEngine: tenant scope create_table reversible', () => {
  const migration = MigrationEngine.generate({
    table_name: 'orders',
    operation: 'create_table',
    database_type: 'postgresql',
    scope: 'tenant',
    columns: [
      { name: 'total_amount', type: 'decimal' },
      { name: 'customer_email', type: 'string' }
    ]
  });

  assert.strictEqual(migration.scope, 'tenant');
  assert.ok(migration.target_path.startsWith('database/migrations/tenant/'));
  assert.ok(migration.artisan_command.includes('tenants:artisan "migrate"'));
});

runTest('MigrationEngine: add_columns with typed reversible drop', () => {
  const migration = MigrationEngine.generate({
    table_name: 'users',
    operation: 'add_columns',
    columns: [
      { name: 'phone', type: 'string', length: 20, nullable: true },
      { name: 'is_verified', type: 'boolean', default: false }
    ]
  });

  assert.ok(migration.migration_code.includes('$table->string(\'phone\', 20)->nullable();'));
  assert.ok(migration.migration_code.includes('$table->dropColumn([\'phone\', \'is_verified\']);'), 'Must drop added columns in down()');
});

runTest('MigrationEngine: drop_columns with typed reversible recreation', () => {
  const migration = MigrationEngine.generate({
    table_name: 'users',
    operation: 'drop_columns',
    columns: [
      { name: 'legacy_token', type: 'string', length: 100, nullable: true }
    ]
  });

  assert.ok(migration.migration_code.includes('$table->dropColumn([\'legacy_token\']);'), 'Must drop column in up()');
  assert.ok(migration.migration_code.includes('$table->string(\'legacy_token\', 100)->nullable();'), 'Must restore column in down()');
});

// 3. QueryAnalyzer Tests
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

// 4. LockAuditor Tests
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

runTest('LockAuditor: verify low risk concurrent index creation', () => {
  const audit = LockAuditor.audit({
    table: 'payments',
    dialect: 'postgresql',
    estimated_rows: 500000,
    operations: [
      { type: 'add_index', column: 'status', concurrent: true }
    ]
  });

  assert.strictEqual(audit.highest_risk_level, 'LOW');
  assert.strictEqual(audit.zero_downtime_compliant, true);
});

// 5. SchemaModeler Tests
runTest('SchemaModeler: generate Mermaid ER diagram and multi-tenant policies', () => {
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
          { name: 'customer_id', type: 'foreignId', references: 'customers' },
          { name: 'amount', type: 'decimal' }
        ]
      }
    ]
  });

  assert.ok(schema.mermaid_er_diagram.includes('erDiagram'));
  assert.ok(schema.mermaid_er_diagram.includes('customers ||--o{ invoices : "has"'));
  assert.ok(schema.ordered_migrations.length >= 3, 'Should generate tenants, customers, and invoices migrations');
  assert.ok(schema.tenant_security_policies.strategy.includes('Row-Level Security'));
});

// 6. ConfigTuner Tests
runTest('ConfigTuner: MariaDB 16GB NVMe server tuning', () => {
  const tuning = ConfigTuner.tune({
    ram_gb: 16,
    vcpu: 8,
    disk_type: 'nvme',
    server_type: 'dedicated',
    dialect: 'mariadb'
  });

  assert.strictEqual(tuning.dialect, 'mariadb');
  assert.strictEqual(tuning.computed_parameters.innodb_io_capacity, 4000);
  assert.ok(tuning.config_file_content.includes('innodb_buffer_pool_size'));
  assert.ok(tuning.config_file_content.includes('innodb_flush_method            = O_DIRECT'));
});

runTest('ConfigTuner: PostgreSQL 32GB server tuning', () => {
  const tuning = ConfigTuner.tune({
    ram_gb: 32,
    vcpu: 16,
    disk_type: 'nvme',
    server_type: 'dedicated',
    dialect: 'postgresql'
  });

  assert.strictEqual(tuning.dialect, 'postgresql');
  assert.strictEqual(tuning.computed_parameters.random_page_cost, 1.1);
  assert.ok(tuning.config_file_content.includes('shared_buffers = 8192MB'));
  assert.ok(tuning.config_file_content.includes('effective_cache_size = 24576MB'));
});

// 7. MaintenanceEngine Tests
runTest('MaintenanceEngine: generate PostgreSQL bloat and defragmentation runbook', () => {
  const runbook = MaintenanceEngine.getRunbook({ dialect: 'postgresql', task: 'bloat' });
  assert.strictEqual(runbook.dialect, 'postgresql');
  assert.ok(runbook.diagnostic_tasks.length > 0);
  assert.ok(runbook.diagnostic_tasks[0].diagnostic_sql.includes('pg_stat_user_tables'));
});

runTest('MaintenanceEngine: generate MySQL fragmentation runbook', () => {
  const runbook = MaintenanceEngine.getRunbook({ dialect: 'mysql', task: 'fragmentation' });
  assert.strictEqual(runbook.dialect, 'mysql');
  assert.ok(runbook.diagnostic_tasks[0].diagnostic_sql.includes('information_schema.tables'));
  assert.ok(runbook.diagnostic_tasks[0].diagnostic_sql.includes('data_free'));
});

console.log(`\n--- Test Results: ${passed} Passed, ${failed} Failed ---\n`);

if (failed > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
