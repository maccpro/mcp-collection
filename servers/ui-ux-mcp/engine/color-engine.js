/**
 * @file color-engine.js
 * @description Zero-dependency Mathematical Color Science & WCAG 2.1/2.2 Contrast Ratio Engine.
 * Supports HSL/RGB/Hex conversion, relative luminance calculation, contrast evaluation,
 * automatic contrast adjustment, and dynamic 10-shade tonal scale generation (50-950).
 */

export class ColorEngine {
  /**
   * Parse hex color string to RGB object
   * Supports #RGB, #RGBA, #RRGGBB, #RRGGBBAA with or without leading hash
   * @param {string} hex
   * @returns {{ r: number, g: number, b: number }}
   */
  static hexToRgb(hex) {
    if (!hex || typeof hex !== 'string') {
      return { r: 79, g: 70, b: 229 }; // Default indigo fallback
    }

    let cleaned = hex.trim().replace(/^#/, '');

    // Handle 3-digit hex #RGB -> #RRGGBB
    if (cleaned.length === 3 || cleaned.length === 4) {
      cleaned = cleaned.split('').slice(0, 3).map(c => c + c).join('');
    }

    if (cleaned.length < 6) {
      cleaned = cleaned.padEnd(6, '0');
    }

    const num = parseInt(cleaned.substring(0, 6), 16);
    if (isNaN(num)) {
      return { r: 79, g: 70, b: 229 };
    }

    return {
      r: (num >> 16) & 255,
      g: (num >> 8) & 255,
      b: num & 255
    };
  }

  /**
   * Convert RGB values to 6-digit hex code
   * @param {number} r 0-255
   * @param {number} g 0-255
   * @param {number} b 0-255
   * @returns {string} e.g. #4f46e5
   */
  static rgbToHex(r, g, b) {
    const clamp = (val) => Math.max(0, Math.min(255, Math.round(val)));
    const toHex = (c) => clamp(c).toString(16).padStart(2, '0');
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
  }

  /**
   * Convert RGB to HSL values
   * @param {number} r 0-255
   * @param {number} g 0-255
   * @param {number} b 0-255
   * @returns {{ h: number, s: number, l: number }} (h: 0-360, s: 0-100, l: 0-100)
   */
  static rgbToHsl(r, g, b) {
    const rNorm = r / 255;
    const gNorm = g / 255;
    const bNorm = b / 255;

    const max = Math.max(rNorm, gNorm, bNorm);
    const min = Math.min(rNorm, gNorm, bNorm);
    let h = 0;
    let s = 0;
    const l = (max + min) / 2;

    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

      switch (max) {
        case rNorm:
          h = (gNorm - bNorm) / d + (gNorm < bNorm ? 6 : 0);
          break;
        case gNorm:
          h = (bNorm - rNorm) / d + 2;
          break;
        case bNorm:
          h = (rNorm - gNorm) / d + 4;
          break;
      }
      h /= 6;
    }

    return {
      h: Math.round(h * 360),
      s: Math.round(s * 100),
      l: Math.round(l * 100)
    };
  }

  /**
   * Convert HSL to RGB values
   * @param {number} h 0-360
   * @param {number} s 0-100
   * @param {number} l 0-100
   * @returns {{ r: number, g: number, b: number }}
   */
  static hslToRgb(h, s, l) {
    const hNorm = (h % 360) / 360;
    const sNorm = Math.max(0, Math.min(100, s)) / 100;
    const lNorm = Math.max(0, Math.min(100, l)) / 100;

    if (sNorm === 0) {
      const gray = Math.round(lNorm * 255);
      return { r: gray, g: gray, b: gray };
    }

    const hueToRgb = (p, q, t) => {
      let tNorm = t;
      if (tNorm < 0) tNorm += 1;
      if (tNorm > 1) tNorm -= 1;
      if (tNorm < 1 / 6) return p + (q - p) * 6 * tNorm;
      if (tNorm < 1 / 2) return q;
      if (tNorm < 2 / 3) return p + (q - p) * (2 / 3 - tNorm) * 6;
      return p;
    };

    const q = lNorm < 0.5 ? lNorm * (1 + sNorm) : lNorm + sNorm - lNorm * sNorm;
    const p = 2 * lNorm - q;

    const r = hueToRgb(p, q, hNorm + 1 / 3);
    const g = hueToRgb(p, q, hNorm);
    const b = hueToRgb(p, q, hNorm - 1 / 3);

    return {
      r: Math.round(r * 255),
      g: Math.round(g * 255),
      b: Math.round(b * 255)
    };
  }

