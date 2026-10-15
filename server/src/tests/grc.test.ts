/**
 * GRC Service Tests
 * Unit tests for Governance, Risk & Compliance functionality
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';

import { GRCService } from '../services/grc.service';

import prisma from '../config/prisma';
const grcService = new GRCService();

describe('GRC Service - Risk Management', () => {
  let testRiskId: string;

  afterAll(async () => {
    // Cleanup test data
    if (testRiskId) {
      await prisma.riskItem.delete({ where: { id: testRiskId } }).catch(() => {});
    }
    await prisma.$disconnect();
  });

  describe('Risk Creation and Scoring', () => {
    it('should create a risk with calculated risk score', async () => {
      const risk = await grcService.createRiskItem({
        title: 'Test Operational Risk',
        description: 'This is a test risk for unit testing',
        category: 'operational',
        likelihood: 3,
        impact: 4,
        owner: 'test-user-id',
        ownerName: 'Test User',
        notes: 'Test notes',
      });

      testRiskId = risk.id;

      expect(risk).toBeDefined();
      expect(risk.title).toBe('Test Operational Risk');
      expect(risk.category).toBe('operational');
      expect(risk.likelihood).toBe(3);
      expect(risk.impact).toBe(4);
      expect(risk.riskScore).toBe(12); // 3 × 4 = 12
      expect(risk.status).toBe('identified');
      expect(risk.riskNumber).toMatch(/^RISK-\d{4}-\d{4}$/);
    });

    it('should validate likelihood range (1-5)', async () => {
      await expect(
        grcService.createRiskItem({
          title: 'Invalid Risk',
          description: 'Test',
          category: 'financial',
          likelihood: 6, // Invalid
          impact: 3,
          owner: 'test-user-id',
        })
      ).rejects.toThrow('Likelihood must be between 1 and 5');
    });

    it('should validate impact range (1-5)', async () => {
      await expect(
        grcService.createRiskItem({
          title: 'Invalid Risk',
          description: 'Test',
          category: 'financial',
          likelihood: 3,
          impact: 0, // Invalid
          owner: 'test-user-id',
        })
      ).rejects.toThrow('Impact must be between 1 and 5');
    });
  });

  describe('Risk Assessment', () => {
    it('should update risk assessment and recalculate score', async () => {
      const updatedRisk = await grcService.assessRisk(testRiskId, 5, 5);

      expect(updatedRisk.likelihood).toBe(5);
      expect(updatedRisk.impact).toBe(5);
      expect(updatedRisk.riskScore).toBe(25); // 5 × 5 = 25
      expect(updatedRisk.status).toBe('assessed');
      expect(updatedRisk.lastAssessmentDate).toBeDefined();
    });
  });

  describe('Risk Mitigation', () => {
    it('should add mitigation action to risk', async () => {
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 30);

      const risk = await grcService.addMitigation(
        testRiskId,
        {
          action: 'Implement additional controls',
          owner: 'mitigation-owner-id',
          ownerName: 'Mitigation Owner',
          dueDate,
          notes: 'High priority mitigation',
        }
      );

      expect(risk.mitigations).toHaveLength(1);
      expect(risk.mitigations[0].action).toBe('Implement additional controls');
      expect(risk.mitigations[0].status).toBe('planned');
      expect(risk.status).toBe('mitigating');
    });

    it('should update mitigation status', async () => {
      const risk = await grcService.getRiskById(testRiskId);
      const mitigationId = risk!.mitigations[0].id;

      const updatedRisk = await grcService.updateMitigation(
        testRiskId,
        mitigationId,
        {
          status: 'completed',
          effectiveness: 85,
          completedDate: new Date(),
        }
      );

      expect(updatedRisk.mitigations[0].status).toBe('completed');
      expect(updatedRisk.mitigations[0].effectiveness).toBe(85);
      expect(updatedRisk.mitigations[0].completedDate).toBeDefined();
    });
  });

  describe('Risk Heat Map', () => {
    it('should generate risk heat map matrix', async () => {
      const heatMap = await grcService.generateRiskHeatMap();

      expect(heatMap.matrix).toBeDefined();
      expect(heatMap.matrix).toHaveLength(5); // 5 likelihood levels
      expect(heatMap.matrix[0]).toHaveLength(5); // 5 impact levels
      expect(heatMap.risks).toBeDefined();
    });

    it('should filter heat map by category', async () => {
      const heatMap = await grcService.generateRiskHeatMap({
        category: 'operational',
      });

      expect(heatMap.matrix).toBeDefined();
      // All risks in the map should be operational
      heatMap.risks.forEach((risks) => {
        risks.forEach((risk) => {
          expect(risk.category).toBe('operational');
        });
      });
    });
  });

  describe('Risk Statistics', () => {
    it('should calculate risk statistics', async () => {
      const stats = await grcService.getRiskStatistics();

      expect(stats.totalRisks).toBeGreaterThan(0);
      expect(stats.byCategory).toBeDefined();
      expect(stats.byStatus).toBeDefined();
      expect(stats.byRiskLevel).toBeDefined();
      expect(stats.averageRiskScore).toBeGreaterThan(0);
    });

    it('should categorize risks by risk level', async () => {
      const stats = await grcService.getRiskStatistics();

      expect(stats.byRiskLevel.low).toBeDefined(); // 1-6
      expect(stats.byRiskLevel.medium).toBeDefined(); // 7-12
      expect(stats.byRiskLevel.high).toBeDefined(); // 13-19
      expect(stats.byRiskLevel.critical).toBeDefined(); // 20-25
    });
  });

  describe('Risk Filtering', () => {
    it('should filter risks by category', async () => {
      const risks = await grcService.getRisks({ category: 'operational' });

      risks.forEach((risk) => {
        expect(risk.category).toBe('operational');
      });
    });

    it('should filter risks by status', async () => {
      const risks = await grcService.getRisks({ status: 'mitigating' });

      risks.forEach((risk) => {
        expect(risk.status).toBe('mitigating');
      });
    });

    it('should filter risks by risk score range', async () => {
      const risks = await grcService.getRisks({
        minRiskScore: 20,
        maxRiskScore: 25,
      });

      risks.forEach((risk) => {
        expect(risk.riskScore).toBeGreaterThanOrEqual(20);
        expect(risk.riskScore).toBeLessThanOrEqual(25);
      });
    });
  });
});

describe('GRC Service - Compliance Management', () => {
  let testComplianceId: string;
  let testControlId: string;

  afterAll(async () => {
    // Cleanup test data
    if (testComplianceId) {
      await prisma.complianceRequirement.delete({ where: { id: testComplianceId } }).catch(() => {});
    }
  });

  describe('Compliance Requirement Creation', () => {
    it('should create compliance requirement', async () => {
      const compliance = await grcService.createComplianceRequirement({
        regulation: 'SOX',
        requirement: 'Section 404 - Internal Controls',
        applicability: 'All financial reporting processes',
        notes: 'Annual assessment required',
      });

      testComplianceId = compliance.id;

      expect(compliance).toBeDefined();
      expect(compliance.regulation).toBe('SOX');
      expect(compliance.status).toBe('not_assessed');
      expect(compliance.requirementNumber).toMatch(/^COMP-\d{4}-\d{4}$/);
      expect(compliance.controls).toHaveLength(0);
    });

    it('should get compliance requirement by ID', async () => {
      const compliance = await grcService.getComplianceRequirementById(testComplianceId);

      expect(compliance).toBeDefined();
      expect(compliance!.id).toBe(testComplianceId);
      expect(compliance!.regulation).toBe('SOX');
    });

    it('should get all compliance requirements', async () => {
      const requirements = await grcService.getComplianceRequirements();

      expect(requirements).toBeDefined();
      expect(Array.isArray(requirements)).toBe(true);
      expect(requirements.length).toBeGreaterThan(0);
    });

    it('should filter compliance requirements by regulation', async () => {
      const requirements = await grcService.getComplianceRequirements({
        regulation: 'SOX',
      });

      requirements.forEach((req) => {
        expect(req.regulation.toLowerCase()).toContain('sox');
      });
    });
  });

  describe('Control Management', () => {
    it('should add control to compliance requirement', async () => {
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 90);

      const compliance = await grcService.addControl(
        testComplianceId,
        {
          name: 'Access Control Review',
          description: 'Quarterly review of user access rights',
          controlType: 'detective',
          frequency: 'quarterly',
          owner: 'control-owner-id',
          ownerName: 'Control Owner',
        }
      );

      expect(compliance.controls).toHaveLength(1);
      expect(compliance.controls[0].name).toBe('Access Control Review');
      expect(compliance.controls[0].controlType).toBe('detective');
      expect(compliance.controls[0].frequency).toBe('quarterly');
      expect(compliance.controls[0].evidence).toHaveLength(0);

      testControlId = compliance.controls[0].id;
    });

    it('should update control', async () => {
      const compliance = await grcService.updateControl(
        testComplianceId,
        testControlId,
        {
          name: 'Updated Access Control Review',
          frequency: 'monthly',
        }
      );

      const control = compliance.controls.find((c) => c.id === testControlId);
      expect(control).toBeDefined();
      expect(control!.name).toBe('Updated Access Control Review');
      expect(control!.frequency).toBe('monthly');
    });

    it('should add evidence to control', async () => {
      const evidenceId = 'evidence-doc-123';

      const compliance = await grcService.addControlEvidence(
        testComplianceId,
        testControlId,
        evidenceId
      );

      const control = compliance.controls.find((c) => c.id === testControlId);
      expect(control).toBeDefined();
      expect(control!.evidence).toContain(evidenceId);
    });

    it('should not add duplicate evidence', async () => {
      const evidenceId = 'evidence-doc-123';

      const compliance = await grcService.addControlEvidence(
        testComplianceId,
        testControlId,
        evidenceId
      );

      const control = compliance.controls.find((c) => c.id === testControlId);
      expect(control).toBeDefined();
      expect(control!.evidence.filter((e) => e === evidenceId)).toHaveLength(1);
    });

    it('should remove evidence from control', async () => {
      const evidenceId = 'evidence-doc-123';

      const compliance = await grcService.removeControlEvidence(
        testComplianceId,
        testControlId,
        evidenceId
      );

      const control = compliance.controls.find((c) => c.id === testControlId);
      expect(control).toBeDefined();
      expect(control!.evidence).not.toContain(evidenceId);
    });
  });

  describe('Control Effectiveness Assessment', () => {
    it('should assess control effectiveness', async () => {
      const lastTestDate = new Date();
      const nextTestDate = new Date();
      nextTestDate.setDate(nextTestDate.getDate() + 90);

      const compliance = await grcService.assessControlEffectiveness(
        testComplianceId,
        testControlId,
        {
          effectiveness: 85,
          lastTestDate,
          nextTestDate,
        }
      );

      const control = compliance.controls.find((c) => c.id === testControlId);
      expect(control).toBeDefined();
      expect(control!.effectiveness).toBe(85);
      expect(control!.lastTestDate).toBeDefined();
      expect(control!.nextTestDate).toBeDefined();
    });

    it('should validate effectiveness range (0-100)', async () => {
      await expect(
        grcService.assessControlEffectiveness(
          testComplianceId,
          testControlId,
          {
            effectiveness: 150, // Invalid
            lastTestDate: new Date(),
          }
        )
      ).rejects.toThrow('Effectiveness must be between 0 and 100');
    });

    it('should update compliance status based on control effectiveness', async () => {
      // Add another control with high effectiveness
      const compliance1 = await grcService.addControl(
        testComplianceId,
        {
          name: 'Second Control',
          description: 'Test control',
          controlType: 'preventive',
          frequency: 'monthly',
          owner: 'owner-id',
        }
      );

      const secondControlId = compliance1.controls[1].id;

      // Assess both controls with high effectiveness (>= 90%)
      await grcService.assessControlEffectiveness(
        testComplianceId,
        testControlId,
        {
          effectiveness: 95,
          lastTestDate: new Date(),
        }
      );

      const compliance2 = await grcService.assessControlEffectiveness(
        testComplianceId,
        secondControlId,
        {
          effectiveness: 92,
          lastTestDate: new Date(),
        }
      );

      // Status should be 'compliant' when avg effectiveness >= 90
      expect(compliance2.status).toBe('compliant');
    });
  });

  describe('Compliance Statistics', () => {
    it('should calculate compliance statistics', async () => {
      const stats = await grcService.getComplianceStatistics();

      expect(stats.totalRequirements).toBeGreaterThan(0);
      expect(stats.byStatus).toBeDefined();
      expect(stats.byRegulation).toBeDefined();
      expect(stats.totalControls).toBeGreaterThan(0);
      expect(stats.averageControlEffectiveness).toBeGreaterThanOrEqual(0);
      expect(stats.controlsDueForTesting).toBeGreaterThanOrEqual(0);
    });

    it('should track controls due for testing', async () => {
      // Add a control with past due date
      const compliance = await grcService.addControl(
        testComplianceId,
        {
          name: 'Overdue Control',
          description: 'Test control',
          controlType: 'detective',
          frequency: 'monthly',
          owner: 'owner-id',
        }
      );

      const overdueControlId = compliance.controls[compliance.controls.length - 1].id;

      // Set next test date in the past
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 10);

      await grcService.assessControlEffectiveness(
        testComplianceId,
        overdueControlId,
        {
          effectiveness: 80,
          lastTestDate: new Date(),
          nextTestDate: pastDate,
        }
      );

      const stats = await grcService.getComplianceStatistics();
      expect(stats.controlsDueForTesting).toBeGreaterThan(0);
    });
  });

  describe('Control Deletion', () => {
    it('should delete control from requirement', async () => {
      const compliance = await grcService.deleteControl(
        testComplianceId,
        testControlId
      );

      const control = compliance.controls.find((c) => c.id === testControlId);
      expect(control).toBeUndefined();
    });

    it('should throw error when deleting non-existent control', async () => {
      await expect(
        grcService.deleteControl(testComplianceId, 'non-existent-id')
      ).rejects.toThrow('Control not found');
    });
  });

  describe('Compliance Requirement Deletion', () => {
    it('should delete compliance requirement', async () => {
      await grcService.deleteComplianceRequirement(testComplianceId);

      const compliance = await grcService.getComplianceRequirementById(testComplianceId);
      expect(compliance).toBeNull();

      // Clear testComplianceId so afterAll doesn't try to delete again
      testComplianceId = '';
    });
  });
});

describe('GRC Service - Audit Management', () => {
  let testAuditId: string;

  afterAll(async () => {
    // Cleanup test data
    if (testAuditId) {
      await prisma.auditPlan.delete({ where: { id: testAuditId } }).catch(() => {});
    }
  });

  it('should create audit plan', async () => {
    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + 30);

    const audit = await grcService.createAuditPlan({
      auditType: 'internal',
      scope: 'Financial controls audit',
      startDate,
      endDate,
      auditors: ['auditor-1', 'auditor-2'],
      auditorNames: ['Auditor One', 'Auditor Two'],
      notes: 'Q1 2024 audit',
    });

    testAuditId = audit.id;

    expect(audit).toBeDefined();
    expect(audit.auditType).toBe('internal');
    expect(audit.status).toBe('planning');
    expect(audit.auditors).toHaveLength(2);
    expect(audit.auditNumber).toMatch(/^AUDIT-\d{4}-\d{4}$/);
  });
});
