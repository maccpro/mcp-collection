/**
 * @file relational-architecture-engine.js
 * @description Dynamic Relational Architecture Engine for Enterprise Backend Systems.
 * 
 * Provides:
 * - Layer Topology Graph (Presentation -> Application -> Domain -> Persistence -> Infrastructure)
 * - Relational Entity & Model Graph (hasMany, belongsTo, belongsToMany, hasOne, foreign keys)
 * - Multi-Tenancy & Tenant Isolation Introspection (stancl/tenancy, spatie, tenant migrations)
 * - Architectural Pattern Classification (Action-Domain, Repository-Service, Clean/Onion, Modular Monolith)
 * - Layer Boundary & Anti-Pattern Validation (e.g. presentation directly accessing DB or models making HTTP calls)
 * - Dynamic Mermaid Architecture Flowchart Visualization
 * 
 * Zero external dependencies: 100% Node.js standard libraries.
 */

import fs from 'node:fs';
import path from 'node:path';

export class RelationalNode {
  /**
   * @param {object} params
   * @param {string} params.id Unique node identifier
   * @param {string} params.type Node type: 'layer' | 'entity' | 'service' | 'action' | 'controller' | 'request' | 'repository' | 'job'
   * @param {string} [params.path] Source file or directory path
   * @param {object} [params.metadata] Additional structural metadata
   */
  constructor({ id, type, path = '', metadata = {} }) {
    this.id = id;
    this.type = type;
    this.path = path;
    this.metadata = metadata;
  }
}

export class RelationalEdge {
  /**
   * @param {object} params
   * @param {string} params.source Source node ID
   * @param {string} params.target Target node ID
   * @param {string} params.type Relation type: 'CALLS' | 'INJECTS' | 'VALIDATES_WITH' | 'MUTATES' | 'BELONGS_TO' | 'HAS_MANY' | 'MANY_TO_MANY' | 'SCOPED_BY_TENANT'
   * @param {object} [params.metadata] Contextual metadata
   */
  constructor({ source, target, type, metadata = {} }) {
    this.source = source;
    this.target = target;
    this.type = type;
    this.metadata = metadata;
  }
}

export class RelationalArchitectureEngine {
  /**
   * Safe file and directory helper
   */
  static safeExists(p) {
    try {
      return fs.existsSync(p);
    } catch {
      return false;
    }
  }

  /**
   * Safe directory reader returning direct child filenames
   */
  static safeReadDir(dir) {
    try {
      if (fs.existsSync(dir)) {
        return fs.readdirSync(dir);
      }
    } catch {
      return [];
    }
    return [];
  }

  /**
   * Safe UTF-8 file content reader
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
   * Scan project root and build comprehensive Relational Architecture profile
   * @param {string} projectDir Project root directory
   * @returns {object} Comprehensive relational architecture profile
   */
  static inspectArchitecture(projectDir = process.cwd()) {
    const resolvedDir = path.resolve(projectDir);
    const result = {
      project_path: resolvedDir,
      architectural_style: 'standard_layered',
      layers: {
        presentation: { detected: false, paths: [], components_count: 0 },
        application: { detected: false, paths: [], components_count: 0 },
        domain: { detected: false, paths: [], components_count: 0 },
        persistence: { detected: false, paths: [], components_count: 0 },
        infrastructure: { detected: false, paths: [], components_count: 0 }
      },
      entities: [],
      relations: [],
      multi_tenancy: {
        enabled: false,
        framework_package: null,
        mode: 'none', // 'database_per_tenant' | 'single_database_scoped' | 'none'
        tenant_migrations_path: null,
        tenant_models: [],
        isolation_rules: []
      },
      boundary_violations: [],
      mermaid_diagram: '',
      summary: ''
    };

    if (!this.safeExists(resolvedDir)) {
      result.summary = `Directory ${resolvedDir} does not exist.`;
      return result;
    }

    // 1. Inspect Multi-Tenancy Architecture
    this.detectMultiTenancy(resolvedDir, result.multi_tenancy);

    // 2. Discover Layer Topologies
    this.detectLayerTopology(resolvedDir, result.layers);

    // 3. Classify Architectural Pattern
    result.architectural_style = this.classifyArchitectureStyle(result.layers, resolvedDir);

    // 4. Extract Entity Relationships
    this.extractEntityRelationships(resolvedDir, result.entities, result.relations, result.multi_tenancy);

    // 5. Check for Architectural Layer Violations
    result.boundary_violations = this.validateLayerBoundaries(resolvedDir, result.layers);

    // 6. Generate Mermaid Flowchart Diagram
    result.mermaid_diagram = this.generateMermaidDiagram(result);

    // 7. Synthesize Summary
    result.summary = `Architecture: ${result.architectural_style.toUpperCase()} with ${result.entities.length} detected entities and ${result.relations.length} entity relations. Multi-Tenancy: ${result.multi_tenancy.enabled ? result.multi_tenancy.mode : 'disabled'}.`;

    return result;
  }

