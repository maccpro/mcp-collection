/**
 * @file relational-architecture.js
 * @description Dynamic Relational Architecture Engine for Laravel Applications.
 * 
 * Provides:
 * - In-memory Directed Relational Graph (Nodes & Edges)
 * - Canonical Architecture Flow Validation:
 *   Controller -> FormRequest -> DTO -> Action -> optional Service -> RepositoryInterface -> Repository -> Model -> Database
 * - Dependency Inversion Principle (DIP) Enforcement (RepositoryInterface vs concrete Repository)
 * - Cycle / Circular Dependency Detection via DFS
 * - Afferent / Efferent Coupling & Instability Metrics
 * - Dynamic Mermaid Flowchart Diagram Generation
 * 
 * Zero external dependencies: 100% Node.js standard libraries.
 */

export class RelationalNode {
  /**
   * @param {object} params
   * @param {string} params.id Unique node identifier (FQN or path)
   * @param {string} params.type Node type: 'Controller' | 'FormRequest' | 'DTO' | 'Action' | 'Service' | 'RepositoryInterface' | 'Repository' | 'Model' | 'Policy' | 'Resource' | 'Other'
   * @param {string} params.layer Architectural layer
   * @param {string|null} [params.module] Module name if modular
   * @param {string} [params.path] Source file path
   * @param {string} [params.className] Class name
   * @param {string} [params.namespace] Namespace
   * @param {object} [params.metadata] Additional metadata (injections, methods, isTenant)
   */
  constructor({ id, type, layer, module = null, path = '', className = '', namespace = '', metadata = {} }) {
    this.id = id;
    this.type = type;
    this.layer = layer;
    this.module = module;
    this.path = path;
    this.className = className;
    this.namespace = namespace;
    this.metadata = metadata;
  }
}

export class RelationalEdge {
  /**
   * @param {object} params
   * @param {string} params.source Source node ID
   * @param {string} params.target Target node ID
   * @param {string} params.type Relation type: 'INJECTS' | 'CALLS' | 'IMPLEMENTS' | 'EXTENDS' | 'USES_TRAIT' | 'CROSS_MODULE' | 'MANIPULATES_MODEL'
   * @param {object} [params.metadata] Line, statement, parameter
   */
  constructor({ source, target, type, metadata = {} }) {
    this.source = source;
    this.target = target;
    this.type = type;
    this.metadata = metadata;
  }
}

export class RelationalArchitectureGraph {
  constructor() {
    /** @type {Map<string, RelationalNode>} */
    this.nodes = new Map();
    /** @type {RelationalEdge[]} */
    this.edges = [];
  }

  addNode(node) {
    this.nodes.set(node.id, node);
  }

  getNode(id) {
    return this.nodes.get(id);
  }

  addEdge(edge) {
    this.edges.push(edge);
  }

  getOutgoingEdges(nodeId) {
    return this.edges.filter(e => e.source === nodeId);
  }

  getIncomingEdges(nodeId) {
    return this.edges.filter(e => e.target === nodeId);
  }
}

