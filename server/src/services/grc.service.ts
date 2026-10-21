/**
 * Governance, Risk & Compliance (GRC) Service
 * Business logic for risk management, compliance monitoring, and audit management
 */


import { v4 as uuidv4 } from 'uuid';
import {
  RiskItem,
  RiskItemData,
  Mitigation,
  RiskCategory,
  RiskStatus,
  MitigationStatus,
  ComplianceRequirement,
  ComplianceRequirementData,
  Control,
  ComplianceStatus,
  AuditPlan,
  AuditPlanData,
  AuditFinding,
  RiskHeatMapMatrix,
} from '../models/GRC';

import prisma from '../config/prisma';

export class GRCService {
  /**
   * Task 27.1: Implement risk management
   * Create a new risk item with likelihood and impact
   */
  async createRiskItem(data: {
    title: string;
    description: string;
    category: RiskCategory;
    likelihood: number;
    impact: number;
    owner: string;
    ownerName?: string;
    identifiedDate?: Date;
    notes?: string;
    createdBy?: string;
  }): Promise<RiskItem> {
    // Validate likelihood and impact (1-5)
    if (data.likelihood < 1 || data.likelihood > 5) {
      throw new Error('Likelihood must be between 1 and 5');
    }
    if (data.impact < 1 || data.impact > 5) {
      throw new Error('Impact must be between 1 and 5');
    }

    // Calculate risk score (likelihood × impact)
    const riskScore = data.likelihood * data.impact;

    // Generate risk number
    const riskNumber = await this.generateRiskNumber();

    const riskRecord = await prisma.riskItem.create({
      data: {
        id: uuidv4(),
        riskNumber,
        title: data.title,
        description: data.description,
        category: data.category,
        likelihood: data.likelihood,
        impact: data.impact,
        riskScore,
        owner: data.owner,
        ownerName: data.ownerName,
        status: 'identified',
        mitigations: [],
        identifiedDate: data.identifiedDate || new Date(),
        notes: data.notes,
        createdBy: data.createdBy,
        updatedBy: data.createdBy,
      },
    });

    return new RiskItem({
      ...riskRecord,
      mitigations: riskRecord.mitigations as Mitigation[],
      createdAt: riskRecord.createdAt,
      updatedAt: riskRecord.updatedAt,
    });
  }

  /**
   * Update risk assessment (likelihood and impact)
   * Automatically recalculates risk score
   */
  async assessRisk(
    riskId: string,
    likelihood: number,
    impact: number,
    userId?: string
  ): Promise<RiskItem> {
    // Validate likelihood and impact (1-5)
    if (likelihood < 1 || likelihood > 5) {
      throw new Error('Likelihood must be between 1 and 5');
    }
    if (impact < 1 || impact > 5) {
      throw new Error('Impact must be between 1 and 5');
    }

    // Calculate risk score
    const riskScore = likelihood * impact;

    const riskRecord = await prisma.riskItem.update({
      where: { id: riskId },
      data: {
        likelihood,
        impact,
        riskScore,
        status: 'assessed',
        lastAssessmentDate: new Date(),
        updatedBy: userId,
      },
    });

    return new RiskItem({
      ...riskRecord,
      mitigations: riskRecord.mitigations as Mitigation[],
      createdAt: riskRecord.createdAt,
      updatedAt: riskRecord.updatedAt,
    });
  }

  /**
   * Add mitigation action to a risk
   * Tracks action, owner, and due date
   */
  async addMitigation(
    riskId: string,
    mitigation: {
      action: string;
      owner: string;
      ownerName?: string;
      dueDate: Date;
      notes?: string;
    },
    userId?: string
  ): Promise<RiskItem> {
    const risk = await prisma.riskItem.findUnique({
      where: { id: riskId },
    });

    if (!risk) {
      throw new Error('Risk not found');
    }

    const mitigations = risk.mitigations as Mitigation[];
    const newMitigation: Mitigation = {
      id: uuidv4(),
      action: mitigation.action,
      owner: mitigation.owner,
      ownerName: mitigation.ownerName,
      dueDate: mitigation.dueDate,
      status: 'planned',
      notes: mitigation.notes,
    };

    mitigations.push(newMitigation);

    const riskRecord = await prisma.riskItem.update({
      where: { id: riskId },
      data: {
        mitigations: mitigations as any,
        status: 'mitigating',
        updatedBy: userId,
      },
    });

    return new RiskItem({
      ...riskRecord,
      mitigations: riskRecord.mitigations as Mitigation[],
      createdAt: riskRecord.createdAt,
      updatedAt: riskRecord.updatedAt,
    });
  }

  /**
   * Update mitigation status
   */
  async updateMitigation(
    riskId: string,
    mitigationId: string,
    updates: {
      status?: MitigationStatus;
      effectiveness?: number;
      completedDate?: Date;
      notes?: string;
    },
    userId?: string
  ): Promise<RiskItem> {
    const risk = await prisma.riskItem.findUnique({
      where: { id: riskId },
    });

    if (!risk) {
      throw new Error('Risk not found');
    }

    const mitigations = risk.mitigations as Mitigation[];
    const mitigationIndex = mitigations.findIndex((m) => m.id === mitigationId);

    if (mitigationIndex === -1) {
      throw new Error('Mitigation not found');
    }

    // Update mitigation
    mitigations[mitigationIndex] = {
      ...mitigations[mitigationIndex],
      ...updates,
    };

    const riskRecord = await prisma.riskItem.update({
      where: { id: riskId },
      data: {
        mitigations: mitigations as any,
        updatedBy: userId,
      },
    });

    return new RiskItem({
      ...riskRecord,
      mitigations: riskRecord.mitigations as Mitigation[],
      createdAt: riskRecord.createdAt,
      updatedAt: riskRecord.updatedAt,
    });
  }

