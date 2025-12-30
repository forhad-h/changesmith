# ChangeSmith v2.0 - Quick Reference

Essential commands and workflows at a glance.

## 🚀 Common Commands

### Generate Commit Message

```bash
# Basic (uses git staged changes)
cs message

# With custom scope
cs message --scope api

# Plain style
cs message --style plain

# Shorter alias
cs msg
```

### Review Code

```bash
# Full multi-agent review
cs review

# Fast single-agent review
cs review --no-multi-agent

# With patches
cs review --patch

# Shorter alias
cs rv
```

### Learning

```bash
# Mark last commit as good
cs learn accept

# Mark as bad with feedback
cs learn reject "message" --feedback "too vague"

# View statistics
cs learn stats

# Reset learning
cs learn reset
```

### Vector Database

```bash
# Index codebase (one-time)
cs vector index

# Check status
cs vector status
```

## 📋 Command Cheat Sheet

| Command | Purpose | Time |
|---------|---------|------|
| `cs message` | Generate commit message | 2-3s |
| `cs review` | Multi-agent code review | 10-15s |
| `cs learn accept` | Mark message as good | <1s |
| `cs learn stats` | View learning data | <1s |
| `cs vector index` | Index codebase | 30s |
| `cs config` | Show configuration | <1s |

## 🎯 Workflows

### Daily Workflow

```bash
# 1. Make changes
git add .

# 2. Generate commit message
cs message

# 3. Commit with the message
git commit -m "feat(api): add user authentication"

# 4. Mark as accepted (AI learns)
cs learn accept
```

### PR Workflow

```bash
# 1. Review changes before PR
cs review

# 2. Fix any issues found

# 3. Create PR with review insights
```

### Setup Workflow (First Time)

```bash
# 1. Install
npm install -g changesmith

# 2. Set API key
export SMYTHOS_API_KEY="your-key"

# 3. Index codebase
cd your-project
cs vector index

# 4. Generate your first message
git add .
cs message

# 5. Start learning
cs learn accept
```

## ⚙️ Options Quick Reference

### `cs message` Options

| Option | Default | Purpose |
|--------|---------|---------|
| `--max-len <n>` | 72 | Max message length |
| `--style <type>` | conventional | plain or conventional |
| `--scope <value>` | auto | Custom scope |
| `--adapter <type>` | git | git or file |
| `--input <path>` | - | File path (for file adapter) |
| `--no-learning` | false | Disable memory |
| `--no-streaming` | false | Disable streaming |

### `cs review` Options

| Option | Default | Purpose |
|--------|---------|---------|
| `--format <type>` | md | text, md, or json |
| `--strict` | false | Extra checks |
| `--patch` | false | Include patches |
| `--adapter <type>` | git | git or file |
| `--input <path>` | - | File path |
| `--no-multi-agent` | false | Single agent mode |
| `--no-regressions` | false | Skip regression check |
| `--no-vector-db` | false | Skip context search |

## 🎨 Output Examples

### Message Command

```
Analyzing changes...
✨ Generated commit message:

feat(auth): add OAuth2 authentication flow

[Tokens: 312 in, 14 out]

Tip: Use "cs learn accept" to improve future suggestions
```

### Review Command (Summary)

```
CODE REVIEW SUMMARY
==================================================

STATISTICS
Total issues: 8
Critical: 1
High: 2
Medium: 3
Low: 2

EXECUTIVE SUMMARY
Found critical SQL injection vulnerability in user login.
Several performance improvements recommended. Code quality
is generally good with minor maintainability issues.

RECOMMENDATIONS
1. Fix SQL injection in api/auth.ts:42
2. Add input validation to user endpoints
3. Optimize database query in getUserPosts()
```

### Learn Stats

```
📊 Learning Statistics

Total commits learned: 47
Acceptance rate: 87%
Accepted: 41
Rejected: 6

Most common type: feat
Most common scope: api

Preferred style: conventional
Average length: 68 characters
Preferred types: feat, fix, refactor

✅ Recent Good Messages

1. feat(api): add user authentication endpoint
2. fix(db): resolve connection pool leak
3. refactor(auth): simplify token validation
```

## 🔥 Pro Tips

### Speed Optimization

```bash
# Fast message (no learning)
cs message --no-learning --no-streaming

# Fast review (single agent)
cs review --no-multi-agent --no-regressions
```

### Best Practices

```bash
# 1. Index codebase regularly
cs vector index  # Run weekly or after major changes

# 2. Train the AI consistently
cs learn accept  # After every good commit

# 3. Use stats to improve
cs learn stats  # Check weekly

# 4. Review before PR
cs review  # Always before creating PR
```

### Customization

```bash
# Conventional commits with custom length
cs message --max-len 80

# Strict review with patches
cs review --strict --patch

# JSON output for scripts
cs review --format json > review.json
```

## 📊 Performance Guide

| Task | Standard | Fast Mode |
|------|----------|-----------|
| Message | `cs message` | `cs message --no-learning` |
| Review | `cs review` | `cs review --no-multi-agent` |

**When to use fast mode:**
- CI/CD pipelines
- Quick iterations
- Large codebases

**When to use standard mode:**
- Final review before PR
- Security-critical changes
- Learning phase

## 🎯 Use Cases

### For Individual Developers

```bash
# Daily commits
cs message
git commit -m "$(cs message)"

# PR prep
cs review
```

### For Teams

```bash
# Consistent style
# Everyone uses cs message → learns team style

# Quality gates
# CI runs cs review → blocks if critical issues

# Knowledge sharing
# cs learn stats → understand team patterns
```

### For CI/CD

```bash
# In pipeline
cs review --format json --no-streaming > review.json

# Parse results
if grep -q '"severity": "critical"' review.json; then
  exit 1
fi
```

## 🔍 Debugging

### Verbose Output

```bash
# See what's happening
cs message  # Streaming shows progress

# Check configuration
cs config

# View learning data
cs learn stats
```

### Common Issues

| Issue | Solution |
|-------|----------|
| Slow review | Use `--no-multi-agent` |
| Generic messages | Run `cs learn accept` 5-10 times |
| No context | Run `cs vector index` |
| Want old behavior | Use `cs-legacy` command |

## 🎓 Learning Path

### Week 1: Basics
- [ ] Install and configure
- [ ] Use `cs message` daily
- [ ] Try `cs review` once

### Week 2: Learning
- [ ] Start using `cs learn accept`
- [ ] Run `cs learn stats`
- [ ] Adjust based on stats

### Week 3: Advanced
- [ ] Run `cs vector index`
- [ ] Use full multi-agent review
- [ ] Try regression detection

### Week 4: Mastery
- [ ] Integrate into CI/CD
- [ ] Customize options
- [ ] Share with team

## 📚 Resources

- **Full docs**: README-v2.md
- **Migration guide**: MIGRATION-v2.md
- **Implementation**: FINAL-IMPLEMENTATION.md
- **Issues**: GitHub issues

---

**Quick tip:** Start with `cs message` and `cs learn accept`. Everything else is optional!