  /**
   * Detect Multi-Tenancy setup (Laravel Stancl, Spatie, custom tenant migrations)
   */
  static detectMultiTenancy(projectDir, tenantProfile) {
    const composerPath = path.join(projectDir, 'composer.json');
    const composerContent = this.safeReadFile(composerPath);

    // Check tenancy packages
    if (composerContent) {
      if (composerContent.includes('stancl/tenancy')) {
        tenantProfile.enabled = true;
        tenantProfile.framework_package = 'stancl/tenancy';
        tenantProfile.mode = 'database_per_tenant';
      } else if (composerContent.includes('spatie/laravel-multitenancy')) {
        tenantProfile.enabled = true;
        tenantProfile.framework_package = 'spatie/laravel-multitenancy';
        tenantProfile.mode = 'single_database_scoped';
      } else if (composerContent.includes('tenancy/tenancy')) {
        tenantProfile.enabled = true;
        tenantProfile.framework_package = 'tenancy/tenancy';
        tenantProfile.mode = 'database_per_tenant';
      }
    }

    // Check tenant migrations directory
    const tenantMigrationDirs = [
      'database/migrations/tenant',
      'database/migrations/tenants',
      'database/tenant/migrations',
      'src/migrations/tenant'
    ];

    for (const relDir of tenantMigrationDirs) {
      const fullDir = path.join(projectDir, relDir);
      if (this.safeExists(fullDir)) {
        tenantProfile.enabled = true;
        tenantProfile.tenant_migrations_path = relDir;
        if (tenantProfile.mode === 'none') {
          tenantProfile.mode = 'database_per_tenant';
        }
        break;
      }
    }

    // Check tenant models / traits
    const modelsDir = path.join(projectDir, 'app/Models');
    if (this.safeExists(modelsDir)) {
      const modelFiles = this.safeReadDir(modelsDir);
      for (const file of modelFiles) {
        if (!file.endsWith('.php')) continue;
        const code = this.safeReadFile(path.join(modelsDir, file));
        if (
          code.includes('BelongsToTenant') ||
          code.includes('UsesTenantConnection') ||
          code.includes('TenancyScope') ||
          code.includes('$connection = \'tenant\'')
        ) {
          tenantProfile.tenant_models.push(path.basename(file, '.php'));
          tenantProfile.enabled = true;
        }
      }
    }

    if (tenantProfile.enabled) {
      tenantProfile.isolation_rules = [
        'MANDATORY TENANT ISOLATION: All database queries against tenant models must be tenant-scoped.',
        'ZERO DIRECT CROSS-TENANT QUERIES: Never bypass tenant scope or execute raw un-scoped queries on tenant tables.',
        'MIGRATION SEPARATION: Standard global tables belong in database/migrations/, tenant tables strictly belong in ' + (tenantProfile.tenant_migrations_path || 'database/migrations/tenant/'),
        'TENANT CONTEXT ENFORCEMENT: Operations altering tenant data must verify active tenant context before execution.'
      ];
    }
  }

  /**
   * Introspect Layer Topology across backend frameworks
   */
  static detectLayerTopology(projectDir, layers) {
    const layerDefs = {
      presentation: [
        'app/Http/Controllers',
        'src/controllers',
        'src/interfaces/http',
        'routes',
        'pkg/handlers'
      ],
      application: [
        'app/Http/Requests',
        'app/DTOs',
        'app/DataTransferObjects',
        'src/dtos',
        'src/dto',
        'src/application',
        'app/Http/Resources'
      ],
      domain: [
        'app/Services',
        'app/Actions',
        'src/services',
        'src/actions',
        'src/domain',
        'pkg/services',
        'app/Events',
        'app/Listeners'
      ],
      persistence: [
        'app/Models',
        'src/models',
        'src/entities',
        'app/Repositories',
        'src/repositories',
        'database/migrations'
      ],
      infrastructure: [
        'app/Jobs',
        'src/jobs',
        'app/Notifications',
        'app/Mail',
        'src/infrastructure'
      ]
    };

    for (const [layerKey, candidatePaths] of Object.entries(layerDefs)) {
      for (const relPath of candidatePaths) {
        const fullPath = path.join(projectDir, relPath);
        if (this.safeExists(fullPath)) {
          layers[layerKey].detected = true;
          layers[layerKey].paths.push(relPath);
          const entries = this.safeReadDir(fullPath);
          layers[layerKey].components_count += entries.filter(f => !f.startsWith('.')).length;
        }
      }
    }
  }

