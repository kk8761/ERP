/**
 * Security Audit System Usage Examples
 * 
 * This file demonstrates how to use the security audit system
 * in your application code.
 */

import {
  securityAuditService,
  AuditType,
  VulnerabilitySeverity,
  FindingStatus
} from '../src/services/SecurityAuditService';

/**
 * Example 1: Schedule a regular security audit
 */
async function scheduleRegularAudit() {
  console.log('Example 1: Scheduling a regular security audit');
  
  const audit = await securityAuditService.scheduleAudit(
    AuditType.VULNERABILITY_SCAN,
    new Date('2026-06-01'),
    'security-team@example.com',
    ['npm-audit', 'owasp-zap', 'custom-checks']
  );

  console.log('Audit scheduled:', audit);
}

/**
 * Example 2: Conduct a vulnerability scan
 */
async function conductScan() {
  console.log('Example 2: Conducting vulnerability scan');
  
  const result = await securityAuditService.conductVulnerabilityScan();

  console.log('Scan completed:');
  console.log(`- Scan ID: ${result.scanId}`);
  console.log(`- Duration: ${result.scanDuration}ms`);
  console.log(`- Total findings: ${result.findings.length}`);
  console.log('- Vulnerabilities by severity:');
  console.log(`  - Critical: ${result.vulnerabilities.critical}`);
  console.log(`  - High: ${result.vulnerabilities.high}`);
  console.log(`  - Medium: ${result.vulnerabilities.medium}`);
  console.log(`  - Low: ${result.vulnerabilities.low}`);
  console.log(`  - Info: ${result.vulnerabilities.info}`);

  // Display first few findings
  if (result.findings.length > 0) {
    console.log('\nFirst 3 findings:');
    result.findings.slice(0, 3).forEach((finding, index) => {
      console.log(`\n${index + 1}. ${finding.title}`);
      console.log(`   Severity: ${finding.severity}`);
      console.log(`   Component: ${finding.affectedComponent}`);
      console.log(`   Risk Score: ${finding.riskScore}/10`);
    });
  }
}

/**
 * Example 3: Create a manual security finding
 */
async function createManualFinding() {
  console.log('Example 3: Creating a manual security finding');
  
  const finding = await securityAuditService.createFinding({
    auditId: 'manual-audit-001',
    title: 'Weak Password Policy',
    description: 'Password policy allows passwords shorter than 8 characters',
    severity: VulnerabilitySeverity.MEDIUM,
    status: FindingStatus.OPEN,
    affectedComponent: 'Authentication Module',
    discoveredDate: new Date(),
    remediationSteps: 'Update password policy to require minimum 8 characters, including uppercase, lowercase, numbers, and special characters',
    remediationDeadline: new Date('2026-06-30'),
    assignedTo: 'dev-team@example.com',
    riskScore: 6,
    exploitability: 5,
    impact: 7,
    evidence: [
      'Current policy allows 4-character passwords',
      'No complexity requirements enforced'
    ],
    references: [
      'https://owasp.org/www-community/controls/Password_Policy',
      'https://pages.nist.gov/800-63-3/sp800-63b.html'
    ]
  });

  console.log('Finding created:', finding);
}

/**
 * Example 4: Track penetration test results
 */
