/**
 * Review command - Review code changes before PR
 */

import { createAdapter, AdapterType } from '../adapters/index';
import { SREClient, ReviewWorkflow } from '../sre/index';

export interface ReviewCommandOptions {
  format: 'text' | 'md' | 'json';
  strict: boolean;
  patch: boolean;
  adapter: AdapterType;
  input?: string;
  printPrompt?: boolean;
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

    // Initialize SRE client and workflow
    const client = new SREClient();
    const workflow = new ReviewWorkflow(client);

    // Execute workflow
    const result = await workflow.execute(diff, {
      format: options.format,
      strict: options.strict,
      patch: options.patch,
      printPrompt: options.printPrompt,
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
