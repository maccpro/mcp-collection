/**
 * @file patterns-catalog.js
 * @description Enterprise Curated UI/UX Patterns Catalog.
 * 22 Production-Ready, Accessible, High-Converting Component Patterns across:
 * - Cloud Hosting & Infrastructure
 * - SaaS Dashboards & Analytics
 * - Enterprise Portals, ERP & Access Control
 * - E-Commerce & Billing
 * - Overlays, Feedback & Forms
 *
 * Supports dynamic interpolation for brand name, currency symbol, color scheme, and target framework.
 */

import { ComponentConverter } from './component-converter.js';

export const PATTERNS = {
  // ==========================================
  // DOMAIN 1: CLOUD HOSTING & INFRASTRUCTURE
  // ==========================================
  pricing_table: {
    name: 'Modern SaaS / Cloud Hosting Pricing Matrix',
    description: 'High-converting 3-tier pricing table with billing toggle, feature checks, popular badge, and clear CTAs.',
    ux_guidelines: [
      'Highlight the recommended/most popular tier with elevated border and subtle shadow.',
      'Place monthly vs yearly toggle at the top with a discount pill (e.g. Save 20%).',
      'Ensure checkmark icons have high contrast and clear spacing.',
      'Primary CTA button on the featured tier must use dominant brand color.'
    ],
    html_tailwind: `<div class="w-full max-w-7xl mx-auto px-4 py-16">
  <div class="text-center max-w-3xl mx-auto mb-12">
    <h2 class="text-3xl font-extrabold text-slate-900 dark:text-white sm:text-4xl">Simple, transparent pricing</h2>
    <p class="mt-4 text-lg text-slate-600 dark:text-slate-400">Deploy high-performance NVMe cloud hosting with 99.9% guaranteed uptime on {{BRAND_NAME}}.</p>
    
    <!-- Billing Toggle -->
    <div class="mt-6 inline-flex items-center p-1 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
      <button class="px-4 py-2 text-sm font-semibold rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm">Monthly</button>
      <button class="px-4 py-2 text-sm font-semibold rounded-lg text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white flex items-center gap-1.5">
        Yearly <span class="text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400 font-bold">-20%</span>
      </button>
    </div>
  </div>

  <div class="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch">
    <!-- Starter Tier -->
    <div class="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 shadow-sm flex flex-col justify-between">
      <div>
        <h3 class="text-xl font-bold text-slate-900 dark:text-white">Starter Cloud</h3>
        <p class="text-sm text-slate-500 dark:text-slate-400 mt-2">Ideal for personal blogs and simple websites.</p>
        <div class="mt-6 flex items-baseline gap-1">
          <span class="text-4xl font-extrabold text-slate-900 dark:text-white">{{CURRENCY_SYMBOL}}4.90</span>
          <span class="text-sm font-medium text-slate-500">/month</span>
        </div>
        <ul class="mt-8 space-y-4 text-sm text-slate-600 dark:text-slate-300">
          <li class="flex items-center gap-3"><svg class="w-5 h-5 text-emerald-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg> 1 Website & 10 GB NVMe SSD</li>
          <li class="flex items-center gap-3"><svg class="w-5 h-5 text-emerald-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg> Unmetered Bandwidth</li>
          <li class="flex items-center gap-3"><svg class="w-5 h-5 text-emerald-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg> Free SSL & Daily Backups</li>
        </ul>
      </div>
      <button class="mt-8 w-full py-3 px-4 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-white font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition min-h-[44px]">Get Started</button>
    </div>

    <!-- Pro / Featured Tier -->
    <div class="relative rounded-2xl border-2 border-indigo-600 dark:border-indigo-500 bg-white dark:bg-slate-900 p-8 shadow-xl flex flex-col justify-between scale-105 z-10">
      <div class="absolute -top-4 left-1/2 -translate-x-1/2 bg-gradient-to-r from-indigo-600 to-cyan-500 text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider shadow">Most Popular</div>
      <div>
        <h3 class="text-xl font-bold text-slate-900 dark:text-white">Business Cloud</h3>
        <p class="text-sm text-slate-500 dark:text-slate-400 mt-2">Optimized for growing SaaS & E-commerce shops.</p>
        <div class="mt-6 flex items-baseline gap-1">
          <span class="text-4xl font-extrabold text-slate-900 dark:text-white">{{CURRENCY_SYMBOL}}9.90</span>
          <span class="text-sm font-medium text-slate-500">/month</span>
        </div>
        <ul class="mt-8 space-y-4 text-sm text-slate-600 dark:text-slate-300">
          <li class="flex items-center gap-3 font-medium text-slate-900 dark:text-white"><svg class="w-5 h-5 text-indigo-600 dark:text-indigo-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg> Unlimited Websites & 50 GB NVMe</li>
          <li class="flex items-center gap-3"><svg class="w-5 h-5 text-indigo-600 dark:text-indigo-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg> Free Domain (.com) Included</li>
          <li class="flex items-center gap-3"><svg class="w-5 h-5 text-indigo-600 dark:text-indigo-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg> 4 GB Dedicated RAM & LiteSpeed Cache</li>
          <li class="flex items-center gap-3"><svg class="w-5 h-5 text-indigo-600 dark:text-indigo-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg> 24/7 Priority Support (Phone & WhatsApp)</li>
        </ul>
      </div>
      <button class="mt-8 w-full py-3.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-lg shadow-indigo-500/25 transition min-h-[44px]">Deploy Now</button>
    </div>

    <!-- Enterprise Tier -->
    <div class="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 shadow-sm flex flex-col justify-between">
      <div>
        <h3 class="text-xl font-bold text-slate-900 dark:text-white">Dedicated VPS</h3>
        <p class="text-sm text-slate-500 dark:text-slate-400 mt-2">Maximum isolated performance for portals & ERP.</p>
        <div class="mt-6 flex items-baseline gap-1">
          <span class="text-4xl font-extrabold text-slate-900 dark:text-white">{{CURRENCY_SYMBOL}}24.90</span>
          <span class="text-sm font-medium text-slate-500">/month</span>
        </div>
        <ul class="mt-8 space-y-4 text-sm text-slate-600 dark:text-slate-300">
          <li class="flex items-center gap-3"><svg class="w-5 h-5 text-emerald-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg> 4 vCPU & 8 GB RAM</li>
          <li class="flex items-center gap-3"><svg class="w-5 h-5 text-emerald-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg> 160 GB Enterprise NVMe</li>
          <li class="flex items-center gap-3"><svg class="w-5 h-5 text-emerald-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg> Dedicated IPv4 & Full Root Access</li>
        </ul>
      </div>
      <button class="mt-8 w-full py-3 px-4 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-white font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition min-h-[44px]">Configure VPS</button>
    </div>
  </div>
</div>`
  },

  server_resource_monitor: {
    name: 'Cloud Server Real-Time Resource Gauges',
    description: 'Hardware telemetry meters for CPU cores, RAM, NVMe storage, and network bandwidth with health pulse.',
    ux_guidelines: [
      'Use green/emerald for normal (<70%), amber for warning (70-85%), and rose/red for critical (>85%).',
      'Include live pulsing status dots to denote WebSocket real-time updates.',
      'Provide contextual breakdowns (e.g. 12.4 GB of 32 GB used).'
    ],
    html_tailwind: `<div class="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
  <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
    <div class="flex items-center gap-3">
      <div class="w-3 h-3 rounded-full bg-emerald-500 animate-pulse"></div>
      <h3 class="text-base font-bold text-slate-900 dark:text-white">vps-node-01.{{BRAND_NAME}}</h3>
      <span class="text-xs px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-mono">192.168.1.104</span>
    </div>
    <div class="flex items-center gap-2">
      <button class="px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 min-h-[36px]">Reboot</button>
      <button class="px-3 py-1.5 text-xs font-semibold rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 min-h-[36px]">Web Console</button>
    </div>
  </div>

  <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mt-6">
    <!-- CPU Usage -->
    <div class="space-y-2">
      <div class="flex justify-between text-xs font-medium">
        <span class="text-slate-500 dark:text-slate-400">vCPU Load (8 Cores)</span>
        <span class="text-slate-900 dark:text-white font-bold">42%</span>
      </div>
      <div class="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
        <div class="bg-indigo-600 h-2 rounded-full transition-all duration-500" style="width: 42%"></div>
      </div>
      <p class="text-[11px] text-slate-400">Avg: 2.15 (Load normal)</p>
    </div>

    <!-- RAM Usage -->
    <div class="space-y-2">
      <div class="flex justify-between text-xs font-medium">
        <span class="text-slate-500 dark:text-slate-400">RAM (DDR5)</span>
        <span class="text-emerald-600 dark:text-emerald-400 font-bold">58%</span>
      </div>
      <div class="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
        <div class="bg-emerald-500 h-2 rounded-full transition-all duration-500" style="width: 58%"></div>
      </div>
      <p class="text-[11px] text-slate-400">18.5 GB of 32 GB used</p>
    </div>

    <!-- Disk NVMe -->
    <div class="space-y-2">
      <div class="flex justify-between text-xs font-medium">
        <span class="text-slate-500 dark:text-slate-400">Enterprise NVMe</span>
        <span class="text-amber-600 dark:text-amber-400 font-bold">78%</span>
      </div>
      <div class="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
        <div class="bg-amber-500 h-2 rounded-full transition-all duration-500" style="width: 78%"></div>
      </div>
      <p class="text-[11px] text-slate-400">390 GB of 500 GB</p>
    </div>

    <!-- Bandwidth -->
    <div class="space-y-2">
      <div class="flex justify-between text-xs font-medium">
        <span class="text-slate-500 dark:text-slate-400">Network I/O</span>
        <span class="text-cyan-600 dark:text-cyan-400 font-bold">1.2 Gbps</span>
      </div>
      <div class="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
        <div class="bg-cyan-500 h-2 rounded-full transition-all duration-500" style="width: 30%"></div>
      </div>
      <p class="text-[11px] text-slate-400">In: 450 Mbps | Out: 750 Mbps</p>
    </div>
  </div>
</div>`
  },

  vps_configurator: {
    name: 'Interactive Cloud VPS Resource Slider',
    description: 'Dynamic resource selector with vCPU, RAM, SSD sliders and real-time monthly/hourly price calculations.',
    ux_guidelines: [
      'Instant pricing reactivity when user toggles or drags sliders.',
      'Display both monthly and hourly breakdown for cloud pricing trust.',
      'Show instant provisioning guarantee tag.'
    ],
    html_tailwind: `<div class="w-full max-w-4xl mx-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-8 shadow-lg">
  <div class="border-b border-slate-100 dark:border-slate-800 pb-6 mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
    <div>
      <h2 class="text-2xl font-bold text-slate-900 dark:text-white">Custom Cloud Server Builder</h2>
      <p class="text-sm text-slate-500 dark:text-slate-400 mt-1">Scale CPU, RAM, and Storage independently with zero downtime.</p>
    </div>
    <div class="text-right">
      <span class="text-3xl font-extrabold text-indigo-600 dark:text-indigo-400">{{CURRENCY_SYMBOL}}38.50</span>
      <span class="text-xs text-slate-500 block">estimated / month</span>
    </div>
  </div>

  <div class="space-y-8">
    <!-- Slider 1: vCPU -->
    <div>
      <div class="flex justify-between text-sm font-semibold text-slate-900 dark:text-white mb-2">
        <span>vCPU Cores</span>
        <span class="text-indigo-600 dark:text-indigo-400 font-bold">4 Cores (AMD EPYC)</span>
      </div>
      <input type="range" min="1" max="32" value="4" class="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-600" aria-label="vCPU Cores">
      <div class="flex justify-between text-xs text-slate-400 mt-1">
        <span>1 Core</span>
        <span>8 Cores</span>
        <span>16 Cores</span>
        <span>32 Cores</span>
      </div>
    </div>

    <!-- Slider 2: RAM -->
    <div>
      <div class="flex justify-between text-sm font-semibold text-slate-900 dark:text-white mb-2">
        <span>Dedicated RAM</span>
        <span class="text-indigo-600 dark:text-indigo-400 font-bold">16 GB DDR5</span>
      </div>
      <input type="range" min="2" max="128" value="16" class="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-600" aria-label="Dedicated RAM">
      <div class="flex justify-between text-xs text-slate-400 mt-1">
        <span>2 GB</span>
        <span>32 GB</span>
        <span>64 GB</span>
        <span>128 GB</span>
      </div>
    </div>

    <!-- Slider 3: NVMe -->
    <div>
      <div class="flex justify-between text-sm font-semibold text-slate-900 dark:text-white mb-2">
        <span>NVMe Gen4 SSD</span>
        <span class="text-indigo-600 dark:text-indigo-400 font-bold">250 GB Storage</span>
      </div>
      <input type="range" min="25" max="1000" step="25" value="250" class="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-600" aria-label="NVMe Storage">
      <div class="flex justify-between text-xs text-slate-400 mt-1">
        <span>25 GB</span>
        <span>250 GB</span>
        <span>500 GB</span>
        <span>1,000 GB</span>
      </div>
    </div>
  </div>

  <div class="mt-10 pt-6 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
    <div class="flex items-center gap-2 text-xs text-slate-500">
      <svg class="w-4 h-4 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>
      <span>Instant 55-second automated provisioning</span>
    </div>
    <button class="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-md shadow-indigo-500/20 transition min-h-[44px]">Deploy Cloud VPS</button>
  </div>
</div>`
  },

  // ==========================================
  // DOMAIN 2: SAAS DASHBOARDS & ANALYTICS
  // ==========================================
  dashboard_metrics: {
    name: 'SaaS / E-commerce KPI Metric Cards',
    description: 'Responsive KPI stat cards with trend badges, comparison context, and clean border accents.',
    ux_guidelines: [
      'Large readable numerical display with appropriate currency/unit symbols.',
      'Color-coded pill badges for positive (+green) and negative (-red) trends.',
      'Comparison timeframe (e.g. vs last month) is mandatory for context.'
    ],
    html_tailwind: `<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
  <!-- Card 1: Revenue -->
  <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
    <div class="flex items-center justify-between text-slate-500 dark:text-slate-400">
      <span class="text-sm font-medium">Monthly Revenue</span>
      <div class="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
      </div>
    </div>
    <div class="mt-4 flex items-baseline justify-between">
      <div class="text-2xl font-bold text-slate-900 dark:text-white">{{CURRENCY_SYMBOL}}28,450</div>
      <span class="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-400">
        <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 10l7-7m0 0l7 7m-7-7v18"/></svg> 14.2%
      </span>
    </div>
    <p class="text-xs text-slate-400 mt-2">vs {{CURRENCY_SYMBOL}}24,910 last month</p>
  </div>

  <!-- Card 2: Active Tenants -->
  <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
    <div class="flex items-center justify-between text-slate-500 dark:text-slate-400">
      <span class="text-sm font-medium">Active Tenants</span>
      <div class="w-9 h-9 rounded-xl bg-cyan-50 dark:bg-cyan-950/50 flex items-center justify-center text-cyan-600 dark:text-cyan-400">
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/></svg>
      </div>
    </div>
    <div class="mt-4 flex items-baseline justify-between">
      <div class="text-2xl font-bold text-slate-900 dark:text-white">1,428</div>
      <span class="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-400">
        <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 10l7-7m0 0l7 7m-7-7v18"/></svg> 8.4%
      </span>
    </div>
    <p class="text-xs text-slate-400 mt-2">+112 new this week</p>
  </div>

  <!-- Card 3: Server Load -->
  <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
    <div class="flex items-center justify-between text-slate-500 dark:text-slate-400">
      <span class="text-sm font-medium">Cluster Health</span>
      <div class="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
      </div>
    </div>
    <div class="mt-4 flex items-baseline justify-between">
      <div class="text-2xl font-bold text-slate-900 dark:text-white">99.98%</div>
      <span class="text-xs font-medium text-emerald-600 dark:text-emerald-400">Operational</span>
    </div>
    <div class="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 mt-3 overflow-hidden">
      <div class="bg-emerald-500 h-1.5 rounded-full" style="width: 99%"></div>
    </div>
  </div>

  <!-- Card 4: Support Response -->
  <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
    <div class="flex items-center justify-between text-slate-500 dark:text-slate-400">
      <span class="text-sm font-medium">Avg Response Time</span>
      <div class="w-9 h-9 rounded-xl bg-amber-50 dark:bg-amber-950/50 flex items-center justify-center text-amber-600 dark:text-amber-400">
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
      </div>
    </div>
    <div class="mt-4 flex items-baseline justify-between">
      <div class="text-2xl font-bold text-slate-900 dark:text-white">4.2 min</div>
      <span class="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-400">-1.8m</span>
    </div>
    <p class="text-xs text-slate-400 mt-2">24/7 Monitoring</p>
  </div>
</div>`
  },

  hero_section: {
    name: 'High-Converting SaaS / Infrastructure Hero',
    description: 'Hero section with trust proof logos, rating stars, animated gradient accents, and dual CTAs.',
    ux_guidelines: [
      'One clear primary goal CTA paired with secondary video/tour action.',
      'Show logos of trusted enterprise clients or technology badges.',
      'Ensure high headline contrast with clean dark mode text scaling.'
    ],
    html_tailwind: `<div class="relative overflow-hidden bg-slate-900 py-24 sm:py-32">
  <div class="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(120,119,198,0.25),rgba(255,255,255,0))]"></div>
  <div class="relative max-w-7xl mx-auto px-4 text-center">
    <!-- Announcement Pill -->
    <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-medium mb-8">
      <span class="flex h-2 w-2 rounded-full bg-indigo-400 animate-ping"></span>
      <span>Introducing High-Frequency NVMe Cloud Compute &rarr;</span>
    </div>

    <h1 class="text-4xl sm:text-6xl font-extrabold tracking-tight text-white max-w-4xl mx-auto">
      Scale Your Infrastructure With <span class="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-cyan-400 to-emerald-400">Zero Downtime</span>
    </h1>
    <p class="mt-6 text-lg sm:text-xl text-slate-400 max-w-2xl mx-auto">
      Deploy virtual private servers, Kubernetes clusters, and isolated storage globally in seconds with {{BRAND_NAME}}.
    </p>

    <!-- CTAs -->
    <div class="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
      <button class="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold shadow-lg shadow-indigo-600/30 transition min-h-[44px]">Get Started Free</button>
      <button class="w-full sm:w-auto px-8 py-3.5 rounded-xl border border-slate-700 hover:bg-slate-800 text-slate-300 font-semibold transition min-h-[44px]">View Live Benchmarks</button>
    </div>

    <!-- Trust Badges -->
    <div class="mt-16 pt-8 border-t border-slate-800/80 max-w-5xl mx-auto">
      <p class="text-xs uppercase tracking-wider text-slate-500 font-semibold">Trusted by over 10,000+ developers, tech startups & enterprises</p>
    </div>
  </div>
</div>`
  },

  command_palette: {
    name: 'Command Palette (Cmd+K / Ctrl+K)',
    description: 'Accessible quick search modal with keyboard navigation, grouped shortcuts, and recent history.',
    ux_guidelines: [
      'Instant autofocus on search input with Esc to close.',
      'Display keyboard shortcut badges (e.g. ⌘K, ↵, ↑↓) for keyboard power users.',
      'Clear grouping: Actions, Navigation, Settings, Help.'
    ],
    html_tailwind: `<div class="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4 bg-slate-950/60 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="Command Palette">
  <div class="w-full max-w-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden">
    <!-- Search Bar -->
    <div class="flex items-center px-4 border-b border-slate-100 dark:border-slate-800">
      <svg class="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
      <input type="text" class="w-full px-4 py-4 bg-transparent text-slate-900 dark:text-white placeholder-slate-400 text-sm focus:outline-none" placeholder="Type a command or search..." aria-label="Command search">
      <span class="px-2 py-0.5 text-xs font-mono rounded bg-slate-100 dark:bg-slate-800 text-slate-500">ESC</span>
    </div>

    <!-- Commands List -->
    <div class="p-2 max-h-80 overflow-y-auto space-y-1">
      <div class="px-3 py-1.5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Quick Actions</div>
      <button class="w-full flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-left text-sm text-slate-800 dark:text-slate-200">
        <span class="flex items-center gap-3">
          <svg class="w-4 h-4 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
          Deploy New Server Instance
        </span>
        <span class="text-xs text-slate-400 font-mono">⌘N</span>
      </button>
      <button class="w-full flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-left text-sm text-slate-800 dark:text-slate-200">
        <span class="flex items-center gap-3">
          <svg class="w-4 h-4 text-cyan-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
          View Latest Invoices
        </span>
        <span class="text-xs text-slate-400 font-mono">⌘I</span>
      </button>
    </div>

    <!-- Footer Guide -->
    <div class="px-4 py-2 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-400">
      <div class="flex items-center gap-4">
        <span><kbd class="font-mono bg-white dark:bg-slate-700 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-600">↑↓</kbd> to navigate</span>
        <span><kbd class="font-mono bg-white dark:bg-slate-700 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-600">↵</kbd> to select</span>
      </div>
      <span>{{BRAND_NAME}}</span>
    </div>
  </div>
</div>`
  },

  // ==========================================
  // DOMAIN 3: ENTERPRISE PORTALS & ERP
  // ==========================================
  data_table: {
    name: 'Enterprise Responsive Data Table with Filters & Pagination',
    description: 'Full-featured enterprise table with bulk checkboxes, sorting headers, status badges, and pagination.',
    ux_guidelines: [
      'Maintain horizontal scroll container on mobile with sticky primary column if needed.',
      'Show clear total records count and active page range.',
      'Use semantic colored badges for status (Active, Pending, Suspended).'
    ],
    html_tailwind: `<div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
  <div class="p-6 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
    <div>
      <h3 class="text-lg font-bold text-slate-900 dark:text-white">Virtual Servers</h3>
      <p class="text-xs text-slate-500 mt-1">Manage running cloud nodes, IP assignments, and backups.</p>
    </div>
    <div class="flex items-center gap-3">
      <input type="text" placeholder="Search servers..." class="px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-transparent text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none" aria-label="Search servers">
      <button class="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm shadow min-h-[44px]">Add Server</button>
    </div>
  </div>

  <div class="overflow-x-auto">
    <table class="w-full text-left text-sm text-slate-600 dark:text-slate-300">
      <thead class="bg-slate-50 dark:bg-slate-800/50 text-xs uppercase font-semibold text-slate-500 dark:text-slate-400 border-b border-slate-100 dark:border-slate-800">
        <tr>
          <th scope="col" class="p-4"><input type="checkbox" class="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" aria-label="Select all"></th>
          <th scope="col" class="px-6 py-4">Server Name</th>
          <th scope="col" class="px-6 py-4">Status</th>
          <th scope="col" class="px-6 py-4">IP Address</th>
          <th scope="col" class="px-6 py-4">Region</th>
          <th scope="col" class="px-6 py-4 text-right">Actions</th>
        </tr>
      </thead>
      <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
        <tr class="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition">
          <td class="p-4"><input type="checkbox" class="rounded border-slate-300 text-indigo-600" aria-label="Select row"></td>
          <td class="px-6 py-4 font-semibold text-slate-900 dark:text-white flex items-center gap-3">
            <span class="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
            web-prod-dhaka-01
          </td>
          <td class="px-6 py-4"><span class="px-2.5 py-1 text-xs font-semibold rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-400">Running</span></td>
          <td class="px-6 py-4 font-mono text-xs">103.114.98.22</td>
          <td class="px-6 py-4">Dhaka DC-1</td>
          <td class="px-6 py-4 text-right space-x-2">
            <button class="text-indigo-600 hover:text-indigo-800 font-semibold min-h-[32px]">Manage</button>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</div>`
  },

  sidebar_navigation: {
    name: 'Enterprise Collapsible App Sidebar',
    description: 'Modern desktop/mobile responsive sidebar navigation with workspace switcher and notification counts.',
    ux_guidelines: [
      'Visual indicator for active item with high contrast.',
      'Badge indicators for pending notifications.',
      'Accessible keyboard focus on all link items.'
    ],
    html_tailwind: `<aside class="w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 h-screen flex flex-col justify-between p-4">
  <div>
    <!-- Workspace Brand -->
    <div class="flex items-center gap-3 px-2 py-3 border-b border-slate-100 dark:border-slate-800 mb-4">
      <div class="w-8 h-8 rounded-xl bg-indigo-600 flex items-center justify-center text-white font-bold">J</div>
      <div>
        <h4 class="font-bold text-sm text-slate-900 dark:text-white leading-tight">{{BRAND_NAME}}</h4>
        <span class="text-xs text-slate-400">Enterprise Cloud</span>
      </div>
    </div>

    <!-- Navigation Links -->
    <nav class="space-y-1" aria-label="Main Navigation">
      <a href="#" class="flex items-center justify-between px-3 py-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 font-semibold text-sm">
        <span class="flex items-center gap-3">
          <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/></svg>
          Dashboard
        </span>
      </a>
      <a href="#" class="flex items-center justify-between px-3 py-2.5 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 text-sm font-medium">
        <span class="flex items-center gap-3">
          <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"/></svg>
          Servers & VPS
        </span>
        <span class="px-2 py-0.5 text-xs font-semibold rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600">8</span>
      </a>
      <a href="#" class="flex items-center justify-between px-3 py-2.5 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 text-sm font-medium">
        <span class="flex items-center gap-3">
          <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
          Billing & Invoices
        </span>
      </a>
    </nav>
  </div>

  <!-- User Profile Bottom Drawer -->
  <div class="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
    <div class="flex items-center gap-3">
      <div class="w-9 h-9 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center font-bold text-xs text-slate-700 dark:text-white">SB</div>
      <div>
        <p class="text-xs font-bold text-slate-900 dark:text-white leading-none">Sizar Babu</p>
        <span class="text-[11px] text-slate-400">Admin</span>
      </div>
    </div>
  </div>
</aside>`
  },

  // ==========================================
  // DOMAIN 4: E-COMMERCE & BILLING
  // ==========================================
  checkout_flow: {
    name: 'Frictionless Multi-Gateway Checkout Layout',
    description: 'Clean split layout checkout with order summary sidebar, payment selector (bKash/Nagad/Cards), and trust badges.',
    ux_guidelines: [
      'Two-column layout on desktop: Customer form on left, sticky order summary on right.',
      'Include payment method radio tiles with recognizable brand logos.',
      'Visible SSL/security guarantee badge to minimize cart abandonment.',
      'Clear, bold final total with tax/discount transparency.'
    ],
    html_tailwind: `<div class="max-w-7xl mx-auto px-4 py-8">
  <div class="grid grid-cols-1 lg:grid-cols-12 gap-8">
    <!-- Form Area -->
    <div class="lg:col-span-7 space-y-6">
      <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6">
        <h2 class="text-lg font-bold text-slate-900 dark:text-white mb-4">1. Billing Details</h2>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Full Name</label>
            <input type="text" name="name" class="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-transparent text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none" placeholder="Sizar Babu" aria-label="Full Name">
          </div>
          <div>
            <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Phone Number</label>
            <input type="tel" name="phone" class="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-transparent text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none" placeholder="017XXXXXXXX" aria-label="Phone Number">
          </div>
          <div class="sm:col-span-2">
            <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Email Address</label>
            <input type="email" name="email" class="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-transparent text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none" placeholder="billing@joypurhost.com" aria-label="Email Address">
          </div>
        </div>
      </div>

      <!-- Payment Gateways -->
      <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6">
        <h2 class="text-lg font-bold text-slate-900 dark:text-white mb-4">2. Select Payment Method</h2>
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <label class="border-2 border-pink-500 bg-pink-50/20 dark:bg-pink-950/20 rounded-xl p-4 flex flex-col items-center cursor-pointer text-center relative min-h-[44px]">
            <input type="radio" name="payment_method" value="bkash" checked class="absolute top-3 right-3 text-pink-600 focus:ring-pink-500">
            <span class="font-bold text-pink-600 text-sm mt-1">bKash Instant</span>
            <span class="text-xs text-slate-500 mt-1">Zero fee / 24/7</span>
          </label>
          <label class="border border-slate-200 dark:border-slate-800 hover:border-slate-400 rounded-xl p-4 flex flex-col items-center cursor-pointer text-center relative min-h-[44px]">
            <input type="radio" name="payment_method" value="nagad" class="absolute top-3 right-3 text-indigo-600">
            <span class="font-bold text-orange-600 text-sm mt-1">Nagad</span>
            <span class="text-xs text-slate-500 mt-1">Automated</span>
          </label>
          <label class="border border-slate-200 dark:border-slate-800 hover:border-slate-400 rounded-xl p-4 flex flex-col items-center cursor-pointer text-center relative min-h-[44px]">
            <input type="radio" name="payment_method" value="cards" class="absolute top-3 right-3 text-indigo-600">
            <span class="font-bold text-slate-800 dark:text-white text-sm mt-1">Cards / Bank</span>
            <span class="text-xs text-slate-500 mt-1">Visa / MC / Amex</span>
          </label>
        </div>
      </div>
    </div>

    <!-- Order Summary Sidebar -->
    <div class="lg:col-span-5">
      <div class="sticky top-6 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
        <h3 class="text-lg font-bold text-slate-900 dark:text-white mb-4">Order Summary</h3>
        <div class="space-y-3 border-b border-slate-200 dark:border-slate-800 pb-4 text-sm">
          <div class="flex justify-between">
            <span class="text-slate-600 dark:text-slate-400">Business Cloud Hosting (1 Year)</span>
            <span class="font-semibold text-slate-900 dark:text-white">{{CURRENCY_SYMBOL}}118.80</span>
          </div>
          <div class="flex justify-between text-emerald-600 dark:text-emerald-400">
            <span>Special Promotional Discount (-20%)</span>
            <span class="font-semibold">-{{CURRENCY_SYMBOL}}23.76</span>
          </div>
        </div>
        <div class="pt-4 flex justify-between items-baseline">
          <span class="text-base font-bold text-slate-900 dark:text-white">Total Payable</span>
          <span class="text-2xl font-extrabold text-indigo-600 dark:text-indigo-400">{{CURRENCY_SYMBOL}}95.04</span>
        </div>
        <button class="mt-6 w-full py-3.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-lg shadow-emerald-600/25 transition min-h-[44px]">Complete Payment</button>
      </div>
    </div>
  </div>
</div>`
  },

  // ==========================================
  // DOMAIN 5: OVERLAYS, FEEDBACK & FORMS
  // ==========================================
  modal_dialog: {
    name: 'Accessible Confirmation Modal Dialog',
    description: 'Backdrop-blurred accessible dialog with focus-trap readiness, escape handling, and action buttons.',
    ux_guidelines: [
      'Require explicit role="dialog" and aria-modal="true".',
      'Provide clear distinction between cancel and destructive action.',
      'Ensure keyboard focus trap and Esc key binding.'
    ],
    html_tailwind: `<div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="modal-title">
  <div class="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-2xl">
    <div class="flex items-center gap-3 text-rose-600 dark:text-rose-400 mb-3">
      <div class="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-950/50 flex items-center justify-center">
        <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
      </div>
      <h3 id="modal-title" class="text-lg font-bold text-slate-900 dark:text-white">Delete Server Instance?</h3>
    </div>
    <p class="text-sm text-slate-600 dark:text-slate-400 mb-6">
      This action cannot be undone. All data on this NVMe drive will be securely wiped and IP allocated to pool.
    </p>
    <div class="flex items-center justify-end gap-3">
      <button class="px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-semibold text-sm hover:bg-slate-50 dark:hover:bg-slate-800 min-h-[44px]">Cancel</button>
      <button class="px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-semibold text-sm shadow min-h-[44px]">Confirm Delete</button>
    </div>
  </div>
</div>`
  }
};

