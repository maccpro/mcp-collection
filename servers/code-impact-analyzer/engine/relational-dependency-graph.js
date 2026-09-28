/**
 * @file relational-dependency-graph.js
 * @description Dynamic Relational Dependency Graph for Enterprise Code Impact Analysis.
 * Models code entities and database artifacts as a typed directed graph with
 * cycle-safe BFS/DFS transitive traversal, bidirectional impact resolution,
 * path tracing, and Mermaid visualization.
 */

export class DependencyNode {
  /**
   * @param {Object} params
   * @param {string} params.id - Unique node identifier (e.g. file path, symbol, or table:column)
   * @param {string} params.type - Entity type ('file', 'class', 'method', 'table', 'column', 'event', 'listener', 'job')
   * @param {string} [params.path] - File path associated with the entity
   * @param {Object} [params.metadata] - Additional structural metadata
   */
  constructor({ id, type = 'file', path = '', metadata = {} }) {
    this.id = id;
    this.type = type;
    this.path = path || id;
    this.metadata = metadata;
  }
}

export class DependencyEdge {
  /**
   * @param {Object} params
   * @param {string} params.source - Source node ID (caller / dependent)
   * @param {string} params.target - Target node ID (callee / dependency)
   * @param {string} params.type - Relation type ('CALLS', 'INHERITS', 'IMPLEMENTS', 'USES_TRAIT', 'DISPATCHES', 'LISTENS_TO', 'INJECTS', 'FOREIGN_KEY', 'QUERIES_COLUMN', 'COUPLED_TEST')
   * @param {number} [params.weight=1.0] - Impact weight
   * @param {Object} [params.metadata] - Contextual metadata
   */
  constructor({ source, target, type, weight = 1.0, metadata = {} }) {
    this.source = source;
    this.target = target;
    this.type = type;
    this.weight = weight;
    this.metadata = metadata;
  }
}

export class RelationalDependencyGraph {
  constructor() {
    /** @type {Map<string, DependencyNode>} */
    this.nodes = new Map();
    /** @type {Map<string, DependencyEdge[]>} Outgoing edges: source -> edges */
    this.outgoing = new Map();
    /** @type {Map<string, DependencyEdge[]>} Incoming edges: target -> edges (callers) */
    this.incoming = new Map();
  }

  /**
   * Add a node to the graph or return existing
   */
  addNode(id, type = 'file', path = '', metadata = {}) {
    if (!this.nodes.has(id)) {
      this.nodes.set(id, new DependencyNode({ id, type, path, metadata }));
      this.outgoing.set(id, []);
      this.incoming.set(id, []);
    }
    return this.nodes.get(id);
  }

  /**
   * Add a typed directed edge between source and target
   */
  addEdge(source, target, type = 'CALLS', weight = 1.0, metadata = {}) {
    if (!this.nodes.has(source)) this.addNode(source);
    if (!this.nodes.has(target)) this.addNode(target);

    // Prevent duplicate edges of identical type
    const existingOut = this.outgoing.get(source) || [];
    const duplicate = existingOut.some(e => e.target === target && e.type === type);
    if (duplicate) return;

    const edge = new DependencyEdge({ source, target, type, weight, metadata });
    this.outgoing.get(source).push(edge);
    this.incoming.get(target).push(edge);
  }

  getNode(id) {
    return this.nodes.get(id);
  }

  hasNode(id) {
    return this.nodes.has(id);
  }

  getIncomingEdges(targetId) {
    return this.incoming.get(targetId) || [];
  }

  getOutgoingEdges(sourceId) {
    return this.outgoing.get(sourceId) || [];
  }

