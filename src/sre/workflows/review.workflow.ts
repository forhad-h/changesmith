/**
 * Review workflow
 * Multi-agent code review with regression detection and vector DB context
 */

import { EnhancedSREClient } from '../enhanced-client';
import { CodebaseVectorDB } from '../codebase-vector';
import { MultiAgentCoordinator, ComprehensiveReview } from '../agents/multi-agent-coordinator';
import { redactSecrets, truncateLargeDiff } from '../../utils/redact';
import chalk from 'chalk';

export interface ReviewWorkflowOptions {
  format: 'text' | 'md' | 'json';
  strict: boolean;
  patch: boolean;
  printPrompt?: boolean;
  useMultiAgent?: boolean;
  checkRegressions?: boolean;
  useVectorDB?: boolean;
}

export interface ReviewWorkflowResult {
  output: string;
  warnings: string[];
  review?: ComprehensiveReview;
  regressionRisks?: Array<{
    file: string;
    reason: string;
    severity: 'low' | 'medium' | 'high';
  }>;
}

export class ReviewWorkflow {
  private client: EnhancedSREClient;
  private vectorDB?: CodebaseVectorDB;
  private coordinator?: MultiAgentCoordinator;

  constructor() {
    // Always use enhanced client with planner mode for complex reviews
    this.client = new EnhancedSREClient({
      enablePlanner: true,
    });
  }

  async execute(diff: string, options: ReviewWorkflowOptions): Promise<ReviewWorkflowResult> {
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

    const agent = this.client.getAgent();

    // Get codebase context if vector DB is enabled
    let codebaseContext: string | undefined;
    let regressionRisks: any[] | undefined;

    if (options.useVectorDB !== false || options.checkRegressions) {
      if (options.printPrompt !== false) {
        console.log(chalk.dim('📚 Searching codebase for context...'));
      }

      this.vectorDB = new CodebaseVectorDB(agent);

      // Search for relevant context
      try {
        codebaseContext = await this.vectorDB.searchRelevantContext(safeDiff, { topK: 5 });
        if (options.printPrompt !== false) {
          console.log(chalk.dim('✓ Found relevant codebase context\n'));
        }
      } catch (error) {
        warnings.push('Failed to search vector DB - continuing without codebase context');
      }

      // Check for regressions if requested
      if (options.checkRegressions) {
        if (options.printPrompt !== false) {
          console.log(chalk.dim('🔍 Detecting potential regressions...'));
        }

        try {
          const regressionResult = await this.vectorDB.detectRegressions(safeDiff);
          regressionRisks = regressionResult.risks;

          if (options.printPrompt !== false) {
            if (regressionRisks.length > 0) {
              console.log(
                chalk.yellow(`⚠  Found ${regressionRisks.length} potential regression risks\n`)
              );
            } else {
              console.log(chalk.dim('✓ No regression risks detected\n'));
            }
          }
        } catch (error) {
          warnings.push('Failed to detect regressions - continuing with standard review');
        }
      }
    }

    let review: ComprehensiveReview | undefined;
    let output: string;

    // Use multi-agent review if enabled (default)
    if (options.useMultiAgent !== false) {
      if (options.printPrompt !== false) {
        console.log(chalk.dim('🤖 Running multi-agent review...\n'));
      }

      this.coordinator = new MultiAgentCoordinator();
      review = await this.coordinator.review(safeDiff, codebaseContext);

      // Format output based on format option
      output = this.formatMultiAgentReview(review, options.format, regressionRisks);
    } else {
      // Fall back to basic streaming review
      if (options.printPrompt !== false) {
        console.log(chalk.dim('Reviewing changes...\n'));
      }

      let reviewContent = '';
      for await (const event of this.client.reviewChangesStream(safeDiff, {
        strict: options.strict,
        patch: options.patch,
        codebaseContext,
      })) {
        if (event.type === 'complete') {
          reviewContent = event.data.content;
        }
      }

      output = reviewContent;
    }

    return {
      output,
      warnings,
      review,
      regressionRisks,
    };
  }

  /**
   * Index codebase into vector database (one-time setup)
   */
  async indexCodebase(rootDir?: string): Promise<{ filesIndexed: number; chunks: number }> {
    if (!this.vectorDB) {
      this.vectorDB = new CodebaseVectorDB(this.client.getAgent());
    }
    return await this.vectorDB.indexCodebase(rootDir);
  }

