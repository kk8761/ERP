# Security Audit System Guide

## Overview

The Security Audit System provides comprehensive security scanning, vulnerability tracking, and penetration testing management for NexaERP. It helps maintain security posture through regular audits, automated scanning, and systematic remediation tracking.

## Features

### 1. Vulnerability Scanning
- **npm Audit Integration**: Automatically scans npm dependencies for known vulnerabilities
- **Dependency Checking**: Identifies outdated packages that may have security issues
- **Custom Security Checks**: Detects hardcoded secrets, insecure configurations, and missing security headers
- **OWASP ZAP Integration**: Web application security scanning (when available)

### 2. Penetration Testing Management
- Track penetration test results and findings
- Document testing methodology and scope
- Store technical details and recommendations
- Link findings to remediation efforts

### 3. Security Findings Management
- Create and track security findings
- Categorize by severity (Critical, High, Medium, Low, Info)
- Track remediation status (Open, In Progress, Resolved, Accepted Risk, False Positive)
- Calculate risk scores based on exploitability and impact
- Set remediation deadlines and assign owners

### 4. Audit Reporting
- Generate comprehensive audit reports
- Track audit history and trends
- Export findings for compliance purposes
- Dashboard metrics for security posture

## Installation

The security audit system is included in the NexaERP backend. No additional installation is required.

### Optional Tools

For enhanced scanning capabilities, install these optional tools:

```bash
# OWASP ZAP (for web application scanning)
# Download from: https://www.zaproxy.org/download/

# Install zap-cli
pip install zaproxy

# Trivy (for container scanning)
# Download from: https://github.com/aquasecurity/trivy
```

## Usage

### Running Security Audits

#### Via CLI Script

```bash
# Run full vulnerability scan
npm run security-audit

# Run quick scan
npm run security-audit -- --quick

# Generate report only
npm run security-audit -- --report

# Specify output directory
npm run security-audit -- --output ./my-reports

# Enable verbose logging
npm run security-audit -- --verbose
```

#### Via API

```bash
# Schedule an audit
curl -X POST http://localhost:3000/api/security-audit/schedule \
  -H "Content-Type: application/json" \
  -d '{
    "auditType": "VULNERABILITY_SCAN",
    "scheduledDate": "2026-06-01T00:00:00Z",
    "performedBy": "security-team@example.com",
    "toolsUsed": ["npm-audit", "owasp-zap"]
  }'

# Conduct vulnerability scan
curl -X POST http://localhost:3000/api/security-audit/vulnerability-scan

# Get open findings
curl http://localhost:3000/api/security-audit/findings/open

# Get audit metrics
curl http://localhost:3000/api/security-audit/metrics
```

### Managing Findings

#### Create a Finding

```bash
curl -X POST http://localhost:3000/api/security-audit/findings \
  -H "Content-Type: application/json" \
  -d '{
    "title": "SQL Injection in Login Endpoint",
    "description": "User input not properly sanitized",
    "severity": "CRITICAL",
    "affectedComponent": "/api/auth/login",
    "remediationSteps": "Use parameterized queries",
    "riskScore": 10,
    "exploitability": 9,
    "impact": 10,
    "evidence": ["POST /api/auth/login with payload"],
    "references": ["https://owasp.org/www-community/attacks/SQL_Injection"]
  }'
```

#### Update Finding Status

```bash
curl -X PUT http://localhost:3000/api/security-audit/findings/{findingId}/status \
  -H "Content-Type: application/json" \
  -d '{
    "status": "RESOLVED",
    "notes": "Implemented parameterized queries"
  }'
```

#### Get Findings by Severity

```bash
# Get critical findings
curl http://localhost:3000/api/security-audit/findings/severity/CRITICAL

# Get high severity findings
curl http://localhost:3000/api/security-audit/findings/severity/HIGH
```

#### Get Overdue Findings

```bash
curl http://localhost:3000/api/security-audit/findings/overdue
```

### Tracking Penetration Tests

