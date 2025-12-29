/**
 * Review workflow
 * This module handles the LLM workflow for reviewing code changes
 */

import { SREClient } from '../client';
import { redactSecrets, truncateLargeDiff } from '../../utils/redact';
import { formatReview, ReviewOutput } from '../../utils/format';

export interface ReviewWorkflowOptions {
  format: 'text' | 'md' | 'json';
  strict: boolean;
  patch: boolean;
  printPrompt?: boolean;
}

export interface ReviewWorkflowResult {
  output: string;
  warnings: string[];
}

export class ReviewWorkflow {
  private client: SREClient;

  constructor(client: SREClient) {
    this.client = client;
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

    // Get review from SRE
    const reviewText = await this.client.reviewChanges(safeDiff, {
      strict: options.strict,
      patch: options.patch,
    });

    // Parse and format the review
    const parsedReview = this.parseReview(reviewText);
    const formattedOutput = formatReview(parsedReview, options.format);

    return {
      output: formattedOutput,
      warnings,
    };
  }

  /**
   * Parse LLM response into structured review
   * This is a basic parser - the LLM should return structured output
   */
  private parseReview(text: string): ReviewOutput {
    const review: ReviewOutput = {
      summary: [],
      issues: [],
      testing: [],
      checklist: [],
    };

    // Basic parsing - extract sections
    const summaryMatch = text.match(/## Summary\s*([\s\S]*?)(?=##|$)/i);
    if (summaryMatch) {
      review.summary = this.extractBullets(summaryMatch[1], 3);
    }

    const issuesMatch = text.match(/## Issues\s*([\s\S]*?)(?=##|$)/i);
    if (issuesMatch) {
      review.issues = this.extractIssues(issuesMatch[1]);
    }

    const testingMatch = text.match(/## What to Test\s*([\s\S]*?)(?=##|$)/i);
    if (testingMatch) {
      review.testing = this.extractBullets(testingMatch[1], 5);
    }

    const checklistMatch = text.match(/## PR Checklist\s*([\s\S]*?)(?=##|$)/i);
    if (checklistMatch) {
      review.checklist = this.extractBullets(checklistMatch[1], 6);
    }

    return review;
  }

  private extractBullets(section: string, max: number): string[] {
    const bullets = section
      .split('\n')
      .filter((line) => line.trim().startsWith('-') || line.trim().startsWith('*'))
      .map((line) => line.replace(/^[\s\-\*]+/, '').trim())
      .filter((line) => line.length > 0)
      .slice(0, max);

    return bullets;
  }

  private extractIssues(section: string): any[] {
    const issues: any[] = [];

    // Split by markdown headers (###)
    const issueBlocks = section.split(/###/).filter((block) => block.trim().length > 0);

    for (const block of issueBlocks.slice(0, 5)) {
      const lines = block.split('\n').map((l) => l.trim());

      // Extract title and severity
      const titleLine = lines[0];
      let severity: 'low' | 'medium' | 'high' = 'medium';

      if (titleLine.toLowerCase().includes('high') || titleLine.includes('🔴')) {
        severity = 'high';
      } else if (titleLine.toLowerCase().includes('low') || titleLine.includes('🟢')) {
        severity = 'low';
      }

      const title = titleLine.replace(/\[.*?\]|🔴|🟡|🟢|\d+\./g, '').trim();

      // Extract fields
      const whyLine = lines.find((l) => l.toLowerCase().startsWith('**why'));
      const whereLine = lines.find((l) => l.toLowerCase().startsWith('**where'));
      const fixLine = lines.find((l) => l.toLowerCase().startsWith('**fix'));

      issues.push({
        severity,
        title: title || 'Unknown issue',
        why: whyLine ? whyLine.replace(/\*\*why:\*\*/i, '').trim() : 'Not specified',
        where: whereLine ? whereLine.replace(/\*\*where:\*\*/i, '').trim() : 'Not specified',
        fix: fixLine ? fixLine.replace(/\*\*fix:\*\*/i, '').trim() : 'Not specified',
      });
    }

    return issues;
  }
}
