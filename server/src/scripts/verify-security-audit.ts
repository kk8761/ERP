#!/usr/bin/env node

/**
 * Verification script for Security Audit System
 * 
 * This script verifies that the security audit system is properly installed
 * and functional.
 */

import { securityAuditService, AuditType, VulnerabilitySeverity, FindingStatus } from '../services/SecurityAuditService';

async function verifySecurityAuditSystem() {
  console.log('='.repeat(80));
  console.log('Security Audit System Verification');
  console.log('='.repeat(80));
  console.log();

  let allTestsPassed = true;

  try {
    // Test 1: Schedule an audit
    console.log('Test 1: Schedule an audit...');
    const audit = await securityAuditService.scheduleAudit(
      AuditType.VULNERABILITY_SCAN,
      new Date(),
      'test@example.com',
      ['npm-audit']
    );
    
    if (audit && audit.id && audit.status === 'SCHEDULED') {
      console.log('✓ Audit scheduling works');
    } else {
      console.log('✗ Audit scheduling failed');
      allTestsPassed = false;
    }

    // Test 2: Create a finding
    console.log('\nTest 2: Create a security finding...');
    const finding = await securityAuditService.createFinding({
      auditId: 'test-audit',
      title: 'Test Finding',
      description: 'Test description',
      severity: VulnerabilitySeverity.MEDIUM,
      status: FindingStatus.OPEN,
      affectedComponent: 'Test Component',
      discoveredDate: new Date(),
      remediationSteps: 'Test remediation',
      riskScore: 5,
      exploitability: 5,
      impact: 5,
      evidence: [],
      references: []
    });

    if (finding && finding.id && finding.title === 'Test Finding') {
      console.log('✓ Finding creation works');
    } else {
      console.log('✗ Finding creation failed');
      allTestsPassed = false;
    }

    // Test 3: Update finding status
    console.log('\nTest 3: Update finding status...');
    const updatedFinding = await securityAuditService.updateFindingStatus(
      finding.id,
      FindingStatus.RESOLVED,
      new Date()
    );

    if (updatedFinding && updatedFinding.status === FindingStatus.RESOLVED) {
      console.log('✓ Finding status update works');
    } else {
      console.log('✗ Finding status update failed');
      allTestsPassed = false;
    }

    // Test 4: Query findings
    console.log('\nTest 4: Query findings...');
    const openFindings = await securityAuditService.getOpenFindings();
    const criticalFindings = await securityAuditService.getFindingsBySeverity(VulnerabilitySeverity.CRITICAL);

    if (Array.isArray(openFindings) && Array.isArray(criticalFindings)) {
      console.log('✓ Finding queries work');
    } else {
      console.log('✗ Finding queries failed');
      allTestsPassed = false;
    }

    // Test 5: Generate report
    console.log('\nTest 5: Generate audit report...');
    const report = await securityAuditService.generateAuditReport(audit.id);

    if (report && report.includes('Security Audit Report')) {
      console.log('✓ Report generation works');
    } else {
      console.log('✗ Report generation failed');
      allTestsPassed = false;
    }

    // Test 6: Conduct vulnerability scan
    console.log('\nTest 6: Conduct vulnerability scan...');
    console.log('(This may take a few seconds...)');
    const scanResult = await securityAuditService.conductVulnerabilityScan();

    if (scanResult && scanResult.scanId && scanResult.vulnerabilities) {
      console.log('✓ Vulnerability scanning works');
      console.log(`  Found ${scanResult.findings.length} findings`);
      console.log(`  Critical: ${scanResult.vulnerabilities.critical}`);
      console.log(`  High: ${scanResult.vulnerabilities.high}`);
      console.log(`  Medium: ${scanResult.vulnerabilities.medium}`);
      console.log(`  Low: ${scanResult.vulnerabilities.low}`);
      console.log(`  Info: ${scanResult.vulnerabilities.info}`);
    } else {
      console.log('✗ Vulnerability scanning failed');
      allTestsPassed = false;
    }

    // Test 7: Track penetration test
    console.log('\nTest 7: Track penetration test...');
    const penTestResult = await securityAuditService.trackPenetrationTest(
      ['https://example.com'],
      'OWASP Testing Guide',
      [],
      'Test summary',
      'Test details',
      ['Test recommendation'],
      'Test Tester',
      3600
    );

    if (penTestResult && penTestResult.testId) {
      console.log('✓ Penetration test tracking works');
    } else {
      console.log('✗ Penetration test tracking failed');
      allTestsPassed = false;
    }

    console.log();
    console.log('='.repeat(80));
    
    if (allTestsPassed) {
      console.log('✓ All tests passed! Security Audit System is functional.');
      console.log('='.repeat(80));
      process.exit(0);
    } else {
      console.log('✗ Some tests failed. Please review the output above.');
      console.log('='.repeat(80));
      process.exit(1);
    }

  } catch (error) {
    console.error('\n✗ Verification failed with error:');
    console.error(error);
    console.log('='.repeat(80));
    process.exit(1);
  }
}

// Run verification
verifySecurityAuditSystem();
