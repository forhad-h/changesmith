# ChangeSmith - Quick Start Guide

This guide will help you get started with ChangeSmith in 5 minutes.

## Prerequisites

- Node.js ≥18
- Anthropic API key (Claude)

## Step 1: Install Dependencies

```bash
npm install
```

## Step 2: Configure API Key

Create `.smyth/.sre/vault.json` (already exists in the project):

```json
{
  "default": {
    "anthropic": "sk-ant-your-api-key-here"
  }
}
```

Or set environment variable:

```bash
export ANTHROPIC_API_KEY=sk-ant-your-api-key-here
```

## Step 3: Build the Project

```bash
npm run build
```

This creates:
- `dist/index.js` - Library entry point
- `dist/cli.js` - CLI executable

## Step 4: Test with Example

### Generate a commit message from a diff file

```bash
node dist/cli.js message --adapter file --input example.diff
```

Expected output (example):
```
feat(auth): add authentication service with login functionality
```

### Review the changes

```bash
node dist/cli.js review --adapter file --input example.diff
```

Expected output (example):
```markdown
## Summary

- Adds new AuthService class for authentication
- Implements login method with fetch API
- Stores API key in constructor

## Issues

### 1. Missing Content-Type header 🟡 [MEDIUM]
**Why:** API request may fail without proper content type
**Where:** auth.ts:10
**Fix:** Add headers: { 'Content-Type': 'application/json' }

### 2. No error handling 🟡 [MEDIUM]
**Why:** Network errors will cause unhandled promise rejections
**Where:** auth.ts:9
**Fix:** Wrap fetch in try-catch block

...
```

## Step 5: Use with Git

### Stage some changes

```bash
git add .
```

### Generate commit message

```bash
node dist/cli.js message
```

### Review your staged changes

```bash
node dist/cli.js review
```

### Commit with generated message

```bash
git commit -m "$(node dist/cli.js message)"
```

## Available Commands

### Message Command

```bash
# Basic usage
node dist/cli.js message

# Custom options
node dist/cli.js message --style plain --max-len 50
node dist/cli.js message --scope api
node dist/cli.js message --adapter file --input changes.diff
```

### Review Command

```bash
# Basic usage
node dist/cli.js review

# Custom options
node dist/cli.js review --strict
node dist/cli.js review --format json
node dist/cli.js review --patch
node dist/cli.js review --adapter file --input changes.diff
```

## Configuration Options

### Message Command

| Option | Values | Default | Description |
|--------|--------|---------|-------------|
| `--max-len` | 10-200 | 72 | Maximum message length |
| `--style` | plain, conventional | conventional | Message format |
| `--scope` | auto, none, custom | auto | Scope handling |
| `--adapter` | git, file | git | Input source |
| `--input` | path | - | File path (for file adapter) |

### Review Command

| Option | Values | Default | Description |
|--------|--------|---------|-------------|
| `--format` | text, md, json | md | Output format |
| `--strict` | boolean | false | Strict security checks |
| `--patch` | boolean | false | Include patch suggestions |
| `--adapter` | git, file | git | Input source |
| `--input` | path | - | File path (for file adapter) |

## Troubleshooting

### "No staged changes found"
- Run `git add <files>` first
- Or use file adapter with `--adapter file --input your.diff`

### "Adapter validation failed"
- Ensure you're in a git repository
- Or provide a valid file with `--input`

### API Key Issues
- Check `.smyth/.sre/vault.json` exists and contains valid key
- Or set `ANTHROPIC_API_KEY` environment variable
- Ensure key starts with `sk-ant-`

## Next Steps

1. Read the full [README.md](README.md) for detailed documentation
2. Customize prompts in `src/sre/workflows/`
3. Add more adapters in `src/adapters/`
4. Run tests with `npm test` (once vitest is configured)
5. Integrate into your git workflow

## Example Workflow

```bash
# 1. Make changes
vim src/feature.ts

# 2. Stage changes
git add src/feature.ts

# 3. Generate and review
node dist/cli.js message
node dist/cli.js review --strict

# 4. Commit
git commit -m "$(node dist/cli.js message)"

# 5. Push
git push
```

## Architecture Overview

```
User Command
    ↓
CLI (cli.ts)
    ↓
Command Handler (commands/)
    ↓
Adapter (adapters/) → Get changes
    ↓
Workflow (sre/workflows/) → Process with LLM
    ↓
SRE Client (sre/client.ts) → Call Claude API
    ↓
Utilities (utils/) → Validate, format, redact
    ↓
Output to user
```

## Development

### Project Structure

```
changesmith/
├── src/
│   ├── cli.ts              # CLI entry point
│   ├── commands/           # Command handlers
│   ├── adapters/           # Input adapters (git, file)
│   ├── sre/                # SRE integration
│   │   ├── client.ts       # SRE client
│   │   └── workflows/      # LLM workflows
│   └── utils/              # Utilities (redact, validate, format)
├── tests/                  # Test files
├── dist/                   # Build output
└── example.diff            # Example diff for testing
```

### Key Files

- [src/cli.ts](src/cli.ts) - CLI entry with Commander.js
- [src/sre/client.ts](src/sre/client.ts) - SRE client and prompt building
- [src/adapters/git.ts](src/adapters/git.ts) - Git integration
- [src/utils/redact.ts](src/utils/redact.ts) - Security redaction
- [src/utils/validate.ts](src/utils/validate.ts) - Message validation

## Support

For issues, questions, or contributions, see [README.md](README.md).

---

**You're now ready to use ChangeSmith!**
