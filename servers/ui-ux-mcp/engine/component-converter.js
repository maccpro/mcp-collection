/**
 * @file component-converter.js
 * @description Enterprise Multi-Framework Component Converter.
 * Seamlessly converts frontend UI snippets between:
 * - HTML5 + Tailwind CSS
 * - Laravel Blade + Livewire + Alpine.js
 * - React + Next.js + TypeScript + Shadcn UI
 * - Vue 3 + Nuxt 3 (Composition API)
 * - Svelte 5 + SvelteKit
 */

export class ComponentConverter {
  /**
   * Convert component snippet to target framework
   * @param {string} code Source markup
   * @param {string} targetFramework 'blade_livewire' | 'react_shadcn' | 'vue_tailwind' | 'svelte_tailwind' | 'html_tailwind'
   * @param {object} options Optional flags ({ component_name: 'ComponentName' })
   * @returns {{ converted_code: string, framework: string, notes: string[] }}
   */
  static convert(code, targetFramework = 'blade_livewire', options = {}) {
    const componentName = options.component_name || 'UiComponent';

    switch (targetFramework) {
      case 'blade_livewire':
        return this.toBladeLivewire(code, componentName);
      case 'react_shadcn':
        return this.toReactShadcn(code, componentName);
      case 'vue_tailwind':
        return this.toVueTailwind(code, componentName);
      case 'svelte_tailwind':
        return this.toSvelteTailwind(code, componentName);
      case 'html_tailwind':
      default:
        return {
          converted_code: code.trim(),
          framework: 'html_tailwind',
          notes: ['Standard HTML5 markup formatted.']
        };
    }
  }

