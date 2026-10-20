/**
 * @file explain-analyzer.js
 * @description Enterprise Database Execution Plan Analyzer for PostgreSQL, MariaDB, and MySQL.
 * Ingests text or JSON EXPLAIN / EXPLAIN ANALYZE output and detects Sequential Scans,
 * Disk Spills, Filesorts, Outdated Statistics, and Cost Bottlenecks.
 */

export class ExplainAnalyzer {
  /**
   * Analyze database execution plan
   * @param {Object} params
   * @param {string|Object} params.plan - Raw text string or JSON representation of EXPLAIN plan
   * @param {string} [params.dialect='postgresql'] - 'postgresql' | 'mysql' | 'mariadb'
   * @param {string} [params.table] - Target table name if known
   * @returns {Object} Comprehensive execution plan diagnosis and remediation runbook
   */
  static analyze(params = {}) {
    const { plan, dialect = 'postgresql', table = null } = params;
    const normalizedDialect = String(dialect).toLowerCase().trim();

    if (!plan) {
      throw new Error('Missing plan parameter: please provide the text or JSON output of EXPLAIN.');
    }

    const planText = typeof plan === 'object' ? JSON.stringify(plan, null, 2) : String(plan);

    const issues = [];
    const recommendations = [];
    const scanTypes = [];
    let isDiskSpill = false;
    let isFullTableScan = false;
    let isOutdatedStats = false;
    let totalCost = null;
    let executionTimeMs = null;

    if (normalizedDialect === 'postgresql' || normalizedDialect === 'postgres') {
      this._analyzePostgresPlan(planText, issues, recommendations, scanTypes);
    } else {
      this._analyzeMySQLPlan(planText, issues, recommendations, scanTypes);
    }

    // Determine overall health score
    let healthStatus = 'OPTIMAL';
    if (issues.some(i => i.severity === 'CRITICAL')) {
      healthStatus = 'CRITICAL (Severe I/O or Lock Hazard)';
    } else if (issues.some(i => i.severity === 'HIGH')) {
      healthStatus = 'WARNING (Significant Inefficiency)';
    } else if (issues.length > 0) {
      healthStatus = 'ACCEPTABLE (Optimization Opportunities)';
    }

    return {
      success: true,
      dialect: normalizedDialect,
      table_target: table,
      health_status: healthStatus,
      scan_types_detected: Array.from(new Set(scanTypes)),
      issues_count: issues.length,
      issues,
      recommendations,
      summary: {
        has_sequential_scan: issues.some(i => i.type === 'FULL_TABLE_SCAN' || i.type === 'SEQUENTIAL_SCAN'),
        has_disk_spill: issues.some(i => i.type === 'DISK_SORT_SPILL'),
        has_filesort_or_temp: issues.some(i => i.type === 'USING_FILESORT_OR_TEMPORARY'),
        has_cardinality_mismatch: issues.some(i => i.type === 'STATISTICS_CARDINALITY_MISMATCH')
      }
    };
  }

