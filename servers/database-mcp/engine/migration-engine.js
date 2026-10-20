import { DialectManager } from './dialect-manager.js';

/**
 * Enterprise Laravel Reversible Migration Generator
 * Generates production-ready, reversible Laravel Anonymous Migrations for Standard & Multi-Tenant Scopes.
 * Supports PostgreSQL, MariaDB, MySQL & SQLite.
 */
export class MigrationEngine {
  /**
   * Format standard Laravel migration timestamp (YYYY_MM_DD_HHMMSS)
   */
  static formatTimestamp() {
    const d = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getUTCFullYear()}_${pad(d.getUTCMonth() + 1)}_${pad(d.getUTCDate())}_${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}`;
  }

  /**
   * Generate Migration File & CLI commands
   */
  static generate(params = {}) {
    const tableName = (params.table_name || params.table || 'example_table').toLowerCase().trim();
    const operation = (params.operation || 'create_table').toLowerCase().trim();
    const dialect = DialectManager.normalize(params.database_type || params.dialect || 'mariadb');
    const scope = (params.scope || 'standard').toLowerCase().trim();
    const isTenant = scope === 'tenant' || params.is_tenant === true || params.include_tenant_id === true;
    const shouldIncludeTenantId = params.include_tenant_id === true || params.is_tenant === true || (scope === 'tenant' && params.include_tenant_id !== false);
    const pkType = params.primary_key || params.primary_key_type || 'id';

    const columns = params.columns || [];
    const indexes = params.indexes || [];
    const foreignKeys = params.foreign_keys || [];
    const checkConstraints = params.check_constraints || [];
    const timestamps = params.timestamps !== false;
    const softDeletes = params.soft_deletes === true;

    let upBody = '';
    let downBody = '';
    let description = '';
    let requiresNoTransaction = false;

    const timestampPrefix = this.formatTimestamp();
    const filename = `${timestampPrefix}_${operation}_${tableName}.php`;
    const targetDir = isTenant ? 'database/migrations/tenant' : 'database/migrations';
    const targetPath = `${targetDir}/${filename}`;

    switch (operation) {
      case 'create_table': {
        description = `Create table '${tableName}' (${dialect.toUpperCase()} - ${isTenant ? 'Tenant' : 'Standard'} Scope)`;
        const lines = [];
        const tenantScopedUniqueCols = [];

        // Primary Key handling
        if (Array.isArray(pkType)) {
          const pkCols = pkType.map(c => `'${c}'`).join(', ');
          lines.push(`$table->primary([${pkCols}]);`);
        } else if (pkType === 'uuid') {
          lines.push(DialectManager.mapLaravelColumn('uuid', 'id', { primary: true }, dialect));
        } else if (pkType === 'ulid') {
          lines.push(DialectManager.mapLaravelColumn('ulid', 'id', { primary: true }, dialect));
        } else if (pkType === 'composite' && Array.isArray(params.primary_key_columns)) {
          const pkCols = params.primary_key_columns.map(c => `'${c}'`).join(', ');
          lines.push(`$table->primary([${pkCols}]);`);
        } else if (pkType !== 'none') {
          lines.push('$table->id();');
        }

        // Tenant ID if tenant table in single-database tenancy
        if (shouldIncludeTenantId) {
          if (pkType === 'uuid') {
            lines.push(DialectManager.mapLaravelColumn('foreign_uuid', 'tenant_id', { index: true }, dialect));
          } else if (pkType === 'ulid') {
            lines.push(DialectManager.mapLaravelColumn('foreign_ulid', 'tenant_id', { index: true }, dialect));
          } else {
            lines.push('$table->unsignedBigInteger(\'tenant_id\')->index();');
          }
        }

        // Custom columns
        for (const col of columns) {
          const colOpts = { ...col };
          // If in multi-tenant discriminator scope and column is unique, scope it with tenant_id rather than global unique
          if (shouldIncludeTenantId && colOpts.unique) {
            delete colOpts.unique;
            tenantScopedUniqueCols.push(col.name);
          }
          lines.push(DialectManager.mapLaravelColumn(col.type || 'string', col.name, colOpts, dialect));
        }

        // Multi-tenant scoped composite unique indexes
        for (const uCol of tenantScopedUniqueCols) {
          lines.push(`$table->unique(['tenant_id', '${uCol}']); // Scoped to tenant to prevent cross-tenant collision`);
        }

        // Indexes
        for (const idx of indexes) {
          if (Array.isArray(idx.columns)) {
            let cols = idx.columns;
            if (shouldIncludeTenantId && idx.type === 'unique' && !cols.includes('tenant_id')) {
              cols = ['tenant_id', ...cols];
            }
            const colsStr = cols.map(c => `'${c}'`).join(', ');
            const idxName = idx.name ? `, '${idx.name}'` : '';
            if (idx.type === 'unique') {
              lines.push(`$table->unique([${colsStr}]${idxName});`);
            } else if (idx.type === 'spatial') {
              lines.push(`$table->spatialIndex([${colsStr}]${idxName});`);
            } else if (idx.type === 'fulltext') {
              lines.push(`$table->fullText([${colsStr}]${idxName});`);
            } else {
              lines.push(`$table->index([${colsStr}]${idxName});`);
            }
          }
        }

        // Check constraints
        for (const chk of checkConstraints) {
          const expr = typeof chk === 'string' ? chk : chk.expression;
          const chkName = typeof chk === 'object' && chk.name ? `, '${chk.name}'` : '';
          lines.push(`$table->check('${expr}'${chkName});`);
        }

        // Foreign Keys
        for (const fk of foreignKeys) {
          const col = fk.column;
          const ref = fk.references || 'id';
          const onTable = fk.on || fk.references_table;
          let fkStr = `$table->foreign('${col}')->references('${ref}')->on('${onTable}')`;

          const onDelete = String(fk.on_delete || fk.onDelete || '').toLowerCase().replace(/[\s\-]/g, '_');
          if (onDelete === 'cascade') fkStr += '->cascadeOnDelete()';
          else if (onDelete === 'set_null') fkStr += '->nullOnDelete()';
          else if (onDelete === 'restrict') fkStr += '->restrictOnDelete()';
          else if (onDelete === 'no_action') fkStr += '->noActionOnDelete()';

          const onUpdate = String(fk.on_update || fk.onUpdate || '').toLowerCase().replace(/[\s\-]/g, '_');
          if (onUpdate === 'cascade') fkStr += '->cascadeOnUpdate()';
          else if (onUpdate === 'restrict') fkStr += '->restrictOnUpdate()';

          fkStr += ';';
          lines.push(fkStr);
        }

        if (timestamps) {
          lines.push(dialect === 'postgresql' ? '$table->timestampsTz();' : '$table->timestamps();');
        }
        if (softDeletes) {
          lines.push(dialect === 'postgresql' ? '$table->softDeletesTz();' : '$table->softDeletes();');
        }

        const indentedLines = lines.map(l => `            ${l}`).join('\n');
        upBody = `        Schema::create('${tableName}', function (Blueprint $table) {\n${indentedLines}\n        });`;
        downBody = `        Schema::dropIfExists('${tableName}');`;
        break;
      }

      case 'drop_table': {
        description = `Drop table '${tableName}' with reversible schema restoration`;
        // Build restore lines for down()
        const restoreLines = [];
        if (pkType === 'uuid') {
          restoreLines.push(DialectManager.mapLaravelColumn('uuid', 'id', { primary: true }, dialect));
        } else if (pkType === 'ulid') {
          restoreLines.push(DialectManager.mapLaravelColumn('ulid', 'id', { primary: true }, dialect));
        } else {
          restoreLines.push('$table->id();');
        }
        for (const col of columns) {
          restoreLines.push(DialectManager.mapLaravelColumn(col.type || 'string', col.name, col, dialect));
        }
        if (timestamps) {
          restoreLines.push(dialect === 'postgresql' ? '$table->timestampsTz();' : '$table->timestamps();');
        }

        upBody = `        Schema::dropIfExists('${tableName}');`;
        downBody = `        Schema::create('${tableName}', function (Blueprint $table) {\n${restoreLines.map(l => `            ${l}`).join('\n')}\n        });`;
        break;
      }

      case 'add_columns': {
        description = `Add columns to table '${tableName}'`;
        const addLines = [];
        const dropCols = [];

        for (const col of columns) {
          addLines.push(DialectManager.mapLaravelColumn(col.type || 'string', col.name, col, dialect));
          dropCols.push(`'${col.name}'`);
        }

        const indentedAdd = addLines.map(l => `            ${l}`).join('\n');
        upBody = `        Schema::table('${tableName}', function (Blueprint $table) {\n${indentedAdd}\n        });`;
        downBody = `        Schema::table('${tableName}', function (Blueprint $table) {\n            $table->dropColumn([${dropCols.join(', ')}]);\n        });`;
        break;
      }

      case 'drop_columns': {
        description = `Safely drop columns from table '${tableName}' with typed rollback`;
        const dropCols = columns.map(c => `'${c.name}'`).join(', ');
        const restoreLines = [];

        for (const col of columns) {
          restoreLines.push(DialectManager.mapLaravelColumn(col.type || 'string', col.name, col, dialect));
        }

        const indentedRestore = restoreLines.map(l => `            ${l}`).join('\n');
        upBody = `        Schema::table('${tableName}', function (Blueprint $table) {\n            $table->dropColumn([${dropCols}]);\n        });`;
        downBody = `        Schema::table('${tableName}', function (Blueprint $table) {\n${indentedRestore}\n        });`;
        break;
      }

      case 'modify_column':
      case 'change_columns': {
        description = `Modify existing column(s) on table '${tableName}'`;
        const modifyLines = [];
        const revertLines = [];

        for (const col of columns) {
          if (dialect === 'postgresql' && col.using) {
            const targetType = col.type || 'varchar';
            const usingExpr = typeof col.using === 'string' ? col.using : `${col.name}::${targetType}`;
            modifyLines.push(`// PostgreSQL explicit cast to prevent conversion failures`);
            modifyLines.push(`DB::statement("ALTER TABLE ${tableName} ALTER COLUMN ${col.name} TYPE ${targetType} USING ${usingExpr};");`);
          } else {
            let line = DialectManager.mapLaravelColumn(col.type || 'string', col.name, col, dialect);
            // Strip semicolon and append ->change();
            line = line.replace(/;$/, '->change();');
            modifyLines.push(line);
          }

          if (col.previous_type || col.from_type) {
            const prevType = col.previous_type || col.from_type;
            if (dialect === 'postgresql' && col.using) {
              const revertUsing = col.revert_using || `${col.name}::${prevType}`;
              revertLines.push(`// PostgreSQL revert cast`);
              revertLines.push(`DB::statement("ALTER TABLE ${tableName} ALTER COLUMN ${col.name} TYPE ${prevType} USING ${revertUsing};");`);
            } else {
              const prevOptions = col.previous_options || { nullable: col.previous_nullable };
              let prevLine = DialectManager.mapLaravelColumn(prevType, col.name, prevOptions, dialect);
              prevLine = prevLine.replace(/;$/, '->change();');
              revertLines.push(prevLine);
            }
          } else {
            revertLines.push(`// Revert '${col.name}' definition here (requires previous column type)`);
          }
        }

        upBody = `        Schema::table('${tableName}', function (Blueprint $table) {\n${modifyLines.map(l => `            ${l}`).join('\n')}\n        });`;
        downBody = `        Schema::table('${tableName}', function (Blueprint $table) {\n${revertLines.map(l => `            ${l}`).join('\n')}\n        });`;
        break;
      }

      case 'rename_column': {
        const fromCol = params.from || params.old_name || params.old_column || 'old_col';
        const toCol = params.to || params.new_name || params.new_column || 'new_col';
        description = `Rename column '${fromCol}' to '${toCol}' on table '${tableName}'`;

        upBody = `        Schema::table('${tableName}', function (Blueprint $table) {\n            $table->renameColumn('${fromCol}', '${toCol}');\n        });`;
        downBody = `        Schema::table('${tableName}', function (Blueprint $table) {\n            $table->renameColumn('${toCol}', '${fromCol}');\n        });`;
        break;
      }

      case 'rename_table': {
        const fromTable = params.from || params.from_table || tableName;
        const toTable = params.to || params.to_table || params.new_table || 'new_table';
        description = `Rename table '${fromTable}' to '${toTable}'`;

        upBody = `        Schema::rename('${fromTable}', '${toTable}');`;
        downBody = `        Schema::rename('${toTable}', '${fromTable}');`;
        break;
      }

      case 'add_indexes': {
        description = `Add performance indexes to '${tableName}'`;
        const indexLines = [];
        const dropIndexLines = [];
        const isConcurrent = params.concurrent === true || dialect === 'postgresql' && indexes.some(i => i.concurrent === true);

        if (isConcurrent && dialect === 'postgresql') {
          requiresNoTransaction = true;
        }

        for (const idx of indexes) {
          const cols = Array.isArray(idx.columns) ? idx.columns : [idx.columns];
          const colsStr = cols.map(c => `'${c}'`).join(', ');
          const indexName = idx.name ? `'${idx.name}'` : null;

          if (isConcurrent && dialect === 'postgresql') {
            const rawIdxName = idx.name || `idx_${tableName}_${cols.join('_')}`;
            const whereClause = idx.where ? ` WHERE ${idx.where}` : '';
            indexLines.push(`DB::statement('CREATE INDEX CONCURRENTLY IF NOT EXISTS ${rawIdxName} ON ${tableName} (${cols.join(', ')})${whereClause};');`);
            dropIndexLines.push(`DB::statement('DROP INDEX CONCURRENTLY IF EXISTS ${rawIdxName};');`);
          } else {
            if (idx.where && dialect === 'postgresql') {
              const rawIdxName = idx.name || `idx_${tableName}_${cols.join('_')}`;
              indexLines.push(`DB::statement('CREATE INDEX IF NOT EXISTS ${rawIdxName} ON ${tableName} (${cols.join(', ')}) WHERE ${idx.where};');`);
              dropIndexLines.push(`DB::statement('DROP INDEX IF EXISTS ${rawIdxName};');`);
            } else if (idx.type === 'unique') {
              indexLines.push(indexName ? `$table->unique([${colsStr}], ${indexName});` : `$table->unique([${colsStr}]);`);
              dropIndexLines.push(indexName ? `$table->dropUnique(${indexName});` : `$table->dropUnique([${colsStr}]);`);
            } else if (idx.type === 'spatial') {
              indexLines.push(indexName ? `$table->spatialIndex([${colsStr}], ${indexName});` : `$table->spatialIndex([${colsStr}]);`);
              dropIndexLines.push(indexName ? `$table->dropSpatialIndex(${indexName});` : `$table->dropSpatialIndex([${colsStr}]);`);
            } else if (idx.type === 'fulltext') {
              indexLines.push(indexName ? `$table->fullText([${colsStr}], ${indexName});` : `$table->fullText([${colsStr}]);`);
              dropIndexLines.push(indexName ? `$table->dropFullText(${indexName});` : `$table->dropFullText([${colsStr}]);`);
            } else {
              indexLines.push(indexName ? `$table->index([${colsStr}], ${indexName});` : `$table->index([${colsStr}]);`);
              dropIndexLines.push(indexName ? `$table->dropIndex(${indexName});` : `$table->dropIndex([${colsStr}]);`);
            }
          }
        }

        if (isConcurrent && dialect === 'postgresql') {
          upBody = `        ${indexLines.join('\n        ')}`;
          downBody = `        ${dropIndexLines.join('\n        ')}`;
        } else {
          upBody = `        Schema::table('${tableName}', function (Blueprint $table) {\n${indexLines.map(l => `            ${l}`).join('\n')}\n        });`;
          downBody = `        Schema::table('${tableName}', function (Blueprint $table) {\n${dropIndexLines.map(l => `            ${l}`).join('\n')}\n        });`;
        }
        break;
      }

      case 'drop_indexes': {
        description = `Drop indexes from '${tableName}'`;
        const dropIndexLines = [];
        const restoreIndexLines = [];
        const isConcurrent = params.concurrent === true || (dialect === 'postgresql' && indexes.some(i => i.concurrent === true));

        if (isConcurrent && dialect === 'postgresql') {
          requiresNoTransaction = true;
        }

        for (const idx of indexes) {
          const cols = Array.isArray(idx.columns) ? idx.columns : [idx.columns];
          const colsStr = cols.map(c => `'${c}'`).join(', ');
          const indexName = idx.name ? `'${idx.name}'` : null;
          const rawIdxName = idx.name || `idx_${tableName}_${cols.join('_')}`;

          if (isConcurrent && dialect === 'postgresql') {
            dropIndexLines.push(`DB::statement('DROP INDEX CONCURRENTLY IF EXISTS ${rawIdxName};');`);
            restoreIndexLines.push(`DB::statement('CREATE INDEX CONCURRENTLY IF NOT EXISTS ${rawIdxName} ON ${tableName} (${cols.join(', ')});');`);
          } else {
            if (idx.type === 'unique') {
              dropIndexLines.push(indexName ? `$table->dropUnique(${indexName});` : `$table->dropUnique([${colsStr}]);`);
              restoreIndexLines.push(indexName ? `$table->unique([${colsStr}], ${indexName});` : `$table->unique([${colsStr}]);`);
            } else {
              dropIndexLines.push(indexName ? `$table->dropIndex(${indexName});` : `$table->dropIndex([${colsStr}]);`);
              restoreIndexLines.push(indexName ? `$table->index([${colsStr}], ${indexName});` : `$table->index([${colsStr}]);`);
            }
          }
        }

        if (isConcurrent && dialect === 'postgresql') {
          upBody = `        ${dropIndexLines.join('\n        ')}`;
          downBody = `        ${restoreIndexLines.join('\n        ')}`;
        } else {
          upBody = `        Schema::table('${tableName}', function (Blueprint $table) {\n${dropIndexLines.map(l => `            ${l}`).join('\n')}\n        });`;
          downBody = `        Schema::table('${tableName}', function (Blueprint $table) {\n${restoreIndexLines.map(l => `            ${l}`).join('\n')}\n        });`;
        }
        break;
      }

      case 'add_foreign_keys': {
        description = `Add foreign key constraint(s) to '${tableName}'`;
        const fkLines = [];
        const dropFkLines = [];

        for (const fk of foreignKeys) {
          const col = fk.column;
          const ref = fk.references || 'id';
          const onTable = fk.on || fk.references_table;
          let fkStr = `$table->foreign('${col}')->references('${ref}')->on('${onTable}')`;

          const onDelete = String(fk.on_delete || fk.onDelete || '').toLowerCase().replace(/[\s\-]/g, '_');
          if (onDelete === 'cascade') fkStr += '->cascadeOnDelete()';
          else if (onDelete === 'set_null') fkStr += '->nullOnDelete()';
          else if (onDelete === 'restrict') fkStr += '->restrictOnDelete()';

          fkStr += ';';
          fkLines.push(fkStr);
          dropFkLines.push(`$table->dropForeign(['${col}']);`);
        }

        upBody = `        Schema::table('${tableName}', function (Blueprint $table) {\n${fkLines.map(l => `            ${l}`).join('\n')}\n        });`;
        downBody = `        Schema::table('${tableName}', function (Blueprint $table) {\n${dropFkLines.map(l => `            ${l}`).join('\n')}\n        });`;
        break;
      }

      case 'drop_foreign_keys': {
        description = `Drop foreign key constraint(s) from '${tableName}'`;
        const dropFkLines = [];
        const restoreFkLines = [];

        for (const fk of foreignKeys) {
          const col = fk.column;
          const ref = fk.references || 'id';
          const onTable = fk.on || fk.references_table;
          dropFkLines.push(`$table->dropForeign(['${col}']);`);

          let fkStr = `$table->foreign('${col}')->references('${ref}')->on('${onTable}')`;
          const onDelete = String(fk.on_delete || fk.onDelete || '').toLowerCase().replace(/[\s\-]/g, '_');
          if (onDelete === 'cascade') fkStr += '->cascadeOnDelete()';
          else if (onDelete === 'set_null') fkStr += '->nullOnDelete()';
          else if (onDelete === 'restrict') fkStr += '->restrictOnDelete()';
          fkStr += ';';
          restoreFkLines.push(fkStr);
        }

        upBody = `        Schema::table('${tableName}', function (Blueprint $table) {\n${dropFkLines.map(l => `            ${l}`).join('\n')}\n        });`;
        downBody = `        Schema::table('${tableName}', function (Blueprint $table) {\n${restoreFkLines.map(l => `            ${l}`).join('\n')}\n        });`;
        break;
      }

      case 'raw_sql': {
        description = `Execute raw DDL statement on '${tableName}'`;
        const sqlUp = params.sql_up || params.up || '-- Raw SQL Up';
        const sqlDown = params.sql_down || params.down || '-- Raw SQL Down';

        if (/CONCURRENTLY/i.test(sqlUp) && dialect === 'postgresql') {
          requiresNoTransaction = true;
        }

        upBody = `        DB::statement(<<<SQL\n${sqlUp}\nSQL\n        );`;
        downBody = `        DB::statement(<<<SQL\n${sqlDown}\nSQL\n        );`;
        break;
      }

      default:
        throw new Error(`Unsupported migration operation: ${operation}. Available: create_table, drop_table, add_columns, drop_columns, modify_column, rename_column, rename_table, add_indexes, drop_indexes, add_foreign_keys, drop_foreign_keys, raw_sql`);
    }

    const transactionProperty = requiresNoTransaction
      ? `\n    /**\n     * Disable transactional wrapping for concurrent DDL (required in PostgreSQL).\n     */\n    public bool $withinTransaction = false;\n`
      : '';

    const phpCode = `<?php

declare(strict_types=1);

use Illuminate\\Database\\Migrations\\Migration;
use Illuminate\\Database\\Schema\\Blueprint;
use Illuminate\\Support\\Facades\\DB;
use Illuminate\\Support\\Facades\\Schema;

return new class extends Migration
{${transactionProperty}
    /**
     * Run the migrations.
     */
    public function up(): void
    {
${upBody}
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
${downBody}
    }
};
`;

    const migrateCmd = isTenant
      ? 'php artisan tenants:artisan "migrate"'
      : 'php artisan migrate';

    const rollbackCmd = isTenant
      ? 'php artisan tenants:artisan "migrate:rollback"'
      : 'php artisan migrate:rollback';

    return {
      description,
      scope,
      database_type: dialect,
      target_path: targetPath,
      php_code: phpCode,
      migration_code: phpCode,
      within_transaction: !requiresNoTransaction,
      artisan_command: migrateCmd,
      artisan_commands: {
        run: migrateCmd,
        rollback: rollbackCmd,
        status: isTenant ? 'php artisan tenants:artisan "migrate:status"' : 'php artisan migrate:status'
      }
    };
  }
}

export default MigrationEngine;