  /**
   * Get all risks with optional filtering
   */
  async getRisks(filters?: {
    category?: RiskCategory;
    status?: RiskStatus;
    minRiskScore?: number;
    maxRiskScore?: number;
    owner?: string;
  }): Promise<RiskItem[]> {
    const where: any = {};

    if (filters?.category) {
      where.category = filters.category;
    }
    if (filters?.status) {
      where.status = filters.status;
    }
    if (filters?.minRiskScore !== undefined) {
      where.riskScore = { ...where.riskScore, gte: filters.minRiskScore };
    }
    if (filters?.maxRiskScore !== undefined) {
      where.riskScore = { ...where.riskScore, lte: filters.maxRiskScore };
    }
    if (filters?.owner) {
      where.owner = filters.owner;
    }

    const risks = await prisma.riskItem.findMany({
      where,
      orderBy: [{ riskScore: 'desc' }, { identifiedDate: 'desc' }],
    });

    return risks.map(
      (risk) =>
        new RiskItem({
          ...risk,
          mitigations: risk.mitigations as Mitigation[],
          createdAt: risk.createdAt,
          updatedAt: risk.updatedAt,
        })
    );
  }

  /**
   * Get risk by ID
   */
  async getRiskById(riskId: string): Promise<RiskItem | null> {
    const risk = await prisma.riskItem.findUnique({
      where: { id: riskId },
    });

    if (!risk) {
      return null;
    }

    return new RiskItem({
      ...risk,
      mitigations: risk.mitigations as Mitigation[],
      createdAt: risk.createdAt,
      updatedAt: risk.updatedAt,
    });
  }

  /**
   * Update risk status
   */
  async updateRiskStatus(
    riskId: string,
    status: RiskStatus,
    userId?: string
  ): Promise<RiskItem> {
    const riskRecord = await prisma.riskItem.update({
      where: { id: riskId },
      data: {
        status,
        updatedBy: userId,
      },
    });

    return new RiskItem({
      ...riskRecord,
      mitigations: riskRecord.mitigations as Mitigation[],
      createdAt: riskRecord.createdAt,
      updatedAt: riskRecord.updatedAt,
    });
  }

  /**
   * Generate risk heat map
   * Creates a 5x5 matrix showing risk distribution by likelihood and impact
   */
  async generateRiskHeatMap(filters?: {
    category?: RiskCategory;
    status?: RiskStatus;
  }): Promise<RiskHeatMapMatrix> {
    const risks = await this.getRisks(filters);

    // Initialize 5x5 matrix (likelihood x impact)
    const matrix: number[][] = Array(5)
      .fill(0)
      .map(() => Array(5).fill(0));

    // Map to store risks by position
    const risksByPosition = new Map<string, RiskItem[]>();

    // Populate matrix and map
    risks.forEach((risk) => {
      const likelihoodIndex = risk.likelihood - 1; // 0-4
      const impactIndex = risk.impact - 1; // 0-4

      matrix[likelihoodIndex][impactIndex]++;

      const key = `${risk.likelihood}-${risk.impact}`;
      if (!risksByPosition.has(key)) {
        risksByPosition.set(key, []);
      }
      risksByPosition.get(key)!.push(risk);
    });

    return {
      matrix,
      risks: risksByPosition,
    };
  }

  /**
   * Get risk statistics
   */
  async getRiskStatistics(): Promise<{
    totalRisks: number;
    byCategory: Record<RiskCategory, number>;
    byStatus: Record<RiskStatus, number>;
    byRiskLevel: { low: number; medium: number; high: number; critical: number };
    averageRiskScore: number;
  }> {
    const risks = await this.getRisks();

    const stats = {
      totalRisks: risks.length,
      byCategory: {
        operational: 0,
        financial: 0,
        strategic: 0,
        compliance: 0,
        reputational: 0,
        cybersecurity: 0,
      } as Record<RiskCategory, number>,
      byStatus: {
        identified: 0,
        assessed: 0,
        mitigating: 0,
        monitoring: 0,
        closed: 0,
      } as Record<RiskStatus, number>,
      byRiskLevel: {
        low: 0, // 1-6
        medium: 0, // 7-12
        high: 0, // 13-19
        critical: 0, // 20-25
      },
      averageRiskScore: 0,
    };

    let totalScore = 0;

    risks.forEach((risk) => {
      // By category
      stats.byCategory[risk.category]++;

      // By status
      stats.byStatus[risk.status]++;

      // By risk level
      if (risk.riskScore <= 6) {
        stats.byRiskLevel.low++;
      } else if (risk.riskScore <= 12) {
        stats.byRiskLevel.medium++;
      } else if (risk.riskScore <= 19) {
        stats.byRiskLevel.high++;
      } else {
        stats.byRiskLevel.critical++;
      }

      totalScore += risk.riskScore;
    });

    stats.averageRiskScore = risks.length > 0 ? totalScore / risks.length : 0;

    return stats;
  }

  /**
   * Generate risk number (RISK-YYYY-NNNN)
   */
  private async generateRiskNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `RISK-${year}-`;

    const lastRisk = await prisma.riskItem.findFirst({
      where: {
        riskNumber: {
          startsWith: prefix,
        },
      },
      orderBy: {
        riskNumber: 'desc',
      },
    });

    let nextNumber = 1;
    if (lastRisk) {
      const lastNumber = parseInt(lastRisk.riskNumber.split('-')[2]);
      nextNumber = lastNumber + 1;
    }