async function trackPenTest() {
  console.log('Example 4: Tracking penetration test results');
  
  const findings = [
    {
      id: 'pentest-finding-1',
      auditId: 'pentest-2026-q2',
      title: 'SQL Injection in Search Endpoint',
      description: 'User input in search parameter is not properly sanitized, allowing SQL injection attacks',
      severity: VulnerabilitySeverity.CRITICAL,
      status: FindingStatus.OPEN,
      cveId: undefined,
      affectedComponent: '/api/search',
      affectedVersion: '2.0.0',
      discoveredDate: new Date(),
      remediationSteps: 'Use parameterized queries or ORM methods. Never concatenate user input into SQL queries.',
      remediationDeadline: new Date('2026-05-28'),
      assignedTo: 'backend-team@example.com',
      riskScore: 10,
      exploitability: 9,
      impact: 10,
      evidence: [
        'Request: GET /api/search?q=test\' OR 1=1--',
        'Response: Returns all records from database',
        'Proof of concept: Successfully extracted user credentials'
      ],
      references: [
        'https://owasp.org/www-community/attacks/SQL_Injection',
        'https://cheatsheetseries.owasp.org/cheatsheets/SQL_Injection_Prevention_Cheat_Sheet.html'
      ],
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      id: 'pentest-finding-2',
      auditId: 'pentest-2026-q2',
      title: 'Cross-Site Scripting (XSS) in User Profile',
      description: 'User profile fields are not properly encoded when displayed, allowing stored XSS attacks',
      severity: VulnerabilitySeverity.HIGH,
      status: FindingStatus.OPEN,
      affectedComponent: '/profile',
      discoveredDate: new Date(),
      remediationSteps: 'Encode all user-generated content before displaying. Use Content Security Policy headers.',
      riskScore: 8,
      exploitability: 7,
      impact: 8,
      evidence: [
        'Injected payload: <script>alert(document.cookie)</script>',
        'Payload executed when other users view the profile'
      ],
      references: [
        'https://owasp.org/www-community/attacks/xss/',
        'https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html'
      ],
      createdAt: new Date(),
      updatedAt: new Date()
    }
  ];

  const result = await securityAuditService.trackPenetrationTest(
    ['https://nexaerp.example.com'],
    'OWASP Testing Guide v4.2',
    findings,
    'Penetration test identified 2 critical vulnerabilities requiring immediate attention',
    `
# Technical Details

## Testing Methodology
- Black box testing approach
- Manual testing with automated tool assistance
- Focus on OWASP Top 10 vulnerabilities

## Scope
- Web application: https://nexaerp.example.com
- API endpoints: /api/*
- Authentication and authorization mechanisms

## Tools Used
- Burp Suite Professional
- OWASP ZAP
- SQLMap
- Custom scripts

## Findings Summary
- 1 Critical: SQL Injection
- 1 High: Cross-Site Scripting (XSS)
- 0 Medium
- 0 Low
    `,
    [
      'Implement input validation and output encoding across all user inputs',
      'Use parameterized queries or ORM methods for all database operations',
      'Implement Content Security Policy (CSP) headers',
      'Conduct security code review of authentication and authorization logic',
      'Implement automated security testing in CI/CD pipeline',
      'Provide security training to development team'
    ],
    'Jane Smith, OSCP',
    7200 // 2 hours
  );

  console.log('Penetration test tracked:', result);
}

/**
 * Example 5: Update finding status through remediation workflow
 */
async function remediationWorkflow() {
  console.log('Example 5: Remediation workflow');
  
  // Create a finding
  const finding = await securityAuditService.createFinding({
    auditId: 'audit-001',
    title: 'Outdated Express.js Version',
    description: 'Application uses Express.js 4.17.1 which has known vulnerabilities',
    severity: VulnerabilitySeverity.HIGH,
    status: FindingStatus.OPEN,
    affectedComponent: 'Express.js Framework',
    affectedVersion: '4.17.1',
    discoveredDate: new Date(),
    remediationSteps: 'Update Express.js to version 4.19.2 or later',
    riskScore: 8,
    exploitability: 6,
    impact: 8,
    evidence: ['npm audit output showing CVE-2024-XXXX'],
    references: ['https://expressjs.com/en/changelog/4x.html']
  });

  console.log('1. Finding created:', finding.title);

  // Developer starts working on it
  await securityAuditService.updateFindingStatus(
    finding.id,
    FindingStatus.IN_PROGRESS,
    undefined,
    'Developer assigned and started updating Express.js'
  );
  console.log('2. Status updated to IN_PROGRESS');

  // Simulate some work...
  await new Promise(resolve => setTimeout(resolve, 1000));

  // Developer completes the fix
  await securityAuditService.updateFindingStatus(
    finding.id,
    FindingStatus.RESOLVED,
    new Date(),
    'Updated Express.js to version 4.19.2. Verified no breaking changes. All tests passing.'
  );
  console.log('3. Status updated to RESOLVED');
}

/**
 * Example 6: Query findings for dashboard
 */
async function queryFindings() {
  console.log('Example 6: Querying findings for dashboard');
  
  // Get all open findings
  const openFindings = await securityAuditService.getOpenFindings();
  console.log(`Open findings: ${openFindings.length}`);

  // Get critical findings
  const criticalFindings = await securityAuditService.getFindingsBySeverity(
    VulnerabilitySeverity.CRITICAL
  );
  console.log(`Critical findings: ${criticalFindings.length}`);

  // Get overdue findings
  const overdueFindings = await securityAuditService.getOverdueFindings();
  console.log(`Overdue findings: ${overdueFindings.length}`);

  // Get resolved findings
  const resolvedFindings = await securityAuditService.getFindingsByStatus(
    FindingStatus.RESOLVED
  );
  console.log(`Resolved findings: ${resolvedFindings.length}`);
}

/**
 * Example 7: Generate audit report
 */
