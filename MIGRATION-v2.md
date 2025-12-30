# Migration Guide: v1.0 → v2.0

This guide helps you upgrade from ChangeSmith v1.0 to v2.0 with all the new AI-powered features.

## 🎯 Overview

v2.0 is a **major upgrade** that introduces:
- Multi-agent review system
- AI learning and memory
- Vector database for codebase context
- Regression detection
- Real-time streaming

## 🔄 Breaking Changes

### 1. Binary Name Change

**v1.0:**
```bash
cs message  # Uses dist/cli.js
```

**v2.0:**
```bash
cs message  # Uses dist/cli-enhanced.js (new default)
cs-legacy message  # Uses old dist/cli.js (if needed)
```

The enhanced CLI is now the default. Legacy CLI is still available as `cs-legacy`.

### 2. New Dependencies

v2.0 adds:
```json
{
  "glob": "^11.0.0"  // For codebase indexing
}
```

Run `npm install` after upgrading.

### 3. Output Format Changes

**Message Command:**

v1.0 output:
```
feat: add new feature
```

v2.0 output:
```
Analyzing changes...
✨ Generated commit message:

feat: add new feature

[Tokens: 245 in, 12 out]

Tip: Use "cs learn accept" to improve future suggestions
```

You can disable streaming with `--no-streaming` for v1.0-like behavior.

**Review Command:**

v2.0 includes much more detail:
- Executive summary
- Top priority issues
- Detailed breakdown by security/performance/quality
- Regression risks (if vector DB enabled)

## 📦 Upgrade Steps

### Step 1: Update Package

```bash
npm install changesmith@2.0.0
# or
npm install -g changesmith@2.0.0
```

### Step 2: Verify Installation

```bash
cs --version
# Should show: 2.0.0

cs config
# Shows all enabled features
```

### Step 3: Test Basic Commands

```bash
# Test message generation
cs message

# Test review
cs review
```

### Step 4: (Optional) Index Codebase

For best results with v2.0 features:

```bash
# One-time setup
cs vector index

# This enables:
# - Context-aware reviews
# - Regression detection
# - Better commit messages
```

### Step 5: Start Learning

```bash
# After your next commit
cs learn accept

# Or mark as rejected with feedback
cs learn reject "message" --feedback "reason"
```

## 🆕 New Features Usage

### 1. Enable Full Multi-Agent Review

```bash
# Default in v2.0
cs review

# Disable for faster review (like v1.0)
cs review --no-multi-agent --no-regressions
```

### 2. Use Learning System

```bash
# Generate message (AI uses learned patterns)
cs message

# Accept the message after committing
cs learn accept

# View statistics
cs learn stats
```

### 3. Index Codebase

```bash
# Index once or when codebase changes significantly
cs vector index

# Now reviews include regression detection
cs review
```

## 🔧 Configuration Changes

### Environment Variables

**v1.0:**
```bash
export SMYTHOS_API_KEY="your-key"
```

**v2.0 (same):**
```bash
export SMYTHOS_API_KEY="your-key"

# Optional: Customize model
export CHANGESMITH_MODEL="claude-4-sonnet"
```

### Storage Location

v2.0 creates:
```
.changesmith/
└── memory/
    └── commit-patterns.json  # Learning data
```

Add to `.gitignore`:
```
.changesmith/
```

## 🎛️ Command Mapping

### Message Command

| v1.0 | v2.0 | Notes |
|------|------|-------|
| `cs message` | `cs message` | Now includes learning |
| N/A | `cs msg` | New alias |
| N/A | `--no-learning` | Disable learning |
| N/A | `--no-streaming` | Disable streaming |

All v1.0 options still work: `--max-len`, `--style`, `--scope`, `--adapter`, `--input`

### Review Command

| v1.0 | v2.0 | Notes |
|------|------|-------|
| `cs review` | `cs review` | Now multi-agent by default |
| N/A | `cs rv` | New alias |
| N/A | `--no-multi-agent` | Use single agent (faster) |
| N/A | `--no-regressions` | Skip regression check |
| N/A | `--no-vector-db` | Skip context search |

All v1.0 options still work: `--format`, `--strict`, `--patch`, `--adapter`, `--input`

### New Commands

| Command | Purpose |
|---------|---------|
| `cs learn accept [msg]` | Mark message as good |
| `cs learn reject <msg>` | Mark message as bad |
| `cs learn stats` | View learning statistics |
| `cs learn reset` | Reset all learning |
| `cs vector index [path]` | Index codebase |
| `cs vector status` | Check vector DB status |
| `cs config` | Show configuration |

