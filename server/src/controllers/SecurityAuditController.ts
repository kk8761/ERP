import { Request, Response } from 'express';
import {
  securityAuditService,
  AuditType,
  VulnerabilitySeverity,
  FindingStatus
} from '../services/SecurityAuditService';

export class SecurityAuditController {
  /**
   * Schedule a security audit
   */
  async scheduleAudit(req: Request, res: Response): Promise<void> {
    try {
      const { auditType, scheduledDate, performedBy, toolsUsed } = req.body;

      if (!auditType || !scheduledDate || !performedBy) {
        res.status(400).json({
          success: false,
          error: 'Missing required fields: auditType, scheduledDate, performedBy'
        });
        return;
      }

      const audit = await securityAuditService.scheduleAudit(
        auditType as AuditType,
        new Date(scheduledDate),
        performedBy,
        toolsUsed || []
      );

      res.status(201).json({
        success: true,
        data: audit,
        message: 'Security audit scheduled successfully'
      });
    } catch (error) {
      console.error('Error scheduling audit:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to schedule security audit'
      });
    }
  }

  /**
   * Conduct vulnerability scan
   */
  async conductVulnerabilityScan(req: Request, res: Response): Promise<void> {
    try {
      console.log('Starting vulnerability scan...');
      
      const result = await securityAuditService.conductVulnerabilityScan();

      res.status(200).json({
        success: true,
        data: result,
        message: `Vulnerability scan completed. Found ${result.findings.length} vulnerabilities.`
      });
    } catch (error) {
      console.error('Error conducting vulnerability scan:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to conduct vulnerability scan',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Track penetration test results
   */
  async trackPenetrationTest(req: Request, res: Response): Promise<void> {
    try {
      const {
        scope,
        methodology,
        findings,
        executiveSummary,
        technicalDetails,
        recommendations,
        testerName,
        testDuration
      } = req.body;

      if (!scope || !methodology || !findings || !testerName) {
        res.status(400).json({
          success: false,
          error: 'Missing required fields'
        });
        return;
      }

      const result = await securityAuditService.trackPenetrationTest(
        scope,
        methodology,
        findings,
        executiveSummary || '',
        technicalDetails || '',
        recommendations || [],
        testerName,
        testDuration || 0
      );

      res.status(201).json({
        success: true,
        data: result,
        message: 'Penetration test results tracked successfully'
      });
    } catch (error) {
      console.error('Error tracking penetration test:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to track penetration test results'
      });
    }
  }

  /**
   * Create a security finding
   */
  async createFinding(req: Request, res: Response): Promise<void> {
    try {
      const {
        auditId,
        title,
        description,
        severity,
        cveId,
        affectedComponent,
        affectedVersion,
        remediationSteps,
        remediationDeadline,
        assignedTo,
        riskScore,
        exploitability,
        impact,
        evidence,
        references
      } = req.body;

      if (!title || !description || !severity || !affectedComponent || !remediationSteps) {
        res.status(400).json({
          success: false,
          error: 'Missing required fields'
        });
        return;
      }

      const finding = await securityAuditService.createFinding({
        auditId: auditId || '',
        title,
        description,
        severity: severity as VulnerabilitySeverity,
        status: FindingStatus.OPEN,
        cveId,
        affectedComponent,
        affectedVersion,
        discoveredDate: new Date(),
        remediationSteps,
        remediationDeadline: remediationDeadline ? new Date(remediationDeadline) : undefined,
        assignedTo,
        riskScore: riskScore || 5,
        exploitability: exploitability || 5,
        impact: impact || 5,
        evidence: evidence || [],
        references: references || []
      });

      res.status(201).json({
        success: true,
        data: finding,
        message: 'Security finding created successfully'
      });
    } catch (error) {
      console.error('Error creating finding:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create security finding'
      });
    }
  }

  /**
   * Update finding status
   */
  async updateFindingStatus(req: Request, res: Response): Promise<void> {
    try {
      const { findingId } = req.params;
      const { status } = req.body;

      if (!status) {
        res.status(400).json({
          success: false,
          error: 'Status is required'
        });
        return;
      }

      const resolvedDate = status === FindingStatus.RESOLVED ? new Date() : undefined;

      const finding = await securityAuditService.updateFindingStatus(
        findingId,
        status as FindingStatus,
        resolvedDate
      );

      res.status(200).json({
        success: true,
        data: finding,
        message: 'Finding status updated successfully'
      });
    } catch (error) {
      console.error('Error updating finding status:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update finding status'
      });
    }
  }

  /**
   * Get findings by severity
   */
  async getFindingsBySeverity(req: Request, res: Response): Promise<void> {
    try {
      const { severity } = req.params;

      const findings = await securityAuditService.getFindingsBySeverity(
        severity as VulnerabilitySeverity
      );

      res.status(200).json({
        success: true,
        data: findings,
        message: `Retrieved ${findings.length} findings with severity ${severity}`
      });
    } catch (error) {
      console.error('Error getting findings by severity:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve findings'
      });
    }
  }

  /**
   * Get open findings
   */
  async getOpenFindings(req: Request, res: Response): Promise<void> {
    try {
      const findings = await securityAuditService.getOpenFindings();

      res.status(200).json({
        success: true,
        data: findings,
        message: `Retrieved ${findings.length} open findings`
      });
    } catch (error) {
      console.error('Error getting open findings:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve open findings'
      });
    }
  }

  /**
   * Get findings by status
   */
  async getFindingsByStatus(req: Request, res: Response): Promise<void> {
    try {
      const { status } = req.params;

      const findings = await securityAuditService.getFindingsByStatus(
        status as FindingStatus
      );

      res.status(200).json({
        success: true,
        data: findings,
        message: `Retrieved ${findings.length} findings with status ${status}`
      });
    } catch (error) {
      console.error('Error getting findings by status:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve findings'
      });
    }
  }

  /**
   * Get overdue findings
   */
  async getOverdueFindings(req: Request, res: Response): Promise<void> {
    try {
      const findings = await securityAuditService.getOverdueFindings();

      res.status(200).json({
        success: true,
        data: findings,
        message: `Retrieved ${findings.length} overdue findings`
      });
    } catch (error) {
      console.error('Error getting overdue findings:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve overdue findings'
      });
    }
  }

  /**
   * Generate audit report
   */
  async generateAuditReport(req: Request, res: Response): Promise<void> {
    try {
      const { auditId } = req.params;

      const report = await securityAuditService.generateAuditReport(auditId);

      res.status(200).json({
        success: true,
        data: { report },
        message: 'Audit report generated successfully'
      });
    } catch (error) {
      console.error('Error generating audit report:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to generate audit report'
      });
    }
  }

  /**
   * Get audit dashboard metrics
   */
  async getAuditMetrics(req: Request, res: Response): Promise<void> {
    try {
      // Get various metrics for dashboard
      const openFindings = await securityAuditService.getOpenFindings();
      const overdueFindings = await securityAuditService.getOverdueFindings();
      
      const criticalFindings = await securityAuditService.getFindingsBySeverity(
        VulnerabilitySeverity.CRITICAL
      );
      const highFindings = await securityAuditService.getFindingsBySeverity(
        VulnerabilitySeverity.HIGH
      );

      const metrics = {
        totalOpenFindings: openFindings.length,
        totalOverdueFindings: overdueFindings.length,
        criticalFindings: criticalFindings.length,
        highFindings: highFindings.length,
        findingsByStatus: {
          open: openFindings.length,
          inProgress: (await securityAuditService.getFindingsByStatus(FindingStatus.IN_PROGRESS)).length,
          resolved: (await securityAuditService.getFindingsByStatus(FindingStatus.RESOLVED)).length,
          acceptedRisk: (await securityAuditService.getFindingsByStatus(FindingStatus.ACCEPTED_RISK)).length,
          falsePositive: (await securityAuditService.getFindingsByStatus(FindingStatus.FALSE_POSITIVE)).length
        }
      };

      res.status(200).json({
        success: true,
        data: metrics,
        message: 'Audit metrics retrieved successfully'
      });
    } catch (error) {
      console.error('Error getting audit metrics:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve audit metrics'
      });
    }
  }
}

export const securityAuditController = new SecurityAuditController();
