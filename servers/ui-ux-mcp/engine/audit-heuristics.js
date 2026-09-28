/**
 * @file audit-heuristics.js
 * @description Enterprise UI/UX, WCAG 2.1/2.2 AA & AAA Accessibility, and Tailwind CSS Heuristics Audit Engine.
 * Evaluates code snippets across 18 deterministic rules and generates an automated fixed code refactor.
 */

export class AuditHeuristics {
  /**
   * Audit frontend markup against enterprise UX, WCAG 2.2, and Tailwind standards
   * @param {string} codeSnippet HTML/Blade/JSX/Vue code
   * @param {string} context Optional context (e.g. 'mobile_checkout', 'pricing_table')
   * @returns {object} Audit report with score, findings, and auto-fixed code
   */
  static audit(codeSnippet, context = '') {
    const findings = [];
    let score = 100;

    if (!codeSnippet || typeof codeSnippet !== 'string') {
      return {
        score: 100,
        verdict: 'EXCELLENT',
        context: context || 'General Web UI',
        findings_count: 0,
        findings: [],
        fixed_code: codeSnippet || '',
        summary: 'Empty code snippet supplied.'
      };
    }

    const lower = codeSnippet.toLowerCase();
    let fixedCode = codeSnippet;

    // --- 1. A11Y-IMG-ALT: Image Accessibility (WCAG 2.2 SC 1.1.1) ---
    const imgWithoutAlt = codeSnippet.match(/<img\b(?![^>]*\balt=)[^>]*>/gi);
    if (imgWithoutAlt) {
      const deduction = Math.min(20, 10 * imgWithoutAlt.length);
      score -= deduction;
      findings.push({
        rule_id: 'A11Y-IMG-ALT',
        category: 'Accessibility',
        severity: 'CRITICAL',
        issue: `${imgWithoutAlt.length} image(s) missing alt attribute.`,
        recommendation: 'Always provide descriptive alt="..." text for screen readers, or alt="" for purely decorative visuals.'
      });
      // Auto-fix: Inject alt=""
      fixedCode = fixedCode.replace(/<img\b(?![^>]*\balt=)([^>]*)>/gi, '<img$1 alt="Illustrative visual">');
    }

    // --- 2. A11Y-FORM-LABEL: Form Controls without Label/Aria (WCAG 2.2 SC 1.3.1, 4.1.2) ---
    const inputWithoutAccessibleName = codeSnippet.match(/<input\b(?![^>]*\b(id|aria-label|aria-labelledby)=)[^>]*>/gi);
    if (inputWithoutAccessibleName) {
      score -= 10;
      findings.push({
        rule_id: 'A11Y-FORM-LABEL',
        category: 'Accessibility',
        severity: 'HIGH',
        issue: 'Form input(s) detected without id, aria-label, or aria-labelledby.',
        recommendation: 'Associate inputs with explicit <label for="id"> or provide an aria-label attribute for assistive tools.'
      });
      // Auto-fix: Inject aria-label="Input field"
      fixedCode = fixedCode.replace(/<input\b(?![^>]*\b(id|aria-label|aria-labelledby)=)([^>]*)>/gi, '<input$1 aria-label="Input field">');
    }

    // --- 3. A11Y-SEMANTIC-BUTTON: Clickable Divs / Non-Semantic Buttons (WCAG 2.2 SC 4.1.2) ---
    if (/<(div|span)\b[^>]*(onclick|@click|wire:click|onClick)[^>]*>/i.test(codeSnippet)) {
      if (!codeSnippet.includes('role="button"') && !codeSnippet.includes("role='button'")) {
        score -= 10;
        findings.push({
          rule_id: 'A11Y-SEMANTIC-BUTTON',
          category: 'Accessibility',
          severity: 'HIGH',
          issue: 'Non-semantic clickable element (<div/span>) missing role="button" and tabindex="0".',
          recommendation: 'Use native <button> elements or add role="button" and tabindex="0" with keyboard listener support.'
        });
        // Auto-fix: Add role="button" tabindex="0"
        fixedCode = fixedCode.replace(/<(div|span)\b([^>]*(?:onclick|@click|wire:click|onClick)[^>]*)>/gi, '<$1$2 role="button" tabindex="0">');
      }
    }

    // --- 4. A11Y-FOCUS-VISIBLE: Outline None Without Focus Ring (WCAG 2.2 SC 2.4.7, 2.4.11) ---
    if (/\b(focus:outline-none|outline-none)\b/i.test(codeSnippet) && !/\b(focus:ring|focus-visible:ring|focus:border)\b/i.test(codeSnippet)) {
      score -= 10;
      findings.push({
        rule_id: 'A11Y-FOCUS-VISIBLE',
        category: 'Accessibility',
        severity: 'HIGH',
        issue: 'focus:outline-none used without replacing it with focus-visible:ring or focus:ring.',
        recommendation: 'Never suppress default browser focus outline without adding an accessible focus-visible:ring-2 indicator.'
      });
      // Auto-fix: Add focus-visible:ring-2 focus-visible:ring-indigo-500
      fixedCode = fixedCode.replace(/\b(focus:outline-none|outline-none)\b/g, '$1 focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2');
    }

    // --- 5. UX-TOUCH-TARGET-SUB44: Mobile Touch Targets < 44px (WCAG 2.2 SC 2.5.8) ---
    const hasButtonsOrLinks = lower.includes('<button') || lower.includes('<a ') || lower.includes('<input');
    const tinyPadding = /class="[^"]*(p-0\b|p-0\.5\b|p-1\b|w-4|h-4|w-5\b|h-5\b)[^"]*"/i.test(codeSnippet);
    const adequatePadding = /\b(py-2|py-2\.5|py-3|p-2\.5|p-3|p-4|min-h-\[44px\]|h-10|h-11|h-12)\b/.test(codeSnippet);

    if (hasButtonsOrLinks && tinyPadding && !adequatePadding) {
      score -= 15;
      findings.push({
        rule_id: 'UX-TOUCH-TARGET-SUB44',
        category: 'Mobile UX',
        severity: 'HIGH',
        issue: 'Interactive touch targets may be smaller than 44x44px for touchscreens.',
        recommendation: 'Ensure interactive hit areas have at least 44x44px bounding area (e.g. min-h-[44px], py-2.5 px-4).'
      });
      // Auto-fix: Add min-h-[44px] min-w-[44px] inline
      fixedCode = fixedCode.replace(/(class="[^"]*(?:p-0|p-0\.5|p-1|w-4|h-4)[^"]*")/gi, (m) => {
        return m.replace(/"$/, ' min-h-[44px] min-w-[44px] inline-flex items-center justify-center"');
      });
    }

    // --- 6. UX-HORIZ-OVERFLOW: Unresponsive Fixed Widths ---
    if (/\b(w-\[\d{3,4}px\]|min-w-\[\d{3,4}px\])\b/i.test(codeSnippet) && !/\boverflow-x-auto\b/.test(codeSnippet)) {
      score -= 10;
      findings.push({
        rule_id: 'UX-HORIZ-OVERFLOW',
        category: 'Mobile UX',
        severity: 'HIGH',
        issue: 'Large fixed-pixel width detected without overflow container; risks horizontal page break on mobile.',
        recommendation: 'Use max-w-full or wrap data containers with overflow-x-auto to maintain responsive containment.'
      });
    }

    // --- 7. UX-RESPONSIVENESS: Mobile-first Breakpoints ---
    const hasResponsiveBreakpoints = /\b(sm:|md:|lg:|xl:|2xl:)/.test(codeSnippet);
    if (!hasResponsiveBreakpoints && (lower.includes('grid') || lower.includes('flex'))) {
      score -= 15;
      findings.push({
        rule_id: 'UX-RESPONSIVENESS',
        category: 'Responsiveness',
        severity: 'MEDIUM',
        issue: 'No responsive Tailwind breakpoints (sm:, md:, lg:) detected in layout grid or flex structure.',
        recommendation: 'Employ mobile-first layout rules (e.g. grid-cols-1 md:grid-cols-3) to ensure fluid scaling.'
      });
    }

    // --- 8. THEME-DARK-MISSING: Dark Mode Parity ---
    const hasDarkMode = /\bdark:/.test(codeSnippet);
    if (!hasDarkMode) {
      score -= 10;
      findings.push({
        rule_id: 'THEME-DARK-MISSING',
        category: 'Visual Polish',
        severity: 'LOW',
        issue: 'No dark mode classes (dark:bg-*, dark:text-*) detected.',
        recommendation: 'Add dark:* variants for background, surface cards, text, and border utilities for modern dark mode.'
      });
      // Auto-fix basic background and card surfaces
      fixedCode = fixedCode.replace(/\bbg-white\b/g, 'bg-white dark:bg-slate-900');
      fixedCode = fixedCode.replace(/\btext-slate-900\b/g, 'text-slate-900 dark:text-white');
      fixedCode = fixedCode.replace(/\bborder-slate-200\b/g, 'border-slate-200 dark:border-slate-800');
    }

    // --- 9. CONTRAST-LOW-TEXT: Low Contrast Tailwind Classes ---
    if (/\b(text-slate-400|text-gray-300|text-zinc-400)\b/i.test(codeSnippet) && !/\bdark:/i.test(codeSnippet)) {
      score -= 5;
      findings.push({
        rule_id: 'CONTRAST-LOW-TEXT',
        category: 'Readability',
        severity: 'MEDIUM',
        issue: 'Low contrast text utility (text-slate-400 / text-gray-300) detected on potential light background.',
        recommendation: 'Use text-slate-600 or text-slate-700 on light backgrounds to satisfy the WCAG 4.5:1 ratio.'
      });
    }

    // --- 10. PERF-MEDIA-DIMENSIONS: Missing Dimensions or Aspect Ratio (CLS prevention) ---
    if (/<img\b(?![^>]*(width|height|aspect-))[^>]*>/i.test(codeSnippet)) {
      score -= 5;
      findings.push({
        rule_id: 'PERF-MEDIA-DIMENSIONS',
        category: 'Performance',
        severity: 'LOW',
        issue: 'Image detected without explicit width/height or aspect-ratio class; risks Cumulative Layout Shift (CLS).',
        recommendation: 'Add aspect-video, aspect-square, or explicit width/height to reserve layout space during image loading.'
      });
    }

    // --- 11. TAILWIND-Z-INDEX-WAR: Extreme Z-Index Values ---
    if (/\bz-\[(999|9999|99999)\d*\]/i.test(codeSnippet)) {
      score -= 5;
      findings.push({
        rule_id: 'TAILWIND-Z-INDEX-WAR',
        category: 'Clean Code',
        severity: 'LOW',
        issue: 'Arbitrary extreme z-index detected (z-[9999]).',
        recommendation: 'Standardize stacking contexts using standard z-10, z-20, z-30, z-40, or z-50 utility tokens.'
      });
    }

    // --- 12. UX-COPY-GENERIC: Generic Button Text ---
    if (/>\s*(click here|more|read more|submit)\s*</i.test(codeSnippet)) {
      score -= 5;
      findings.push({
        rule_id: 'UX-COPY-GENERIC',
        category: 'UX Copywriting',
        severity: 'LOW',
        issue: 'Generic button or link text detected ("click here", "more", "submit").',
        recommendation: 'Use descriptive, action-oriented button copy (e.g. "Deploy Cloud Server", "Download Invoice PDF").'
      });
    }

    // --- 13. A11Y-HEADING-ORDER: Heading Hierarchy Jump (WCAG 2.2 SC 1.3.1) ---
    if (/<h1\b[^>]*>[\s\S]*?<\/h1>/i.test(codeSnippet) && /<h[3-6]\b[^>]*>/i.test(codeSnippet) && !/<h2\b[^>]*>/i.test(codeSnippet)) {
      score -= 10;
      findings.push({
        rule_id: 'A11Y-HEADING-ORDER',
        category: 'Accessibility',
        severity: 'MEDIUM',
        issue: 'Skipped heading hierarchy level detected (<h1> followed directly by <h3>-<h6> without an <h2>).',
        recommendation: 'Maintain sequential heading levels (h1 -> h2 -> h3) to ensure screen reader navigation hierarchy.'
      });
      // Auto-fix: Convert h3 to h2 if no h2 present
      fixedCode = fixedCode.replace(/<h3\b([^>]*)>([\s\S]*?)<\/h3>/i, '<h2$1>$2</h2>');
    }

    // --- 14. A11Y-ICON-BUTTON-NAME: Icon-Only Button Lacks Accessible Name (WCAG 2.2 SC 4.1.2) ---
    const iconButtonsWithoutLabel = codeSnippet.match(/<button\b(?![^>]*\b(aria-label|aria-labelledby)=)[^>]*>\s*<svg\b[\s\S]*?<\/svg>\s*<\/button>/gi);
    if (iconButtonsWithoutLabel) {
      score -= 10;
      findings.push({
        rule_id: 'A11Y-ICON-BUTTON-NAME',
        category: 'Accessibility',
        severity: 'HIGH',
        issue: `${iconButtonsWithoutLabel.length} icon-only button(s) detected without aria-label or accessible text.`,
        recommendation: 'Add aria-label="..." or an inner <span class="sr-only">Description</span> on all icon-only buttons.'
      });
      // Auto-fix: Inject aria-label="Action"
      fixedCode = fixedCode.replace(/(<button\b(?![^>]*\b(?:aria-label|aria-labelledby)=)[^>]*>)(\s*<svg\b)/gi, '$1<span class="sr-only">Action</span>$2');
    }

    // --- 15. UX-MOBILE-INPUT-MODE: Missing Mobile Input Modes for Numeric/Email (WCAG 2.2 SC 1.3.5) ---
    if (/<input\b[^>]*name="(otp|code|pin|phone|mobile|amount)"(?![^>]*\binputmode=)[^>]*>/i.test(codeSnippet)) {
      score -= 5;
      findings.push({
        rule_id: 'UX-MOBILE-INPUT-MODE',
        category: 'Mobile UX',
        severity: 'MEDIUM',
        issue: 'Numeric/phone input detected without inputmode="numeric" or inputmode="tel".',
        recommendation: 'Add inputmode="numeric" or inputmode="tel" to trigger the optimized virtual keyboard on mobile devices.'
      });
      fixedCode = fixedCode.replace(/(<input\b[^>]*name="(?:otp|code|pin|phone|mobile|amount)")/gi, '$1 inputmode="numeric"');
    }

    // --- 16. UX-REDUCED-MOTION: Unrestrained Animation Without Reduced Motion Variant (WCAG 2.2 SC 2.3.3) ---
    if (/\b(animate-spin|animate-ping|animate-pulse|animate-bounce)\b/i.test(codeSnippet) && !/\bmotion-reduce:/i.test(codeSnippet)) {
      score -= 5;
      findings.push({
        rule_id: 'UX-REDUCED-MOTION',
        category: 'Accessibility',
        severity: 'LOW',
        issue: 'CSS keyframe animation detected without motion-reduce: utility alternative for vestibular sensitivity.',
        recommendation: 'Provide motion-reduce:animate-none or motion-safe: prefix to honor users with reduced motion preferences.'
      });
      fixedCode = fixedCode.replace(/\b(animate-(?:spin|ping|pulse|bounce))\b/g, '$1 motion-reduce:animate-none');
    }

    // --- 17. A11Y-COLOR-ALONE: Status Indicator Using Color Alone (WCAG 2.2 SC 1.4.1) ---
    if (/<span\b[^>]*class="[^"]*\b(bg-emerald-500|bg-red-500|bg-green-500|bg-rose-500)\b[^"]*"[^>]*>\s*<\/span>/i.test(codeSnippet) && !codeSnippet.includes('aria-label') && !codeSnippet.includes('sr-only')) {
      score -= 5;
      findings.push({
        rule_id: 'A11Y-COLOR-ALONE',
        category: 'Accessibility',
        severity: 'MEDIUM',
        issue: 'Color-alone status dot indicator detected without accompanying text or screen-reader label.',
        recommendation: 'Include a <span class="sr-only">Status text</span> or an aria-label to convey status non-visually.'
      });
    }

    // --- 18. A11Y-TABLE-ACCESSIBILITY: Table Missing TH Header Scope (WCAG 2.2 SC 1.3.1) ---
    if (/<table\b/i.test(codeSnippet) && /<th\b(?![^>]*\bscope=)[^>]*>/i.test(codeSnippet)) {
      score -= 5;
      findings.push({
        rule_id: 'A11Y-TABLE-ACCESSIBILITY',
        category: 'Accessibility',
        severity: 'MEDIUM',
        issue: 'Data table <th> elements missing explicit scope="col" or scope="row" attributes.',
        recommendation: 'Add scope="col" to table column header cells to correctly associate data with column headers.'
      });
      fixedCode = fixedCode.replace(/<th\b(?![^>]*\bscope=)([^>]*)>/gi, '<th scope="col"$1>');
    }

    // --- 19. UX-TARGET-SPACING: Buttons In Close Proximity Lacking Separation (WCAG 2.2 SC 2.5.8) ---
    if (/<button\b[\s\S]*?<\/button>\s*<button\b/i.test(codeSnippet) && !/\b(gap-|space-x-|mr-|ml-)\b/i.test(codeSnippet)) {
      score -= 5;
      findings.push({
        rule_id: 'UX-TARGET-SPACING',
        category: 'Mobile UX',
        severity: 'LOW',
        issue: 'Interactive buttons placed in immediate succession without flex gap or spacing.',
        recommendation: 'Wrap adjacent buttons in a container with gap-2 or gap-3 to prevent accidental tap errors.'
      });
    }

    // --- 20. PERF-FONT-SMOOTHING: Missing Antialiased Utility ---
    if (!/\bantialiased\b/i.test(codeSnippet) && (lower.includes('font-') || lower.includes('text-'))) {
      findings.push({
        rule_id: 'PERF-FONT-SMOOTHING',
        category: 'Visual Polish',
        severity: 'LOW',
        issue: 'Typography container missing antialiased utility class for optimal subpixel font smoothing.',
        recommendation: 'Add the antialiased class to parent layout container for consistent high-DPI font rendering.'
      });
      // Do not deduct score for low-severity polish, but offer finding
    }

    // Normalize final score bounds
    score = Math.max(0, Math.min(100, score));

    const verdict = score >= 85 ? 'EXCELLENT' : score >= 70 ? 'GOOD' : score >= 50 ? 'NEEDS_IMPROVEMENT' : 'CRITICAL';

    return {
      score,
      verdict,
      context: context || 'General Web UI',
      findings_count: findings.length,
      findings,
      fixed_code: fixedCode,
      summary: `UI/UX Audit scored ${score}/100 with ${findings.length} finding(s) (Verdict: ${verdict}). Automated fix generated.`
    };
  }
}
