/**
 * Review command - Multi-agent code review with regression detection
 */

import { createAdapter, AdapterType } from '../adapters/index';
import { ReviewWorkflow } from '../sre/index';

export interface ReviewCommandOptions {
  format: 'text' | 'md' | 'json';
  strict: boolean;
  patch: boolean;
  adapter: AdapterType;
  input?: string;
  printPrompt?: boolean;
  useMultiAgent?: boolean;
  checkRegressions?: boolean;
  useVectorDB?: boolean;
}

export interface ReviewCommandResult {
  output: string;
  warnings: string[];
  error?: string;
}

export async function reviewCommand(options: ReviewCommandOptions): Promise<ReviewCommandResult> {
  try {
    // Create adapter based on type
    const adapter = createAdapter(options.adapter, {
      input: options.input,
    });

    // Validate adapter
    const isValid = await adapter.validate();
    if (!isValid) {
      return {
        output: '',
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
        output: '',
        warnings: [],
        error: error instanceof Error ? error.message : 'Failed to get changes',
      };
    }

    // Initialize workflow (now uses enhanced client by default)
    const workflow = new ReviewWorkflow();

    // Execute workflow with all features
    const result = await workflow.execute(diff, {
      format: options.format,
      strict: options.strict,
      patch: options.patch,
      printPrompt: options.printPrompt,
      useMultiAgent: options.useMultiAgent,
      checkRegressions: options.checkRegressions,
      useVectorDB: options.useVectorDB,
    });

    return {
      output: result.output,
      warnings: result.warnings,
    };
  } catch (error) {
    return {
      output: '',
      warnings: [],
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}
