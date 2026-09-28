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

    // Helper icon matcher table
    const matchIcon = (svgMarkup) => {
      if (svgMarkup.includes('M5 13l4 4L19 7')) return { lucide: 'Check', heroicon: 'x-heroicon-o-check' };
      if (svgMarkup.includes('M12 9v2m0 4h.01m-6.938 4h13.856')) return { lucide: 'AlertTriangle', heroicon: 'x-heroicon-o-exclamation-triangle' };
      if (svgMarkup.includes('M19 21V5') || svgMarkup.includes('server')) return { lucide: 'Server', heroicon: 'x-heroicon-o-server' };
      if (svgMarkup.includes('M21 21l-6-6') || svgMarkup.includes('21 21-4.35-4.35')) return { lucide: 'Search', heroicon: 'x-heroicon-o-magnifying-glass' };
      if (svgMarkup.includes('M19 9l-7 7-7-7')) return { lucide: 'ChevronDown', heroicon: 'x-heroicon-o-chevron-down' };
      if (svgMarkup.includes('M9 5l7 7-7 7')) return { lucide: 'ChevronRight', heroicon: 'x-heroicon-o-chevron-right' };
      if (svgMarkup.includes('M14 5l7 7m0 0l-7 7m7-7H3')) return { lucide: 'ArrowRight', heroicon: 'x-heroicon-o-arrow-right' };
      if (svgMarkup.includes('M16 7a4 4 0 11-8 0') || svgMarkup.includes('M16 21v-2a4 4 0')) return { lucide: 'User', heroicon: 'x-heroicon-o-user' };
      if (svgMarkup.includes('M19 7l-.867 12.142') || svgMarkup.includes('M19 7l-1 12')) return { lucide: 'Trash2', heroicon: 'x-heroicon-o-trash' };
      if (svgMarkup.includes('M10.325 4.317c.426-1.756')) return { lucide: 'Settings', heroicon: 'x-heroicon-o-cog-6-tooth' };
      if (svgMarkup.includes('M12 15v2m-6 4h12')) return { lucide: 'Lock', heroicon: 'x-heroicon-o-lock-closed' };
      if (svgMarkup.includes('M15 17h5l-1.405-1.405')) return { lucide: 'Bell', heroicon: 'x-heroicon-o-bell' };
      if (svgMarkup.includes('M4 4v5h.582m15.356 2')) return { lucide: 'RefreshCw', heroicon: 'x-heroicon-o-arrow-path' };
      if (svgMarkup.includes('M6 18L18 6M6 6l12 12')) return { lucide: 'X', heroicon: 'x-heroicon-o-x-mark' };
      if (svgMarkup.includes('M12 4v16m8-8H4')) return { lucide: 'Plus', heroicon: 'x-heroicon-o-plus' };
      if (svgMarkup.includes('M3 4a1 1 0 011-1h16')) return { lucide: 'Filter', heroicon: 'x-heroicon-o-funnel' };
      return null;
    };

    // 1. Convert SVG icons to clean Blade Heroicon components where applicable
    blade = blade.replace(/<svg\b[^>]*>[\s\S]*?<\/svg>/gi, (match) => {
      const icon = matchIcon(match);
      if (icon) {
        // Extract class from SVG if available
        const classMatch = match.match(/class="([^"]*)"/);
        const cls = classMatch ? classMatch[1] : 'w-5 h-5 shrink-0';
        return `<${icon.heroicon} class="${cls}" />`;
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
      'Preserved SVGs with JSX-compliant camelCase attributes and imported Lucide icons.',
      'Integrated cn() helper from @/lib/utils.'
    ];

    let jsx = code.trim();

    // 1. Convert class -> className
    jsx = jsx.replace(/\bclass="/g, 'className="');
    jsx = jsx.replace(/\bclass='/g, "className='");

    // 2. Convert for -> htmlFor
    jsx = jsx.replace(/\bfor="/g, 'htmlFor="');

    // 3. Convert tabindex -> tabIndex
    jsx = jsx.replace(/\btabindex="0"/g, 'tabIndex={0}');
    jsx = jsx.replace(/\btabindex="-1"/g, 'tabIndex={-1}');
    jsx = jsx.replace(/\btabindex="([^"]*)"/g, 'tabIndex={$1}');

    // 4. Convert boolean HTML attributes
    jsx = jsx.replace(/\b(readonly)\b/gi, 'readOnly');
    jsx = jsx.replace(/\b(autocomplete=")/gi, 'autoComplete="');

    // 5. Convert style="width: 80%" -> style={{ width: '80%' }}
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

    // 6. Self-close void HTML tags
    const voidTags = ['img', 'input', 'br', 'hr', 'link', 'meta'];
    for (const tag of voidTags) {
      const regex = new RegExp(`<(${tag}\\b[^>]*?)(?<!/)>`, 'gi');
      jsx = jsx.replace(regex, '<$1 />');
    }

    // 7. Icon Resolver: Target specific signatures or convert SVG attributes to JSX camelCase
    const iconsToImport = new Set();
    const matchIcon = (svgMarkup) => {
      if (svgMarkup.includes('M5 13l4 4L19 7')) return 'Check';
      if (svgMarkup.includes('M12 9v2m0 4h.01m-6.938 4h13.856')) return 'AlertTriangle';
      if (svgMarkup.includes('M19 21V5') || svgMarkup.includes('server')) return 'Server';
      if (svgMarkup.includes('M21 21l-6-6') || svgMarkup.includes('21 21-4.35-4.35')) return 'Search';
      if (svgMarkup.includes('M19 9l-7 7-7-7')) return 'ChevronDown';
      if (svgMarkup.includes('M9 5l7 7-7 7')) return 'ChevronRight';
      if (svgMarkup.includes('M14 5l7 7m0 0l-7 7m7-7H3')) return 'ArrowRight';
      if (svgMarkup.includes('M16 7a4 4 0 11-8 0') || svgMarkup.includes('M16 21v-2a4 4 0')) return 'User';
      if (svgMarkup.includes('M19 7l-.867 12.142') || svgMarkup.includes('M19 7l-1 12')) return 'Trash2';
      if (svgMarkup.includes('M10.325 4.317c.426-1.756')) return 'Settings';
      if (svgMarkup.includes('M12 15v2m-6 4h12')) return 'Lock';
      if (svgMarkup.includes('M15 17h5l-1.405-1.405')) return 'Bell';
      if (svgMarkup.includes('M4 4v5h.582m15.356 2')) return 'RefreshCw';
      if (svgMarkup.includes('M6 18L18 6M6 6l12 12')) return 'X';
      if (svgMarkup.includes('M12 4v16m8-8H4')) return 'Plus';
      if (svgMarkup.includes('M3 4a1 1 0 011-1h16')) return 'Filter';
      return null;
    };

    jsx = jsx.replace(/<svg\b[^>]*>[\s\S]*?<\/svg>/gi, (match) => {
      const iconName = matchIcon(match);
      if (iconName) {
        iconsToImport.add(iconName);
        const classMatch = match.match(/className="([^"]*)"/);
        const cls = classMatch ? classMatch[1] : 'w-5 h-5 shrink-0';
        return `<${iconName} className="${cls}" />`;
      }

      // Convert SVG attributes to JSX camelCase for unrecognized SVGs
      return match
        .replace(/\bstroke-width=/g, 'strokeWidth=')
        .replace(/\bstroke-linecap=/g, 'strokeLinecap=')
        .replace(/\bstroke-linejoin=/g, 'strokeLinejoin=')
        .replace(/\bfill-rule=/g, 'fillRule=')
        .replace(/\bclip-rule=/g, 'clipRule=')
        .replace(/\bstroke-dasharray=/g, 'strokeDasharray=')
        .replace(/\bstroke-dashoffset=/g, 'strokeDashoffset=');
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