  /**
   * Cycle-safe Breadth-First Search (BFS) for Transitive Blast Radius.
   * @param {Object} options
   * @param {string[]} options.startNodes - Origin node IDs
   * @param {number} [options.maxDepth=3] - Maximum traversal depth
   * @param {'upstream'|'downstream'} [options.direction='upstream'] - 'upstream' finds callers (incoming), 'downstream' finds dependencies (outgoing)
   * @param {string[]} [options.edgeTypes] - Filter edges by relation type
   * @returns {Object} Traversal result with tiered depth sets and trace paths
   */
  traverseBFS({ startNodes = [], maxDepth = 3, direction = 'upstream', edgeTypes = null }) {
    const visited = new Set();
    const depthLevels = new Map(); // depth -> Set of node IDs
    const paths = new Map(); // node ID -> path from start node
    const edgesTraversed = [];

    for (let d = 0; d <= maxDepth; d++) {
      depthLevels.set(d, new Set());
    }

    const queue = [];

    // Initialize origins (Depth 0)
    for (const node of startNodes) {
      if (!visited.has(node)) {
        visited.add(node);
        depthLevels.get(0).add(node);
        paths.set(node, [node]);
        queue.push({ id: node, depth: 0 });
      }
    }

    while (queue.length > 0) {
      const { id, depth } = queue.shift();
      if (depth >= maxDepth) continue;

      const edges = direction === 'upstream'
        ? this.getIncomingEdges(id)
        : this.getOutgoingEdges(id);

      for (const edge of edges) {
        if (edgeTypes && !edgeTypes.includes(edge.type)) continue;

        const nextNodeId = direction === 'upstream' ? edge.source : edge.target;

        edgesTraversed.push(edge);

        if (!visited.has(nextNodeId)) {
          visited.add(nextNodeId);
          const nextDepth = depth + 1;
          depthLevels.get(nextDepth).add(nextNodeId);

          const currentPath = paths.get(id) || [id];
          paths.set(nextNodeId, [...currentPath, nextNodeId]);

          queue.push({ id: nextNodeId, depth: nextDepth });
        }
      }
    }

    return {
      origins: Array.from(depthLevels.get(0)),
      level_1: Array.from(depthLevels.get(1)),
      level_2: maxDepth >= 2 ? Array.from(depthLevels.get(2)) : [],
      level_3: maxDepth >= 3 ? Array.from(depthLevels.get(3)) : [],
      all_affected: Array.from(visited),
      total_affected_count: visited.length,
      paths: Object.fromEntries(paths),
      edges_traversed: edgesTraversed
    };
  }

  /**
   * Find shortest path between two nodes
   */
  findPath(source, target) {
    if (source === target) return [source];
    const visited = new Set([source]);
    const queue = [[source]];

    while (queue.length > 0) {
      const path = queue.shift();
      const current = path[path.length - 1];

      const edges = this.getIncomingEdges(current);
      for (const edge of edges) {
        const next = edge.source;
        if (next === target) {
          return [...path, next];
        }
        if (!visited.has(next)) {
          visited.add(next);
          queue.push([...path, next]);
        }
      }
    }

    return null;
  }

  /**
   * Generate an enhanced Mermaid graph with relation types and tiered styling
   */
  toMermaid({ origins = [], level1 = [], level2 = [], maxNodes = 25 } = {}) {
    let m = 'flowchart TD\n';
    m += '    classDef origin fill:#ef4444,stroke:#b91c1c,color:#ffffff,stroke-width:2px;\n';
    m += '    classDef l1 fill:#f97316,stroke:#c2410c,color:#ffffff;\n';
    m += '    classDef l2 fill:#3b82f6,stroke:#1d4ed8,color:#ffffff;\n';
    m += '    classDef general fill:#64748b,stroke:#475569,color:#ffffff;\n\n';

    const cleanId = (str) => 'n_' + str.replace(/[^a-zA-Z0-9_]/g, '_').slice(-30);
    const shortLabel = (str) => {
      const parts = str.split(/[\\/]/);
      return parts[parts.length - 1];
    };

    const renderedNodes = new Set();

    // Render Origins
    origins.forEach((nodeId) => {
      const cid = cleanId(nodeId);
      m += `    ${cid}["🎯 ${shortLabel(nodeId)}"]:::origin\n`;
      renderedNodes.add(nodeId);
    });

    // Render Level 1
    level1.slice(0, maxNodes).forEach((nodeId) => {
      const cid = cleanId(nodeId);
      m += `    ${cid}["⚠️ ${shortLabel(nodeId)}"]:::l1\n`;
      renderedNodes.add(nodeId);
    });

    // Render Level 2
    level2.slice(0, 10).forEach((nodeId) => {
      const cid = cleanId(nodeId);
      m += `    ${cid}["📦 ${shortLabel(nodeId)}"]:::l2\n`;
      renderedNodes.add(nodeId);
    });

    // Connect edges between rendered nodes
    const renderedEdges = new Set();
    for (const nodeId of renderedNodes) {
      const incoming = this.getIncomingEdges(nodeId);
      for (const edge of incoming) {
        if (renderedNodes.has(edge.source)) {
          const edgeKey = `${edge.source}->${edge.target}`;
          if (!renderedEdges.has(edgeKey)) {
            renderedEdges.add(edgeKey);
            const sourceCid = cleanId(edge.source);
            const targetCid = cleanId(edge.target);
            const relText = edge.type !== 'CALLS' ? `|${edge.type}|` : '';
            m += `    ${sourceCid} -->${relText} ${targetCid}\n`;
          }
        }
      }
    }

    return m;
  }
}

export default RelationalDependencyGraph;
