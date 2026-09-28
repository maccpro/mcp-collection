/**
 * @file dynamic-project-introspector.js
 * @description Zero-hardcode project introspector for PHP, Laravel, Node.js, and Full-Stack systems.
 * Dynamically parses composer.json, package.json, phpunit.xml, and framework manifests
 * to establish namespace-to-directory mappings, test suites, multi-tenant migration structures,
 * framework versions, and in-memory mtime caching.
 */

import fs from 'node:fs';
import path from 'node:path';

// In-memory cache for ultra-fast repeated introspections
const introspectionCache = new Map();

export class DynamicProjectIntrospector {
  /**
   * Introspect project structure, autoload rules, and configuration dynamically.
   * @param {string} [repoPath] - Root directory of the repository
   * @param {boolean} [forceReload=false] - Bypass cache
   * @returns {Object} Introspected project architecture map
   */
  static introspect(repoPath = process.cwd(), forceReload = false) {
    const composerPath = path.join(repoPath, 'composer.json');
    const composerMtime = fs.existsSync(composerPath) ? fs.statSync(composerPath).mtimeMs : 0;

    if (!forceReload && introspectionCache.has(repoPath)) {
      const cached = introspectionCache.get(repoPath);
      if (cached._mtime === composerMtime) {
        return cached.data;
      }
    }

    const projectType = this._detectProjectType(repoPath);
    const composerData = this._readComposerJson(composerPath);
    const autoloadMap = this._loadAutoloadMappings(repoPath, composerData);
    const testDirs = this._detectTestDirectories(repoPath, autoloadMap);
    const configDirs = this._detectConfigDirectories(repoPath, autoloadMap);
    const tenantMigrationDirs = this._detectTenantMigrationDirectories(repoPath);
    const frameworkVersions = this._detectFrameworkVersions(composerData);

    const result = {
      repo_path: repoPath,
      project_type: projectType,
      autoload_mappings: autoloadMap,
      test_directories: testDirs,
      config_directories: configDirs,
      tenant_migration_directories: tenantMigrationDirs,
      framework_versions: frameworkVersions,
      is_modular: this._isModularArchitecture(autoloadMap, repoPath)
    };

    introspectionCache.set(repoPath, { _mtime: composerMtime, data: result });
    return result;
  }

  /**
   * Detect project ecosystem
   */
  static _detectProjectType(repoPath) {
    const hasComposer = fs.existsSync(path.join(repoPath, 'composer.json'));
    const hasPackageJson = fs.existsSync(path.join(repoPath, 'package.json'));
    const hasArtisan = fs.existsSync(path.join(repoPath, 'artisan'));

    if (hasArtisan) return 'laravel';
    if (hasComposer) return 'php';
    if (hasPackageJson) return 'node';
    return 'generic';
  }

  static _readComposerJson(composerPath) {
    if (!fs.existsSync(composerPath)) return null;
    try {
      return JSON.parse(fs.readFileSync(composerPath, 'utf8'));
    } catch (e) {
      return null;
    }
  }

  /**
   * Dynamically parse composer.json PSR-4 autoload mappings
   */
  static _loadAutoloadMappings(repoPath, composer) {
    const mappings = [];

    if (composer) {
      // Standard PSR-4
      if (composer.autoload && composer.autoload['psr-4']) {
        for (const [namespace, dirPath] of Object.entries(composer.autoload['psr-4'])) {
          const dirs = Array.isArray(dirPath) ? dirPath : [dirPath];
          for (const d of dirs) {
            mappings.push({
              namespace: namespace.replace(/\\+$/, ''),
              directory: d.replace(/\\/g, '/').replace(/\/+$/, ''),
              is_dev: false
            });
          }
        }
      }

      // Dev PSR-4 (tests, seeders, factories)
      if (composer['autoload-dev'] && composer['autoload-dev']['psr-4']) {
        for (const [namespace, dirPath] of Object.entries(composer['autoload-dev']['psr-4'])) {
          const dirs = Array.isArray(dirPath) ? dirPath : [dirPath];
          for (const d of dirs) {
            mappings.push({
              namespace: namespace.replace(/\\+$/, ''),
              directory: d.replace(/\\/g, '/').replace(/\/+$/, ''),
              is_dev: true
            });
          }
        }
      }
    }

    // Default fallback if no composer.json or empty mappings
    if (mappings.length === 0) {
      if (fs.existsSync(path.join(repoPath, 'app'))) {
        mappings.push({ namespace: 'App', directory: 'app', is_dev: false });
      }
      if (fs.existsSync(path.join(repoPath, 'src'))) {
        mappings.push({ namespace: 'Src', directory: 'src', is_dev: false });
      }
    }

    return mappings;
  }

