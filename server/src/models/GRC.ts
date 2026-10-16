/**
 * Governance, Risk, and Compliance (GRC) Models
 * Type definitions for GRC entities including risk management, compliance, and audit
 */

import { BaseEntity, BaseEntityData } from './BaseEntity';

// ==================== Risk Management Models ====================

export type RiskCategory =
  | 'operational'
  | 'financial'
  | 'strategic'
  | 'compliance'
  | 'reputational'
  | 'cybersecurity';

export type RiskStatus = 'identified' | 'assessed' | 'mitigating' | 'monitoring' | 'closed';

export type MitigationStatus = 'planned' | 'in_progress' | 'completed' | 'cancelled';

export interface Mitigation {
  id: string;
  action: string;
  owner: string;
  ownerName?: string;
  dueDate: Date;
  status: MitigationStatus;
  effectiveness?: number; // 0-100
  completedDate?: Date;
  notes?: string;
}

export interface RiskItemData extends BaseEntityData {
  riskNumber: string;
  title: string;
  description: string;
  category: RiskCategory;
  likelihood: number; // 1-5
  impact: number; // 1-5
  riskScore: number; // likelihood × impact (1-25)
  owner: string;
  ownerName?: string;
  status: RiskStatus;
  mitigations: Mitigation[];
  identifiedDate: Date;
  lastAssessmentDate?: Date;
  notes?: string;
}

export class RiskItem extends BaseEntity implements RiskItemData {
  riskNumber: string;
  title: string;
  description: string;
  category: RiskCategory;
  likelihood: number;
  impact: number;
  riskScore: number;
  owner: string;
  ownerName?: string;
  status: RiskStatus;
  mitigations: Mitigation[];
  identifiedDate: Date;
  lastAssessmentDate?: Date;
  notes?: string;

  constructor(data: RiskItemData) {
    super(data);
    this.riskNumber = data.riskNumber;
    this.title = data.title;
    this.description = data.description;
    this.category = data.category;
    this.likelihood = data.likelihood;
    this.impact = data.impact;
    this.riskScore = data.riskScore;
    this.owner = data.owner;
    this.ownerName = data.ownerName;
    this.status = data.status;
    this.mitigations = data.mitigations;
    this.identifiedDate = data.identifiedDate;
    this.lastAssessmentDate = data.lastAssessmentDate;
    this.notes = data.notes;
  }

  toJSON(): Record<string, unknown> {
    return {
      ...super.toJSON(),
      riskNumber: this.riskNumber,
      title: this.title,
      description: this.description,
      category: this.category,
      likelihood: this.likelihood,
      impact: this.impact,
      riskScore: this.riskScore,
      owner: this.owner,
      ownerName: this.ownerName,
      status: this.status,
      mitigations: this.mitigations,
      identifiedDate: this.identifiedDate,
      lastAssessmentDate: this.lastAssessmentDate,
      notes: this.notes,
    };
  }
}

// ==================== Compliance Management Models ====================

export type ComplianceStatus = 'compliant' | 'non_compliant' | 'partially_compliant' | 'not_assessed';

export type ControlType = 'preventive' | 'detective' | 'corrective';

export type Frequency = 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'annually' | 'ad_hoc';

export interface Control {
  id: string;
  name: string;
  description: string;
  controlType: ControlType;
  frequency: Frequency;
  owner: string;
  ownerName?: string;
  evidence: string[]; // Document IDs
  effectiveness?: number; // 0-100
  lastTestDate?: Date;
  nextTestDate?: Date;
}

export interface ComplianceRequirementData extends BaseEntityData {
  requirementNumber: string;
  regulation: string;
  requirement: string;
  applicability: string;
  controls: Control[];
  status: ComplianceStatus;
  lastAssessmentDate?: Date;
  nextAssessmentDate?: Date;
  notes?: string;
}

export class ComplianceRequirement extends BaseEntity implements ComplianceRequirementData {
  requirementNumber: string;
  regulation: string;
  requirement: string;
  applicability: string;
  controls: Control[];
  status: ComplianceStatus;
  lastAssessmentDate?: Date;
  nextAssessmentDate?: Date;
  notes?: string;

  constructor(data: ComplianceRequirementData) {
    super(data);
    this.requirementNumber = data.requirementNumber;
    this.regulation = data.regulation;
    this.requirement = data.requirement;
    this.applicability = data.applicability;
    this.controls = data.controls;
    this.status = data.status;
    this.lastAssessmentDate = data.lastAssessmentDate;
    this.nextAssessmentDate = data.nextAssessmentDate;
    this.notes = data.notes;
  }

  toJSON(): Record<string, unknown> {
    return {
      ...super.toJSON(),
      requirementNumber: this.requirementNumber,
      regulation: this.regulation,
      requirement: this.requirement,
      applicability: this.applicability,
      controls: this.controls,
      status: this.status,
      lastAssessmentDate: this.lastAssessmentDate,
      nextAssessmentDate: this.nextAssessmentDate,
      notes: this.notes,
    };
  }
}

// ==================== Audit Management Models ====================

export type AuditType = 'internal' | 'external' | 'regulatory' | 'sox';

export type AuditStatus = 'planning' | 'in_progress' | 'completed' | 'cancelled';

export type Severity = 'low' | 'medium' | 'high' | 'critical';

export type RemediationStatus = 'open' | 'in_progress' | 'completed' | 'accepted_risk';

export interface Remediation {
  action: string;
  owner: string;
  ownerName?: string;
  dueDate: Date;
  status: RemediationStatus;
  completedDate?: Date;
  notes?: string;
}

export interface AuditFinding {
  id: string;
  severity: Severity;
  description: string;
  recommendation: string;
  remediation?: Remediation;
  identifiedDate: Date;
}

export interface AuditPlanData extends BaseEntityData {
  auditNumber: string;
  auditType: AuditType;
  scope: string;
  startDate: Date;
  endDate: Date;
  auditors: string[]; // User IDs
  auditorNames?: string[];
  findings: AuditFinding[];
  status: AuditStatus;
  notes?: string;
}

export class AuditPlan extends BaseEntity implements AuditPlanData {
  auditNumber: string;
  auditType: AuditType;
  scope: string;
  startDate: Date;
  endDate: Date;
  auditors: string[];
  auditorNames?: string[];
  findings: AuditFinding[];
  status: AuditStatus;
  notes?: string;

  constructor(data: AuditPlanData) {
    super(data);
    this.auditNumber = data.auditNumber;
    this.auditType = data.auditType;
    this.scope = data.scope;
    this.startDate = data.startDate;
    this.endDate = data.endDate;
    this.auditors = data.auditors;
    this.auditorNames = data.auditorNames;
    this.findings = data.findings;
    this.status = data.status;
    this.notes = data.notes;
  }

  toJSON(): Record<string, unknown> {
    return {
      ...super.toJSON(),
      auditNumber: this.auditNumber,
      auditType: this.auditType,
      scope: this.scope,
      startDate: this.startDate,
      endDate: this.endDate,
      auditors: this.auditors,
      auditorNames: this.auditorNames,
      findings: this.findings,
      status: this.status,
      notes: this.notes,
    };
  }
}

// ==================== Risk Heat Map Data ====================

export interface RiskHeatMapData {
  category: RiskCategory;
  risks: Array<{
    id: string;
    title: string;
    likelihood: number;
    impact: number;
    riskScore: number;
    status: RiskStatus;
  }>;
}

export interface RiskHeatMapMatrix {
  matrix: number[][]; // 5x5 matrix with risk counts
  risks: Map<string, RiskItem[]>; // Key: "likelihood-impact", Value: array of risks
}
