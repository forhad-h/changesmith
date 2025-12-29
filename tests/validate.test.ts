/**
 * Tests for validation utilities
 */

import { describe, it, expect } from 'vitest';
import { validateConventionalCommit, validateLength, truncateSafely, suggestType } from '../src/utils/validate.js';

describe('validateConventionalCommit', () => {
  it('should validate correct conventional commit', () => {
    const result = validateConventionalCommit('feat(auth): add login functionality');
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should reject invalid format', () => {
    const result = validateConventionalCommit('invalid commit message');
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it('should warn about non-standard types', () => {
    const result = validateConventionalCommit('custom(scope): message');
    expect(result.warnings.length).toBeGreaterThan(0);
  });

  it('should warn about trailing period', () => {
    const result = validateConventionalCommit('feat(scope): message.');
    expect(result.warnings.some(w => w.includes('period'))).toBe(true);
  });

  it('should accept message without scope', () => {
    const result = validateConventionalCommit('fix: resolve bug');
    expect(result.valid).toBe(true);
  });
});

describe('validateLength', () => {
  it('should pass for messages within limit', () => {
    const result = validateLength('short message', 72);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should fail for messages exceeding limit', () => {
    const longMessage = 'a'.repeat(100);
    const result = validateLength(longMessage, 72);
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it('should warn when close to limit', () => {
    const message = 'a'.repeat(68);
    const result = validateLength(message, 72);
    expect(result.valid).toBe(true);
    expect(result.warnings.length).toBeGreaterThan(0);
  });
});

describe('truncateSafely', () => {
  it('should not truncate short messages', () => {
    const message = 'short message';
    const result = truncateSafely(message, 72);
    expect(result).toBe(message);
  });

  it('should truncate at word boundary', () => {
    const message = 'this is a very long message that needs to be truncated at a word boundary';
    const result = truncateSafely(message, 30);
    expect(result.length).toBeLessThanOrEqual(30);
    expect(result.endsWith(' ')).toBe(false);
  });

  it('should handle messages without spaces', () => {
    const message = 'a'.repeat(100);
    const result = truncateSafely(message, 50);
    expect(result.length).toBe(50);
  });
});

describe('suggestType', () => {
  it('should suggest "test" for test files', () => {
    const diff = 'diff --git a/test/example.test.ts b/test/example.test.ts';
    const result = suggestType(diff);
    expect(result).toBe('test');
  });

  it('should suggest "docs" for documentation', () => {
    const diff = 'diff --git a/README.md b/README.md';
    const result = suggestType(diff);
    expect(result).toBe('docs');
  });

  it('should suggest "fix" for bug fixes', () => {
    const diff = 'fix the bug in authentication';
    const result = suggestType(diff);
    expect(result).toBe('fix');
  });

  it('should suggest "feat" for new files', () => {
    const diff = 'new file mode 100644\nindex 0000000..1234567';
    const result = suggestType(diff);
    expect(result).toBe('feat');
  });

  it('should default to "refactor"', () => {
    const diff = 'some random changes';
    const result = suggestType(diff);
    expect(result).toBe('refactor');
  });
});
