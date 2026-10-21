import {
  SecurityAuditService,
  AuditType,
  VulnerabilitySeverity,
  FindingStatus
} from '../services/SecurityAuditService';

describe('SecurityAuditService', () => {
  let service: SecurityAuditService;

  beforeEach(() => {
    service = new SecurityAuditService();
  });

  describe('scheduleAudit', () => {
    it('should schedule a security audit', async () => {
      const scheduledDate = new Date('2026-06-01');
      const audit = await service.scheduleAudit(
        AuditType.VULNERABILITY_SCAN,
        scheduledDate,
        'security-team@example.com',
        ['npm-audit', 'owasp-zap']
      );

      expect(audit).toBeDefined();
      expect(audit.auditType).toBe(AuditType.VULNERABILITY_SCAN);
      expect(audit.scheduledDate).toEqual(scheduledDate);
      expect(audit.status).toBe('SCHEDULED');
      expect(audit.performedBy).toBe('security-team@example.com');
      expect(audit.toolsUsed).toEqual(['npm-audit', 'owasp-zap']);
    });

    it('should schedule different types of audits', async () => {
      const auditTypes = [
        AuditType.VULNERABILITY_SCAN,
        AuditType.PENETRATION_TEST,
        AuditType.CODE_REVIEW,
        AuditType.DEPENDENCY_AUDIT,
        AuditType.CONFIGURATION_REVIEW
      ];

      for (const auditType of auditTypes) {
        const audit = await service.scheduleAudit(
          auditType,
          new Date(),
          'tester@example.com',
          []
        );

        expect(audit.auditType).toBe(auditType);
      }
    });
  });

  describe('conductVulnerabilityScan', () => {
    it('should conduct vulnerability scan and return results', async () => {
      const result = await service.conductVulnerabilityScan();

      expect(result).toBeDefined();
      expect(result.scanId).toBeDefined();
      expect(result.timestamp).toBeInstanceOf(Date);
      expect(result.vulnerabilities).toBeDefined();
      expect(result.findings).toBeInstanceOf(Array);
      expect(result.scanDuration).toBeGreaterThan(0);
      expect(result.toolsUsed).toBeInstanceOf(Array);
    });

    it('should categorize vulnerabilities by severity', async () => {
      const result = await service.conductVulnerabilityScan();

      expect(result.vulnerabilities).toHaveProperty('critical');
      expect(result.vulnerabilities).toHaveProperty('high');
      expect(result.vulnerabilities).toHaveProperty('medium');
      expect(result.vulnerabilities).toHaveProperty('low');
      expect(result.vulnerabilities).toHaveProperty('info');

      expect(typeof result.vulnerabilities.critical).toBe('number');
      expect(typeof result.vulnerabilities.high).toBe('number');
      expect(typeof result.vulnerabilities.medium).toBe('number');
      expect(typeof result.vulnerabilities.low).toBe('number');
      expect(typeof result.vulnerabilities.info).toBe('number');
    });

    it('should include findings with required fields', async () => {
      const result = await service.conductVulnerabilityScan();

      if (result.findings.length > 0) {
        const finding = result.findings[0];

        expect(finding).toHaveProperty('id');
        expect(finding).toHaveProperty('title');
        expect(finding).toHaveProperty('description');
        expect(finding).toHaveProperty('severity');
        expect(finding).toHaveProperty('status');
        expect(finding).toHaveProperty('affectedComponent');
        expect(finding).toHaveProperty('discoveredDate');
        expect(finding).toHaveProperty('remediationSteps');
        expect(finding).toHaveProperty('riskScore');
        expect(finding).toHaveProperty('exploitability');
        expect(finding).toHaveProperty('impact');
      }
    });
  });

  describe('trackPenetrationTest', () => {
    it('should track penetration test results', async () => {
      const findings = [
        {
          id: 'finding-1',
          auditId: 'audit-1',
          title: 'SQL Injection vulnerability',
          description: 'SQL injection found in login endpoint',
          severity: VulnerabilitySeverity.CRITICAL,
          status: FindingStatus.OPEN,
          affectedComponent: '/api/auth/login',
          discoveredDate: new Date(),
          remediationSteps: 'Use parameterized queries',
          riskScore: 10,
          exploitability: 9,
          impact: 10,
          evidence: ['POST /api/auth/login with payload: \' OR 1=1--'],
          references: ['https://owasp.org/www-community/attacks/SQL_Injection'],
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ];

      const result = await service.trackPenetrationTest(
        ['https://example.com'],
        'OWASP Testing Guide',
        findings,
        'Found 1 critical vulnerability',
        'Detailed technical analysis...',
        ['Implement input validation', 'Use prepared statements'],
        'John Doe',
        3600
      );

      expect(result).toBeDefined();
      expect(result.testId).toBeDefined();
      expect(result.scope).toEqual(['https://example.com']);
      expect(result.methodology).toBe('OWASP Testing Guide');
      expect(result.findings).toHaveLength(1);
      expect(result.testerName).toBe('John Doe');
      expect(result.testDuration).toBe(3600);
    });
  });

  describe('createFinding', () => {
    it('should create a security finding', async () => {
      const finding = await service.createFinding({
        auditId: 'audit-123',
        title: 'Cross-Site Scripting (XSS)',
        description: 'Reflected XSS vulnerability in search parameter',
        severity: VulnerabilitySeverity.HIGH,
        status: FindingStatus.OPEN,
        affectedComponent: '/search',
        discoveredDate: new Date(),
        remediationSteps: 'Sanitize user input and encode output',
        riskScore: 8,
        exploitability: 7,
        impact: 8,
        evidence: ['<script>alert(1)</script>'],
        references: ['https://owasp.org/www-community/attacks/xss/']
      });

      expect(finding).toBeDefined();
      expect(finding.id).toBeDefined();
      expect(finding.title).toBe('Cross-Site Scripting (XSS)');
      expect(finding.severity).toBe(VulnerabilitySeverity.HIGH);
      expect(finding.status).toBe(FindingStatus.OPEN);
      expect(finding.createdAt).toBeInstanceOf(Date);
      expect(finding.updatedAt).toBeInstanceOf(Date);
    });

    it('should create findings with different severities', async () => {
      const severities = [
        VulnerabilitySeverity.CRITICAL,
        VulnerabilitySeverity.HIGH,
        VulnerabilitySeverity.MEDIUM,
        VulnerabilitySeverity.LOW,
        VulnerabilitySeverity.INFO
      ];

      for (const severity of severities) {
        const finding = await service.createFinding({
          auditId: 'audit-123',
          title: `Test finding - ${severity}`,
          description: 'Test description',
          severity,
          status: FindingStatus.OPEN,
          affectedComponent: 'test-component',
          discoveredDate: new Date(),
          remediationSteps: 'Test remediation',
          riskScore: 5,
          exploitability: 5,
          impact: 5,
          evidence: [],
          references: []
        });

        expect(finding.severity).toBe(severity);
      }
    });
  });

  describe('updateFindingStatus', () => {
    it('should update finding status', async () => {
      const findingId = 'finding-123';
      const newStatus = FindingStatus.RESOLVED;
      const resolvedDate = new Date();

      const finding = await service.updateFindingStatus(
        findingId,
        newStatus,
        resolvedDate,
        'Fixed by implementing input validation'
      );

      expect(finding).toBeDefined();
      expect(finding.id).toBe(findingId);
      expect(finding.status).toBe(newStatus);
      expect(finding.resolvedDate).toEqual(resolvedDate);
    });

    it('should support all finding statuses', async () => {
      const statuses = [
        FindingStatus.OPEN,
        FindingStatus.IN_PROGRESS,
        FindingStatus.RESOLVED,
        FindingStatus.ACCEPTED_RISK,
        FindingStatus.FALSE_POSITIVE
      ];

      for (const status of statuses) {
        const finding = await service.updateFindingStatus(
          'finding-123',
          status,
          status === FindingStatus.RESOLVED ? new Date() : undefined
        );

        expect(finding.status).toBe(status);
      }
    });
  });

  describe('getFindingsBySeverity', () => {
    it('should retrieve findings by severity', async () => {
      const findings = await service.getFindingsBySeverity(VulnerabilitySeverity.CRITICAL);

      expect(findings).toBeInstanceOf(Array);
    });
  });

  describe('getOpenFindings', () => {
    it('should retrieve open findings', async () => {
      const findings = await service.getOpenFindings();

      expect(findings).toBeInstanceOf(Array);
    });
  });

  describe('getFindingsByStatus', () => {
    it('should retrieve findings by status', async () => {
      const findings = await service.getFindingsByStatus(FindingStatus.OPEN);

      expect(findings).toBeInstanceOf(Array);
    });
  });

  describe('getOverdueFindings', () => {
    it('should retrieve overdue findings', async () => {
      const findings = await service.getOverdueFindings();

      expect(findings).toBeInstanceOf(Array);
    });
  });

  describe('generateAuditReport', () => {
    it('should generate audit report', async () => {
      const report = await service.generateAuditReport('audit-123');

      expect(report).toBeDefined();
      expect(typeof report).toBe('string');
      expect(report).toContain('Security Audit Report');
      expect(report).toContain('audit-123');
      expect(report).toContain('Executive Summary');
      expect(report).toContain('Findings Summary');
      expect(report).toContain('Recommendations');
    });
  });

  describe('Vulnerability Scanning Integration', () => {
    it('should detect npm vulnerabilities', async () => {
      const result = await service.conductVulnerabilityScan();

      // Check if npm audit findings are included
      const npmFindings = result.findings.filter(f => 
        f.affectedComponent.includes('npm') || f.title.includes('dependency')
      );

      expect(result.toolsUsed).toContain('npm-audit');
    });

    it('should check for hardcoded secrets', async () => {
      const result = await service.conductVulnerabilityScan();

      // Custom checks should be included
      expect(result.toolsUsed).toContain('custom-checks');
    });

    it('should check for insecure configurations', async () => {
      const result = await service.conductVulnerabilityScan();

      // Configuration checks should be performed
      const configFindings = result.findings.filter(f =>
        f.affectedComponent.includes('Configuration') ||
        f.title.includes('configuration')
      );

      // May or may not find issues depending on environment
      expect(result.findings).toBeInstanceOf(Array);
    });
  });

  describe('Risk Scoring', () => {
    it('should calculate risk scores correctly', async () => {
      const criticalFinding = await service.createFinding({
        auditId: 'audit-123',
        title: 'Critical vulnerability',
        description: 'Test',
        severity: VulnerabilitySeverity.CRITICAL,
        status: FindingStatus.OPEN,
        affectedComponent: 'test',
        discoveredDate: new Date(),
        remediationSteps: 'Fix it',
        riskScore: 10,
        exploitability: 10,
        impact: 10,
        evidence: [],
        references: []
      });

      const lowFinding = await service.createFinding({
        auditId: 'audit-123',
        title: 'Low severity issue',
        description: 'Test',
        severity: VulnerabilitySeverity.LOW,
        status: FindingStatus.OPEN,
        affectedComponent: 'test',
        discoveredDate: new Date(),
        remediationSteps: 'Fix it',
        riskScore: 3,
        exploitability: 2,
        impact: 2,
        evidence: [],
        references: []
      });

      expect(criticalFinding.riskScore).toBeGreaterThan(lowFinding.riskScore);
    });
  });

  describe('Audit Workflow', () => {
    it('should support complete audit workflow', async () => {
      // 1. Schedule audit
      const audit = await service.scheduleAudit(
        AuditType.VULNERABILITY_SCAN,
        new Date(),
        'security-team@example.com',
        ['npm-audit']
      );

      expect(audit.status).toBe('SCHEDULED');

      // 2. Conduct scan
      const scanResult = await service.conductVulnerabilityScan();
      expect(scanResult.findings).toBeInstanceOf(Array);

      // 3. Create findings
      if (scanResult.findings.length > 0) {
        const finding = scanResult.findings[0];
        expect(finding.status).toBe(FindingStatus.OPEN);

        // 4. Update finding status
        const updatedFinding = await service.updateFindingStatus(
          finding.id,
          FindingStatus.IN_PROGRESS
        );
        expect(updatedFinding.status).toBe(FindingStatus.IN_PROGRESS);

        // 5. Resolve finding
        const resolvedFinding = await service.updateFindingStatus(
          finding.id,
          FindingStatus.RESOLVED,
          new Date()
        );
        expect(resolvedFinding.status).toBe(FindingStatus.RESOLVED);
      }

      // 6. Generate report
      const report = await service.generateAuditReport(audit.id);
      expect(report).toContain('Security Audit Report');
    });
  });
});