```bash
curl -X POST http://localhost:3000/api/security-audit/penetration-test \
  -H "Content-Type: application/json" \
  -d '{
    "scope": ["https://nexaerp.example.com"],
    "methodology": "OWASP Testing Guide v4",
    "findings": [
      {
        "title": "Cross-Site Scripting (XSS)",
        "description": "Reflected XSS in search parameter",
        "severity": "HIGH",
        "affectedComponent": "/search",
        "remediationSteps": "Sanitize and encode user input",
        "riskScore": 8,
        "exploitability": 7,
        "impact": 8,
        "evidence": ["<script>alert(1)</script>"],
        "references": ["https://owasp.org/www-community/attacks/xss/"]
      }
    ],
    "executiveSummary": "Found 1 high severity vulnerability",
    "technicalDetails": "Detailed technical analysis...",
    "recommendations": ["Implement input validation", "Use CSP headers"],
    "testerName": "John Doe",
    "testDuration": 3600
  }'
```

## Audit Types

### VULNERABILITY_SCAN
Automated scanning for known vulnerabilities in dependencies and code.

**Frequency**: Weekly or on every deployment

**Tools Used**:
- npm audit
- Dependency checker
- Custom security checks

### PENETRATION_TEST
Manual security testing by security professionals.

**Frequency**: Quarterly or after major releases

**Scope**:
- Authentication and authorization
- Input validation
- Session management
- API security
- Business logic flaws

### CODE_REVIEW
Manual review of code for security issues.

**Frequency**: For critical changes or new features

**Focus Areas**:
- Authentication logic
- Authorization checks
- Data validation
- Cryptographic operations
- Sensitive data handling

### DEPENDENCY_AUDIT
Review of third-party dependencies for security and licensing issues.

**Frequency**: Monthly

**Checks**:
- Known vulnerabilities
- Outdated packages
- License compliance
- Unmaintained dependencies

### CONFIGURATION_REVIEW
Review of system and application configurations.

**Frequency**: Quarterly

**Areas**:
- Server hardening
- Database security
- Network configuration
- Access controls
- Logging and monitoring

## Severity Levels

### CRITICAL
- Immediate exploitation possible
- Severe impact on confidentiality, integrity, or availability
- No user interaction required
- **SLA**: Fix within 24 hours

### HIGH
- Exploitation likely with minimal effort
- Significant impact on security
- Minimal user interaction required
- **SLA**: Fix within 1 week

### MEDIUM
- Exploitation requires specific conditions
- Moderate impact on security
- User interaction may be required
- **SLA**: Fix within 1 month

### LOW
- Exploitation difficult or unlikely
- Minor impact on security
- Significant user interaction required
- **SLA**: Fix within 3 months

### INFO
- No direct security impact
- Informational findings
- Best practice recommendations
- **SLA**: Address as time permits

## Finding Status Workflow

```
OPEN → IN_PROGRESS → RESOLVED
  ↓
ACCEPTED_RISK (with justification)
  ↓
FALSE_POSITIVE (with verification)
```

### Status Definitions

- **OPEN**: Finding identified, not yet addressed
- **IN_PROGRESS**: Remediation work in progress
- **RESOLVED**: Finding has been fixed and verified
- **ACCEPTED_RISK**: Risk accepted by management with justification
- **FALSE_POSITIVE**: Finding determined to be incorrect

## Risk Scoring

Risk Score = (Exploitability × Impact) / 10

### Exploitability (0-10)
- 10: Trivial to exploit, automated tools available
- 7-9: Easy to exploit with basic skills
- 4-6: Moderate difficulty, requires specific knowledge
- 1-3: Difficult to exploit, requires advanced skills
- 0: Not exploitable

### Impact (0-10)
- 10: Complete system compromise
- 7-9: Significant data breach or service disruption
- 4-6: Limited data exposure or functionality impact
- 1-3: Minimal impact
- 0: No impact

## Best Practices

### 1. Regular Scanning
- Run automated scans weekly
- Scan on every deployment
- Integrate into CI/CD pipeline

### 2. Timely Remediation
- Address critical findings within 24 hours
- Follow SLA guidelines for each severity level
- Track remediation progress

### 3. Documentation
- Document all findings thoroughly
- Include evidence and reproduction steps
- Record remediation actions

