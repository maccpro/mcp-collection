/**
 * @file dynamic-hazard-evaluator.js
 * @description Dynamic runtime hazard evaluator for code diffs and semantic changes.
 * Evaluates in-flight queue serialization hazards, multi-tenant isolation leaks,
 * long-running DB transaction locks with external I/O, and destructive data mutations.
 */

import { ASTClassClassifier } from './ast-class-classifier.js';

export class DynamicHazardEvaluator {
  /**
   * Evaluate runtime and architectural hazards on modified files and diffs.
   * @param {Array<Object>} modifiedFiles - Array of file diff objects with filePath, oldContent, newContent, diff
   * @param {Object} [options] - Evaluation thresholds and config
   * @returns {Object} Hazard evaluation report
   */
  static evaluateHazards(modifiedFiles = [], options = {}) {
    const hazards = [];

    for (const file of modifiedFiles) {
      const { filePath = '', oldContent = '', newContent = '', diff = '' } = file;
      const astNew = ASTClassClassifier.classify(newContent, filePath);
      const astOld = ASTClassClassifier.classify(oldContent, filePath);

      // 1. In-Flight Queue Deserialization Hazard
      const queueHazard = this._detectQueueSerializationHazard(filePath, oldContent, newContent, astOld, astNew);
      if (queueHazard) hazards.push(queueHazard);

      // 2. Multi-Tenant Data Leak Hazard
      const tenantHazard = this._detectTenantIsolationHazard(filePath, newContent, diff, astNew);
      if (tenantHazard) hazards.push(tenantHazard);

      // 3. DB Transaction with External Network / I/O Hazard
      const txHazard = this._detectTransactionIOHazard(filePath, newContent, diff);
      if (txHazard) hazards.push(txHazard);

      // 4. Raw Query / Unescaped SQL Hazard
      const sqlHazard = this._detectRawQueryHazard(filePath, newContent, diff);
      if (sqlHazard) hazards.push(sqlHazard);

      // 5. Missing Migration Down Method Hazard
      if (astNew.category === 'migration') {
        const migrationHazard = this._detectMigrationSafetyHazard(filePath, newContent);
        if (migrationHazard) hazards.push(migrationHazard);
      }
    }

    const criticalCount = hazards.filter(h => h.severity === 'CRITICAL').length;
    const highCount = hazards.filter(h => h.severity === 'HIGH').length;
    const mediumCount = hazards.filter(h => h.severity === 'MEDIUM').length;

    let overallRisk = 'LOW';
    if (criticalCount > 0) {
      overallRisk = 'CRITICAL';
    } else if (highCount > 0) {
      overallRisk = 'HIGH';
    } else if (mediumCount > 0) {
      overallRisk = 'MEDIUM';
    }

    return {
      risk_level: overallRisk,
      total_hazards: hazards.length,
      critical_hazards: criticalCount,
      high_hazards: highCount,
      medium_hazards: mediumCount,
      hazards,
      summary: this._generateSummary(overallRisk, hazards)
    };
  }

  /**
   * Detect in-flight queue serialization hazards
   */
  static _detectQueueSerializationHazard(filePath, oldContent, newContent, astOld, astNew) {
    if (!astNew.is_async_queue && !astOld.is_async_queue) return null;

    // Extract constructor parameters from old and new
    const oldCtor = this._extractConstructorParams(oldContent);
    const newCtor = this._extractConstructorParams(newContent);

    // If new parameters added without default values, or existing parameters removed/reordered
    const paramChanged = this._compareConstructorParams(oldCtor, newCtor);
    if (paramChanged.has_breaking_change) {
      return {
        type: 'QUEUE_DESERIALIZATION_BREAK',
        severity: 'CRITICAL',
        file: filePath,
        title: 'In-Flight Queue Deserialization Mismatch',
        description: `Modified constructor signatures or serialized properties in queued job (${astNew.category}). In-flight queue workers will throw fatal Unserialize / ReflectionException upon processing older payloads.`,
        details: paramChanged.details,
        remediation: 'Deploy queue workers with dual-signature support, flush pending queue safely, or provide default parameter values ($param = null).'
      };
    }

    return null;
  }

