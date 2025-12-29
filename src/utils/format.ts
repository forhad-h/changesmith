/**
 * Formatting utilities for output
 */

export interface ReviewIssue {
  severity: 'low' | 'medium' | 'high';
  title: string;
  why: string;
  where: string;
  fix: string;
}

export interface ReviewOutput {
  summary: string[];
  issues: ReviewIssue[];
  testing: string[];
  checklist: string[];
}

/**
 * Format review output as markdown
 */
export function formatReviewMarkdown(review: ReviewOutput): string {
  const lines: string[] = [];

  // Summary
  lines.push('## Summary\n');
  review.summary.forEach((item) => {
    lines.push(`- ${item}`);
  });
  lines.push('');

  // Issues
  if (review.issues.length > 0) {
    lines.push('## Issues\n');
    review.issues.forEach((issue, idx) => {
      const severity = issue.severity.toUpperCase();
      const emoji = issue.severity === 'high' ? '🔴' : issue.severity === 'medium' ? '🟡' : '🟢';

      lines.push(`### ${idx + 1}. ${issue.title} ${emoji} [${severity}]`);
      lines.push(`**Why:** ${issue.why}`);
      lines.push(`**Where:** ${issue.where}`);
      lines.push(`**Fix:** ${issue.fix}`);
      lines.push('');
    });
  }

  // Testing
  if (review.testing.length > 0) {
    lines.push('## What to Test\n');
    review.testing.forEach((item) => {
      lines.push(`- ${item}`);
    });
    lines.push('');
  }

  // Checklist
  if (review.checklist.length > 0) {
    lines.push('## PR Checklist\n');
    review.checklist.forEach((item) => {
      lines.push(`- [ ] ${item}`);
    });
    lines.push('');
  }

  return lines.join('\n');
}

/**
 * Format review output as plain text
 */
export function formatReviewText(review: ReviewOutput): string {
  const lines: string[] = [];

  // Summary
  lines.push('SUMMARY');
  lines.push('-------');
  review.summary.forEach((item) => {
    lines.push(`• ${item}`);
  });
  lines.push('');

  // Issues
  if (review.issues.length > 0) {
    lines.push('ISSUES');
    lines.push('------');
    review.issues.forEach((issue, idx) => {
      lines.push(`${idx + 1}. ${issue.title} [${issue.severity.toUpperCase()}]`);
      lines.push(`   Why: ${issue.why}`);
      lines.push(`   Where: ${issue.where}`);
      lines.push(`   Fix: ${issue.fix}`);
      lines.push('');
    });
  }

  // Testing
  if (review.testing.length > 0) {
    lines.push('WHAT TO TEST');
    lines.push('------------');
    review.testing.forEach((item) => {
      lines.push(`• ${item}`);
    });
    lines.push('');
  }

  // Checklist
  if (review.checklist.length > 0) {
    lines.push('PR CHECKLIST');
    lines.push('------------');
    review.checklist.forEach((item) => {
      lines.push(`☐ ${item}`);
    });
    lines.push('');
  }

  return lines.join('\n');
}

/**
 * Format review output as JSON
 */
export function formatReviewJSON(review: ReviewOutput): string {
  return JSON.stringify(review, null, 2);
}

/**
 * Format review based on format type
 */
export function formatReview(review: ReviewOutput, format: 'text' | 'md' | 'json'): string {
  switch (format) {
    case 'md':
      return formatReviewMarkdown(review);
    case 'json':
      return formatReviewJSON(review);
    case 'text':
    default:
      return formatReviewText(review);
  }
}
