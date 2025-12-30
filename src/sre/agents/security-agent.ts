import { Agent, Model } from '@smythos/sdk';

/**
 * Security Review Agent
 * Specializes in identifying security vulnerabilities and risks
 */

export interface SecurityIssue {
  severity: 'low' | 'medium' | 'high' | 'critical';
  category: string;
  title: string;
  location: string;
  description: string;
  fix: string;
  cwe?: string; // Common Weakness Enumeration ID
}

export class SecurityAgent {
  private agent: Agent;

  constructor() {
    this.agent = new Agent({
      id: 'security-reviewer',
      name: 'Security Review Specialist',
      behavior: `You are a senior security engineer specializing in code security reviews.

FOCUS AREAS:
- SQL injection, XSS, CSRF vulnerabilities
- Authentication and authorization flaws
- Secret exposure (API keys, passwords, tokens)
- Insecure dependencies and imports
- API security issues
- Input validation gaps
- Cryptographic weaknesses
- Path traversal vulnerabilities
- Command injection risks
- Insecure deserialization

SEVERITY LEVELS:
- CRITICAL: Immediate security risk (exposed secrets, SQL injection)
- HIGH: Significant vulnerability (auth bypass, XSS)
- MEDIUM: Potential risk (weak validation, deprecated crypto)
- LOW: Security best practice (missing headers, weak randomness)

OUTPUT FORMAT (JSON):
{
  "issues": [
    {
      "severity": "high",
      "category": "SQL Injection",
      "title": "Unsanitized user input in SQL query",
      "location": "file.ts:42",
      "description": "User input directly concatenated into SQL query",
      "fix": "Use parameterized queries or ORM",
      "cwe": "CWE-89"
    }
  ]
}

Only report REAL security issues. Be conservative but thorough.`,
      model: Model.Anthropic('claude-4-sonnet', {
        temperature: 0.3, // Lower temperature for security = more conservative
      }),
    });
  }

  async review(diff: string, context?: string): Promise<SecurityIssue[]> {
    const prompt = this.buildPrompt(diff, context);

    try {
      const response = await this.agent.prompt(prompt);

      // Try to parse JSON response
      const jsonMatch = response.match(/\{[\s\S]*"issues"[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return parsed.issues || [];
      }

      // Fallback: extract issues manually
      return this.parseTextResponse(response);
    } catch (error) {
      console.error('Security agent error:', error);
      return [];
    }
  }

  private buildPrompt(diff: string, context?: string): string {
    let prompt = `Review this code diff for SECURITY VULNERABILITIES ONLY.

${context ? `CODEBASE CONTEXT:\n${context}\n\n` : ''}

CODE CHANGES:
${diff}

Analyze for:
1. SQL injection, XSS, CSRF
2. Authentication/authorization issues
3. Exposed secrets (API keys, passwords, tokens)
4. Input validation gaps
5. Insecure API calls
6. Cryptographic weaknesses
7. Command injection risks
8. Path traversal vulnerabilities

Return JSON with array of security issues. Each issue must have:
- severity: critical|high|medium|low
- category: vulnerability type
- title: brief description
- location: file:line
- description: what's wrong
- fix: how to fix it
- cwe: CWE ID if applicable

Example:
{
  "issues": [
    {
      "severity": "high",
      "category": "SQL Injection",
      "title": "Unsanitized user input in query",
      "location": "db.ts:42",
      "description": "User input concatenated into SQL query without sanitization",
      "fix": "Use parameterized queries or prepared statements",
      "cwe": "CWE-89"
    }
  ]
}

If no security issues found, return: {"issues": []}`;

    return prompt;
  }

  private parseTextResponse(response: string): SecurityIssue[] {
    // Fallback parser for non-JSON responses
    const issues: SecurityIssue[] = [];

    // Simple pattern matching for severity levels
    const lines = response.split('\n');
    let currentIssue: Partial<SecurityIssue> | null = null;

    for (const line of lines) {
      const trimmed = line.trim();

      if (trimmed.match(/severity.*:(critical|high|medium|low)/i)) {
        if (currentIssue) issues.push(currentIssue as SecurityIssue);
        currentIssue = {
          severity: trimmed.match(/(critical|high|medium|low)/i)?.[1].toLowerCase() as any || 'medium',
        };
      } else if (currentIssue) {
        if (trimmed.match(/category.*:/i)) {
          currentIssue.category = trimmed.split(':')[1]?.trim() || 'Unknown';
        } else if (trimmed.match(/title.*:/i)) {
          currentIssue.title = trimmed.split(':')[1]?.trim() || 'Security issue';
        } else if (trimmed.match(/location.*:/i)) {
          currentIssue.location = trimmed.split(':')[1]?.trim() || 'unknown';
        } else if (trimmed.match(/description.*:/i)) {
          currentIssue.description = trimmed.split(':')[1]?.trim() || '';
        } else if (trimmed.match(/fix.*:/i)) {
          currentIssue.fix = trimmed.split(':')[1]?.trim() || '';
        }
      }
    }

    if (currentIssue) issues.push(currentIssue as SecurityIssue);

    return issues;
  }

  getAgent(): Agent {
    return this.agent;
  }
}
