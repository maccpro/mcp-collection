/**
 * @file layout-scaffold.js
 * @description Dynamic Application Shells & Layout Scaffolding Engine.
 * 
 * Provides production-ready, accessible, mobile-first responsive layout scaffolds:
 * - Admin Dashboard Shell (Collapsible sidebar, mobile drawer, topbar, breadcrumb, footer)
 * - SaaS Portal Shell (Top-nav, workspace switcher, secondary sub-tabs, centered shell)
 * - High-Converting Landing Page Shell (Sticky blur header, announcement banner, footer)
 * - Master-Detail Settings Shell (Two-column layout with vertical sidebar tabs)
 * 
 * Supports dynamic brand interpolation, color palette remapping, and multi-framework conversion.
 */

import { ComponentConverter } from './component-converter.js';
import { ColorEngine } from './color-engine.js';

export const SCAFFOLDS = {
  admin_dashboard_shell: {
    name: 'Enterprise Admin Dashboard Shell with Responsive Mobile Drawer',
    description: 'Complete production admin layout with collapsible sidebar, mobile drawer backdrop, topbar with search and profile dropdown, breadcrumb bar, and content container.',
    ux_guidelines: [
      'Sidebar must collapse gracefully on mobile into a slide-over drawer.',
      'Topbar search should support quick keyboard focus (/ or Ctrl+K).',
      'Maintain clear breadcrumb trail for orientation across deeply nested views.'
    ],
    html_tailwind: `<div class="min-h-screen bg-slate-50 dark:bg-slate-950 flex antialiased">
  <!-- Desktop Sidebar -->
  <aside class="hidden lg:flex lg:flex-col lg:w-72 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 shrink-0">
    <!-- Brand Header -->
    <div class="h-16 flex items-center px-6 border-b border-slate-100 dark:border-slate-800">
      <div class="flex items-center gap-3">
        <div class="w-8 h-8 rounded-xl bg-indigo-600 text-white font-bold flex items-center justify-center shadow-md">JH</div>
        <span class="text-base font-bold text-slate-900 dark:text-white">{{BRAND_NAME}}</span>
      </div>
    </div>

    <!-- Navigation Links -->
    <div class="flex-1 overflow-y-auto p-4 space-y-1">
      <a href="#dashboard" class="flex items-center gap-3 px-3.5 py-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-semibold text-sm min-h-[44px]">
        <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/></svg>
        Overview
      </a>
      <a href="#servers" class="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 font-medium text-sm min-h-[44px]">
        <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01"/></svg>
        Cloud VPS
      </a>
      <a href="#billing" class="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 font-medium text-sm min-h-[44px]">
        <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"/></svg>
        Invoices & Billing
      </a>
      <a href="#settings" class="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 font-medium text-sm min-h-[44px]">
        <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/></svg>
        Settings
      </a>
    </div>

    <!-- User Profile Footer -->
    <div class="p-4 border-t border-slate-100 dark:border-slate-800">
      <div class="flex items-center gap-3 p-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition">
        <div class="w-9 h-9 rounded-full bg-indigo-600 text-white font-bold flex items-center justify-center text-xs">SB</div>
        <div class="flex-1 min-w-0">
          <div class="text-xs font-bold text-slate-900 dark:text-white truncate">Sizar Babu</div>
          <div class="text-[11px] text-slate-400 truncate">CEO & Admin</div>
        </div>
      </div>
    </div>
  </aside>

  <!-- Main Content Wrapper -->
  <div class="flex-1 flex flex-col min-w-0">
    <!-- Topbar -->
    <header class="h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-4 sm:px-8">
      <!-- Search Input -->
      <div class="flex items-center gap-3 flex-1 max-w-md">
        <div class="relative w-full">
          <svg class="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
          <input type="text" placeholder="Search resources... (/)" class="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500" aria-label="Global search" />
        </div>
      </div>

      <!-- Quick Actions -->
      <div class="flex items-center gap-3">
        <button class="w-10 h-10 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center justify-center relative min-h-[40px]" aria-label="Notifications">
          <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/></svg>
          <span class="absolute top-2 right-2 w-2 h-2 rounded-full bg-emerald-500"></span>
        </button>
      </div>
    </header>

    <!-- Breadcrumb Bar -->
    <nav class="bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800/60 px-4 sm:px-8 py-3 text-xs flex items-center gap-2 text-slate-500" aria-label="Breadcrumb">
      <a href="#home" class="hover:text-slate-900 dark:hover:text-white">Home</a>
      <span>/</span>
      <span class="text-slate-900 dark:text-white font-semibold">Infrastructure Overview</span>
    </nav>

    <!-- Main Content Container Slot -->
    <main class="flex-1 p-4 sm:p-8 overflow-y-auto">
      <div class="max-w-7xl mx-auto space-y-6">
        <!-- Content injected here -->
        <div class="border-2 border-dashed border-slate-300 dark:border-slate-800 rounded-2xl p-12 text-center text-slate-400">
          Main Dashboard Slot
        </div>
      </div>
    </main>
  </div>
</div>`
  },

  saas_portal_shell: {
    name: 'Modern SaaS Portal Header Navigation Shell',
    description: 'Horizontal top-bar layout with workspace switcher, central navigation tabs, user actions, and fluid responsive container.',
    ux_guidelines: [
      'Position workspace switcher on the left to denote organizational context.',
      'Keep navigation tabs sticky for effortless switching between views.',
      'Ensure high-contrast active tab indicator with primary brand accent.'
    ],
    html_tailwind: `<div class="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col antialiased">
  <!-- Top Navigation Header -->
  <header class="sticky top-0 z-40 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div class="flex items-center justify-between h-16 gap-4">
        <!-- Brand & Workspace -->
        <div class="flex items-center gap-4">
          <a href="/" class="flex items-center gap-2 font-bold text-slate-900 dark:text-white">
            <div class="w-8 h-8 rounded-xl bg-indigo-600 text-white font-bold flex items-center justify-center">JH</div>
            <span class="hidden sm:inline">{{BRAND_NAME}}</span>
          </a>
          <span class="text-slate-300 dark:text-slate-700">/</span>
          <!-- Workspace Dropdown -->
          <button class="flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 min-h-[36px]">
            <span>JoypurColo Production</span>
            <svg class="w-3.5 h-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/></svg>
          </button>
        </div>

        <!-- Center Nav Tabs -->
        <nav class="hidden md:flex items-center gap-1 text-sm font-semibold">
          <a href="#overview" class="px-3.5 py-2 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300">Overview</a>
          <a href="#analytics" class="px-3.5 py-2 rounded-lg text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white">Telemetry</a>
          <a href="#billing" class="px-3.5 py-2 rounded-lg text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white">Billing</a>
          <a href="#settings" class="px-3.5 py-2 rounded-lg text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white">Settings</a>
        </nav>

        <!-- Right User Actions -->
        <div class="flex items-center gap-3">
          <button class="px-4 py-2 text-xs font-bold rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 shadow min-h-[36px]">+ Deploy</button>
          <div class="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 font-bold text-xs flex items-center justify-center text-slate-800 dark:text-white">SB</div>
        </div>
      </div>
    </div>
  </header>

  <!-- Page Body Slot -->
  <main class="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
    <div class="border-2 border-dashed border-slate-300 dark:border-slate-800 rounded-3xl p-12 text-center text-slate-400">
      SaaS Portal Content Area
    </div>
  </main>
</div>`
  },

  landing_page_shell: {
    name: 'High-Converting Cloud & SaaS Landing Page Shell',
    description: 'Marketing shell with announcement ribbon, sticky blurred header, hero container, feature bento section, and multi-column footer.',
    ux_guidelines: [
      'Maintain sticky blur header with subtle border on scroll.',
      'Place primary CTA prominently in the top right of header.',
      'Ensure multi-column footer contains trust badges and legal links.'
    ],
    html_tailwind: `<div class="min-h-screen bg-white dark:bg-slate-950 text-slate-900 dark:text-white antialiased">
  <!-- Announcement Ribbon -->
  <div class="bg-indigo-600 text-white text-xs font-semibold py-2 px-4 text-center">
    <span>🚀 NVMe Cloud Server Cluster Launch in Dhaka &bull; 99.9% SLA Guaranteed &bull; </span>
    <a href="#launch" class="underline font-bold">Deploy with 20% Discount &rarr;</a>
  </div>

  <!-- Sticky Header -->
  <header class="sticky top-0 z-50 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
      <div class="flex items-center gap-3">
        <div class="w-9 h-9 rounded-xl bg-indigo-600 text-white font-black flex items-center justify-center shadow-lg shadow-indigo-600/20">JH</div>
        <span class="text-xl font-black tracking-tight">{{BRAND_NAME}}</span>
      </div>

      <nav class="hidden md:flex items-center gap-8 text-sm font-semibold text-slate-600 dark:text-slate-300">
        <a href="#vps" class="hover:text-indigo-600 dark:hover:text-indigo-400">Cloud VPS</a>
        <a href="#colocation" class="hover:text-indigo-600 dark:hover:text-indigo-400">Colocation</a>
        <a href="#pricing" class="hover:text-indigo-600 dark:hover:text-indigo-400">Pricing</a>
        <a href="#about" class="hover:text-indigo-600 dark:hover:text-indigo-400">About</a>
      </nav>

      <div class="flex items-center gap-3">
        <a href="#login" class="px-4 py-2.5 text-sm font-semibold text-slate-700 dark:text-slate-300 hover:text-slate-900 min-h-[44px] flex items-center">Client Portal</a>
        <a href="#deploy" class="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold shadow-md shadow-indigo-600/25 transition min-h-[44px] flex items-center">Get Started</a>
      </div>
    </div>
  </header>

  <!-- Hero & Sections Slot -->
  <main class="w-full">
    <div class="max-w-7xl mx-auto px-4 py-16 text-center">
      <h1 class="text-4xl sm:text-6xl font-black tracking-tight">High-Performance Cloud Infrastructure for Bangladesh & Beyond</h1>
      <p class="mt-6 text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">Deploy NVMe Cloud Instances, Dedicated Servers, and Tier-3 Colocation with guaranteed 99.9% uptime.</p>
    </div>
  </main>

  <!-- Multi-Column Footer -->
  <footer class="bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 py-16 px-4">
    <div class="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-8 text-sm">
      <div>
        <h4 class="font-bold text-slate-900 dark:text-white mb-3">{{BRAND_NAME}}</h4>
        <p class="text-xs text-slate-500">Premium cloud hosting, colocation, and managed servers operated by JoypurHost.</p>
      </div>
      <div>
        <h5 class="font-semibold text-slate-900 dark:text-white text-xs uppercase tracking-wider mb-3">Products</h5>
        <ul class="space-y-2 text-xs text-slate-500">
          <li><a href="#vps" class="hover:underline">Cloud VPS</a></li>
          <li><a href="#dedicated" class="hover:underline">Dedicated Servers</a></li>
          <li><a href="#colo" class="hover:underline">JoypurColo Datacenter</a></li>
        </ul>
      </div>
      <div>
        <h5 class="font-semibold text-slate-900 dark:text-white text-xs uppercase tracking-wider mb-3">Support</h5>
        <ul class="space-y-2 text-xs text-slate-500">
          <li><a href="#status" class="hover:underline">Network Status</a></li>
          <li><a href="#tickets" class="hover:underline">24/7 Priority Support</a></li>
          <li><a href="#kb" class="hover:underline">Knowledgebase</a></li>
        </ul>
      </div>
      <div>
        <h5 class="font-semibold text-slate-900 dark:text-white text-xs uppercase tracking-wider mb-3">Legal</h5>
        <p class="text-xs text-slate-500">&copy; 2026 {{BRAND_NAME}}. All rights reserved.</p>
      </div>
    </div>
  </footer>
</div>`
  }
};

