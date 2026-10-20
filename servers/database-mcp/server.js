#!/usr/bin/env node

/**
 * @file server.js
 * @description Enterprise Database Architecture, Reversible Migrations, SARGable Query Optimizer,
 * Execution Plan Analyzer, Quality Gate, and Server Tuning MCP Server for MariaDB, MySQL, and PostgreSQL.
 * 
 * 100% Offline, Deterministic, Zero-Token & Free.
 */

import readline from 'node:readline';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { loadEnv } from './engine/env-loader.js';
import { DialectManager } from './engine/dialect-manager.js';
import { MigrationEngine } from './engine/migration-engine.js';
import { QueryAnalyzer } from './engine/query-analyzer.js';
import { LockAuditor } from './engine/lock-auditor.js';
import { SchemaModeler } from './engine/schema-modeler.js';
import { ConfigTuner } from './engine/config-tuner.js';
import { MaintenanceEngine } from './engine/maintenance-engine.js';
import { ExplainAnalyzer } from './engine/explain-analyzer.js';
import { QualityGate } from './engine/quality-gate.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load optional .env
loadEnv(__dirname);

// Connected Environment Defaults
const DEFAULT_DIALECT = process.env.DB_DEFAULT_DIALECT || process.env.DEFAULT_DATABASE_DIALECT || 'mariadb';
const DEFAULT_SCOPE = process.env.DB_MIGRATION_SCOPE || process.env.DEFAULT_MIGRATION_SCOPE || 'standard';

