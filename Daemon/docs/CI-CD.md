# CI/CD Pipeline Documentation

This document describes the continuous integration and deployment pipeline for the Daemon Protocol project.

## 🚀 Overview

The CI/CD pipeline is built using GitHub Actions and provides:

- **Automated testing** on every push and pull request
- **Code quality checks** (TypeScript, ESLint, Prettier)
- **Security scanning** (dependency audit, Snyk, CodeQL)
- **Automated builds** for multiple platforms
- **Bundle analysis** and size monitoring
- **Multi-environment deployments** (staging, production)
- **Docker containerization**
- **Release management**

## 📋 Pipeline Stages

### 1. Code Quality (`code-quality.yml`)

Triggers on: Push to `main`/`develop` branches and pull requests

**Jobs:**
- **TypeScript Type Check**: Validates all TypeScript code
- **ESLint**: Lints JavaScript/TypeScript files
- **Prettier Check**: Validates code formatting
- **Dependency Check**: Audits dependencies and checks for outdated packages
- **Bundle Size Check**: Analyzes bundle sizes against limits
- **Security Scan**: Snyk vulnerability scanning
- **Test Coverage**: Ensures test coverage thresholds

**Commands:**
```bash
pnpm run typecheck
npx eslint client/ --ext .ts,.tsx
pnpm run format.check
npm audit --audit-level=moderate
pnpm outdated
npx depcheck .
```

### 2. Build and Test (`ci.yml`)

**Matrix Strategy:**
- Node.js versions: 18, 20
- Platform: Web, Android, Docker

**Jobs:**
- **Code Quality**: Linting, type checking, formatting
- **Build and Test**: Unit tests, integration tests, build validation
- **Mobile Build**: Android APK compilation
- **Security Scanning**: npm audit, Snyk, CodeQL analysis
- **Performance Analysis**: Bundle size analysis, performance metrics
- **Deploy Staging**: Automatic deployment for `develop` branch
- **Deploy Production**: Manual deployment for `main` branch
- **Cleanup**: Artifact management and cleanup

### 3. Release (`release.yml`)

Triggers on: Git tags (v*.*)

**Jobs:**
- **Create Release**: GitHub release creation with changelog
- **Build and Upload**: Multi-platform asset compilation
- **Docker Build**: Container image building and pushing
- **Deploy Staging**: Deploy release to staging environment
- **Deploy Production**: Deploy release to production environment
- **Notify**: Notifications via Slack/Discord

## 🏗️ Build Process

### Web Application Build
```bash
# Install dependencies
pnpm install --frozen-lockfile

# Type checking
pnpm run typecheck

# Run tests
pnpm run test
pnpm run test:seed-vault

# Build application
pnpm run build:client
pnpm run build
```

### Mobile Build
```bash
# Build client
pnpm run build:client

# Sync with Capacitor
npx cap sync android

# Build APK
cd android && ./gradlew assembleDebug
```

### Docker Build
```bash
# Multi-stage build for optimization
docker build -t daemonprotocol/daemon-seeker:latest .
```

## 📊 Quality Gates

### Bundle Size Limits
- **Main Bundle**: ≤ 1MB
- **Individual Chunks**: ≤ 512KB
- **Total Application**: ≤ 2MB compressed

### Test Coverage Requirements
- **Branches**: ≥ 80%
- **Functions**: ≥ 80%
- **Lines**: ≥ 80%
- **Statements**: ≥ 80%

### Code Quality Standards
- **TypeScript**: No type errors
- **ESLint**: Zero warnings (configurable)
- **Prettier**: Consistent formatting
- **Dependencies**: No high-severity vulnerabilities

## 🚀 Deployment Strategy

### Environments

#### Development (`develop` branch)
- **Trigger**: Automatic on push
- **Deployment**: Staging environment
- **Validation**: All tests and quality checks
- **Rollback**: Automatic on health check failure

#### Production (`main` branch)
- **Trigger**: Manual approval required
- **Deployment**: Production environment
- **Validation**: Full test suite and security scan
- **Rollback**: Manual rollback procedure

### Deployment Steps

#### Staging Deployment
1. **Code Quality Checks**: ✅
2. **Build Validation**: ✅
3. **Security Scan**: ✅
4. **Deploy to Staging**: 🚀
5. **Health Check**: ✅
6. **Integration Tests**: ✅

#### Production Deployment
1. **Release Creation**: 📦
2. **Asset Generation**: 📦
3. **Security Validation**: 🔒
4. **Manual Approval**: 👤
5. **Deploy to Production**: 🚀
6. **Health Monitoring**: ✅
7. **Rollback Plan**: 🔄

## 🔐 Security Considerations

### Access Control
- **GitHub Secrets**: Encrypted storage for sensitive data
- **Environment-Specific Secrets**: Separate secrets per environment
- **Least Privilege**: Minimal permissions for deployment keys

