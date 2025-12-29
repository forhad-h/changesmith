
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
  .version('1.0.0');

// Message command
program
  .command('message')
  .description('Generate a professional commit message from changes')
  .option('--max-len <number>', 'Maximum message length', '72')
  .option('--style <type>', 'Message style: plain or conventional', 'conventional')
  .option('--scope <value>', 'Scope handling: auto, none, or custom value', 'auto')
  .option('--custom-scope <string>', 'Custom scope value')
  .option('--adapter <type>', 'Input adapter: git or file', 'git')
  .option('--input <path>', 'Input file path (required for file adapter)')
  .option('--print-prompt', 'Print the prompt sent to LLM (debug)', false)
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

      // Execute command
      const result = await messageCommand({
        maxLen,
        style,
        scope: options.customScope || options.scope,
        customScope: options.customScope,
        adapter,
        input: options.input,
        printPrompt: options.printPrompt,
      });

      // Handle errors
      if (result.error) {
        spinner.fail(chalk.red(result.error));
        process.exit(1);
      }

      // Show warnings if any
      if (result.warnings.length > 0) {
        spinner.warn(chalk.yellow('Warnings:'));
        result.warnings.forEach((warning) => {
          console.log(chalk.yellow(`  ⚠ ${warning}`));
        });
        console.log();
      }

      // Success - output only the message
      spinner.stop();
      console.log(result.message);
    } catch (error) {
      spinner.fail(chalk.red(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`));
      process.exit(1);
    }
  });

// Review command
program
  .command('review')
  .description('Review changes before creating a PR')
  .option('--format <type>', 'Output format: text, md, or json', 'md')
  .option('--strict', 'Enable strict mode (extra security and edge-case checks)', false)
  .option('--patch', 'Include suggested patch hunks', false)
  .option('--adapter <type>', 'Input adapter: git or file', 'git')
  .option('--input <path>', 'Input file path (required for file adapter)')
  .option('--print-prompt', 'Print the prompt sent to LLM (debug)', false)
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

      // Execute command
      const result = await reviewCommand({
        format,
        strict: options.strict,
        patch: options.patch,
        adapter,
        input: options.input,
        printPrompt: options.printPrompt,
      });

      // Handle errors
      if (result.error) {
        spinner.fail(chalk.red(result.error));
        process.exit(1);
      }

      // Show warnings if any
      if (result.warnings.length > 0) {
        spinner.warn(chalk.yellow('Warnings:'));
        result.warnings.forEach((warning) => {
          console.log(chalk.yellow(`  ⚠ ${warning}`));
        });
        console.log();
      }

      // Success - output the review
      spinner.succeed(chalk.green('Review complete'));
      console.log();
      console.log(result.output);
    } catch (error) {
      spinner.fail(chalk.red(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`));
      process.exit(1);
    }
  });

// Parse arguments
program.parse(process.argv);

// Show help if no command provided
if (!process.argv.slice(2).length) {
  program.outputHelp();
}