// MCP Tool Definitions
const TOOLS = [
  {
    name: 'db_generate_migration',
    description: 'Generates production-ready, strictly reversible Laravel anonymous migrations with matching up() and down() methods for MariaDB, MySQL, and PostgreSQL. Supports create_table, add_columns, drop_columns, modify_column, rename_column, rename_table, add_indexes, drop_indexes, add_foreign_keys, drop_foreign_keys, and raw_sql. Adheres to zero-direct-DB-alteration rule and outputs standard (database/migrations/) or tenant (database/migrations/tenant/) file paths and Artisan execution commands.',
    inputSchema: {
      type: 'object',
      properties: {
        table_name: {
          type: 'string',
          description: 'Name of the database table (e.g. "users", "invoices", "orders").'
        },
        operation: {
          type: 'string',
          enum: [
            'create_table',
            'add_columns',
            'drop_columns',
            'modify_column',
            'rename_column',
            'rename_table',
            'add_indexes',
            'drop_indexes',
            'add_foreign_keys',
            'drop_foreign_keys',
            'raw_sql'
          ],
          default: 'create_table',
          description: 'Migration operation to perform.'
        },
        database_type: {
          type: 'string',
          enum: ['mariadb', 'mysql', 'postgresql'],
          default: DEFAULT_DIALECT,
          description: 'Target database engine dialect.'
        },
        scope: {
          type: 'string',
          enum: ['standard', 'tenant'],
          default: DEFAULT_SCOPE,
          description: 'Target migration scope. "standard" targets database/migrations/, "tenant" targets database/migrations/tenant/.'
        },
        primary_key: {
          type: 'string',
          enum: ['id', 'uuid', 'ulid'],
          default: 'id',
          description: 'Primary key strategy.'
        },
        include_tenant_id: {
          type: 'boolean',
          default: false,
          description: 'Include tenant_id column and foreign key for discriminator multi-tenancy.'
        },
        columns: {
          type: 'array',
          description: 'Array of column definitions: [{ name: "email", type: "string", length: 191, unique: true, nullable: false, default: "value", index: true }].',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              type: { type: 'string' },
              length: { type: 'integer' },
              nullable: { type: 'boolean' },
              unique: { type: 'boolean' },
              index: { type: 'boolean' },
              unsigned: { type: 'boolean' },
              after: { type: 'string' },
              default: { type: ['string', 'number', 'boolean'] },
              comment: { type: 'string' }
            },
            required: ['name', 'type']
          }
        },
        indexes: {
          type: 'array',
          description: 'Array of composite or specialized indexes: [{ columns: ["tenant_id", "status"], type: "index", name: "idx_tenant_status" }].',
          items: {
            type: 'object',
            properties: {
              columns: { type: 'array', items: { type: 'string' } },
              type: { type: 'string', enum: ['index', 'unique', 'spatial', 'fulltext'] },
              name: { type: 'string' }
            },
            required: ['columns']
          }
        },
        foreign_keys: {
          type: 'array',
          description: 'Array of foreign key constraints: [{ column: "tenant_id", references: "id", on: "tenants", on_delete: "cascade" }].',
          items: {
            type: 'object',
            properties: {
              column: { type: 'string' },
              references: { type: 'string' },
              on: { type: 'string' },
              on_delete: { type: 'string', enum: ['cascade', 'restrict', 'set null', 'set_null', 'no action'] },
              on_update: { type: 'string', enum: ['cascade', 'restrict', 'no action'] }
            },
            required: ['column', 'on']
          }
        },
        timestamps: {
          type: 'boolean',
          default: true,
          description: 'Whether to append created_at and updated_at timestamps.'
        },
        soft_deletes: {
          type: 'boolean',
          default: false,
          description: 'Whether to include deleted_at soft delete column.'
        },
        from: { type: 'string', description: 'Old column or table name for rename operations.' },
        to: { type: 'string', description: 'New column or table name for rename operations.' },
        sql_up: { type: 'string', description: 'Raw SQL statement for up() in raw_sql operation.' },
        sql_down: { type: 'string', description: 'Raw SQL statement for down() in raw_sql operation.' }
      },
      required: ['table_name']
    }
  },
  {
    name: 'db_analyze_query',
    description: 'Analyzes SQL and Eloquent queries for performance, SARGability anti-patterns (e.g. YEAR(date), LOWER(col), leading wildcards, OR predicates, != scans, deep OFFSET pagination, implicit type coercion), applies the ESR (Equality, Sort, Range) indexing rule, and generates both composite index migrations and optimized Eloquent rewriters with eager-loading.',
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'SQL query string or Eloquent query representation.'
        },
        dialect: {
          type: 'string',
          enum: ['mariadb', 'mysql', 'postgresql'],
          default: DEFAULT_DIALECT,
          description: 'Target database engine dialect.'
        },
        table: {
          type: 'string',
          description: 'Optional target table name if not automatically detectable.'
        },
        existing_indexes: {
          type: 'array',
          items: {
            anyOf: [
              { type: 'string' },
              { type: 'array', items: { type: 'string' } }
            ]
          },
          description: 'Existing indexes on the table to prevent redundant index recommendations.'
        }
      },
      required: ['query']
    }
  },
  {
    name: 'db_design_schema',
    description: 'Enterprise relational & multi-tenant schema modeler. Converts high-level entity specifications into standard Mermaid ER diagrams (erDiagram), topologically ordered reversible Laravel migrations, and SaaS tenant isolation policies (PostgreSQL Row-Level Security RLS with FORCE, Schema-per-tenant, or Eloquent Global Scope Trait).',
    inputSchema: {
      type: 'object',
      properties: {
        project_name: {
          type: 'string',
          default: 'EnterpriseApp',
          description: 'Project or domain name.'
        },
        tables: {
          type: 'array',
          description: 'List of entity/table definitions with columns and foreign key references.',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              description: { type: 'string' },
              columns: { type: 'array' },
              foreign_keys: { type: 'array' },
              is_global: { type: 'boolean', description: 'True if table is global and should not receive tenant_id' }
            },
            required: ['name']
          }
        },
        dialect: {
          type: 'string',
          enum: ['mariadb', 'mysql', 'postgresql'],
          default: DEFAULT_DIALECT,
          description: 'Target database dialect.'
        },
        tenancy_mode: {
          type: 'string',
          enum: ['discriminator', 'schema', 'multi_database', 'single_tenant'],
          default: 'discriminator',
          description: 'Multi-tenancy isolation architecture.'
        },
        primary_key_type: {
          type: 'string',
          enum: ['id', 'uuid', 'ulid'],
          default: 'id',
          description: 'Primary key convention.'
        }
      },
      required: ['tables']
    }
  },
  {
    name: 'db_migration_audit',
    description: 'Audits migration operations for zero-downtime compliance, table lock hazards (MDL lock queues, PostgreSQL AccessExclusiveLock, volatile defaults, table rebuilds, non-concurrent indexes), and outputs step-by-step non-blocking execution recipes with online DDL tool examples.',
    inputSchema: {
      type: 'object',
      properties: {
        table: {
          type: 'string',
          description: 'Name of the table being altered.'
        },
        operations: {
          type: 'array',
          description: 'List of operations: [{ type: "add_column", column: "status", nullable: false, default: "active" }].',
          items: {
            type: 'object',
            properties: {
              type: { type: 'string' },
              column: { type: 'string' },
              nullable: { type: 'boolean' },
              default: { type: ['string', 'number', 'boolean'] },
              concurrent: { type: 'boolean' }
            },
            required: ['type']
          }
        },
        dialect: {
          type: 'string',
          enum: ['mariadb', 'mysql', 'postgresql'],
          default: DEFAULT_DIALECT,
          description: 'Target database dialect.'
        },
        estimated_rows: {
          type: 'number',
          default: 100000,
          description: 'Estimated row count of the table in production.'
        }
      },
      required: ['table', 'operations']
    }
  },
  {
    name: 'db_tune_server_config',
    description: 'Hardware sizing calculator and NVMe production tuner for MariaDB (my.cnf), MySQL (my.cnf), and PostgreSQL (postgresql.conf). Computes buffer pool, shared buffers, effective cache size, work memory, redo/WAL sizing, IO capacity, slow query logging, and Linux kernel sysctl parameters.',
    inputSchema: {
      type: 'object',
      properties: {
        ram_gb: {
          type: 'number',
          description: 'Total server RAM in Gigabytes (e.g. 4, 8, 16, 32, 64).'
        },
        vcpu: {
          type: 'number',
          default: 4,
          description: 'Number of vCPU cores.'
        },
        disk_type: {
          type: 'string',
          enum: ['nvme', 'sata_ssd', 'hdd'],
          default: 'nvme',
          description: 'Primary storage drive type.'
        },
        workload: {
          type: 'string',
          enum: ['oltp', 'data_warehouse', 'mixed'],
          default: 'oltp',
          description: 'Workload pattern.'
        },
        server_type: {
          type: 'string',
          enum: ['dedicated', 'shared'],
          default: 'dedicated',
          description: 'Whether the database server is dedicated or shared with Nginx/PHP-FPM.'
        },
        dialect: {
          type: 'string',
          enum: ['mariadb', 'mysql', 'postgresql'],
          default: DEFAULT_DIALECT,
          description: 'Target database system.'
        }
      },
      required: ['ram_gb']
    }
  },
  {
    name: 'db_maintenance_runbook',
    description: 'Generates enterprise diagnostic SQL queries and CLI runbooks for dead tuple bloat, table fragmentation, index rebuilds, unused index audits, replication lag, idle-in-transaction connection starvation, and hung lock killers.',
    inputSchema: {
      type: 'object',
      properties: {
        dialect: {
          type: 'string',
          enum: ['mariadb', 'mysql', 'postgresql'],
          default: DEFAULT_DIALECT,
          description: 'Database system.'
        },
        task: {
          type: 'string',
          enum: ['bloat', 'fragmentation', 'locks', 'unused_indexes', 'replication', 'connections', 'all'],
          default: 'all',
          description: 'Maintenance target task.'
        },
        table: {
          type: 'string',
          description: 'Optional target table name to narrow diagnostic query.'
        }
      }
    }
  },
  {
    name: 'db_explain_analyzer',
    description: 'Parses and analyzes PostgreSQL, MariaDB, and MySQL EXPLAIN and EXPLAIN ANALYZE execution plans. Detects sequential full-table scans, filesorts, temporary disk spills, cardinality estimation mismatches, and suggests concrete index and configuration fixes.',
    inputSchema: {
      type: 'object',
      properties: {
        plan: {
          type: 'string',
          description: 'Raw text or JSON output of EXPLAIN / EXPLAIN ANALYZE command.'
        },
        dialect: {
          type: 'string',
          enum: ['postgresql', 'mariadb', 'mysql'],
          default: 'postgresql',
          description: 'Database system dialect.'
        },
        table: {
          type: 'string',
          description: 'Optional table name to anchor the analysis.'
        }
      },
      required: ['plan']
    }
  },
  {
    name: 'db_backup_restore_runbook',
    description: 'Generates enterprise Disaster Recovery (DR) and Backup/Restore runbooks for MariaDB, MySQL, and PostgreSQL, including non-blocking logical dumps, hot physical backups (pg_basebackup, mariabackup), automated cron rotation, and Point-in-Time Recovery (PITR).',
    inputSchema: {
      type: 'object',
      properties: {
        database_name: {
          type: 'string',
          default: 'app_production',
          description: 'Target database name.'
        },
        dialect: {
          type: 'string',
          enum: ['mariadb', 'mysql', 'postgresql'],
          default: DEFAULT_DIALECT,
          description: 'Target database system.'
        }
      }
    }
  },
  {
    name: 'db_quality_gate',
    description: 'Automated pre-commit quality gate for database migrations. Scans Laravel and SQL migration files in the workspace for strict reversibility (matching up() and down() methods), multi-tenant scoping, and zero-downtime lock hazards.',
    inputSchema: {
      type: 'object',
      properties: {
        workspace_path: {
          type: 'string',
          description: 'Root path of the repository/workspace to scan.'
        },
        files: {
          type: 'array',
          items: { type: 'string' },
          description: 'Optional explicit list of migration file paths to evaluate.'
        }
      }
    }
  }
];

