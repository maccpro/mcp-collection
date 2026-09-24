/**
 * Curated Production-Grade Tailwind CSS & Shadcn UI Patterns Catalog
 * Instant offline UI/UX designs for SaaS, Cloud Hosting, E-commerce, and Portals.
 */

export const PATTERNS = {
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
    <p class="mt-4 text-lg text-slate-600 dark:text-slate-400">Deploy high-performance NVMe cloud hosting with 99.9% guaranteed uptime.</p>
    
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
          <span class="text-4xl font-extrabold text-slate-900 dark:text-white">৳490</span>
          <span class="text-sm font-medium text-slate-500">/month</span>
        </div>
        <ul class="mt-8 space-y-4 text-sm text-slate-600 dark:text-slate-300">
          <li class="flex items-center gap-3"><svg class="w-5 h-5 text-emerald-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg> 1 Website & 10 GB NVMe SSD</li>
          <li class="flex items-center gap-3"><svg class="w-5 h-5 text-emerald-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg> Unmetered Bandwidth</li>
          <li class="flex items-center gap-3"><svg class="w-5 h-5 text-emerald-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg> Free SSL & Daily Backups</li>
        </ul>
      </div>
      <button class="mt-8 w-full py-3 px-4 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-white font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition">Get Started</button>
    </div>

    <!-- Pro / Featured Tier -->
    <div class="relative rounded-2xl border-2 border-indigo-600 dark:border-indigo-500 bg-white dark:bg-slate-900 p-8 shadow-xl flex flex-col justify-between scale-105 z-10">
      <div class="absolute -top-4 left-1/2 -translate-x-1/2 bg-gradient-to-r from-indigo-600 to-cyan-500 text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider shadow">Most Popular</div>
      <div>
        <h3 class="text-xl font-bold text-slate-900 dark:text-white">Business Cloud</h3>
        <p class="text-sm text-slate-500 dark:text-slate-400 mt-2">Optimized for growing SaaS & E-commerce shops.</p>
        <div class="mt-6 flex items-baseline gap-1">
          <span class="text-4xl font-extrabold text-slate-900 dark:text-white">৳990</span>
          <span class="text-sm font-medium text-slate-500">/month</span>
        </div>
        <ul class="mt-8 space-y-4 text-sm text-slate-600 dark:text-slate-300">
          <li class="flex items-center gap-3 font-medium text-slate-900 dark:text-white"><svg class="w-5 h-5 text-indigo-600 dark:text-indigo-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg> Unlimited Websites & 50 GB NVMe</li>
          <li class="flex items-center gap-3"><svg class="w-5 h-5 text-indigo-600 dark:text-indigo-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg> Free Domain (.com) Included</li>
          <li class="flex items-center gap-3"><svg class="w-5 h-5 text-indigo-600 dark:text-indigo-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg> 4 GB Dedicated RAM & LiteSpeed Cache</li>
          <li class="flex items-center gap-3"><svg class="w-5 h-5 text-indigo-600 dark:text-indigo-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg> 24/7 Priority Support (Phone & WhatsApp)</li>
        </ul>
      </div>
      <button class="mt-8 w-full py-3.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-lg shadow-indigo-500/25 transition">Deploy Now</button>
    </div>

    <!-- Enterprise Tier -->
    <div class="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 shadow-sm flex flex-col justify-between">
      <div>
        <h3 class="text-xl font-bold text-slate-900 dark:text-white">Dedicated VPS</h3>
        <p class="text-sm text-slate-500 dark:text-slate-400 mt-2">Maximum isolated performance for portals & ERP.</p>
        <div class="mt-6 flex items-baseline gap-1">
          <span class="text-4xl font-extrabold text-slate-900 dark:text-white">৳2,490</span>
          <span class="text-sm font-medium text-slate-500">/month</span>
        </div>
        <ul class="mt-8 space-y-4 text-sm text-slate-600 dark:text-slate-300">
          <li class="flex items-center gap-3"><svg class="w-5 h-5 text-emerald-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg> 4 vCPU & 8 GB RAM</li>
          <li class="flex items-center gap-3"><svg class="w-5 h-5 text-emerald-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg> 160 GB Enterprise NVMe</li>
          <li class="flex items-center gap-3"><svg class="w-5 h-5 text-emerald-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg> Dedicated IPv4 & Full Root Access</li>
        </ul>
      </div>
      <button class="mt-8 w-full py-3 px-4 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-white font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition">Configure VPS</button>
    </div>
  </div>
</div>`
  },

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
      <div class="text-2xl font-bold text-slate-900 dark:text-white">৳284,500</div>
      <span class="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-400">
        <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 10l7-7m0 0l7 7m-7-7v18"/></svg> 14.2%
      </span>
    </div>
    <p class="text-xs text-slate-400 mt-2">vs ৳249,100 last month</p>
  </div>

  <!-- Card 2: Active Subscriptions -->
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

  <!-- Card 4: Support Tickets -->
  <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
    <div class="flex items-center justify-between text-slate-500 dark:text-slate-400">
      <span class="text-sm font-medium">Avg Response Time</span>
      <div class="w-9 h-9 rounded-xl bg-amber-50 dark:bg-amber-950/50 flex items-center justify-center text-amber-600 dark:text-amber-400">
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
      </div>
    </div>
    <div class="mt-4 flex items-baseline justify-between">
      <div class="text-2xl font-bold text-slate-900 dark:text-white">4.2 min</div>
      <span class="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-400">
        -1.8m
      </span>
    </div>
    <p class="text-xs text-slate-400 mt-2">Phone & Live Chat 24/7</p>
  </div>
</div>`
  },

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
            <input type="text" class="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-transparent text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none" placeholder="Sizar Babu">
          </div>
          <div>
            <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Phone Number</label>
            <input type="tel" class="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-transparent text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none" placeholder="017XXXXXXXX">
          </div>
          <div class="sm:col-span-2">
            <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Email Address</label>
            <input type="email" class="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-transparent text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none" placeholder="billing@joypurhost.com">
          </div>
        </div>
      </div>

      <!-- Payment Gateways -->
      <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6">
        <h2 class="text-lg font-bold text-slate-900 dark:text-white mb-4">2. Select Payment Method</h2>
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <label class="border-2 border-pink-500 bg-pink-50/20 dark:bg-pink-950/20 rounded-xl p-4 flex flex-col items-center cursor-pointer text-center relative">
            <input type="radio" name="payment_method" value="bkash" checked class="absolute top-3 right-3 text-pink-600 focus:ring-pink-500">
            <span class="font-bold text-pink-600 text-sm mt-1">bKash Instant</span>
            <span class="text-xs text-slate-500 mt-1">Zero fee / 24/7</span>
          </label>
          <label class="border border-slate-200 dark:border-slate-800 hover:border-slate-400 rounded-xl p-4 flex flex-col items-center cursor-pointer text-center relative">
            <input type="radio" name="payment_method" value="nagad" class="absolute top-3 right-3 text-indigo-600">
            <span class="font-bold text-orange-600 text-sm mt-1">Nagad</span>
            <span class="text-xs text-slate-500 mt-1">Automated</span>
          </label>
          <label class="border border-slate-200 dark:border-slate-800 hover:border-slate-400 rounded-xl p-4 flex flex-col items-center cursor-pointer text-center relative">
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
            <span class="font-semibold text-slate-900 dark:text-white">৳11,880</span>
          </div>
          <div class="flex justify-between text-emerald-600 dark:text-emerald-400">
            <span>Special Promotional Discount (-20%)</span>
            <span class="font-semibold">-৳2,376</span>
          </div>
          <div class="flex justify-between">
            <span class="text-slate-600 dark:text-slate-400">Domain (.com)</span>
            <span class="font-semibold text-emerald-600">FREE</span>
          </div>
        </div>
        <div class="pt-4 flex justify-between items-baseline">
          <span class="text-base font-bold text-slate-900 dark:text-white">Total Payable</span>
          <span class="text-2xl font-extrabold text-indigo-600 dark:text-indigo-400">৳9,504</span>
        </div>
        <button class="mt-6 w-full py-3.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-lg shadow-emerald-600/25 transition">Complete Payment</button>
        <p class="text-xs text-center text-slate-400 mt-3 flex items-center justify-center gap-1">
          <svg class="w-4 h-4 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/></svg> 256-Bit SSL Encrypted & Instant Activation
        </p>
      </div>
    </div>
  </div>
