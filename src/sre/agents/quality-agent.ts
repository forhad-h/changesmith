import { Agent, Model } from '@smythos/sdk';

/**
 * Code Quality Review Agent
 * Specializes in code quality, best practices, and maintainability
 */

export interface QualityIssue {
  severity: 'low' | 'medium' | 'high';
  category: string;
  title: string;
  location: string;
  description: string;
  fix: string;
}

export class QualityAgent {
  private agent: Agent;

  constructor() {
    this.agent = new Agent({
      id: 'quality-reviewer',
      name: 'Code Quality Specialist',
      behavior: `You are a code quality expert specializing in best practices and maintainability.

FOCUS AREAS:
- Code smells (long functions, god classes, duplicated code)
- SOLID principles violations
- Error handling gaps
- Missing tests or test coverage
- Poor naming and readability
- Magic numbers and hardcoded values
- Tight coupling
- Missing documentation
- Type safety issues
- Accessibility issues

SEVERITY LEVELS:
- HIGH: Major maintainability issue (god class, no error handling)
- MEDIUM: Moderate issue (code duplication, poor naming)
- LOW: Minor improvement (missing comment, could be more DRY)

OUTPUT FORMAT (JSON):
{
  "issues": [
    {
      "severity": "medium",
      "category": "Code Smell",
      "title": "Function too long (150 lines)",
      "location": "handler.ts:42",
      "description": "Function does too many things, hard to test and maintain",
      "fix": "Extract into smaller, single-responsibility functions"
    }
  ]
}

Focus on issues that affect maintainability, not personal style preferences.`,
      model: Model.Anthropic('claude-4-sonnet', {
        temperature: 0.5,
      }),
    });
  }

  async review(diff: string, context?: string): Promise<QualityIssue[]> {
    const prompt = this.buildPrompt(diff, context);

    try {
      const response = await this.agent.prompt(prompt);

      const jsonMatch = response.match(/\{[\s\S]*"issues"[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return parsed.issues || [];
      }

      return this.parseTextResponse(response);
    } catch (error) {
      console.error('Quality agent error:', error);
      return [];
    }
  }

  private buildPrompt(diff: string, context?: string): string {
    return `Review this code diff for CODE QUALITY ISSUES ONLY.

${context ? `CODEBASE CONTEXT:\n${context}\n\n` : ''}

CODE CHANGES:
${diff}

Analyze for:
1. Code smells (long methods, god classes, duplicated code)
2. SOLID principle violations
3. Error handling gaps (try-catch missing, errors swallowed)
4. Missing or inadequate tests
5. Poor naming (unclear variable/function names)
6. Magic numbers and hardcoded values
7. Tight coupling between modules
8. Type safety issues (any types, missing types)
9. Missing documentation for public APIs
10. Accessibility issues (if UI code)

Return JSON with array of quality issues. Each must have:
- severity: high|medium|low
- category: issue type
- title: brief description
- location: file:line
- description: what's wrong
- fix: how to improve

Example:
{
  "issues": [
    {
      "severity": "high",
      "category": "Error Handling",
      "title": "No error handling for async operation",
      "location": "api.ts:23",
      "description": "Async function can fail but has no try-catch",
      "fix": "Add try-catch block and handle errors appropriately"
    }
  ]
}

If no quality issues found, return: {"issues": []}`;
  }

  private parseTextResponse(response: string): QualityIssue[] {
    const issues: QualityIssue[] = [];
    const lines = response.split('\n');
    let currentIssue: Partial<QualityIssue> | null = null;

    for (const line of lines) {
      const trimmed = line.trim();

      if (trimmed.match(/severity.*:(high|medium|low)/i)) {
        if (currentIssue) issues.push(currentIssue as QualityIssue);
        currentIssue = {
          severity: trimmed.match(/(high|medium|low)/i)?.[1].toLowerCase() as any || 'medium',
        };
      } else if (currentIssue) {
        if (trimmed.match(/category.*:/i)) {
          currentIssue.category = trimmed.split(':')[1]?.trim() || 'Code Quality';
        } else if (trimmed.match(/title.*:/i)) {
          currentIssue.title = trimmed.split(':')[1]?.trim() || 'Quality issue';
        } else if (trimmed.match(/location.*:/i)) {
          currentIssue.location = trimmed.split(':')[1]?.trim() || 'unknown';
        } else if (trimmed.match(/description.*:/i)) {
          currentIssue.description = trimmed.split(':')[1]?.trim() || '';
        } else if (trimmed.match(/fix.*:/i)) {
          currentIssue.fix = trimmed.split(':')[1]?.trim() || '';
        }
      }
    }

    if (currentIssue) issues.push(currentIssue as QualityIssue);

    return issues;
  }

  getAgent(): Agent {
    return this.agent;
  }
}