export class RelationalArchitectureEngine {
  /**
   * Build in-memory relational graph from parsed files
   * @param {object[]} parsedFiles 
   * @param {object} config 
   * @returns {RelationalArchitectureGraph}
   */
  static buildGraph(parsedFiles, config = {}) {
    const graph = new RelationalArchitectureGraph();

    // 1. Register all nodes
    for (const file of parsedFiles) {
      const fqn = file.namespace && file.className ? `${file.namespace}\\${file.className}` : file.filePath;
      const node = new RelationalNode({
        id: fqn,
        type: file.layer,
        layer: file.layer,
        module: file.moduleName,
        path: file.filePath,
        className: file.className,
        namespace: file.namespace,
        metadata: {
          classType: file.classType,
          extendsClass: file.extendsClass,
          implementsInterfaces: file.implementsInterfaces,
          traits: file.traits || [],
          injections: file.injections || [],
          methods: file.methods || [],
          isTenantScoped: file.isTenantScoped || false,
          totalLines: file.totalLines || 0
        }
      });
      graph.addNode(node);
    }

    // 2. Build edges based on injections, implementations, imports, and calls
    for (const file of parsedFiles) {
      const sourceId = file.namespace && file.className ? `${file.namespace}\\${file.className}` : file.filePath;

      // 2.1 Constructor dependency injections
      for (const inj of file.injections || []) {
        const targetId = this.resolveTargetFqn(inj.type, file, graph);
        graph.addEdge(new RelationalEdge({
          source: sourceId,
          target: targetId || inj.type,
          type: 'INJECTS',
          metadata: {
            parameter: inj.name,
            type: inj.type,
            line: inj.line
          }
        }));
      }

      // 2.2 Implements interfaces
      for (const iface of file.implementsInterfaces || []) {
        const targetId = this.resolveTargetFqn(iface, file, graph);
        graph.addEdge(new RelationalEdge({
          source: sourceId,
          target: targetId || iface,
          type: 'IMPLEMENTS',
          metadata: { interface: iface }
        }));
      }

      // 2.3 Extends class
      if (file.extendsClass) {
        const targetId = this.resolveTargetFqn(file.extendsClass, file, graph);
        graph.addEdge(new RelationalEdge({
          source: sourceId,
          target: targetId || file.extendsClass,
          type: 'EXTENDS',
          metadata: { extends: file.extendsClass }
        }));
      }

      // 2.4 Used traits
      for (const tr of file.traits || []) {
        graph.addEdge(new RelationalEdge({
          source: sourceId,
          target: tr,
          type: 'USES_TRAIT',
          metadata: { trait: tr }
        }));
      }
    }

    return graph;
  }

  /**
   * Resolve short class name or relative path to matching Node FQN
   */
  static resolveTargetFqn(shortOrFqn, currentFile, graph) {
    if (!shortOrFqn) return null;

    // Check if direct FQN exists in graph
    if (graph.nodes.has(shortOrFqn)) {
      return shortOrFqn;
    }

    // Check imports of current file
    for (const imp of currentFile.imports || []) {
      if (imp.className === shortOrFqn || imp.classPath === shortOrFqn) {
        if (graph.nodes.has(imp.classPath)) {
          return imp.classPath;
        }
        return imp.classPath;
      }
    }

    // Check by short class name in graph nodes
    for (const [id, node] of graph.nodes.entries()) {
      if (node.className === shortOrFqn) {
        return id;
      }
    }

    return shortOrFqn;
  }