</div>`
  },

  hero_section: {
    name: 'High-Converting Landing Page Hero',
    description: 'Headline, sub-badge, dual CTA buttons, product preview card, and social proof rating.',
    ux_guidelines: [
      'Top announcement badge builds curiosity and urgency.',
      'Primary CTA button with prominent contrast, secondary button with ghost or light outline.',
      'Social proof ratings (5-star rating and customer count) immediately build trust.'
    ],
    html_tailwind: `<section class="relative overflow-hidden py-20 lg:py-28 bg-gradient-to-b from-slate-50 to-white dark:from-slate-950 dark:to-slate-900">
  <div class="max-w-7xl mx-auto px-4 text-center">
    <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950 border border-indigo-100 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 text-xs font-semibold mb-8">
      <span class="flex h-2 w-2 rounded-full bg-indigo-600"></span> Tier-IV Data Center in Dhaka & Singapore
    </div>
    <h1 class="text-4xl sm:text-6xl font-extrabold text-slate-900 dark:text-white tracking-tight leading-tight max-w-4xl mx-auto">
      Ultra-Fast Cloud Hosting Built for <span class="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-cyan-500">Mission-Critical Apps</span>
    </h1>
    <p class="mt-6 text-lg sm:text-xl text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
      Experience lightning speed with Pure NVMe Storage, LiteSpeed Web Server, and 24/7 localized support that never sleeps.
    </p>
    <div class="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
      <a href="#plans" class="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-lg shadow-indigo-500/25 transition">Explore Hosting Plans</a>
      <a href="#contact" class="w-full sm:w-auto px-8 py-3.5 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 transition">Talk to an Expert</a>
    </div>
    <div class="mt-12 flex items-center justify-center gap-6 text-xs text-slate-500">
      <div class="flex items-center gap-1">
        <span class="text-amber-400">★★★★★</span>
        <span class="font-bold text-slate-700 dark:text-slate-300">4.9/5</span> on Google Reviews
      </div>
      <span>•</span>
      <div>Trusted by <strong>10,000+</strong> Bangladeshi Businesses</div>
    </div>
  </div>
