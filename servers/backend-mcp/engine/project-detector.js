/**
 * @file project-detector.js
 * @description Dynamic Workspace & Project Backend Architecture Inspector.
 * Inspects composer.json, package.json, pyproject.toml, go.mod, Cargo.toml, pom.xml,
 * directory structures, and environment files to accurately determine backend language,
 * framework, ORM, database dialect, and architectural design patterns.
 */

import fs from 'node:fs';
import path from 'node:path';

export class ProjectDetector {
  /**
   * Inspect a project directory to extract its backend stack and architecture profile.
   * @param {string} targetDir Project root directory (default: process.cwd())
   * @returns {object} Comprehensive backend profile
   */
  static inspect(targetDir = process.cwd()) {
    const resolvedDir = path.resolve(targetDir);

    const profile = {
      project_path: resolvedDir,
      language: 'unknown',
      framework: 'generic_backend',
      framework_display: 'Generic Backend Service',
      orm: 'none',
      database: 'unknown',
      architecture_style: 'standard_layered',
      detected_layers: [],
      has_tests: false,
      detected_libraries: [],
      recommended_conventions: [],
      summary: 'Generic Backend application.'
    };

    if (!fs.existsSync(resolvedDir)) {
      profile.summary = `Directory does not exist: ${resolvedDir}. Defaulting to generic enterprise backend guidelines.`;
      return profile;
    }

    // Helper file checker
    const fileExists = (relPath) => fs.existsSync(path.join(resolvedDir, relPath));
    const readJson = (relPath) => {
      try {
        const fullPath = path.join(resolvedDir, relPath);
        if (fs.existsSync(fullPath)) {
          return JSON.parse(fs.readFileSync(fullPath, 'utf8'));
        }
      } catch {
        return null;
      }
      return null;
    };
    const readText = (relPath) => {
      try {
        const fullPath = path.join(resolvedDir, relPath);
        if (fs.existsSync(fullPath)) {
          return fs.readFileSync(fullPath, 'utf8');
        }
      } catch {
        return null;
      }
      return null;
    };

    const composerJson = readJson('composer.json');
    const packageJson = readJson('package.json');
    const pyprojectText = readText('pyproject.toml') || readText('requirements.txt') || readText('Pipfile');
    const goModText = readText('go.mod');
    const cargoText = readText('Cargo.toml');
    const pomXmlText = readText('pom.xml') || readText('build.gradle') || readText('build.gradle.kts');

    // 1. PHP Ecosystem (Composer, Laravel, Symfony, Slim, WordPress)
    if (composerJson || fileExists('artisan') || fileExists('composer.json')) {
      profile.language = 'php';
      const requireDeps = { ...(composerJson?.require || {}), ...(composerJson?.['require-dev'] || {}) };

      if (requireDeps['laravel/framework'] || fileExists('artisan')) {
        profile.framework = 'laravel';
        profile.framework_display = 'Laravel';
        profile.orm = 'eloquent';
        profile.recommended_conventions = [
          'Strict Layered Architecture (Form Requests for validation, Services/Actions for logic)',
          'No complex business or query logic inside Controllers',
          'Use Eloquent API Resources for API responses (never return raw models)',
          'Enforce Authorization using Policies and Gates',
          'Database mutations must use standard or tenant migrations'
        ];

        if (requireDeps['spatie/laravel-permission']) profile.detected_libraries.push('spatie-permission');
        if (requireDeps['laravel/sanctum']) profile.detected_libraries.push('sanctum');
        if (requireDeps['laravel/passport']) profile.detected_libraries.push('passport');
        if (requireDeps['livewire/livewire']) profile.detected_libraries.push('livewire');
        if (requireDeps['filament/filament']) profile.detected_libraries.push('filament');
      } else if (requireDeps['symfony/framework-bundle'] || fileExists('bin/console')) {
        profile.framework = 'symfony';
        profile.framework_display = 'Symfony';
        profile.orm = requireDeps['doctrine/orm'] ? 'doctrine' : 'unknown';
        profile.recommended_conventions = [
          'Use Symfony Service Container and Dependency Injection',
          'Doctrine Entity Repositories and DTOs with Validator component',
          'Security Voters for authorization'
        ];
      } else if (requireDeps['slim/slim']) {
        profile.framework = 'slim';
        profile.framework_display = 'Slim Framework (PSR-7/15)';
        profile.recommended_conventions = ['PSR-7 Request/Response handlers with Middleware'];
      } else if (fileExists('wp-config.php') || fileExists('wp-content')) {
        profile.framework = 'wordpress';
        profile.framework_display = 'WordPress / WooCommerce';
        profile.recommended_conventions = ['WordPress Hooks (actions & filters), Nonce verification, WP_Query sanitization'];
      } else {
        profile.framework = 'native_php';
        profile.framework_display = 'PHP (PSR compliant)';
        profile.recommended_conventions = ['PSR-12 coding standard, strict type hints, dependency injection'];
      }
    }
    // 2. Node.js & TypeScript Ecosystem
    else if (packageJson || fileExists('package.json') || fileExists('tsconfig.json')) {
      const isTs = fileExists('tsconfig.json') || !!packageJson?.devDependencies?.typescript || !!packageJson?.dependencies?.typescript;
      profile.language = isTs ? 'typescript' : 'javascript';
      const allPkgDeps = { ...(packageJson?.dependencies || {}), ...(packageJson?.devDependencies || {}) };

      if (allPkgDeps['@nestjs/core']) {
        profile.framework = 'nestjs';
        profile.framework_display = 'NestJS';
        profile.recommended_conventions = [
          'Modular Architecture (@Module, @Injectable Services, @Controller)',
          'DTOs with class-validator and class-transformer',
          'Guards for Authentication/Authorization and Interceptors for response mapping'
        ];
      } else if (allPkgDeps['express']) {
        profile.framework = 'express';
        profile.framework_display = 'Express.js';
        profile.recommended_conventions = [
          'Router-Controller-Service layered pattern',
          'Async error handling middleware',
          'Zod / Joi schema validation'
        ];
      } else if (allPkgDeps['fastify']) {
        profile.framework = 'fastify';
        profile.framework_display = 'Fastify';
        profile.recommended_conventions = ['Fastify plugins, JSON Schema validation, high-throughput async handlers'];
      } else if (allPkgDeps['@adonisjs/core']) {
        profile.framework = 'adonisjs';
        profile.framework_display = 'AdonisJS';
        profile.orm = 'lucid';
        profile.recommended_conventions = ['IoC container, Lucid ORM models, VineJS validators'];
      } else if (allPkgDeps['hono']) {
        profile.framework = 'hono';
        profile.framework_display = 'Hono';
        profile.recommended_conventions = ['Zod validator middleware, lightweight edge/serverless handler pattern'];
      } else if (allPkgDeps['next']) {
        profile.framework = 'nextjs_backend';
        profile.framework_display = 'Next.js API Routes / Server Actions';
        profile.recommended_conventions = ['Server Actions with Zod validation, Route Handlers (app/api/)'];
      }

      // ORM detection for Node/TS
      if (allPkgDeps['@prisma/client'] || fileExists('prisma/schema.prisma')) {
        profile.orm = 'prisma';
        profile.detected_libraries.push('prisma');
      } else if (allPkgDeps['typeorm']) {
        profile.orm = 'typeorm';
        profile.detected_libraries.push('typeorm');
      } else if (allPkgDeps['drizzle-orm']) {
        profile.orm = 'drizzle';
        profile.detected_libraries.push('drizzle');
      } else if (allPkgDeps['mongoose']) {
        profile.orm = 'mongoose';
        profile.database = 'mongodb';
        profile.detected_libraries.push('mongoose');
      } else if (allPkgDeps['sequelize']) {
        profile.orm = 'sequelize';
        profile.detected_libraries.push('sequelize');
      }
    }
    // 3. Python Ecosystem
    else if (pyprojectText || fileExists('manage.py') || fileExists('main.py') || fileExists('requirements.txt')) {
      profile.language = 'python';
      const text = (pyprojectText || '') + (readText('manage.py') || '');

      if (text.includes('fastapi') || fileExists('app/main.py')) {
        profile.framework = 'fastapi';
        profile.framework_display = 'FastAPI';
        profile.recommended_conventions = [
          'Pydantic v2 BaseModels for request/response schemas',
          'FastAPI Dependency Injection (Depends) for auth and DB sessions',
          'Async def endpoints with proper HTTPException handling'
        ];
      } else if (text.includes('django') || fileExists('manage.py')) {
        profile.framework = 'django';
        profile.framework_display = 'Django';
        profile.orm = 'django_orm';
        profile.recommended_conventions = [
          'Django REST Framework (DRF) serializers & ViewSets',
          'Django Models with proper indexes, transactions.atomic()',
          'Custom permissions and ModelPermissions'
        ];
      } else if (text.includes('flask')) {
        profile.framework = 'flask';
        profile.framework_display = 'Flask';
        profile.recommended_conventions = ['Application factory pattern, Flask-SQLAlchemy, Marshmallow/Pydantic schemas'];
      }

      if (text.includes('sqlalchemy')) profile.orm = 'sqlalchemy';
      if (text.includes('tortoise')) profile.orm = 'tortoise';
      if (text.includes('sqlmodel')) profile.orm = 'sqlmodel';
    }
    // 4. Golang Ecosystem
    else if (goModText || fileExists('go.mod')) {
      profile.language = 'go';
      const mod = goModText || '';

      if (mod.includes('gin-gonic/gin')) {
        profile.framework = 'gin';
        profile.framework_display = 'Go (Gin)';
      } else if (mod.includes('gofiber/fiber')) {
        profile.framework = 'fiber';
        profile.framework_display = 'Go (Fiber)';
      } else if (mod.includes('labstack/echo')) {
        profile.framework = 'echo';
        profile.framework_display = 'Go (Echo)';
      } else if (mod.includes('go-chi/chi')) {
        profile.framework = 'chi';
        profile.framework_display = 'Go (Chi)';
      } else {
        profile.framework = 'go_standard';
        profile.framework_display = 'Go (Standard net/http)';
      }

      if (mod.includes('gorm.io/gorm')) profile.orm = 'gorm';
      if (mod.includes('entgo.io/ent')) profile.orm = 'ent';
      if (mod.includes('sqlx')) profile.orm = 'sqlx';

      profile.recommended_conventions = [
        'Idiomatic Go error handling (if err != nil)',
        'Context propagation (ctx context.Context)',
        'Interface decoupling for storage & service layers'
      ];
    }
    // 5. Java / Kotlin Ecosystem
    else if (pomXmlText || fileExists('pom.xml') || fileExists('build.gradle')) {
      profile.language = fileExists('src/main/kotlin') ? 'kotlin' : 'java';
      const xml = pomXmlText || '';

      if (xml.includes('spring-boot')) {
        profile.framework = 'spring_boot';
        profile.framework_display = 'Spring Boot';
        profile.orm = 'spring_data_jpa';
        profile.recommended_conventions = [
          'Controller-Service-Repository 3-tier architecture',
          'Java Records or DTOs with Jakarta Validation (@Valid)',
          '@Transactional service methods and GlobalExceptionHandler (@ControllerAdvice)'
        ];
      }
    }
    // 6. Rust Ecosystem
    else if (cargoText || fileExists('Cargo.toml')) {
      profile.language = 'rust';
      const cargo = cargoText || '';

      if (cargo.includes('actix-web')) {
        profile.framework = 'actix_web';
        profile.framework_display = 'Rust (Actix-web)';
      } else if (cargo.includes('axum')) {
        profile.framework = 'axum';
        profile.framework_display = 'Rust (Axum)';
      }

      if (cargo.includes('diesel')) profile.orm = 'diesel';
      if (cargo.includes('sea-orm')) profile.orm = 'sea_orm';
      if (cargo.includes('sqlx')) profile.orm = 'sqlx';

      profile.recommended_conventions = [
        'Zero-cost abstractions, Result<T, E> error handling',
        'State injection and extractor types',
        'Strict memory safety and ownership paradigms'
      ];
    }

    // Inspect directory layers
    const layerChecks = [
      { name: 'services', paths: ['app/Services', 'src/services', 'services', 'pkg/services'] },
      { name: 'actions', paths: ['app/Actions', 'src/actions', 'actions'] },
      { name: 'repositories', paths: ['app/Repositories', 'src/repositories', 'repositories'] },
      { name: 'controllers', paths: ['app/Http/Controllers', 'src/controllers', 'controllers'] },
      { name: 'dtos', paths: ['app/DTOs', 'app/DataTransferObjects', 'src/dtos', 'src/dto'] },
      { name: 'models', paths: ['app/Models', 'src/models', 'models', 'entities', 'src/entities'] },
      { name: 'requests', paths: ['app/Http/Requests', 'src/requests', 'src/validators'] },
      { name: 'jobs', paths: ['app/Jobs', 'src/jobs', 'src/queues', 'jobs'] },
      { name: 'events', paths: ['app/Events', 'src/events', 'events'] }
    ];

    for (const check of layerChecks) {
      if (check.paths.some(p => fileExists(p))) {
        profile.detected_layers.push(check.name);
      }
    }

    if (profile.detected_layers.includes('services') && profile.detected_layers.includes('repositories')) {
      profile.architecture_style = 'repository_service_pattern';
    } else if (profile.detected_layers.includes('actions')) {
      profile.architecture_style = 'action_domain_pattern';
    } else if (profile.detected_layers.includes('services')) {
      profile.architecture_style = 'service_oriented_layered';
    }

    // Check tests
    profile.has_tests = fileExists('tests') || fileExists('test') || fileExists('__tests__') || fileExists('src/test');

    // Database heuristic detection from .env or docker-compose
    const envText = readText('.env') || readText('.env.example') || '';
    if (envText.includes('DB_CONNECTION=pgsql') || envText.includes('postgres://') || envText.includes('POSTGRES_')) {
      profile.database = 'postgresql';
    } else if (envText.includes('DB_CONNECTION=mysql') || envText.includes('mysql://') || envText.includes('MYSQL_')) {
      profile.database = 'mysql';
    } else if (envText.includes('mariadb')) {
      profile.database = 'mariadb';
    } else if (envText.includes('DB_CONNECTION=sqlite') || envText.includes('.sqlite')) {
      profile.database = 'sqlite';
    }

    // Generate concise summary
    profile.summary = `Detected ${profile.framework_display} (${profile.language.toUpperCase()}) with ${profile.orm !== 'none' ? profile.orm.toUpperCase() + ' ORM' : 'native data layer'}. Architecture: ${profile.architecture_style}. Detected layers: [${profile.detected_layers.join(', ') || 'standard'}].`;

    return profile;
  }
}