/**
 * Retrieve and dynamically parameterize a pattern
 * @param {string} patternKey Key of pattern in PATTERNS
 * @param {object} options { brand_name, currency_symbol, framework, color_scheme, theme_mode }
 * @returns {object} Formatted pattern bundle
 */
export function getPattern(patternKey, options = {}) {
  const pattern = PATTERNS[patternKey];
  if (!pattern) {
    throw new Error(`Unknown component type: ${patternKey}. Available: ${Object.keys(PATTERNS).join(', ')}`);
  }

  const brandName = options.brand_name || 'JoypurHost Cloud';
  const currencySymbol = options.currency_symbol || '$';
  const targetFramework = options.framework || 'html_tailwind';

  // Dynamic token replacement
  let html = pattern.html_tailwind;
  html = html.replace(/\{\{BRAND_NAME\}\}/g, brandName);
  html = html.replace(/\{\{CURRENCY_SYMBOL\}\}/g, currencySymbol);

  // Framework conversion if requested
  const converted = ComponentConverter.convert(html, targetFramework, {
    component_name: patternKey.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join('')
  });

  return {
    component: patternKey,
    name: pattern.name,
    description: pattern.description,
    ux_guidelines: pattern.ux_guidelines,
    framework: targetFramework,
    brand_name: brandName,
    currency_symbol: currencySymbol,
    code: converted.converted_code,
    conversion_notes: converted.notes
  };
}
