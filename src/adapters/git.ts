import { execSync } from 'child_process';
import { BaseAdapter, AdapterOptions } from './adapter';

/**
 * Git adapter - retrieves changes from git staged area
 */
export class GitAdapter extends BaseAdapter {
  name = 'git';

  constructor(options: AdapterOptions = {}) {
    super(options);
  }

  async validate(): Promise<boolean> {
    try {
      execSync('git rev-parse --git-dir', { stdio: 'ignore' });
      return true;
    } catch {
      return false;
    }
  }

  async getChanges(): Promise<string> {
    try {
      // Get staged changes
      const diff = execSync('git diff --cached', {
        encoding: 'utf-8',
        maxBuffer: 10 * 1024 * 1024, // 10MB buffer
      });

      if (!diff.trim()) {
        throw new Error('No staged changes found. Use "git add" to stage changes first.');
      }

      return diff;
    } catch (error) {
      if (error instanceof Error && error.message.includes('No staged changes')) {
        throw error;
      }
      throw new Error(`Failed to get git changes: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get git status for context
   */
  async getStatus(): Promise<string> {
    try {
      return execSync('git status --short', { encoding: 'utf-8' });
    } catch {
      return '';
    }
  }

  /**
   * Get recent commit messages for style reference
   */
  async getRecentCommits(count: number = 5): Promise<string[]> {
    try {
      const log = execSync(`git log -${count} --pretty=format:%s`, {
        encoding: 'utf-8',
      });
      return log.split('\n').filter(Boolean);
    } catch {
      return [];
    }
  }
}
