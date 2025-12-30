import { Agent, VectorDB, Model, Doc } from '@smythos/sdk';
import { execSync } from 'child_process';
import { readFileSync, existsSync } from 'fs';
import path from 'path';
import { glob } from 'glob';

/**
 * Codebase Vector DB - Stores codebase in vector database for context-aware reviews
 * This enables regression detection and change impact analysis
 */

export class CodebaseVectorDB {
  private vectorDB: any;
  private agent: Agent;
  private namespace: string = 'codebase';

  constructor(agent: Agent) {
    this.agent = agent;

    // Use RAMVec for fast, zero-config vector storage
    // For production, switch to Pinecone or Milvus
    this.vectorDB = VectorDB.RAMVec(this.namespace, {
      embeddings: {
        model: Model.Anthropic('claude-4-sonnet'), // Use same model for consistency
        dimensions: 1024,
        chunkSize: 1000,
        chunkOverlap: 100,
      },
    });
  }

  /**
   * Index the entire codebase into vector database
   */
  async indexCodebase(rootDir: string = process.cwd()): Promise<{ filesIndexed: number; chunks: number }> {
    console.log('🔍 Indexing codebase into vector database...');

    // Find all source files
    const patterns = [
      '**/*.ts',
      '**/*.js',
      '**/*.tsx',
      '**/*.jsx',
      '**/*.py',
      '**/*.go',
      '**/*.java',
      '**/*.rs',
    ];

    const excludePatterns = [
      '**/node_modules/**',
      '**/dist/**',
      '**/build/**',
      '**/.git/**',
      '**/coverage/**',
    ];

    let allFiles: string[] = [];
    for (const pattern of patterns) {
      const files = await glob(pattern, {
        cwd: rootDir,
        ignore: excludePatterns,
        absolute: true,
      });
      allFiles = allFiles.concat(files);
    }

    console.log(`📁 Found ${allFiles.length} source files`);

    // Index each file
    let filesIndexed = 0;
    let totalChunks = 0;

    for (const filePath of allFiles) {
      try {
        const content = readFileSync(filePath, 'utf-8');
        const relativePath = path.relative(rootDir, filePath);

        // Parse as text document
        const doc = await Doc.text.parse(content);

        // Add metadata
        const metadata = {
          filePath: relativePath,
          language: this.detectLanguage(filePath),
          lastModified: this.getLastModified(filePath),
          size: content.length,
        };

        // Insert into vector DB
        const result = await this.vectorDB.insertDoc(relativePath, doc, {
          metadata,
          chunkSize: 800,
          chunkOverlap: 100,
          returnFullVectorInfo: false,
        });

        filesIndexed++;
        totalChunks += result?.chunks || 1;

        if (filesIndexed % 10 === 0) {
          console.log(`  Indexed ${filesIndexed}/${allFiles.length} files...`);
        }
      } catch (error) {
        console.error(`  Error indexing ${filePath}:`, error);
      }
    }

    console.log(`✅ Indexed ${filesIndexed} files (${totalChunks} chunks)`);

    return { filesIndexed, chunks: totalChunks };
  }

