# Contributing to Modeload

## Local Development

```bash
# Install dependencies
npm install

# Run in development mode with watch
npm run test:watch

# Type check
npm run typecheck

# Build the project
npm run build

# Link for local testing
npm run build-link

# Unlink when done
npm unlink -g modeload
```

## Pull Request Process

1. **Fork the repository** and create your feature branch from `main`
2. **Make your changes** following the existing code style
3. **Run tests locally** to ensure everything works:
   ```bash
   npm run typecheck  # Type checking
   npm run build      # Build verification
   npm run test       # Run all tests
   ```
4. **Create a pull request** to the `main` branch


## Release Process

### Creating a New Release

We use **semantic versioning** and **git tags** to trigger automatic npm publishing.

#### 1. Update Version

First, update the version in `package.json`:

```bash
# For bug fixes (1.0.0 → 1.0.1)
npm version patch

# For new features (1.0.0 → 1.1.0)
npm version minor

# For breaking changes (1.0.0 → 2.0.0)
npm version major
```

This automatically:
- Updates `package.json` version
- Creates a git commit
- Creates a git tag (e.g., `v1.0.1`)

#### 2. Push the Tag

```bash
# Push the commit and tag
git push origin main --follow-tags
```




