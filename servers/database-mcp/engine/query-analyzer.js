/**
 * @file query-analyzer.js
 * @description Enterprise SQL Query Analyzer and Index Advisor for MariaDB, MySQL, and PostgreSQL.
 * Analyzes SARGability, applies ESR (Equality, Sort, Range) indexing rules, and generates Eloquent optimization.
 */

class QueryAnalyzer {
  /**
   * Analyze SQL query for performance, SARGability, and indexing recommendations.
   * @param {Object} params
   * @param {string} params.query - Raw SQL query or Eloquent SQL dump
   * @param {string} [params.dialect='mariadb'] - 'mariadb' | 'mysql' | 'postgresql'
   * @param {string} [params.table] - Main table name if inferred
   * @param {Array<string>} [params.existing_indexes] - Existing table indexes
   * @returns {Object} Analysis report with recommendations and Eloquent rewriter
   */
  static analyze(params) {
    const { query = '', dialect = 'mariadb', table = null, existing_indexes = [] } = params;
    const cleanQuery = query.trim().replace(/\s+/g, ' ');
    const normalizedDialect = dialect.toLowerCase();

    const issues = [];
    const recommendations = [];
    const esrColumns = {
      equality: [],
      sort: [],
      range: []
    };

    // 1. Detect Table Name if not passed
    const detectedTable = table || this._detectTable(cleanQuery);

    // 2. Check SARGability Anti-Patterns
    this._checkSargability(cleanQuery, normalizedDialect, issues, recommendations);

    // 3. Extract ESR (Equality, Sort, Range) predicates
    this._extractESRPredicates(cleanQuery, esrColumns);

    // 4. Formulate Composite Index Recommendation based on ESR rule
    const indexRecommendation = this._buildIndexRecommendation(detectedTable, esrColumns, normalizedDialect, existing_indexes);

    // 5. Generate Eloquent Optimization & Eager Loading recommendations
    const eloquentRewriter = this._generateEloquentRewriter(cleanQuery, detectedTable, esrColumns);

    return {
      success: true,
      dialect: normalizedDialect,
      table: detectedTable,
      query: cleanQuery,
      issues_detected: issues,
      sargability_score: issues.length === 0 ? 'Optimal (SARGable)' : issues.some(i => i.severity === 'CRITICAL') ? 'Poor (Table Scan Likely)' : 'Moderate',
      esr_breakdown: {
        equality_columns: Array.from(new Set(esrColumns.equality)),
        sort_columns: Array.from(new Set(esrColumns.sort)),
        range_columns: Array.from(new Set(esrColumns.range))
      },
      recommended_index: indexRecommendation,
      eloquent_rewriter: eloquentRewriter,
      recommendations
    };
  }