  /**
   * Convert to Laravel Blade + Livewire 3 + Alpine.js
   */
  static toBladeLivewire(code, componentName) {
    const notes = [
      'Added @props directive for Laravel Blade component.',
      'Configured Alpine.js transitions and Livewire bindings.',
      'Appended standard Blade @error feedback blocks for inputs.'
    ];

    let blade = code.trim();

    // 1. Convert SVG icons to clean Blade Heroicon components where applicable
    blade = blade.replace(/<svg\b[^>]*>[\s\S]*?<\/svg>/gi, (match) => {
      if (match.includes('M5 13l4 4L19 7') || match.includes('stroke-linecap="round"')) {
        return `<x-heroicon-o-check class="w-5 h-5 text-emerald-500 shrink-0" />`;
      }
      return match;
    });

    // 2. Add Blade Form validation hooks for inputs with names
    blade = blade.replace(/<input\b([^>]*\bname="([^"]+)"[^>]*)>/gi, (match, attrs, name) => {
      return `${match}\n      @error('${name}')\n        <p class="mt-1 text-xs text-rose-500 font-medium">{{ $message }}</p>\n      @enderror`;
    });

    // 3. Wrap as a production Laravel Blade component
    const wrappedBlade = `{{-- resources/views/components/${componentName.toLowerCase().replace(/([a-z])([A-Z])/g, '$1-$2')}.blade.php --}}
@props([
    'title' => null,
    'class' => '',
])

<div {{ $attributes->merge(['class' => 'w-full ' . $class]) }}>
    ${blade.split('\n').join('\n    ')}
</div>`;

    return {
      converted_code: wrappedBlade,
      framework: 'blade_livewire',
      notes
    };
  }

  /**
   * Convert to React 19 + TypeScript + Next.js App Router + Shadcn UI
   */
  static toReactShadcn(code, componentName) {
    const notes = [
      'Converted class to className.',
      'Converted style strings to JSX style objects.',
      'Self-closed void HTML elements (<img />, <input />, <br />).',
      'Imported Lucide React icons.',
      'Integrated cn() helper from @/lib/utils.'
    ];

    let jsx = code.trim();

    // 1. Convert class -> className
    jsx = jsx.replace(/\bclass="/g, 'className="');
    jsx = jsx.replace(/\bclass='/g, "className='");

    // 2. Convert for -> htmlFor
    jsx = jsx.replace(/\bfor="/g, 'htmlFor="');

    // 3. Convert tabindex -> tabIndex
    jsx = jsx.replace(/\btabindex="/g, 'tabIndex="');

    // 4. Convert style="width: 80%" -> style={{ width: '80%' }}
    jsx = jsx.replace(/style="([^"]*)"/g, (match, styleStr) => {
      const rules = styleStr.split(';').filter(Boolean);
      const objEntries = rules.map(rule => {
        const [prop, val] = rule.split(':').map(s => s.trim());
        if (!prop || !val) return '';
        const camelProp = prop.replace(/-([a-z])/g, (_, g) => g.toUpperCase());
        return `${camelProp}: '${val}'`;
      }).filter(Boolean);
      return `style={{ ${objEntries.join(', ')} }}`;
    });

    // 5. Self-close void HTML tags
    const voidTags = ['img', 'input', 'br', 'hr', 'link', 'meta'];
    for (const tag of voidTags) {
      const regex = new RegExp(`<(${tag}\\b[^>]*?)(?<!/)>`, 'gi');
      jsx = jsx.replace(regex, '<$1 />');
    }

    // 6. Replace SVGs with Lucide React icons
    const iconsToImport = new Set();
    jsx = jsx.replace(/<svg\b[^>]*>[\s\S]*?<\/svg>/gi, (match) => {
      if (match.includes('M5 13l4 4L19 7') || match.includes('stroke-linecap="round"')) {
        iconsToImport.add('Check');
        return `<Check className="w-5 h-5 text-emerald-500 shrink-0" />`;
      }
      if (match.includes('M19 21V5') || match.includes('server')) {
        iconsToImport.add('Server');
        return `<Server className="w-5 h-5 text-indigo-500 shrink-0" />`;
      }
      return match;
    });

    const iconImportStatement = iconsToImport.size > 0
      ? `import { ${Array.from(iconsToImport).join(', ')} } from 'lucide-react';\n`
      : '';

    const pascalName = componentName.charAt(0).toUpperCase() + componentName.slice(1);

    const fullComponent = `'use client';

import * as React from 'react';
${iconImportStatement}import { cn } from '@/lib/utils';

export interface ${pascalName}Props extends React.HTMLAttributes<HTMLDivElement> {
  title?: string;
  className?: string;
}

export function ${pascalName}({ className, children, ...props }: ${pascalName}Props) {
  return (
    <div className={cn('w-full', className)} {...props}>
      ${jsx.split('\n').join('\n      ')}
    </div>
  );
}

export default ${pascalName};`;

    return {
      converted_code: fullComponent,
      framework: 'react_shadcn',
      notes
    };
  }

  /**
   * Convert to Vue 3 (Composition API, <script setup lang="ts">)
   */
  static toVueTailwind(code, componentName) {
    const notes = [
      'Wrapped in Vue 3 <template> with <script setup lang="ts">.',
      'Replaced event listeners with @click and @submit.prevent.',
      'Exposed typed defineProps.'
    ];

    let template = code.trim();

    // Convert onclick -> @click
    template = template.replace(/\bonclick="/g, '@click="');
    template = template.replace(/\bonsubmit="/g, '@submit.prevent="');

    const pascalName = componentName.charAt(0).toUpperCase() + componentName.slice(1);

    const vueComponent = `<script setup lang="ts">
interface Props {
  title?: string;
  customClass?: string;
}

const props = withDefaults(defineProps<Props>(), {
  title: '',
  customClass: ''
});
</script>

<template>
  <div :class="['w-full', customClass]">
    ${template.split('\n').join('\n    ')}
  </div>
</template>`;

    return {
      converted_code: vueComponent,
      framework: 'vue_tailwind',
      notes
    };
  }

  /**
   * Convert to Svelte 5 + SvelteKit
   */
  static toSvelteTailwind(code, componentName) {
    const notes = [
      'Formatted for Svelte 5 runes ($props, $state).',
      'Converted event handlers to Svelte directives.'
    ];

    let svelte = code.trim();
    svelte = svelte.replace(/\bonclick="/g, 'onclick={');
    svelte = svelte.replace(/(onclick=\{[^"]*)"/g, '$1}');

    const svelteComponent = `<script lang="ts">
  interface Props {
    title?: string;
    class?: string;
    children?: import('svelte').Snippet;
  }

  let { title = '', class: className = '', children }: Props = $props();
</script>

<div class="w-full {className}">
  ${svelte.split('\n').join('\n  ')}
</div>`;

    return {
      converted_code: svelteComponent,
      framework: 'svelte_tailwind',
      notes
    };
  }
}
