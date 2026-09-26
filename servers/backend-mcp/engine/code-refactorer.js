/**
 * @file code-refactorer.js
 * @description Enterprise Code Refactoring & Logic Explanation Engine.
 * Specializes in SOLID principles, DRY elimination, architectural modularization,
 * performance optimization, and deep business logic / algorithmic explanation.
 */

import { ProviderEngine } from './provider-engine.js';
import { PromptEngine } from './prompt-engine.js';

export class CodeRefactorer {
  /**
   * Refactor backend code based on enterprise architectural guidelines
   */
  static async refactor(code, instruction, profile, options = {}) {
    const focus = options.focus || 'clean_architecture';
    const framework = profile.framework || 'generic_backend';

    const systemPrompt = `You are a Principal Enterprise Software Refactoring Architect.
Your task is to refactor existing backend code to achieve superior code quality, maintainability, and enterprise architecture standards.
Target Focus: ${focus.toUpperCase()}.
Framework: ${framework} (${profile.language || 'backend'}).

Key Directives:
1. Eliminate code duplication (DRY) and extract reusable methods, traits, or service classes.
2. Adhere strictly to SOLID principles and Clean Architecture (no business logic in controllers, proper DTOs, dependency inversion).
3. Preserve existing business logic and contract compatibility while eliminating vulnerabilities and performance bottlenecks.
4. Output the complete refactored code block with concise docblocks explaining key architectural improvements. Minimal conversational chatter.`;

    const userContent = `Existing Code to Refactor:\n\`\`\`\n${code}\n\`\`\`\n\nRefactoring Instructions:\n${instruction || 'Refactor according to enterprise clean architecture standards.'}`;

    const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userContent }
    ];

    const result = await ProviderEngine.complete(messages, options);
    return {
      refactored_code: result.content,
      focus,
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
4. 💥 Blast Radius & Dependency Impact
5. 🛡️ Security & Concurrency Considerations`;

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
