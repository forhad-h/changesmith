/**
 * ChangeSmith - Professional change message generator and code reviewer
 *
 * This is the main module entry point.
 * For CLI usage, use src/cli.ts
 *
 * API keys are configured in:
 *   - .smyth/.sre/vault.json
 *   - ~/.smyth/.sre/vault.json
 *   - Environment variable: ANTHROPIC_API_KEY
 */

// Export public API
export * from './commands/index';
export * from './adapters/index';
export * from './sre/index';
export * from './utils/index';
