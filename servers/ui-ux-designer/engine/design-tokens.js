/**
 * Tailwind CSS Design Tokens & Theme Palette Generator
 */

export const THEME_PRESETS = {
  cloud_hosting: {
    name: 'Cloud Hosting & Infrastructure (High Trust)',
    palette: {
      primary: { DEFAULT: '#4F46E5', hover: '#4338CA', light: '#EEF2FF', dark: '#312E81' },
      secondary: { DEFAULT: '#06B6D4', hover: '#0891B2', light: '#ECFEFF' },
      success: { DEFAULT: '#10B981', hover: '#059669', light: '#ECFDF5' },
      warning: { DEFAULT: '#F59E0B', light: '#FFFBEB' },
      surface: { light: '#FFFFFF', dark: '#0F172A', cardLight: '#F8FAFC', cardDark: '#1E293B' },
      border: { light: '#E2E8F0', dark: '#334155' }
    },
    typography: {
      heading: 'Plus Jakarta Sans, sans-serif',
      body: 'Inter, sans-serif',
      mono: 'JetBrains Mono, monospace'
    },
    shadows: {
      card: '0 1px 3px 0 rgb(0 0 0 / 0.05), 0 1px 2px -1px rgb(0 0 0 / 0.05)',
      elevated: '0 10px 25px -5px rgb(79 70 229 / 0.1), 0 8px 10px -6px rgb(79 70 229 / 0.1)'
    }
  },

  saas_modern: {
    name: 'Modern SaaS & Fintech',
    palette: {
      primary: { DEFAULT: '#7C3AED', hover: '#6D28D9', light: '#F5F3FF' },
      secondary: { DEFAULT: '#3B82F6', hover: '#2563EB', light: '#EFF6FF' },
      success: { DEFAULT: '#10B981', light: '#ECFDF5' },
      surface: { light: '#FFFFFF', dark: '#18181B', cardLight: '#FAFAFA', cardDark: '#27272A' },
      border: { light: '#E4E4E7', dark: '#3F3F46' }
    },
    typography: {
      heading: 'Outfit, sans-serif',
      body: 'Inter, sans-serif',
      mono: 'Fira Code, monospace'
    },
    shadows: {
      card: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
      elevated: '0 20px 25px -5px rgb(124 58 237 / 0.1)'
    }
  },

  ecommerce_vibrant: {
    name: 'Vibrant E-Commerce / Retail',
    palette: {
      primary: { DEFAULT: '#059669', hover: '#047857', light: '#ECFDF5' },
      secondary: { DEFAULT: '#F59E0B', hover: '#D97706', light: '#FFFBEB' },
      accent: { DEFAULT: '#E11D48', light: '#FFF1F2' },
      surface: { light: '#FFFFFF', dark: '#111827', cardLight: '#F9FAFB', cardDark: '#1F2937' },
      border: { light: '#E5E7EB', dark: '#374151' }
    },
    typography: {
      heading: 'Poppins, sans-serif',
      body: 'Inter, sans-serif',
      mono: 'monospace'
    },
    shadows: {
      card: '0 2px 4px 0 rgb(0 0 0 / 0.05)',
      elevated: '0 10px 15px -3px rgb(0 0 0 / 0.08)'
    }
  }
};

export class DesignTokens {
  static generate(presetKey = 'cloud_hosting', mode = 'both') {
    const preset = THEME_PRESETS[presetKey] || THEME_PRESETS.cloud_hosting;

    const tailwindConfigSnippet = `// tailwind.config.js - Theme Extension for ${preset.name}
module.exports = {
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: '${preset.palette.primary.DEFAULT}',
          hover: '${preset.palette.primary.hover}',
          light: '${preset.palette.primary.light}'
        },
        secondary: {
          DEFAULT: '${preset.palette.secondary.DEFAULT}',
          hover: '${preset.palette.secondary.hover}'
        }
      },
      fontFamily: {
        heading: ['${preset.typography.heading}'],
        sans: ['${preset.typography.body}'],
        mono: ['${preset.typography.mono}']
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.5rem'
      }
    }
  }
};`;

    const cssVariablesSnippet = `/* CSS Variables for ${preset.name} */
:root {
  --color-primary: ${preset.palette.primary.DEFAULT};
  --color-primary-hover: ${preset.palette.primary.hover};
  --color-surface: ${preset.palette.surface.light};
  --color-border: ${preset.palette.border.light};
}

.dark {
  --color-primary: ${preset.palette.primary.DEFAULT};
  --color-surface: ${preset.palette.surface.dark};
  --color-border: ${preset.palette.border.dark};
}`;

    return {
      preset_key: presetKey,
      preset_name: preset.name,
      palette: preset.palette,
      typography: preset.typography,
      tailwind_config: tailwindConfigSnippet,
      css_variables: cssVariablesSnippet
    };
  }
}
