/**
 * UI/UX & Accessibility (a11y) Heuristics Audit Engine
 * Inspects HTML/Tailwind/Blade snippets against WCAG 2.1 & modern UX guidelines.
 */

export class AuditHeuristics {
  static audit(codeSnippet, context = '') {
    const findings = [];
    let score = 100;

    const lower = codeSnippet.toLowerCase();

    // 1. Image accessibility: img tags missing alt
    const imgMatches = codeSnippet.match(/<img\b(?![^>]*\balt=)[^>]*>/gi);
    if (imgMatches) {
      score -= 10 * imgMatches.length;
      findings.push({
        category: 'Accessibility',
        severity: 'CRITICAL',
        issue: 'Images missing alt attribute.',
        recommendation: 'Always provide descriptive alt="..." text for screen readers or alt="" for decorative images.'
      });
    }

    // 2. Form input accessibility: input missing id/name or aria-label
    const inputMatches = codeSnippet.match(/<input\b(?![^>]*\b(id|aria-label|aria-labelledby)=)[^>]*>/gi);
    if (inputMatches) {
      score -= 10;
      findings.push({
        category: 'Accessibility',
        severity: 'HIGH',
        issue: 'Form inputs detected without id or aria-label.',
        recommendation: 'Associate inputs with explicit <label for="inputId"> or add aria-label for assistive technologies.'
      });
    }

    // 3. Touch target size check on interactive buttons
    if (lower.includes('<button') || lower.includes('<a ')) {
      // Check if button has tiny dimensions or very small padding
      if (/class="[^"]*(p-0|p-0\.5|p-1\b|w-4|h-4)[^"]*"/i.test(codeSnippet) && !lower.includes('p-2') && !lower.includes('p-3')) {
        score -= 15;
        findings.push({
          category: 'Mobile UX',
          severity: 'HIGH',
          issue: 'Interactive touch target may be too small for mobile users (<44px).',
          recommendation: 'Ensure mobile touch targets have at least 44x44px hit area (e.g. min-h-[44px], py-2.5 px-4).'
        });
      }
    }

    // 4. Mobile responsiveness check
    const hasResponsiveBreakpoints = /\b(sm:|md:|lg:|xl:|2xl:)/.test(codeSnippet);
    if (!hasResponsiveBreakpoints && (lower.includes('grid') || lower.includes('flex'))) {
      score -= 15;
      findings.push({
        category: 'Responsiveness',
        severity: 'MEDIUM',
        issue: 'No responsive Tailwind breakpoints (sm:, md:, lg:) detected in layout.',
        recommendation: 'Use mobile-first layout rules (e.g. grid-cols-1 md:grid-cols-3) to ensure smooth scaling.'
      });
    }

    // 5. Dark mode support check
    const hasDarkMode = /\bdark:/.test(codeSnippet);
    if (!hasDarkMode) {
      score -= 10;
      findings.push({
        category: 'Visual Polish',
        severity: 'LOW',
        issue: 'No dark mode classes (dark:bg-*, dark:text-*) detected.',
        recommendation: 'Add dark:* variants to background, text, and border utilities for modern dark mode compatibility.'
      });
    }

    // 6. Generic button text check
    if (/>\s*(click here|more|read more|submit)\s*</i.test(codeSnippet)) {
      score -= 5;
      findings.push({
        category: 'UX Copywriting',
        severity: 'LOW',
        issue: 'Generic button or link text detected ("click here", "more").',
        recommendation: 'Use descriptive, action-oriented button copy (e.g. "Deploy VPS Server", "View Invoices").'
      });
    }

    score = Math.max(0, Math.min(100, score));

    return {
      score,
      verdict: score >= 85 ? 'EXCELLENT' : score >= 70 ? 'GOOD' : 'NEEDS_IMPROVEMENT',
      context: context || 'General Web UI',
      findings_count: findings.length,
      findings,
      summary: `UI/UX Audit scored ${score}/100 (${findings.length} finding(s)).`
    };
  }
}
