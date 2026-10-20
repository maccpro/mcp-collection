/**
 * @file query-analyzer.js
 * @description Enterprise SQL Query Analyzer and Index Advisor for MariaDB, MySQL, PostgreSQL & SQLite.
 * Analyzes SARGability, applies ESR (Equality, Sort, Range) indexing rules, and generates Eloquent optimization.
 */

class QueryAnalyzer {
  /**
   * Analyze SQL query for performance, SARGability, and indexing recommendations.
   * @param {Object} params
   * @param {string} params.query - Raw SQL query or Eloquent SQL dump
   * @param {string} [params.dialect='mariadb'] - 'mariadb' | 'mysql' | 'postgresql' | 'sqlite'
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

    // 1. Detect Table Name & Aliases if not passed
    const tableAliases = this._extractTableAliases(cleanQuery);
    const detectedTable = table || this._detectTable(cleanQuery);

    // 2. Check SARGability Anti-Patterns
    this._checkSargability(cleanQuery, normalizedDialect, issues, recommendations);

    // 3. Extract ESR (Equality, Sort, Range) predicates
    const multiTableEsr = this._extractESRPredicates(cleanQuery, esrColumns, tableAliases, detectedTable);

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
      joined_table_indexes: multiTableEsr,
      eloquent_rewriter: eloquentRewriter,
      recommendations
    };
  }

  /**
   * Extract table alias mapping from query
   */
  static _extractTableAliases(sql) {
    const aliases = new Map();
    const fromMatch = sql.match(/\bFROM\s+[`"']?([a-zA-Z0-9_]+)[`"']?(?:\s+(?:AS\s+)?([a-zA-Z0-9_]+))?/i);
    if (fromMatch && fromMatch[1]) {
      const tbl = fromMatch[1];
      const alias = fromMatch[2] || tbl;
      aliases.set(alias.toLowerCase(), tbl);
      aliases.set(tbl.toLowerCase(), tbl);
    }

    const joinRegex = /\b(?:LEFT|RIGHT|INNER|CROSS|OUTER)?\s*JOIN\s+[`"']?([a-zA-Z0-9_]+)[`"']?(?:\s+(?:AS\s+)?([a-zA-Z0-9_]+))?/gi;
    let jm;
    while ((jm = joinRegex.exec(sql)) !== null) {
      const tbl = jm[1];
      const alias = jm[2] || tbl;
      aliases.set(alias.toLowerCase(), tbl);
      aliases.set(tbl.toLowerCase(), tbl);
    }
    return aliases;
  }

  /**
   * Detect table from query
   */
  static _detectTable(sql) {
    const fromMatch = sql.match(/\bFROM\s+[`"']?([a-zA-Z0-9_]+)[`"']?(?:\s+(?:AS\s+)?([a-zA-Z0-9_]+))?/i);
    if (fromMatch && fromMatch[1]) return fromMatch[1];

    const updateMatch = sql.match(/\bUPDATE\s+[`"']?([a-zA-Z0-9_]+)[`"']?/i);
    if (updateMatch && updateMatch[1]) return updateMatch[1];

    const intoMatch = sql.match(/\bINTO\s+[`"']?([a-zA-Z0-9_]+)[`"']?/i);
    if (intoMatch && intoMatch[1]) return intoMatch[1];

    return 'main_table';
  }

  /**
   * Check SARGability and query performance anti-patterns
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

    // Anti-pattern 7: OR condition across different columns in WHERE
    const whereMatch = sql.match(/\bWHERE\b(.*?)(?:\bORDER\s+BY\b|\bGROUP\s+BY\b|\bLIMIT\b|$)/i);
    if (whereMatch && /\bOR\b/i.test(whereMatch[1])) {
      issues.push({
        type: 'OR_PREDICATE_INDEX_MERGE_HAZARD',
        severity: 'HIGH',
        description: `'OR' conditions across different columns cannot be satisfied by a single composite B-Tree index and often trigger full table scans or erratic Index Merge unions.`
      });
      recommendations.push({
        category: 'QUERY_OPTIMIZATION',
        action: `Rewrite the query using 'UNION ALL' of two index-friendly SELECT statements, or ensure separate individual indexes exist on each OR column.`
      });
    }

    // Anti-pattern 8: Inequality operator (!= or <>)
    if (whereMatch && /(?:!=|<>)/.test(whereMatch[1])) {
      issues.push({
        type: 'INEQUALITY_OPERATOR_SCAN_HAZARD',
        severity: 'MEDIUM',
        description: `Inequality operators ('!=' or '<>') prevent index seeks because the B-Tree index must scan virtually all leaf pages.`
      });
      recommendations.push({
        category: 'QUERY_OPTIMIZATION',
        action: `If searching for a small subset, invert condition to positive equality (e.g. status IN ('pending', 'failed') instead of status != 'completed').`
      });
    }

    // Anti-pattern 9: Deep OFFSET Pagination Trap
    const offsetMatch = sql.match(/\bOFFSET\s+(\d+)/i) || sql.match(/\bLIMIT\s+\d+\s*,\s*(\d+)/i);
    if (offsetMatch) {
      const offsetVal = parseInt(offsetMatch[1], 10);
      if (offsetVal >= 1000) {
        issues.push({
          type: 'DEEP_OFFSET_PAGINATION_TRAP',
          severity: 'HIGH',
          offset_value: offsetVal,
          description: `Deep pagination with OFFSET ${offsetVal.toLocaleString()} forces the database engine to scan and discard ${offsetVal.toLocaleString()} rows before returning results, causing severe CPU and I/O latency.`
        });
        recommendations.push({
          category: 'PAGINATION_FIX',
          action: `Implement Keyset / Cursor Pagination using primary key seeking: 'WHERE id > :last_seen_id ORDER BY id ASC LIMIT 20'.`
        });
      }
    }

    // Anti-pattern 10: Implicit Type Coercion
    const coercionRegex = /[`"']?([a-zA-Z0-9_]*(?:phone|code|sku|mobile|ssn|uuid|ident|account_no)[a-zA-Z0-9_]*)[`"']?\s*=\s*(\d+)(?!\.|\w|['"])/i;
    const coercionMatch = sql.match(coercionRegex);
    if (coercionMatch) {
      issues.push({
        type: 'IMPLICIT_TYPE_COERCION_HAZARD',
        severity: 'HIGH',
        column: coercionMatch[1],
        literal: coercionMatch[2],
        description: `Comparing string/identifier column '${coercionMatch[1]}' with numeric literal '${coercionMatch[2]}' causes MySQL/PostgreSQL to cast the entire column on every row, invalidating indexes.`
      });
      recommendations.push({
        category: 'SARGABILITY_FIX',
        action: `Quote parameter value as a string: '${coercionMatch[1]} = \\'${coercionMatch[2]}\\''.`
      });
    }

    // Anti-pattern 11: Vector Similarity Search Operator
    if (/<=>|<->|<#>/.test(sql)) {
      issues.push({
        type: 'VECTOR_SIMILARITY_SEARCH_DETECTED',
        severity: 'MEDIUM',
        description: 'Vector similarity distance operator detected in query. B-Tree indexes cannot accelerate vector searches.'
      });
      recommendations.push({
        category: 'AI_VECTOR_INDEX_RECOMMENDATION',
        action: 'In PostgreSQL (pgvector), create an HNSW or IVFFlat index: `CREATE INDEX idx_vector ON table USING hnsw (embedding vector_cosine_ops);`'
      });
    }

    // Anti-pattern 12: GROUP BY and ORDER BY Mismatch
    const groupMatch = sql.match(/\bGROUP\s+BY\s+(.*?)(?:\bHAVING\b|\bORDER\s+BY\b|\bLIMIT\b|$)/i);
    const orderMatch = sql.match(/\bORDER\s+BY\s+(.*?)(?:\bLIMIT\b|$)/i);
    if (groupMatch && orderMatch) {
      const groupCol = groupMatch[1].trim().split(',')[0].trim().replace(/^.*?\./, '');
      const orderCol = orderMatch[1].trim().split(',')[0].trim().replace(/^.*?\./, '').replace(/\s+(?:ASC|DESC)/i, '');
      if (groupCol.toLowerCase() !== orderCol.toLowerCase()) {
        issues.push({
          type: 'GROUP_BY_ORDER_BY_MISMATCH_FILESORT',
          severity: 'HIGH',
          group_by: groupCol,
          order_by: orderCol,
          description: `GROUP BY column ('${groupCol}') does not match ORDER BY column ('${orderCol}'). Forces the engine to create an intermediate temporary table and run a filesort.`
        });
        recommendations.push({
          category: 'SORT_OPTIMIZATION',
          action: `Align GROUP BY and ORDER BY clauses to reference the same columns in matching sequence.`
        });
      }
    }
  }

  /**
   * Extract ESR predicates with alias awareness
   */
  static _extractESRPredicates(sql, mainEsr, aliases, mainTable) {
    const tablePredicates = {};

    const getTableForAlias = (alias) => {
      if (!alias) return mainTable;
      const lower = alias.toLowerCase();
      return aliases.get(lower) || lower;
    };

    const initTableEsr = (tbl) => {
      if (!tablePredicates[tbl]) {
        tablePredicates[tbl] = { equality: [], sort: [], range: [] };
      }
      return tablePredicates[tbl];
    };

    const whereMatch = sql.match(/\bWHERE\b(.*?)(?:\bORDER\s+BY\b|\bGROUP\s+BY\b|\bLIMIT\b|$)/i);
    if (whereMatch && whereMatch[1]) {
      const whereClause = whereMatch[1];

      // Extract Equality: [table.]col = val, [table.]col IS NULL
      const equalityRegex = /(?:[`"']?([a-zA-Z0-9_]+)[`"']?\.)?[`"']?([a-zA-Z0-9_]+)[`"']?\s*(?:=|IS\s+NULL)\s*[^<>=]/gi;
      let eq;
      while ((eq = equalityRegex.exec(whereClause)) !== null) {
        const prefix = eq[1];
        const col = eq[2];
        if (col && !['and', 'or', 'where', 'not', 'null'].includes(col.toLowerCase()) && !/^[0-9]+$/.test(col)) {
          const targetTbl = getTableForAlias(prefix);
          const tEsr = initTableEsr(targetTbl);
          tEsr.equality.push(col.toLowerCase());
          if (targetTbl === mainTable || !prefix) {
            mainEsr.equality.push(col.toLowerCase());
          }
        }
      }

      // Extract Range: [table.]col > val, etc.
      const rangeRegex = /(?:[`"']?([a-zA-Z0-9_]+)[`"']?\.)?[`"']?([a-zA-Z0-9_]+)[`"']?\s*(?:>|<|>=|<=|BETWEEN|IN\s*\(|LIKE\s+['"][^%])/gi;
      let rg;
      while ((rg = rangeRegex.exec(whereClause)) !== null) {
        const prefix = rg[1];
        const col = rg[2];
        if (col && !['and', 'or', 'where', 'not'].includes(col.toLowerCase()) && !/^[0-9]+$/.test(col)) {
          const targetTbl = getTableForAlias(prefix);
          const tEsr = initTableEsr(targetTbl);
          if (!tEsr.equality.includes(col.toLowerCase())) {
            tEsr.range.push(col.toLowerCase());
          }
          if (targetTbl === mainTable || !prefix) {
            if (!mainEsr.equality.includes(col.toLowerCase())) {
              mainEsr.range.push(col.toLowerCase());
            }
          }
        }
      }
    }

    // Extract Sort: ORDER BY [table.]col1 [ASC|DESC], ...
    const orderMatch = sql.match(/\bORDER\s+BY\s+(.*?)(?:\bLIMIT\b|$)/i);
    if (orderMatch && orderMatch[1]) {
      const orderClause = orderMatch[1];
      const orderParts = orderClause.split(',');
      for (const part of orderParts) {
        const colMatch = part.trim().match(/(?:[`"']?([a-zA-Z0-9_]+)[`"']?\.)?[`"']?([a-zA-Z0-9_]+)[`"']?(?:\s+(?:ASC|DESC))?/i);
        if (colMatch) {
          const prefix = colMatch[1];
          const col = colMatch[2];
          if (col && !['and', 'or'].includes(col.toLowerCase()) && !/^[0-9]+$/.test(col)) {
            const targetTbl = getTableForAlias(prefix);
            const tEsr = initTableEsr(targetTbl);
            tEsr.sort.push(col.toLowerCase());
            if (targetTbl === mainTable || !prefix) {
              mainEsr.sort.push(col.toLowerCase());
            }
          }
        }
      }
    }

    // Generate joined table indexes (excluding main table)
    const joinedRecommendations = [];
    for (const [tbl, esr] of Object.entries(tablePredicates)) {
      if (tbl !== mainTable) {
        const eq = Array.from(new Set(esr.equality));
        const st = Array.from(new Set(esr.sort)).filter(c => !eq.includes(c));
        const rg = Array.from(new Set(esr.range)).filter(c => !eq.includes(c) && !st.includes(c));
        const cols = [...eq, ...st, ...rg];
        if (cols.length > 0) {
          joinedRecommendations.push({
            table: tbl,
            index_name: `idx_${tbl}_${cols.slice(0, 3).join('_')}`,
            columns: cols,
            rule_applied: 'ESR (Equality -> Sort -> Range)'
          });
        }
      }
    }

    return joinedRecommendations;
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

    let rawSqlSnippets = {};
    if (dialect === 'postgresql') {
      rawSqlSnippets.postgresql = `CREATE INDEX CONCURRENTLY IF NOT EXISTS ${indexName} ON ${table} (${optimalColumns.join(', ')});`;
      rawSqlSnippets.laravel_raw = `DB::statement('CREATE INDEX CONCURRENTLY IF NOT EXISTS ${indexName} ON ${table} (${optimalColumns.join(', ')})');`;
    } else if (dialect === 'sqlite') {
      rawSqlSnippets.sqlite = `CREATE INDEX IF NOT EXISTS ${indexName} ON ${table} (${optimalColumns.join(', ')});`;
      rawSqlSnippets.laravel_raw = `DB::statement('CREATE INDEX IF NOT EXISTS ${indexName} ON ${table} (${optimalColumns.join(', ')})');`;
    } else {
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

  static _singularize(word) {
    const w = String(word || '').toLowerCase();
    if (w.endsWith('ies')) return w.slice(0, -3) + 'y';
    if (w.endsWith('sses')) return w.slice(0, -2);
    if (w.endsWith('ches') || w.endsWith('shes') || w.endsWith('xes')) return w.slice(0, -2);
    if (['status', 'business', 'news', 'series'].includes(w)) return w;
    if (w.endsWith('s') && !w.endsWith('ss')) return w.slice(0, -1);
    return w;
  }

  /**
   * Generate Eloquent Rewriter suggestions
   */
  static _generateEloquentRewriter(sql, table, esr) {
    const modelName = table
      .split('_')
      .map(part => {
        const s = this._singularize(part);
        return s.charAt(0).toUpperCase() + s.slice(1);
      })
      .join('');

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
    const relations = joinMatches.map(m => this._singularize(m[1]));

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
