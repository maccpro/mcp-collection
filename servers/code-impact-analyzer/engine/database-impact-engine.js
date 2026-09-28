/**
 * @file database-impact-engine.js
 * @description Advanced Relational Database Impact Engine for Laravel & SQL Systems.
 * Analyzes the ripple effect of database table/column mutations across Foreign Key cascades,
 * composite indexes, Eloquent relationships, Form Requests, Repositories, and multi-tenant boundaries.
 */

import fs from 'node:fs';
import path from 'node:path';
import { ASTClassClassifier } from './ast-class-classifier.js';

export class DatabaseImpactEngine {
  /**
   * Analyze the impact of a database column or table change.
   * @param {Object} params
   * @param {string} params.table - Table name (e.g. 'users', 'invoices', 'orders')
   * @param {string} [params.column] - Column name being altered or dropped (e.g. 'status', 'amount')
   * @param {string} [params.operation='modify_column'] - 'drop_column' | 'rename_column' | 'modify_column' | 'drop_table'
   * @param {string} [params.repo_path] - Root directory to scan
   * @returns {Object} Database blast radius report with relational foreign keys and index impact
   */
  static analyze(params) {
    const {
      table,
      column = null,
      operation = 'modify_column',
      repo_path = process.cwd()
    } = params;

    if (!table) {
      throw new Error('Table name is required for database impact analysis.');
    }

    const affected = {
      models: [],
      form_requests: [],
      repositories_and_services: [],
      factories_and_seeders: [],
      views: []
    };

    const searchTokens = [];
    if (column) {
      searchTokens.push(`'${column}'`);
      searchTokens.push(`"${column}"`);
      searchTokens.push(`->${column}`);
      searchTokens.push(`where('${column}'`);
      searchTokens.push(`where("${column}"`);
      searchTokens.push(`orderBy('${column}'`);
      searchTokens.push(`pluck('${column}'`);
    } else {
      searchTokens.push(`'${table}'`);
      searchTokens.push(`"${table}"`);
      searchTokens.push(`from('${table}'`);
    }

    this._scanAppDirectory(repo_path, searchTokens, affected);

    // 1. Relational Foreign Key Cascades Discovery
    const foreignKeys = this._discoverForeignKeys(repo_path, table, column);

    // 2. Coupled Eloquent Model Relationships
    const modelRelations = this._discoverCoupledModelRelations(repo_path, table, column);

    // 3. Composite Index Impact
    const indexImpacts = column ? this._discoverIndexImpact(repo_path, table, column) : [];

    // 4. Multi-Tenant Migration Separation Audit
    const tenantCompliance = this._auditTenantMigrationPlacement(repo_path, table);

    const totalAffectedFiles = (
      affected.models.length +
      affected.form_requests.length +
      affected.repositories_and_services.length +
      affected.factories_and_seeders.length +
      affected.views.length +
      foreignKeys.length
    );

    let riskLevel = 'LOW';
    if (operation === 'drop_column' || operation === 'drop_table') {
      riskLevel = (totalAffectedFiles > 5 || foreignKeys.length > 0) ? 'CRITICAL' : 'HIGH';
    } else if (totalAffectedFiles > 10 || foreignKeys.length > 2) {
      riskLevel = 'HIGH';
    } else if (totalAffectedFiles > 3) {
      riskLevel = 'MEDIUM';
    }

    const warnings = [];
    if (affected.form_requests.length > 0 && (operation === 'drop_column' || operation === 'rename_column')) {
      warnings.push(`Form Requests are validating '${column}'. Dropping or renaming it will cause validation errors.`);
    }
    if (affected.repositories_and_services.length > 0 && operation === 'drop_column') {
      warnings.push(`Services and Repositories are actively querying '${column}'. SQL exceptions will occur if dropped without refactoring.`);
    }
    if (foreignKeys.length > 0) {
      warnings.push(`Foreign key constraint cascade: ${foreignKeys.length} table(s) hold foreign keys referencing '${table}${column ? '.' + column : ''}'. Dropping will cause foreign key constraint violations.`);
    }
    if (indexImpacts.length > 0) {
      warnings.push(`Column '${column}' is referenced in ${indexImpacts.length} database index(es). Alteration will trigger index rebuild or invalidation.`);
    }
    if (tenantCompliance.warning) {
      warnings.push(tenantCompliance.warning);
    }

    return {
      success: true,
      table,
      column,
      operation,
      risk_level: riskLevel,
      total_affected_files: totalAffectedFiles,
      affected_components: affected,
      dependent_foreign_keys: foreignKeys,
      coupled_model_relations: modelRelations,
      index_blast_radius: indexImpacts,
      tenant_compliance: tenantCompliance,
      warnings,
      safe_remediation_steps: this._getRemediationSteps(operation, table, column, foreignKeys)
    };
  }