### Security Scanning
- **Dependency Scanning**: Automated vulnerability detection
- **CodeQL Analysis**: Static analysis for security issues
- **Container Security**: Secure base images and minimal attack surface
- **Secrets Management**: No secrets in code or configuration

### Monitoring
- **Security Alerts**: Automated notifications for security issues
- **Vulnerability Tracking**: Continuous monitoring of dependencies
- **Compliance Reporting**: Regular security assessments

## 📈 Monitoring and Observability

### Build Metrics
- **Build Duration**: Track build performance
- **Success Rate**: Monitor build failure rates
- **Bundle Size**: Track bundle growth over time
- **Test Coverage**: Monitor coverage trends

### Deployment Metrics
- **Deployment Frequency**: Track release cadence
- **Rollback Rate**: Monitor deployment stability
- **Downtime**: Track availability during deployments
- **Error Rates**: Monitor post-deployment errors

### Application Metrics
- **Performance**: Response times, throughput
- **Errors**: Error rates, types of errors
- **Usage**: Active users, feature adoption
- **Health**: Service health checks

## 🔄 Rollback Procedures

### Automatic Rollback (Staging)
```yaml
# Health check failure triggers automatic rollback
healthcheck:
  test: ["CMD", "wget", "--spider", "http://localhost:3000/health"]
  interval: 30s
  timeout: 10s
  retries: 3
```

### Manual Rollback (Production)
1. **Identify Issue**: Monitor alerts and metrics
2. **Previous Version**: Identify last stable version
3. **Rollback Command**: `docker-compose down && docker-compose up -d --previous-tag`
4. **Verify**: Confirm health and functionality
5. **Investigate**: Analyze root cause
6. **Fix**: Address the issue
7. **Redeploy**: Deploy fixed version

## 🛠️ Local Development

### Prerequisites
- Node.js 18+ or 20+
- pnpm 10.14.0+
- Docker (optional)
- Android Studio (for mobile development)

### Setup Commands
```bash
# Clone repository
git clone https://github.com/protocoldaemon-sec/Daemon-Seeker-App.git
cd Daemon-Seeker-App

# Install dependencies
pnpm install

# Development server
pnpm run dev

# Mobile development
pnpm run mobile:build
pnpm run mobile:run

# Docker development
docker-compose --profile dev up
```

### Pre-commit Hooks
```bash
# Install husky
pnpm dlx husky install

# Pre-commit checks
pnpm run typecheck
pnpm run lint
pnpm run test
```

## 📝 Configuration Files

### GitHub Actions
- **`.github/workflows/ci.yml`**: Main CI/CD pipeline
- **`.github/workflows/code-quality.yml`**: Code quality checks
- **`.github/workflows/release.yml`**: Release automation

### Docker Configuration
- **`Dockerfile`**: Multi-stage production build
- **`docker-compose.yml`**: Development and production setups
- **`.dockerignore`**: Build context optimization

### Quality Configuration
- **`.eslintrc.js`**: ESLint rules
- **`.prettierrc`**: Prettier formatting
- **`tsconfig.json`**: TypeScript configuration

## 🚨 Troubleshooting

### Common Issues

#### Build Failures
- **Dependency Resolution**: Clear node_modules and reinstall
- **TypeScript Errors**: Check type definitions and imports
- **Bundle Size**: Analyze with bundle analyzer

#### Deployment Issues
- **Health Check Failures**: Verify service dependencies
- **Configuration Errors**: Check environment variables
- **Network Issues**: Verify connectivity and ports

#### Security Issues
- **Vulnerability Alerts**: Update affected packages
- **Scan Failures**: Review and fix security issues
- **Access Denied**: Check permissions and authentication

### Debugging Commands
```bash
# Debug build issues
npm run build:client-only

# Debug Docker issues
docker-compose logs app

# Debug mobile build
pnpm run mobile:open
```

## 📚 References

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Docker Documentation](https://docs.docker.com/)
- [pnpm Documentation](https://pnpm.io/)
- [TypeScript Documentation](https://www.typescriptlang.org/)
- [Vitest Documentation](https://vitest.dev/)

## 🤝 Contributing

When contributing to the CI/CD pipeline:

1. **Test Changes**: Ensure pipeline changes work locally
2. **Documentation**: Update documentation for new features
3. **Backward Compatibility**: Ensure changes don't break existing workflows
4. **Security**: Review changes for security implications
5. **Performance**: Monitor impact on build and deployment times

## 📞 Support

For CI/CD related issues:
- Create an issue in the repository
- Tag with `ci-cd` label
- Provide detailed error messages and logs
- Include steps to reproduce

For urgent deployment issues:
- Contact the DevOps team
- Use emergency rollback procedures
- Monitor alerts and dashboards