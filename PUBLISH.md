# Publishing ChangeSmith to NPM

Quick step-by-step guide to publish ChangeSmith to npm.

## One-Time Setup

### 1. Create npm Account

- Go to https://www.npmjs.com/signup
- Create an account
- Verify your email

### 2. Login to npm CLI

```bash
npm login
```

Enter your credentials when prompted.

### 3. Check Package Name Availability

```bash
npm search changesmith
```

If the name is taken, update `package.json`:

```json
{
  "name": "@your-username/changesmith"
}
```

Using a scoped package (`@your-username/`) ensures uniqueness.

### 4. Update Package Metadata

Edit `package.json`:

```json
{
  "name": "changesmith",  // or @your-username/changesmith
  "author": "Your Name <your.email@example.com>",
  "repository": {
    "type": "git",
    "url": "https://github.com/your-username/changesmith.git"
  },
  "homepage": "https://github.com/your-username/changesmith#readme",
  "bugs": {
    "url": "https://github.com/your-username/changesmith/issues"
  }
}
```

## Publishing Process

### Step 1: Pre-Publish Checks

```bash
# Clean install
rm -rf node_modules package-lock.json
npm install

# Run build
npm run build

# Verify build output
ls -la dist/
# Should see: cli.js, index.js, and .map files

# Test CLI locally
node dist/cli.js --help
node dist/cli.js message --help
```

### Step 2: Test Local Installation

```bash
# Link package locally
npm link

# Test as if globally installed
cs --help
cs message --adapter file --input example.diff

# Unlink when done
npm unlink -g changesmith
```

### Step 3: Review Package Contents

```bash
# See what will be published
npm pack --dry-run

# Or create actual tarball to inspect
npm pack
tar -tzf changesmith-1.0.0.tgz
rm changesmith-1.0.0.tgz
```

Verify it includes:
- ✅ dist/
- ✅ README.md
- ✅ LICENSE
- ✅ QUICKSTART.md
- ❌ src/ (should NOT be included)
- ❌ tests/ (should NOT be included)

### Step 4: Publish

```bash
# Dry run first (see what would happen)
npm publish --dry-run

# If scoped package, use --access public
npm publish --access public

# If not scoped
npm publish
```

### Step 5: Verify Publication

```bash
# Check on npm
npm info changesmith

# Install globally to test
npm install -g changesmith

# Test it works
cs --help
cs message --help

# Uninstall
npm uninstall -g changesmith
```

## Updating Versions

### Patch Release (Bug Fixes)

```bash
# 1.0.0 → 1.0.1
npm version patch
git push && git push --tags
npm publish --access public
```

### Minor Release (New Features)

```bash
# 1.0.0 → 1.1.0
npm version minor
git push && git push --tags
npm publish --access public
```

### Major Release (Breaking Changes)

```bash
# 1.0.0 → 2.0.0
npm version major
git push && git push --tags
npm publish --access public
```

## GitHub Integration

### Create Repository

```bash
# Initialize git if not already done
git init

# Add remote
git remote add origin https://github.com/your-username/changesmith.git

# Initial commit
git add .
git commit -m "feat: initial implementation of changesmith CLI"

# Push
git push -u origin main

# Tag first release
git tag v1.0.0
git push --tags
```

### Create GitHub Release

1. Go to https://github.com/your-username/changesmith/releases
2. Click "Draft a new release"
3. Choose tag: v1.0.0
4. Release title: "v1.0.0 - Initial Release"
5. Description:

```markdown
## Features

- 🎯 Generate professional commit messages (conventional or plain)
- 🔍 Review code changes before creating PRs
- 🔒 Automatic secret redaction
- 🎨 Multiple output formats (text, markdown, JSON)
- 🔌 Provider-agnostic LLM layer using SmythOS SRE

## Installation

npm install -g changesmith

## Quick Start

cs message --help
cs review --help
```

6. Click "Publish release"

## Automated Publishing (Optional)

### Using GitHub Actions

Create `.github/workflows/publish.yml`:

```yaml
name: Publish to npm

on:
  release:
    types: [published]

jobs:
  publish:
    runs-on: ubuntu-latest

    permissions:
      contents: read
      id-token: write

    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: '18'
          registry-url: 'https://registry.npmjs.org'

      - name: Install dependencies
        run: npm ci

      - name: Build
        run: npm run build

      - name: Publish to npm
        run: npm publish --access public
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
```

### Setup npm Token

1. Generate token: https://www.npmjs.com/settings/your-username/tokens
2. Click "Generate New Token" → "Automation"
3. Copy the token
4. Go to GitHub repo → Settings → Secrets and variables → Actions
5. Click "New repository secret"
6. Name: `NPM_TOKEN`
7. Value: paste your npm token
8. Click "Add secret"

### Workflow

```bash
# 1. Bump version locally
npm version patch  # or minor, or major

# 2. Push
git push && git push --tags

# 3. Create GitHub Release
# Go to GitHub → Releases → Draft new release
# Select the new tag
# Click "Publish release"

# 4. GitHub Actions will auto-publish to npm!
```

## Post-Publication

### Announce

- [ ] Tweet/post about the release
- [ ] Share on Reddit (r/node, r/programming)
- [ ] Write a blog post or Dev.to article
- [ ] Share in relevant Discord/Slack communities

### Monitor

- [ ] Check npm stats: https://npm-stat.com/charts.html?package=changesmith
- [ ] Monitor GitHub issues
- [ ] Respond to user feedback

### Maintain

- [ ] Keep dependencies updated
- [ ] Fix bugs quickly
- [ ] Add features based on feedback
- [ ] Release regular updates

## Troubleshooting

### "You do not have permission to publish"

- Run `npm login` again
- Check you're logged in: `npm whoami`
- If scoped package, use `--access public`

### "Package name already exists"

- Choose a different name, or
- Use a scoped package: `@your-username/changesmith`

### "Missing README"

- Ensure README.md exists
- Check it's listed in `files` array in package.json

### "Build failed"

- Run `npm run build` locally first
- Fix any TypeScript errors
- Ensure dist/ directory is created

## Quick Publish Checklist

- [ ] Updated package.json metadata
- [ ] Built successfully (`npm run build`)
- [ ] Tested locally (`npm link`)
- [ ] Reviewed package contents (`npm pack --dry-run`)
- [ ] Logged into npm (`npm whoami`)
- [ ] Published (`npm publish --access public`)
- [ ] Verified on npm (`npm info changesmith`)
- [ ] Created GitHub repository
- [ ] Tagged release (`git tag v1.0.0`)
- [ ] Created GitHub Release
- [ ] Announced to community

## Complete Example

```bash
# 1. Setup
npm login

# 2. Update metadata
vim package.json  # Update author, repository, etc.

# 3. Build and test
npm run build
npm link
cs --help
npm unlink -g changesmith

# 4. Publish
npm publish --access public

# 5. Verify
npm info changesmith
npm install -g changesmith
cs --version

# 6. Git
git remote add origin https://github.com/your-username/changesmith.git
git add .
git commit -m "feat: initial release"
git tag v1.0.0
git push -u origin main --tags

# 7. Done!
```

## Success!

Your package is now available at:
- npm: https://www.npmjs.com/package/changesmith
- GitHub: https://github.com/your-username/changesmith

Users can install with:
```bash
npm install -g changesmith
```

---

For detailed deployment options, see [DEPLOYMENT.md](DEPLOYMENT.md)