  /**
   * Detect table from query
   */
  static _detectTable(sql) {
    const fromMatch = sql.match(/\bFROM\s+[`"']?([a-zA-Z0-9_]+)[`"']?/i);
    if (fromMatch && fromMatch[1]) return fromMatch[1];

    const updateMatch = sql.match(/\bUPDATE\s+[`"']?([a-zA-Z0-9_]+)[`"']?/i);
    if (updateMatch && updateMatch[1]) return updateMatch[1];

    const intoMatch = sql.match(/\bINTO\s+[`"']?([a-zA-Z0-9_]+)[`"']?/i);
    if (intoMatch && intoMatch[1]) return intoMatch[1];

    return 'main_table';
  }

  /**
   * Check SARGability anti-patterns
   */
  static _checkSargability(sql, dialect, issues, recommendations) {
    // Anti-pattern 1: Function wrapping columns in WHERE clause (e.g., YEAR(date), DATE(date))
    const dateFuncRegex = /\b(YEAR|MONTH|DAY|DATE|HOUR|TO_CHAR|EXTRACT)\s*\(\s*[`"']?([a-zA-Z0-9_]+)[`"']?\s*\)\s*(=|<|>|<=|>=|BETWEEN)/i;
    const dateMatch = sql.match(dateFuncRegex);
    if (dateMatch) {
      issues.push({
        type: 'NON_SARGABLE_DATE_FUNCTION',
        severity: 'CRITICAL',
        column: dateMatch[2],
        matched_expression: dateMatch[0],
        description: `Applying function ${dateMatch[1]}() on column '${dateMatch[2]}' invalidates B-Tree index lookup and triggers a full table scan.`
      });
      recommendations.push({
        category: 'SARGABILITY_FIX',
        action: `Rewrite date predicate into a range query without wrapping the column: '${dateMatch[2]} >= :start AND ${dateMatch[2]} < :end'.`
      });
    }

    // Anti-pattern 2: LOWER() or UPPER() on column
    const caseFuncRegex = /\b(LOWER|UPPER)\s*\(\s*[`"']?([a-zA-Z0-9_]+)[`"']?\s*\)\s*=/i;
    const caseMatch = sql.match(caseFuncRegex);
    if (caseMatch) {
      issues.push({
        type: 'NON_SARGABLE_STRING_FUNCTION',
        severity: 'HIGH',
        column: caseMatch[2],
        matched_expression: caseMatch[0],
        description: `Applying ${caseMatch[1]}() on column '${caseMatch[2]}' prevents index usage unless a functional/expression index is created.`
      });
      if (dialect === 'postgresql') {
        recommendations.push({
          category: 'INDEX_OR_QUERY_FIX',
          action: `For PostgreSQL, consider using ILIKE or a functional expression index: 'CREATE INDEX idx_${caseMatch[2]}_lower ON table (LOWER(${caseMatch[2]}));' or use citext extension.`
        });
      } else {
        recommendations.push({
          category: 'INDEX_OR_QUERY_FIX',
          action: `MariaDB/MySQL default collations (e.g. utf8mb4_unicode_ci) are already case-insensitive. Remove ${caseMatch[1]}() to leverage regular B-Tree index.`
        });
      }
    }

    // Anti-pattern 3: Wildcard prefix in LIKE '%value'
    const leadingWildcardRegex = /[`"']?([a-zA-Z0-9_]+)[`"']?\s+LIKE\s+['"]%([^'"]+)['"]/i;
    const wildcardMatch = sql.match(leadingWildcardRegex);
    if (wildcardMatch) {
      issues.push({
        type: 'LEADING_WILDCARD_LIKE',
        severity: 'CRITICAL',
        column: wildcardMatch[1],
        matched_expression: wildcardMatch[0],
        description: `Leading wildcard '%${wildcardMatch[2]}' cannot utilize B-Tree index and enforces a full sequential table scan.`
      });
      if (dialect === 'postgresql') {
        recommendations.push({
          category: 'INDEX_FIX',
          action: `Create a GIN index with pg_trgm for fast leading wildcard lookups: 'CREATE INDEX idx_${wildcardMatch[1]}_trgm ON table USING gin (${wildcardMatch[1]} gin_trgm_ops);'.`
        });
      } else {
        recommendations.push({
          category: 'INDEX_FIX',
          action: `Use FULLTEXT index with MATCH(...) AGAINST(...) or an external search engine (Elasticsearch / Meilisearch) for arbitrary substring searches.`
        });
      }
    }

    // Anti-pattern 4: Arithmetic operations on column in predicate (e.g., column + 10 > 50)
    const arithmeticRegex = /[`"']?([a-zA-Z0-9_]+)[`"']?\s*[\+\-\*\/]\s*\d+\s*(=|<|>|<=|>=)/i;
    const arithMatch = sql.match(arithmeticRegex);
    if (arithMatch) {
      issues.push({
        type: 'ARITHMETIC_ON_INDEX_COLUMN',
        severity: 'HIGH',
        column: arithMatch[1],
        matched_expression: arithMatch[0],
        description: `Mathematical operations on column '${arithMatch[1]}' prevent B-Tree index seeks.`
      });
      recommendations.push({
        category: 'SARGABILITY_FIX',
        action: `Move arithmetic calculations to the literal/parameter side (e.g., 'col > 50 - 10' instead of 'col + 10 > 50').`
      });
    }

    // Anti-pattern 5: SELECT *
    if (/\bSELECT\s+\*\s+\bFROM\b/i.test(sql)) {
      issues.push({
        type: 'SELECT_STAR_OVERFETCH',
        severity: 'MEDIUM',
        description: `'SELECT *' increases network I/O, prevents covering index optimizations (Index-Only Scans), and inflates memory usage.`
      });
      recommendations.push({
        category: 'QUERY_OPTIMIZATION',
        action: `Explicitly select only the necessary columns. This unlocks covering index execution.`
      });
    }

    // Anti-pattern 6: NOT IN with NULL risk
    if (/\bNOT\s+IN\s*\(/i.test(sql)) {
      issues.push({
        type: 'NOT_IN_PERFORMANCE_AND_NULL_RISK',
        severity: 'HIGH',
        description: `'NOT IN (SELECT ...)' performs poorly and evaluates to UNKNOWN if the subquery returns even a single NULL.`
      });
      recommendations.push({
        category: 'QUERY_OPTIMIZATION',
        action: `Replace 'NOT IN' with 'NOT EXISTS' or a 'LEFT JOIN ... WHERE right_table.id IS NULL'.`
      });
    }
  }

  /**
   * Extract ESR (Equality, Sort, Range) columns from WHERE and ORDER BY
   */
  static _extractESRPredicates(sql, esr) {
    const whereMatch = sql.match(/\bWHERE\b(.*?)(?:\bORDER\s+BY\b|\bGROUP\s+BY\b|\bLIMIT\b|$)/i);
    if (whereMatch && whereMatch[1]) {
      const whereClause = whereMatch[1];

      // Extract Equality: col = val, col IS NULL
      const equalityRegex = /(?:[`"']?([a-zA-Z0-9_]+)[`"']?\.)?[`"']?([a-zA-Z0-9_]+)[`"']?\s*(?:=|IS\s+NULL)\s*[^<>=]/gi;
      let eq;
      while ((eq = equalityRegex.exec(whereClause)) !== null) {
        const col = eq[2] || eq[1];
        if (col && !['and', 'or', 'where'].includes(col.toLowerCase())) {
          esr.equality.push(col.toLowerCase());
        }
      }

      // Extract Range: col > val, col < val, col >= val, col <= val, col BETWEEN, col LIKE 'prefix%'
      const rangeRegex = /(?:[`"']?([a-zA-Z0-9_]+)[`"']?\.)?[`"']?([a-zA-Z0-9_]+)[`"']?\s*(?:>|<|>=|<=|BETWEEN|IN\s*\(|LIKE\s+['"][^%])/gi;
      let rg;
      while ((rg = rangeRegex.exec(whereClause)) !== null) {
        const col = rg[2] || rg[1];
        if (col && !['and', 'or', 'where'].includes(col.toLowerCase())) {
          // If already in equality, don't duplicate as range
          if (!esr.equality.includes(col.toLowerCase())) {
            esr.range.push(col.toLowerCase());
          }
        }
      }
    }

    // Extract Sort: ORDER BY col1 [ASC|DESC], col2
    const orderMatch = sql.match(/\bORDER\s+BY\s+(.*?)(?:\bLIMIT\b|$)/i);
    if (orderMatch && orderMatch[1]) {
      const orderClause = orderMatch[1];
      const orderParts = orderClause.split(',');
      for (const part of orderParts) {
        const colMatch = part.trim().match(/(?:[`"']?([a-zA-Z0-9_]+)[`"']?\.)?[`"']?([a-zA-Z0-9_]+)[`"']?(?:\s+(?:ASC|DESC))?/i);
        if (colMatch) {
          const col = colMatch[2] || colMatch[1];
          if (col && !['and', 'or'].includes(col.toLowerCase())) {
            esr.sort.push(col.toLowerCase());
          }
        }
      }
    }
  }

  /**
   * Build recommended composite index based on ESR rule
   */
  static _buildIndexRecommendation(table, esr, dialect, existing_indexes) {
    const eqCols = Array.from(new Set(esr.equality));
    const sortCols = Array.from(new Set(esr.sort)).filter(c => !eqCols.includes(c));
    const rangeCols = Array.from(new Set(esr.range)).filter(c => !eqCols.includes(c) && !sortCols.includes(c));

    // ESR ordering: [Equality..., Sort..., Range...]
    const optimalColumns = [...eqCols, ...sortCols, ...rangeCols];

    if (optimalColumns.length === 0) {
      return {
        has_recommendation: false,
        reason: 'No indexable equality, sort, or range predicates detected.'
      };
    }

    const indexName = `idx_${table}_${optimalColumns.slice(0, 3).join('_')}`;

    // Check if already covered
    const isCovered = existing_indexes.some(idx => {
      if (Array.isArray(idx)) {
        return optimalColumns.every((c, i) => idx[i] === c);
      }
      return typeof idx === 'string' && idx.includes(optimalColumns[0]);
    });

    // Generate Laravel Migration Code
    const columnsArrayString = optimalColumns.map(c => `'${c}'`).join(', ');
    let migrationUpCode = `$table->index([${columnsArrayString}], '${indexName}');`;
    let migrationDownCode = `$table->dropIndex('${indexName}');`;

    // PostgreSQL Concurrent Index snippet for zero downtime
    let rawSqlSnippets = {};
    if (dialect === 'postgresql') {
      rawSqlSnippets.postgresql = `CREATE INDEX CONCURRENTLY IF NOT EXISTS ${indexName} ON ${table} (${optimalColumns.join(', ')});`;
      rawSqlSnippets.laravel_raw = `DB::statement('CREATE INDEX CONCURRENTLY IF NOT EXISTS ${indexName} ON ${table} (${optimalColumns.join(', ')})');`;
    } else if (dialect === 'mariadb' || dialect === 'mysql') {
      rawSqlSnippets.online_ddl = `ALTER TABLE ${table} ADD INDEX ${indexName} (${optimalColumns.join(', ')}), ALGORITHM=INPLACE, LOCK=NONE;`;
    }

    return {
      has_recommendation: true,
      index_name: indexName,
      columns_in_esr_order: optimalColumns,
      rule_applied: 'ESR (Equality -> Sort -> Range)',
      already_covered: isCovered,
      laravel_schema_code: {
        up: migrationUpCode,
        down: migrationDownCode
      },
      raw_sql: rawSqlSnippets
    };
  }

  /**
   * Generate Eloquent Rewriter suggestions
   */
  static _generateEloquentRewriter(sql, table, esr) {
    const modelName = table
      .split('_')
      .map(part => part.charAt(0).toUpperCase() + part.slice(1))
      .join('')
      .replace(/s$/, ''); // Basic singularization (users -> User)

    const eqCols = Array.from(new Set(esr.equality));
    const rangeCols = Array.from(new Set(esr.range));
    const sortCols = Array.from(new Set(esr.sort));

    let eloquentCode = `${modelName}::query()`;

    for (const col of eqCols) {
      eloquentCode += `\n    ->where('${col}', $${col})`;
    }

    for (const col of rangeCols) {
      eloquentCode += `\n    ->where('${col}', '>=', $startDate)`;
    }

    for (const col of sortCols) {
      eloquentCode += `\n    ->orderBy('${col}', 'desc')`;
    }

    // Check for JOIN in SQL to recommend eager loading
    const joinMatches = [...sql.matchAll(/\bJOIN\s+[`"']?([a-zA-Z0-9_]+)[`"']?/gi)];
    const relations = joinMatches.map(m => m[1].replace(/s$/, ''));

    if (relations.length > 0) {
      const relArray = relations.map(r => `'${r}'`).join(', ');
      eloquentCode = `${modelName}::with([${relArray}])` + eloquentCode.substring(modelName.length + 9);
    }

    eloquentCode += `\n    ->paginate(25);`;

    return {
      suggested_model: modelName,
      eloquent_code: eloquentCode,
      eager_loading_relations: relations,
      bulk_recommendation: 'For batch processing over 10,000 rows, use chunkById(500, function ($batch) { ... }) or lazy() to prevent memory exhaustion.'
    };
  }
}

export { QueryAnalyzer };
export default QueryAnalyzer;

