import { Agent } from '@smythos/sdk';
import { execSync } from 'child_process';

/**
 * Git Skills - Provides git operations as SRE skills
 * These skills allow the agent to intelligently access git history and context
 */

export function addGitSkills(agent: Agent) {
  // Skill: Get recent commit messages
  agent.addSkill({
    name: 'GetRecentCommits',
    description: 'Get recent commit messages to learn the repository commit style and conventions',
    process: async ({ count = 10 }) => {
      try {
        const commits = execSync(`git log -${count} --pretty=format:%s`, {
          encoding: 'utf-8',
          maxBuffer: 1024 * 1024,
        });
        return commits.split('\n').filter(Boolean);
      } catch (error) {
        return [];
      }
    },
  });

  // Skill: Analyze commit patterns
  agent.addSkill({
    name: 'AnalyzeCommitHistory',
    description: 'Analyze commit message patterns in the repository to understand conventions',
    process: async ({ limit = 100 }) => {
      try {
        const commits = execSync(`git log -${limit} --pretty=format:%s`, {
          encoding: 'utf-8',
        }).split('\n').filter(Boolean);

        const types: Record<string, number> = {};
        const scopes: Record<string, number> = {};
        let conventionalCount = 0;

        commits.forEach(commit => {
          // Check for conventional commit format
          const match = commit.match(/^(\w+)(\(([^)]+)\))?:/);
          if (match) {
            conventionalCount++;
            const type = match[1];
            const scope = match[3];

            types[type] = (types[type] || 0) + 1;
            if (scope) {
              scopes[scope] = (scopes[scope] || 0) + 1;
            }
          }
        });

        const mostCommonType = Object.keys(types).sort((a, b) => types[b] - types[a])[0];
        const mostCommonScope = Object.keys(scopes).sort((a, b) => scopes[b] - scopes[a])[0];

        return {
          totalCommits: commits.length,
          conventionalCommits: conventionalCount,
          conventionalPercentage: Math.round((conventionalCount / commits.length) * 100),
          types,
          scopes,
          mostCommonType,
          mostCommonScope,
          usesConventionalCommits: conventionalCount / commits.length > 0.5,
        };
      } catch (error) {
        return null;
      }
    },
  });

  // Skill: Get changed files stats
  agent.addSkill({
    name: 'GetChangedFilesStats',
    description: 'Get statistics about changed files to understand the scope of changes',
    process: async () => {
      try {
        const stats = execSync('git diff --cached --stat', {
          encoding: 'utf-8',
        });

        const files = execSync('git diff --cached --name-only', {
          encoding: 'utf-8',
        }).split('\n').filter(Boolean);

        const languages = new Set<string>();
        files.forEach(file => {
          const ext = file.split('.').pop();
          if (ext) languages.add(ext);
        });

        return {
          filesChanged: files.length,
          files,
          languages: Array.from(languages),
          stats,
        };
      } catch (error) {
        return null;
      }
    },
  });

  // Skill: Detect change type
  agent.addSkill({
    name: 'DetectChangeType',
    description: 'Automatically detect the type of changes (feat, fix, refactor, etc.)',
    process: async () => {
      try {
        const diff = execSync('git diff --cached', {
          encoding: 'utf-8',
          maxBuffer: 10 * 1024 * 1024,
        });

        const lowerDiff = diff.toLowerCase();

        // Detection logic
        if (diff.includes('new file mode')) {
          return { type: 'feat', confidence: 'high', reason: 'New files detected' };
        }

        if (lowerDiff.includes('test') || lowerDiff.includes('spec.')) {
          return { type: 'test', confidence: 'high', reason: 'Test files modified' };
        }

        if (lowerDiff.includes('readme') || lowerDiff.includes('.md')) {
          return { type: 'docs', confidence: 'high', reason: 'Documentation files modified' };
        }

        if (lowerDiff.includes('fix') || lowerDiff.includes('bug')) {
          return { type: 'fix', confidence: 'medium', reason: 'Fix-related keywords found' };
        }

        if (lowerDiff.includes('package.json') || lowerDiff.includes('package-lock.json')) {
          return { type: 'chore', confidence: 'medium', reason: 'Dependency files modified' };
        }

        return { type: 'refactor', confidence: 'low', reason: 'Default for code modifications' };
      } catch (error) {
        return null;
      }
    },
  });

  // Skill: Get file ownership (blame)
  agent.addSkill({
    name: 'GetFileOwnership',
    description: 'Get information about who owns/maintains specific files using git blame',
    process: async ({ file }) => {
      try {
        const blame = execSync(`git blame --line-porcelain "${file}"`, {
          encoding: 'utf-8',
          maxBuffer: 5 * 1024 * 1024,
        });

        // Parse blame output for author stats
        const authors: Record<string, number> = {};
        const lines = blame.split('\n');

        for (const line of lines) {
          if (line.startsWith('author ')) {
            const author = line.substring(7);
            authors[author] = (authors[author] || 0) + 1;
          }
        }

        const totalLines = Object.values(authors).reduce((a, b) => a + b, 0);
        const mainAuthor = Object.keys(authors).sort((a, b) => authors[b] - authors[a])[0];

        return {
          file,
          totalLines,
          authors,
          mainAuthor,
          authorPercentage: Math.round((authors[mainAuthor] / totalLines) * 100),
        };
      } catch (error) {
        return null;
      }
    },
  });

  // Skill: Compare with main branch
  agent.addSkill({
    name: 'CompareWithMainBranch',
    description: 'Compare current changes with the main branch to understand deviation',
    process: async () => {
      try {
        // Try to detect main branch
        let mainBranch = 'main';
        try {
          execSync('git rev-parse --verify main', { stdio: 'ignore' });
        } catch {
          try {
            execSync('git rev-parse --verify master', { stdio: 'ignore' });
            mainBranch = 'master';
          } catch {
            return null;
          }
        }

        const currentBranch = execSync('git rev-parse --abbrev-ref HEAD', {
          encoding: 'utf-8',
        }).trim();

        if (currentBranch === mainBranch) {
          return { onMainBranch: true };
        }

        const filesChanged = execSync(`git diff --name-only ${mainBranch}...HEAD`, {
          encoding: 'utf-8',
        }).split('\n').filter(Boolean);

        const commitCount = execSync(`git rev-list --count ${mainBranch}..HEAD`, {
          encoding: 'utf-8',
        }).trim();

        return {
          onMainBranch: false,
          currentBranch,
          mainBranch,
          filesChanged: filesChanged.length,
          commitCount: parseInt(commitCount, 10),
          files: filesChanged,
        };
      } catch (error) {
        return null;
      }
    },
  });
}