  /**
   * Dynamically discover test directories from phpunit.xml / pest or filesystem
   */
  static _detectTestDirectories(repoPath, autoloadMap = []) {
    const testDirs = [];

    // 1. Check phpunit.xml / phpunit.xml.dist
    const phpunitFiles = ['phpunit.xml', 'phpunit.xml.dist'];
    for (const xmlFile of phpunitFiles) {
      const xmlPath = path.join(repoPath, xmlFile);
      if (fs.existsSync(xmlPath)) {
        try {
          const xmlContent = fs.readFileSync(xmlPath, 'utf8');
          const dirRegex = /<directory[^>]*>([^<]+)<\/directory>/g;
          let m;
          while ((m = dirRegex.exec(xmlContent)) !== null) {
            const cleanDir = m[1].trim().replace(/^\.\//, '').replace(/\\/g, '/');
            if (fs.existsSync(path.join(repoPath, cleanDir))) {
              testDirs.push(cleanDir);
            }
          }
        } catch (e) {
          // Continue
        }
      }
    }

    // 2. Discover test directories from autoload-dev or module mappings
    for (const map of autoloadMap) {
      if (map.is_dev || map.namespace.toLowerCase().includes('test')) {
        if (fs.existsSync(path.join(repoPath, map.directory))) {
          testDirs.push(map.directory);
        }
      }
      // Check for module-level tests (e.g., modules/Billing/tests or modules/Billing/Tests)
      const moduleTests = [
        path.join(repoPath, map.directory, 'tests'),
        path.join(repoPath, map.directory, 'Tests')
      ];
      for (const mt of moduleTests) {
        if (fs.existsSync(mt)) {
          testDirs.push(path.relative(repoPath, mt).replace(/\\/g, '/'));
        }
      }
    }

    // 3. Fallback filesystem discovery
    if (testDirs.length === 0) {
      const candidates = ['tests', 'test', 'spec'];
      for (const cand of candidates) {
        if (fs.existsSync(path.join(repoPath, cand))) {
          testDirs.push(cand);
        }
      }
    }

    return Array.from(new Set(testDirs));
  }

  /**
   * Detect config directories dynamically
   */
  static _detectConfigDirectories(repoPath, autoloadMap) {
    const configs = [];
    if (fs.existsSync(path.join(repoPath, 'config'))) {
      configs.push('config');
    }

    // Modular configs (e.g. modules/*/config)
    for (const map of autoloadMap) {
      const modConfig = path.join(repoPath, map.directory, 'Config');
      if (fs.existsSync(modConfig)) {
        configs.push(path.relative(repoPath, modConfig).replace(/\\/g, '/'));
      }
    }

    return configs;
  }

  /**
   * Detect tenant-specific migration directories
   */
  static _detectTenantMigrationDirectories(repoPath) {
    const candidates = [
      'database/migrations/tenant',
      'database/migrations/tenants'
    ];
    return candidates.filter(dir => fs.existsSync(path.join(repoPath, dir)));
  }

  /**
   * Detect Laravel and PHP version constraints
   */
  static _detectFrameworkVersions(composer) {
    if (!composer || !composer.require) {
      return { php: null, laravel: null };
    }

    const phpConstraint = composer.require['php'] || null;
    const laravelConstraint = composer.require['laravel/framework'] || null;

    return {
      php: phpConstraint,
      laravel: laravelConstraint
    };
  }

  /**
   * Detect if project uses modular / DDD architecture
   */
  static _isModularArchitecture(autoloadMap, repoPath) {
    const hasModulesDir = fs.existsSync(path.join(repoPath, 'modules')) ||
                          fs.existsSync(path.join(repoPath, 'Modules')) ||
                          fs.existsSync(path.join(repoPath, 'packages'));
    const hasMultipleNamespaces = autoloadMap.filter(m => !m.is_dev).length > 2;
    return hasModulesDir || hasMultipleNamespaces;
  }
}

export default DynamicProjectIntrospector;
