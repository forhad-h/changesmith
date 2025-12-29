/**
 * Tests for adapters
 */

import { describe, it, expect } from 'vitest';
import { createAdapter } from '../src/adapters/index.js';
import { FileAdapter } from '../src/adapters/file.js';
import { writeFileSync, unlinkSync, existsSync } from 'fs';
import { join } from 'path';

describe('createAdapter', () => {
  it('should create git adapter', () => {
    const adapter = createAdapter('git');
    expect(adapter.name).toBe('git');
  });

  it('should create file adapter with input', () => {
    const adapter = createAdapter('file', { input: '/tmp/test.diff' });
    expect(adapter.name).toBe('file');
  });

  it('should throw for unknown adapter', () => {
    expect(() => {
      // @ts-ignore - testing invalid input
      createAdapter('unknown');
    }).toThrow();
  });
});

describe('FileAdapter', () => {
  const testFile = join('/tmp', 'changesmith-test.diff');

  it('should require input option', () => {
    expect(() => {
      new FileAdapter({});
    }).toThrow('requires --input');
  });

  it('should validate file exists', async () => {
    writeFileSync(testFile, 'test content');
    const adapter = new FileAdapter({ input: testFile });
    const valid = await adapter.validate();
    expect(valid).toBe(true);
    unlinkSync(testFile);
  });

  it('should return false for non-existent file', async () => {
    const adapter = new FileAdapter({ input: '/tmp/nonexistent.diff' });
    const valid = await adapter.validate();
    expect(valid).toBe(false);
  });

  it('should read file content', async () => {
    const content = 'diff --git a/test.ts b/test.ts\n+added line';
    writeFileSync(testFile, content);
    const adapter = new FileAdapter({ input: testFile });
    const changes = await adapter.getChanges();
    expect(changes).toBe(content);
    unlinkSync(testFile);
  });

  it('should throw for empty file', async () => {
    writeFileSync(testFile, '');
    const adapter = new FileAdapter({ input: testFile });
    await expect(adapter.getChanges()).rejects.toThrow('empty');
    unlinkSync(testFile);
  });

  it('should throw for non-existent file', async () => {
    const adapter = new FileAdapter({ input: '/tmp/nonexistent.diff' });
    await expect(adapter.getChanges()).rejects.toThrow('not found');
  });
});
