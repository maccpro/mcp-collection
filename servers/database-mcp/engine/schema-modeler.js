/**
 * @file schema-modeler.js
 * @description Enterprise Multi-Tenant & Relational Schema Modeler for MariaDB, MySQL, and PostgreSQL.
 * Generates Mermaid ER diagrams, reversible Laravel migrations, and PostgreSQL RLS / SaaS tenant policies.
 */

import { MigrationEngine } from './migration-engine.js';

class SchemaModeler {
  /**
   * Design schema from high-level entity definitions.
   * @param {Object} params
   * @param {string} params.project_name
   * @param {Array<Object>} params.tables - Table definitions
   * @param {string} [params.dialect='mariadb'] - 'mariadb' | 'mysql' | 'postgresql'
   * @param {string} [params.tenancy_mode='discriminator'] - 'discriminator' (tenant_id column) | 'multi_database' | 'single_tenant'
   * @param {string} [params.primary_key_type='id'] - 'id' | 'uuid' | 'ulid'
   * @returns {Object} Schema model with Mermaid ER diagram, ordered migrations, and tenant isolation policies
   */
  static design(params) {
    const {
      project_name = 'EnterpriseApp',
      tables = [],
      dialect = 'mariadb',
      tenancy_mode = 'discriminator',
      primary_key_type = 'id'
    } = params;

    const normalizedDialect = dialect.toLowerCase();

    // 1. Ensure tenant table and tenant_id columns if tenancy_mode is 'discriminator'
    const enrichedTables = this._enrichForTenancy(tables, tenancy_mode, primary_key_type);

    // 2. Generate Mermaid ER Diagram
    const mermaidErDiagram = this._generateMermaidER(enrichedTables);

    // 3. Generate Reversible Laravel Migrations in dependency order
    const orderedMigrations = this._generateOrderedMigrations(enrichedTables, normalizedDialect, tenancy_mode, primary_key_type);

    // 4. Generate Tenant Isolation Policies (PostgreSQL RLS or Eloquent Global Scope)
    const tenantSecurityPolicies = this._generateTenantPolicies(enrichedTables, normalizedDialect, tenancy_mode);

    return {
      success: true,
      project_name,
      dialect: normalizedDialect,
      tenancy_mode,
      primary_key_type,
      mermaid_er_diagram: mermaidErDiagram,
      ordered_migrations: orderedMigrations,
      tenant_security_policies: tenantSecurityPolicies,
      table_summary: enrichedTables.map(t => ({
        table: t.name,
        columns_count: (t.columns || []).length,
        foreign_keys: (t.foreign_keys || []).map(fk => `${fk.column} -> ${fk.references_table}.${fk.references_column || 'id'}`)
      }))
    };
  }

  /**
   * Enrich table schemas for multi-tenancy
   */
  static _enrichForTenancy(tables, tenancyMode, pkType) {
    const enriched = JSON.parse(JSON.stringify(tables));

    if (tenancyMode === 'discriminator') {
      // Check if 'tenants' table exists
      const hasTenantsTable = enriched.some(t => t.name === 'tenants');
      if (!hasTenantsTable) {
        enriched.unshift({
          name: 'tenants',
          description: 'Tenant organization accounts',
          columns: [
            { name: 'name', type: 'string', length: 150 },
            { name: 'slug', type: 'string', length: 100, unique: true },
            { name: 'domain', type: 'string', length: 150, nullable: true, unique: true },
            { name: 'status', type: 'string', length: 50, default: 'active', index: true },
            { name: 'plan', type: 'string', length: 50, default: 'basic' }
          ]
        });
      }

      // Add tenant_id to other business tables if not already present
      for (const t of enriched) {
        if (t.name === 'tenants' || t.is_global === true) continue;

        const hasTenantCol = (t.columns || []).some(c => c.name === 'tenant_id');
        if (!hasTenantCol) {
          t.columns = t.columns || [];
          t.columns.unshift({
            name: 'tenant_id',
            type: pkType === 'uuid' ? 'uuid' : 'foreignId',
            index: true,
            nullable: false,
            references: 'tenants',
            on_delete: 'cascade'
          });
        }
      }
    }

    return enriched;
  }

  /**
   * Generate Mermaid ER diagram compliant with Mermaid standard
   */
  static _generateMermaidER(tables) {
    let mermaid = 'erDiagram\n';

    // Entities and attributes
    for (const table of tables) {
      mermaid += `    ${table.name} {\n`;
      mermaid += `        bigint id PK\n`;

      for (const col of table.columns || []) {
        const colType = col.type || 'string';
        const colName = col.name;
        const keyIndicator = col.name === 'tenant_id' ? 'FK' : col.references ? 'FK' : '';
        mermaid += `        ${colType} ${colName} ${keyIndicator}\n`;
      }
      mermaid += `    }\n`;
    }

    // Relationships
    for (const table of tables) {
      for (const col of table.columns || []) {
        if (col.references) {
          mermaid += `    ${col.references} ||--o{ ${table.name} : "has"\n`;
        }
      }
      for (const fk of table.foreign_keys || []) {
        mermaid += `    ${fk.references_table} ||--o{ ${table.name} : "references"\n`;
      }
    }

    return mermaid;
  }

