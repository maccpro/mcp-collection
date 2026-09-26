/**
 * @file blast-radius-engine.js
 * @description Transitive Dependency Graph Builder, Risk Score Calculator,
 * and Mermaid Graph Generator for Code Impact Analysis.
 */

import fs from 'node:fs';
import path from 'node:path';
import { DynamicSymbolResolver } from './dynamic-symbol-resolver.js';

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

    const blastRadiusGraph = {
      level_0_origins: [],
      level_1_direct: new Set(),
      level_2_transitive: new Set(),
      level_3_transitive: new Set()
    };

    const details = [];

    for (const target of targets) {
      const targetPath = typeof target === 'string' ? target : target.path;
      const targetSymbols = typeof target === 'object' && target.symbols ? target.symbols : [];

      blastRadiusGraph.level_0_origins.push(targetPath);

      // Extract symbol aliases if available
      const resolvedSymbols = [];
      for (const sym of targetSymbols) {
        const resolved = DynamicSymbolResolver.resolve({ symbol: sym, repo_path });
        resolvedSymbols.push(sym);
        resolvedSymbols.push(...resolved.dynamic_call_aliases);
        resolvedSymbols.push(...resolved.related_listeners);
        resolvedSymbols.push(...resolved.concrete_implementations);
      }

      // Find Direct Callers (Level 1)
      const directDependents = this._findCallers(targetPath, resolvedSymbols, indexedFiles, blastRadiusGraph.level_0_origins);
      for (const dep of directDependents) {
        blastRadiusGraph.level_1_direct.add(dep);
      }

      // Find Transitive Callers (Level 2)
      if (max_depth >= 2) {
        for (const l1File of directDependents) {
          const l2Dependents = this._findCallers(l1File, [], indexedFiles, [
            ...blastRadiusGraph.level_0_origins,
            ...blastRadiusGraph.level_1_direct
          ]);
          for (const dep of l2Dependents) {
            blastRadiusGraph.level_2_transitive.add(dep);
          }
        }
      }

      // Find Level 3 Callers
      if (max_depth >= 3) {
        for (const l2File of blastRadiusGraph.level_2_transitive) {
          const l3Dependents = this._findCallers(l2File, [], indexedFiles, [
            ...blastRadiusGraph.level_0_origins,
            ...blastRadiusGraph.level_1_direct,
            ...blastRadiusGraph.level_2_transitive
          ]);
          for (const dep of l3Dependents) {
            blastRadiusGraph.level_3_transitive.add(dep);
          }
        }
      }

      details.push({
        target: targetPath,
        symbols_scanned: resolvedSymbols,
        direct_callers_count: directDependents.length
      });
    }

    const l1Array = Array.from(blastRadiusGraph.level_1_direct);
    const l2Array = Array.from(blastRadiusGraph.level_2_transitive);
    const l3Array = Array.from(blastRadiusGraph.level_3_transitive);

    // Calculate Risk Score
    const { riskScore, severity, factors } = this._calculateRiskScore({
      level1Count: l1Array.length,
      level2Count: l2Array.length,
      level3Count: l3Array.length,
      l1Files: l1Array,
      origins: blastRadiusGraph.level_0_origins
    });

    // Generate Mermaid Diagram
    const mermaidDiagram = this._generateMermaidDiagram(
      blastRadiusGraph.level_0_origins,
      l1Array,
      l2Array
    );

    return {
      success: true,
      total_affected_files: blastRadiusGraph.level_0_origins.length + l1Array.length + l2Array.length + l3Array.length,
      risk_score: riskScore,
      severity,
      risk_factors: factors,
      blast_radius: {
        origins: blastRadiusGraph.level_0_origins,
        direct_dependents: l1Array,
        transitive_dependents_level_2: l2Array,
        transitive_dependents_level_3: l3Array
      },
      mermaid_graph: mermaidDiagram,
      details
    };
  }

  /**
   * Search indexed files for references or calls to target file/symbols
   */
  static _findCallers(targetFile, symbols, indexedFiles, visited) {
    const callers = [];
    const baseName = path.basename(targetFile, path.extname(targetFile));

    for (const file of indexedFiles) {
      if (visited.includes(file.path) || file.path === targetFile) continue;

      let isDependent = false;

      // 1. Direct class import / use statement
      if (file.content.includes(`use ${baseName}`) || file.content.includes(`\\${baseName}`)) {
        isDependent = true;
      }

      // 2. Class instantiation or static invocation: new TargetClass, TargetClass::
      if (file.content.includes(`new ${baseName}`) || file.content.includes(`${baseName}::`)) {
        isDependent = true;
      }

      // 3. Match specific symbols / dynamic scopes
      if (!isDependent && symbols.length > 0) {
        for (const sym of symbols) {
          if (file.content.includes(sym)) {
            isDependent = true;
            break;
          }
        }
      }

      if (isDependent) {
        callers.push(file.path);
      }
    }

    return callers;
  }

  /**
   * Calculate Weighted Risk Score
   */
  static _calculateRiskScore({ level1Count, level2Count, level3Count, l1Files, origins }) {
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

    // Check for high-risk layers in affected files
    const allAffected = [...origins, ...l1Files];

    if (allAffected.some(f => f.includes('/migrations/'))) {
      score += 6.0;
      factors.push('Database Schema Mutation: +6.0 (High Lock/Data Risk)');
    }

    if (allAffected.some(f => f.includes('/routes/') || f.includes('/Controllers/'))) {
      score += 4.0;
      factors.push('Public HTTP Route / Controller affected: +4.0 (API Contract Risk)');
    }

    if (allAffected.some(f => f.includes('Middleware') || f.includes('Auth') || f.includes('Policy'))) {
      score += 8.0;
      factors.push('Authentication / Security Policy affected: +8.0 (Security Risk)');
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
            // Read first 100KB max to keep memory footprint light
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