async function generateReport() {
  console.log('Example 7: Generating audit report');
  
  const auditId = 'audit-2026-q2';
  const report = await securityAuditService.generateAuditReport(auditId);

  console.log('Report generated:');
  console.log(report);
}

/**
 * Example 8: Automated weekly security scan
 */
async function automatedWeeklyScan() {
  console.log('Example 8: Automated weekly security scan');
  
  try {
    // Schedule the audit
    const audit = await securityAuditService.scheduleAudit(
      AuditType.VULNERABILITY_SCAN,
      new Date(),
      'automated-scanner',
      ['npm-audit', 'dependency-check', 'custom-checks']
    );

    console.log(`Audit ${audit.id} scheduled`);

    // Run the scan
    const scanResult = await securityAuditService.conductVulnerabilityScan();

    console.log(`Scan completed with ${scanResult.findings.length} findings`);

    // Check for critical or high severity issues
    if (scanResult.vulnerabilities.critical > 0 || scanResult.vulnerabilities.high > 0) {
      console.log('⚠️  ALERT: Critical or high severity vulnerabilities found!');
      
      // In a real application, you would:
      // - Send email notifications to security team
      // - Create tickets in issue tracking system
      // - Trigger incident response workflow
      // - Update security dashboard
      
      console.log('Notifications sent to security team');
    } else {
      console.log('✓ No critical or high severity vulnerabilities found');
    }

    // Generate report
    const report = await securityAuditService.generateAuditReport(audit.id);
    console.log('Report generated and saved');

  } catch (error) {
    console.error('Automated scan failed:', error);
    // In a real application, alert the team about the failure
  }
}

/**
 * Example 9: Compliance reporting
 */
async function complianceReporting() {
  console.log('Example 9: Compliance reporting');
  
  // Get all findings for compliance report
  const allFindings = [
    ...(await securityAuditService.getOpenFindings()),
    ...(await securityAuditService.getFindingsByStatus(FindingStatus.RESOLVED)),
    ...(await securityAuditService.getFindingsByStatus(FindingStatus.ACCEPTED_RISK))
  ];

  // Calculate metrics for compliance
  const metrics = {
    totalFindings: allFindings.length,
    openFindings: (await securityAuditService.getOpenFindings()).length,
    resolvedFindings: (await securityAuditService.getFindingsByStatus(FindingStatus.RESOLVED)).length,
    acceptedRisks: (await securityAuditService.getFindingsByStatus(FindingStatus.ACCEPTED_RISK)).length,
    criticalFindings: (await securityAuditService.getFindingsBySeverity(VulnerabilitySeverity.CRITICAL)).length,
    highFindings: (await securityAuditService.getFindingsBySeverity(VulnerabilitySeverity.HIGH)).length,
    overdueFindings: (await securityAuditService.getOverdueFindings()).length
  };

  console.log('Compliance Metrics:');
  console.log(JSON.stringify(metrics, null, 2));

  // Calculate remediation rate
  const remediationRate = metrics.totalFindings > 0
    ? (metrics.resolvedFindings / metrics.totalFindings * 100).toFixed(2)
    : 0;

  console.log(`Remediation Rate: ${remediationRate}%`);
}

/**
 * Run all examples
 */
async function runAllExamples() {
  console.log('='.repeat(80));
  console.log('Security Audit System - Usage Examples');
  console.log('='.repeat(80));
  console.log();

  try {
    await scheduleRegularAudit();
    console.log('\n' + '-'.repeat(80) + '\n');

    await conductScan();
    console.log('\n' + '-'.repeat(80) + '\n');

    await createManualFinding();
    console.log('\n' + '-'.repeat(80) + '\n');

    await trackPenTest();
    console.log('\n' + '-'.repeat(80) + '\n');

    await remediationWorkflow();
    console.log('\n' + '-'.repeat(80) + '\n');

    await queryFindings();
    console.log('\n' + '-'.repeat(80) + '\n');

    await generateReport();
    console.log('\n' + '-'.repeat(80) + '\n');

    await automatedWeeklyScan();
    console.log('\n' + '-'.repeat(80) + '\n');

    await complianceReporting();
    console.log('\n' + '-'.repeat(80) + '\n');

    console.log('All examples completed successfully!');
  } catch (error) {
    console.error('Error running examples:', error);
  }
}

// Run examples if this file is executed directly
if (require.main === module) {
  runAllExamples();
}

export {
  scheduleRegularAudit,
  conductScan,
  createManualFinding,
  trackPenTest,
  remediationWorkflow,
  queryFindings,
  generateReport,
  automatedWeeklyScan,
  complianceReporting
};
