import { Agent, Model, TLLMEvent, TAgentMode } from '@smythos/sdk';

/**
 * Enhanced SRE Client with full streaming, events, and observability
 */

export interface StreamEvent {
  type: 'content' | 'tool' | 'usage' | 'complete' | 'error' | 'task';
  data: any;
}

export interface SREClientConfig {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  enablePlanner?: boolean;
}

export class EnhancedSREClient {
  private agent: Agent;
  private config: SREClientConfig;

  constructor(config: SREClientConfig = {}) {
    this.config = {
      model: config.model || 'claude-4-sonnet',
      temperature: config.temperature || 0.7,
      maxTokens: config.maxTokens || 4096,
      enablePlanner: config.enablePlanner || false,
    };

    // Initialize enhanced SRE agent with optional planner mode
    this.agent = new Agent({
      id: 'changesmith-enhanced',
      name: 'ChangeSmith Enhanced Assistant',
      behavior: `You are a professional software development assistant specializing in commit messages and code reviews.

You have access to:
- Git history analysis
- Codebase context from vector database
- Previous commit patterns
- Security best practices

Always provide:
- Accurate, concise information
- Structured output
- Actionable recommendations`,
      model: Model.Anthropic(this.config.model, {
        temperature: this.config.temperature,
        maxTokens: this.config.maxTokens,
      }),
      mode: this.config.enablePlanner ? TAgentMode.PLANNER : undefined,
    });

    // Setup event listeners for planner mode
    if (this.config.enablePlanner) {
      this.setupPlannerEvents();
    }
  }

  private setupPlannerEvents() {
    this.agent.on('TasksAdded', (tasksList, tasks) => {
      // Emit task events for CLI to display
      this.emit('tasks_added', tasks);
    });

    this.agent.on('TasksUpdated', (taskId, status, tasks) => {
      this.emit('tasks_updated', { taskId, status, tasks });
    });

    this.agent.on('TasksCompleted', (taskId) => {
      this.emit('tasks_completed', taskId);
    });

    this.agent.on('StatusUpdated', (status) => {
      this.emit('status_updated', status);
    });
  }

  private eventHandlers: Map<string, Function[]> = new Map();

