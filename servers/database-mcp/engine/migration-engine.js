import { DialectManager } from './dialect-manager.js';

/**
 * Enterprise Laravel Reversible Migration Generator
 * Generates production-ready, reversible Laravel Anonymous Migrations for Standard & Multi-Tenant Scopes.
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
    const isTenant = scope === 'tenant' || params.is_tenant === true;
    const pkType = params.primary_key || params.primary_key_type || 'id';

    const columns = params.columns || [];
    const indexes = params.indexes || [];
    const foreignKeys = params.foreign_keys || [];
    const timestamps = params.timestamps !== false;
    const softDeletes = params.soft_deletes === true;

    let upBody = '';
    let downBody = '';
    let description = '';

    const timestampPrefix = this.formatTimestamp();
    const filename = `${timestampPrefix}_${operation}_${tableName}.php`;
    const targetDir = isTenant ? 'database/migrations/tenant' : 'database/migrations';
    const targetPath = `${targetDir}/${filename}`;

    switch (operation) {
      case 'create_table': {
        description = `Create table '${tableName}' (${dialect.toUpperCase()} - ${isTenant ? 'Tenant' : 'Standard'} Scope)`;
        const lines = [];

        // Primary Key handling
        if (pkType === 'uuid') {
          lines.push(DialectManager.mapLaravelColumn('uuid', 'id', { primary: true }, dialect));
        } else if (pkType === 'ulid') {
          lines.push(DialectManager.mapLaravelColumn('ulid', 'id', { primary: true }, dialect));
        } else {
          lines.push('$table->id();');
        }

        // Tenant ID if tenant table in single-database tenancy
        if (params.include_tenant_id) {
          lines.push('$table->unsignedBigInteger(\'tenant_id\')->index();');
        }

        // Custom columns
        for (const col of columns) {
          lines.push(DialectManager.mapLaravelColumn(col.type || 'string', col.name, col, dialect));
        }

        // Indexes
        for (const idx of indexes) {
          if (Array.isArray(idx.columns)) {
            const colsStr = idx.columns.map(c => `'${c}'`).join(', ');
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
          let line = DialectManager.mapLaravelColumn(col.type || 'string', col.name, col, dialect);
          // Strip semicolon and append ->change();
          line = line.replace(/;$/, '->change();');
          modifyLines.push(line);

          if (col.previous_type || col.from_type) {
            const prevOptions = col.previous_options || { nullable: col.previous_nullable };
            let prevLine = DialectManager.mapLaravelColumn(col.previous_type || col.from_type, col.name, prevOptions, dialect);
            prevLine = prevLine.replace(/;$/, '->change();');
            revertLines.push(prevLine);
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

        for (const idx of indexes) {
          const cols = Array.isArray(idx.columns) ? idx.columns : [idx.columns];
          const colsStr = cols.map(c => `'${c}'`).join(', ');
          const indexName = idx.name ? `'${idx.name}'` : null;

          if (idx.type === 'unique') {
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

        upBody = `        Schema::table('${tableName}', function (Blueprint $table) {\n${indexLines.map(l => `            ${l}`).join('\n')}\n        });`;
        downBody = `        Schema::table('${tableName}', function (Blueprint $table) {\n${dropIndexLines.map(l => `            ${l}`).join('\n')}\n        });`;
        break;
      }

      case 'drop_indexes': {
        description = `Drop indexes from '${tableName}'`;
        const dropIndexLines = [];
        const restoreIndexLines = [];

        for (const idx of indexes) {
          const cols = Array.isArray(idx.columns) ? idx.columns : [idx.columns];
          const colsStr = cols.map(c => `'${c}'`).join(', ');
          const indexName = idx.name ? `'${idx.name}'` : null;

          if (idx.type === 'unique') {
            dropIndexLines.push(indexName ? `$table->dropUnique(${indexName});` : `$table->dropUnique([${colsStr}]);`);
            restoreIndexLines.push(indexName ? `$table->unique([${colsStr}], ${indexName});` : `$table->unique([${colsStr}]);`);
          } else {
            dropIndexLines.push(indexName ? `$table->dropIndex(${indexName});` : `$table->dropIndex([${colsStr}]);`);
            restoreIndexLines.push(indexName ? `$table->index([${colsStr}], ${indexName});` : `$table->index([${colsStr}]);`);
          }
        }

        upBody = `        Schema::table('${tableName}', function (Blueprint $table) {\n${dropIndexLines.map(l => `            ${l}`).join('\n')}\n        });`;
        downBody = `        Schema::table('${tableName}', function (Blueprint $table) {\n${restoreIndexLines.map(l => `            ${l}`).join('\n')}\n        });`;
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

        upBody = `        DB::statement(<<<SQL\n${sqlUp}\nSQL\n        );`;
        downBody = `        DB::statement(<<<SQL\n${sqlDown}\nSQL\n        );`;
        break;
      }

      default:
        throw new Error(`Unsupported migration operation: ${operation}. Available: create_table, add_columns, drop_columns, modify_column, rename_column, rename_table, add_indexes, drop_indexes, add_foreign_keys, drop_foreign_keys, raw_sql`);
    }

    const phpCode = `<?php

declare(strict_types=1);

use Illuminate\\Database\\Migrations\\Migration;
use Illuminate\\Database\\Schema\\Blueprint;
use Illuminate\\Support\\Facades\\DB;
use Illuminate\\Support\\Facades\\Schema;

return new class extends Migration
{
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
