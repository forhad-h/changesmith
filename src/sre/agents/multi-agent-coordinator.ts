import { Agent, Model } from '@smythos/sdk';
import { SecurityAgent, SecurityIssue } from './security-agent';
import { PerformanceAgent, PerformanceIssue } from './performance-agent';
import { QualityAgent, QualityIssue } from './quality-agent';

/**
 * Multi-Agent Review Coordinator
 * Orchestrates specialized agents and synthesizes their findings
 */

export interface ComprehensiveReview {
  summary: {
    totalIssues: number;
    criticalCount: number;
    highCount: number;
    mediumCount: number;
    lowCount: number;
    categories: string[];
  };
  security: SecurityIssue[];
  performance: PerformanceIssue[];
  quality: QualityIssue[];
  synthesis: string;
  recommendations: string[];
  topIssues: Array<{
    severity: string;
    category: string;
    title: string;
    agent: 'security' | 'performance' | 'quality';
  }>;
}

export class MultiAgentCoordinator {
  private securityAgent: SecurityAgent;
  private performanceAgent: PerformanceAgent;
  private qualityAgent: QualityAgent;
  private coordinatorAgent: Agent;

  constructor() {
    this.securityAgent = new SecurityAgent();
    this.performanceAgent = new PerformanceAgent();
    this.qualityAgent = new QualityAgent();

    // Coordinator agent synthesizes all findings
    this.coordinatorAgent = new Agent({
      id: 'review-coordinator',
      name: 'Review Coordinator',
      behavior: `You are a senior engineering manager synthesizing code review findings from multiple specialized reviewers.

Your role:
1. Prioritize issues by business impact
2. Identify patterns across different review types
3. Provide actionable recommendations
4. Summarize in concise, clear language

Focus on:
- What matters most for production
- Quick wins vs long-term improvements
- Risk vs effort tradeoff`,
      model: Model.Anthropic('claude-4-sonnet', {
        temperature: 0.6,
      }),
    });
  }

  /**
   * Run comprehensive review with all specialized agents in parallel
   */
  async review(diff: string, codebaseContext?: string): Promise<ComprehensiveReview> {
    console.log('🔍 Running multi-agent review...');

    // Run all agents in parallel for speed
    const [securityIssues, perfIssues, qualityIssues] = await Promise.all([
      this.runWithFallback('Security', () => this.securityAgent.review(diff, codebaseContext)),
      this.runWithFallback('Performance', () => this.performanceAgent.review(diff, codebaseContext)),
      this.runWithFallback('Quality', () => this.qualityAgent.review(diff, codebaseContext)),
    ]);

    console.log(`  ✓ Security: ${securityIssues.length} issues`);
    console.log(`  ✓ Performance: ${perfIssues.length} issues`);
    console.log(`  ✓ Quality: ${qualityIssues.length} issues`);

    // Calculate summary statistics
    const summary = this.calculateSummary(securityIssues, perfIssues, qualityIssues);

    // Get top priority issues
    const topIssues = this.getTopIssues(securityIssues, perfIssues, qualityIssues);

    // Synthesize findings with coordinator agent
    console.log('🤔 Synthesizing findings...');
    const { synthesis, recommendations } = await this.synthesize(
      securityIssues,
      perfIssues,
      qualityIssues,
      topIssues
    );

    return {
      summary,
      security: securityIssues,
      performance: perfIssues,
      quality: qualityIssues,
      synthesis,
      recommendations,
      topIssues,
    };
  }

  private async runWithFallback<T>(name: string, fn: () => Promise<T[]>): Promise<T[]> {
    try {
      return await fn();
    } catch (error) {
      console.error(`${name} agent failed:`, error);
      return [];
    }
  }

  private calculateSummary(
    security: SecurityIssue[],
    performance: PerformanceIssue[],
    quality: QualityIssue[]
  ) {
    const allIssues = [...security, ...performance, ...quality];

    const criticalCount = security.filter(i => i.severity === 'critical').length;
    const highCount = allIssues.filter(i => i.severity === 'high').length;
    const mediumCount = allIssues.filter(i => i.severity === 'medium').length;
    const lowCount = allIssues.filter(i => i.severity === 'low').length;

    const categories = Array.from(new Set(allIssues.map(i => i.category)));

    return {
      totalIssues: allIssues.length,
      criticalCount,
      highCount,
      mediumCount,
      lowCount,
      categories,
    };
  }

  private getTopIssues(
    security: SecurityIssue[],
    performance: PerformanceIssue[],
    quality: QualityIssue[]
  ) {
    const severityScore = {
      critical: 4,
      high: 3,
      medium: 2,
      low: 1,
    };

    const allIssues = [
      ...security.map(i => ({ ...i, agent: 'security' as const })),
      ...performance.map(i => ({ ...i, agent: 'performance' as const })),
      ...quality.map(i => ({ ...i, agent: 'quality' as const })),
    ];

    // Sort by severity, take top 5
    return allIssues
      .sort((a, b) => (severityScore[b.severity] || 0) - (severityScore[a.severity] || 0))
      .slice(0, 5)
      .map(issue => ({
        severity: issue.severity,
        category: issue.category,
        title: issue.title,
        agent: issue.agent,
      }));
  }

  private async synthesize(
    security: SecurityIssue[],
    performance: PerformanceIssue[],
    quality: QualityIssue[],
    topIssues: any[]
  ): Promise<{ synthesis: string; recommendations: string[] }> {
    const prompt = `Synthesize these code review findings into a concise summary.

SECURITY ISSUES (${security.length}):
${this.formatIssuesForPrompt(security)}

PERFORMANCE ISSUES (${performance.length}):
${this.formatIssuesForPrompt(performance)}

QUALITY ISSUES (${quality.length}):
${this.formatIssuesForPrompt(quality)}

TOP 5 PRIORITY ISSUES:
${topIssues.map((i, idx) => `${idx + 1}. [${i.severity.toUpperCase()}] ${i.title} (${i.agent})`).join('\n')}

Provide:
1. A 2-3 sentence executive summary
2. Top 3-5 actionable recommendations (ordered by priority)

Be concise and actionable. Focus on what developers should do.`;

    try {
      const response = await this.coordinatorAgent.prompt(prompt);

      // Parse response
      const summaryMatch = response.match(/summary:?\s*(.+?)(?=recommendations:|$)/is);
      const recommendationsMatch = response.match(/recommendations?:?\s*([\s\S]+)/i);

      const synthesis = summaryMatch?.[1]?.trim() || response.trim();

      const recommendations = recommendationsMatch?.[1]
        ? recommendationsMatch[1]
            .split('\n')
            .filter(line => line.trim() && (line.match(/^\d+\./) || line.match(/^-/)))
            .map(line => line.replace(/^\d+\.\s*|\-\s*/g, '').trim())
            .filter(Boolean)
        : [];

      return { synthesis, recommendations };
    } catch (error) {
      console.error('Synthesis failed:', error);
      return {
        synthesis: `Found ${security.length + performance.length + quality.length} issues across security, performance, and quality.`,
        recommendations: topIssues.map(i => `Address ${i.severity} ${i.category.toLowerCase()} issue`),
      };
    }
  }

  private formatIssuesForPrompt(issues: any[]): string {
    if (issues.length === 0) return 'None found';

    return issues
      .slice(0, 5)
      .map(i => `- [${i.severity.toUpperCase()}] ${i.title} at ${i.location}`)
      .join('\n');
  }
}
