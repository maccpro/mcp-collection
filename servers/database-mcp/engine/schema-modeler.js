/**
 * @file schema-modeler.js
 * @description Enterprise Multi-Tenant & Relational Schema Modeler for MariaDB, MySQL, PostgreSQL & SQLite.
 * Generates Mermaid ER diagrams, reversible Laravel migrations, and PostgreSQL RLS / SaaS tenant policies.
 */

import { MigrationEngine } from './migration-engine.js';

class SchemaModeler {
  /**
   * Design schema from high-level entity definitions.
   * @param {Object} params
   * @param {string} params.project_name
   * @param {Array<Object>} params.tables - Table definitions
   * @param {string} [params.dialect='mariadb'] - 'mariadb' | 'mysql' | 'postgresql' | 'sqlite'
   * @param {string} [params.tenancy_mode='discriminator'] - 'discriminator' | 'schema' | 'multi_database' | 'single_tenant'
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
    const mermaidErDiagram = this._generateMermaidER(enrichedTables, primary_key_type);

    // 3. Generate Reversible Laravel Migrations in dependency order
    const orderedMigrations = this._generateOrderedMigrations(enrichedTables, normalizedDialect, tenancy_mode, primary_key_type);

    // 4. Generate Tenant Isolation Policies (PostgreSQL RLS, Schema search_path, or Eloquent Global Scope)
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
        foreign_keys: (t.foreign_keys || []).map(fk => `${fk.column} -> ${(fk.on || fk.references_table)}.${fk.references || 'id'}`)
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
          primary_key_type: pkType,
          columns: [
            { name: 'name', type: 'string', length: 150 },
            { name: 'slug', type: 'string', length: 100, unique: true },
            { name: 'domain', type: 'string', length: 150, nullable: true, unique: true },
            { name: 'status', type: 'string', length: 50, default: 'active', index: true },
            { name: 'plan', type: 'string', length: 50, default: 'basic' }
          ],
          foreign_keys: []
        });
      }

      // Add tenant_id to other business tables if not already present
      for (const t of enriched) {
        if (t.name === 'tenants' || t.is_global === true) continue;

        t.columns = t.columns || [];
        t.foreign_keys = t.foreign_keys || [];

        const hasTenantCol = t.columns.some(c => c.name === 'tenant_id');
        if (!hasTenantCol) {
          const tenantFkType = pkType === 'uuid' ? 'foreign_uuid' : (pkType === 'ulid' ? 'foreign_ulid' : 'foreign_id');
          t.columns.unshift({
            name: 'tenant_id',
            type: tenantFkType,
            index: true,
            nullable: false
          });

          // Add formal foreign key
          const hasTenantFk = t.foreign_keys.some(fk => fk.column === 'tenant_id');
          if (!hasTenantFk) {
            t.foreign_keys.push({
              column: 'tenant_id',
              references: 'id',
              on: 'tenants',
              references_table: 'tenants',
              on_delete: 'cascade'
            });
          }
        }
      }
    }

    return enriched;
  }

  /**
   * Generate Mermaid ER diagram compliant with Mermaid standard
   */
  static _generateMermaidER(tables, pkType = 'id') {
    let mermaid = 'erDiagram\n';

    // Entities and attributes
    for (const table of tables) {
      mermaid += `    ${table.name} {\n`;
      if (Array.isArray(table.primary_key)) {
        for (const pk of table.primary_key) {
          mermaid += `        bigint ${pk} PK\n`;
        }
      } else {
        const pkDataType = pkType === 'uuid' ? 'uuid' : (pkType === 'ulid' ? 'string' : 'bigint');
        mermaid += `        ${pkDataType} id PK\n`;
      }

      for (const col of table.columns || []) {
        const colType = col.type || 'string';
        const colName = col.name;
        const isFk = col.name === 'tenant_id' || col.references || (table.foreign_keys || []).some(fk => fk.column === colName);
        const keyIndicator = isFk ? 'FK' : '';
        mermaid += `        ${colType} ${colName} ${keyIndicator}\n`;
      }
      mermaid += `    }\n`;
    }

    // Relationships
    const seenRelations = new Set();
    for (const table of tables) {
      // Check column-level references
      for (const col of table.columns || []) {
        let parent = col.on || col.references_table;
        if (!parent && col.references && col.references !== 'id') {
          parent = col.references;
        }
        if (parent && parent !== table.name) {
          const relKey = `${parent}->${table.name}`;
          if (!seenRelations.has(relKey)) {
            mermaid += `    ${parent} ||--o{ ${table.name} : "has"\n`;
            seenRelations.add(relKey);
          }
        }
      }

      // Check foreign_keys array
      for (const fk of table.foreign_keys || []) {
        const parent = fk.on || fk.references_table;
        if (parent && parent !== table.name) {
          const relKey = `${parent}->${table.name}`;
          if (!seenRelations.has(relKey)) {
            mermaid += `    ${parent} ||--o{ ${table.name} : "references"\n`;
            seenRelations.add(relKey);
          }
        }
      }
    }

    return mermaid;
  }