    return `${prefix}${nextNumber.toString().padStart(4, '0')}`;
  }

  /**
   * Delete risk
   */
  async deleteRisk(riskId: string): Promise<void> {
    await prisma.riskItem.delete({
      where: { id: riskId },
    });
  }

  // ==================== Compliance Management ====================
  // Task 27.2: Implement compliance management

  /**
   * Create compliance requirement
   * Requirements: 14.3 - Link to controls and evidence
   */
  async createComplianceRequirement(data: {
    regulation: string;
    requirement: string;
    applicability: string;
    controls?: Control[];
    notes?: string;
    createdBy?: string;
  }): Promise<ComplianceRequirement> {
    const requirementNumber = await this.generateComplianceNumber();

    const record = await prisma.complianceRequirement.create({
      data: {
        id: uuidv4(),
        requirementNumber,
        regulation: data.regulation,
        requirement: data.requirement,
        applicability: data.applicability,
        controls: (data.controls || []) as any,
        status: 'not_assessed',
        notes: data.notes,
        createdBy: data.createdBy,
        updatedBy: data.createdBy,
      },
    });

    return new ComplianceRequirement({
      ...record,
      controls: record.controls as Control[],
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    });
  }

  /**
   * Get all compliance requirements with optional filtering
   */
  async getComplianceRequirements(filters?: {
    regulation?: string;
    status?: ComplianceStatus;
  }): Promise<ComplianceRequirement[]> {
    const where: any = {};

    if (filters?.regulation) {
      where.regulation = { contains: filters.regulation, mode: 'insensitive' };
    }
    if (filters?.status) {
      where.status = filters.status;
    }

    const requirements = await prisma.complianceRequirement.findMany({
      where,
      orderBy: [{ regulation: 'asc' }, { requirementNumber: 'asc' }],
    });

    return requirements.map(
      (req) =>
        new ComplianceRequirement({
          ...req,
          controls: req.controls as Control[],
          createdAt: req.createdAt,
          updatedAt: req.updatedAt,
        })
    );
  }

  /**
   * Get compliance requirement by ID
   */
  async getComplianceRequirementById(id: string): Promise<ComplianceRequirement | null> {
    const requirement = await prisma.complianceRequirement.findUnique({
      where: { id },
    });

    if (!requirement) {
      return null;
    }

    return new ComplianceRequirement({
      ...requirement,
      controls: requirement.controls as Control[],
      createdAt: requirement.createdAt,
      updatedAt: requirement.updatedAt,
    });
  }

  /**
   * Add control to compliance requirement
   * Requirements: 14.3 - Link controls to requirements
   */
  async addControl(
    requirementId: string,
    control: {
      name: string;
      description: string;
      controlType: string;
      frequency: string;
      owner: string;
      ownerName?: string;
    },
    userId?: string
  ): Promise<ComplianceRequirement> {
    const requirement = await prisma.complianceRequirement.findUnique({
      where: { id: requirementId },
    });

    if (!requirement) {
      throw new Error('Compliance requirement not found');
    }

    const controls = requirement.controls as Control[];
    const newControl: Control = {
      id: uuidv4(),
      name: control.name,
      description: control.description,
      controlType: control.controlType as any,
      frequency: control.frequency as any,
      owner: control.owner,
      ownerName: control.ownerName,
      evidence: [],
    };

    controls.push(newControl);

    const record = await prisma.complianceRequirement.update({
      where: { id: requirementId },
      data: {
        controls: controls as any,
        updatedBy: userId,
      },
    });

    return new ComplianceRequirement({
      ...record,
      controls: record.controls as Control[],
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    });
  }

  /**
   * Update control
   */
  async updateControl(
    requirementId: string,
    controlId: string,
    updates: {
      name?: string;
      description?: string;
      controlType?: string;
      frequency?: string;
      owner?: string;
      ownerName?: string;
    },
    userId?: string
  ): Promise<ComplianceRequirement> {
    const requirement = await prisma.complianceRequirement.findUnique({
      where: { id: requirementId },
    });

    if (!requirement) {
      throw new Error('Compliance requirement not found');
    }

    const controls = requirement.controls as Control[];
    const controlIndex = controls.findIndex((c) => c.id === controlId);

    if (controlIndex === -1) {
      throw new Error('Control not found');
    }

    // Update control
    controls[controlIndex] = {
      ...controls[controlIndex],
      ...updates,
    };

    const record = await prisma.complianceRequirement.update({
      where: { id: requirementId },
      data: {
        controls: controls as any,
        updatedBy: userId,
      },
    });

    return new ComplianceRequirement({
      ...record,
      controls: record.controls as Control[],
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    });
  }

  /**
   * Add evidence to control
   * Requirements: 14.3 - Track control evidence
   */
  async addControlEvidence(
    requirementId: string,
    controlId: string,
    evidenceId: string,
    userId?: string
  ): Promise<ComplianceRequirement> {
    const requirement = await prisma.complianceRequirement.findUnique({
      where: { id: requirementId },
    });

    if (!requirement) {
      throw new Error('Compliance requirement not found');
    }

    const controls = requirement.controls as Control[];
    const controlIndex = controls.findIndex((c) => c.id === controlId);

    if (controlIndex === -1) {
      throw new Error('Control not found');
    }

    // Add evidence if not already present
    if (!controls[controlIndex].evidence.includes(evidenceId)) {
      controls[controlIndex].evidence.push(evidenceId);
    }

    const record = await prisma.complianceRequirement.update({
      where: { id: requirementId },
      data: {
        controls: controls as any,
        updatedBy: userId,
      },
    });

    return new ComplianceRequirement({
      ...record,
      controls: record.controls as Control[],
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    });
  }

  /**
   * Remove evidence from control
   */
  async removeControlEvidence(
    requirementId: string,
    controlId: string,
    evidenceId: string,
    userId?: string
  ): Promise<ComplianceRequirement> {
    const requirement = await prisma.complianceRequirement.findUnique({
      where: { id: requirementId },
    });

    if (!requirement) {
      throw new Error('Compliance requirement not found');
    }

    const controls = requirement.controls as Control[];
    const controlIndex = controls.findIndex((c) => c.id === controlId);

    if (controlIndex === -1) {
      throw new Error('Control not found');
    }

    // Remove evidence
    controls[controlIndex].evidence = controls[controlIndex].evidence.filter(
      (e) => e !== evidenceId
    );

    const record = await prisma.complianceRequirement.update({
      where: { id: requirementId },
      data: {
        controls: controls as any,
        updatedBy: userId,
      },
    });

    return new ComplianceRequirement({
      ...record,
      controls: record.controls as Control[],
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    });
  }

  /**
   * Assess control effectiveness
   * Requirements: 14.4 - Evaluate control effectiveness
   */
  async assessControlEffectiveness(
    requirementId: string,
    controlId: string,
    assessment: {
      effectiveness: number; // 0-100
      lastTestDate: Date;
      nextTestDate?: Date;
      notes?: string;
    },
    userId?: string
  ): Promise<ComplianceRequirement> {
    // Validate effectiveness (0-100)
    if (assessment.effectiveness < 0 || assessment.effectiveness > 100) {
      throw new Error('Effectiveness must be between 0 and 100');
    }

    const requirement = await prisma.complianceRequirement.findUnique({
      where: { id: requirementId },
    });

    if (!requirement) {
      throw new Error('Compliance requirement not found');
    }

    const controls = requirement.controls as Control[];
    const controlIndex = controls.findIndex((c) => c.id === controlId);

    if (controlIndex === -1) {
      throw new Error('Control not found');
    }

    // Update control assessment
    controls[controlIndex] = {
      ...controls[controlIndex],
      effectiveness: assessment.effectiveness,
      lastTestDate: assessment.lastTestDate,
      nextTestDate: assessment.nextTestDate,
    };

    // Update requirement status based on control effectiveness
    const avgEffectiveness = this.calculateAverageEffectiveness(controls);
    let status: ComplianceStatus = 'not_assessed';
    
    if (avgEffectiveness >= 90) {
      status = 'compliant';
    } else if (avgEffectiveness >= 70) {
      status = 'partially_compliant';
    } else if (avgEffectiveness > 0) {
      status = 'non_compliant';
    }

    const record = await prisma.complianceRequirement.update({
      where: { id: requirementId },
      data: {
        controls: controls as any,
        status,
        lastAssessmentDate: new Date(),
        updatedBy: userId,
      },
    });

    return new ComplianceRequirement({
      ...record,
      controls: record.controls as Control[],
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    });
  }

  /**
   * Calculate average effectiveness of controls
   */
  private calculateAverageEffectiveness(controls: Control[]): number {
    const assessedControls = controls.filter((c) => c.effectiveness !== undefined);
    
    if (assessedControls.length === 0) {
      return 0;
    }

    const total = assessedControls.reduce((sum, c) => sum + (c.effectiveness || 0), 0);
    return total / assessedControls.length;
  }

  /**
   * Update compliance requirement status
   */
  async updateComplianceStatus(
    requirementId: string,
    status: ComplianceStatus,
    userId?: string
  ): Promise<ComplianceRequirement> {
    const record = await prisma.complianceRequirement.update({
      where: { id: requirementId },
      data: {
        status,
        lastAssessmentDate: new Date(),
        updatedBy: userId,
      },
    });

    return new ComplianceRequirement({
      ...record,
      controls: record.controls as Control[],
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    });
  }

  /**
   * Get compliance statistics
   */
  async getComplianceStatistics(): Promise<{
    totalRequirements: number;
    byStatus: Record<ComplianceStatus, number>;
    byRegulation: Record<string, number>;
    totalControls: number;
    averageControlEffectiveness: number;
    controlsDueForTesting: number;
  }> {
    const requirements = await this.getComplianceRequirements();

    const stats = {
      totalRequirements: requirements.length,
      byStatus: {
        compliant: 0,
        non_compliant: 0,
        partially_compliant: 0,
        not_assessed: 0,
      } as Record<ComplianceStatus, number>,
      byRegulation: {} as Record<string, number>,
      totalControls: 0,
      averageControlEffectiveness: 0,
      controlsDueForTesting: 0,
    };

    let totalEffectiveness = 0;
    let assessedControlsCount = 0;
    const today = new Date();

    requirements.forEach((req) => {
      // By status
      stats.byStatus[req.status]++;

      // By regulation
      if (!stats.byRegulation[req.regulation]) {
        stats.byRegulation[req.regulation] = 0;
      }
      stats.byRegulation[req.regulation]++;

      // Controls
      stats.totalControls += req.controls.length;

      req.controls.forEach((control) => {
        if (control.effectiveness !== undefined) {
          totalEffectiveness += control.effectiveness;
          assessedControlsCount++;
        }

        // Check if due for testing
        if (control.nextTestDate && control.nextTestDate <= today) {
          stats.controlsDueForTesting++;
        }
      });
    });

    stats.averageControlEffectiveness =
      assessedControlsCount > 0 ? totalEffectiveness / assessedControlsCount : 0;

    return stats;
  }

  /**
   * Delete compliance requirement
   */
  async deleteComplianceRequirement(requirementId: string): Promise<void> {
    await prisma.complianceRequirement.delete({
      where: { id: requirementId },
    });
  }

  /**
   * Delete control from requirement
   */
  async deleteControl(
    requirementId: string,
    controlId: string,
    userId?: string
  ): Promise<ComplianceRequirement> {
    const requirement = await prisma.complianceRequirement.findUnique({
      where: { id: requirementId },
    });

    if (!requirement) {
      throw new Error('Compliance requirement not found');
    }

    const controls = requirement.controls as Control[];
    const filteredControls = controls.filter((c) => c.id !== controlId);

    if (filteredControls.length === controls.length) {
      throw new Error('Control not found');
    }

    const record = await prisma.complianceRequirement.update({
      where: { id: requirementId },
      data: {
        controls: filteredControls as any,
        updatedBy: userId,
      },
    });

    return new ComplianceRequirement({
      ...record,
      controls: record.controls as Control[],
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    });
  }

  /**
   * Generate compliance requirement number (COMP-YYYY-NNNN)
   */
  private async generateComplianceNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `COMP-${year}-`;

    const lastReq = await prisma.complianceRequirement.findFirst({
      where: {
        requirementNumber: {
          startsWith: prefix,
        },
      },
      orderBy: {
        requirementNumber: 'desc',
      },
    });

    let nextNumber = 1;
    if (lastReq) {
      const lastNumber = parseInt(lastReq.requirementNumber.split('-')[2]);
      nextNumber = lastNumber + 1;
    }

    return `${prefix}${nextNumber.toString().padStart(4, '0')}`;
  }

  // ==================== Audit Management ====================

  /**
   * Helper function to convert Prisma audit record to AuditPlan
   */
  private convertToAuditPlan(record: any): AuditPlan {
    return new AuditPlan({
      ...record,
      auditType: record.auditType as any,
      status: record.status as any,
      auditors: record.auditors as unknown as string[],
      auditorNames: record.auditorNames as unknown as string[] | undefined,
      findings: record.findings as unknown as AuditFinding[],
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    });
  }

  /**
   * Task 27.3: Implement audit management
   * Create audit plan with schedule and auditor assignment
   * Requirements: 14.6 - Schedule audits and assign auditors
   */
  async createAuditPlan(data: {
    auditType: string;
    scope: string;
    startDate: Date;
    endDate: Date;
    auditors: string[];
    auditorNames?: string[];
    notes?: string;
    createdBy?: string;
  }): Promise<AuditPlan> {
    // Validate dates
    if (data.startDate >= data.endDate) {
      throw new Error('End date must be after start date');
    }

    // Validate auditors
    if (!data.auditors || data.auditors.length === 0) {
      throw new Error('At least one auditor must be assigned');
    }

    const auditNumber = await this.generateAuditNumber();

    const record = await prisma.auditPlan.create({
      data: {
        id: uuidv4(),
        auditNumber,
        auditType: data.auditType,
        scope: data.scope,
        startDate: data.startDate,
        endDate: data.endDate,
        auditors: data.auditors as any,
        auditorNames: data.auditorNames as any,
        findings: [],
        status: 'planning',
        notes: data.notes,
        createdBy: data.createdBy,
        updatedBy: data.createdBy,
      },
    });

    return this.convertToAuditPlan(record);
  }

  /**
   * Get all audit plans with optional filtering
   */
  async getAuditPlans(filters?: {
    auditType?: string;
    status?: string;
    startDate?: Date;
    endDate?: Date;
  }): Promise<AuditPlan[]> {
    const where: any = {};

    if (filters?.auditType) {
      where.auditType = filters.auditType;
    }
    if (filters?.status) {
      where.status = filters.status;
    }
    if (filters?.startDate) {
      where.startDate = { gte: filters.startDate };
    }
    if (filters?.endDate) {
      where.endDate = { lte: filters.endDate };
    }

    const audits = await prisma.auditPlan.findMany({
      where,
      orderBy: [{ startDate: 'desc' }, { createdAt: 'desc' }],
    });

    return audits.map((audit) => this.convertToAuditPlan(audit));
  }

  /**
   * Get audit plan by ID
   */
  async getAuditPlanById(auditId: string): Promise<AuditPlan | null> {
    const audit = await prisma.auditPlan.findUnique({
      where: { id: auditId },
    });

    if (!audit) {
      return null;
    }

    return this.convertToAuditPlan(audit);
  }

  /**
   * Update audit plan
   */
  async updateAuditPlan(
    auditId: string,
    updates: {
      auditType?: string;
      scope?: string;
      startDate?: Date;
      endDate?: Date;
      auditors?: string[];
      auditorNames?: string[];
      notes?: string;
    },
    userId?: string
  ): Promise<AuditPlan> {
    // Validate dates if both are provided
    if (updates.startDate && updates.endDate && updates.startDate >= updates.endDate) {
      throw new Error('End date must be after start date');
    }

    const record = await prisma.auditPlan.update({
      where: { id: auditId },
      data: {
        ...updates,
        auditors: updates.auditors as any,
        auditorNames: updates.auditorNames as any,
        updatedBy: userId,
      },
    });

    return this.convertToAuditPlan(record);
  }

  /**
   * Update audit status
   */
  async updateAuditStatus(
    auditId: string,
    status: string,
    userId?: string
  ): Promise<AuditPlan> {
    const record = await prisma.auditPlan.update({
      where: { id: auditId },
      data: {
        status,
        updatedBy: userId,
      },
    });

    return this.convertToAuditPlan(record);
  }

  /**
   * Add finding to audit
   * Requirements: 14.7 - Record audit findings and track remediation
   */
  async addAuditFinding(
    auditId: string,
    finding: {
      severity: string;
      description: string;
      recommendation: string;
      remediation?: {
        action: string;
        owner: string;
        ownerName?: string;
        dueDate: Date;
        notes?: string;
      };
    },
    userId?: string
  ): Promise<AuditPlan> {
    const audit = await prisma.auditPlan.findUnique({
      where: { id: auditId },
    });

    if (!audit) {
      throw new Error('Audit plan not found');
    }

    const findings = audit.findings as unknown as AuditFinding[];
    const newFinding: AuditFinding = {
      id: uuidv4(),
      severity: finding.severity as any,
      description: finding.description,
      recommendation: finding.recommendation,
      identifiedDate: new Date(),
    };

    // Add remediation if provided
    if (finding.remediation) {
      newFinding.remediation = {
        action: finding.remediation.action,
        owner: finding.remediation.owner,
        ownerName: finding.remediation.ownerName,
        dueDate: finding.remediation.dueDate,
        status: 'open',
        notes: finding.remediation.notes,
      };
    }

    findings.push(newFinding);

    const record = await prisma.auditPlan.update({
      where: { id: auditId },
      data: {
        findings: findings as any,
        updatedBy: userId,
      },
    });

    return this.convertToAuditPlan(record);
  }

  /**
   * Update finding remediation status
   * Requirements: 14.7 - Track remediation status
   */
  async updateFindingRemediation(
    auditId: string,
    findingId: string,
    updates: {
      status?: string;
      completedDate?: Date;
      notes?: string;
    },
    userId?: string
  ): Promise<AuditPlan> {
    const audit = await prisma.auditPlan.findUnique({
      where: { id: auditId },
    });

    if (!audit) {
      throw new Error('Audit plan not found');
    }

    const findings = audit.findings as unknown as AuditFinding[];
    const findingIndex = findings.findIndex((f) => f.id === findingId);

    if (findingIndex === -1) {
      throw new Error('Finding not found');
    }

    if (!findings[findingIndex].remediation) {
      throw new Error('Finding has no remediation plan');
    }

    // Update remediation
    findings[findingIndex].remediation = {
      ...findings[findingIndex].remediation!,
      ...updates,
      status: updates.status as any,
    };

    const record = await prisma.auditPlan.update({
      where: { id: auditId },
      data: {
        findings: findings as any,
        updatedBy: userId,
      },
    });

    return this.convertToAuditPlan(record);
  }

  /**
   * Delete audit plan
   */
  async deleteAuditPlan(auditId: string): Promise<void> {
    await prisma.auditPlan.delete({
      where: { id: auditId },
    });
  }

  /**
   * Get audit statistics
   */
  async getAuditStatistics(): Promise<{
    totalAudits: number;
    byType: Record<string, number>;
    byStatus: Record<string, number>;
    totalFindings: number;
    findingsBySeverity: { low: number; medium: number; high: number; critical: number };
    openRemediations: number;
    overdueRemediations: number;
  }> {
    const audits = await this.getAuditPlans();

    const stats = {
      totalAudits: audits.length,
      byType: {} as Record<string, number>,
      byStatus: {
        planning: 0,
        in_progress: 0,
        completed: 0,
        cancelled: 0,
      } as Record<string, number>,
      totalFindings: 0,
      findingsBySeverity: {
        low: 0,
        medium: 0,
        high: 0,
        critical: 0,
      },
      openRemediations: 0,
      overdueRemediations: 0,
    };

    const today = new Date();

    audits.forEach((audit) => {
      // By type
      if (!stats.byType[audit.auditType]) {
        stats.byType[audit.auditType] = 0;
      }
      stats.byType[audit.auditType]++;

      // By status
      stats.byStatus[audit.status]++;

      // Findings
      stats.totalFindings += audit.findings.length;

      audit.findings.forEach((finding) => {
        // By severity
        stats.findingsBySeverity[finding.severity]++;

        // Remediation tracking
        if (finding.remediation) {
          if (finding.remediation.status === 'open' || finding.remediation.status === 'in_progress') {
            stats.openRemediations++;

            // Check if overdue
            if (finding.remediation.dueDate < today) {
              stats.overdueRemediations++;
            }
          }
        }
      });
    });

    return stats;
  }

  /**
   * Generate audit number (AUDIT-YYYY-NNNN)
   */
  private async generateAuditNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `AUDIT-${year}-`;

    const lastAudit = await prisma.auditPlan.findFirst({
      where: {
        auditNumber: {
          startsWith: prefix,
        },
      },
      orderBy: {
        auditNumber: 'desc',
      },
    });

    let nextNumber = 1;
    if (lastAudit) {
      const lastNumber = parseInt(lastAudit.auditNumber.split('-')[2]);
      nextNumber = lastNumber + 1;
    }

    return `${prefix}${nextNumber.toString().padStart(4, '0')}`;
  }

  // ==================== Compliance Reporting ====================
  // Task 27.4: Implement compliance reporting

  /**
   * Generate SOX compliance report
   * Requirements: 14.8 - Generate SOX compliance reports
   * 
   * SOX (Sarbanes-Oxley Act) focuses on financial reporting controls
   */
  async generateSOXComplianceReport(options?: {
    startDate?: Date;
    endDate?: Date;
  }): Promise<{
    reportDate: Date;
    period: { startDate?: Date; endDate?: Date };
    summary: {
      totalControls: number;
      effectiveControls: number;
      ineffectiveControls: number;
      notTestedControls: number;
      complianceRate: number;
    };
    controlsByType: {
      preventive: number;
      detective: number;
      corrective: number;
    };
    keyControls: Array<{
      requirementNumber: string;
      regulation: string;
      requirement: string;
      controlName: string;
      controlType: string;
      effectiveness: number | undefined;
      status: string;
      owner: string;
      lastTestDate?: Date;
      nextTestDate?: Date;
    }>;
    deficiencies: Array<{
      requirementNumber: string;
      regulation: string;
      requirement: string;
      controlName: string;
      effectiveness: number | undefined;
      issue: string;
      remediation: string;
    }>;
    auditFindings: Array<{
      auditNumber: string;
      auditType: string;
      severity: string;
      description: string;
      recommendation: string;
      remediationStatus?: string;
    }>;
  }> {
    // Get SOX-related compliance requirements
    const soxRequirements = await prisma.complianceRequirement.findMany({
      where: {
        regulation: {
          contains: 'SOX',
          mode: 'insensitive',
        },
      },
    });

    // Get SOX audits
    const soxAudits = await prisma.auditPlan.findMany({
      where: {
        auditType: 'sox',
        ...(options?.startDate && { startDate: { gte: options.startDate } }),
        ...(options?.endDate && { endDate: { lte: options.endDate } }),
      },
    });

    // Initialize summary statistics
    let totalControls = 0;
    let effectiveControls = 0;
    let ineffectiveControls = 0;
    let notTestedControls = 0;

    const controlsByType = {
      preventive: 0,
      detective: 0,
      corrective: 0,
    };

    const keyControls: any[] = [];
    const deficiencies: any[] = [];

    // Process compliance requirements and controls
    soxRequirements.forEach((req) => {
      const controls = req.controls as Control[];
      totalControls += controls.length;

      controls.forEach((control) => {
        // Count by type
        if (control.controlType === 'preventive') controlsByType.preventive++;
        else if (control.controlType === 'detective') controlsByType.detective++;
        else if (control.controlType === 'corrective') controlsByType.corrective++;

        // Determine effectiveness status
        if (control.effectiveness === undefined) {
          notTestedControls++;
        } else if (control.effectiveness >= 70) {
          effectiveControls++;
        } else {
          ineffectiveControls++;
        }

        // Add to key controls list
        keyControls.push({
          requirementNumber: req.requirementNumber,
          regulation: req.regulation,
          requirement: req.requirement,
          controlName: control.name,
          controlType: control.controlType,
          effectiveness: control.effectiveness,
          status:
            control.effectiveness === undefined
              ? 'Not Tested'
              : control.effectiveness >= 70
              ? 'Effective'
              : 'Ineffective',
          owner: control.ownerName || control.owner,
          lastTestDate: control.lastTestDate,
          nextTestDate: control.nextTestDate,
        });

        // Add to deficiencies if ineffective
        if (control.effectiveness !== undefined && control.effectiveness < 70) {
          deficiencies.push({
            requirementNumber: req.requirementNumber,
            regulation: req.regulation,
            requirement: req.requirement,
            controlName: control.name,
            effectiveness: control.effectiveness,
            issue: `Control effectiveness is below threshold (${control.effectiveness}%)`,
            remediation: 'Control requires improvement to meet SOX compliance standards',
          });
        }
      });
    });

    // Process audit findings
    const auditFindings: any[] = [];
    soxAudits.forEach((audit) => {
      const findings = audit.findings as unknown as AuditFinding[];
      findings.forEach((finding) => {
        auditFindings.push({
          auditNumber: audit.auditNumber,
          auditType: audit.auditType,
          severity: finding.severity,
          description: finding.description,
          recommendation: finding.recommendation,
          remediationStatus: finding.remediation?.status,
        });
      });
    });

    // Calculate compliance rate
    const complianceRate =
      totalControls > 0 ? (effectiveControls / totalControls) * 100 : 0;

    return {
      reportDate: new Date(),
      period: {
        startDate: options?.startDate,
        endDate: options?.endDate,
      },
      summary: {
        totalControls,
        effectiveControls,
        ineffectiveControls,
        notTestedControls,
        complianceRate: Math.round(complianceRate * 100) / 100,
      },
      controlsByType,
      keyControls,
      deficiencies,
      auditFindings,
    };
  }

  /**
   * Generate GDPR compliance report
   * Requirements: 14.8 - Generate GDPR compliance reports
   * 
   * GDPR (General Data Protection Regulation) focuses on data privacy and protection
   */
  async generateGDPRComplianceReport(options?: {
    startDate?: Date;
    endDate?: Date;
  }): Promise<{
    reportDate: Date;
    period: { startDate?: Date; endDate?: Date };
    summary: {
      totalRequirements: number;
      compliantRequirements: number;
      partiallyCompliantRequirements: number;
      nonCompliantRequirements: number;
      notAssessedRequirements: number;
      overallComplianceRate: number;
    };
    requirementsByArticle: Record<string, number>;
    dataProtectionControls: Array<{
      requirementNumber: string;
      article: string;
      requirement: string;
      controlName: string;
      controlType: string;
      effectiveness: number | undefined;
      status: ComplianceStatus;
      owner: string;
      lastAssessmentDate?: Date;
    }>;
    gaps: Array<{
      requirementNumber: string;
      article: string;
      requirement: string;
      status: ComplianceStatus;
      issue: string;
      recommendation: string;
    }>;
    dataBreachAudits: Array<{
      auditNumber: string;
      scope: string;
      startDate: Date;
      status: string;
      findingsCount: number;
      criticalFindings: number;
    }>;
  }> {
    // Get GDPR-related compliance requirements
    const gdprRequirements = await prisma.complianceRequirement.findMany({
      where: {
        regulation: {
          contains: 'GDPR',
          mode: 'insensitive',
        },
      },
    });

    // Get data breach and privacy audits
    const dataBreachAudits = await prisma.auditPlan.findMany({
      where: {
        OR: [
          { auditType: 'regulatory' },
          {
            scope: {
              contains: 'data',
              mode: 'insensitive',
            },
          },
          {
            scope: {
              contains: 'privacy',
              mode: 'insensitive',
            },
          },
        ],
        ...(options?.startDate && { startDate: { gte: options.startDate } }),
        ...(options?.endDate && { endDate: { lte: options.endDate } }),
      },
    });

    // Initialize summary statistics
    let compliantRequirements = 0;
    let partiallyCompliantRequirements = 0;
    let nonCompliantRequirements = 0;
    let notAssessedRequirements = 0;

    const requirementsByArticle: Record<string, number> = {};
    const dataProtectionControls: any[] = [];
    const gaps: any[] = [];

    // Process GDPR requirements
    gdprRequirements.forEach((req) => {
      // Count by status
      if (req.status === 'compliant') compliantRequirements++;
      else if (req.status === 'partially_compliant') partiallyCompliantRequirements++;
      else if (req.status === 'non_compliant') nonCompliantRequirements++;
      else notAssessedRequirements++;

      // Extract article number from regulation field (e.g., "GDPR Article 32")
      const articleMatch = req.regulation.match(/Article\s+(\d+)/i);
      const article = articleMatch ? `Article ${articleMatch[1]}` : 'Other';

      if (!requirementsByArticle[article]) {
        requirementsByArticle[article] = 0;
      }
      requirementsByArticle[article]++;

      // Process controls
      const controls = req.controls as Control[];
      controls.forEach((control) => {
        dataProtectionControls.push({
          requirementNumber: req.requirementNumber,
          article,
          requirement: req.requirement,
          controlName: control.name,
          controlType: control.controlType,
          effectiveness: control.effectiveness,
          status: req.status,
          owner: control.ownerName || control.owner,
          lastAssessmentDate: req.lastAssessmentDate,
        });
      });

      // Identify gaps
      if (req.status === 'non_compliant' || req.status === 'partially_compliant') {
        gaps.push({
          requirementNumber: req.requirementNumber,
          article,
          requirement: req.requirement,
          status: req.status,
          issue:
            req.status === 'non_compliant'
              ? 'Requirement is not compliant with GDPR standards'
              : 'Requirement is partially compliant - additional controls needed',
          recommendation:
            'Implement additional data protection controls and conduct regular assessments',
        });
      }
    });

    // Process data breach audits
    const dataBreachAuditSummary = dataBreachAudits.map((audit) => {
      const findings = audit.findings as unknown as AuditFinding[];
      const criticalFindings = findings.filter((f) => f.severity === 'critical').length;

      return {
        auditNumber: audit.auditNumber,
        scope: audit.scope,
        startDate: audit.startDate,
        status: audit.status,
        findingsCount: findings.length,
        criticalFindings,
      };
    });

    // Calculate overall compliance rate
    const totalRequirements = gdprRequirements.length;
    const overallComplianceRate =
      totalRequirements > 0
        ? ((compliantRequirements + partiallyCompliantRequirements * 0.5) / totalRequirements) * 100
        : 0;

    return {
      reportDate: new Date(),
      period: {
        startDate: options?.startDate,
        endDate: options?.endDate,
      },
      summary: {
        totalRequirements,
        compliantRequirements,
        partiallyCompliantRequirements,
        nonCompliantRequirements,
        notAssessedRequirements,
        overallComplianceRate: Math.round(overallComplianceRate * 100) / 100,
      },
      requirementsByArticle,
      dataProtectionControls,
      gaps,
      dataBreachAudits: dataBreachAuditSummary,
    };
  }

  /**
   * Generate custom compliance report
   * Requirements: 14.8 - Create custom compliance reports
   * 
   * Flexible report generation for any regulation or custom criteria
   */
  async generateCustomComplianceReport(options: {
    regulation?: string;
    status?: ComplianceStatus;
    startDate?: Date;
    endDate?: Date;
    includeControls?: boolean;
    includeAudits?: boolean;
    includeRisks?: boolean;
  }): Promise<{
    reportDate: Date;
    filters: {
      regulation?: string;
      status?: ComplianceStatus;
      startDate?: Date;
      endDate?: Date;
    };
    summary: {
      totalRequirements: number;
      byStatus: Record<ComplianceStatus, number>;
      totalControls: number;
      averageControlEffectiveness: number;
      totalAudits?: number;
      totalRisks?: number;
    };
    requirements: Array<{
      requirementNumber: string;
      regulation: string;
      requirement: string;
      status: ComplianceStatus;
      controlsCount: number;
      averageEffectiveness: number;
      lastAssessmentDate?: Date;
      nextAssessmentDate?: Date;
    }>;
    controls?: Array<{
      requirementNumber: string;
      regulation: string;
      controlName: string;
      controlType: string;
      frequency: string;
      effectiveness: number | undefined;
      owner: string;
      lastTestDate?: Date;
      nextTestDate?: Date;
    }>;
    audits?: Array<{
      auditNumber: string;
      auditType: string;
      scope: string;
      startDate: Date;
      endDate: Date;
      status: string;
      findingsCount: number;
      criticalFindings: number;
      highFindings: number;
    }>;
    risks?: Array<{
      riskNumber: string;
      title: string;
      category: RiskCategory;
      riskScore: number;
      status: RiskStatus;
      mitigationsCount: number;
      owner: string;
    }>;
  }> {
    // Build filters for compliance requirements
    const requirementFilters: any = {};
    if (options.regulation) {
      requirementFilters.regulation = {
        contains: options.regulation,
        mode: 'insensitive',
      };
    }
    if (options.status) {
      requirementFilters.status = options.status;
    }

    // Get compliance requirements
    const requirements = await prisma.complianceRequirement.findMany({
      where: requirementFilters,
    });

    // Initialize summary statistics
    const byStatus: Record<ComplianceStatus, number> = {
      compliant: 0,
      non_compliant: 0,
      partially_compliant: 0,
      not_assessed: 0,
    };

    let totalControls = 0;
    let totalEffectiveness = 0;
    let assessedControlsCount = 0;

    const requirementsSummary: any[] = [];
    const controlsList: any[] = [];

    // Process requirements
    requirements.forEach((req) => {
      byStatus[req.status as ComplianceStatus]++;

      const controls = req.controls as Control[];
      totalControls += controls.length;

      let reqEffectivenessSum = 0;
      let reqAssessedControls = 0;

      controls.forEach((control) => {
        if (control.effectiveness !== undefined) {
          totalEffectiveness += control.effectiveness;
          assessedControlsCount++;
          reqEffectivenessSum += control.effectiveness;
          reqAssessedControls++;
        }

        // Add to controls list if requested
        if (options.includeControls) {
          controlsList.push({
            requirementNumber: req.requirementNumber,
            regulation: req.regulation,
            controlName: control.name,
            controlType: control.controlType,
            frequency: control.frequency,
            effectiveness: control.effectiveness,
            owner: control.ownerName || control.owner,
            lastTestDate: control.lastTestDate,
            nextTestDate: control.nextTestDate,
          });
        }
      });

      const avgEffectiveness =
        reqAssessedControls > 0 ? reqEffectivenessSum / reqAssessedControls : 0;

      requirementsSummary.push({
        requirementNumber: req.requirementNumber,
        regulation: req.regulation,
        requirement: req.requirement,
        status: req.status,
        controlsCount: controls.length,
        averageEffectiveness: Math.round(avgEffectiveness * 100) / 100,
        lastAssessmentDate: req.lastAssessmentDate,
        nextAssessmentDate: req.nextAssessmentDate,
      });
    });

    const averageControlEffectiveness =
      assessedControlsCount > 0 ? totalEffectiveness / assessedControlsCount : 0;

    // Build result object
    const result: any = {
      reportDate: new Date(),
      filters: {
        regulation: options.regulation,
        status: options.status,
        startDate: options.startDate,
        endDate: options.endDate,
      },
      summary: {
        totalRequirements: requirements.length,
        byStatus,
        totalControls,
        averageControlEffectiveness: Math.round(averageControlEffectiveness * 100) / 100,
      },
      requirements: requirementsSummary,
    };

    // Add controls if requested
    if (options.includeControls) {
      result.controls = controlsList;
    }

    // Add audits if requested
    if (options.includeAudits) {
      const auditFilters: any = {};
      if (options.startDate) auditFilters.startDate = { gte: options.startDate };
      if (options.endDate) auditFilters.endDate = { lte: options.endDate };

      const audits = await prisma.auditPlan.findMany({
        where: auditFilters,
      });

      result.summary.totalAudits = audits.length;
      result.audits = audits.map((audit) => {
        const findings = audit.findings as unknown as AuditFinding[];
        const criticalFindings = findings.filter((f) => f.severity === 'critical').length;
        const highFindings = findings.filter((f) => f.severity === 'high').length;

        return {
          auditNumber: audit.auditNumber,
          auditType: audit.auditType,
          scope: audit.scope,
          startDate: audit.startDate,
          endDate: audit.endDate,
          status: audit.status,
          findingsCount: findings.length,
          criticalFindings,
          highFindings,
        };
      });
    }

    // Add risks if requested
    if (options.includeRisks) {
      const riskFilters: any = {
        category: 'compliance',
      };

      const risks = await prisma.riskItem.findMany({
        where: riskFilters,
      });

      result.summary.totalRisks = risks.length;
      result.risks = risks.map((risk) => {
        const mitigations = risk.mitigations as Mitigation[];

        return {
          riskNumber: risk.riskNumber,
          title: risk.title,
          category: risk.category,
          riskScore: risk.riskScore,
          status: risk.status,
          mitigationsCount: mitigations.length,
          owner: risk.ownerName || risk.owner,
        };
      });
    }

    return result;
  }
}

export default new GRCService();