  on(event: string, handler: Function) {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, []);
    }
    this.eventHandlers.get(event)!.push(handler);
  }

  private emit(event: string, data: any) {
    const handlers = this.eventHandlers.get(event) || [];
    handlers.forEach(handler => handler(data));
  }

  /**
   * Stream commit message generation with real-time events
   */
  async *generateCommitMessageStream(
    diff: string,
    options: {
      maxLen: number;
      style: 'plain' | 'conventional';
      scope?: string;
      recentCommits?: string[];
      goodExamples?: string[];
    }
  ): AsyncGenerator<StreamEvent> {
    const prompt = this.buildMessagePrompt(diff, options);

    const stream = await this.agent.prompt(prompt).stream();

    let content = '';
    let metadata: any = {};

    yield { type: 'content', data: '' }; // Signal start

    stream.on(TLLMEvent.Content, (chunk: string) => {
      content += chunk;
      this.emit('stream_content', chunk);
    });

    stream.on(TLLMEvent.ToolCall, (toolCall: any) => {
      metadata.toolsUsed = metadata.toolsUsed || [];
      metadata.toolsUsed.push(toolCall?.tool?.name);
      this.emit('stream_tool', toolCall);
    });

    stream.on(TLLMEvent.Usage, (usage: any) => {
      metadata.usage = usage;
      this.emit('stream_usage', usage);
    });

    stream.on(TLLMEvent.Error, (error: any) => {
      this.emit('stream_error', error);
    });

    // Wait for stream to complete
    await new Promise<void>((resolve, reject) => {
      stream.on(TLLMEvent.End, () => resolve());
      stream.on(TLLMEvent.Error, (error: any) => reject(error));
    });

    yield {
      type: 'complete',
      data: {
        content: this.extractMessage(content),
        metadata,
      },
    };
  }

  /**
   * Stream code review with real-time events
   */
  async *reviewChangesStream(
    diff: string,
    options: {
      strict: boolean;
      patch: boolean;
      codebaseContext?: string;
    }
  ): AsyncGenerator<StreamEvent> {
    const prompt = this.buildReviewPrompt(diff, options);

    const stream = await this.agent.prompt(prompt).stream();

    let content = '';
    const metadata: any = { toolsUsed: [] };

    stream.on(TLLMEvent.Content, (chunk: string) => {
      content += chunk;
      this.emit('stream_content', chunk);
    });

    stream.on(TLLMEvent.ToolCall, (toolCall: any) => {
      if (!toolCall?.tool?.name.startsWith('_sre_')) {
        metadata.toolsUsed.push(toolCall?.tool?.name);
        this.emit('stream_tool', toolCall);
      }
    });

    stream.on(TLLMEvent.Usage, (usage: any) => {
      metadata.usage = usage;
      this.emit('stream_usage', usage);
    });

    // Wait for completion
    await new Promise<void>((resolve, reject) => {
      stream.on(TLLMEvent.End, () => resolve());
      stream.on(TLLMEvent.Error, (error: any) => reject(error));
    });

    yield {
      type: 'complete',
      data: {
        content,
        metadata,
      },
    };
  }

  /**
   * Get agent instance for skills/components
   */
  getAgent(): Agent {
    return this.agent;
  }

  /**
   * Build commit message prompt with optional context
   */
  private buildMessagePrompt(
    diff: string,
    options: {
      maxLen: number;
      style: 'plain' | 'conventional';
      scope?: string;
      recentCommits?: string[];
      goodExamples?: string[];
    }
  ): string {
    const { maxLen, style, scope, recentCommits, goodExamples } = options;

    let prompt = '';

    if (style === 'conventional') {
      prompt = `You are a commit message generator. Generate a SINGLE LINE conventional commit message.

REQUIREMENTS:
- Format: type(scope): subject
- Allowed types: feat, fix, refactor, docs, test, chore, perf, build, ci, revert
- Use imperative mood (e.g., "add" not "adds" or "added")
- No trailing period
- Maximum ${maxLen} characters
- Lowercase subject start
${scope ? `- Scope: ${scope}` : '- Auto-detect scope from changes'}
`;
    } else {
      prompt = `You are a commit message generator. Generate a SINGLE LINE commit message.

REQUIREMENTS:
- Maximum ${maxLen} characters
- Concise and professional
- Imperative mood
- No trailing period
`;
    }

    // Add recent commits for style matching
    if (recentCommits && recentCommits.length > 0) {
      prompt += `\nRECENT COMMITS (match this style):
${recentCommits.map((c, i) => `${i + 1}. ${c}`).join('\n')}
`;
    }

    // Add good examples from memory
    if (goodExamples && goodExamples.length > 0) {
      prompt += `\nYOUR PREVIOUS GOOD MESSAGES:
${goodExamples.map((ex, i) => `${i + 1}. ${ex}`).join('\n')}
`;
    }

    prompt += `\nCHANGES:
${diff}

OUTPUT ONLY THE COMMIT MESSAGE (one line, no explanation, no quotes):`;

    return prompt;
  }

  /**
   * Build code review prompt
   */
  private buildReviewPrompt(
    diff: string,
    options: {
      strict: boolean;
      patch: boolean;
      codebaseContext?: string;
    }
  ): string {
    let prompt = `You are a senior software engineer reviewing code changes. Analyze the following diff and provide a structured review.

${options.strict ? 'STRICT MODE: Pay extra attention to security vulnerabilities, edge cases, and production readiness.\n' : ''}
`;

    if (options.codebaseContext) {
      prompt += `\nCODEBASE CONTEXT (from vector database):
${options.codebaseContext}

Use this context to:
- Detect breaking changes with existing code
- Identify regression risks
- Suggest consistency with existing patterns
`;
    }

    prompt += `\nCHANGES:
${diff}

PROVIDE A STRUCTURED REVIEW IN THIS FORMAT:

## Summary
[Max 3 bullet points summarizing the changes]

## Issues
[Max 5 issues, each with:]
- Severity: low|medium|high
- Title: Brief issue description
- Why: Why this matters
- Where: File/function/line if applicable
- Fix: Suggested fix

## What to Test
[Max 5 bullet points of testing recommendations]

## PR Checklist
[Max 6 items for PR review]

${options.patch ? '\nIf you suggest code changes, include patch hunks in diff format.' : ''}

Keep the review concise (≈120 lines max). Focus on real issues, not nitpicks. Do not hallucinate files or issues.`;

    return prompt;
  }

  /**
   * Extract clean message from response
   */
  private extractMessage(response: string): string {
    let message = response.trim();

    // Remove quotes
    message = message.replace(/^["']|["']$/g, '');

    // Take only the first line
    const lines = message.split('\n');
    message = lines[0].trim();

    // Remove explanation prefixes
    message = message.replace(/^(Here's?|Here is) (the|a) (commit )?message:?\s*/i, '');

    return message;
  }
}