  /**
   * Detect multi-tenant isolation leaks
   */
  static _detectTenantIsolationHazard(filePath, newContent, diff, ast) {
    const suspiciousPatterns = [
      { pattern: /withoutGlobalScope\s*\(\s*['"]tenant/i, reason: 'Explicit tenant global scope bypass' },
      { pattern: /withoutGlobalScopes\s*\(\s*\)/, reason: 'All global scopes bypassed including tenant isolation' },
      { pattern: /DB::table\s*\(\s*['"][a-zA-Z0-9_]+['"]\s*\)(?!.*tenant_id)/, reason: 'Direct raw DB query bypassing Eloquent multi-tenant model scope' }
    ];

    for (const p of suspiciousPatterns) {
      if (p.pattern.test(diff) || p.pattern.test(newContent)) {
        return {
          type: 'TENANT_ISOLATION_LEAK',
          severity: 'CRITICAL',
          file: filePath,
          title: 'Cross-Tenant Isolation Breach Risk',
          description: `Detected query construct bypassing tenant scoping: ${p.reason}. This could cause cross-tenant data leakage in multi-tenant SaaS environments.`,
          remediation: 'Ensure queries retain tenant scoping or explicitly bind tenant_id in conditions.'
        };
      }
    }

    return null;
  }

  /**
   * Detect external I/O inside DB::transaction
   */
  static _detectTransactionIOHazard(filePath, newContent, diff) {
    // Check if file uses DB::transaction
    const txMatch = newContent.match(/DB::transaction\s*\(\s*function\s*\([^)]*\)\s*\{([^}]+)\}/s) ||
                    newContent.match(/DB::beginTransaction\s*\(\s*\)([\s\S]+?)DB::commit\s*\(\s*\)/s);

    if (!txMatch) return null;

    const txBlock = txMatch[1];
    const ioPatterns = [
      { regex: /Http::(post|get|put|delete|patch|send)/, name: 'Laravel Http Client call' },
      { regex: /curl_exec\s*\(/, name: 'Native cURL network request' },
      { regex: /Mail::(to|send|queue)/, name: 'Synchronous Mail transport' },
      { regex: /Notification::send/, name: 'Notification dispatch' },
      { regex: /file_get_contents\s*\(\s*['"]http/, name: 'Remote URL fetch' }
    ];

    for (const io of ioPatterns) {
      if (io.regex.test(txBlock)) {
        return {
          type: 'TRANSACTION_HOLD_NETWORK_IO',
          severity: 'HIGH',
          file: filePath,
          title: 'Long-Running DB Lock with External Network I/O',
          description: `Detected ${io.name} executed inside an active database transaction. Remote network latency or API timeouts will hold DB row locks open, resulting in table contention and connection pool exhaustion.`,
          remediation: 'Move network calls, payment gateway APIs, and email dispatches outside the DB::transaction block or dispatch via deferred queue jobs.'
        };
      }
    }

    return null;
  }

  /**
   * Detect raw unescaped SQL
   */
  static _detectRawQueryHazard(filePath, newContent, diff) {
    const rawPatterns = [
      /DB::raw\s*\(\s*["'].*\$[a-zA-Z0-9_]+.*["']\s*\)/,
      /whereRaw\s*\(\s*["'].*\$[a-zA-Z0-9_]+.*["']\s*\)/
    ];

    for (const pat of rawPatterns) {
      if (pat.test(diff) || pat.test(newContent)) {
        return {
          type: 'RAW_SQL_INJECTION_RISK',
          severity: 'HIGH',
          file: filePath,
          title: 'Potential SQL Injection in Raw Expression',
          description: 'Interpolated PHP variable found directly inside DB::raw or whereRaw statement without parameterized bindings.',
          remediation: 'Always use parameterized bindings: DB::raw("column = ?", [$value]) or whereRaw("column = ?", [$value]).'
        };
      }
    }

    return null;
  }

  /**
   * Detect migration safety hazards
   */
  static _detectMigrationSafetyHazard(filePath, newContent) {
    const hasDown = /public\s+function\s+down\s*\(\s*\)/.test(newContent);
    const dropsData = /dropColumn|dropTable|drop\s*\(/i.test(newContent);

    if (!hasDown) {
      return {
        type: 'IRREVERSIBLE_MIGRATION',
        severity: 'MEDIUM',
        file: filePath,
        title: 'Missing down() Rollback Method in Migration',
        description: 'Migration file does not implement down() method, preventing automated deployment rollbacks.',
        remediation: 'Implement a symmetric down() method to ensure safe rollbacks in production.'
      };
    }

    if (dropsData && !newContent.includes('// zero-downtime')) {
      return {
        type: 'DESTRUCTIVE_COLUMN_DROP',
        severity: 'HIGH',
        file: filePath,
        title: 'Destructive Column or Table Drop in Migration',
        description: 'Migration drops columns or tables directly. In a zero-downtime deployment, running application nodes querying old columns will crash.',
        remediation: 'Follow the Expand and Contract pattern: deprecate column first, deploy application update, and drop column in a later release.'
      };
    }

    return null;
  }

  /**
   * Helper to extract constructor parameter tokens
   */
  static _extractConstructorParams(content) {
    const match = content.match(/public\s+function\s+__construct\s*\(([^)]*)\)/);
    if (!match || !match[1]) return [];

    return match[1].split(',').map(p => {
      const trimmed = p.trim();
      const hasDefault = trimmed.includes('=');
      const varMatch = trimmed.match(/\$([a-zA-Z0-9_]+)/);
      return {
        raw: trimmed,
        name: varMatch ? varMatch[1] : '',
        hasDefault
      };
    }).filter(p => p.name !== '');
  }

  /**
   * Helper to compare constructor parameters for breaking changes
   */
  static _compareConstructorParams(oldParams, newParams) {
    if (oldParams.length === 0 && newParams.length === 0) {
      return { has_breaking_change: false };
    }

    // Check if new parameters without default were added
    if (newParams.length > oldParams.length) {
      const added = newParams.slice(oldParams.length);
      const nonDefaultAdded = added.filter(p => !p.hasDefault);
      if (nonDefaultAdded.length > 0) {
        return {
          has_breaking_change: true,
          details: `Added new constructor parameter(s) [${nonDefaultAdded.map(p => '$' + p.name).join(', ')}] without default values.`
        };
      }
    }

    // Check if old parameters removed
    const newNames = new Set(newParams.map(p => p.name));
    const removed = oldParams.filter(p => !newNames.has(p.name));
    if (removed.length > 0) {
      return {
        has_breaking_change: true,
        details: `Removed constructor parameter(s) [${removed.map(p => '$' + p.name).join(', ')}].`
      };
    }

    return { has_breaking_change: false };
  }

  static _generateSummary(riskLevel, hazards) {
    if (hazards.length === 0) {
      return 'No architectural or runtime hazards detected in evaluated modifications.';
    }
    return `Evaluated with ${riskLevel} risk level. Detected ${hazards.length} hazard(s) across runtime serialization, transaction locks, and schema safety.`;
  }
}

export default DynamicHazardEvaluator;