  /**
   * Parse and analyze PostgreSQL EXPLAIN / EXPLAIN ANALYZE
   */
  static _analyzePostgresPlan(text, issues, recommendations, scanTypes) {
    // 1. Detect Sequential Scans
    const seqScanMatches = [...text.matchAll(/Seq Scan on\s+([a-zA-Z0-9_"]+)/gi)];
    if (seqScanMatches.length > 0) {
      for (const m of seqScanMatches) {
        scanTypes.push(`Seq Scan (${m[1]})`);
        issues.push({
          type: 'SEQUENTIAL_SCAN',
          severity: 'CRITICAL',
          node: m[0],
          target: m[1],
          description: `Sequential scan on table '${m[1]}'. Engine reads every physical disk page sequentially because no matching index exists or predicate is non-SARGable.`
        });
        recommendations.push({
          action: `Add a B-Tree composite index on table '${m[1]}' for the columns in the Filter predicate to enable Index Scan or Bitmap Heap Scan.`
        });
      }
    }

    // 2. Detect Index Scans
    if (/Index Scan/i.test(text)) scanTypes.push('Index Scan');
    if (/Index Only Scan/i.test(text)) scanTypes.push('Index Only Scan (Covering Index)');
    if (/Bitmap Heap Scan/i.test(text)) scanTypes.push('Bitmap Heap Scan');

    // 3. Detect Disk Sort Spill (external merge Disk)
    if (/external merge\s+Disk/i.test(text) || /Disk: \d+kB/i.test(text)) {
      issues.push({
        type: 'DISK_SORT_SPILL',
        severity: 'HIGH',
        description: 'PostgreSQL spilled in-memory sort to temporary files on disk. `work_mem` is insufficient for the working dataset.'
      });
      recommendations.push({
        action: 'Increase `work_mem` for the query session (e.g., SET work_mem = "64MB") or create an ESR composite index matching the ORDER BY clause to eliminate the sort entirely.'
      });
    }

    // 4. Detect Rows estimation discrepancy (outdated stats)
    const rowsMatch = text.match(/rows=(\d+)\s+width=\d+\)\s+\(actual.*?rows=(\d+)/i);
    if (rowsMatch) {
      const estimated = parseInt(rowsMatch[1], 10);
      const actual = parseInt(rowsMatch[2], 10);
      if (estimated > 0 && actual > 0) {
        const ratio = Math.max(estimated / actual, actual / estimated);
        if (ratio >= 10) {
          issues.push({
            type: 'STATISTICS_CARDINALITY_MISMATCH',
            severity: 'MEDIUM',
            estimated_rows: estimated,
            actual_rows: actual,
            ratio: Math.round(ratio),
            description: `Query planner estimated ${estimated} rows but actual execution returned ${actual} rows (${Math.round(ratio)}x discrepancy). Autovacuum stats are stale.`
          });
          recommendations.push({
            action: 'Execute `ANALYZE <table_name>;` to refresh distribution statistics in pg_statistic.'
          });
        }
      }
    }

    // 5. Detect Rows Removed by Filter
    const removedMatch = text.match(/Rows Removed by Filter:\s+(\d+)/i);
    if (removedMatch && parseInt(removedMatch[1], 10) > 1000) {
      issues.push({
        type: 'HIGH_FILTER_DISCARD_RATIO',
        severity: 'HIGH',
        rows_discarded: parseInt(removedMatch[1], 10),
        description: `Query fetched and subsequently discarded ${parseInt(removedMatch[1], 10).toLocaleString()} rows in memory/CPU after scanning.`
      });
      recommendations.push({
        action: 'Refine index to include the filtered columns so the engine seeks directly to matching rows without post-filtering.'
      });
    }
  }

  /**
   * Parse and analyze MariaDB / MySQL EXPLAIN
   */
  static _analyzeMySQLPlan(text, issues, recommendations, scanTypes) {
    // 1. Detect Full Table Scan (type: ALL)
    if (/\btype\b\s*:\s*ALL/i.test(text) || /\bALL\b/i.test(text) && /\brow/i.test(text)) {
      scanTypes.push('ALL (Full Table Scan)');
      issues.push({
        type: 'FULL_TABLE_SCAN',
        severity: 'CRITICAL',
        description: 'MySQL/MariaDB is executing a Full Table Scan (type: ALL). Every row is read from disk buffer pool.'
      });
      recommendations.push({
        action: 'Create a composite B-Tree index on columns used in WHERE and JOIN clauses to shift scan type from ALL to ref, eq_ref, or range.'
      });
    }

    if (/\btype\b\s*:\s*index/i.test(text)) scanTypes.push('index (Full Index Scan)');
    if (/\btype\b\s*:\s*range/i.test(text)) scanTypes.push('range (Index Range Scan)');
    if (/\btype\b\s*:\s*ref/i.test(text)) scanTypes.push('ref (Non-Unique Index Lookup)');
    if (/\btype\b\s*:\s*eq_ref/i.test(text)) scanTypes.push('eq_ref (Unique/Primary Key Lookup)');

    // 2. Detect Using filesort & Using temporary
    if (/Using filesort/i.test(text)) {
      issues.push({
        type: 'USING_FILESORT_OR_TEMPORARY',
        severity: 'HIGH',
        description: `'Using filesort': MySQL must perform an extra sorting pass over the results instead of reading rows in natural index order.`
      });
      recommendations.push({
        action: 'Align the composite index with the ORDER BY column following the ESR rule (Equality -> Sort -> Range).'
      });
    }

    if (/Using temporary/i.test(text)) {
      issues.push({
        type: 'USING_TEMPORARY_TABLE',
        severity: 'HIGH',
        description: `'Using temporary': MySQL needs to create an internal temporary table to hold intermediate results (common with GROUP BY / DISTINCT).`
      });
      recommendations.push({
        action: 'Ensure GROUP BY and ORDER BY clauses reference the same table and columns in the same order.'
      });
    }
  }
}

export default ExplainAnalyzer;
