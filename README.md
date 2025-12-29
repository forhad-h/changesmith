# ChangeSmith

**Production-quality, provider-agnostic CLI tool for generating professional change messages and reviewing code before creating PRs.**

ChangeSmith (`cs`) helps developers write better commit messages and review code changes using AI-powered workflows built on the [SmythOS SRE](https://github.com/SmythOS/sre) runtime.

## Features

- **Smart Commit Messages**: Generate concise, professional commit messages in plain or conventional format
- **Code Review**: Get structured reviews with issues, testing recommendations, and PR checklists
- **Provider Agnostic**: Abstracted LLM layer using SmythOS SRE (Claude/Anthropic by default)
- **Input Flexible**: Works with git or direct file input
- **Security First**: Automatic secret redaction and diff size limits
- **Deterministic**: Consistent output with length enforcement and retry logic

## Installation

```bash
npm install
```

Or use directly with node:

```bash
npm run build
node dist/cli.js message
```

## Quick Start

### Generate a commit message

```bash
# Stage your changes
git add .

# Generate conventional commit message
node dist/cli.js message

# Plain style with custom length
node dist/cli.js message --style plain --max-len 50
```

### Review changes

```bash
# Review staged changes
node dist/cli.js review

# Strict mode with markdown output
node dist/cli.js review --strict --format md

# Include patch suggestions
node dist/cli.js review --patch
```

## Commands

### `cs message`

Generate a professional commit message from changes.

**Options:**

| Option | Description | Default |
|--------|-------------|---------|
| `--max-len <number>` | Maximum message length (10-200) | `72` |
| `--style <type>` | Message style: `plain` or `conventional` | `conventional` |
| `--scope <value>` | Scope: `auto`, `none`, or custom value | `auto` |
| `--custom-scope <string>` | Explicitly set custom scope | - |
| `--adapter <type>` | Input adapter: `git` or `file` | `git` |
| `--input <path>` | File path (required for `file` adapter) | - |
| `--print-prompt` | Print LLM prompt for debugging | `false` |

**Examples:**

```bash
# Conventional commit with auto-detected scope
node dist/cli.js message

# Custom scope
node dist/cli.js message --scope auth

# Plain style, short message
node dist/cli.js message --style plain --max-len 50

# Generate from diff file
node dist/cli.js message --adapter file --input changes.diff
```

**Conventional Commit Format:**

```
type(scope): subject

Types: feat, fix, refactor, docs, test, chore, perf, build, ci, revert
```

### `cs review`

Review changes before creating a PR.

**Options:**

| Option | Description | Default |
|--------|-------------|---------|
| `--format <type>` | Output format: `text`, `md`, or `json` | `md` |
| `--strict` | Enable strict security/edge-case checks | `false` |
| `--patch` | Include suggested patch hunks | `false` |
| `--adapter <type>` | Input adapter: `git` or `file` | `git` |
| `--input <path>` | File path (required for `file` adapter) | - |
| `--print-prompt` | Print LLM prompt for debugging | `false` |

**Examples:**

```bash
# Standard review
node dist/cli.js review

# Strict mode with security focus
node dist/cli.js review --strict

# JSON output for automation
node dist/cli.js review --format json

# Review specific diff file
node dist/cli.js review --adapter file --input changes.diff
```

## Configuration

### API Keys

ChangeSmith uses SmythOS SRE for LLM workflows. Configure your Anthropic API key in one of these locations:

**Option 1: Vault file (recommended)**

Create `.smyth/.sre/vault.json` in your project or `~/.smyth/.sre/vault.json` globally:

```json
{
  "default": {
    "anthropic": "sk-ant-your-api-key-here"
  }
}
```

**Option 2: Environment variable**

```bash
export ANTHROPIC_API_KEY=sk-ant-your-api-key-here
```

Then reference in vault:

```json
{
  "default": {
    "anthropic": "$env(ANTHROPIC_API_KEY)"
  }
}
```

### Supported Models

ChangeSmith uses Claude models via Anthropic by default:

- `claude-4-sonnet` (default)
- `claude-3.5-sonnet`
- `claude-3-opus`
- `claude-3-haiku`

## Architecture

### Adapter System

ChangeSmith is designed to be input-agnostic:

- **Git Adapter** (default): Reads from git staged changes
- **File Adapter**: Reads from a diff file or text file

### SRE Integration

All LLM calls flow through SmythOS SRE workflows:

```
Command → Adapter → Workflow → SRE Client → LLM → Response
```

### Security

- **Secret Redaction**: Automatically redacts API keys, tokens, and credentials
- **Diff Size Limits**: Truncates diffs larger than 80KB
- **Safe Defaults**: No data logging by default

## Development

### Setup

```bash
# Install dependencies
npm install

# Build
npm run build

# Run locally
node dist/cli.js message
```

### Project Structure

```
changesmith/
├── src/
│   ├── cli.ts                 # CLI entry point
│   ├── index.ts               # Module exports
│   ├── commands/              # Command handlers
│   │   ├── message.ts
│   │   └── review.ts
│   ├── adapters/              # Input adapters
│   │   ├── adapter.ts
│   │   ├── git.ts
│   │   └── file.ts
│   ├── sre/                   # SRE integration
│   │   ├── client.ts
│   │   └── workflows/
│   │       ├── message.workflow.ts
│   │       └── review.workflow.ts
│   └── utils/                 # Utilities
│       ├── redact.ts
│       ├── validate.ts
│       └── format.ts
├── tests/                     # Test suite
└── dist/                      # Build output
```

### Testing

Tests can be added using the vitest framework (config already in place):

```bash
npm test
```

## Example Usage

### Feature Development Workflow

```bash
# Make changes
vim src/auth.ts

# Stage changes
git add src/auth.ts

# Generate commit message
node dist/cli.js message
# Output: feat(auth): add password reset functionality

# Review before committing
node dist/cli.js review --strict

# Commit with generated message
git commit -m "$(node dist/cli.js message)"
```

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Credits

Built with:
- [SmythOS SRE](https://github.com/SmythOS/sre) - AI agent runtime
- [Commander.js](https://github.com/tj/commander.js/) - CLI framework
- [Chalk](https://github.com/chalk/chalk) - Terminal styling
- [Ora](https://github.com/sindresorhus/ora) - Spinner

---

**ChangeSmith** - Craft better commits, ship better code.
