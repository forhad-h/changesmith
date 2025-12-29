/**
 * Security utilities for redacting sensitive information from diffs
 */

const SECRET_PATTERNS = [
  // API Keys
  /\b[A-Za-z0-9_-]{20,}\b/g,
  // Bearer tokens
  /Bearer\s+[A-Za-z0-9_\-\.]+/gi,
  // AWS keys
  /AKIA[0-9A-Z]{16}/g,
  // Private keys
  /-----BEGIN\s+(RSA\s+)?PRIVATE\s+KEY-----[\s\S]*?-----END\s+(RSA\s+)?PRIVATE\s+KEY-----/g,
  // Generic secrets (secret=, password=, token=)
  /(secret|password|token|api[_-]?key)\s*[:=]\s*['""]?([^\s'""]+)['""]?/gi,
  // Anthropic API keys
  /sk-ant-[a-zA-Z0-9-_]{95,}/g,
  // OpenAI API keys
  /sk-[a-zA-Z0-9]{48}/g,
  // GitHub tokens
  /gh[pousr]_[A-Za-z0-9_]{36,}/g,
];

export interface RedactionResult {
  content: string;
  redactedCount: number;
  warnings: string[];
}

/**
 * Redact sensitive information from diff content
 */
export function redactSecrets(content: string): RedactionResult {
  let redacted = content;
  let redactedCount = 0;
  const warnings: string[] = [];

  for (const pattern of SECRET_PATTERNS) {
    const matches = redacted.match(pattern);
    if (matches) {
      redactedCount += matches.length;
      redacted = redacted.replace(pattern, '[REDACTED]');
    }
  }

  // Check for common secret file patterns
  const secretFilePatterns = [
    '.env',
    'credentials.json',
    'secrets.yaml',
    'private.key',
    '.pem',
    'id_rsa',
  ];

  for (const pattern of secretFilePatterns) {
    if (content.includes(pattern)) {
      warnings.push(`Warning: Detected potential secret file: ${pattern}`);
    }
  }

  return {
    content: redacted,
    redactedCount,
    warnings,
  };
}

/**
 * Check if content is safe to send (no obvious secrets)
 */
export function isSafeContent(content: string): boolean {
  const result = redactSecrets(content);
  return result.redactedCount === 0 && result.warnings.length === 0;
}

/**
 * Truncate large diffs with a warning
 */
export function truncateLargeDiff(content: string, maxChars: number = 80000): { content: string; truncated: boolean } {
  if (content.length <= maxChars) {
    return { content, truncated: false };
  }

  const truncated = content.substring(0, maxChars);
  const warning = `\n\n[... Diff truncated at ${maxChars} characters for safety ...]`;

  return {
    content: truncated + warning,
    truncated: true,
  };
}