  /**
   * Classify Architectural Pattern based on detected layers and file structures
   */
  static classifyArchitectureStyle(layers, projectDir) {
    const hasActions = layers.domain.paths.some(p => p.toLowerCase().includes('actions'));
    const hasServices = layers.domain.paths.some(p => p.toLowerCase().includes('services'));
    const hasRepositories = layers.persistence.paths.some(p => p.toLowerCase().includes('repositories'));
    const hasDomainDir = this.safeExists(path.join(projectDir, 'src/domain')) || this.safeExists(path.join(projectDir, 'app/Domain'));
    const hasModulesDir = this.safeExists(path.join(projectDir, 'modules')) || this.safeExists(path.join(projectDir, 'app/Modules'));

    if (hasDomainDir) return 'domain_driven_design';
    if (hasModulesDir) return 'modular_monolith';
    if (hasActions && !hasRepositories) return 'action_domain_pattern';
    if (hasServices && hasRepositories) return 'repository_service_pattern';
    if (hasServices) return 'service_oriented_layered';
    if (layers.presentation.detected && layers.persistence.detected) return 'classic_mvc';

    return 'standard_layered';
  }

  /**
   * Extract Entity Models & Relationships heuristically from Model files
   */
  static extractEntityRelationships(projectDir, entities, relations, tenantProfile) {
    const modelCandidates = [
      path.join(projectDir, 'app/Models'),
      path.join(projectDir, 'src/models'),
      path.join(projectDir, 'src/entities'),
      path.join(projectDir, 'entities')
    ];

    let targetModelDir = null;
    for (const cand of modelCandidates) {
      if (this.safeExists(cand)) {
        targetModelDir = cand;
        break;
      }
    }

    if (!targetModelDir) return;

    const files = this.safeReadDir(targetModelDir);
    for (const file of files) {
      if (!file.endsWith('.php') && !file.endsWith('.ts') && !file.endsWith('.js') && !file.endsWith('.py')) continue;

      const entityName = path.basename(file, path.extname(file));
      const filePath = path.join(targetModelDir, file);
      const content = this.safeReadFile(filePath);
      if (!content) continue;

      const isTenant = tenantProfile.tenant_models.includes(entityName) ||
        content.includes('BelongsToTenant') ||
        content.includes('UsesTenantConnection');

      entities.push({
        name: entityName,
        file: path.relative(projectDir, filePath).replace(/\\/g, '/'),
        is_tenant: isTenant
      });

      // 1. PHP / Eloquent Relationships
      if (file.endsWith('.php')) {
        // hasMany, hasOne, belongsTo, belongsToMany, morphMany
        const relRegex = /public\s+function\s+([a-zA-Z0-9_]+)\s*\([^)]*\)\s*(?::\s*[^{]+)?\s*\{[^}]*return\s+\$this->(hasMany|belongsTo|hasOne|belongsToMany|morphMany|morphTo)\s*\(\s*([a-zA-Z0-9_:\\]+)/g;
        let match;
        while ((match = relRegex.exec(content)) !== null) {
          const method = match[1];
          const relType = match[2];
          let targetRaw = match[3];
          let target = targetRaw.split('::')[0].split('\\').pop();

          if (target && target !== 'class' && target !== '$this') {
            relations.push({
              source: entityName,
              target,
              method,
              type: relType,
              is_tenant_scoped: isTenant
            });
          }
        }
      }

      // 2. TypeScript / Prisma / TypeORM Relationships
      if (file.endsWith('.ts') || file.endsWith('.js')) {
        const typeOrmRegex = /@(OneToMany|ManyToOne|ManyToMany|OneToOne)\s*\(\s*\(\)\s*=>\s*([a-zA-Z0-9_]+)/g;
        let match;
        while ((match = typeOrmRegex.exec(content)) !== null) {
          const relType = match[1];
          const target = match[2];
          relations.push({
            source: entityName,
            target,
            type: relType,
            is_tenant_scoped: isTenant
          });
        }
      }

      // 3. Python / SQLAlchemy / Django Relationships
      if (file.endsWith('.py')) {
        const pyRelRegex = /([a-zA-Z0-9_]+)\s*=\s*(?:relationship|ForeignKey)\s*\(\s*['"]([a-zA-Z0-9_]+)['"]/g;
        let match;
        while ((match = pyRelRegex.exec(content)) !== null) {
          const attr = match[1];
          const target = match[2];
          relations.push({
            source: entityName,
            target,
            attribute: attr,
            type: 'relationship',
            is_tenant_scoped: isTenant
          });
        }
      }
    }
  }

  /**
   * Validate layer boundaries and detect cross-layer violations in existing controllers
   */
  static validateLayerBoundaries(projectDir, layers) {
    const violations = [];
    const controllerPaths = layers.presentation.paths.map(p => path.join(projectDir, p));

    for (const ctrlDir of controllerPaths) {
      if (!this.safeExists(ctrlDir)) continue;
      const files = this.safeReadDir(ctrlDir);

      for (const file of files) {
        if (!file.endsWith('.php') && !file.endsWith('.ts') && !file.endsWith('.js')) continue;
        const filePath = path.join(ctrlDir, file);
        const code = this.safeReadFile(filePath);
        const relPath = path.relative(projectDir, filePath).replace(/\\/g, '/');

        // Check for raw SQL or DB::raw in controllers
        if (/(?:DB::raw|whereRaw|DB::select|DB::statement|\.query\s*\()/i.test(code)) {
          violations.push({
            file: relPath,
            severity: 'HIGH',
            rule: 'LAYER_VIOLATION_RAW_SQL_IN_CONTROLLER',
            description: `Controller ${file} executes raw database queries. Database operations must be encapsulated within Services, Repositories, or Actions.`
          });
        }

        // Check for external HTTP client calls in controllers
        if (/(?:Http::get|Http::post|Http::asJson|curl_init|axios\.(?:get|post)|fetch\s*\()/i.test(code)) {
          violations.push({
            file: relPath,
            severity: 'MEDIUM',
            rule: 'LAYER_VIOLATION_HTTP_CLIENT_IN_CONTROLLER',
            description: `Controller ${file} makes external HTTP requests directly. External integrations must be delegated to dedicated Services or Clients.`
          });
        }
      }
    }

    return violations;
  }

  /**
   * Generate Mermaid representation of the relational architecture
   */
  static generateMermaidDiagram(profile) {
    let diagram = '```mermaid\nflowchart TD\n';
    diagram += '  subgraph Presentation ["Presentation Layer"]\n';
    diagram += '    Routes["Routes / API Endpoints"]\n';
    diagram += '    Controllers["Controllers / Handlers"]\n';
    diagram += '  end\n\n';

    diagram += '  subgraph Application ["Application Layer"]\n';
    diagram += '    Requests["FormRequests / DTOs / Schemas"]\n';
    diagram += '    Resources["API Resources / Transformers"]\n';
    diagram += '  end\n\n';

    diagram += '  subgraph Domain ["Domain / Business Layer"]\n';
    if (profile.architectural_style === 'action_domain_pattern') {
      diagram += '    Actions["Invokable Actions"]\n';
    } else {
      diagram += '    Services["Domain Services"]\n';
    }
    diagram += '    Events["Domain Events & Listeners"]\n';
    diagram += '  end\n\n';

    diagram += '  subgraph Persistence ["Persistence & Data Layer"]\n';
    diagram += `    Models["Models / Entities (${profile.entities.length} detected)"]\n`;
    if (profile.multi_tenancy.enabled) {
      diagram += `    TenantDB[("Tenant Scoped DB: ${profile.multi_tenancy.tenant_models.length} models")]\n`;
      diagram += '    CentralDB[("Central / System DB")]\n';
    } else {
      diagram += '    Database[("Database")]\n';
    }
    diagram += '  end\n\n';

    diagram += '  Routes --> Requests --> Controllers\n';
    if (profile.architectural_style === 'action_domain_pattern') {
      diagram += '  Controllers --> Actions --> Models\n';
    } else {
      diagram += '  Controllers --> Services --> Models\n';
    }
    diagram += '  Models --> Resources\n';

    if (profile.multi_tenancy.enabled) {
      diagram += '  Models --> TenantDB\n';
      diagram += '  Models --> CentralDB\n';
    } else {
      diagram += '  Models --> Database\n';
    }

    diagram += '```';
    return diagram;
  }
}
