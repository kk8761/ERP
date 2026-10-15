#!/usr/bin/env node

/**
 * Security Audit CLI Script
 * 
 * This script runs security audits and generates reports.
 * 
 * Usage:
 *   npm run security-audit              # Run full vulnerability scan
 *   npm run security-audit -- --quick   # Run quick scan
 *   npm run security-audit -- --report  # Generate report only
 */

import { securityAuditService, AuditType } from '../services/SecurityAuditService';
import * as fs from 'fs/promises';
import * as path from 'path';

interface AuditOptions {
  quick?: boolean;
  report?: boolean;
  output?: string;
  verbose?: boolean;
}

class SecurityAuditCLI {
  private options: AuditOptions;

  constructor(options: AuditOptions = {}) {
    this.options = options;
  }

  /**
   * Run the security audit
   */
  async run(): Promise<void> {
    console.log('='.repeat(80));
    console.log('NexaERP Security Audit');
    console.log('='.repeat(80));
    console.log();

    try {
      if (this.options.report) {
        await this.generateReportOnly();
      } else {
        await this.runFullAudit();
      }

      console.log();
      console.log('='.repeat(80));
      console.log('Security audit completed successfully');
      console.log('='.repeat(80));
    } catch (error) {
      console.error();
      console.error('='.repeat(80));
      console.error('Security audit failed');
      console.error('='.repeat(80));
      console.error(error);
      process.exit(1);
    }
  }

  /**
   * Run full security audit
   */
  private async runFullAudit(): Promise<void> {
    console.log('Starting comprehensive security audit...');
    console.log();

    // Schedule the audit
    const audit = await securityAuditService.scheduleAudit(
      AuditType.VULNERABILITY_SCAN,
      new Date(),
      'automated-scan',
      ['npm-audit', 'dependency-check', 'custom-checks']
    );

    console.log(`Audit ID: ${audit.id}`);
    console.log(`Scheduled: ${audit.scheduledDate.toISOString()}`);
    console.log();

    // Run vulnerability scan
    console.log('Running vulnerability scan...');
    const scanResult = await securityAuditService.conductVulnerabilityScan();

    console.log();
    console.log('Scan Results:');
    console.log('-'.repeat(80));
    console.log(`Scan ID: ${scanResult.scanId}`);
    console.log(`Duration: ${scanResult.scanDuration}ms`);
    console.log(`Tools Used: ${scanResult.toolsUsed.join(', ')}`);
    console.log();

    // Display vulnerability summary
    console.log('Vulnerability Summary:');
    console.log(`  Critical: ${scanResult.vulnerabilities.critical}`);
    console.log(`  High:     ${scanResult.vulnerabilities.high}`);
    console.log(`  Medium:   ${scanResult.vulnerabilities.medium}`);
    console.log(`  Low:      ${scanResult.vulnerabilities.low}`);
    console.log(`  Info:     ${scanResult.vulnerabilities.info}`);
    console.log(`  Total:    ${scanResult.findings.length}`);
    console.log();

    // Display detailed findings
    if (scanResult.findings.length > 0) {
      console.log('Detailed Findings:');
      console.log('-'.repeat(80));

      for (const finding of scanResult.findings) {
        this.displayFinding(finding);
      }
    } else {
      console.log('✓ No vulnerabilities found!');
    }

    // Generate and save report
    const report = await securityAuditService.generateAuditReport(audit.id);
    await this.saveReport(audit.id, report, scanResult);

    // Exit with error code if critical or high vulnerabilities found
    if (scanResult.vulnerabilities.critical > 0 || scanResult.vulnerabilities.high > 0) {
      console.log();
      console.log('⚠️  WARNING: Critical or high severity vulnerabilities found!');
      console.log('   Please address these issues immediately.');
      process.exit(1);
    }
  }

  /**
   * Generate report only
   */
  private async generateReportOnly(): Promise<void> {
    console.log('Generating security audit report...');
    
    const auditId = `report_${Date.now()}`;
    const report = await securityAuditService.generateAuditReport(auditId);
    
    await this.saveReport(auditId, report);
    
    console.log('Report generated successfully');
  }

  /**
   * Display a single finding
   */
  private displayFinding(finding: any): void {
    const severityColors: { [key: string]: string } = {
      CRITICAL: '\x1b[41m\x1b[37m', // Red background, white text
      HIGH: '\x1b[31m',              // Red text
      MEDIUM: '\x1b[33m',            // Yellow text
      LOW: '\x1b[36m',               // Cyan text
      INFO: '\x1b[37m'               // White text
    };

    const resetColor = '\x1b[0m';
    const color = severityColors[finding.severity] || '';

    console.log(`${color}[${finding.severity}]${resetColor} ${finding.title}`);
    console.log(`  Component: ${finding.affectedComponent}`);
    
    if (finding.affectedVersion) {
      console.log(`  Version: ${finding.affectedVersion}`);
    }
    
    if (finding.cveId) {
      console.log(`  CVE: ${finding.cveId}`);
    }
    
    console.log(`  Risk Score: ${finding.riskScore}/10`);
    console.log(`  Description: ${finding.description}`);
    console.log(`  Remediation: ${finding.remediationSteps}`);
    
    if (finding.references && finding.references.length > 0) {
      console.log(`  References: ${finding.references.join(', ')}`);
    }
    
    console.log();
  }

