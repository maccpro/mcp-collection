/**
 * @file dynamic-symbol-resolver.js
 * @description Dynamic Symbol & Framework-Aware Resolver for Laravel and PHP.
 * Resolves Eloquent magic scopes, Container bindings, Event-Listener mappings,
 * and dynamic magic methods into concrete AST targets.
 */

import fs from 'node:fs';
import path from 'node:path';

export class DynamicSymbolResolver {
  /**
   * Resolve dynamic symbol dependencies for a given class or method.
   * @param {Object} params
   * @param {string} params.symbol - Method or Class name (e.g. 'scopeActive', 'InvoicePaidEvent', 'PaymentGatewayInterface')
   * @param {string} [params.file_content] - Source content of the target file
   * @param {string} [params.repo_path] - Root directory to scan for dynamic providers/events
   * @returns {Object} Resolved dynamic targets and aliases
   */
  static resolve(params) {
    const { symbol, file_content = '', repo_path = process.cwd() } = params;

    const dynamicAliases = [];
    let frameworkType = 'standard';
    const relatedListeners = [];
    const concreteImplementations = [];

    // 1. Eloquent Magic Scope Resolution
    // If symbol is 'scopeActive', callers will invoke 'active()'
    if (symbol.startsWith('scope') && symbol.length > 5) {
      const scopeCallName = symbol.charAt(5).toLowerCase() + symbol.slice(6);
      dynamicAliases.push(scopeCallName);
      dynamicAliases.push(`->${scopeCallName}(`);
      dynamicAliases.push(`::${scopeCallName}(`);
      frameworkType = 'eloquent_scope';
    } else if (!symbol.startsWith('scope')) {
      // If symbol is 'active', it might resolve to 'scopeActive'
      const scopeDefName = 'scope' + symbol.charAt(0).toUpperCase() + symbol.slice(1);
      dynamicAliases.push(scopeDefName);
    }

    // 2. Action single-purpose __invoke resolution
    if (symbol === '__invoke' || (file_content && file_content.includes('public function __invoke'))) {
      frameworkType = 'invokable_action';
    }

    // 3. Event-Listener Dispatch Resolution
    if (symbol.endsWith('Event') || (file_content && file_content.includes('Dispatchable'))) {
      frameworkType = 'event';
      this._resolveEventListeners(symbol, repo_path, relatedListeners);
    }

    // 4. Service Container Interface to Concrete Resolution
    if (symbol.endsWith('Interface') || (file_content && file_content.includes('interface '))) {
      frameworkType = 'interface';
      this._resolveInterfaceBindings(symbol, repo_path, concreteImplementations);
    }

    // 5. Eloquent Dynamic Relationships
    // e.g. public function orders() => $user->orders dynamic property access
    if (file_content && this._isEloquentRelationship(file_content, symbol)) {
      dynamicAliases.push(`->${symbol}`); // property access without ()
      frameworkType = 'eloquent_relation';
    }

    return {
      original_symbol: symbol,
      framework_type: frameworkType,
      dynamic_call_aliases: dynamicAliases,
      related_listeners: relatedListeners,
      concrete_implementations: concreteImplementations
    };
  }

  /**
   * Check if method returns an Eloquent Relation
   */
  static _isEloquentRelationship(content, methodName) {
    const methodRegex = new RegExp(`function\\s+${methodName}\\s*\\([^)]*\\)[^{]*\\{[^}]*(?:hasMany|belongsTo|hasOne|belongsToMany|morphTo|morphMany)`, 's');
    return methodRegex.test(content);
  }

  /**
   * Scan for Event Listeners subscribed to this Event
   */
  static _resolveEventListeners(eventName, repoPath, listeners) {
    // Scan app/Providers/EventServiceProvider.php or app/Listeners/
    const providerPath = path.join(repoPath, 'app', 'Providers', 'EventServiceProvider.php');
    if (fs.existsSync(providerPath)) {
      try {
        const content = fs.readFileSync(providerPath, 'utf8');
        const eventRegex = new RegExp(`${eventName}::class\\s*=>\\s*\\[([^\\]]+)\\]`, 's');
        const match = content.match(eventRegex);
        if (match && match[1]) {
          const rawListeners = match[1].match(/([a-zA-Z0-9_]+)::class/g);
          if (rawListeners) {
            for (const rl of rawListeners) {
              const listenerName = rl.replace('::class', '');
              listeners.push(listenerName);
            }
          }
        }
      } catch (err) {
        // Silently continue
      }
    }

    // Also scan app/Listeners directly for type-hinted handle method
    const listenersDir = path.join(repoPath, 'app', 'Listeners');
    if (fs.existsSync(listenersDir)) {
      try {
        const files = fs.readdirSync(listenersDir);
        for (const file of files) {
          if (!file.endsWith('.php')) continue;
          const fullPath = path.join(listenersDir, file);
          const content = fs.readFileSync(fullPath, 'utf8');
          if (content.includes(`handle(${eventName}`) || content.includes(`(${eventName} $event)`)) {
            const listenerName = file.replace('.php', '');
            if (!listeners.includes(listenerName)) {
              listeners.push(listenerName);
            }
          }
        }
      } catch (e) {
        // Continue
      }
    }
  }

  /**
   * Scan Service Providers for Container Bindings
   */
  static _resolveInterfaceBindings(interfaceName, repoPath, implementations) {
    const providersDir = path.join(repoPath, 'app', 'Providers');
    if (!fs.existsSync(providersDir)) return;

    try {
      const files = fs.readdirSync(providersDir);
      for (const file of files) {
        if (!file.endsWith('.php')) continue;
        const content = fs.readFileSync(path.join(providersDir, file), 'utf8');
        // Match $this->app->bind(Interface::class, Concrete::class);
        const bindRegex = new RegExp(`bind\\(\\s*${interfaceName}::class\\s*,\\s*([a-zA-Z0-9_]+)::class`, 'g');
        let m;
        while ((m = bindRegex.exec(content)) !== null) {
          if (!implementations.includes(m[1])) {
            implementations.push(m[1]);
          }
        }
      }
    } catch (e) {
      // Continue
    }
  }
}

export default DynamicSymbolResolver;
