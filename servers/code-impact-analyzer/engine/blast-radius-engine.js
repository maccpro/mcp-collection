/**
 * @file blast-radius-engine.js
 * @description Transitive Dependency Graph Builder, Risk Score Calculator,
 * and Mermaid Graph Generator for Code Impact Analysis.
 * Powered by RelationalDependencyGraph with cycle-safe BFS traversal and dynamic depth.
 */

import fs from 'node:fs';
import path from 'node:path';
import { DynamicSymbolResolver } from './dynamic-symbol-resolver.js';
import { ASTClassClassifier } from './ast-class-classifier.js';
import { RelationalDependencyGraph } from './relational-dependency-graph.js';

export class BlastRadiusEngine {
  /**
   * Compute the blast radius and risk score for a set of changed files or symbols.
   * @param {Object} params
   * @param {Array<string|Object>} params.targets - Array of file paths or symbol objects
   * @param {string} [params.repo_path] - Root directory to scan
   * @param {number} [params.max_depth=3] - Maximum transitive traversal depth
   * @param {Array<string>} [params.exclude_paths] - Paths to ignore
   * @returns {Object} Comprehensive blast radius analysis with Mermaid diagram and risk score
   */
  static compute(params) {
    const {
      targets = [],
      repo_path = process.cwd(),
      max_depth = 3,
      exclude_paths = ['vendor', 'node_modules', 'storage', '.git']
    } = params;

    // Collect all codebase files for indexing
    const indexedFiles = this._indexCodebase(repo_path, exclude_paths);

    // Initialize Relational Directed Graph
    const graph = new RelationalDependencyGraph();
    const origins = [];
    const details = [];

    // Step 1: Register all files in graph
    for (const f of indexedFiles) {
      graph.addNode(f.path, 'file', f.path);
    }

    // Step 2: Build graph edges for targets and transitive dependencies
    for (const target of targets) {
      const targetPath = typeof target === 'string' ? target : target.path;
      const targetSymbols = typeof target === 'object' && target.symbols ? target.symbols : [];

      origins.push(targetPath);
      graph.addNode(targetPath, 'file', targetPath);

      // Extract symbol aliases if available
      const resolvedSymbols = [];
      for (const sym of targetSymbols) {
        const resolved = DynamicSymbolResolver.resolve({ symbol: sym, repo_path });
        resolvedSymbols.push(sym);
        resolvedSymbols.push(...resolved.dynamic_call_aliases);
        resolvedSymbols.push(...resolved.related_listeners);
        resolvedSymbols.push(...resolved.concrete_implementations);
      }

      this._populateGraphEdges(targetPath, resolvedSymbols, indexedFiles, graph, max_depth);

      const directEdges = graph.getIncomingEdges(targetPath);
      details.push({
        target: targetPath,
        symbols_scanned: resolvedSymbols,
        direct_callers_count: directEdges.length
      });
    }

    // Step 3: Cycle-safe BFS Transitive Traversal
    const traversal = graph.traverseBFS({
      startNodes: origins,
      maxDepth: max_depth,
      direction: 'upstream'
    });

    const l1Array = traversal.level_1;
    const l2Array = traversal.level_2;
    const l3Array = traversal.level_3;

    // Calculate Risk Score
    const { riskScore, severity, factors } = this._calculateRiskScore({
      level1Count: l1Array.length,
      level2Count: l2Array.length,
      level3Count: l3Array.length,
      l1Files: l1Array,
      origins,
      indexedFiles
    });

    // Generate Mermaid Diagram
    const mermaidDiagram = this._generateMermaidDiagram(
      origins,
      l1Array,
      l2Array
    );

    return {
      success: true,
      total_affected_files: origins.length + l1Array.length + l2Array.length + l3Array.length,
      risk_score: riskScore,
      severity,
      risk_factors: factors,
      blast_radius: {
        origins,
        direct_dependents: l1Array,
        transitive_dependents_level_2: l2Array,
        transitive_dependents_level_3: l3Array
      },
      paths: traversal.paths,
      mermaid_graph: mermaidDiagram,
      details
    };
  }

