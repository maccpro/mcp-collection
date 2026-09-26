/**
 * @file api-spec-generator.js
 * @description Enterprise OpenAPI 3.1 & Postman Specification Generator.
 * Transforms backend controllers, route definitions, and request schemas into standardized
 * OpenAPI 3.1 (YAML/JSON) specifications or Postman v2.1 collections.
 */

import { ProviderEngine } from './provider-engine.js';

export class ApiSpecGenerator {
  /**
   * Generate API specification from backend code or endpoint declarations
   */
  static async generate(sourceCode, options = {}) {
    const format = options.format || 'openapi_yaml';
    const title = options.title || 'Backend API Specification';
    const version = options.version || '1.0.0';
    const routesInfo = options.routes_info || '';

    let formatInstructions = '';
    if (format === 'openapi_yaml') {
      formatInstructions = 'Generate a strictly valid OpenAPI 3.1 specification formatted as clean YAML.';
    } else if (format === 'openapi_json') {
      formatInstructions = 'Generate a strictly valid OpenAPI 3.1 specification formatted as valid JSON.';
    } else if (format === 'postman') {
      formatInstructions = 'Generate a strictly valid Postman Collection v2.1 schema formatted as valid JSON with variables and sample request bodies.';
    }

    const systemPrompt = `You are an Enterprise API Design Specialist and OpenAPI 3.1 Expert.
Your task is to analyze backend source code and route definitions to generate complete, production-grade API specifications.
Requirements:
1. ${formatInstructions}
2. Define accurate HTTP methods (GET, POST, PUT, PATCH, DELETE), paths, parameters, and headers.
3. Define requestBody schemas with field types, required fields, and examples.
4. Define standard response codes: 200/201 (Success), 400 (Bad Request), 401 (Unauthorized), 403 (Forbidden), 422 (Validation Error), 500 (Server Error).
5. Include BearerAuth or relevant security schemes.
6. Output ONLY the raw spec code block (yaml or json). No conversational chatter.`;

    let userContent = `API Title: ${title}\nAPI Version: ${version}\n`;
    if (routesInfo) {
      userContent += `\nRoutes / Endpoint Declarations:\n${routesInfo}\n`;
    }
    userContent += `\nBackend Source Code (Controllers/Routes/DTOs):\n\`\`\`\n${sourceCode}\n\`\`\``;

    const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userContent }
    ];

    const result = await ProviderEngine.complete(messages, options);
    return {
      spec: result.content,
      format,
      title,
      version,
      provider: result.provider,
      model: result.model
    };
  }
}