  /**
   * Convert HSL directly to Hex
   * @param {number} h 0-360
   * @param {number} s 0-100
   * @param {number} l 0-100
   * @returns {string} e.g. #4f46e5
   */
  static hslToHex(h, s, l) {
    const { r, g, b } = this.hslToRgb(h, s, l);
    return this.rgbToHex(r, g, b);
  }

  /**
   * Calculate WCAG 2.1/2.2 Relative Luminance (L)
   * Formula: L = 0.2126 * R + 0.7152 * G + 0.0722 * B
   * @param {number} r 0-255
   * @param {number} g 0-255
   * @param {number} b 0-255
   * @returns {number} 0.0 - 1.0
   */
  static getRelativeLuminance(r, g, b) {
    const toLinear = (c) => {
      const srgb = c / 255;
      return srgb <= 0.04045 ? srgb / 12.92 : Math.pow((srgb + 0.055) / 1.055, 2.4);
    };

    const rLin = toLinear(r);
    const gLin = toLinear(g);
    const bLin = toLinear(b);

    return 0.2126 * rLin + 0.7152 * gLin + 0.0722 * bLin;
  }

  /**
   * Calculate exact WCAG Contrast Ratio between two hex colors
   * Formula: (L1 + 0.05) / (L2 + 0.05)
   * @param {string} hex1 Foreground or background
   * @param {string} hex2 Foreground or background
   * @returns {number} Contrast ratio (e.g. 4.54)
   */
  static getContrastRatio(hex1, hex2) {
    const rgb1 = this.hexToRgb(hex1);
    const rgb2 = this.hexToRgb(hex2);

    const l1 = this.getRelativeLuminance(rgb1.r, rgb1.g, rgb1.b);
    const l2 = this.getRelativeLuminance(rgb2.r, rgb2.g, rgb2.b);

    const lighter = Math.max(l1, l2);
    const darker = Math.min(l1, l2);

    const ratio = (lighter + 0.05) / (darker + 0.05);
    return Math.round(ratio * 100) / 100;
  }

  /**
   * Evaluate WCAG 2.1 / 2.2 AA & AAA compliance
   * @param {string} fgHex
   * @param {string} bgHex
   * @param {number} fontSizePt (default: 16)
   * @param {boolean} isBold (default: false)
   * @returns {object}
   */
  static evaluateWcag(fgHex, bgHex, fontSizePt = 16, isBold = false) {
    const ratio = this.getContrastRatio(fgHex, bgHex);
    const isLargeText = fontSizePt >= 18 || (fontSizePt >= 14 && isBold);

    const normalTextAa = ratio >= 4.5;
    const normalTextAaa = ratio >= 7.0;
    const largeTextAa = ratio >= 3.0;
    const largeTextAaa = ratio >= 4.5;
    const uiComponentAa = ratio >= 3.0; // WCAG 2.2 Non-text contrast (SC 1.4.11)

    const isPassing = isLargeText ? largeTextAa : normalTextAa;

    let adjustmentSuggestion = null;
    if (!isPassing) {
      adjustmentSuggestion = this.suggestAccessibleColor(fgHex, bgHex, isLargeText ? 3.0 : 4.5);
    }

    return {
      foreground: fgHex,
      background: bgHex,
      contrast_ratio: `${ratio}:1`,
      ratio_number: ratio,
      is_large_text: isLargeText,
      passes_aa: isPassing,
      passes_aaa: isLargeText ? largeTextAaa : normalTextAaa,
      breakdown: {
        normal_text_aa: { threshold: '4.5:1', passes: normalTextAa },
        normal_text_aaa: { threshold: '7.0:1', passes: normalTextAaa },
        large_text_aa: { threshold: '3.0:1', passes: largeTextAa },
        large_text_aaa: { threshold: '4.5:1', passes: largeTextAaa },
        ui_component_controls: { threshold: '3.0:1', passes: uiComponentAa }
      },
      verdict: ratio >= 7.0 ? 'AAA_COMPLIANT' : ratio >= 4.5 ? 'AA_COMPLIANT' : ratio >= 3.0 ? (isLargeText ? 'AA_LARGE_ONLY' : 'FAILS_NORMAL_TEXT') : 'CRITICAL_FAIL',
      suggested_foreground: adjustmentSuggestion
    };
  }

