/**
 * @file code-refactorer.js
 * @description Enterprise Code Refactoring & Logic Explanation Engine.
 * 
 * Provides:
 * - Dynamic Architectural Refactoring Blueprints (Controller-to-Action, DTO extraction, Transaction Wrapping, N+1 elimination)
 * - Relational Context & Layer Path Injection (respects project's existing namespaces and structure)
 * - SOLID Principles & Zero Duplicate Code (DRY) Enforcement
 * - Deep Business Logic, State Machine & Blast Radius Analysis
 * 
 * Zero external dependencies: 100% Node.js standard libraries.
 */

import { ProviderEngine } from './provider-engine.js';

export class CodeRefactorer {
  /**
   * Get pre-computed architectural refactoring guidelines based on focus and project profile
   */
  static getRefactoringBlueprint(focus, profile) {
    const style = profile.architectural_style || 'standard_layered';
    const isMultiTenant = profile.multi_tenancy?.enabled || false;

    let blueprint = '';

    switch (focus) {
      case 'clean_architecture':
      case 'solid':
        blueprint = `
[ARCHITECTURAL BLUEPRINT: SOLID & CLEAN ARCHITECTURE]
1. CONTROLLER RESPONSIBILITY: If refactoring a Controller, strictly decouple presentation from business logic.
   - Extract validation into dedicated Form Request classes.
   - Extract domain operations into ${style === 'action_domain_pattern' ? 'Invokable Action classes (app/Actions)' : 'dedicated Service classes (app/Services)'}.
   - Return data through dedicated API Resource / Transformer classes.
2. DEPENDENCY INVERSION: Depend on abstractions or inject services via constructor/method dependency injection.
3. SINGLE RESPONSIBILITY: Ensure every class has exactly one reason to change.
`;
        break;

      case 'performance':
        blueprint = `
[ARCHITECTURAL BLUEPRINT: PERFORMANCE & DATABASE OPTIMIZATION]
1. ELIMINATE N+1 QUERIES: Convert queries inside iteration loops to eager loading (e.g. with(['relation'])) or batch key fetching (whereIn).
2. INDEX-AWARE LOOKUPS: Ensure WHERE clauses leverage indexed columns and composite ESR (Equality, Sort, Range) order.
3. UNBOUNDED QUERY PROTECTION: Always enforce pagination (paginate()) or chunking (chunkById()) on large tables.
4. SELECT SPECIFIC COLUMNS: Avoid SELECT * on wide tables; specify only required attributes.
`;
        break;

      case 'security':
        blueprint = `
[ARCHITECTURAL BLUEPRINT: DEFENSIVE SECURITY & INTEGRITY]
1. PARAMETERIZED QUERIES: Eliminate raw string concatenations in database queries.
2. STRICT INPUT VALIDATION: Enforce whitelist validation; eliminate mass assignment vulnerabilities.
3. ATOMIC TRANSACTIONS: Wrap all multi-entity mutations inside DB::transaction(function () { ... }) to ensure rollback on failure.
${isMultiTenant ? '4. TENANT ISOLATION: Enforce tenant scoping on all operations; never expose cross-tenant data.\n' : ''}`;
        break;

      case 'dry':
        blueprint = `
[ARCHITECTURAL BLUEPRINT: ZERO DUPLICATE CODE (DRY)]
1. EXTRACT REUSABLE LOGIC: Consolidate repeated calculations, formatting, or validation rules into reusable Traits, Enums, or Helper services.
2. SINGLE SOURCE OF TRUTH: Define constants, statuses, and business states in dedicated Domain Enums or Value Objects.
`;
        break;

      default:
        blueprint = `
[ARCHITECTURAL BLUEPRINT: ENTERPRISE REFACTORING]
1. Ensure separation of concerns across presentation, domain, and persistence layers.
2. Maintain backward compatibility of external contracts and APIs.
`;
        break;
    }

    if (isMultiTenant) {
      blueprint += `\n[MULTI-TENANCY MANDATE]: Project is Multi-Tenant (${profile.multi_tenancy?.mode || 'tenant_scoped'}). Preserve tenant isolation boundaries at all times.\n`;
    }

    return blueprint;
  }

  /**
   * Refactor backend code based on enterprise architectural guidelines and blueprints
   */
  static async refactor(code, instruction, profile, options = {}) {
    const focus = options.focus || 'clean_architecture';
    const framework = profile.framework || 'generic_backend';
    const blueprint = this.getRefactoringBlueprint(focus, profile);

    const systemPrompt = `You are a Principal Enterprise Software Refactoring Architect.
Your task is to refactor existing backend code to achieve superior code quality, maintainability, performance, and enterprise architecture standards.
Target Focus: ${focus.toUpperCase()}.
Target Framework: ${framework} (${profile.language || 'backend'}).
Architecture Pattern: ${(profile.architectural_style || 'standard_layered').toUpperCase()}.

${blueprint}

Key Directives:
1. Eliminate code duplication (DRY) and extract reusable methods, traits, or service classes.
2. Adhere strictly to SOLID principles and Clean Architecture (no business logic in controllers, proper DTOs, dependency inversion).
3. Preserve existing business logic and contract compatibility while eliminating vulnerabilities and performance bottlenecks.
4. Output the complete refactored code block with concise docblocks explaining key architectural improvements. Minimal conversational chatter.`;

    let userContent = `Existing Code to Refactor:\n\`\`\`\n${code}\n\`\`\`\n\n`;
    if (instruction) {
      userContent += `Specific Refactoring Instructions:\n${instruction.trim()}\n\n`;
    }

    if (profile.detected_layers && profile.detected_layers.length > 0) {
      userContent += `Detected Project Layers: [${profile.detected_layers.join(', ')}]\n`;
    }

    const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userContent }
    ];

    const result = await ProviderEngine.complete(messages, options);
    return {
      refactored_code: result.content,
      focus,
      architectural_style: profile.architectural_style,
      provider: result.provider,
      model: result.model
    };
  }

  /**
   * Explain complex business logic, state machines, and algorithmic flow
   */
  static async explain(code, context = null, options = {}) {
    const focus = options.focus || 'flow';

    const systemPrompt = `You are a Principal Backend Systems Analyst.
Your task is to analyze and clearly explain the provided backend logic, algorithms, state machines, and business rules.
Focus Area: ${focus.toUpperCase()} (options: flow, edge_cases, blast_radius, security, performance).

Provide a comprehensive, crystal-clear explanation structured as:
1. 🎯 High-Level Purpose & Responsibility
2. 🔄 Step-by-Step Flow / Sequence
3. ⚠️ Edge Cases, Failure Modes & Boundary Conditions
4. 💥 Blast Radius & Dependency Impact (Affected callers, database entities, and downstream services)
5. 🛡️ Security & Concurrency Considerations (Race conditions, transaction isolation, idempotency)`;

    let userContent = `Backend Code / Logic to Explain:\n\`\`\`\n${code}\n\`\`\``;
    if (context) {
      userContent += `\n\nSurrounding Context / Database Schema / Architecture:\n\`\`\`\n${context}\n\`\`\``;
    }

    const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userContent }
    ];

    const result = await ProviderEngine.complete(messages, options);
    return {
      explanation: result.content,
      focus,
      provider: result.provider,
      model: result.model
    };
  }
}
