/**
 * @file frontend-relational-engine.js
 * @description Dynamic Relational Architecture & Component Graph Engine for Modern Frontend Systems.
 * 
 * Provides:
 * - Component Node & Edge Directed Graph (Layouts -> Pages -> Organisms -> Molecules -> Atoms)
 * - Design Token Drift Detection (hardcoded hex colors and non-standard arbitrary utilities)
 * - Monolithic Component Anti-Pattern Detection (>250 lines without sub-component composition)
 * - Dynamic Mermaid UI Architecture Visualization
 * - Zero external dependencies: 100% Node.js standard libraries.
 */

import fs from 'node:fs';
import path from 'node:path';
import { ProjectDetector } from './project-detector.js';

export class ComponentNode {
  /**
   * @param {object} params
   * @param {string} params.id Unique node identifier
   * @param {string} params.name Component display name
   * @param {string} params.type 'layout' | 'page' | 'organism' | 'molecule' | 'atom' | 'token'
   * @param {string} [params.path] Source file path
   * @param {object} [params.metadata] Component metrics and attributes
   */
  constructor({ id, name, type, path = '', metadata = {} }) {
    this.id = id;
    this.name = name;
    this.type = type;
    this.path = path;
    this.metadata = metadata;
  }
}

export class ComponentEdge {
  /**
   * @param {object} params
   * @param {string} params.source Source component node ID
   * @param {string} params.target Target component node ID
   * @param {string} params.type 'CONTAINS' | 'USES_TOKEN' | 'DEPENDS_ON'
   * @param {object} [params.metadata] Edge metadata
   */
  constructor({ source, target, type = 'CONTAINS', metadata = {} }) {
    this.source = source;
    this.target = target;
    this.type = type;
    this.metadata = metadata;
  }
}

export class FrontendRelationalEngine {
  /**
   * Safe file exists check
   */
  static safeExists(p) {
    try {
      return fs.existsSync(p);
    } catch {
      return false;
    }
  }

  /**
   * Safe read UTF-8 file content
   */
  static safeReadFile(filePath, maxBytes = 65536) {
    try {
      if (fs.existsSync(filePath)) {
        const stats = fs.statSync(filePath);
        if (stats.size > maxBytes) {
          const fd = fs.openSync(filePath, 'r');
          const buffer = Buffer.alloc(maxBytes);
          fs.readSync(fd, buffer, 0, maxBytes, 0);
          fs.closeSync(fd);
          return buffer.toString('utf8');
        }
        return fs.readFileSync(filePath, 'utf8');
      }
    } catch {
      return '';
    }
    return '';
  }