  /**
   * Scan directories for column references
   */
  static _scanAppDirectory(repoPath, tokens, affected) {
    function walkAndSearch(dir) {
      if (!fs.existsSync(dir)) return;
      const entries = fs.readdirSync(dir, { withFileTypes: true });

      for (const entry of entries) {
        if (['vendor', 'node_modules', 'storage', '.git'].includes(entry.name)) continue;

        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          walkAndSearch(fullPath);
        } else if (entry.isFile()) {
          const relPath = path.relative(repoPath, fullPath).replace(/\\/g, '/');

          if (!relPath.endsWith('.php') && !relPath.endsWith('.blade.php') && !relPath.endsWith('.vue')) continue;

          try {
            const content = fs.readFileSync(fullPath, 'utf8');
            const matchedToken = tokens.find(t => content.includes(t));

            if (matchedToken) {
              const fileObj = {
                file: relPath,
                matched_expression: matchedToken
              };

              const ast = ASTClassClassifier.classify(content, relPath);

              if (ast.category === 'model' || relPath.includes('/Models/')) {
                affected.models.push(fileObj);
              } else if (ast.category === 'form_request' || relPath.includes('/Requests/')) {
                affected.form_requests.push(fileObj);
              } else if (ast.category === 'service' || ast.category === 'repository' || ast.category === 'action' || relPath.includes('/Services/') || relPath.includes('/Repositories/') || relPath.includes('/Actions/')) {
                affected.repositories_and_services.push(fileObj);
              } else if (relPath.includes('/factories/') || relPath.includes('/seeders/') || content.includes('extends Factory') || content.includes('extends Seeder')) {
                affected.factories_and_seeders.push(fileObj);
              } else if (relPath.endsWith('.blade.php') || relPath.endsWith('.vue') || relPath.includes('/views/') || relPath.includes('/resources/')) {
                affected.views.push(fileObj);
              } else {
                affected.repositories_and_services.push(fileObj);
              }
            }
          } catch (e) {
            // Skip
          }
        }
      }
    }

