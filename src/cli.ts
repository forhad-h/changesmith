
/**
 * ChangeSmith CLI - Main entry point
 * Professional change message generator and code reviewer
 */

import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { messageCommand } from './commands/message';
import { reviewCommand } from './commands/review';

const program = new Command();

program
  .name('cs')
  .description('Professional change message generator and code reviewer')
  .version('2.0.0');

// Message command
program
  .command('message')
  .alias('msg')
  .description('Generate commit message with AI learning and context')
  .option('--max-len <number>', 'Maximum message length', '72')
  .option('--style <type>', 'Message style: plain or conventional', 'conventional')
  .option('--scope <value>', 'Scope handling: auto, none, or custom value', 'auto')
  .option('--custom-scope <string>', 'Custom scope value')
  .option('--adapter <type>', 'Input adapter: git or file', 'git')
  .option('--input <path>', 'Input file path (required for file adapter)')
  .option('--print-prompt', 'Print the prompt sent to LLM (debug)', false)
  .option('--no-learning', 'Disable AI learning from memory')
  .option('--no-streaming', 'Disable streaming output')
  .action(async (options) => {
    const spinner = ora('Generating commit message...').start();

    try {
      // Parse options
      const maxLen = parseInt(options.maxLen, 10);
      const style = options.style as 'plain' | 'conventional';
      const adapter = options.adapter as 'git' | 'file';

      // Validate options
      if (isNaN(maxLen) || maxLen < 10 || maxLen > 200) {
        spinner.fail(chalk.red('Invalid --max-len: must be between 10 and 200'));
        process.exit(1);
      }

      if (!['plain', 'conventional'].includes(style)) {
        spinner.fail(chalk.red('Invalid --style: must be "plain" or "conventional"'));
        process.exit(1);
      }

      if (!['git', 'file'].includes(adapter)) {
        spinner.fail(chalk.red('Invalid --adapter: must be "git" or "file"'));
        process.exit(1);
      }

      if (adapter === 'file' && !options.input) {
        spinner.fail(chalk.red('File adapter requires --input option'));
        process.exit(1);
      }

      // Stop spinner before streaming output
      spinner.stop();

      // Execute command
      const result = await messageCommand({
        maxLen,
        style,
        scope: options.customScope || options.scope,
        customScope: options.customScope,
        adapter,
        input: options.input,
        printPrompt: options.printPrompt,
        enableLearning: options.learning,
        enableStreaming: options.streaming,
      });

      // Handle errors
      if (result.error) {
        console.error(chalk.red(`Error: ${result.error}`));
        process.exit(1);
      }

      // Show warnings if any
      if (result.warnings.length > 0) {
        result.warnings.forEach((warning) => {
          console.log(chalk.yellow(`⚠  ${warning}`));
        });
        console.log();
      }

      // Show metadata if available
      if (result.metadata?.usage) {
        console.log(
          chalk.dim(
            `\n[Tokens: ${result.metadata.usage.inputTokens} in, ${result.metadata.usage.outputTokens} out]`
          )
        );
      }

      // Output message
      console.log(chalk.green('\n✨ Generated commit message:\n'));
      console.log(chalk.bold(result.message));

      // Suggest learning if enabled
      if (options.learning !== false) {
        console.log(
          chalk.dim(
            '\nTip: Use "cs learn accept" after committing to improve future suggestions'
          )
        );
      }
    } catch (error) {
      console.error(chalk.red(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`));
      process.exit(1);
    }
  });

// Review command
program
  .command('review')
  .alias('rv')
  .description('Multi-agent code review with regression detection')
  .option('--format <type>', 'Output format: text, md, or json', 'md')
  .option('--strict', 'Enable strict mode (extra security and edge-case checks)', false)
  .option('--patch', 'Include suggested patch hunks', false)
  .option('--adapter <type>', 'Input adapter: git or file', 'git')
  .option('--input <path>', 'Input file path (required for file adapter)')
  .option('--print-prompt', 'Print the prompt sent to LLM (debug)', false)
  .option('--no-multi-agent', 'Disable multi-agent review (use single agent)')
  .option('--no-regressions', 'Skip regression detection')
  .option('--no-vector-db', 'Skip vector DB context search')
  .action(async (options) => {
    const spinner = ora('Reviewing changes...').start();

    try {
      // Parse options
      const format = options.format as 'text' | 'md' | 'json';
      const adapter = options.adapter as 'git' | 'file';

      // Validate options
      if (!['text', 'md', 'json'].includes(format)) {
        spinner.fail(chalk.red('Invalid --format: must be "text", "md", or "json"'));
        process.exit(1);
      }

      if (!['git', 'file'].includes(adapter)) {
        spinner.fail(chalk.red('Invalid --adapter: must be "git" or "file"'));
        process.exit(1);
      }

      if (adapter === 'file' && !options.input) {
        spinner.fail(chalk.red('File adapter requires --input option'));
        process.exit(1);
      }

      // Stop spinner before review output
      spinner.stop();

      // Execute command
      const result = await reviewCommand({
        format,
        strict: options.strict,
        patch: options.patch,
        adapter,
        input: options.input,
        printPrompt: options.printPrompt,
        useMultiAgent: options.multiAgent,
        checkRegressions: options.regressions,
        useVectorDB: options.vectorDb,
      });

      // Handle errors
      if (result.error) {
        console.error(chalk.red(`Error: ${result.error}`));
        process.exit(1);
      }

      // Show warnings if any
      if (result.warnings.length > 0) {
        result.warnings.forEach((warning) => {
          console.log(chalk.yellow(`⚠  ${warning}`));
        });
        console.log();
      }

      // Output the review
      console.log(result.output);
    } catch (error) {
      console.error(chalk.red(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`));
      process.exit(1);
    }
  });