### 4. Verification
- Verify fixes with re-testing
- Update finding status only after verification
- Document verification results

### 5. Continuous Improvement
- Review audit trends regularly
- Update security policies based on findings
- Provide security training to team

## Integration with CI/CD

### GitHub Actions Example

```yaml
name: Security Audit

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]
  schedule:
    - cron: '0 0 * * 0'  # Weekly on Sunday

jobs:
  security-audit:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v2
    
    - name: Setup Node.js
      uses: actions/setup-node@v2
      with:
        node-version: '18'
    
    - name: Install dependencies
      run: |
        cd server
        npm ci
    
    - name: Run security audit
      run: |
        cd server
        npm run security-audit
      continue-on-error: true
    
    - name: Upload audit report
      uses: actions/upload-artifact@v2
      with:
        name: security-audit-report
        path: server/security-reports/
```

### GitLab CI Example

```yaml
security-audit:
  stage: test
  script:
    - cd server
    - npm ci
    - npm run security-audit
  artifacts:
    paths:
      - server/security-reports/
    expire_in: 30 days
  allow_failure: true
  only:
    - main
    - develop
```

## Compliance Considerations

### SOC 2
- Regular vulnerability scanning
- Documented remediation process
- Audit trail of security findings
- Timely patching of vulnerabilities

### ISO 27001
- Risk assessment and treatment
- Security incident management
- Continuous monitoring
- Regular security audits

### PCI DSS
- Quarterly vulnerability scans
- Annual penetration testing
- Patch management process
- Security testing of applications

### GDPR
- Security by design
- Regular security assessments
- Data protection impact assessments
- Breach notification procedures

## Troubleshooting

### npm audit fails
```bash
# Clear npm cache
npm cache clean --force

# Update npm
npm install -g npm@latest

# Run audit with specific registry
npm audit --registry=https://registry.npmjs.org/
```

### OWASP ZAP not found
```bash
# Install zap-cli
pip install zaproxy

# Verify installation
zap-cli --version

# Add to PATH if needed
export PATH=$PATH:/path/to/zap
```

### Permission denied errors
```bash
# Ensure script is executable
chmod +x server/src/scripts/run-security-audit.ts

# Run with proper permissions
sudo npm run security-audit
```

### Report generation fails
```bash
# Create reports directory manually
mkdir -p server/security-reports

# Check write permissions
ls -la server/security-reports

# Specify custom output directory
npm run security-audit -- --output /tmp/security-reports
```

## API Reference

### Endpoints

#### POST /api/security-audit/schedule
Schedule a security audit.

**Request Body**:
```json
{
  "auditType": "VULNERABILITY_SCAN",
  "scheduledDate": "2026-06-01T00:00:00Z",
  "performedBy": "security-team@example.com",
  "toolsUsed": ["npm-audit", "owasp-zap"]
}
```

#### POST /api/security-audit/vulnerability-scan
Conduct a vulnerability scan.

**Response**:
```json
{
  "success": true,
  "data": {
    "scanId": "scan_123",
    "timestamp": "2026-05-26T10:00:00Z",
    "vulnerabilities": {
      "critical": 0,
      "high": 2,
      "medium": 5,
      "low": 10,
      "info": 3
    },
    "findings": [...],
    "scanDuration": 5000,
    "toolsUsed": ["npm-audit", "dependency-check", "custom-checks"]
  }
}
```

#### POST /api/security-audit/findings
Create a security finding.

#### PUT /api/security-audit/findings/:findingId/status
Update finding status.

#### GET /api/security-audit/findings/severity/:severity
Get findings by severity.

#### GET /api/security-audit/findings/open
Get all open findings.

#### GET /api/security-audit/findings/overdue
Get overdue findings.

#### GET /api/security-audit/metrics
Get audit dashboard metrics.

#### GET /api/security-audit/report/:auditId
Generate audit report.

## Support

For issues or questions:
- Check the troubleshooting section
- Review the API documentation
- Contact the security team
- Create an issue in the repository

## License

This security audit system is part of NexaERP and follows the same license.