  /**
   * Save report to file
   */
  private async saveReport(auditId: string, report: string, scanResult?: any): Promise<void> {
    const outputDir = this.options.output || path.join(__dirname, '../../security-reports');
    
    // Create output directory if it doesn't exist
    try {
      await fs.mkdir(outputDir, { recursive: true });
    } catch (error) {
      console.warn(`Could not create output directory: ${outputDir}`);
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const reportPath = path.join(outputDir, `security-audit-${timestamp}.md`);

    // Enhanced report with scan results
    let enhancedReport = report;
    
    if (scanResult) {
      enhancedReport = `# Security Audit Report

**Audit ID:** ${auditId}
**Generated:** ${new Date().toISOString()}
**Scan Duration:** ${scanResult.scanDuration}ms
**Tools Used:** ${scanResult.toolsUsed.join(', ')}

## Executive Summary

This report summarizes the security audit findings for NexaERP.

## Vulnerability Summary

| Severity | Count |
|----------|-------|
| Critical | ${scanResult.vulnerabilities.critical} |
| High     | ${scanResult.vulnerabilities.high} |
| Medium   | ${scanResult.vulnerabilities.medium} |
| Low      | ${scanResult.vulnerabilities.low} |
| Info     | ${scanResult.vulnerabilities.info} |
| **Total** | **${scanResult.findings.length}** |

## Detailed Findings

${scanResult.findings.map((f: any, i: number) => `
### ${i + 1}. ${f.title}

- **Severity:** ${f.severity}
- **Status:** ${f.status}
- **Component:** ${f.affectedComponent}
${f.affectedVersion ? `- **Version:** ${f.affectedVersion}` : ''}
${f.cveId ? `- **CVE:** ${f.cveId}` : ''}
- **Risk Score:** ${f.riskScore}/10
- **Discovered:** ${f.discoveredDate.toISOString()}

**Description:**
${f.description}

**Remediation Steps:**
${f.remediationSteps}

${f.references && f.references.length > 0 ? `**References:**
${f.references.map((r: string) => `- ${r}`).join('\n')}` : ''}
`).join('\n---\n')}

## Recommendations

1. **Immediate Actions:**
   - Address all critical and high severity findings within 24-48 hours
   - Review and validate all findings marked as open
   - Assign owners to each finding for remediation

2. **Short-term Actions (1-2 weeks):**
   - Resolve all medium severity findings
   - Implement automated security scanning in CI/CD pipeline
   - Update all outdated dependencies

3. **Long-term Actions (1-3 months):**
   - Conduct quarterly penetration testing
   - Implement security training for development team
   - Establish security patch management process
   - Set up continuous security monitoring

4. **Process Improvements:**
   - Integrate security scanning into development workflow
   - Implement pre-commit hooks for secret detection
   - Establish security review process for code changes
   - Create security incident response plan

## Compliance Considerations

- Ensure all findings are tracked and remediated according to compliance requirements
- Maintain audit trail of all security findings and remediation efforts
- Schedule regular security audits (quarterly recommended)
- Document all accepted risks with proper justification

## Next Steps

1. Review this report with security team and stakeholders
2. Prioritize findings based on risk score and business impact
3. Create remediation tickets for each finding
4. Schedule follow-up audit to verify remediation
5. Update security policies and procedures based on findings

## Conclusion

${scanResult.vulnerabilities.critical > 0 || scanResult.vulnerabilities.high > 0 
  ? '⚠️ **Action Required:** Critical or high severity vulnerabilities were found and require immediate attention.'
  : '✓ No critical or high severity vulnerabilities found. Continue monitoring and maintaining security posture.'}

---

*This report was generated automatically by NexaERP Security Audit System*
`;
    }

    await fs.writeFile(reportPath, enhancedReport, 'utf-8');
    
    console.log();
    console.log(`Report saved to: ${reportPath}`);
  }
}

// Parse command line arguments
function parseArgs(): AuditOptions {
  const args = process.argv.slice(2);
  const options: AuditOptions = {};

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    switch (arg) {
      case '--quick':
        options.quick = true;
        break;
      case '--report':
        options.report = true;
        break;
      case '--output':
        options.output = args[++i];
        break;
      case '--verbose':
        options.verbose = true;
        break;
      case '--help':
        printHelp();
        process.exit(0);
        break;
    }
  }

  return options;
}

function printHelp(): void {
  console.log(`
NexaERP Security Audit CLI

Usage:
  npm run security-audit [options]

Options:
  --quick       Run quick scan (skip some checks)
  --report      Generate report only (no scan)
  --output DIR  Output directory for reports (default: ./security-reports)
  --verbose     Enable verbose logging
  --help        Show this help message

Examples:
  npm run security-audit
  npm run security-audit -- --quick
  npm run security-audit -- --output ./reports
  npm run security-audit -- --report
`);
}

// Main execution
if (require.main === module) {
  const options = parseArgs();
  const cli = new SecurityAuditCLI(options);
  
  cli.run().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

export { SecurityAuditCLI };