  /**
   * Iteratively adjust foreground lightness to guarantee a target WCAG contrast ratio
   * @param {string} fgHex
   * @param {string} bgHex
   * @param {number} targetRatio (default: 4.5)
   * @returns {string} Suggested adjusted hex code
   */
  static suggestAccessibleColor(fgHex, bgHex, targetRatio = 4.5) {
    const bgRgb = this.hexToRgb(bgHex);
    const bgL = this.getRelativeLuminance(bgRgb.r, bgRgb.g, bgRgb.b);
    const isBgDark = bgL < 0.5;

    const fgRgb = this.hexToRgb(fgHex);
    const { h, s } = this.rgbToHsl(fgRgb.r, fgRgb.g, fgRgb.b);

    // If background is dark, we increase lightness towards white (100)
    // If background is light, we decrease lightness towards black (0)
    let bestHex = isBgDark ? '#ffffff' : '#0f172a';
    let minDiff = Infinity;

    const step = 2;
    const startL = isBgDark ? 50 : 50;

    for (let l = 0; l <= 100; l += step) {
      const candidateHex = this.hslToHex(h, Math.max(10, s), l);
      const ratio = this.getContrastRatio(candidateHex, bgHex);

      if (ratio >= targetRatio) {
        const diff = Math.abs(ratio - targetRatio);
        if (diff < minDiff) {
          minDiff = diff;
          bestHex = candidateHex;
        }
      }
    }

    return bestHex;
  }

  /**
   * Mathematically generate a complete 10-shade tonal scale (50-950) from ANY single hex color.
   * Uses perceptual lightness curves and chroma preservation.
   * @param {string} anchorHex Primary brand color hex
   * @returns {object} Scale with keys 50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950 and contrast text
   */
  static generateTonalScale(anchorHex) {
    const rgb = this.hexToRgb(anchorHex);
    const hsl = this.rgbToHsl(rgb.r, rgb.g, rgb.b);

    const { h, s } = hsl;

    // Perceptually balanced lightness targets for standard Tailwind/Design scales
    const targets = {
      50:  { l: 96, sMult: 0.50 },
      100: { l: 92, sMult: 0.70 },
      200: { l: 84, sMult: 0.85 },
      300: { l: 74, sMult: 0.95 },
      400: { l: 62, sMult: 1.00 },
      500: { l: Math.max(45, Math.min(55, hsl.l)), sMult: 1.00 }, // Anchor midpoint
      600: { l: 42, sMult: 1.05 },
      700: { l: 32, sMult: 1.10 },
      800: { l: 22, sMult: 1.10 },
      900: { l: 14, sMult: 1.15 },
      950: { l: 8,  sMult: 1.20 }
    };

    const scale = {};

    for (const [shade, target] of Object.entries(targets)) {
      if (shade === '500') {
        // Keep original anchor hex clean for 500
        const textContrast = this.getContrastRatio(anchorHex, '#ffffff') >= 4.5 ? '#ffffff' : '#0f172a';
        scale[shade] = {
          hex: anchorHex.toLowerCase(),
          contrast_text: textContrast
        };
        continue;
      }

      const clampedS = Math.min(100, Math.round(s * target.sMult));
      const hex = this.hslToHex(h, clampedS, target.l).toLowerCase();
      const textContrast = this.getContrastRatio(hex, '#ffffff') >= 4.5 ? '#ffffff' : '#0f172a';

      scale[shade] = {
        hex,
        contrast_text: textContrast
      };
    }

    return scale;
  }
}