  /**
   * Validate Canonical Architecture Flow on the graph
   * Flow: Controller -> FormRequest -> DTO -> Action -> (Service) -> RepositoryInterface -> Repository -> Model -> Database
   * 
   * @param {RelationalArchitectureGraph} graph 
   * @param {object} config 
   * @returns {object[]} Violations detected from relational analysis
   */
  static validateRelationalRules(graph, config = {}) {
    const violations = [];
    const ruleSeverity = config.architecture?.rules || {};

    for (const [nodeId, node] of graph.nodes.entries()) {
      const outgoingEdges = graph.getOutgoingEdges(nodeId);

      // 1. Controller Flow Checks
      if (node.layer === 'Controller') {
        for (const edge of outgoingEdges) {
          const targetNode = graph.getNode(edge.target);
          const targetType = targetNode ? targetNode.type : this.guessTypeFromIdentifier(edge.target);

          // Controller should not directly inject concrete Repository
          if (targetType === 'Repository') {
            violations.push({
              id: `VIO-REL-CTRL-REPO-${Math.random().toString(36).substr(2, 6).toUpperCase()}`,
              file: node.path,
              fileName: node.path.split('/').pop(),
              line: edge.metadata.line || 1,
              rule: 'controller_business_logic',
              severity: ruleSeverity.controller_business_logic || 'WARNING',
              layer: 'Controller',
              snippet: `${edge.type}: ${edge.target}`,
              message: `Controller directly depends on Repository (${edge.target}). Canonical flow requires: Controller -> Action -> Repository.`,
              fix: 'Delegate orchestration to a single-purpose Action class.'
            });
          }

          // Controller directly depending on Model
          if (targetType === 'Model') {
            violations.push({
              id: `VIO-REL-CTRL-MOD-${Math.random().toString(36).substr(2, 6).toUpperCase()}`,
              file: node.path,
              fileName: node.path.split('/').pop(),
              line: edge.metadata.line || 1,
              rule: 'controller_direct_model',
              severity: ruleSeverity.controller_direct_model || 'ERROR',
              layer: 'Controller',
              snippet: `${edge.type}: ${edge.target}`,
              message: `Controller directly depends on Eloquent Model (${edge.target}). Controllers must not interact directly with Models.`,
              fix: 'Delegate to FormRequest -> DTO -> Action -> Repository.'
            });
          }
        }
      }

      // 2. Action Flow Checks (Dependency Inversion Principle)
      if (node.layer === 'Action') {
        for (const edge of outgoingEdges) {
          const targetNode = graph.getNode(edge.target);
          const targetType = targetNode ? targetNode.type : this.guessTypeFromIdentifier(edge.target);

          // Action injecting concrete Repository instead of RepositoryInterface
          if (edge.type === 'INJECTS' && targetType === 'Repository') {
            const hasInterfaceName = /Interface$|Contract$/i.test(edge.target);
            if (!hasInterfaceName) {
              violations.push({
                id: `VIO-REL-ACT-DIP-${Math.random().toString(36).substr(2, 6).toUpperCase()}`,
                file: node.path,
                fileName: node.path.split('/').pop(),
                line: edge.metadata.line || 1,
                rule: 'repository_missing_interface',
                severity: ruleSeverity.repository_missing_interface || 'WARNING',
                layer: 'Action',
                snippet: `injects ${edge.target}`,
                message: `Action directly injects concrete Repository (${edge.target}) instead of RepositoryInterface (Dependency Inversion Principle violation).`,
                fix: `Inject ${edge.target}Interface or bind concrete repository via Service Container.`
              });
            }
          }
        }
      }

      // 3. Repository Interface Compliance
      if (node.layer === 'Repository') {
        const implementsEdges = outgoingEdges.filter(e => e.type === 'IMPLEMENTS');
        const hasRepoInterface = implementsEdges.some(e => /RepositoryInterface$|RepositoryContract$/i.test(e.target));
        if (!hasRepoInterface && config.relational?.enforce_repository_interface) {
          violations.push({
            id: `VIO-REL-REPO-IFACE-${Math.random().toString(36).substr(2, 6).toUpperCase()}`,
            file: node.path,
            fileName: node.path.split('/').pop(),
            line: 1,
            rule: 'repository_missing_interface',
            severity: ruleSeverity.repository_missing_interface || 'WARNING',
            layer: 'Repository',
            snippet: `class ${node.className}`,
            message: `Repository ${node.className} does not implement any RepositoryInterface.`,
            fix: `Define and implement ${node.className}Interface to decouple domain actions from storage implementation.`
          });
        }
      }
    }

    // 4. Circular Dependency Detection
    const cycles = this.detectCycles(graph);
    for (const cycle of cycles) {
      const cyclePath = cycle.map(c => c.split('\\').pop()).join(' -> ');
      const startNode = graph.getNode(cycle[0]);
      violations.push({
        id: `VIO-REL-CYCLE-${Math.random().toString(36).substr(2, 6).toUpperCase()}`,
        file: startNode ? startNode.path : cycle[0],
        fileName: startNode ? startNode.path.split('/').pop() : 'Unknown',
        line: 1,
        rule: 'circular_dependency_detected',
        severity: ruleSeverity.circular_dependency_detected || 'ERROR',
        layer: startNode ? startNode.layer : 'Other',
        snippet: cyclePath,
        message: `Circular dependency detected: ${cyclePath}`,
        fix: 'Break circular dependency using Dependency Inversion, Interfaces, or domain Events.'
      });
    }

    return violations;
  }

