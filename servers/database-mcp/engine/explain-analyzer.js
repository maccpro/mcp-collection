/**
 * @file explain-analyzer.js
 * @description Enterprise Database Execution Plan Analyzer for PostgreSQL, MariaDB, MySQL & SQLite.
 * Ingests text or JSON EXPLAIN / EXPLAIN ANALYZE output and detects Sequential Scans,
 * Disk Spills, Filesorts, Outdated Statistics, Buffer Hit Ratios, and Cost Bottlenecks.
 */

export class ExplainAnalyzer {
  /**
   * Analyze database execution plan
   * @param {Object} params
   * @param {string|Object} params.plan - Raw text string or JSON representation of EXPLAIN plan
   * @param {string} [params.dialect='postgresql'] - 'postgresql' | 'mysql' | 'mariadb' | 'sqlite'
   * @param {string} [params.table] - Target table name if known
   * @returns {Object} Comprehensive execution plan diagnosis and remediation runbook
   */
  static analyze(params = {}) {
    const { plan, dialect = 'postgresql', table = null } = params;
    const normalizedDialect = String(dialect).toLowerCase().trim();

    if (!plan) {
      throw new Error('Missing plan parameter: please provide the text or JSON output of EXPLAIN.');
    }

    // Try parsing as JSON object
    let planObj = null;
    if (typeof plan === 'object' && plan !== null) {
      planObj = plan;
    } else if (typeof plan === 'string') {
      const trimmed = plan.trim();
      if ((trimmed.startsWith('{') && trimmed.endsWith('}')) || (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
        try {
          planObj = JSON.parse(trimmed);
        } catch {
          planObj = null;
        }
      }
    }

    const planText = typeof plan === 'object' ? JSON.stringify(plan, null, 2) : String(plan);

    const issues = [];
    const recommendations = [];
    const scanTypes = [];
    const metrics = {};

    if (normalizedDialect === 'postgresql' || normalizedDialect === 'postgres') {
      if (planObj) {
        this._analyzePostgresJsonAST(planObj, issues, recommendations, scanTypes, metrics);
      }
      // Run text checks as fallback or complement
      this._analyzePostgresPlanText(planText, issues, recommendations, scanTypes);
    } else if (normalizedDialect === 'sqlite') {
      this._analyzeSQLitePlanText(planText, issues, recommendations, scanTypes);
    } else {
      if (planObj) {
        this._analyzeMySQLJsonAST(planObj, issues, recommendations, scanTypes, metrics);
      }
      this._analyzeMySQLPlanText(planText, issues, recommendations, scanTypes);
    }

    // De-duplicate issues by type and target
    const uniqueIssues = [];
    const seen = new Set();
    for (const iss of issues) {
      const key = `${iss.type}_${iss.target || ''}`;
      if (!seen.has(key)) {
        seen.add(key);
        uniqueIssues.push(iss);
      }
    }

    // Determine overall health score
    let healthStatus = 'OPTIMAL';
    if (uniqueIssues.some(i => i.severity === 'CRITICAL')) {
      healthStatus = 'CRITICAL (Severe I/O or Lock Hazard)';
    } else if (uniqueIssues.some(i => i.severity === 'HIGH')) {
      healthStatus = 'WARNING (Significant Inefficiency)';
    } else if (uniqueIssues.length > 0) {
      healthStatus = 'ACCEPTABLE (Optimization Opportunities)';
    }

    return {
      success: true,
      dialect: normalizedDialect,
      table_target: table,
      health_status: healthStatus,
      scan_types_detected: Array.from(new Set(scanTypes)),
      issues_count: uniqueIssues.length,
      issues: uniqueIssues,
      recommendations,
      metrics,
      summary: {
        has_sequential_scan: uniqueIssues.some(i => i.type === 'FULL_TABLE_SCAN' || i.type === 'SEQUENTIAL_SCAN'),
        has_disk_spill: uniqueIssues.some(i => i.type === 'DISK_SORT_SPILL'),
        has_filesort_or_temp: uniqueIssues.some(i => i.type === 'USING_FILESORT_OR_TEMPORARY' || i.type === 'USING_TEMPORARY_TABLE'),
        has_cardinality_mismatch: uniqueIssues.some(i => i.type === 'STATISTICS_CARDINALITY_MISMATCH'),
        has_buffer_cache_miss: uniqueIssues.some(i => i.type === 'BUFFER_CACHE_MISS_IO_THRASHING')
      }
    };
  }

  /**
   * Recursive JSON AST analysis for PostgreSQL EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)
   */
  static _analyzePostgresJsonAST(jsonObj, issues, recommendations, scanTypes, metrics) {
    const rootArray = Array.isArray(jsonObj) ? jsonObj : [jsonObj];

    for (const item of rootArray) {
      // Check JIT overhead
      if (item.JIT && item.JIT.Timing) {
        const jitTotal = item.JIT.Timing.Total || 0;
        if (jitTotal > 20) {
          issues.push({
            type: 'JIT_COMPILATION_OVERHEAD',
            severity: 'MEDIUM',
            jit_time_ms: jitTotal,
            description: `PostgreSQL JIT compilation spent ${jitTotal.toFixed(2)}ms compiling queries, which may exceed query execution time for short OLTP statements.`
          });
          recommendations.push({
            action: 'Disable JIT for short OLTP connections via `SET jit = off;` to eliminate compilation latency.'
          });
        }
      }

      if (item.Plan) {
        this._walkPostgresPlanNode(item.Plan, issues, recommendations, scanTypes, metrics);
      }
    }
  }

  static _walkPostgresPlanNode(node, issues, recommendations, scanTypes, metrics) {
    const nodeType = node['Node Type'] || '';
    const relationName = node['Relation Name'] || node['Alias'] || 'unspecified_table';

    if (nodeType) {
      scanTypes.push(`${nodeType} (${relationName})`);
    }

    if (nodeType === 'Seq Scan') {
      issues.push({
        type: 'SEQUENTIAL_SCAN',
        severity: 'CRITICAL',
        node: `Seq Scan on ${relationName}`,
        target: relationName,
        description: `Sequential scan on table '${relationName}'. Engine reads every disk page sequentially because no matching index exists or predicate is non-SARGable.`
      });
      recommendations.push({
        action: `Add a B-Tree composite index on table '${relationName}' matching the Filter predicate to enable Index Scan or Bitmap Heap Scan.`
      });
    }

    // Outdated statistics / Cardinality mismatch
    const planRows = node['Plan Rows'];
    const actualRows = node['Actual Rows'];
    if (typeof planRows === 'number' && typeof actualRows === 'number' && planRows > 0 && actualRows > 0) {
      const ratio = Math.max(planRows / actualRows, actualRows / planRows);
      if (ratio >= 10) {
        issues.push({
          type: 'STATISTICS_CARDINALITY_MISMATCH',
          severity: 'MEDIUM',
          target: relationName,
          plan_rows: planRows,
          actual_rows: actualRows,
          ratio: Math.round(ratio),
          description: `Query planner estimated ${planRows} rows but execution returned ${actualRows} rows (${Math.round(ratio)}x mismatch) on '${relationName}'. Autovacuum stats are stale.`
        });
        recommendations.push({
          action: `Execute 'ANALYZE ${relationName};' to update distribution statistics in pg_statistic.`
        });
      }
    }

    // Rows removed by filter
    const removedRows = node['Rows Removed by Filter'] || 0;
    if (removedRows > 1000) {
      issues.push({
        type: 'HIGH_FILTER_DISCARD_RATIO',
        severity: 'HIGH',
        target: relationName,
        rows_discarded: removedRows,
        description: `Scan on '${relationName}' discarded ${removedRows.toLocaleString()} rows in memory/CPU after scanning.`
      });
      recommendations.push({
        action: `Refine index on '${relationName}' to include filtered columns so the engine seeks directly without post-filtering.`
      });
    }

    // Buffer Cache Hit Ratio
    const hitBlocks = node['Shared Hit Blocks'] || 0;
    const readBlocks = node['Shared Read Blocks'] || 0;
    if (hitBlocks + readBlocks > 100) {
      const hitRatio = (hitBlocks / (hitBlocks + readBlocks)) * 100;
      metrics.buffer_hit_ratio_pct = Math.round(hitRatio * 10) / 10;
      if (hitRatio < 90) {
        issues.push({
          type: 'BUFFER_CACHE_MISS_IO_THRASHING',
          severity: 'HIGH',
          target: relationName,
          hit_ratio_pct: metrics.buffer_hit_ratio_pct,
          description: `Buffer cache hit ratio on '${relationName}' is only ${metrics.buffer_hit_ratio_pct}% (${readBlocks.toLocaleString()} blocks read from physical disk).`
        });
        recommendations.push({
          action: 'Increase `shared_buffers` in postgresql.conf or create a covering index to reduce disk page reads.'
        });
      }
    }

    // Walk child plans
    if (Array.isArray(node.Plans)) {
      for (const child of node.Plans) {
        this._walkPostgresPlanNode(child, issues, recommendations, scanTypes, metrics);
      }
    }
  }

  /**
   * JSON AST analysis for MySQL EXPLAIN FORMAT=JSON
   */
  static _analyzeMySQLJsonAST(jsonObj, issues, recommendations, scanTypes, metrics) {
    if (jsonObj.query_block) {
      this._walkMySQLQueryBlock(jsonObj.query_block, issues, recommendations, scanTypes, metrics);
    }
  }

  static _walkMySQLQueryBlock(block, issues, recommendations, scanTypes, metrics) {
    if (block.table) {
      const t = block.table;
      const tableName = t.table_name || 'unspecified_table';
      const accessType = t.access_type || '';

      if (accessType) {
        scanTypes.push(`${accessType} (${tableName})`);
      }

      if (accessType.toUpperCase() === 'ALL') {
        issues.push({
          type: 'FULL_TABLE_SCAN',
          severity: 'CRITICAL',
          target: tableName,
          description: `MySQL is executing a Full Table Scan (type: ALL) on '${tableName}'. Every row is read from storage/buffer pool.`
        });
        recommendations.push({
          action: `Create a composite B-Tree index on columns used in WHERE and JOIN clauses for '${tableName}'.`
        });
      }

      if (t.using_filesort) {
        issues.push({
          type: 'USING_FILESORT_OR_TEMPORARY',
          severity: 'HIGH',
          target: tableName,
          description: `'using_filesort': MySQL is sorting results on '${tableName}' using an external sort pass.`
        });
        recommendations.push({
          action: 'Align the composite index with the ORDER BY column following ESR rule.'
        });
      }

      if (t.using_temporary_table) {
        issues.push({
          type: 'USING_TEMPORARY_TABLE',
          severity: 'HIGH',
          target: tableName,
          description: `'using_temporary_table': MySQL created an intermediate memory/disk table for '${tableName}'.`
        });
        recommendations.push({
          action: 'Ensure GROUP BY and ORDER BY clauses reference the same table in matching sequence.'
        });
      }
    }

    if (block.nested_loop && Array.isArray(block.nested_loop)) {
      for (const step of block.nested_loop) {
        if (step.table) {
          this._walkMySQLQueryBlock(step, issues, recommendations, scanTypes, metrics);
        }
      }
    }
  }

  /**
   * Parse and analyze PostgreSQL EXPLAIN text
   */
  static _analyzePostgresPlanText(text, issues, recommendations, scanTypes) {
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
   * Parse and analyze MariaDB / MySQL EXPLAIN text
   */
  static _analyzeMySQLPlanText(text, issues, recommendations, scanTypes) {
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

  /**
   * Parse and analyze SQLite EXPLAIN QUERY PLAN text
   */
  static _analyzeSQLitePlanText(text, issues, recommendations, scanTypes) {
    if (/SCAN\s+TABLE/i.test(text)) {
      scanTypes.push('SCAN TABLE (Full Table Scan)');
      issues.push({
        type: 'FULL_TABLE_SCAN',
        severity: 'CRITICAL',
        description: 'SQLite is executing a full SCAN TABLE. Entire table b-tree is traversed.'
      });
      recommendations.push({
        action: 'Create an index covering the search condition to convert SCAN TABLE to SEARCH TABLE USING INDEX.'
      });
    }

    if (/SEARCH\s+TABLE.*USING\s+INDEX/i.test(text)) {
      scanTypes.push('SEARCH TABLE USING INDEX');
    }

    if (/USE\s+TEMP\s+B-TREE\s+FOR\s+ORDER\s+BY/i.test(text)) {
      issues.push({
        type: 'USING_FILESORT_OR_TEMPORARY',
        severity: 'HIGH',
        description: 'SQLite is using a temporary B-Tree to perform ORDER BY sort.'
      });
      recommendations.push({
        action: 'Add sorted column to the composite index to eliminate temp B-Tree sort.'
      });
    }
  }
}

export default ExplainAnalyzer;
