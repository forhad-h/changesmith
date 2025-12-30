/**
 * Message command - AI-powered commit message generation with learning and context
 */

import { createAdapter, AdapterType } from '../adapters/index';
import { MessageWorkflow } from '../sre/index';
import chalk from 'chalk';

export interface MessageCommandOptions {
  maxLen: number;
  style: 'plain' | 'conventional';
  scope: 'auto' | 'none' | string;
  customScope?: string;
  adapter: AdapterType;
  input?: string;
  printPrompt?: boolean;
  enableLearning?: boolean;
  enableStreaming?: boolean;
}

export interface MessageCommandResult {
  message: string;
  warnings: string[];
  error?: string;
  metadata?: {
    toolsUsed?: string[];
    usage?: any;
  };
}

export async function messageCommand(options: MessageCommandOptions): Promise<MessageCommandResult> {
  try {
    // Create adapter based on type
    const adapter = createAdapter(options.adapter, {
      input: options.input,
    });

    // Validate adapter
    const isValid = await adapter.validate();
    if (!isValid) {
      return {
        message: '',
        warnings: [],
        error: `Adapter validation failed: ${options.adapter} adapter is not available or configured incorrectly`,
      };
    }

    // Get changes from adapter
    let diff: string;
    try {
      diff = await adapter.getChanges();
    } catch (error) {
      return {
        message: '',
        warnings: [],
        error: error instanceof Error ? error.message : 'Failed to get changes',
      };
    }

    // Determine scope
    let scope: string | undefined;
    if (options.scope === 'auto') {
      scope = undefined; // Let LLM auto-detect
    } else if (options.scope === 'none') {
      scope = undefined;
    } else if (options.customScope) {
      scope = options.customScope;
    } else if (options.scope !== 'auto' && options.scope !== 'none') {
      scope = options.scope;
    }

    // Show progress if streaming
    if (options.enableStreaming !== false && options.printPrompt !== false) {
      console.log(chalk.dim('Analyzing changes...'));
    }

    // Initialize workflow (now uses enhanced client by default)
    const workflow = new MessageWorkflow();

    // Execute workflow with all features
    const result = await workflow.execute(diff, {
      maxLen: options.maxLen,
      style: options.style,
      scope,
      printPrompt: options.printPrompt,
      enableLearning: options.enableLearning,
      enableStreaming: options.enableStreaming,
    });

    return {
      message: result.message,
      warnings: result.warnings,
      metadata: result.metadata,
    };
  } catch (error) {
    return {
      message: '',
      warnings: [],
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}