    walkAndSearch(repoPath);
  }

  /**
   * Discover Foreign Key constraints across migrations referencing table or column
   */
  static _discoverForeignKeys(repoPath, targetTable, targetColumn) {
    const foreignKeys = [];
    const migrationDirs = [
      path.join(repoPath, 'database', 'migrations'),
      path.join(repoPath, 'database', 'migrations', 'tenant'),
      path.join(repoPath, 'database', 'migrations', 'tenants')
    ];

    // Conventional FK column name: table singular + '_id' (e.g. users -> user_id)
    const singular = targetTable.endsWith('s') ? targetTable.slice(0, -1) : targetTable;
    const conventionalFkColumn = `${singular}_id`;

    for (const mDir of migrationDirs) {
      if (!fs.existsSync(mDir)) continue;
      const files = fs.readdirSync(mDir);

      for (const file of files) {
        if (!file.endsWith('.php')) continue;
        const fullPath = path.join(mDir, file);
        try {
          const content = fs.readFileSync(fullPath, 'utf8');

          // Check 1: $table->foreignId('user_id')->constrained('users') or constrained()
          const constrainedRegex = new RegExp(`foreignId\\s*\\(\\s*['"]([^'"]+)['"]\\s*\\)(?:->constrained\\s*\\(\\s*(?:['"]${targetTable}['"])?\\s*\\))?`, 'g');
          let m;
          while ((m = constrainedRegex.exec(content)) !== null) {
            const fkCol = m[1];
            if (fkCol === conventionalFkColumn || (content.includes(`constrained('${targetTable}')`) || content.includes(`constrained("${targetTable}")`))) {
              foreignKeys.push({
                migration_file: file,
                referencing_column: fkCol,
                referenced_table: targetTable,
                referenced_column: targetColumn || 'id',
                type: 'foreignId_constrained'
              });
            }
          }

          // Check 2: $table->foreign('customer_id')->references('id')->on('users')
          const explicitFkRegex = new RegExp(`foreign\\s*\\(\\s*['"]([^'"]+)['"]\\s*\\)->references\\s*\\(\\s*['"]([^'"]+)['"]\\s*\\)->on\\s*\\(\\s*['"]${targetTable}['"]`, 'g');
          while ((m = explicitFkRegex.exec(content)) !== null) {
            foreignKeys.push({
              migration_file: file,
              referencing_column: m[1],
              referenced_table: targetTable,
              referenced_column: m[2],
              type: 'explicit_foreign_key'
            });
          }
        } catch (e) {
          // Continue
        }
      }
    }

    return foreignKeys;
  }

  /**
   * Discover Eloquent Model relationships coupling to target table
   */
  static _discoverCoupledModelRelations(repoPath, targetTable, targetColumn) {
    const relations = [];
    const modelsDir = path.join(repoPath, 'app', 'Models');
    if (!fs.existsSync(modelsDir)) return relations;

    const singular = targetTable.endsWith('s') ? targetTable.slice(0, -1) : targetTable;
    const modelName = singular.charAt(0).toUpperCase() + singular.slice(1);

    try {
      const files = fs.readdirSync(modelsDir);
      for (const file of files) {
        if (!file.endsWith('.php')) continue;
        const content = fs.readFileSync(path.join(modelsDir, file), 'utf8');

        // Match belongsTo(TargetModel::class) or hasMany(TargetModel::class)
        const relRegex = new RegExp(`public\\s+function\\s+([a-zA-Z0-9_]+)\\s*\\([^)]*\\)[^{]*\\{[^}]*(belongsTo|hasMany|hasOne|belongsToMany)\\s*\\(\\s*${modelName}::class`, 'g');
        let m;
        while ((m = relRegex.exec(content)) !== null) {
          relations.push({
            model: file.replace('.php', ''),
            relation_method: m[1],
            relation_type: m[2],
            target_model: modelName
          });
        }
      }
    } catch (e) {
      // Continue
    }

    return relations;
  }

  /**
   * Discover if column is part of single or composite index
   */
  static _discoverIndexImpact(repoPath, targetTable, targetColumn) {
    const indexes = [];
    const migrationDir = path.join(repoPath, 'database', 'migrations');
    if (!fs.existsSync(migrationDir)) return indexes;

    try {
      const files = fs.readdirSync(migrationDir);
      for (const file of files) {
        if (!file.endsWith('.php')) continue;
        const content = fs.readFileSync(path.join(migrationDir, file), 'utf8');

        // Check index(['col1', 'col2'])
        const compositeRegex = new RegExp(`\\$table->(index|unique|primary)\\s*\\(\\s*\\[([^\\]]+)\\]`, 'g');
        let m;
        while ((m = compositeRegex.exec(content)) !== null) {
          if (m[2].includes(`'${targetColumn}'`) || m[2].includes(`"${targetColumn}"`)) {
            indexes.push({
              index_type: m[1],
              is_composite: true,
              columns_in_index: m[2].replace(/['"\s]/g, '').split(','),
              migration: file
            });
          }
        }
      }
    } catch (e) {
      // Continue
    }

    return indexes;
  }

  /**
   * Check if tenant-aware tables conform to Rule 7 (tenant migration directory)
   */
  static _auditTenantMigrationPlacement(repoPath, targetTable) {
    const isTenantTable = ['tenants', 'tenant_users', 'domains'].includes(targetTable) ||
                          targetTable.includes('tenant');

    if (isTenantTable) {
      const tenantDirExists = fs.existsSync(path.join(repoPath, 'database', 'migrations', 'tenant')) ||
                              fs.existsSync(path.join(repoPath, 'database', 'migrations', 'tenants'));
      return {
        is_tenant_table: true,
        tenant_migration_directory_configured: tenantDirExists,
        warning: tenantDirExists ? null : `Table '${targetTable}' is tenant-aware. Ensure schema modifications follow project tenant migration governance (e.g. database/migrations/tenant/).`
      };
    }

    return { is_tenant_table: false, warning: null };
  }

  /**
   * Safe migration remediation recipe
   */
  static _getRemediationSteps(op, table, column, foreignKeys = []) {
    const steps = [];

    if (foreignKeys.length > 0) {
      steps.push(`0. Drop dependent foreign key constraints first on: ${foreignKeys.map(fk => fk.referencing_column).join(', ')}.`);
    }

    if (op === 'drop_column') {
      steps.push(
        `1. Hide/deprecate '${column}' in the Eloquent model using protected $hidden = ['${column}'];`,
        `2. Remove validation rules in Form Requests referring to '${column}'.`,
        `3. Deploy code first, and ensure no running workers or queries touch '${column}'.`,
        `4. Execute reversible Laravel migration: $table->dropColumn('${column}'); with typed down() recreation.`
      );
    } else {
      steps.push(
        `1. Perform expand-contract migration: add new column as nullable first.`,
        `2. Backfill historical data in batches using chunkById().`,
        `3. Switch application queries to use the updated column.`,
        `4. Deprecate and drop old column in a later release.`
      );
    }

    return steps;
  }
}

export default DatabaseImpactEngine;