  /**
   * Generate ordered migrations
   */
  static _generateOrderedMigrations(tables, dialect, tenancyMode, pkType) {
    // Topological sort by foreign key dependencies
    const sortedTables = this._topologicalSort(tables);
    const migrations = [];
    let timestampCounter = 1;

    for (const table of sortedTables) {
      const scope = (tenancyMode === 'multi_database' && table.name !== 'tenants') ? 'tenant' : 'standard';
      const timestamp = `2026_09_26_${String(timestampCounter).padStart(6, '0')}`;
      timestampCounter++;

      const migration = MigrationEngine.generate({
        operation: 'create_table',
        table: table.name,
        dialect,
        scope,
        primary_key_type: pkType,
        columns: table.columns || [],
        foreign_keys: table.foreign_keys || []
      });

      migrations.push({
        table: table.name,
        scope,
        suggested_filename: `${timestamp}_create_${table.name}_table.php`,
        target_path: migration.target_path,
        migration_code: migration.migration_code,
        artisan_command: migration.artisan_command
      });
    }

    return migrations;
  }

  /**
   * Topological sort of tables based on references
   */
  static _topologicalSort(tables) {
    const tableMap = new Map();
    const dependencies = new Map();

    for (const t of tables) {
      tableMap.set(t.name, t);
      dependencies.set(t.name, new Set());
    }

    for (const t of tables) {
      for (const col of t.columns || []) {
        if (col.references && tableMap.has(col.references) && col.references !== t.name) {
          dependencies.get(t.name).add(col.references);
        }
      }
      for (const fk of t.foreign_keys || []) {
        if (fk.references_table && tableMap.has(fk.references_table) && fk.references_table !== t.name) {
          dependencies.get(t.name).add(fk.references_table);
        }
      }
    }

    const sorted = [];
    const visited = new Set();
    const visiting = new Set();

    function visit(name) {
      if (visiting.has(name)) return; // circular dependency protection
      if (!visited.has(name)) {
        visiting.add(name);
        for (const dep of dependencies.get(name) || []) {
          visit(dep);
        }
        visiting.delete(name);
        visited.add(name);
        sorted.push(tableMap.get(name));
      }
    }

    for (const name of tableMap.keys()) {
      visit(name);
    }

    return sorted.filter(Boolean);
  }

  /**
   * Generate Tenant Security Policies
   */
  static _generateTenantPolicies(tables, dialect, tenancyMode) {
    if (tenancyMode !== 'discriminator') {
      return {
        strategy: 'Multi-Database Isolation',
        description: 'Tenants are isolated via dedicated database instances/schemas. Connection is dynamically switched by tenant identifier in middleware.'
      };
    }

    if (dialect === 'postgresql') {
      const rlsStatements = [];
      for (const t of tables) {
        if (t.name === 'tenants' || t.is_global) continue;
        rlsStatements.push(`-- Enable Row Level Security for ${t.name}
ALTER TABLE ${t.name} ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_policy ON ${t.name}
    FOR ALL
    USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::bigint);
`);
      }

      return {
        strategy: 'PostgreSQL Row-Level Security (RLS)',
        dialect: 'postgresql',
        instructions: 'PostgreSQL enforces tenant data isolation at the engine level. Set app.current_tenant_id in application middleware via DB::statement("SET LOCAL app.current_tenant_id = ?", [$tenantId]);',
        rls_sql: rlsStatements.join('\n')
      };
    }

    // MariaDB / MySQL: Eloquent Global Scope Trait
    const eloquentTrait = `<?php

namespace App\\Models\\Concerns;

use App\\Models\\Scopes\\TenantScope;
use Illuminate\\Database\\Eloquent\\Relations\\BelongsTo;

trait BelongsToTenant
{
    protected static function bootBelongsToTenant(): void
    {
        static::addGlobalScope(new TenantScope());

        static::creating(function ($model) {
            if (!$model->tenant_id && auth()->check() && auth()->user()->tenant_id) {
                $model->tenant_id = auth()->user()->tenant_id;
            }
        });
    }

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(\\App\\Models\\Tenant::class);
    }
}
`;

    return {
      strategy: 'Eloquent Global Scope (Tenant Isolation)',
      dialect,
      instructions: 'Use the BelongsToTenant trait across all tenant-scoped Eloquent models. It automatically filters queries by WHERE tenant_id = ? and populates tenant_id on creation.',
      eloquent_trait_code: eloquentTrait
    };
  }
}

export { SchemaModeler };
export default SchemaModeler;