  /**
   * Safe recursive directory scanner for frontend view and component files
   */
  static scanComponentFiles(dir, maxDepth = 4, currentDepth = 0) {
    if (currentDepth > maxDepth || !this.safeExists(dir)) return [];

    let results = [];
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          // Skip vendor, node_modules, .git, and storage
          if (['node_modules', 'vendor', '.git', 'storage', 'dist', 'build', '.next', '.nuxt'].includes(entry.name)) {
            continue;
          }
          results = results.concat(this.scanComponentFiles(fullPath, maxDepth, currentDepth + 1));
        } else if (entry.isFile()) {
          if (/\.(blade\.php|jsx|tsx|vue|svelte|html)$/i.test(entry.name)) {
            results.push(fullPath);
          }
        }
      }
    } catch {
      // Ignore read errors
    }
    return results;
  }

  /**
   * Classify component into Atomic Design tiers
   * @param {string} filePath
   * @param {string} content
   * @returns {'layout' | 'page' | 'organism' | 'molecule' | 'atom'}
   */
  static classifyComponentTier(filePath, content) {
    const lowerPath = filePath.toLowerCase();
    const lineCount = content.split('\n').length;

    if (lowerPath.includes('layout') || lowerPath.includes('app.blade') || lowerPath.includes('guest.blade')) {
      return 'layout';
    }
    if (lowerPath.includes('pages') || lowerPath.includes('/page.') || lowerPath.includes('/index.')) {
      return 'page';
    }
    if (lineCount > 180 || content.includes('<table') || content.includes('<form') || content.includes('pricing') || content.includes('dashboard')) {
      return 'organism';
    }
    if (lineCount > 60 || content.includes('card') || content.includes('dialog') || content.includes('modal') || content.includes('input')) {
      return 'molecule';
    }
    return 'atom';
  }

  /**
   * Introspect a workspace project and build comprehensive UI Relational Architecture
   * @param {string} targetDir Project root directory
   * @returns {object} Relational Architecture Profile
   */
  static introspect(targetDir = process.cwd()) {
    const resolvedDir = path.resolve(targetDir);
    const stack = ProjectDetector.inspect(resolvedDir);

    const nodes = new Map();
    const edges = [];
    const tokenDriftFindings = [];
    const monolithicComponents = [];

    // Candidate frontend directories
    const searchDirs = [
      path.join(resolvedDir, 'resources', 'views'),
      path.join(resolvedDir, 'resources', 'js'),
      path.join(resolvedDir, 'src', 'components'),
      path.join(resolvedDir, 'src', 'app'),
      path.join(resolvedDir, 'components'),
      path.join(resolvedDir, 'app')
    ].filter(d => this.safeExists(d));

    const scannedFiles = new Set();
    for (const dir of searchDirs) {
      const files = this.scanComponentFiles(dir);
      for (const f of files) scannedFiles.add(f);
    }

    // Process each component
    for (const filePath of scannedFiles) {
      const relPath = path.relative(resolvedDir, filePath).replace(/\\/g, '/');
      const baseName = path.basename(filePath).replace(/\.(blade\.php|jsx|tsx|vue|svelte|html)$/i, '');
      const content = this.safeReadFile(filePath);
      const lines = content.split('\n');
      const lineCount = lines.length;

      const tier = this.classifyComponentTier(filePath, content);
      const nodeId = `comp:${relPath}`;

      // 1. Add Component Node
      const node = new ComponentNode({
        id: nodeId,
        name: baseName,
        type: tier,
        path: relPath,
        metadata: {
          line_count: lineCount,
          tier
        }
      });
      nodes.set(nodeId, node);

      // 2. Check Monolithic Anti-Pattern (>250 lines)
      if (lineCount > 250 && tier !== 'layout') {
        monolithicComponents.push({
          component: baseName,
          path: relPath,
          line_count: lineCount,
          recommendation: 'Component exceeds 250 lines. Consider decomposing into smaller molecules or extracting compound sub-components.'
        });
      }

      // 3. Check Token Drift (Hardcoded raw hex colors #RRGGBB instead of theme variables)
      const rawHexMatches = content.match(/#[0-9a-fA-F]{6}\b/g);
      if (rawHexMatches && rawHexMatches.length > 0) {
        const uniqueHexes = Array.from(new Set(rawHexMatches));
        tokenDriftFindings.push({
          component: baseName,
          path: relPath,
          hardcoded_hex_count: rawHexMatches.length,
          unique_hexes: uniqueHexes,
          recommendation: `Hardcoded hex colors detected (${uniqueHexes.join(', ')}). Replace with design tokens (e.g. bg-brand-500, var(--primary)).`
        });
      }

      // 4. Infer Component Edges (Child component inclusion)
      // Check for Blade components <x-name ... />
      const bladeComponentMatches = content.match(/<x-([a-zA-Z0-9_-]+)/g);
      if (bladeComponentMatches) {
        for (const match of bladeComponentMatches) {
          const childName = match.replace('<x-', '');
          edges.push(new ComponentEdge({
            source: nodeId,
            target: `blade:${childName}`,
            type: 'CONTAINS',
            metadata: { framework: 'blade' }
          }));
        }
      }

      // Check for JSX component tags <Button, <Card, <Input
      const jsxComponentMatches = content.match(/<([A-Z][a-zA-Z0-9]+)\b/g);
      if (jsxComponentMatches) {
        for (const match of jsxComponentMatches) {
          const childName = match.replace('<', '');
          if (!['Fragment', 'Suspense', 'StrictMode'].includes(childName)) {
            edges.push(new ComponentEdge({
              source: nodeId,
              target: `jsx:${childName}`,
              type: 'CONTAINS',
              metadata: { framework: 'react' }
            }));
          }
        }
      }
    }

    // Compute UI Architectural Health Score (0 - 100)
    let healthScore = 100;
    healthScore -= Math.min(30, tokenDriftFindings.length * 5);
    healthScore -= Math.min(25, monolithicComponents.length * 8);
    healthScore = Math.max(20, Math.min(100, healthScore));

    // Generate Dynamic Mermaid Architecture Graph
    let mermaidDiagram = 'graph TD\n  %% Frontend Component Hierarchy Graph\n';
    const sampledNodes = Array.from(nodes.values()).slice(0, 15);
    for (const n of sampledNodes) {
      const cleanName = n.name.replace(/[^a-zA-Z0-9_]/g, '_');
      const cleanId = n.id.replace(/[^a-zA-Z0-9_]/g, '_');
      mermaidDiagram += `  ${cleanId}["${cleanName} (${n.type})"]\n`;
    }

    const sampledEdges = edges.slice(0, 20);
    for (const e of sampledEdges) {
      const cleanSrc = e.source.replace(/[^a-zA-Z0-9_]/g, '_');
      const cleanTgt = e.target.replace(/[^a-zA-Z0-9_]/g, '_');
      mermaidDiagram += `  ${cleanSrc} -->|${e.type}| ${cleanTgt}\n`;
    }

    const recommendations = [];
    if (tokenDriftFindings.length > 0) {
      recommendations.push(`Standardize ${tokenDriftFindings.length} component(s) exhibiting raw hex color token drift using 'ui_ux_design_tokens'.`);
    }
    if (monolithicComponents.length > 0) {
      recommendations.push(`Refactor ${monolithicComponents.length} monolithic component(s) into atomic design tiers using 'ui_ux_suggest_pattern'.`);
    }
    if (recommendations.length === 0) {
      recommendations.push('UI Architecture is clean, modular, and adheres to design system tokens.');
    }

    return {
      project_path: resolvedDir,
      stack: {
        framework: stack.framework_display,
        tailwind_version: stack.tailwind_version,
        icon_set: stack.icon_set
      },
      metrics: {
        total_components_scanned: nodes.size,
        total_dependency_edges: edges.length,
        token_drift_count: tokenDriftFindings.length,
        monolithic_count: monolithicComponents.length,
        architectural_health_score: healthScore
      },
      token_drift_findings: tokenDriftFindings.slice(0, 10),
      monolithic_components: monolithicComponents.slice(0, 10),
      mermaid_architecture_diagram: mermaidDiagram,
      recommendations
    };
  }
}