  /**
   * Generate ordered migrations
   */
  static _generateOrderedMigrations(tables, dialect, tenancyMode, pkType) {
    const sortedTables = this._topologicalSort(tables);
    const migrations = [];

    for (const table of sortedTables) {
      const scope = (tenancyMode === 'multi_database' && table.name !== 'tenants') ? 'tenant' : 'standard';
      const isTableTenantScoped = tenancyMode === 'discriminator' && table.name !== 'tenants' && !table.is_global;

      const migration = MigrationEngine.generate({
        operation: 'create_table',
        table: table.name,
        dialect,
        scope,
        primary_key_type: table.primary_key || pkType,
        include_tenant_id: isTableTenantScoped,
        columns: table.columns || [],
        foreign_keys: table.foreign_keys || []
      });

      migrations.push({
        table: table.name,
        scope,
        suggested_filename: migration.target_path.split('/').pop(),
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
        let parent = col.on || col.references_table;
        if (!parent && col.references && col.references !== 'id') parent = col.references;
        if (parent && tableMap.has(parent) && parent !== t.name) {
          dependencies.get(t.name).add(parent);
        }
      }
      for (const fk of t.foreign_keys || []) {
        const parent = fk.on || fk.references_table;
        if (parent && tableMap.has(parent) && parent !== t.name) {
          dependencies.get(t.name).add(parent);
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
    if (tenancyMode === 'multi_database') {
      return {
        strategy: 'Multi-Database Isolation',
        description: 'Tenants are isolated via dedicated database instances. Connection is dynamically switched by tenant identifier in middleware via Config::set("database.connections.tenant.database", $tenantDb).'
      };
    }

    if (tenancyMode === 'schema' && dialect === 'postgresql') {
      return {
        strategy: 'PostgreSQL Schema-per-Tenant Isolation',
        dialect: 'postgresql',
        instructions: 'Each tenant has a dedicated PostgreSQL schema. Application switches search_path per request via DB::statement("SET search_path TO tenant_" . $tenantId . ", public");',
        schema_setup_sql: `CREATE SCHEMA IF NOT EXISTS tenant_<tenant_id>;\n-- Migrations run with search_path set to tenant schema.`
      };
    }

    if (dialect === 'postgresql') {
      const rlsStatements = [];
      for (const t of tables) {
        if (t.name === 'tenants' || t.is_global) continue;
        rlsStatements.push(`-- Enable and FORCE Row Level Security for ${t.name} (prevents table owner bypass)
ALTER TABLE ${t.name} ENABLE ROW LEVEL SECURITY;
ALTER TABLE ${t.name} FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_policy ON ${t.name}
    FOR ALL
    USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::bigint);
`);
      }

      return {
        strategy: 'PostgreSQL Row-Level Security (RLS)',
        dialect: 'postgresql',
        instructions: 'PostgreSQL enforces tenant data isolation at the engine level. Set app.current_tenant_id in application middleware via DB::statement("SET LOCAL app.current_tenant_id = ?", [$tenantId]); FORCE ROW LEVEL SECURITY guarantees table owners cannot leak data.',
        rls_sql: rlsStatements.join('\n')
      };
    }

    // MariaDB / MySQL / SQLite: Eloquent Global Scope Trait
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
