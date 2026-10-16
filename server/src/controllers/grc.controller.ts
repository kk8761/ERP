/**
 * Governance, Risk & Compliance (GRC) Controller
 * Handles HTTP requests for risk management, compliance, and audit
 */

import { Request, Response } from 'express';
import grcService from '../services/grc.service';
import { RiskCategory, RiskStatus, MitigationStatus } from '../models/GRC';

export class GRCController {
  /**
   * Task 27.1: Create risk item
   * POST /api/grc/risks
   */
  async createRisk(req: Request, res: Response): Promise<void> {
    try {
      const {
        title,
        description,
        category,
        likelihood,
        impact,
        owner,
        ownerName,
        identifiedDate,
        notes,
      } = req.body;

      // Validation
      if (!title || !description || !category || !likelihood || !impact || !owner) {
        res.status(400).json({
          success: false,
          message: 'Missing required fields: title, description, category, likelihood, impact, owner',
        });
        return;
      }

      const risk = await grcService.createRiskItem({
        title,
        description,
        category: category as RiskCategory,
        likelihood: parseInt(likelihood),
        impact: parseInt(impact),
        owner,
        ownerName,
        identifiedDate: identifiedDate ? new Date(identifiedDate) : undefined,
        notes,
        createdBy: req.user?.id,
      });

      res.status(201).json({
        success: true,
        message: 'Risk created successfully',
        data: risk,
      });
    } catch (error: any) {
      console.error('Error creating risk:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to create risk',
      });
    }
  }

  /**
   * Get all risks with optional filtering
   * GET /api/grc/risks
   */
  async getRisks(req: Request, res: Response): Promise<void> {
    try {
      const { category, status, minRiskScore, maxRiskScore, owner } = req.query;

      const filters: any = {};
      if (category) filters.category = category as RiskCategory;
      if (status) filters.status = status as RiskStatus;
      if (minRiskScore) filters.minRiskScore = parseInt(minRiskScore as string);
      if (maxRiskScore) filters.maxRiskScore = parseInt(maxRiskScore as string);
      if (owner) filters.owner = owner as string;

      const risks = await grcService.getRisks(filters);

      res.json({
        success: true,
        data: risks,
      });
    } catch (error: any) {
      console.error('Error fetching risks:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to fetch risks',
      });
    }
  }

  /**
   * Get risk by ID
   * GET /api/grc/risks/:id
   */
  async getRiskById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const risk = await grcService.getRiskById(id);

      if (!risk) {
        res.status(404).json({
          success: false,
          message: 'Risk not found',
        });
        return;
      }

      res.json({
        success: true,
        data: risk,
      });
    } catch (error: any) {
      console.error('Error fetching risk:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to fetch risk',
      });
    }
  }

  /**
   * Update risk assessment (likelihood and impact)
   * PUT /api/grc/risks/:id/assess
   */
  async assessRisk(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { likelihood, impact } = req.body;

      if (!likelihood || !impact) {
        res.status(400).json({
          success: false,
          message: 'Missing required fields: likelihood, impact',
        });
        return;
      }

      const risk = await grcService.assessRisk(
        id,
        parseInt(likelihood),
        parseInt(impact),
        req.user?.id
      );

      res.json({
        success: true,
        message: 'Risk assessed successfully',
        data: risk,
      });
    } catch (error: any) {
      console.error('Error assessing risk:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to assess risk',
      });
    }
  }

  /**
   * Add mitigation to risk
   * POST /api/grc/risks/:id/mitigations
   */
  async addMitigation(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { action, owner, ownerName, dueDate, notes } = req.body;

      if (!action || !owner || !dueDate) {
        res.status(400).json({
          success: false,
          message: 'Missing required fields: action, owner, dueDate',
        });
        return;
      }

      const risk = await grcService.addMitigation(
        id,
        {
          action,
          owner,
          ownerName,
          dueDate: new Date(dueDate),
          notes,
        },
        req.user?.id
      );

      res.status(201).json({
        success: true,
        message: 'Mitigation added successfully',
        data: risk,
      });
    } catch (error: any) {
      console.error('Error adding mitigation:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to add mitigation',
      });
    }
  }

  /**
   * Update mitigation status
   * PUT /api/grc/risks/:id/mitigations/:mitigationId
   */
  async updateMitigation(req: Request, res: Response): Promise<void> {
    try {
      const { id, mitigationId } = req.params;
      const { status, effectiveness, completedDate, notes } = req.body;

      const updates: any = {};
      if (status) updates.status = status as MitigationStatus;
      if (effectiveness !== undefined) updates.effectiveness = parseInt(effectiveness);
      if (completedDate) updates.completedDate = new Date(completedDate);
      if (notes !== undefined) updates.notes = notes;

      const risk = await grcService.updateMitigation(id, mitigationId, updates, req.user?.id);

      res.json({
        success: true,
        message: 'Mitigation updated successfully',
        data: risk,
      });
    } catch (error: any) {
      console.error('Error updating mitigation:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to update mitigation',
      });
    }
  }

  /**
   * Update risk status
   * PUT /api/grc/risks/:id/status
   */
  async updateRiskStatus(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { status } = req.body;

      if (!status) {
        res.status(400).json({
          success: false,
          message: 'Missing required field: status',
        });
        return;
      }

      const risk = await grcService.updateRiskStatus(id, status as RiskStatus, req.user?.id);

      res.json({
        success: true,
        message: 'Risk status updated successfully',
        data: risk,
      });
    } catch (error: any) {
      console.error('Error updating risk status:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to update risk status',
      });
    }
  }

  /**
   * Delete risk
   * DELETE /api/grc/risks/:id
   */
  async deleteRisk(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      await grcService.deleteRisk(id);

      res.json({
        success: true,
        message: 'Risk deleted successfully',
      });
    } catch (error: any) {
      console.error('Error deleting risk:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to delete risk',
      });
    }
  }

  /**
   * Generate risk heat map
   * GET /api/grc/risks/heatmap
   */
  async getRiskHeatMap(req: Request, res: Response): Promise<void> {
    try {
      const { category, status } = req.query;

      const filters: any = {};
      if (category) filters.category = category as RiskCategory;
      if (status) filters.status = status as RiskStatus;

      const heatMap = await grcService.generateRiskHeatMap(filters);

      // Convert Map to object for JSON serialization
      const risksObject: Record<string, any> = {};
      heatMap.risks.forEach((risks, key) => {
        risksObject[key] = risks;
      });

      res.json({
        success: true,
        data: {
          matrix: heatMap.matrix,
          risks: risksObject,
        },
      });
    } catch (error: any) {
      console.error('Error generating heat map:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to generate heat map',
      });
    }
  }

  /**
   * Get risk statistics
   * GET /api/grc/risks/statistics
   */
  async getRiskStatistics(req: Request, res: Response): Promise<void> {
    try {
      const stats = await grcService.getRiskStatistics();

      res.json({
        success: true,
        data: stats,
      });
    } catch (error: any) {
      console.error('Error fetching risk statistics:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to fetch risk statistics',
      });
    }
  }

  // ==================== Compliance Management ====================
  // Task 27.2: Implement compliance management

  /**
   * Create compliance requirement
   * POST /api/grc/compliance
   */
  async createComplianceRequirement(req: Request, res: Response): Promise<void> {
    try {
      const { regulation, requirement, applicability, controls, notes } = req.body;

      if (!regulation || !requirement || !applicability) {
        res.status(400).json({
          success: false,
          message: 'Missing required fields: regulation, requirement, applicability',
        });
        return;
      }

      const complianceReq = await grcService.createComplianceRequirement({
        regulation,
        requirement,
        applicability,
        controls,
        notes,
        createdBy: req.user?.id,
      });

      res.status(201).json({
        success: true,
        message: 'Compliance requirement created successfully',
        data: complianceReq,
      });
    } catch (error: any) {
      console.error('Error creating compliance requirement:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to create compliance requirement',
      });
    }
  }

  /**
   * Get all compliance requirements with optional filtering
   * GET /api/grc/compliance
   */
  async getComplianceRequirements(req: Request, res: Response): Promise<void> {
    try {
      const { regulation, status } = req.query;

      const filters: any = {};
      if (regulation) filters.regulation = regulation as string;
      if (status) filters.status = status as any;

      const requirements = await grcService.getComplianceRequirements(filters);

      res.json({
        success: true,
        data: requirements,
      });
    } catch (error: any) {
      console.error('Error fetching compliance requirements:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to fetch compliance requirements',
      });
    }
  }

  /**
   * Get compliance requirement by ID
   * GET /api/grc/compliance/:id
   */
  async getComplianceRequirementById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const requirement = await grcService.getComplianceRequirementById(id);

      if (!requirement) {
        res.status(404).json({
          success: false,
          message: 'Compliance requirement not found',
        });
        return;
      }

      res.json({
        success: true,
        data: requirement,
      });
    } catch (error: any) {
      console.error('Error fetching compliance requirement:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to fetch compliance requirement',
      });
    }
  }

  /**
   * Add control to compliance requirement
   * POST /api/grc/compliance/:id/controls
   */
  async addControl(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { name, description, controlType, frequency, owner, ownerName } = req.body;

      if (!name || !description || !controlType || !frequency || !owner) {
        res.status(400).json({
          success: false,
          message: 'Missing required fields: name, description, controlType, frequency, owner',
        });
        return;
      }

      const requirement = await grcService.addControl(
        id,
        {
          name,
          description,
          controlType,
          frequency,
          owner,
          ownerName,
        },
        req.user?.id
      );

      res.status(201).json({
        success: true,
        message: 'Control added successfully',
        data: requirement,
      });
    } catch (error: any) {
      console.error('Error adding control:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to add control',
      });
    }
  }

  /**
   * Update control
   * PUT /api/grc/compliance/:id/controls/:controlId
   */
  async updateControl(req: Request, res: Response): Promise<void> {
    try {
      const { id, controlId } = req.params;
      const { name, description, controlType, frequency, owner, ownerName } = req.body;

      const updates: any = {};
      if (name) updates.name = name;
      if (description) updates.description = description;
      if (controlType) updates.controlType = controlType;
      if (frequency) updates.frequency = frequency;
      if (owner) updates.owner = owner;
      if (ownerName !== undefined) updates.ownerName = ownerName;

      const requirement = await grcService.updateControl(id, controlId, updates, req.user?.id);

      res.json({
        success: true,
        message: 'Control updated successfully',
        data: requirement,
      });
    } catch (error: any) {
      console.error('Error updating control:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to update control',
      });
    }
  }

  /**
   * Delete control
   * DELETE /api/grc/compliance/:id/controls/:controlId
   */
  async deleteControl(req: Request, res: Response): Promise<void> {
    try {
      const { id, controlId } = req.params;

      const requirement = await grcService.deleteControl(id, controlId, req.user?.id);

      res.json({
        success: true,
        message: 'Control deleted successfully',
        data: requirement,
      });
    } catch (error: any) {
      console.error('Error deleting control:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to delete control',
      });
    }
  }

  /**
   * Add evidence to control
   * POST /api/grc/compliance/:id/controls/:controlId/evidence
   */
  async addControlEvidence(req: Request, res: Response): Promise<void> {
    try {
      const { id, controlId } = req.params;
      const { evidenceId } = req.body;

      if (!evidenceId) {
        res.status(400).json({
          success: false,
          message: 'Missing required field: evidenceId',
        });
        return;
      }

      const requirement = await grcService.addControlEvidence(
        id,
        controlId,
        evidenceId,
        req.user?.id
      );

      res.json({
        success: true,
        message: 'Evidence added successfully',
        data: requirement,
      });
    } catch (error: any) {
      console.error('Error adding evidence:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to add evidence',
      });
    }
  }

  /**
   * Remove evidence from control
   * DELETE /api/grc/compliance/:id/controls/:controlId/evidence/:evidenceId
   */
  async removeControlEvidence(req: Request, res: Response): Promise<void> {
    try {
      const { id, controlId, evidenceId } = req.params;

      const requirement = await grcService.removeControlEvidence(
        id,
        controlId,
        evidenceId,
        req.user?.id
      );

      res.json({
        success: true,
        message: 'Evidence removed successfully',
        data: requirement,
      });
    } catch (error: any) {
      console.error('Error removing evidence:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to remove evidence',
      });
    }
  }

  /**
   * Assess control effectiveness
   * POST /api/grc/compliance/:id/controls/:controlId/assess
   */
  async assessControlEffectiveness(req: Request, res: Response): Promise<void> {
    try {
      const { id, controlId } = req.params;
      const { effectiveness, lastTestDate, nextTestDate, notes } = req.body;

      if (effectiveness === undefined || !lastTestDate) {
        res.status(400).json({
          success: false,
          message: 'Missing required fields: effectiveness, lastTestDate',
        });
        return;
      }

      const requirement = await grcService.assessControlEffectiveness(
        id,
        controlId,
        {
          effectiveness: parseInt(effectiveness),
          lastTestDate: new Date(lastTestDate),
          nextTestDate: nextTestDate ? new Date(nextTestDate) : undefined,
          notes,
        },
        req.user?.id
      );

      res.json({
        success: true,
        message: 'Control effectiveness assessed successfully',
        data: requirement,
      });
    } catch (error: any) {
      console.error('Error assessing control effectiveness:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to assess control effectiveness',
      });
    }
  }

  /**
   * Update compliance requirement status
   * PUT /api/grc/compliance/:id/status
   */
  async updateComplianceStatus(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { status } = req.body;

      if (!status) {
        res.status(400).json({
          success: false,
          message: 'Missing required field: status',
        });
        return;
      }

      const requirement = await grcService.updateComplianceStatus(id, status, req.user?.id);

      res.json({
        success: true,
        message: 'Compliance status updated successfully',
        data: requirement,
      });
    } catch (error: any) {
      console.error('Error updating compliance status:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to update compliance status',
      });
    }
  }

  /**
   * Delete compliance requirement
   * DELETE /api/grc/compliance/:id
   */
  async deleteComplianceRequirement(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      await grcService.deleteComplianceRequirement(id);

      res.json({
        success: true,
        message: 'Compliance requirement deleted successfully',
      });
    } catch (error: any) {
      console.error('Error deleting compliance requirement:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to delete compliance requirement',
      });
    }
  }

  /**
   * Get compliance statistics
   * GET /api/grc/compliance/statistics
   */
  async getComplianceStatistics(req: Request, res: Response): Promise<void> {
    try {
      const stats = await grcService.getComplianceStatistics();

      res.json({
        success: true,
        data: stats,
      });
    } catch (error: any) {
      console.error('Error fetching compliance statistics:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to fetch compliance statistics',
      });
    }
  }

  /**
   * Task 27.3: Create audit plan
   * POST /api/grc/audits
   */
  async createAuditPlan(req: Request, res: Response): Promise<void> {
    try {
      const { auditType, scope, startDate, endDate, auditors, auditorNames, notes } = req.body;

      if (!auditType || !scope || !startDate || !endDate || !auditors) {
        res.status(400).json({
          success: false,
          message: 'Missing required fields: auditType, scope, startDate, endDate, auditors',
        });
        return;
      }

      const audit = await grcService.createAuditPlan({
        auditType,
        scope,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        auditors,
        auditorNames,
        notes,
        createdBy: req.user?.id,
      });

      res.status(201).json({
        success: true,
        message: 'Audit plan created successfully',
        data: audit,
      });
    } catch (error: any) {
      console.error('Error creating audit plan:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to create audit plan',
      });
    }
  }

  /**
   * Get all audit plans with optional filtering
   * GET /api/grc/audits
   */
  async getAuditPlans(req: Request, res: Response): Promise<void> {
    try {
      const { auditType, status, startDate, endDate } = req.query;

      const filters: any = {};
      if (auditType) filters.auditType = auditType as string;
      if (status) filters.status = status as string;
      if (startDate) filters.startDate = new Date(startDate as string);
      if (endDate) filters.endDate = new Date(endDate as string);

      const audits = await grcService.getAuditPlans(filters);

      res.json({
        success: true,
        data: audits,
      });
    } catch (error: any) {
      console.error('Error fetching audit plans:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to fetch audit plans',
      });
    }
  }

  /**
   * Get audit plan by ID
   * GET /api/grc/audits/:id
   */
  async getAuditPlanById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const audit = await grcService.getAuditPlanById(id);

      if (!audit) {
        res.status(404).json({
          success: false,
          message: 'Audit plan not found',
        });
        return;
      }

      res.json({
        success: true,
        data: audit,
      });
    } catch (error: any) {
      console.error('Error fetching audit plan:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to fetch audit plan',
      });
    }
  }

  /**
   * Update audit plan
   * PUT /api/grc/audits/:id
   */
  async updateAuditPlan(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { auditType, scope, startDate, endDate, auditors, auditorNames, notes } = req.body;

      const updates: any = {};
      if (auditType) updates.auditType = auditType;
      if (scope) updates.scope = scope;
      if (startDate) updates.startDate = new Date(startDate);
      if (endDate) updates.endDate = new Date(endDate);
      if (auditors) updates.auditors = auditors;
      if (auditorNames !== undefined) updates.auditorNames = auditorNames;
      if (notes !== undefined) updates.notes = notes;

      const audit = await grcService.updateAuditPlan(id, updates, req.user?.id);

      res.json({
        success: true,
        message: 'Audit plan updated successfully',
        data: audit,
      });
    } catch (error: any) {
      console.error('Error updating audit plan:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to update audit plan',
      });
    }
  }

  /**
   * Update audit status
   * PUT /api/grc/audits/:id/status
   */
  async updateAuditStatus(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { status } = req.body;

      if (!status) {
        res.status(400).json({
          success: false,
          message: 'Missing required field: status',
        });
        return;
      }

      const audit = await grcService.updateAuditStatus(id, status, req.user?.id);

      res.json({
        success: true,
        message: 'Audit status updated successfully',
        data: audit,
      });
    } catch (error: any) {
      console.error('Error updating audit status:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to update audit status',
      });
    }
  }

  /**
   * Delete audit plan
   * DELETE /api/grc/audits/:id
   */
  async deleteAuditPlan(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      await grcService.deleteAuditPlan(id);

      res.json({
        success: true,
        message: 'Audit plan deleted successfully',
      });
    } catch (error: any) {
      console.error('Error deleting audit plan:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to delete audit plan',
      });
    }
  }

  /**
   * Add finding to audit
   * POST /api/grc/audits/:id/findings
   */
  async addAuditFinding(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { severity, description, recommendation, remediation } = req.body;

      if (!severity || !description || !recommendation) {
        res.status(400).json({
          success: false,
          message: 'Missing required fields: severity, description, recommendation',
        });
        return;
      }

      // Parse remediation if provided
      let remediationData;
      if (remediation) {
        remediationData = {
          action: remediation.action,
          owner: remediation.owner,
          ownerName: remediation.ownerName,
          dueDate: new Date(remediation.dueDate),
          notes: remediation.notes,
        };
      }

      const audit = await grcService.addAuditFinding(
        id,
        {
          severity,
          description,
          recommendation,
          remediation: remediationData,
        },
        req.user?.id
      );

      res.status(201).json({
        success: true,
        message: 'Audit finding added successfully',
        data: audit,
      });
    } catch (error: any) {
      console.error('Error adding audit finding:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to add audit finding',
      });
    }
  }

  /**
   * Update finding remediation status
   * PUT /api/grc/audits/:id/findings/:findingId/remediation
   */
  async updateFindingRemediation(req: Request, res: Response): Promise<void> {
    try {
      const { id, findingId } = req.params;
      const { status, completedDate, notes } = req.body;

      const updates: any = {};
      if (status) updates.status = status;
      if (completedDate) updates.completedDate = new Date(completedDate);
      if (notes !== undefined) updates.notes = notes;

      const audit = await grcService.updateFindingRemediation(id, findingId, updates, req.user?.id);

      res.json({
        success: true,
        message: 'Finding remediation updated successfully',
        data: audit,
      });
    } catch (error: any) {
      console.error('Error updating finding remediation:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to update finding remediation',
      });
    }
  }

  /**
   * Get audit statistics
   * GET /api/grc/audits/statistics
   */
  async getAuditStatistics(req: Request, res: Response): Promise<void> {
    try {
      const stats = await grcService.getAuditStatistics();

      res.json({
        success: true,
        data: stats,
      });
    } catch (error: any) {
      console.error('Error fetching audit statistics:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to fetch audit statistics',
      });
    }
  }

  // ==================== Compliance Reporting ====================
  // Task 27.4: Implement compliance reporting

  /**
   * Generate SOX compliance report
   * GET /api/grc/reports/sox
   */
  async generateSOXReport(req: Request, res: Response): Promise<void> {
    try {
      const { startDate, endDate } = req.query;

      const options: any = {};
      if (startDate) options.startDate = new Date(startDate as string);
      if (endDate) options.endDate = new Date(endDate as string);

      const report = await grcService.generateSOXComplianceReport(options);

      res.json({
        success: true,
        message: 'SOX compliance report generated successfully',
        data: report,
      });
    } catch (error: any) {
      console.error('Error generating SOX report:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to generate SOX compliance report',
      });
    }
  }

  /**
   * Generate GDPR compliance report
   * GET /api/grc/reports/gdpr
   */
  async generateGDPRReport(req: Request, res: Response): Promise<void> {
    try {
      const { startDate, endDate } = req.query;

      const options: any = {};
      if (startDate) options.startDate = new Date(startDate as string);
      if (endDate) options.endDate = new Date(endDate as string);

      const report = await grcService.generateGDPRComplianceReport(options);

      res.json({
        success: true,
        message: 'GDPR compliance report generated successfully',
        data: report,
      });
    } catch (error: any) {
      console.error('Error generating GDPR report:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to generate GDPR compliance report',
      });
    }
  }

  /**
   * Generate custom compliance report
   * GET /api/grc/reports/custom
   */
  async generateCustomReport(req: Request, res: Response): Promise<void> {
    try {
      const {
        regulation,
        status,
        startDate,
        endDate,
        includeControls,
        includeAudits,
        includeRisks,
      } = req.query;

      const options: any = {};
      if (regulation) options.regulation = regulation as string;
      if (status) options.status = status as any;
      if (startDate) options.startDate = new Date(startDate as string);
      if (endDate) options.endDate = new Date(endDate as string);
      if (includeControls) options.includeControls = includeControls === 'true';
      if (includeAudits) options.includeAudits = includeAudits === 'true';
      if (includeRisks) options.includeRisks = includeRisks === 'true';

      const report = await grcService.generateCustomComplianceReport(options);

      res.json({
        success: true,
        message: 'Custom compliance report generated successfully',
        data: report,
      });
    } catch (error: any) {
      console.error('Error generating custom report:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to generate custom compliance report',
      });
    }
  }
}

export default new GRCController();
