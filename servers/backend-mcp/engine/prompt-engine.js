/**
 * @file prompt-engine.js
 * @description Dynamic Framework Persona & Architectural Prompt Synthesis.
 * Automatically injects framework-specific enterprise conventions, design patterns,
 * security requirements, and layer standards into LLM prompts.
 */

export class PromptEngine {
  /**
   * Build targeted system prompt based on detected or provided framework and architectural layer.
   * @param {object} profile Project profile from ProjectDetector or user options
   * @param {string} layer Target architectural layer (e.g. service, controller, repository, dto, action, job)
   * @param {string} customSystemPrompt Optional custom system prompt override
   * @returns {string} Synthesized enterprise system prompt
   */
  static buildSystemPrompt(profile, layer = 'service', customSystemPrompt = null) {
    if (customSystemPrompt && customSystemPrompt.trim().length > 0) {
      return customSystemPrompt;
    }

    const framework = profile.framework || 'generic_backend';
    const language = profile.language || 'backend';

    let base = `You are a Principal Enterprise Backend Software Architect and Senior Implementation Engineer.
Your sole mission is to write clean, secure, highly performant, production-ready ${language.toUpperCase()} application code based on industry-leading architectural standards.
Strictly adhere to the following principles:
- ZERO DUPLICATE CODE (DRY Principle): Extract reusable logic into dedicated services, helpers, or domain classes.
- DEFENSIVE PROGRAMMING: Rigorous input validation, boundary checking, and comprehensive exception handling.
- STRICT TYPING: Use strict type declarations, typed properties, explicit parameter types, and precise return types.
- ZERO CHATTER: Output clean, drop-in production code with clear docblocks/comments. Do NOT wrap code in unnecessary conversational pleasantries.
`;

    // Framework specific enterprise guidelines
    switch (framework) {
      case 'laravel':
        base += `
[LARAVEL ENTERPRISE ARCHITECTURE MANDATES]
1. Controllers: Thin and declarative. STRICTLY FORBIDDEN from containing direct business logic, raw DB queries, or direct external API calls. Delegate to dedicated Service or Action classes.
2. Validation: Always use dedicated Form Request classes (app/Http/Requests) with strict validation rules. Never validate inline inside controllers.
3. Response Serialization: Never return raw Eloquent models in APIs. Always transform data using dedicated Eloquent API Resources (app/Http/Resources).
4. Business & Domain Logic: Encapsulate operations within dedicated Service classes (app/Services) or Invokable Action classes (app/Actions).
5. Transactions: Wrap multi-step database mutations inside DB::transaction(function () { ... }) with proper rollback handling.
6. Authorization: Enforce permissions using Laravel Policies or Gates.
7. Migrations: If schemas are involved, adhere to reversible Laravel migrations with up() and down().
`;
        break;

      case 'nestjs':
        base += `
[NESTJS ENTERPRISE ARCHITECTURE MANDATES]
1. Modular Architecture: Group features into cohesive NestJS modules (@Module) with proper imports, providers, and exports.
2. Dependency Injection: All business logic must live inside @Injectable() Services.
3. Data Transfer Objects (DTOs): Create strict DTO classes decorated with class-validator and class-transformer.
4. Exception Filters & Guards: Enforce security and role validation via Guards; handle errors via standard NestJS HttpExceptions.
5. Async/Await: Ensure all async operations return typed Promises and handle unhandled rejections cleanly.
`;
        break;

      case 'fastapi':
        base += `
[FASTAPI ENTERPRISE ARCHITECTURE MANDATES]
1. Schema Validation: Use Pydantic v2 BaseModels with Field(...) metadata for all request and response payloads.
2. Dependency Injection: Use FastAPI's Depends() for database sessions, authentication, and service injection.
3. Database Sessions: Use async SQLAlchemy or Tortoise ORM sessions with explicit commit and rollback contexts.
4. Error Handling: Raise descriptive HTTPException(status_code=..., detail=...) rather than generic exceptions.
`;
        break;

      case 'express':
      case 'fastify':
        base += `
[NODE.JS API ARCHITECTURE MANDATES]
1. Layer Separation: Router -> Controller -> Service -> Repository.
2. Validation: Enforce strict schema validation using Zod or Joi middleware before requests hit controllers.
3. Error Middleware: Always route async errors to a centralized Express/Fastify error handling middleware.
`;
        break;

      case 'gin':
      case 'fiber':
      case 'go_standard':
        base += `
[GOLANG ENTERPRISE ARCHITECTURE MANDATES]
1. Error Handling: Idiomatic Go error handling (if err != nil) with wrapped errors (fmt.Errorf("...: %w", err)).
2. Context Propagation: Pass ctx context.Context as the first argument in all service and database methods.
3. Decoupling: Define interfaces at the consumer level for mockable and clean persistence layers.
`;
        break;

      case 'spring_boot':
        base += `
[SPRING BOOT ENTERPRISE ARCHITECTURE MANDATES]
1. 3-Tier Layering: @RestController -> @Service -> @Repository.
2. Validation: Use Jakarta Validation annotations (@Valid, @NotNull, @Size) on DTO records/classes.
3. Transactions: Annotate state-changing methods with @Transactional(rollbackFor = Exception.class).
4. Error Handling: Implement @ControllerAdvice / @RestControllerAdvice with ProblemDetail or custom response entities.
`;
        break;

      default:
        base += `
[ENTERPRISE BACKEND MANDATES]
1. Maintain strict separation of concerns across presentation, domain, and data access layers.
2. Prevent SQL Injection via parameterized queries / ORM query builders.
3. Sanitize inputs and validate data against rigorous contracts.
`;
        break;
    }

    // Layer-specific focus
    if (layer) {
      base += `\n[TARGET ARCHITECTURAL LAYER]: Focus specifically on generating a production-ready "${layer.toUpperCase()}" layer component.\n`;
    }

    return base;
  }

  /**
   * Synthesize user prompt with context and formatting directives
   */
  static buildUserContent(prompt, context = null, layer = null, framework = null) {
    let content = '';

    if (framework || layer) {
      content += `[Target Framework: ${framework || 'auto-detected'} | Layer: ${layer || 'general'}]\n\n`;
    }

    if (context && context.trim().length > 0) {
      content += `Existing Project Context / Relevant Code:\n\`\`\`\n${context.trim()}\n\`\`\`\n\n`;
    }

    content += `Implementation Task:\n${prompt.trim()}\n\n`;
    content += `Ensure complete, valid, syntactically correct code with all necessary imports, docblocks, and type annotations.`;

    return content;
  }
}