// Learning commands
const learnCmd = program
  .command('learn')
  .description('Manage AI learning and memory');

learnCmd
  .command('accept')
  .argument('[message]', 'The commit message that was used')
  .description('Mark last generated message as good (helps AI learn)')
  .action(async (message) => {
    const { MessageWorkflow } = await import('./sre/index');
    const { execSync } = await import('child_process');

    if (!message) {
      try {
        message = execSync('git log -1 --pretty=%s', { encoding: 'utf-8' }).trim();
      } catch (error) {
        console.error(chalk.red('No message provided and could not retrieve last commit'));
        process.exit(1);
      }
    }

    const workflow = new MessageWorkflow();
    await workflow.learnFromFeedback(message, true);
    console.log(chalk.green('✅ Marked as accepted - AI will learn from this!'));
  });

learnCmd
  .command('reject')
  .argument('[message]', 'The commit message that was rejected')
  .option('--feedback <text>', 'Explain what was wrong')
  .description('Mark last generated message as bad (helps AI learn)')
  .action(async (message, options) => {
    const { MessageWorkflow } = await import('./sre/index');

    if (!message) {
      console.error(chalk.red('Please provide the rejected message'));
      process.exit(1);
    }

    const workflow = new MessageWorkflow();
    await workflow.learnFromFeedback(message, false, options.feedback);
    console.log(chalk.yellow('✅ Marked as rejected - AI will avoid similar patterns'));
  });

learnCmd
  .command('stats')
  .description('Show learning statistics and preferences')
  .action(async () => {
    const { MessageWorkflow } = await import('./sre/index');

    const workflow = new MessageWorkflow();
    const stats = workflow.getMemoryStats();
    const prefs = workflow.getPreferences();

    console.log(chalk.bold('\n📊 Learning Statistics\n'));
    console.log(`Total commits learned: ${chalk.cyan(stats.totalCommits)}`);
    console.log(`Acceptance rate: ${chalk.cyan(Math.round(stats.acceptanceRate * 100))}%`);
    console.log(`Accepted: ${chalk.green(stats.acceptedCommits)}`);
    console.log(`Rejected: ${chalk.red(stats.rejectedCommits)}`);

    if (stats.mostCommonType) {
      console.log(`\nMost common type: ${chalk.cyan(stats.mostCommonType)}`);
    }
    if (stats.mostCommonScope) {
      console.log(`Most common scope: ${chalk.cyan(stats.mostCommonScope)}`);
    }

    console.log(`\nPreferred style: ${chalk.cyan(prefs.preferredStyle)}`);
    console.log(`Average length: ${chalk.cyan(prefs.avgLength)} characters`);

    if (prefs.preferredTypes.length > 0) {
      console.log(`Preferred types: ${chalk.cyan(prefs.preferredTypes.join(', '))}`);
    }
    if (prefs.preferredScopes.length > 0) {
      console.log(`Preferred scopes: ${chalk.cyan(prefs.preferredScopes.join(', '))}`);
    }
  });

