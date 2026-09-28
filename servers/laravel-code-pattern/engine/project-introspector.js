import fs from 'node:fs';
import path from 'node:path';

/**
 * Dynamic Project Introspector & Topology Detector
 * Introspects workspace/project structure, composer dependencies, multi-tenancy configurations,
 * and loads optional project-level custom configurations (.laravel-pattern.json).
 */
export class ProjectIntrospector {
  /**
   * Find project root by searching upwards for artisan or composer.json
   * @param {string} startPath Starting directory or file path
   * @returns {string|null} Absolute project root path or null
   */
  static findProjectRoot(startPath) {
    if (!startPath) return null;

    let current = path.resolve(startPath);
    try {
      if (fs.existsSync(current) && fs.statSync(current).isFile()) {
        current = path.dirname(current);
      }
    } catch {
      return null;
    }

    const { root } = path.parse(current);
    while (current && current !== root) {
      if (fs.existsSync(path.join(current, 'artisan')) || fs.existsSync(path.join(current, 'composer.json'))) {
        return current;
      }
      current = path.dirname(current);
    }

    return null;
  }

  /**
   * Read and parse composer.json if present
   * @param {string} projectRoot 
   * @returns {object|null}
   */
  static readComposerJson(projectRoot) {
    if (!projectRoot) return null;
    const composerPath = path.join(projectRoot, 'composer.json');
    try {
      if (fs.existsSync(composerPath)) {
        return JSON.parse(fs.readFileSync(composerPath, 'utf8'));
      }
    } catch {
      return null;
    }
    return null;
  }

  /**
   * Detect multi-tenancy architecture
   * @param {string} projectRoot 
   * @param {object|null} composerJson 
   * @param {object} config 
   * @returns {object} Tenancy discovery metadata
   */
  static detectMultiTenancy(projectRoot, composerJson = null, config = {}) {
    const result = {
      isMultiTenant: false,
      framework: null, // 'stancl/tenancy' | 'spatie/laravel-multitenancy' | 'custom'
      tenantMigrationPaths: [],
      centralMigrationPaths: []
    };

    if (!projectRoot) return result;

    const composerDeps = {
      ...(composerJson?.require || {}),
      ...(composerJson?.['require-dev'] || {})
    };

    if (composerDeps['stancl/tenancy']) {
      result.isMultiTenant = true;
      result.framework = 'stancl/tenancy';
    } else if (composerDeps['spatie/laravel-multitenancy']) {
      result.isMultiTenant = true;
      result.framework = 'spatie/laravel-multitenancy';
    } else if (composerDeps['tenancy/tenancy']) {
      result.isMultiTenant = true;
      result.framework = 'tenancy/tenancy';
    }

    // Check directory markers for tenant migrations
    const candidateTenantDirs = config.multi_tenancy?.tenant_migration_dirs || [
      'database/migrations/tenant',
      'database/migrations/tenants'
    ];

    for (const relDir of candidateTenantDirs) {
      const fullDir = path.join(projectRoot, relDir);
      if (fs.existsSync(fullDir)) {
        result.isMultiTenant = true;
        result.tenantMigrationPaths.push(relDir.replace(/\\/g, '/'));
        if (!result.framework) {
          result.framework = 'custom';
        }
      }
    }

    const candidateCentralDirs = config.multi_tenancy?.central_migration_dirs || ['database/migrations'];
    for (const relDir of candidateCentralDirs) {
      const fullDir = path.join(projectRoot, relDir);
      if (fs.existsSync(fullDir)) {
        result.centralMigrationPaths.push(relDir.replace(/\\/g, '/'));
      }
    }

    return result;
  }

  /**
   * Classify project architectural style
   * @param {string} projectRoot 
   * @param {object|null} composerJson 
   * @returns {string} 'modular_monolith' | 'clean_ddd' | 'standard_layered' | 'custom'
   */
  static classifyStyle(projectRoot, composerJson = null) {
    if (!projectRoot) return 'standard_layered';

    const composerDeps = {
      ...(composerJson?.require || {}),
      ...(composerJson?.['require-dev'] || {})
    };

    // 1. Modular Monolith
    if (
      fs.existsSync(path.join(projectRoot, 'app', 'Modules')) ||
      fs.existsSync(path.join(projectRoot, 'Modules')) ||
      composerDeps['nwidart/laravel-modules']
    ) {
      return 'modular_monolith';
    }

    // 2. Clean Domain-Driven Design (DDD)
    if (
      fs.existsSync(path.join(projectRoot, 'src', 'Domain')) ||
      fs.existsSync(path.join(projectRoot, 'app', 'Domain'))
    ) {
      return 'clean_ddd';
    }

    // 3. Standard Layered Laravel
    if (
      fs.existsSync(path.join(projectRoot, 'app', 'Http', 'Controllers')) &&
      fs.existsSync(path.join(projectRoot, 'app', 'Models'))
    ) {
      return 'standard_layered';
    }

    return 'standard_layered';
  }

  /**
   * Load custom project configuration (.laravel-pattern.json or laravel-pattern.json)
   * @param {string} projectRoot 
   * @returns {object|null}
   */
  static loadCustomConfig(projectRoot) {
    if (!projectRoot) return null;

    const candidates = [
      path.join(projectRoot, '.laravel-pattern.json'),
      path.join(projectRoot, 'laravel-pattern.json'),
      path.join(projectRoot, '.architecture.json')
    ];

    for (const filePath of candidates) {
      if (fs.existsSync(filePath)) {
        try {
          return JSON.parse(fs.readFileSync(filePath, 'utf8'));
        } catch {
          // Ignore invalid JSON and continue
        }
      }
    }

    return null;
  }

  /**
   * Deep merge configuration objects
   * @param {object} base 
   * @param {object} override 
   * @returns {object} Merged config
   */
  static mergeConfig(base, override) {
    if (!override) return JSON.parse(JSON.stringify(base));

    const result = JSON.parse(JSON.stringify(base));

    for (const key of Object.keys(override)) {
      if (
        override[key] &&
        typeof override[key] === 'object' &&
        !Array.isArray(override[key]) &&
        result[key] &&
        typeof result[key] === 'object' &&
        !Array.isArray(result[key])
      ) {
        result[key] = this.mergeConfig(result[key], override[key]);
      } else {
        result[key] = override[key];
      }
    }

    return result;
  }

  /**
   * Introspect full project context
   * @param {string} targetPath File or workspace path
   * @param {object} baseConfig Base configuration
   * @returns {object} Full introspection profile
   */
  static introspect(targetPath, baseConfig = {}) {
    const projectRoot = this.findProjectRoot(targetPath) || (targetPath ? path.resolve(targetPath) : process.cwd());
    const composerJson = this.readComposerJson(projectRoot);
    const style = this.classifyStyle(projectRoot, composerJson);
    const tenancy = this.detectMultiTenancy(projectRoot, composerJson, baseConfig);
    const customConfig = this.loadCustomConfig(projectRoot);
    const mergedConfig = this.mergeConfig(baseConfig, customConfig);

    // Extract PSR-4 autoload map
    const psr4 = {
      ...(composerJson?.autoload?.['psr-4'] || {}),
      ...(composerJson?.['autoload-dev']?.['psr-4'] || {})
    };

    return {
      projectRoot: projectRoot.replace(/\\/g, '/'),
      projectType: style,
      isMultiTenant: tenancy.isMultiTenant,
      tenancy,
      psr4,
      config: mergedConfig,
      hasCustomConfig: customConfig !== null
    };
  }
}