  /**
   * Dynamically populate graph edges for target and transitive callers
   */
  static _populateGraphEdges(startFile, symbols, indexedFiles, graph, maxDepth) {
    const queue = [{ file: startFile, symbols, depth: 0 }];
    const processed = new Set();

    while (queue.length > 0) {
      const { file: currentFile, symbols: currentSymbols, depth } = queue.shift();
      if (processed.has(currentFile) || depth >= maxDepth) continue;
      processed.add(currentFile);

      const baseName = path.basename(currentFile, path.extname(currentFile));

      for (const indexed of indexedFiles) {
        if (indexed.path === currentFile) continue;

        const rel = this._detectRelation(indexed.content, baseName, currentSymbols);
        if (rel.isDependent) {
          graph.addEdge(indexed.path, currentFile, rel.relationType);

          if (depth + 1 < maxDepth && !processed.has(indexed.path)) {
            queue.push({ file: indexed.path, symbols: [], depth: depth + 1 });
          }
        }
      }
    }
  }

  /**
   * Detect structural relation between dependent file and target
   */
  static _detectRelation(content, targetBaseName, symbols = []) {
    // 1. Direct class inheritance
    if (content.includes(`extends ${targetBaseName}`)) {
      return { isDependent: true, relationType: 'INHERITS' };
    }

    // 2. Interface implementation
    if (content.includes(`implements ${targetBaseName}`) || content.includes(`, ${targetBaseName}`)) {
      return { isDependent: true, relationType: 'IMPLEMENTS' };
    }

    // 3. Trait usage
    if (new RegExp(`use\\s+[^;]*\\b${targetBaseName}\\b[^;]*;`).test(content) && content.includes('class ')) {
      return { isDependent: true, relationType: 'USES_TRAIT' };
    }

    // 4. Instantiation or static call
    if (content.includes(`new ${targetBaseName}`) || content.includes(`${targetBaseName}::`)) {
      return { isDependent: true, relationType: 'CALLS' };
    }

    // 5. Use statement import
    if (content.includes(`use ${targetBaseName}`) || content.includes(`\\${targetBaseName}`)) {
      return { isDependent: true, relationType: 'IMPORTS' };
    }

    // 6. Match specific symbols or dynamic scopes
    if (symbols.length > 0) {
      for (const sym of symbols) {
        if (content.includes(sym)) {
          return { isDependent: true, relationType: 'CALLS_METHOD' };
        }
      }
    }

    return { isDependent: false, relationType: null };
  }

  /**
   * Search indexed files for references or calls to target file/symbols (kept for backward compatibility)
   */
  static _findCallers(targetFile, symbols, indexedFiles, visited = []) {
    const callers = [];
    const baseName = path.basename(targetFile, path.extname(targetFile));

    for (const file of indexedFiles) {
      if (visited.includes(file.path) || file.path === targetFile) continue;

      const rel = this._detectRelation(file.content, baseName, symbols);
      if (rel.isDependent) {
        callers.push(file.path);
      }
    }

    return callers;
  }

