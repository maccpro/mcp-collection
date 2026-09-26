/**
 * @file project-detector.js
 * @description Dynamic Workspace & Project UI Stack Inspector.
 * Inspects composer.json, package.json, Tailwind configs, and CSS files to accurately
 * determine frontend framework, Tailwind CSS version (v3 vs v4), icon sets, and component architecture.
 */

import fs from 'node:fs';
import path from 'node:path';

export class ProjectDetector {
  /**
   * Inspect a project directory to extract its UI/UX stack profile
   * @param {string} targetDir Project root directory (default: process.cwd())
   * @returns {object} Detailed UI profile
   */
  static inspect(targetDir = process.cwd()) {
    const resolvedDir = path.resolve(targetDir);

    const profile = {
      project_path: resolvedDir,
      framework: 'html_tailwind',
      framework_display: 'HTML5 + Tailwind CSS',
      tailwind_version: 'none',
      tailwind_syntax: 'js_config',
      icon_set: 'svg',
      component_style: 'tailwind_utility',
      dark_mode_strategy: 'class',
      has_composer: false,
      has_package_json: false,
      detected_libraries: [],
      recommended_generator_framework: 'html_tailwind',
      summary: 'Standard HTML5 and Tailwind CSS project.'
    };

    if (!fs.existsSync(resolvedDir)) {
      profile.summary = `Directory does not exist: ${resolvedDir}. Defaulting to standard HTML5 + Tailwind CSS.`;
      return profile;
    }

    let composerJson = null;
    let packageJson = null;

    // 1. Inspect composer.json (PHP / Laravel Ecosystem)
    const composerPath = path.join(resolvedDir, 'composer.json');
    if (fs.existsSync(composerPath)) {
      profile.has_composer = true;
      try {
        composerJson = JSON.parse(fs.readFileSync(composerPath, 'utf8'));
      } catch (e) {
        // Silently ignore JSON parse errors
      }
    }

    // 2. Inspect package.json (Node / JavaScript / Frontend Ecosystem)
    const packagePath = path.join(resolvedDir, 'package.json');
    if (fs.existsSync(packagePath)) {
      profile.has_package_json = true;
      try {
        packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
      } catch (e) {
        // Silently ignore JSON parse errors
      }
    }

    const allPkgDeps = {
      ...(packageJson?.dependencies || {}),
      ...(packageJson?.devDependencies || {})
    };

    const allComposerDeps = {
      ...(composerJson?.require || {}),
      ...(composerJson?.['require-dev'] || {})
    };

    // 3. Detect Framework
    if (allComposerDeps['laravel/framework']) {
      profile.has_composer = true;
      profile.detected_libraries.push(`laravel/framework (${allComposerDeps['laravel/framework']})`);

      if (allComposerDeps['livewire/livewire']) {
        profile.framework = 'blade_livewire';
        profile.framework_display = 'Laravel + Livewire';
        profile.recommended_generator_framework = 'blade_livewire';
        profile.component_style = 'blade_components';
        profile.detected_libraries.push('livewire');
      } else if (allPkgDeps['@inertiajs/react'] || allComposerDeps['inertiajs/inertia-laravel'] && allPkgDeps['react']) {
        profile.framework = 'react_shadcn';
        profile.framework_display = 'Laravel + Inertia + React';
        profile.recommended_generator_framework = 'react_shadcn';
      } else if (allPkgDeps['@inertiajs/vue3'] || allComposerDeps['inertiajs/inertia-laravel'] && allPkgDeps['vue']) {
        profile.framework = 'vue_tailwind';
        profile.framework_display = 'Laravel + Inertia + Vue 3';
        profile.recommended_generator_framework = 'vue_tailwind';
      } else {
        profile.framework = 'blade_livewire';
        profile.framework_display = 'Laravel + Blade';
        profile.recommended_generator_framework = 'blade_livewire';
        profile.component_style = 'blade_components';
      }

      if (allComposerDeps['filament/filament']) {
        profile.detected_libraries.push('filament');
      }
      if (allComposerDeps['blade-ui-kit/blade-heroicons']) {
        profile.icon_set = 'blade-heroicons';
      }
    } else if (allPkgDeps['next']) {
      profile.framework = 'react_shadcn';
      const isAppRouter = fs.existsSync(path.join(resolvedDir, 'app')) || fs.existsSync(path.join(resolvedDir, 'src', 'app'));
      profile.framework_display = isAppRouter ? 'Next.js (App Router) + React' : 'Next.js (Pages Router) + React';
      profile.recommended_generator_framework = 'react_shadcn';
      profile.detected_libraries.push('next.js');
    } else if (allPkgDeps['nuxt']) {
      profile.framework = 'vue_tailwind';
      profile.framework_display = 'Nuxt 3 + Vue';
      profile.recommended_generator_framework = 'vue_tailwind';
      profile.detected_libraries.push('nuxt');
    } else if (allPkgDeps['vue']) {
      profile.framework = 'vue_tailwind';
      profile.framework_display = 'Vue 3 + Vite';
      profile.recommended_generator_framework = 'vue_tailwind';
      profile.detected_libraries.push('vue');
    } else if (allPkgDeps['svelte'] || allPkgDeps['@sveltejs/kit']) {
      profile.framework = 'svelte_tailwind';
      profile.framework_display = 'Svelte / SvelteKit';
      profile.recommended_generator_framework = 'svelte_tailwind';
      profile.detected_libraries.push('svelte');
    } else if (allPkgDeps['react']) {
      profile.framework = 'react_shadcn';
      profile.framework_display = 'React + Tailwind';
      profile.recommended_generator_framework = 'react_shadcn';
      profile.detected_libraries.push('react');
    }

    // 4. Detect Component Libraries (Shadcn UI, Radix, etc.)
    const componentsJsonPath = path.join(resolvedDir, 'components.json');
    if (fs.existsSync(componentsJsonPath) || allPkgDeps['@radix-ui/react-slot'] || fs.existsSync(path.join(resolvedDir, 'components', 'ui')) || fs.existsSync(path.join(resolvedDir, 'src', 'components', 'ui'))) {
      profile.component_style = 'shadcn_ui';
      profile.detected_libraries.push('shadcn-ui');
    }
    if (allPkgDeps['daisyui']) {
      profile.detected_libraries.push('daisyui');
    }

    // 5. Detect Icon Libraries
    if (allPkgDeps['lucide-react'] || allPkgDeps['lucide-vue-next'] || allPkgDeps['lucide-svelte']) {
      profile.icon_set = 'lucide';
      profile.detected_libraries.push('lucide-icons');
    } else if (allPkgDeps['@heroicons/react'] || allPkgDeps['@heroicons/vue']) {
      profile.icon_set = 'heroicons';
      profile.detected_libraries.push('heroicons');
    } else if (allPkgDeps['@fortawesome/fontawesome-svg-core'] || allPkgDeps['@fortawesome/free-solid-svg-icons']) {
      profile.icon_set = 'fontawesome';
      profile.detected_libraries.push('fontawesome');
    } else if (allPkgDeps['@tabler/icons-react'] || allPkgDeps['@tabler/icons']) {
      profile.icon_set = 'tabler';
      profile.detected_libraries.push('tabler-icons');
    }

    // 6. Detect Tailwind CSS Version (v3 vs v4)
    const tailwindPkgVersion = allPkgDeps['tailwindcss'];
    const hasTailwindVite = !!allPkgDeps['@tailwindcss/vite'];
    const hasTailwindPostcssV4 = allPkgDeps['@tailwindcss/postcss'] && allPkgDeps['@tailwindcss/postcss'].includes('4');

    // Check CSS files for @theme or @import "tailwindcss" (Tailwind v4 indicator)
    let hasV4CssDirective = false;
    const potentialCssDirs = [
      resolvedDir,
      path.join(resolvedDir, 'src'),
      path.join(resolvedDir, 'resources', 'css'),
      path.join(resolvedDir, 'app')
    ];

    for (const d of potentialCssDirs) {
      if (!fs.existsSync(d)) continue;
      try {
        const files = fs.readdirSync(d);
        for (const file of files) {
          if (file.endsWith('.css')) {
            const content = fs.readFileSync(path.join(d, file), 'utf8');
            if (content.includes('@import "tailwindcss"') || content.includes('@theme') || content.includes('@import \'tailwindcss\'')) {
              hasV4CssDirective = true;
              break;
            }
          }
        }
      } catch (e) {
        // Ignore read errors
      }
      if (hasV4CssDirective) break;
    }

    const hasTailwindV3Config = [
      'tailwind.config.js',
      'tailwind.config.cjs',
      'tailwind.config.mjs',
      'tailwind.config.ts'
    ].some(cfg => fs.existsSync(path.join(resolvedDir, cfg)));

    if (hasV4CssDirective || hasTailwindVite || hasTailwindPostcssV4 || (tailwindPkgVersion && tailwindPkgVersion.startsWith('^4') || tailwindPkgVersion?.startsWith('4.'))) {
      profile.tailwind_version = 'v4';
      profile.tailwind_syntax = 'css_at_theme';
      profile.detected_libraries.push('tailwindcss-v4');
    } else if (hasTailwindV3Config || (tailwindPkgVersion && (tailwindPkgVersion.startsWith('^3') || tailwindPkgVersion.startsWith('3.')))) {
      profile.tailwind_version = 'v3';
      profile.tailwind_syntax = 'js_config';
      profile.detected_libraries.push('tailwindcss-v3');
    } else if (tailwindPkgVersion) {
      profile.tailwind_version = 'v3';
      profile.tailwind_syntax = 'js_config';
      profile.detected_libraries.push('tailwindcss');
    }

    // 7. Generate concise summary
    profile.summary = `Detected ${profile.framework_display} with Tailwind CSS ${profile.tailwind_version.toUpperCase()} (${profile.tailwind_syntax === 'css_at_theme' ? '@theme CSS' : 'tailwind.config.js'}), using ${profile.icon_set} icons.`;

    return profile;
  }
}
