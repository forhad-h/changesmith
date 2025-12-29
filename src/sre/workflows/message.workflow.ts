/**
 * Message generation workflow
 * This module handles the LLM workflow for generating commit messages
 */

import { SREClient } from '../client';
import { redactSecrets, truncateLargeDiff } from '../../utils/redact';
import { validateConventionalCommit, validateLength, truncateSafely } from '../../utils/validate';

export interface MessageWorkflowOptions {
  maxLen: number;
  style: 'plain' | 'conventional';
  scope?: string;
  printPrompt?: boolean;
}

export interface MessageWorkflowResult {
  message: string;
  warnings: string[];
}

export class MessageWorkflow {
  private client: SREClient;

  constructor(client: SREClient) {
    this.client = client;
  }

  async execute(diff: string, options: MessageWorkflowOptions): Promise<MessageWorkflowResult> {
    const warnings: string[] = [];

    // Security: Redact secrets
    const redactionResult = redactSecrets(diff);
    if (redactionResult.redactedCount > 0) {
      warnings.push(`Redacted ${redactionResult.redactedCount} potential secrets from diff`);
    }
    warnings.push(...redactionResult.warnings);

    // Security: Truncate large diffs
    const { content: safeDiff, truncated } = truncateLargeDiff(redactionResult.content);
    if (truncated) {
      warnings.push('Diff was truncated due to size (>80k chars)');
    }

    // Generate message with retry logic for length
    let message = await this.generateWithRetry(safeDiff, options, 2);

    // Validate and enforce constraints
    const lengthValidation = validateLength(message, options.maxLen);
    if (!lengthValidation.valid) {
      // Truncate safely if still too long after retries
      message = truncateSafely(message, options.maxLen);
      warnings.push(`Message was truncated to ${options.maxLen} characters`);
    }

    // Validate conventional commit format if applicable
    if (options.style === 'conventional') {
      const validation = validateConventionalCommit(message);
      if (!validation.valid) {
        warnings.push(...validation.errors);
      }
      warnings.push(...validation.warnings);
    }

    return {
      message,
      warnings,
    };
  }

  private async generateWithRetry(
    diff: string,
    options: MessageWorkflowOptions,
    maxRetries: number
  ): Promise<string> {
    let message = await this.client.generateCommitMessage(diff, {
      maxLen: options.maxLen,
      style: options.style,
      scope: options.scope,
    });

    // Check length and retry if needed
    let retries = 0;
    while (message.length > options.maxLen && retries < maxRetries) {
      retries++;

      // Ask model to shorten
      const shortenPrompt = `Shorten this commit message to ${options.maxLen} characters or less while keeping it meaningful:

${message}

OUTPUT ONLY THE SHORTENED MESSAGE:`;

      message = await this.client.prompt(shortenPrompt);
      message = message.trim();
    }

    return message;
  }
}