/**
 * Handle MCP Tool Call
 */
async function handleToolCall(name, args) {
  switch (name) {
    case 'db_generate_migration': {
      const result = MigrationEngine.generate(args);
      return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
      };
    }

    case 'db_analyze_query': {
      const result = QueryAnalyzer.analyze(args);
      return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
      };
    }

    case 'db_design_schema': {
      const result = SchemaModeler.design(args);
      return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
      };
    }

    case 'db_migration_audit': {
      const result = LockAuditor.audit(args);
      return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
      };
    }

    case 'db_tune_server_config': {
      const result = ConfigTuner.tune(args);
      return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
      };
    }

    case 'db_maintenance_runbook': {
      const result = MaintenanceEngine.getRunbook(args);
      return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
      };
    }

    case 'db_explain_analyzer': {
      const result = ExplainAnalyzer.analyze(args);
      return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
      };
    }

    case 'db_backup_restore_runbook': {
      const result = MaintenanceEngine.getBackupRunbook(args);
      return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
      };
    }

    case 'db_quality_gate': {
      const result = QualityGate.evaluate(args);
      return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
      };
    }

    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

// Stdio JSON-RPC 2.0 Server Setup
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: false
});

function sendResponse(response) {
  process.stdout.write(JSON.stringify(response) + '\n');
}

