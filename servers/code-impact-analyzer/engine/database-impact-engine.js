/**
 * @file database-impact-engine.js
 * @description Analyzes the ripple effect of database table/column mutations
 * across Eloquent Models, Form Requests, Repositories, Services, and Views.
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
   * @returns {Object} Database blast radius report
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

    const totalAffectedFiles = (
      affected.models.length +
      affected.form_requests.length +
      affected.repositories_and_services.length +
      affected.factories_and_seeders.length +
      affected.views.length
    );

    let riskLevel = 'LOW';
    if (operation === 'drop_column' || operation === 'drop_table') {
      riskLevel = totalAffectedFiles > 5 ? 'CRITICAL' : 'HIGH';
    } else if (totalAffectedFiles > 10) {
      riskLevel = 'HIGH';
    } else if (totalAffectedFiles > 3) {
      riskLevel = 'MEDIUM';
    }

    const warnings = [];
    if (affected.form_requests.length > 0 && (operation === 'drop_column' || operation === 'rename_column')) {
      warnings.push(`Form Requests are validating '${column}'. Dropping it will cause validation errors.`);
    }
    if (affected.repositories_and_services.length > 0 && operation === 'drop_column') {
      warnings.push(`Services and Repositories are actively querying '${column}'. SQL exceptions will occur if dropped without refactoring.`);
    }

    return {
      success: true,
      table,
      column,
      operation,
      risk_level: riskLevel,
      total_affected_files: totalAffectedFiles,
      affected_components: affected,
      warnings,
      safe_remediation_steps: this._getRemediationSteps(operation, table, column)
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
   * Safe migration remediation recipe
   */
  static _getRemediationSteps(op, table, column) {
    if (op === 'drop_column') {
      return [
        `1. Hide/deprecate '${column}' in the Eloquent model using protected $hidden = ['${column}'];`,
        `2. Remove validation rules in Form Requests referring to '${column}'.`,
        `3. Deploy code first, and ensure no running workers or queries touch '${column}'.`,
        `4. Execute reversible Laravel migration: $table->dropColumn('${column}'); with typed down() recreation.`
      ];
    }
    return [
      `1. Perform expand-contract migration: add new column as nullable first.`,
      `2. Backfill historical data in batches using chunkById().`,
      `3. Switch application queries to use the updated column.`,
      `4. Deprecate and drop old column.`
    ];
  }
}

export default DatabaseImpactEngine;
