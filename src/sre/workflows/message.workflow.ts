/**
 * Message generation workflow
 * AI-powered commit message generation with learning, streaming, and context awareness
 */

import { EnhancedSREClient } from '../enhanced-client';
import { addGitSkills } from '../skills/git-skills';
import { CommitMemorySystem } from '../memory/commit-memory';
import { redactSecrets, truncateLargeDiff } from '../../utils/redact';
import { validateConventionalCommit, validateLength, truncateSafely } from '../../utils/validate';

export interface MessageWorkflowOptions {
  maxLen: number;
  style: 'plain' | 'conventional';
  scope?: string;
  printPrompt?: boolean;
  enableLearning?: boolean;
  enableStreaming?: boolean;
}

export interface MessageWorkflowResult {
  message: string;
  warnings: string[];
  metadata?: {
    toolsUsed?: string[];
    usage?: any;
  };
}

export class MessageWorkflow {
  private client: EnhancedSREClient;
  private memory?: CommitMemorySystem;

  constructor() {
    // Always use enhanced client for full features
    this.client = new EnhancedSREClient({
      enablePlanner: false, // Don't need planner for message generation
    });

    // Add git context skills
    const agent = this.client.getAgent();
    addGitSkills(agent);
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

    // Initialize memory system if learning is enabled
    let goodExamples: string[] = [];
    if (options.enableLearning !== false) {
      this.memory = new CommitMemorySystem(this.client.getAgent());
      goodExamples = this.memory.getGoodExamples(5, options.style);
    }

    // Generate message with streaming
    let finalMessage = '';
    const metadata: any = {};

    if (options.enableStreaming !== false) {
      // Use streaming for real-time feedback
      for await (const event of this.client.generateCommitMessageStream(safeDiff, {
        maxLen: options.maxLen,
        style: options.style,
        scope: options.scope,
        goodExamples,
      })) {
        if (event.type === 'complete') {
          finalMessage = event.data.content;
          metadata.toolsUsed = event.data.metadata.toolsUsed;
          metadata.usage = event.data.metadata.usage;
        }
      }
    } else {
      // Non-streaming fallback
      const stream = this.client.generateCommitMessageStream(safeDiff, {
        maxLen: options.maxLen,
        style: options.style,
        scope: options.scope,
        goodExamples,
      });

      for await (const event of stream) {
        if (event.type === 'complete') {
          finalMessage = event.data.content;
          metadata.toolsUsed = event.data.metadata.toolsUsed;
          metadata.usage = event.data.metadata.usage;
        }
      }
    }

    // Validate and enforce constraints
    const lengthValidation = validateLength(finalMessage, options.maxLen);
    if (!lengthValidation.valid) {
      finalMessage = truncateSafely(finalMessage, options.maxLen);
      warnings.push(`Message was truncated to ${options.maxLen} characters`);
    }

    // Validate conventional commit format if applicable
    if (options.style === 'conventional') {
      const validation = validateConventionalCommit(finalMessage);
      if (!validation.valid) {
        warnings.push(...validation.errors);
      }
      warnings.push(...validation.warnings);
    }

    return {
      message: finalMessage,
      warnings,
      metadata,
    };
  }

  /**
   * Learn from user feedback
   */
  async learnFromFeedback(message: string, accepted: boolean, feedback?: string): Promise<void> {
    if (!this.memory) {
      this.memory = new CommitMemorySystem(this.client.getAgent());
    }

    // Parse message to extract type/scope
    const match = message.match(/^(\w+)(?:\(([^)]+)\))?:/);
    const type = match?.[1];
    const scope = match?.[2];

    await this.memory.learnFromCommit(message, accepted, {
      style: match ? 'conventional' : 'plain',
      type,
      scope,
      feedback,
    });
  }

  /**
   * Get memory statistics
   */
  getMemoryStats() {
    if (!this.memory) {
      this.memory = new CommitMemorySystem(this.client.getAgent());
    }
    return this.memory.getStats();
  }

  /**
   * Get user preferences from memory
   */
  getPreferences() {
    if (!this.memory) {
      this.memory = new CommitMemorySystem(this.client.getAgent());
    }
    return this.memory.getPreferences();
  }

  /**
   * Reset memory
   */
  resetMemory(): void {
    if (!this.memory) {
      this.memory = new CommitMemorySystem(this.client.getAgent());
    }
    this.memory.reset();
  }
}