rl.on('line', async (line) => {
  const trimmed = line.trim();
  if (!trimmed) return;

  let message;
  try {
    message = JSON.parse(trimmed);
  } catch (err) {
    return;
  }

  const { id, method, params } = message;
  if (id === undefined || id === null) {
    return;
  }

  try {
    switch (method) {
      case 'initialize':
        sendResponse({
          jsonrpc: '2.0',
          id,
          result: {
            protocolVersion: '2024-11-05',
            capabilities: {
              tools: {}
            },
            serverInfo: {
              name: 'database-mcp',
              version: '1.1.0'
            }
          }
        });
        break;

      case 'tools/list':
        sendResponse({
          jsonrpc: '2.0',
          id,
          result: {
            tools: TOOLS
          }
        });
        break;

      case 'tools/call':
        if (!params || !params.name) {
          sendResponse({
            jsonrpc: '2.0',
            id,
            error: {
              code: -32602,
              message: 'Missing tool name parameter'
            }
          });
          return;
        }

        try {
          const toolResult = await handleToolCall(params.name, params.arguments || {});
          sendResponse({
            jsonrpc: '2.0',
            id,
            result: toolResult
          });
        } catch (err) {
          sendResponse({
            jsonrpc: '2.0',
            id,
            result: {
              isError: true,
              content: [
                {
                  type: 'text',
                  text: `Tool execution failed: ${err.message}`
                }
              ]
            }
          });
        }
        break;

      case 'ping':
        sendResponse({
          jsonrpc: '2.0',
          id,
          result: {}
        });
        break;

      default:
        sendResponse({
          jsonrpc: '2.0',
          id,
          error: {
            code: -32601,
            message: `Method '${method}' not found`
          }
        });
        break;
    }
  } catch (err) {
    sendResponse({
      jsonrpc: '2.0',
      id,
      error: {
        code: -32603,
        message: `Internal error: ${err.message}`
      }
    });
  }
});