  /**
   * Calculate Weighted Risk Score dynamically based on AST classification
   */
  static _calculateRiskScore({ level1Count, level2Count, level3Count, l1Files, origins, indexedFiles = [] }) {
    let score = 0;
    const factors = [];

    // Direct impact: 2.0 per file
    const l1Points = level1Count * 2.0;
    score += l1Points;
    factors.push(`Direct Callers (${level1Count} files): +${l1Points}`);

    // Transitive impact: 1.0 per file
    const l2Points = level2Count * 1.0;
    score += l2Points;
    factors.push(`Transitive Dependents Level 2 (${level2Count} files): +${l2Points}`);

    // Level 3 impact: 0.5 per file
    const l3Points = level3Count * 0.5;
    score += l3Points;
    if (level3Count > 0) {
      factors.push(`Transitive Dependents Level 3 (${level3Count} files): +${l3Points}`);
    }

    // Dynamic AST classification of affected files
    const allAffected = [...origins, ...l1Files];
    let hasMigration = false;
    let hasControllerOrRoute = false;
    let hasAuthOrSecurity = false;
    let hasAsyncQueue = false;
    let hasTenantAware = false;

    for (const f of allAffected) {
      const indexed = indexedFiles.find(item => item.path === f);
      const content = indexed ? indexed.content : '';
      const ast = ASTClassClassifier.classify(content, f);

      if (ast.category === 'migration' || ast.is_database_entity || f.includes('migration')) {
        hasMigration = true;
      }
      if (ast.category === 'controller' || ast.category === 'action' || f.includes('routes/')) {
        hasControllerOrRoute = true;
      }
      if (ast.category === 'middleware' || ast.traits.includes('AuthorizesRequests') || f.includes('Policy') || f.includes('Auth')) {
        hasAuthOrSecurity = true;
      }
      if (ast.is_async_queue) {
        hasAsyncQueue = true;
      }
      if (ast.is_tenant_aware) {
        hasTenantAware = true;
      }
    }

    if (hasMigration) {
      score += 6.0;
      factors.push('Database Schema Mutation: +6.0 (High Lock/Data Risk)');
    }
    if (hasControllerOrRoute) {
      score += 4.0;
      factors.push('Public HTTP Route / Controller affected: +4.0 (API Contract Risk)');
    }
    if (hasAuthOrSecurity) {
      score += 8.0;
      factors.push('Authentication / Security Policy affected: +8.0 (Security Risk)');
    }
    if (hasAsyncQueue) {
      score += 5.0;
      factors.push('Asynchronous Queue Worker affected: +5.0 (In-flight Payload Risk)');
    }
    if (hasTenantAware) {
      score += 7.0;
      factors.push('Multi-Tenant Data Entity affected: +7.0 (Tenant Boundary Risk)');
    }

    let severity = 'LOW';
    if (score > 30) severity = 'CRITICAL';
    else if (score >= 16) severity = 'HIGH';
    else if (score >= 6) severity = 'MEDIUM';

    return { riskScore: Math.round(score * 10) / 10, severity, factors };
  }

  /**
   * Generate Mermaid Flowchart Diagram
   */
  static _generateMermaidDiagram(origins, level1, level2) {
    let m = 'flowchart TD\n';
    m += '    classDef origin fill:#ef4444,stroke:#b91c1c,color:#ffffff,stroke-width:2px;\n';
    m += '    classDef l1 fill:#f97316,stroke:#c2410c,color:#ffffff;\n';
    m += '    classDef l2 fill:#3b82f6,stroke:#1d4ed8,color:#ffffff;\n\n';

    // Origins
    origins.forEach((orig, idx) => {
      const id = `orig_${idx}`;
      m += `    ${id}["🎯 ${path.basename(orig)}"]:::origin\n`;

      // Connect to L1
      level1.slice(0, 8).forEach((l1, l1Idx) => {
        const l1Id = `l1_${l1Idx}`;
        m += `    ${id} --> ${l1Id}["⚠️ ${path.basename(l1)}"]:::l1\n`;
      });
    });

    // Connect L1 to L2 (sample top 5 to keep diagram clean)
    level2.slice(0, 5).forEach((l2, l2Idx) => {
      const l2Id = `l2_${l2Idx}`;
      m += `    l1_0 -.-> ${l2Id}["📦 ${path.basename(l2)}"]:::l2\n`;
    });

    return m;
  }

  /**
   * Index codebase PHP and JS files for rapid in-memory searching
   */
  static _indexCodebase(repoPath, excludePaths) {
    const results = [];

    function walk(dir) {
      if (!fs.existsSync(dir)) return;
      const entries = fs.readdirSync(dir, { withFileTypes: true });

      for (const entry of entries) {
        if (excludePaths.includes(entry.name)) continue;

        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          walk(fullPath);
        } else if (entry.isFile() && (entry.name.endsWith('.php') || entry.name.endsWith('.js') || entry.name.endsWith('.ts'))) {
          try {
            const buffer = Buffer.alloc(100 * 1024);
            const fd = fs.openSync(fullPath, 'r');
            const bytesRead = fs.readSync(fd, buffer, 0, buffer.length, 0);
            fs.closeSync(fd);
            const content = buffer.toString('utf8', 0, bytesRead);

            results.push({
              path: path.relative(repoPath, fullPath).replace(/\\/g, '/'),
              content
            });
          } catch (e) {
            // Skip unreadable files
          }
        }
      }
    }

    walk(repoPath);
    return results;
  }
}

export default BlastRadiusEngine;
