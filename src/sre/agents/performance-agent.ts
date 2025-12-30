import { Agent, Model } from '@smythos/sdk';

/**
 * Performance Review Agent
 * Specializes in identifying performance issues and optimization opportunities
 */

export interface PerformanceIssue {
  severity: 'low' | 'medium' | 'high';
  category: string;
  title: string;
  location: string;
  description: string;
  impact: string;
  fix: string;
}

export class PerformanceAgent {
  private agent: Agent;

  constructor() {
    this.agent = new Agent({
      id: 'performance-reviewer',
      name: 'Performance Optimization Specialist',
      behavior: `You are a performance optimization expert specializing in code efficiency.

FOCUS AREAS:
- N+1 query problems
- Unnecessary loops and iterations
- Memory leaks and excessive allocations
- Inefficient algorithms (O(n²) where O(n) possible)
- Bundle size and import issues
- Unnecessary re-renders (React/Vue)
- Blocking operations
- Cache misses
- Database query optimization
- API call optimization

SEVERITY LEVELS:
- HIGH: Significant performance degradation (N+1 queries, memory leaks)
- MEDIUM: Noticeable impact (inefficient loops, missing indexes)
- LOW: Minor optimization opportunity (better algorithm choice)

OUTPUT FORMAT (JSON):
{
  "issues": [
    {
      "severity": "high",
      "category": "N+1 Query",
      "title": "Multiple database queries in loop",
      "location": "users.ts:56",
      "description": "Fetching user details individually in a loop",
      "impact": "300ms → 30ms with batch query",
      "fix": "Use single query with JOIN or IN clause"
    }
  ]
}

Rate severity by actual performance impact, not theoretical.`,
      model: Model.Anthropic('claude-4-sonnet', {
        temperature: 0.4,
      }),
    });
  }

  async review(diff: string, context?: string): Promise<PerformanceIssue[]> {
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
      console.error('Performance agent error:', error);
      return [];
    }
  }

  private buildPrompt(diff: string, context?: string): string {
    return `Review this code diff for PERFORMANCE ISSUES ONLY.

${context ? `CODEBASE CONTEXT:\n${context}\n\n` : ''}

CODE CHANGES:
${diff}

Analyze for:
1. N+1 queries (database or API)
2. Inefficient loops (nested loops, unnecessary iterations)
3. Memory leaks (event listeners, closures, caches)
4. Algorithm efficiency (can O(n²) be O(n)?)
5. Bundle size issues (large imports, unused code)
6. Missing indexes or optimization hints
7. Blocking operations (synchronous where async possible)
8. Unnecessary re-computations

Return JSON with array of performance issues. Each must have:
- severity: high|medium|low
- category: issue type
- title: brief description
- location: file:line
- description: what's wrong
- impact: estimated performance impact
- fix: how to optimize

Example:
{
  "issues": [
    {
      "severity": "high",
      "category": "N+1 Query",
      "title": "Individual queries in loop",
      "location": "users.ts:42",
      "description": "Fetching related data in a loop causes N+1 queries",
      "impact": "500ms for 100 items vs 50ms with batch query",
      "fix": "Use eager loading or single query with JOIN"
    }
  ]
}

If no performance issues found, return: {"issues": []}`;
  }

  private parseTextResponse(response: string): PerformanceIssue[] {
    const issues: PerformanceIssue[] = [];
    const lines = response.split('\n');
    let currentIssue: Partial<PerformanceIssue> | null = null;

    for (const line of lines) {
      const trimmed = line.trim();

      if (trimmed.match(/severity.*:(high|medium|low)/i)) {
        if (currentIssue) issues.push(currentIssue as PerformanceIssue);
        currentIssue = {
          severity: trimmed.match(/(high|medium|low)/i)?.[1].toLowerCase() as any || 'medium',
        };
      } else if (currentIssue) {
        if (trimmed.match(/category.*:/i)) {
          currentIssue.category = trimmed.split(':')[1]?.trim() || 'Performance';
        } else if (trimmed.match(/title.*:/i)) {
          currentIssue.title = trimmed.split(':')[1]?.trim() || 'Performance issue';
        } else if (trimmed.match(/location.*:/i)) {
          currentIssue.location = trimmed.split(':')[1]?.trim() || 'unknown';
        } else if (trimmed.match(/description.*:/i)) {
          currentIssue.description = trimmed.split(':')[1]?.trim() || '';
        } else if (trimmed.match(/impact.*:/i)) {
          currentIssue.impact = trimmed.split(':')[1]?.trim() || '';
        } else if (trimmed.match(/fix.*:/i)) {
          currentIssue.fix = trimmed.split(':')[1]?.trim() || '';
        }
      }
    }

    if (currentIssue) issues.push(currentIssue as PerformanceIssue);

    return issues;
  }

  getAgent(): Agent {
    return this.agent;
  }
}
