/**
 * @file design-tokens.js
 * @description Enterprise Design System & Token Engine.
 * Generates cohesive Tailwind CSS v3 configurations, Tailwind CSS v4 @theme CSS blocks,
 * Shadcn UI CSS variables, and mathematical 10-shade tonal palettes from ANY custom hex or preset.
 */

import { ColorEngine } from './color-engine.js';

export const THEME_PRESETS = {
  cloud_hosting: {
    name: 'Cloud Hosting & High-Trust Infrastructure',
    description: 'Deep trusted indigos, cyan accents, high-contrast dark surfaces for mission-critical portals.',
    primary: '#4F46E5',
    secondary: '#06B6D4',
    accent: '#10B981',
    typography: {
      heading: 'Plus Jakarta Sans, sans-serif',
      body: 'Inter, sans-serif',
      mono: 'JetBrains Mono, monospace'
    }
  },

  saas_modern: {
    name: 'Modern SaaS & Enterprise Workflow',
    description: 'Electric violet, blue highlights, minimalist neutral grays for productive SaaS tools.',
    primary: '#7C3AED',
    secondary: '#3B82F6',
    accent: '#10B981',
    typography: {
      heading: 'Outfit, sans-serif',
      body: 'Inter, sans-serif',
      mono: 'Fira Code, monospace'
    }
  },

  ecommerce_vibrant: {
    name: 'Vibrant E-Commerce & Retail Marketplace',
    description: 'High-conversion emeralds, energetic amber, and coral badges for consumer marketplaces.',
    primary: '#059669',
    secondary: '#F59E0B',
    accent: '#E11D48',
    typography: {
      heading: 'Poppins, sans-serif',
      body: 'Inter, sans-serif',
      mono: 'monospace'
    }
  },

  enterprise_slate: {
    name: 'Enterprise ERP & Financial Ledger',
    description: 'Conservative slate blues, neutral borders, compact typography for data-heavy portals.',
    primary: '#2563EB',
    secondary: '#64748B',
    accent: '#0D9488',
    typography: {
      heading: 'Inter, sans-serif',
      body: 'Inter, sans-serif',
      mono: 'SF Mono, monospace'
    }
  },

  cyber_neon: {
    name: 'Developer Tools & Cyber DevOps',
    description: 'High-contrast neon greens, cyan terminal text, deep obsidian black backgrounds.',
    primary: '#10B981',
    secondary: '#06B6D4',
    accent: '#F43F5E',
    typography: {
      heading: 'Space Grotesk, sans-serif',
      body: 'Inter, sans-serif',
      mono: 'JetBrains Mono, monospace'
    }
  },

  fintech_trust: {
    name: 'FinTech, Banking & Payments',
    description: 'Deep navy, gold accents, security badges for payment gateways and banking portals.',
    primary: '#1E3A8A',
    secondary: '#D97706',
    accent: '#059669',
    typography: {
      heading: 'Plus Jakarta Sans, sans-serif',
      body: 'Inter, sans-serif',
      mono: 'Roboto Mono, monospace'
    }
  }
};