## 🚀 Performance Considerations

### Timing Comparison

| Operation | v1.0 | v2.0 (default) | v2.0 (fast mode) |
|-----------|------|----------------|------------------|
| Message generation | 2-3s | 2-3s | Same |
| Review | 5-8s | 10-15s | 5-8s |
| First-time vector indexing | N/A | ~30s (one-time) | N/A |

### Fast Mode

If v2.0 is too slow for your workflow:

```bash
# Message (disable learning)
cs message --no-learning --no-streaming

# Review (single agent, no context)
cs review --no-multi-agent --no-regressions --no-vector-db
```

## 🔄 Rollback Plan

If you need to rollback to v1.0:

```bash
# Option 1: Use legacy CLI
cs-legacy message
cs-legacy review

# Option 2: Reinstall v1.0
npm install changesmith@1.0.0
```

Your v1.0 workflows will continue to work with `cs-legacy`.

## 🎓 Learning Curve

### For Basic Users

v2.0 works exactly like v1.0 if you:
- Don't use new commands (`cs learn`, `cs vector`)
- Accept the slightly more verbose output

**No changes needed to your workflow.**

### For Power Users

Take advantage of:
1. **Multi-agent review** - Better issue detection
2. **Learning system** - Personalizes over time
3. **Vector DB** - Context-aware analysis
4. **Regression detection** - Catch breaking changes early

**Investment:** ~5 minutes to run `cs vector index` and start using `cs learn accept`

## 📊 Feature Comparison

| Feature | v1.0 | v2.0 |
|---------|------|------|
| Commit message generation | ✅ | ✅ |
| Code review | ✅ | ✅ |
| Conventional commits | ✅ | ✅ |
| Git adapter | ✅ | ✅ |
| File adapter | ✅ | ✅ |
| Secret redaction | ✅ | ✅ |
| Streaming output | ❌ | ✅ |
| Multi-agent review | ❌ | ✅ |
| Learning from feedback | ❌ | ✅ |
| Vector DB context | ❌ | ✅ |
| Regression detection | ❌ | ✅ |
| Git context skills | ❌ | ✅ |
| Specialized agents | ❌ | ✅ (3) |

## 🐛 Troubleshooting

### Issue: Build fails after upgrade

```bash
# Solution: Reinstall dependencies
rm -rf node_modules package-lock.json
npm install
npm run build
```

### Issue: "glob" module not found

```bash
# Solution: Install glob
npm install glob
```

### Issue: Vector indexing too slow

```bash
# Solution: Disable it
cs review --no-vector-db --no-regressions
```

Or only index once:
```bash
cs vector index
# Run reviews normally after
```

### Issue: Messages too different from before

```bash
# Solution: Train the AI
cs learn accept "your preferred style message"
# Repeat 5-10 times, AI will adapt
```

### Issue: Want v1.0 behavior exactly

```bash
# Solution: Use legacy CLI
alias cs='cs-legacy'

# Or disable new features
cs message --no-learning --no-streaming
cs review --no-multi-agent --no-vector-db
```

## ✅ Migration Checklist

- [ ] Update to v2.0
- [ ] Run `npm install` to get new dependencies
- [ ] Test `cs message`
- [ ] Test `cs review`
- [ ] (Optional) Run `cs vector index`
- [ ] (Optional) Start using `cs learn accept`
- [ ] Add `.changesmith/` to `.gitignore`
- [ ] Update CI/CD if using ChangeSmith
- [ ] Update team documentation

## 📚 Next Steps

After migrating:

1. **Read the new README-v2.md** for full feature documentation
2. **Run `cs config`** to see what's enabled
3. **Try `cs review`** on a branch to see multi-agent review
4. **Index your codebase** with `cs vector index`
5. **Start learning** with `cs learn accept`

## 💡 Tips

1. **Start simple** - Use v2.0 like v1.0, add features gradually
2. **Index regularly** - Run `cs vector index` when codebase changes significantly
3. **Train the AI** - Use `cs learn accept/reject` to personalize
4. **Check stats** - Run `cs learn stats` to see improvement
5. **Use aliases** - Add `cs msg` and `cs rv` to your workflow

## 🤝 Need Help?

- **Issues**: https://github.com/your-org/changesmith/issues
- **Docs**: See README-v2.md
- **Examples**: See FINAL-IMPLEMENTATION.md

---

**Happy upgrading!** 🚀