</section>`
  },

  data_table: {
    name: 'Accessible & Responsive Data Table',
    description: 'Data table with search bar, status badges, sortable headers, action dropdowns, and pagination.',
    ux_guidelines: [
      'Sticky headers on scrollable containers.',
      'Semantic HTML table with th scope="col" for screen reader accessibility.',
      'Clear visual state pills (e.g. Active, Pending, Suspended) with high contrast.'
    ],
    html_tailwind: `<div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
  <div class="p-4 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
    <div class="relative w-full sm:w-72">
      <input type="text" placeholder="Search servers or domains..." class="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-sm bg-transparent focus:ring-2 focus:ring-indigo-500 focus:outline-none">
      <svg class="w-4 h-4 text-slate-400 absolute left-3 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
    </div>
    <div class="flex items-center gap-2">
      <button class="px-3.5 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800">Filter</button>
      <button class="px-3.5 py-2 text-xs font-bold rounded-xl bg-indigo-600 text-white hover:bg-indigo-700">+ Add Server</button>
    </div>
  </div>
  <div class="overflow-x-auto">
    <table class="w-full text-left text-sm text-slate-600 dark:text-slate-400">
      <thead class="bg-slate-50 dark:bg-slate-800/50 text-xs uppercase font-semibold text-slate-500">
        <tr>
          <th scope="col" class="px-6 py-3.5">Hostname / IP</th>
          <th scope="col" class="px-6 py-3.5">Plan</th>
          <th scope="col" class="px-6 py-3.5">Location</th>
          <th scope="col" class="px-6 py-3.5">Status</th>
          <th scope="col" class="px-6 py-3.5 text-right">Actions</th>
        </tr>
      </thead>
      <tbody class="divide-y divide-slate-200 dark:divide-slate-800">
        <tr class="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">
          <td class="px-6 py-4 font-semibold text-slate-900 dark:text-white">vps-dhaka-01.joypurhost.com <span class="block text-xs font-normal text-slate-400">103.145.118.24</span></td>
          <td class="px-6 py-4">Dedicated VPS 4C/8G</td>
          <td class="px-6 py-4">Dhaka (ColoCity)</td>
          <td class="px-6 py-4"><span class="px-2.5 py-1 text-xs font-bold rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400">Running</span></td>
          <td class="px-6 py-4 text-right"><button class="text-indigo-600 hover:text-indigo-800 font-medium text-xs">Manage</button></td>
        </tr>
      </tbody>
    </table>
  </div>
</div>`
  }
};
