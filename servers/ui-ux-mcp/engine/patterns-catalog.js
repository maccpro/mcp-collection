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
import { ColorEngine } from './color-engine.js';

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
  },

  stat_cards_kpi: {
    name: 'Executive SaaS / Cloud KPI Stat Cards Grid',
    description: '4-column KPI telemetry grid with growth badges, trend sparkline placeholders, and accessible contrast indicators.',
    ux_guidelines: [
      'Use emerald for positive growth and rose for negative churn.',
      'Provide aria-label describing trend direction and percentage for screen readers.',
      'Ensure cards are touch-friendly with subtle hover elevations.'
    ],
    html_tailwind: `<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 w-full">
  <!-- Card 1: MRR -->
  <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm hover:shadow-md transition">
    <div class="flex items-center justify-between">
      <span class="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Monthly Revenue</span>
      <span class="inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400">
        <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 10l7-7m0 0l7 7m-7-7v18"/></svg>
        +14.2%
      </span>
    </div>
    <div class="mt-4 flex items-baseline gap-2">
      <span class="text-3xl font-extrabold text-slate-900 dark:text-white">{{CURRENCY_SYMBOL}}48,290</span>
      <span class="text-xs text-slate-400">vs last mo.</span>
    </div>
    <div class="mt-4 h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
      <div class="bg-indigo-600 h-1.5 rounded-full" style="width: 78%"></div>
    </div>
  </div>

  <!-- Card 2: Active Cloud VPS -->
  <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm hover:shadow-md transition">
    <div class="flex items-center justify-between">
      <span class="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Active Instances</span>
      <span class="inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400">
        <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 10l7-7m0 0l7 7m-7-7v18"/></svg>
        +8.6%
      </span>
    </div>
    <div class="mt-4 flex items-baseline gap-2">
      <span class="text-3xl font-extrabold text-slate-900 dark:text-white">1,429</span>
      <span class="text-xs text-slate-400">nodes deployed</span>
    </div>
    <div class="mt-4 h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
      <div class="bg-emerald-500 h-1.5 rounded-full" style="width: 86%"></div>
    </div>
  </div>

  <!-- Card 3: Global Latency -->
  <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm hover:shadow-md transition">
    <div class="flex items-center justify-between">
      <span class="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Avg Edge Latency</span>
      <span class="inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400">
        -4ms
      </span>
    </div>
    <div class="mt-4 flex items-baseline gap-2">
      <span class="text-3xl font-extrabold text-slate-900 dark:text-white">18.4ms</span>
      <span class="text-xs text-slate-400">BGP optimized</span>
    </div>
    <div class="mt-4 h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
      <div class="bg-cyan-500 h-1.5 rounded-full" style="width: 94%"></div>
    </div>
  </div>

  <!-- Card 4: Uptime SLA -->
  <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm hover:shadow-md transition">
    <div class="flex items-center justify-between">
      <span class="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Infrastructure SLA</span>
      <span class="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
        <span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
        Operational
      </span>
    </div>
    <div class="mt-4 flex items-baseline gap-2">
      <span class="text-3xl font-extrabold text-slate-900 dark:text-white">99.98%</span>
      <span class="text-xs text-slate-400">last 90 days</span>
    </div>
    <div class="mt-4 h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
      <div class="bg-indigo-600 h-1.5 rounded-full" style="width: 99%"></div>
    </div>
  </div>
</div>`
  },

  user_management_table: {
    name: 'Enterprise RBAC Team & User Management Table',
    description: 'Role-based access control table with avatars, 2FA security badges, role selectors, and bulk actions.',
    ux_guidelines: [
      'Display clear status badges (Active, Pending, Suspended) with high-contrast text.',
      'Show 2FA security indicators to help admins enforce zero-trust access.',
      'Include accessible action buttons with min-h-[44px] hit areas.'
    ],
    html_tailwind: `<div class="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
  <div class="p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800">
    <div>
      <h3 class="text-lg font-bold text-slate-900 dark:text-white">Team Members</h3>
      <p class="text-sm text-slate-500 dark:text-slate-400">Manage permissions, invite operators, and inspect 2FA security status on {{BRAND_NAME}}.</p>
    </div>
    <div class="flex items-center gap-3">
      <button class="px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-sm font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition min-h-[44px]">Export CSV</button>
      <button class="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold shadow-sm transition min-h-[44px] inline-flex items-center gap-2">
        <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
        Invite Member
      </button>
    </div>
  </div>

  <div class="overflow-x-auto">
    <table class="w-full text-left border-collapse">
      <thead>
        <tr class="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
          <th scope="col" class="py-4 px-6">User</th>
          <th scope="col" class="py-4 px-6">Role</th>
          <th scope="col" class="py-4 px-6">Status</th>
          <th scope="col" class="py-4 px-6">2FA Security</th>
          <th scope="col" class="py-4 px-6 text-right">Actions</th>
        </tr>
      </thead>
      <tbody class="divide-y divide-slate-100 dark:divide-slate-800 text-sm">
        <tr class="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition">
          <td class="py-4 px-6 flex items-center gap-3">
            <div class="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-400 font-bold flex items-center justify-center shrink-0">SB</div>
            <div>
              <div class="font-bold text-slate-900 dark:text-white">Sizar Babu</div>
              <div class="text-xs text-slate-500">sizar@joypurhost.com</div>
            </div>
          </td>
          <td class="py-4 px-6">
            <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300">Super Admin</span>
          </td>
          <td class="py-4 px-6">
            <span class="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700 dark:text-emerald-400">
              <span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Active
            </span>
          </td>
          <td class="py-4 px-6">
            <span class="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/></svg>
              Enforced (Hardware)
            </span>
          </td>
          <td class="py-4 px-6 text-right">
            <button class="px-3 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg min-h-[36px]">Edit</button>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</div>`
  },

  invoice_receipt_template: {
    name: 'Printable Enterprise Tax Invoice & Receipt',
    description: 'Official corporate billing invoice with itemized table, VAT/Tax calculation, paid stamp, and print media CSS.',
    ux_guidelines: [
      'Include print:hidden on control buttons and print:border-none for paper generation.',
      'Ensure high-contrast typography satisfying WCAG AAA for financial documents.',
      'Provide clear breakdown of subtotal, tax percentages, and final payable balance.'
    ],
    html_tailwind: `<div class="max-w-4xl mx-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-8 sm:p-12 shadow-sm print:shadow-none print:border-none print:p-0">
  <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-6 border-b border-slate-200 dark:border-slate-800 pb-8">
    <div>
      <h2 class="text-2xl font-black text-slate-900 dark:text-white tracking-tight">{{BRAND_NAME}}</h2>
      <p class="text-xs text-slate-500 mt-1">Enterprise Cloud & Data Center Infrastructure</p>
    </div>
    <div class="sm:text-right">
      <span class="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-400 mb-2">Paid In Full</span>
      <div class="text-sm font-bold text-slate-900 dark:text-white">Invoice #INV-2026-8941</div>
      <div class="text-xs text-slate-500">Date: Sep 28, 2026</div>
    </div>
  </div>

  <div class="grid grid-cols-1 sm:grid-cols-2 gap-8 my-8 text-sm">
    <div>
      <span class="text-xs font-semibold text-slate-400 uppercase tracking-wider">Billed To</span>
      <div class="mt-2 font-bold text-slate-900 dark:text-white">JoypurColo Enterprise Ltd.</div>
      <div class="text-slate-600 dark:text-slate-400 text-xs mt-1">Joypurhat, Bangladesh</div>
      <div class="text-slate-600 dark:text-slate-400 text-xs">VAT / BIN: 001928471-0201</div>
    </div>
    <div class="sm:text-right">
      <span class="text-xs font-semibold text-slate-400 uppercase tracking-wider">Payment Details</span>
      <div class="mt-2 font-bold text-slate-900 dark:text-white">Direct Bank / Card</div>
      <div class="text-slate-600 dark:text-slate-400 text-xs mt-1">Txn ID: TXN_8819204918</div>
      <div class="text-slate-600 dark:text-slate-400 text-xs">Payment Date: Sep 28, 2026</div>
    </div>
  </div>

  <table class="w-full text-left border-collapse my-8">
    <thead>
      <tr class="border-b border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-500 uppercase tracking-wider">
        <th scope="col" class="py-3">Description</th>
        <th scope="col" class="py-3 text-center">Period</th>
        <th scope="col" class="py-3 text-right">Amount</th>
      </tr>
    </thead>
    <tbody class="divide-y divide-slate-100 dark:divide-slate-800 text-sm">
      <tr>
        <td class="py-4">
          <div class="font-bold text-slate-900 dark:text-white">High-Memory NVMe Cloud VPS (16 vCPU, 32 GB RAM)</div>
          <div class="text-xs text-slate-500">Primary Node (BGP Anycast Dhaka)</div>
        </td>
        <td class="py-4 text-center text-slate-600 dark:text-slate-400 text-xs">1 Year</td>
        <td class="py-4 text-right font-semibold text-slate-900 dark:text-white">{{CURRENCY_SYMBOL}}420.00</td>
      </tr>
    </tbody>
  </table>

  <div class="border-t border-slate-200 dark:border-slate-800 pt-6 flex justify-end">
    <div class="w-full max-w-xs space-y-2 text-sm">
      <div class="flex justify-between text-slate-600 dark:text-slate-400">
        <span>Subtotal</span>
        <span>{{CURRENCY_SYMBOL}}420.00</span>
      </div>
      <div class="flex justify-between text-slate-600 dark:text-slate-400">
        <span>Standard VAT (5%)</span>
        <span>{{CURRENCY_SYMBOL}}21.00</span>
      </div>
      <div class="flex justify-between pt-3 border-t border-slate-200 dark:border-slate-800 font-extrabold text-base text-slate-900 dark:text-white">
        <span>Total Paid</span>
        <span class="text-indigo-600 dark:text-indigo-400">{{CURRENCY_SYMBOL}}441.00</span>
      </div>
    </div>
  </div>
</div>`
  },

  settings_tabs_layout: {
    name: 'Enterprise Account & Infrastructure Settings Shell',
    description: 'Master-detail settings screen with vertical navigation tabs on desktop, responsive container, and save actions.',
    ux_guidelines: [
      'Keep destructive actions (Delete account/server) separated at the bottom in a red danger card.',
      'Provide clear form labels associated with inputs.',
      'Ensure sticky bottom action bar or dedicated primary save CTA.'
    ],
    html_tailwind: `<div class="max-w-6xl mx-auto w-full">
  <div class="mb-8">
    <h1 class="text-2xl font-bold text-slate-900 dark:text-white">Organization Settings</h1>
    <p class="text-sm text-slate-500 mt-1">Configure security policies, API credentials, and notifications for {{BRAND_NAME}}.</p>
  </div>

  <div class="grid grid-cols-1 md:grid-cols-4 gap-8">
    <!-- Sidebar Navigation -->
    <nav class="space-y-1">
      <a href="#general" class="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 font-semibold text-sm min-h-[44px]">General Profile</a>
      <a href="#security" class="flex items-center gap-3 px-4 py-2.5 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 font-medium text-sm min-h-[44px]">Security & 2FA</a>
      <a href="#billing" class="flex items-center gap-3 px-4 py-2.5 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 font-medium text-sm min-h-[44px]">Billing & Plans</a>
      <a href="#api" class="flex items-center gap-3 px-4 py-2.5 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 font-medium text-sm min-h-[44px]">API Tokens</a>
    </nav>

    <!-- Main Content Form -->
    <div class="md:col-span-3 space-y-6">
      <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
        <h3 class="text-lg font-bold text-slate-900 dark:text-white mb-1">Company Profile</h3>
        <p class="text-xs text-slate-500 mb-6">This information appears on public billing statements.</p>
        
        <div class="space-y-4">
          <div>
            <label for="company_name" class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Company Name</label>
            <input type="text" id="company_name" name="company_name" value="JoypurHost" class="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500 min-h-[44px]" />
          </div>
          <div>
            <label for="billing_email" class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Billing Email</label>
            <input type="email" id="billing_email" name="billing_email" value="billing@joypurhost.com" class="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500 min-h-[44px]" />
          </div>
        </div>

        <div class="mt-6 flex justify-end">
          <button class="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm shadow transition min-h-[44px]">Save Changes</button>
        </div>
      </div>
    </div>
  </div>
</div>`
  },

  notification_feed: {
    name: 'Real-Time Infrastructure Audit & Alert Timeline',
    description: 'Event activity timeline with severity dot pulses, timestamps, actor avatars, and unread toggles.',
    ux_guidelines: [
      'Use standard semantic colors: Emerald (success), Amber (warning), Rose (error), Indigo (system info).',
      'Provide clear relative timestamps (e.g. 5m ago, 2h ago).',
      'Ensure timeline connector lines have sufficient contrast against dark/light surfaces.'
    ],
    html_tailwind: `<div class="w-full max-w-3xl mx-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
  <div class="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4 mb-6">
    <div class="flex items-center gap-3">
      <div class="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
        <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/></svg>
      </div>
      <div>
        <h3 class="text-base font-bold text-slate-900 dark:text-white">Audit & Security Log</h3>
        <p class="text-xs text-slate-400">System actions executed across {{BRAND_NAME}} cluster.</p>
      </div>
    </div>
    <button class="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline min-h-[36px]">Mark all read</button>
  </div>

  <div class="relative pl-6 space-y-6 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200 dark:before:bg-slate-800">
    <!-- Item 1: Success -->
    <div class="relative">
      <div class="absolute -left-[27px] top-1 w-3.5 h-3.5 rounded-full bg-emerald-500 ring-4 ring-white dark:ring-slate-900"></div>
      <div class="flex items-baseline justify-between gap-4">
        <p class="text-sm font-semibold text-slate-900 dark:text-white">Automated Snapshot Created</p>
        <span class="text-xs text-slate-400 shrink-0">4m ago</span>
      </div>
      <p class="text-xs text-slate-500 mt-1">Nightly NVMe backup finished successfully for instance node-dhk-01 (14.2 GB compressed).</p>
    </div>

    <!-- Item 2: Warning -->
    <div class="relative">
      <div class="absolute -left-[27px] top-1 w-3.5 h-3.5 rounded-full bg-amber-500 ring-4 ring-white dark:ring-slate-900"></div>
      <div class="flex items-baseline justify-between gap-4">
        <p class="text-sm font-semibold text-slate-900 dark:text-white">High Memory Utilization Warning</p>
        <span class="text-xs text-slate-400 shrink-0">1h ago</span>
      </div>
      <p class="text-xs text-slate-500 mt-1">Database node-02 reached 87% RAM allocation. Auto-scaling recommended.</p>
    </div>
  </div>
</div>`
  },

  filter_bar_search: {
    name: 'Advanced Search Toolbar & Multi-Select Filter Bar',
    description: 'Data filtering bar with search input, dropdown filter triggers, active tags, and grid/list view switcher.',
    ux_guidelines: [
      'Provide immediate clear-all CTA for active filters.',
      'Include keyboard shortcut indicator (/ or Ctrl+K) in the search field.',
      'Ensure touch targets for filter pills are at least 44px tall.'
    ],
    html_tailwind: `<div class="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm space-y-3">
  <div class="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
    <!-- Search Input -->
    <div class="relative flex-1">
      <svg class="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
      <input type="text" placeholder="Search servers, IPs, or tags... (Press / to focus)" class="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500 min-h-[44px]" aria-label="Search servers" />
    </div>

    <!-- Filter Buttons -->
    <div class="flex items-center gap-2">
      <button class="px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-1.5 min-h-[44px]">
        <svg class="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"/></svg>
        Status: <span class="font-bold text-indigo-600 dark:text-indigo-400">All (84)</span>
      </button>
      <button class="px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 min-h-[44px]">Region: BGP Dhaka</button>
    </div>
  </div>

  <!-- Active Filter Pills -->
  <div class="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
    <span class="text-xs text-slate-400">Active filters:</span>
    <span class="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
      Region: Asia-BD
      <button class="hover:text-indigo-900" aria-label="Remove filter">&times;</button>
    </span>
    <button class="text-xs text-rose-500 font-semibold hover:underline ml-2">Reset all</button>
  </div>
</div>`
  },

  empty_state_screen: {
    name: 'High-Converting Empty State Screen',
    description: 'Empty state placeholder with SVG illustration container, descriptive guidance, and primary creation CTA.',
    ux_guidelines: [
      'Give clear guidance on what the feature does and why it is currently empty.',
      'Provide a prominent primary action to unblock the user immediately.',
      'Include a secondary link to relevant documentation.'
    ],
    html_tailwind: `<div class="w-full max-w-xl mx-auto text-center py-16 px-4 bg-white dark:bg-slate-900 border border-dashed border-slate-300 dark:border-slate-800 rounded-3xl p-8">
  <div class="w-16 h-16 mx-auto rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-6">
    <svg class="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.75" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"/></svg>
  </div>
  <h3 class="text-xl font-bold text-slate-900 dark:text-white">No Cloud Instances Deployed</h3>
  <p class="mt-2 text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto">
    You haven't provisioned any NVMe cloud servers or databases yet on {{BRAND_NAME}}. Launch high-speed instances with instant setup.
  </p>
  <div class="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
    <button class="w-full sm:w-auto px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-md transition min-h-[44px]">Deploy First Server</button>
    <a href="#docs" class="w-full sm:w-auto px-5 py-3 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-semibold text-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition min-h-[44px] inline-flex items-center justify-center">Read Quickstart</a>
  </div>
</div>`
  },

  file_upload_dropzone: {
    name: 'Drag-and-Drop File Upload Zone with Progress Tracker',
    description: 'Accessible file dropzone with accepted format pills, file size limits, and animated upload progress card.',
    ux_guidelines: [
      'Explicitly state allowed MIME types and max upload file size.',
      'Provide visual feedback when dragging over the container.',
      'Show progress bar with numerical percentage during active transfer.'
    ],
    html_tailwind: `<div class="w-full max-w-2xl mx-auto space-y-4">
  <div class="border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-indigo-500 dark:hover:border-indigo-500 rounded-3xl p-8 text-center bg-slate-50/50 dark:bg-slate-900/50 transition cursor-pointer">
    <div class="w-12 h-12 mx-auto rounded-2xl bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-4">
      <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"/></svg>
    </div>
    <div class="text-sm font-semibold text-slate-900 dark:text-white">
      <span>Drop files to upload, or </span>
      <span class="text-indigo-600 dark:text-indigo-400 underline">browse</span>
    </div>
    <p class="text-xs text-slate-400 mt-1">Supports SSL certificates, backup TAR.GZ, or SQL dumps up to 500 MB.</p>
  </div>

  <!-- Upload Progress Card -->
  <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm flex items-center gap-4">
    <div class="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center font-bold text-xs shrink-0">SQL</div>
    <div class="flex-1 min-w-0">
      <div class="flex justify-between text-xs font-semibold mb-1">
        <span class="truncate text-slate-900 dark:text-white">database_backup_production.sql.gz</span>
        <span class="text-indigo-600 dark:text-indigo-400">74%</span>
      </div>
      <div class="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
        <div class="bg-indigo-600 h-1.5 rounded-full transition-all duration-300" style="width: 74%"></div>
      </div>
      <div class="flex justify-between text-[11px] text-slate-400 mt-1">
        <span>142 MB of 192 MB</span>
        <span>24s remaining</span>
      </div>
    </div>
  </div>
</div>`
  },

  stepper_wizard: {
    name: 'Multi-Step Cloud Provisioning Stepper Wizard',
    description: '4-step guided deployment stepper with completed checkmarks, active glowing ring, and action controls.',
    ux_guidelines: [
      'Display step numbers and clear labels for orientation.',
      'Disable next step button until form validation passes.',
      'Allow clicking completed previous steps to navigate back safely.'
    ],
    html_tailwind: `<div class="w-full max-w-4xl mx-auto space-y-8">
  <!-- Stepper Indicator -->
  <div class="flex items-center justify-between w-full">
    <!-- Step 1: Completed -->
    <div class="flex items-center gap-3">
      <div class="w-10 h-10 rounded-full bg-emerald-500 text-white flex items-center justify-center font-bold text-sm shadow-sm">
        <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/></svg>
      </div>
      <div class="hidden sm:block">
        <div class="text-xs text-slate-400 font-semibold uppercase">Step 1</div>
        <div class="text-sm font-bold text-slate-900 dark:text-white">Choose Plan</div>
      </div>
    </div>
    <div class="flex-1 h-0.5 mx-4 bg-emerald-500"></div>

    <!-- Step 2: Active -->
    <div class="flex items-center gap-3">
      <div class="w-10 h-10 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-sm ring-4 ring-indigo-100 dark:ring-indigo-950/60 shadow">2</div>
      <div class="hidden sm:block">
        <div class="text-xs text-indigo-600 dark:text-indigo-400 font-semibold uppercase">Step 2</div>
        <div class="text-sm font-bold text-slate-900 dark:text-white">Select Region</div>
      </div>
    </div>
    <div class="flex-1 h-0.5 mx-4 bg-slate-200 dark:bg-slate-800"></div>

    <!-- Step 3: Pending -->
    <div class="flex items-center gap-3 opacity-60">
      <div class="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 flex items-center justify-center font-bold text-sm">3</div>
      <div class="hidden sm:block">
        <div class="text-xs text-slate-400 font-semibold uppercase">Step 3</div>
        <div class="text-sm font-semibold text-slate-500">Security & SSH</div>
      </div>
    </div>
  </div>

  <!-- Wizard Content Container -->
  <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 shadow-sm">
    <h3 class="text-xl font-bold text-slate-900 dark:text-white mb-2">Select Cloud Datacenter Location</h3>
    <p class="text-sm text-slate-500 mb-6">Choose the region closest to your visitors for lowest ping and latency on {{BRAND_NAME}}.</p>
    
    <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <div class="p-5 rounded-2xl border-2 border-indigo-600 bg-indigo-50/20 dark:bg-indigo-950/20 cursor-pointer">
        <span class="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase">Recommended</span>
        <div class="text-base font-bold text-slate-900 dark:text-white mt-1">Dhaka, Bangladesh</div>
        <div class="text-xs text-slate-500 mt-1">Latency: ~4ms</div>
      </div>
      <div class="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 hover:border-slate-300 cursor-pointer">
        <span class="text-xs font-semibold text-slate-400 uppercase">Asia-Pacific</span>
        <div class="text-base font-bold text-slate-900 dark:text-white mt-1">Singapore</div>
        <div class="text-xs text-slate-500 mt-1">Latency: ~32ms</div>
      </div>
      <div class="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 hover:border-slate-300 cursor-pointer">
        <span class="text-xs font-semibold text-slate-400 uppercase">Europe</span>
        <div class="text-base font-bold text-slate-900 dark:text-white mt-1">Frankfurt, Germany</div>
        <div class="text-xs text-slate-500 mt-1">Latency: ~120ms</div>
      </div>
    </div>

    <div class="mt-8 pt-6 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center">
      <button class="px-5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-semibold text-sm hover:bg-slate-50 dark:hover:bg-slate-800 min-h-[44px]">Back</button>
      <button class="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow transition min-h-[44px]">Continue to SSH Keys</button>
    </div>
  </div>
</div>`
  },

  two_factor_auth_form: {
    name: 'Secure Two-Factor Authentication (2FA) OTP Verification',
    description: '6-digit split verification code form with countdown resend timer and backup recovery link.',
    ux_guidelines: [
      'Use pattern="[0-9]*" and inputmode="numeric" for mobile numeric keyboard.',
      'Auto-focus first digit and support pasting complete 6-digit codes.',
      'Provide fallback authentication option if phone/authenticator is lost.'
    ],
    html_tailwind: `<div class="w-full max-w-md mx-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 shadow-xl text-center">
  <div class="w-14 h-14 mx-auto rounded-2xl bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-6">
    <svg class="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/></svg>
  </div>
  <h2 class="text-2xl font-bold text-slate-900 dark:text-white">Two-Factor Authentication</h2>
  <p class="text-sm text-slate-500 mt-2">Enter the 6-digit verification code sent to your authenticator app for {{BRAND_NAME}}.</p>

  <form class="mt-8 space-y-6">
    <!-- 6-digit OTP Inputs -->
    <div class="flex justify-center gap-2 sm:gap-3">
      <input type="text" maxlength="1" pattern="[0-9]*" inputmode="numeric" class="w-12 h-14 text-center text-2xl font-extrabold rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" aria-label="Digit 1" autofocus />
      <input type="text" maxlength="1" pattern="[0-9]*" inputmode="numeric" class="w-12 h-14 text-center text-2xl font-extrabold rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" aria-label="Digit 2" />
      <input type="text" maxlength="1" pattern="[0-9]*" inputmode="numeric" class="w-12 h-14 text-center text-2xl font-extrabold rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" aria-label="Digit 3" />
      <input type="text" maxlength="1" pattern="[0-9]*" inputmode="numeric" class="w-12 h-14 text-center text-2xl font-extrabold rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" aria-label="Digit 4" />
      <input type="text" maxlength="1" pattern="[0-9]*" inputmode="numeric" class="w-12 h-14 text-center text-2xl font-extrabold rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" aria-label="Digit 5" />
      <input type="text" maxlength="1" pattern="[0-9]*" inputmode="numeric" class="w-12 h-14 text-center text-2xl font-extrabold rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" aria-label="Digit 6" />
    </div>

    <button type="submit" class="w-full py-3.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-lg shadow-indigo-600/25 transition min-h-[44px]">Verify & Sign In</button>
  </form>

  <div class="mt-6 flex flex-col gap-2 text-xs text-slate-500">
    <div>Didn't receive code? <button class="text-indigo-600 dark:text-indigo-400 font-semibold hover:underline">Resend in 42s</button></div>
    <a href="#recovery" class="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 mt-2">Use emergency recovery code</a>
  </div>
</div>`
  },

  status_page_incident: {
    name: 'Infrastructure Uptime & Operational Incident Status',
    description: 'Public status page with operational health banner, 90-day uptime bars, and incident notice timeline.',
    ux_guidelines: [
      'Use green (#10B981) for operational, amber for partial degradation, and red for major outage.',
      'Show 90 daily uptime bars with subtle gap and hover tooltips.',
      'Provide subscribe to updates button for mission-critical notifications.'
    ],
    html_tailwind: `<div class="max-w-4xl mx-auto w-full space-y-8">
  <!-- Operational Banner -->
  <div class="p-6 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 flex items-center justify-between">
    <div class="flex items-center gap-3">
      <div class="w-3.5 h-3.5 rounded-full bg-emerald-500 animate-pulse"></div>
      <h2 class="text-lg font-bold text-emerald-950 dark:text-emerald-200">All {{BRAND_NAME}} Systems Operational</h2>
    </div>
    <span class="text-xs font-semibold text-emerald-800 dark:text-emerald-400">Refreshed 1m ago</span>
  </div>

  <!-- Uptime Bars -->
  <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
    <div class="flex justify-between items-center mb-4">
      <h3 class="text-sm font-bold text-slate-900 dark:text-white">API & Edge DNS Gateway</h3>
      <span class="text-xs font-semibold text-emerald-600 dark:text-emerald-400">99.99% Uptime</span>
    </div>
    <div class="grid grid-cols-45 sm:grid-cols-90 gap-1 h-8 items-end">
      <!-- 90 bars simulation -->
      <div class="bg-emerald-500 h-full rounded-sm" title="Day 1: 100%"></div>
      <div class="bg-emerald-500 h-full rounded-sm" title="Day 2: 100%"></div>
      <div class="bg-emerald-500 h-full rounded-sm" title="Day 3: 100%"></div>
      <div class="bg-emerald-500 h-full rounded-sm" title="Day 4: 100%"></div>
      <div class="bg-emerald-500 h-full rounded-sm" title="Day 5: 100%"></div>
      <div class="bg-amber-400 h-4/5 rounded-sm" title="Day 6: 99.8% Minor Latency"></div>
      <div class="bg-emerald-500 h-full rounded-sm" title="Day 7: 100%"></div>
    </div>
    <div class="flex justify-between text-[11px] text-slate-400 mt-2">
      <span>90 days ago</span>
      <span>Today</span>
    </div>
  </div>
</div>`
  },

  domain_search_box: {
    name: 'High-Converting Cloud Domain Registrar Search Bar',
    description: 'Domain availability search bar with instant TLD pricing badges and search execution.',
    ux_guidelines: [
      'Position search CTA inside input on desktop for sleek alignment.',
      'Show popular TLD prices directly underneath to stimulate impulse searches.',
      'Highlight Bangladesh local ccTLD (.com.bd / .bd) alongside international TLDs.'
    ],
    html_tailwind: `<div class="max-w-3xl mx-auto w-full text-center py-10 px-4">
  <h2 class="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">Find your ideal domain name</h2>
  <p class="mt-2 text-sm text-slate-600 dark:text-slate-400">Instant registration with free DNS management, WHOIS privacy, and SSL on {{BRAND_NAME}}.</p>

  <form class="mt-8 relative max-w-2xl mx-auto">
    <div class="flex flex-col sm:flex-row items-center gap-2 p-1.5 rounded-2xl bg-white dark:bg-slate-900 border-2 border-indigo-600 shadow-xl">
      <div class="flex-1 flex items-center w-full px-3">
        <svg class="w-5 h-5 text-slate-400 mr-2 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
        <input type="text" placeholder="yourbusiness.com" class="w-full py-2 bg-transparent text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none text-base font-medium min-h-[44px]" aria-label="Domain search" />
      </div>
      <button type="submit" class="w-full sm:w-auto px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow transition min-h-[44px]">Search Domain</button>
    </div>
  </form>

  <div class="mt-6 flex flex-wrap items-center justify-center gap-4 text-xs font-medium text-slate-600 dark:text-slate-400">
    <span class="font-bold text-slate-900 dark:text-white">.com <span class="text-indigo-600 dark:text-indigo-400">{{CURRENCY_SYMBOL}}10.99</span></span>
    <span class="text-slate-300">&bull;</span>
    <span class="font-bold text-slate-900 dark:text-white">.com.bd <span class="text-indigo-600 dark:text-indigo-400">{{CURRENCY_SYMBOL}}12.50</span></span>
    <span class="text-slate-300">&bull;</span>
    <span class="font-bold text-slate-900 dark:text-white">.net <span class="text-indigo-600 dark:text-indigo-400">{{CURRENCY_SYMBOL}}12.99</span></span>
    <span class="text-slate-300">&bull;</span>
    <span class="font-bold text-slate-900 dark:text-white">.xyz <span class="text-indigo-600 dark:text-indigo-400">{{CURRENCY_SYMBOL}}1.99</span></span>
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
  const colorScheme = options.color_scheme || 'indigo';

  // Dynamic token replacement
  let html = pattern.html_tailwind;
  html = html.replace(/\{\{BRAND_NAME\}\}/g, brandName);
  html = html.replace(/\{\{CURRENCY_SYMBOL\}\}/g, currencySymbol);

  // Dynamic color palette remapping
  if (colorScheme && colorScheme !== 'indigo') {
    html = ColorEngine.remapTailwindPalette(html, colorScheme, 'indigo');
  }

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
    color_scheme: colorScheme,
    code: converted.converted_code,
    conversion_notes: converted.notes
  };
}