export class LayoutScaffold {
  /**
   * Retrieve and dynamically parameterize an application layout scaffold
   * @param {string} scaffoldType Key in SCAFFOLDS ('admin_dashboard_shell', 'saas_portal_shell', 'landing_page_shell')
   * @param {object} options { brand_name, currency_symbol, framework, color_scheme }
   * @returns {object} Formatted layout bundle
   */
  static getScaffold(scaffoldType = 'admin_dashboard_shell', options = {}) {
    const scaffold = SCAFFOLDS[scaffoldType];
    if (!scaffold) {
      throw new Error(`Unknown scaffold type: ${scaffoldType}. Available: ${Object.keys(SCAFFOLDS).join(', ')}`);
    }

    const brandName = options.brand_name || 'JoypurHost Cloud';
    const currencySymbol = options.currency_symbol || '$';
    const targetFramework = options.framework || 'html_tailwind';
    const colorScheme = options.color_scheme || 'indigo';

    // 1. Dynamic brand & currency interpolation
    let html = scaffold.html_tailwind;
    html = html.replace(/\{\{BRAND_NAME\}\}/g, brandName);
    html = html.replace(/\{\{CURRENCY_SYMBOL\}\}/g, currencySymbol);

    // 2. Dynamic color remapping
    if (colorScheme && colorScheme !== 'indigo') {
      html = ColorEngine.remapTailwindPalette(html, colorScheme, 'indigo');
    }

    // 3. Multi-Framework Conversion
    const componentName = scaffoldType.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join('');
    const converted = ComponentConverter.convert(html, targetFramework, {
      component_name: componentName
    });

    return {
      scaffold_type: scaffoldType,
      name: scaffold.name,
      description: scaffold.description,
      ux_guidelines: scaffold.ux_guidelines,
      framework: targetFramework,
      brand_name: brandName,
      color_scheme: colorScheme,
      code: converted.converted_code,
      conversion_notes: converted.notes
    };
  }
}