  /**
   * Search codebase for relevant context given a diff
   */
  async searchRelevantContext(
    diff: string,
    options: { topK?: number } = {}
  ): Promise<string> {
    const topK = options.topK || 5;

    try {
      // Extract file names from diff
      const fileMatches = diff.match(/diff --git a\/(.+?) b\//g);
      const changedFiles = fileMatches
        ? fileMatches.map(m => m.replace('diff --git a/', '').replace(' b/', ''))
        : [];

      // Search for related code
      const searchQueries = [
        ...changedFiles.map(f => `file: ${f}`),
        this.extractKeywords(diff),
      ];

      const results: any[] = [];

      for (const query of searchQueries) {
        const searchResult = await this.vectorDB.search(query, { topK: 3 });
        results.push(...searchResult);
      }

      // Deduplicate and format
      const uniqueResults = this.deduplicateResults(results);

      return this.formatContext(uniqueResults.slice(0, topK));
    } catch (error) {
      console.error('Error searching codebase:', error);
      return '';
    }
  }

  /**
   * Detect potential regression risks by comparing with existing code
   */
  async detectRegressions(diff: string): Promise<{
    risks: Array<{ file: string; reason: string; severity: 'low' | 'medium' | 'high' }>;
    relatedCode: string[];
  }> {
    const context = await this.searchRelevantContext(diff, { topK: 10 });

    const risks: Array<{ file: string; reason: string; severity: 'low' | 'medium' | 'high' }> = [];

    // Use LLM to analyze regression risks
    const llm = this.agent.llm.Anthropic('claude-4-sonnet');

    const analysisPrompt = `Analyze these code changes for potential regression risks.

EXISTING CODEBASE CONTEXT:
${context}

PROPOSED CHANGES:
${diff}

Identify:
1. Breaking changes to existing APIs
2. Changes that might affect dependent code
3. Removed functionality that might be used elsewhere
4. Modified interfaces or contracts

Return JSON array of risks:
[
  {
    "file": "path/to/file",
    "reason": "description of risk",
    "severity": "low|medium|high"
  }
]`;

    try {
      const response = await llm.prompt(analysisPrompt);
      const parsed = JSON.parse(response);
      risks.push(...parsed);
    } catch (error) {
      // LLM response wasn't valid JSON, extract manually
    }

    return {
      risks,
      relatedCode: this.extractRelatedFiles(context),
    };
  }

  private detectLanguage(filePath: string): string {
    const ext = path.extname(filePath).toLowerCase();
    const langMap: Record<string, string> = {
      '.ts': 'typescript',
      '.tsx': 'typescript',
      '.js': 'javascript',
      '.jsx': 'javascript',
      '.py': 'python',
      '.go': 'go',
      '.java': 'java',
      '.rs': 'rust',
    };
    return langMap[ext] || 'unknown';
  }

  private getLastModified(filePath: string): string {
    try {
      const timestamp = execSync(`git log -1 --format=%ai "${filePath}"`, {
        encoding: 'utf-8',
      }).trim();
      return timestamp || 'unknown';
    } catch {
      return 'unknown';
    }
  }

  private extractKeywords(diff: string): string {
    // Extract function names, class names, important keywords
    const keywords: string[] = [];

    // Function/method patterns
    const functionMatches = diff.match(/function\s+(\w+)|const\s+(\w+)\s*=/g);
    if (functionMatches) {
      keywords.push(...functionMatches.map(m => m.replace(/function\s+|const\s+|=/g, '').trim()));
    }

    // Class names
    const classMatches = diff.match(/class\s+(\w+)/g);
    if (classMatches) {
      keywords.push(...classMatches.map(m => m.replace('class ', '')));
    }

    return keywords.slice(0, 5).join(' ');
  }

  private deduplicateResults(results: any[]): any[] {
    const seen = new Set<string>();
    return results.filter(r => {
      const key = r.metadata?.filePath || r.id;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  private formatContext(results: any[]): string {
    return results
      .map(r => {
        const file = r.metadata?.filePath || 'unknown';
        const content = r.content || r.text || '';
        return `File: ${file}\n${content.substring(0, 500)}...`;
      })
      .join('\n\n---\n\n');
  }

  private extractRelatedFiles(context: string): string[] {
    const fileMatches = context.match(/File: (.+)/g);
    return fileMatches ? fileMatches.map(m => m.replace('File: ', '').trim()) : [];
  }

  /**
   * Add skill to agent for codebase search
   */
  addCodebaseSearchSkill() {
    this.agent.addSkill({
      name: 'SearchCodebase',
      description: 'Search the codebase vector database for relevant code context',
      process: async ({ query, topK = 5 }) => {
        const results = await this.vectorDB.search(query, { topK });
        return this.formatContext(results);
      },
    });
  }
}
