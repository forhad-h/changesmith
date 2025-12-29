import { Agent, Model } from '@smythos/sdk';

/**
 * SRE Client - manages LLM interaction through SmythOS SRE
 */

export interface SREClientConfig {
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

export class SREClient {
  private agent: Agent;
  private config: SREClientConfig;

  constructor(config: SREClientConfig = {}) {
    this.config = {
      model: config.model || 'claude-4-sonnet',
      temperature: config.temperature || 0.7,
      maxTokens: config.maxTokens || 4096,
    };

    // Initialize SRE agent with Anthropic connector
    this.agent = new Agent({
      name: 'ChangeSmith Assistant',
      behavior: 'You are a professional software development assistant that helps with commit messages and code reviews.',
      model: Model.Anthropic(this.config.model, {
        temperature: this.config.temperature,
        maxTokens: this.config.maxTokens,
      }),
    });
  }

  /**
   * Execute a prompt with the SRE agent
   */
  async prompt(message: string): Promise<string> {
    try {
      const response = await this.agent.prompt(message);
      return response;
    } catch (error) {
      throw new Error(`SRE prompt failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Generate a commit message using the configured model
   */
  async generateCommitMessage(
    diff: string,
    options: {
      maxLen: number;
      style: 'plain' | 'conventional';
      scope?: string;
    }
  ): Promise<string> {
    const { maxLen, style, scope } = options;

    let prompt = this.buildMessagePrompt(diff, maxLen, style, scope);

    const response = await this.prompt(prompt);

    // Extract just the message (remove any explanations)
    return this.extractMessage(response);
  }

  /**
   * Review changes using the configured model
   */
  async reviewChanges(
    diff: string,
    options: {
      strict: boolean;
      patch: boolean;
    }
  ): Promise<string> {
    const prompt = this.buildReviewPrompt(diff, options);
    return await this.prompt(prompt);
  }

  /**
   * Build commit message generation prompt
   */
  private buildMessagePrompt(
    diff: string,
    maxLen: number,
    style: 'plain' | 'conventional',
    scope?: string
  ): string {
    if (style === 'conventional') {
      return `You are a commit message generator. Generate a SINGLE LINE conventional commit message for the following changes.

REQUIREMENTS:
- Format: type(scope): subject
- Allowed types: feat, fix, refactor, docs, test, chore, perf, build, ci, revert
- Use imperative mood (e.g., "add" not "adds" or "added")
- No trailing period
- Maximum ${maxLen} characters
- Lowercase subject start
${scope ? `- Scope: ${scope}` : '- Auto-detect scope from changes'}

CHANGES:
${diff}

OUTPUT ONLY THE COMMIT MESSAGE (one line, no explanation, no quotes):`;
    } else {
      return `You are a commit message generator. Generate a SINGLE LINE commit message for the following changes.

REQUIREMENTS:
- Maximum ${maxLen} characters
- Concise and professional
- Imperative mood
- No trailing period

CHANGES:
${diff}

OUTPUT ONLY THE COMMIT MESSAGE (one line, no explanation, no quotes):`;
    }
  }

  /**
   * Build code review prompt
   */
  private buildReviewPrompt(
    diff: string,
    options: { strict: boolean; patch: boolean }
  ): string {
    return `You are a senior software engineer reviewing code changes. Analyze the following diff and provide a structured review.

${options.strict ? 'STRICT MODE: Pay extra attention to security vulnerabilities, edge cases, and production readiness.\n' : ''}

CHANGES:
${diff}

PROVIDE A STRUCTURED REVIEW IN THIS FORMAT:

## Summary
[Max 3 bullet points summarizing the changes]

## Issues
[Max 5 issues, each with:]
- Severity: low|medium|high
- Title: Brief issue description
- Why: Why this matters
- Where: File/function/line if applicable
- Fix: Suggested fix

## What to Test
[Max 5 bullet points of testing recommendations]

## PR Checklist
[Max 6 items for PR review]

${options.patch ? '\nIf you suggest code changes, include patch hunks in diff format.' : ''}

Keep the review concise (≈120 lines max). Focus on real issues, not nitpicks. Do not hallucinate files or issues.`;
  }

  /**
   * Extract clean message from response (remove explanations)
   */
  private extractMessage(response: string): string {
    // Remove common prefixes
    let message = response.trim();

    // Remove quotes if present
    message = message.replace(/^["']|["']$/g, '');

    // Take only the first line
    const lines = message.split('\n');
    message = lines[0].trim();

    // Remove any "Here's" or explanation prefixes
    message = message.replace(/^(Here's?|Here is) (the|a) (commit )?message:?\s*/i, '');

    return message;
  }
}
