/**
 * Validation utilities for commit messages and options
 */

const CONVENTIONAL_TYPES = [
  'feat',
  'fix',
  'refactor',
  'docs',
  'test',
  'chore',
  'perf',
  'build',
  'ci',
  'revert',
];

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Validate a conventional commit message
 */
export function validateConventionalCommit(message: string): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check format: type(scope): subject
  const conventionalPattern = /^([a-z]+)(\([a-z0-9\-]+\))?:\s+(.+)$/;
  const match = message.match(conventionalPattern);

  if (!match) {
    errors.push('Message does not follow conventional commit format: type(scope): subject');
    return { valid: false, errors, warnings };
  }

  const [, type, , subject] = match;

  // Validate type
  if (!CONVENTIONAL_TYPES.includes(type)) {
    warnings.push(`Type "${type}" is not a standard conventional commit type`);
  }

  // Check subject
  if (subject.length === 0) {
    errors.push('Subject is empty');
  }

  if (subject.endsWith('.')) {
    warnings.push('Subject should not end with a period');
  }

  // Check imperative mood (basic check)
  if (subject.match(/^(adds|adding|added|fixes|fixing|fixed|updates|updating|updated)/i)) {
    warnings.push('Subject should use imperative mood (e.g., "add" not "adds" or "added")');
  }

  // Check capitalization
  if (subject[0] !== subject[0].toLowerCase()) {
    warnings.push('Subject should start with lowercase letter');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validate message length
 */
export function validateLength(message: string, maxLen: number): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (message.length > maxLen) {
    errors.push(`Message exceeds maximum length of ${maxLen} characters (current: ${message.length})`);
  } else if (message.length > maxLen * 0.9) {
    warnings.push(`Message is close to maximum length (${message.length}/${maxLen})`);
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Truncate message safely at word boundary
 */
export function truncateSafely(message: string, maxLen: number): string {
  if (message.length <= maxLen) {
    return message;
  }

  // Try to truncate at word boundary
  const truncated = message.substring(0, maxLen);
  const lastSpace = truncated.lastIndexOf(' ');

  if (lastSpace > maxLen * 0.8) {
    return truncated.substring(0, lastSpace);
  }

  return truncated;
}

/**
 * Get conventional commit type suggestion based on diff content
 */
export function suggestType(diff: string): string {
  const lowerDiff = diff.toLowerCase();

  if (lowerDiff.includes('test') || lowerDiff.includes('spec')) {
    return 'test';
  }

  if (lowerDiff.includes('doc') || lowerDiff.includes('readme')) {
    return 'docs';
  }

  if (lowerDiff.includes('fix') || lowerDiff.includes('bug')) {
    return 'fix';
  }

  if (lowerDiff.includes('perf') || lowerDiff.includes('optimize')) {
    return 'perf';
  }

  // Check for new files (likely a feature)
  if (diff.includes('new file mode')) {
    return 'feat';
  }

  // Default to refactor for modifications
  return 'refactor';
}