export class DesignTokens {
  /**
   * Generate comprehensive design tokens from preset or custom hex color
   * @param {string} presetKey Built-in preset name or null
   * @param {string} mode 'both' | 'light' | 'dark'
   * @param {object} options { custom_hex: '#10B981', tailwind_version: 'both' }
   * @returns {object} Complete token bundle
   */
  static generate(presetKey = 'cloud_hosting', mode = 'both', options = {}) {
    const customHex = options.custom_hex;
    const tailwindVersion = options.tailwind_version || 'both';

    let basePreset = THEME_PRESETS[presetKey] || THEME_PRESETS.cloud_hosting;
    let primaryHex = basePreset.primary;
    let secondaryHex = basePreset.secondary;
    let accentHex = basePreset.accent;
    let systemName = basePreset.name;

    if (customHex && typeof customHex === 'string' && customHex.trim() !== '') {
      primaryHex = customHex.trim();
      systemName = `Custom Brand (${primaryHex})`;
    }

    // 1. Generate 10-shade tonal scales using mathematical color engine
    const primaryScale = ColorEngine.generateTonalScale(primaryHex);
    const secondaryScale = ColorEngine.generateTonalScale(secondaryHex);

    // 2. Generate Tailwind v3 Config snippet
    const tailwindV3Config = `// tailwind.config.js - Theme Extension for ${systemName}
module.exports = {
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: {
          50: '${primaryScale[50].hex}',
          100: '${primaryScale[100].hex}',
          200: '${primaryScale[200].hex}',
          300: '${primaryScale[300].hex}',
          400: '${primaryScale[400].hex}',
          500: '${primaryScale[500].hex}',
          600: '${primaryScale[600].hex}',
          700: '${primaryScale[700].hex}',
          800: '${primaryScale[800].hex}',
          900: '${primaryScale[900].hex}',
          950: '${primaryScale[950].hex}',
          DEFAULT: '${primaryScale[500].hex}',
          foreground: '${primaryScale[500].contrast_text}'
        },
        secondary: {
          500: '${secondaryScale[500].hex}',
          DEFAULT: '${secondaryScale[500].hex}'
        }
      },
      fontFamily: {
        heading: ['${basePreset.typography.heading}'],
        sans: ['${basePreset.typography.body}'],
        mono: ['${basePreset.typography.mono}']
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.5rem'
      },
      boxShadow: {
        'card': '0 1px 3px 0 rgb(0 0 0 / 0.05), 0 1px 2px -1px rgb(0 0 0 / 0.05)',
        'elevated': '0 10px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)'
      }
    }
  }
};`;

    // 3. Generate Modern Tailwind v4 @theme CSS block
    const tailwindV4Theme = `/* Tailwind CSS v4 Modern @theme Directive for ${systemName} */
@import "tailwindcss";

@theme {
  --color-brand-50: ${primaryScale[50].hex};
  --color-brand-100: ${primaryScale[100].hex};
  --color-brand-200: ${primaryScale[200].hex};
  --color-brand-300: ${primaryScale[300].hex};
  --color-brand-400: ${primaryScale[400].hex};
  --color-brand-500: ${primaryScale[500].hex};
  --color-brand-600: ${primaryScale[600].hex};
  --color-brand-700: ${primaryScale[700].hex};
  --color-brand-800: ${primaryScale[800].hex};
  --color-brand-900: ${primaryScale[900].hex};
  --color-brand-950: ${primaryScale[950].hex};
  --color-brand: ${primaryScale[500].hex};

  --font-heading: "${basePreset.typography.heading}";
  --font-sans: "${basePreset.typography.body}";
  --font-mono: "${basePreset.typography.mono}";

  --radius-2xl: 1rem;
  --radius-3xl: 1.5rem;
}`;

    // 4. Generate Shadcn UI CSS Variables (globals.css)
    const shadcnVariables = `/* Shadcn UI globals.css Variable Definition for ${systemName} */
@layer base {
  :root {
    --background: 0 0% 100%;
    --foreground: 222.2 84% 4.9%;
    --card: 0 0% 100%;
    --card-foreground: 222.2 84% 4.9%;
    --popover: 0 0% 100%;
    --popover-foreground: 222.2 84% 4.9%;
    --primary: ${primaryScale[500].hex};
    --primary-foreground: ${primaryScale[500].contrast_text};
    --secondary: 210 40% 96.1%;
    --secondary-foreground: 222.2 47.4% 11.2%;
    --muted: 210 40% 96.1%;
    --muted-foreground: 215.4 16.3% 46.9%;
    --accent: 210 40% 96.1%;
    --accent-foreground: 222.2 47.4% 11.2%;
    --destructive: 0 84.2% 60.2%;
    --destructive-foreground: 210 40% 98%;
    --border: 214.3 31.8% 91.4%;
    --input: 214.3 31.8% 91.4%;
    --ring: ${primaryScale[500].hex};
    --radius: 0.75rem;
  }

  .dark {
    --background: 222.2 84% 4.9%;
    --foreground: 210 40% 98%;
    --card: 222.2 84% 4.9%;
    --card-foreground: 210 40% 98%;
    --popover: 222.2 84% 4.9%;
    --popover-foreground: 210 40% 98%;
    --primary: ${primaryScale[400].hex};
    --primary-foreground: ${primaryScale[400].contrast_text};
    --secondary: 217.2 32.6% 17.5%;
    --secondary-foreground: 210 40% 98%;
    --muted: 217.2 32.6% 17.5%;
    --muted-foreground: 215 20.2% 65.1%;
    --accent: 217.2 32.6% 17.5%;
    --accent-foreground: 210 40% 98%;
    --destructive: 0 62.8% 30.6%;
    --destructive-foreground: 210 40% 98%;
    --border: 217.2 32.6% 17.5%;
    --input: 217.2 32.6% 17.5%;
    --ring: ${primaryScale[400].hex};
  }
}`;

    // 5. Evaluate WCAG Contrast for Primary on Light and Dark backgrounds
    const contrastOnWhite = ColorEngine.evaluateWcag(primaryScale[500].hex, '#ffffff');
    const contrastOnDark = ColorEngine.evaluateWcag(primaryScale[400].hex, '#0f172a');

    return {
      preset_key: presetKey,
      preset_name: systemName,
      primary_scale: primaryScale,
      secondary_scale: secondaryScale,
      typography: basePreset.typography,
      tailwind_config: tailwindV3Config,
      tailwind_v4_theme: tailwindV4Theme,
      shadcn_variables: shadcnVariables,
      css_variables: `:root {\n  --color-brand: ${primaryScale[500].hex};\n  --color-brand-foreground: ${primaryScale[500].contrast_text};\n}\n.dark {\n  --color-brand: ${primaryScale[400].hex};\n  --color-brand-foreground: ${primaryScale[400].contrast_text};\n}`,
      wcag_contrast_audit: {
        primary_on_white: contrastOnWhite,
        primary_on_dark: contrastOnDark
      }
    };
  }
}