  /**
   * Format multi-agent review based on output format
   */
  private formatMultiAgentReview(
    review: ComprehensiveReview,
    format: 'text' | 'md' | 'json',
    regressionRisks?: any[]
  ): string {
    if (format === 'json') {
      return JSON.stringify({ review, regressionRisks }, null, 2);
    }

    const md = format === 'md';

    let output = '';

    // Header
    if (md) {
      output += '# Code Review Summary\n\n';
    } else {
      output += 'CODE REVIEW SUMMARY\n';
      output += '='.repeat(50) + '\n\n';
    }

    // Summary statistics
    if (md) {
      output += '## Statistics\n\n';
    } else {
      output += 'STATISTICS\n';
    }

    output += `Total issues: ${review.summary.totalIssues}\n`;
    if (review.summary.criticalCount > 0) {
      output += chalk.red(`Critical: ${review.summary.criticalCount}\n`);
    }
    if (review.summary.highCount > 0) {
      output += chalk.yellow(`High: ${review.summary.highCount}\n`);
    }
    if (review.summary.mediumCount > 0) {
      output += `Medium: ${review.summary.mediumCount}\n`;
    }
    if (review.summary.lowCount > 0) {
      output += chalk.dim(`Low: ${review.summary.lowCount}\n`);
    }
    output += `\nCategories: ${review.summary.categories.join(', ')}\n\n`;

    // Synthesis
    if (md) {
      output += '## Executive Summary\n\n';
    } else {
      output += 'EXECUTIVE SUMMARY\n';
    }
    output += review.synthesis + '\n\n';

    // Recommendations
    if (review.recommendations.length > 0) {
      if (md) {
        output += '## Recommendations\n\n';
      } else {
        output += 'RECOMMENDATIONS\n';
      }

      review.recommendations.forEach((rec, i) => {
        output += `${i + 1}. ${rec}\n`;
      });
      output += '\n';
    }

    // Top priority issues
    if (review.topIssues.length > 0) {
      if (md) {
        output += '## Top Priority Issues\n\n';
      } else {
        output += 'TOP PRIORITY ISSUES\n';
      }

      review.topIssues.forEach((issue, i) => {
        const severityColor =
          issue.severity === 'critical' || issue.severity === 'high'
            ? chalk.red
            : issue.severity === 'medium'
            ? chalk.yellow
            : chalk.dim;

        output += `${i + 1}. ${severityColor(`[${issue.severity.toUpperCase()}]`)} ${issue.title}\n`;
        output += `   Category: ${issue.category} | Agent: ${issue.agent}\n`;
      });
      output += '\n';
    }

    // Regression risks
    if (regressionRisks && regressionRisks.length > 0) {
      if (md) {
        output += '## Regression Risks\n\n';
      } else {
        output += 'REGRESSION RISKS\n';
      }

      regressionRisks.forEach((risk, i) => {
        const severityColor =
          risk.severity === 'high'
            ? chalk.red
            : risk.severity === 'medium'
            ? chalk.yellow
            : chalk.dim;

        output += `${i + 1}. ${severityColor(`[${risk.severity.toUpperCase()}]`)} ${risk.file}\n`;
        output += `   ${risk.reason}\n`;
      });
      output += '\n';
    }

    // Detailed issues by category
    if (md) {
      output += '## Detailed Issues\n\n';
    } else {
      output += 'DETAILED ISSUES\n';
    }

    if (review.security.length > 0) {
      if (md) {
        output += '### Security Issues\n\n';
      } else {
        output += '\nSecurity Issues:\n';
      }

      review.security.forEach((issue, i) => {
        output += `${i + 1}. [${issue.severity.toUpperCase()}] ${issue.title}\n`;
        output += `   Location: ${issue.location}\n`;
        if (issue.cweId) {
          output += `   CWE: ${issue.cweId}\n`;
        }
        output += `   Description: ${issue.description}\n`;
        if (issue.recommendation) {
          output += `   Fix: ${issue.recommendation}\n`;
        }
        output += '\n';
      });
    }

    if (review.performance.length > 0) {
      if (md) {
        output += '### Performance Issues\n\n';
      } else {
        output += '\nPerformance Issues:\n';
      }

      review.performance.forEach((issue, i) => {
        output += `${i + 1}. [${issue.severity.toUpperCase()}] ${issue.title}\n`;
        output += `   Location: ${issue.location}\n`;
        output += `   Description: ${issue.description}\n`;
        if (issue.impact) {
          output += `   Impact: ${issue.impact}\n`;
        }
        if (issue.recommendation) {
          output += `   Fix: ${issue.recommendation}\n`;
        }
        output += '\n';
      });
    }

    if (review.quality.length > 0) {
      if (md) {
        output += '### Quality Issues\n\n';
      } else {
        output += '\nQuality Issues:\n';
      }

      review.quality.forEach((issue, i) => {
        output += `${i + 1}. [${issue.severity.toUpperCase()}] ${issue.title}\n`;
        output += `   Location: ${issue.location}\n`;
        output += `   Description: ${issue.description}\n`;
        if (issue.recommendation) {
          output += `   Fix: ${issue.recommendation}\n`;
        }
        output += '\n';
      });
    }

    return output;
  }
}