  /**
   * Helper to guess layer type from class name or FQN
   */
  static guessTypeFromIdentifier(identifier) {
    const id = identifier.toLowerCase();
    if (id.includes('controller')) return 'Controller';
    if (id.includes('request')) return 'FormRequest';
    if (id.includes('dto') || id.includes('data')) return 'DTO';
    if (id.includes('action')) return 'Action';
    if (id.includes('service')) return 'Service';
    if (id.includes('interface') || id.includes('contract')) return 'RepositoryInterface';
    if (id.includes('repository') || id.includes('repo')) return 'Repository';
    if (id.includes('model') || id.includes('entity')) return 'Model';
    if (id.includes('policy')) return 'Policy';
    if (id.includes('resource')) return 'Resource';
    return 'Other';
  }

  /**
   * Detect circular dependencies using DFS
   * @param {RelationalArchitectureGraph} graph 
   * @returns {string[][]} Array of cycle paths
   */
  static detectCycles(graph) {
    const visited = new Set();
    const recStack = new Set();
    const cycles = [];

    const dfs = (currId, path) => {
      visited.add(currId);
      recStack.add(currId);
      path.push(currId);

      const outgoing = graph.getOutgoingEdges(currId);
      for (const edge of outgoing) {
        const nextId = edge.target;
        if (!graph.nodes.has(nextId)) {
          continue; // External or non-analyzed node
        }

        if (!visited.has(nextId)) {
          dfs(nextId, [...path]);
        } else if (recStack.has(nextId)) {
          // Cycle found!
          const cycleStartIdx = path.indexOf(nextId);
          if (cycleStartIdx !== -1) {
            cycles.push([...path.slice(cycleStartIdx), nextId]);
          }
        }
      }

      recStack.delete(currId);
    };

    for (const nodeId of graph.nodes.keys()) {
      if (!visited.has(nodeId)) {
        dfs(nodeId, []);
      }
    }

    return cycles;
  }

  /**
   * Calculate coupling and instability metrics for each node
   * @param {RelationalArchitectureGraph} graph 
   * @returns {object} Coupling telemetry
   */
  static calculateMetrics(graph) {
    const metrics = {};
    for (const [nodeId, node] of graph.nodes.entries()) {
      const outgoing = graph.getOutgoingEdges(nodeId).length; // Ce: Efferent Coupling
      const incoming = graph.getIncomingEdges(nodeId).length; // Ca: Afferent Coupling
      const total = outgoing + incoming;
      const instability = total === 0 ? 0 : parseFloat((outgoing / total).toFixed(2));

      metrics[nodeId] = {
        name: node.className || nodeId.split('\\').pop(),
        layer: node.layer,
        ca: incoming,
        ce: outgoing,
        instability
      };
    }
    return metrics;
  }

  /**
   * Generate clean Mermaid Flowchart diagram of the relational graph
   * @param {RelationalArchitectureGraph} graph 
   * @returns {string} Mermaid diagram markdown string
   */
  static generateMermaidDiagram(graph) {
    if (graph.nodes.size === 0) {
      return '';
    }

    const cleanId = (id) => id.replace(/[^a-zA-Z0-9_]/g, '_');

    let mm = '```mermaid\nflowchart TD\n';
    mm += '    %% Canonical Architecture Flow Graph\n';

    // Group by layer subgraphs
    const layers = {};
    for (const [id, node] of graph.nodes.entries()) {
      const layer = node.layer || 'Other';
      if (!layers[layer]) layers[layer] = [];
      layers[layer].push({ id, node });
    }

    for (const [layerName, nodesList] of Object.entries(layers)) {
      mm += `    subgraph Sub_${cleanId(layerName)} ["Layer: ${layerName}"]\n`;
      for (const { id, node } of nodesList) {
        const cId = cleanId(id);
        const label = node.className || id.split('\\').pop();
        mm += `        ${cId}["${label}"]\n`;
      }
      mm += `    end\n`;
    }

    // Add edges
    for (const edge of graph.edges) {
      const sId = cleanId(edge.source);
      const tId = cleanId(edge.target);
      if (graph.nodes.has(edge.source)) {
        const edgeLabel = edge.type !== 'CALLS' ? `|${edge.type}|` : '';
        mm += `    ${sId} -->${edgeLabel} ${tId}\n`;
      }
    }

    mm += '```\n';
    return mm;
  }
}
