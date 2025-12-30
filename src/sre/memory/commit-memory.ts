import { Agent } from '@smythos/sdk';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import path from 'path';

/**
 * Commit Memory System
 * Learns from user feedback and improves over time
 */

export interface CommitPattern {
  message: string;
  timestamp: number;
  feedback?: string;
  accepted: boolean;
  style: 'plain' | 'conventional';
  type?: string;
  scope?: string;
}

export interface MemoryStats {
  totalCommits: number;
  acceptedCommits: number;
  rejectedCommits: number;
  acceptanceRate: number;
  mostCommonType?: string;
  mostCommonScope?: string;
}

export class CommitMemorySystem {
  private agent: Agent;
  private memoryDir: string;
  private patternsFile: string;

  constructor(agent: Agent, memoryDir: string = '.changesmith/memory') {
    this.agent = agent;
    this.memoryDir = memoryDir;
    this.patternsFile = path.join(memoryDir, 'commit-patterns.json');

    // Ensure memory directory exists
    if (!existsSync(memoryDir)) {
      mkdirSync(memoryDir, { recursive: true });
    }
  }

  /**
   * Learn from a commit message (user feedback loop)
   */
  async learnFromCommit(
    message: string,
    accepted: boolean,
    options: {
      style?: 'plain' | 'conventional';
      feedback?: string;
      type?: string;
      scope?: string;
    } = {}
  ): Promise<void> {
    const patterns = this.loadPatterns();

    const pattern: CommitPattern = {
      message,
      timestamp: Date.now(),
      accepted,
      style: options.style || 'conventional',
      feedback: options.feedback,
      type: options.type,
      scope: options.scope,
    };

    patterns.push(pattern);

    // Keep last 200 patterns
    const trimmed = patterns.slice(-200);

    this.savePatterns(trimmed);

    // Also store using SRE storage for agent-level persistence
    try {
      const storage = this.agent.storage.LocalStorage();
      await storage.write(
        'commit-patterns.json',
        JSON.stringify(trimmed, null, 2)
      );
    } catch (error) {
      console.error('Failed to persist to SRE storage:', error);
    }
  }

  /**
   * Get examples of good commit messages
   */
  getGoodExamples(count: number = 5, style?: 'plain' | 'conventional'): string[] {
    const patterns = this.loadPatterns();

    const goodPatterns = patterns
      .filter(p => p.accepted && (!style || p.style === style))
      .reverse() // Most recent first
      .slice(0, count);

    return goodPatterns.map(p => p.message);
  }

  /**
   * Get examples of rejected messages (to learn what NOT to do)
   */
  getRejectedExamples(count: number = 5): Array<{ message: string; feedback?: string }> {
    const patterns = this.loadPatterns();

    return patterns
      .filter(p => !p.accepted)
      .reverse()
      .slice(0, count)
      .map(p => ({
        message: p.message,
        feedback: p.feedback,
      }));
  }

  /**
   * Get memory statistics
   */
  getStats(): MemoryStats {
    const patterns = this.loadPatterns();

    const accepted = patterns.filter(p => p.accepted);
    const rejected = patterns.filter(p => !p.accepted);

    // Find most common type and scope
    const types: Record<string, number> = {};
    const scopes: Record<string, number> = {};

    accepted.forEach(p => {
      if (p.type) types[p.type] = (types[p.type] || 0) + 1;
      if (p.scope) scopes[p.scope] = (scopes[p.scope] || 0) + 1;
    });

    const mostCommonType = Object.keys(types).sort((a, b) => types[b] - types[a])[0];
    const mostCommonScope = Object.keys(scopes).sort((a, b) => scopes[b] - scopes[a])[0];

    return {
      totalCommits: patterns.length,
      acceptedCommits: accepted.length,
      rejectedCommits: rejected.length,
      acceptanceRate: patterns.length > 0 ? accepted.length / patterns.length : 0,
      mostCommonType,
      mostCommonScope,
    };
  }

  /**
   * Enrich prompt with learned examples
   */
  enrichPromptWithExamples(basePrompt: string, style?: 'plain' | 'conventional'): string {
    const goodExamples = this.getGoodExamples(5, style);

    if (goodExamples.length === 0) {
      return basePrompt;
    }

    const examplesSection = `\nYOUR PREVIOUS GOOD MESSAGES (match this style):
${goodExamples.map((ex, i) => `${i + 1}. ${ex}`).join('\n')}
`;

    // Insert before the "CHANGES:" section
    const parts = basePrompt.split('CHANGES:');
    if (parts.length === 2) {
      return parts[0] + examplesSection + '\nCHANGES:' + parts[1];
    }

    return basePrompt + examplesSection;
  }

  /**
   * Get personalized preferences
   */
  getPreferences(): {
    preferredStyle: 'plain' | 'conventional';
    preferredTypes: string[];
    preferredScopes: string[];
    avgLength: number;
  } {
    const patterns = this.loadPatterns();
    const accepted = patterns.filter(p => p.accepted);

    if (accepted.length === 0) {
      return {
        preferredStyle: 'conventional',
        preferredTypes: [],
        preferredScopes: [],
        avgLength: 72,
      };
    }

    // Determine preferred style
    const styleCount = {
      plain: accepted.filter(p => p.style === 'plain').length,
      conventional: accepted.filter(p => p.style === 'conventional').length,
    };
    const preferredStyle = styleCount.conventional >= styleCount.plain ? 'conventional' : 'plain';

    // Get preferred types and scopes
    const types: Record<string, number> = {};
    const scopes: Record<string, number> = {};

    accepted.forEach(p => {
      if (p.type) types[p.type] = (types[p.type] || 0) + 1;
      if (p.scope) scopes[p.scope] = (scopes[p.scope] || 0) + 1;
    });

    const preferredTypes = Object.keys(types).sort((a, b) => types[b] - types[a]).slice(0, 3);
    const preferredScopes = Object.keys(scopes).sort((a, b) => scopes[b] - scopes[a]).slice(0, 3);

    // Calculate average length
    const avgLength = Math.round(
      accepted.reduce((sum, p) => sum + p.message.length, 0) / accepted.length
    );

    return {
      preferredStyle,
      preferredTypes,
      preferredScopes,
      avgLength,
    };
  }

  /**
   * Reset memory (clear all learned patterns)
   */
  reset(): void {
    this.savePatterns([]);
  }

  private loadPatterns(): CommitPattern[] {
    if (!existsSync(this.patternsFile)) {
      return [];
    }

    try {
      const data = readFileSync(this.patternsFile, 'utf-8');
      return JSON.parse(data);
    } catch (error) {
      console.error('Failed to load commit patterns:', error);
      return [];
    }
  }

  private savePatterns(patterns: CommitPattern[]): void {
    try {
      writeFileSync(this.patternsFile, JSON.stringify(patterns, null, 2));
    } catch (error) {
      console.error('Failed to save commit patterns:', error);
    }
  }
}