learnCmd
  .command('reset')
  .description('Reset all learned patterns (start fresh)')
  .action(async () => {
    const { MessageWorkflow } = await import('./sre/index');
    const readline = await import('readline');

    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    rl.question(
      chalk.yellow('Are you sure you want to reset all learning? (yes/no): '),
      (answer) => {
        if (answer.toLowerCase() === 'yes') {
          const workflow = new MessageWorkflow();
          workflow.resetMemory();
          console.log(chalk.green('✅ Memory reset successfully'));
        } else {
          console.log(chalk.dim('Cancelled'));
        }
        rl.close();
      }
    );
  });

// Vector DB commands
const vectorCmd = program
  .command('vector')
  .description('Manage codebase vector database');

vectorCmd
  .command('index')
  .argument('[path]', 'Root directory to index', process.cwd())
  .description('Index codebase into vector database (one-time setup)')
  .action(async (path) => {
    const { ReviewWorkflow } = await import('./sre/index');

    console.log(chalk.bold('🔍 Indexing codebase into vector database...\n'));

    const workflow = new ReviewWorkflow();
    const result = await workflow.indexCodebase(path);

    console.log(chalk.green('\n✅ Indexing complete!'));
    console.log(`Files indexed: ${chalk.cyan(result.filesIndexed)}`);
    console.log(`Chunks created: ${chalk.cyan(result.chunks)}`);
  });

vectorCmd
  .command('status')
  .description('Show vector database status')
  .action(() => {
    console.log(
      chalk.dim(
        'Vector DB uses in-memory storage (RAMVec). Run "cs vector index" before each session.'
      )
    );
  });

// Config command
program
  .command('config')
  .description('Show current configuration')
  .action(() => {
    console.log(chalk.bold('\n⚙️  ChangeSmith Configuration\n'));
    console.log(`Version: ${chalk.cyan('2.0.0')}`);
    console.log(`Features:`);
    console.log(`  ${chalk.green('✓')} Streaming output with real-time feedback`);
    console.log(`  ${chalk.green('✓')} Multi-agent review (Security, Performance, Quality)`);
    console.log(`  ${chalk.green('✓')} Vector DB for codebase context`);
    console.log(`  ${chalk.green('✓')} Regression detection`);
    console.log(`  ${chalk.green('✓')} Learning from feedback`);
    console.log(`  ${chalk.green('✓')} Git context awareness (6 skills)`);
    console.log(`\nSRE Utilization: ${chalk.cyan('~95%')}`);
  });

// Parse arguments
program.parse(process.argv);

// Show help if no command provided
if (!process.argv.slice(2).length) {
  console.log(chalk.bold.cyan('\n✨ ChangeSmith - AI-Powered Code Assistant\n'));
  console.log(chalk.dim('Enhanced with SmythOS SRE multi-agent capabilities\n'));
  program.outputHelp();
  console.log(chalk.dim('\nExamples:'));
  console.log(chalk.dim('  cs message              # Generate commit message'));
  console.log(chalk.dim('  cs review               # Comprehensive code review'));
  console.log(chalk.dim('  cs learn accept         # Mark last commit as good'));
  console.log(chalk.dim('  cs learn stats          # View learning statistics'));
  console.log(chalk.dim('  cs vector index         # Index codebase for context\n'));
}
