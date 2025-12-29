/**
 * Tests for security redaction utilities
 */

import { describe, it, expect } from 'vitest';
import { redactSecrets, isSafeContent, truncateLargeDiff } from '../src/utils/redact.js';

describe('redactSecrets', () => {
  it('should redact API keys', () => {
    const content = 'API_KEY=sk-ant-api03-abc123def456';
    const result = redactSecrets(content);
    expect(result.content).toContain('[REDACTED]');
    expect(result.redactedCount).toBeGreaterThan(0);
  });

  it('should redact Bearer tokens', () => {
    const content = 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9';
    const result = redactSecrets(content);
    expect(result.content).toContain('[REDACTED]');
  });

  it('should redact private keys', () => {
    const content = '-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBg\n-----END PRIVATE KEY-----';
    const result = redactSecrets(content);
    expect(result.content).toContain('[REDACTED]');
  });

  it('should warn about secret files', () => {
    const content = 'diff --git a/.env b/.env';
    const result = redactSecrets(content);
    expect(result.warnings.length).toBeGreaterThan(0);
  });

  it('should not modify safe content', () => {
    const content = 'function hello() { return "world"; }';
    const result = redactSecrets(content);
    expect(result.content).toBe(content);
    expect(result.redactedCount).toBe(0);
  });
});

describe('isSafeContent', () => {
  it('should return true for safe content', () => {
    const content = 'normal code without secrets';
    expect(isSafeContent(content)).toBe(true);
  });

  it('should return false for content with secrets', () => {
    const content = 'password=supersecret123';
    expect(isSafeContent(content)).toBe(false);
  });
});

describe('truncateLargeDiff', () => {
  it('should not truncate small diffs', () => {
    const content = 'small diff content';
    const result = truncateLargeDiff(content, 100);
    expect(result.truncated).toBe(false);
    expect(result.content).toBe(content);
  });

  it('should truncate large diffs', () => {
    const content = 'a'.repeat(100000);
    const result = truncateLargeDiff(content, 80000);
    expect(result.truncated).toBe(true);
    expect(result.content.length).toBeLessThan(content.length);
    expect(result.content).toContain('truncated');
  });

  it('should use default limit', () => {
    const content = 'a'.repeat(90000);
    const result = truncateLargeDiff(content);
    expect(result.truncated).toBe(true);
  });
});