/**
 * Get git context for enriching prompts
 */
export async function getGitContext(): Promise<{
  recentCommits: string[];
  pattern: any;
  changedFiles: any;
}> {
  const recentCommits: string[] = [];
  let pattern: any = null;
  let changedFiles: any = null;

  try {
    // Get recent commits
    const commits = execSync('git log -10 --pretty=format:%s', {
      encoding: 'utf-8',
    });
    recentCommits.push(...commits.split('\n').filter(Boolean));

    // Analyze pattern
    const allCommits = execSync('git log -100 --pretty=format:%s', {
      encoding: 'utf-8',
    }).split('\n').filter(Boolean);

    const types: Record<string, number> = {};
    let conventionalCount = 0;

    allCommits.forEach(commit => {
      const match = commit.match(/^(\w+)(\([^)]+\))?:/);
      if (match) {
        conventionalCount++;
        types[match[1]] = (types[match[1]] || 0) + 1;
      }
    });

    pattern = {
      usesConventionalCommits: conventionalCount / allCommits.length > 0.5,
      mostCommonType: Object.keys(types).sort((a, b) => types[b] - types[a])[0],
    };

    // Get changed files
    const files = execSync('git diff --cached --name-only', {
      encoding: 'utf-8',
    }).split('\n').filter(Boolean);

    changedFiles = {
      count: files.length,
      files,
    };
  } catch (error) {
    // Git not available or not in a repository
  }

  return { recentCommits, pattern, changedFiles };
}
