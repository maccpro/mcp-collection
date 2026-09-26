import { DialectManager } from './dialect-manager.js';

/**
 * Enterprise Laravel Reversible Migration Generator
 * Generates production-ready, reversible Laravel Anonymous Migrations for Standard & Multi-Tenant Scopes.
 */
export class MigrationEngine {
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

    const timestampPrefix = new Date().toISOString().replace(/[-:T]/g, '_').slice(0, 19).replace('__', '_');
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
            if (idx.type === 'unique') {
              lines.push(`$table->unique([${colsStr}]);`);
            } else {
              lines.push(`$table->index([${colsStr}]);`);
            }
          }
        }

        // Foreign Keys
        for (const fk of foreignKeys) {
          let fkStr = `$table->foreign('${fk.column}')->references('${fk.references || 'id'}')->on('${fk.on}')`;
          if (fk.on_delete === 'cascade') fkStr += '->cascadeOnDelete()';
          else if (fk.on_delete === 'set_null') fkStr += '->nullOnDelete()';
          else if (fk.on_delete === 'restrict') fkStr += '->restrictOnDelete()';
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
          } else {
            indexLines.push(indexName ? `$table->index([${colsStr}], ${indexName});` : `$table->index([${colsStr}]);`);
            dropIndexLines.push(indexName ? `$table->dropIndex(${indexName});` : `$table->dropIndex([${colsStr}]);`);
          }
        }

        upBody = `        Schema::table('${tableName}', function (Blueprint $table) {\n${indexLines.map(l => `            ${l}`).join('\n')}\n        });`;
        downBody = `        Schema::table('${tableName}', function (Blueprint $table) {\n${dropIndexLines.map(l => `            ${l}`).join('\n')}\n        });`;
        break;
      }

      default:
        throw new Error(`Unsupported migration operation: ${operation}. Available: create_table, add_columns, drop_columns, add_indexes`);
    }

    const phpCode = `<?php

declare(strict_types=1);

use Illuminate\\Database\\Migrations\\Migration;
use Illuminate\\Database\\Schema\\Blueprint;
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
