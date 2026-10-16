/**
 * Manufacturing Industry Controller
 * Handles PLM, MES, and QMS endpoints
 * Requirements: 17.1
 */

import { Request, Response } from 'express';
import manufacturingService from '../models/manufacturing-industry';

export class ManufacturingIndustryController {
  // ─── PLM Endpoints ──────────────────────────────────────────

  async createPLMProduct(req: Request, res: Response): Promise<void> {
    try {
      const product = await manufacturingService.createPLMProduct(req.body);
      res.status(201).json({ success: true, data: product });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async updatePLMProductStage(req: Request, res: Response): Promise<void> {
    try {
      const { productId } = req.params;
      const { stage } = req.body;
      const product = await manufacturingService.updatePLMProductStage(productId, stage);
      res.json({ success: true, data: product });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async createChangeRequest(req: Request, res: Response): Promise<void> {
    try {
      const changeRequest = await manufacturingService.createChangeRequest(req.body);
      res.status(201).json({ success: true, data: changeRequest });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async approveChangeRequest(req: Request, res: Response): Promise<void> {
    try {
      const { changeId } = req.params;
      const { approvedBy } = req.body;
      const changeRequest = await manufacturingService.approveChangeRequest(changeId, approvedBy);
      res.json({ success: true, data: changeRequest });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  // ─── MES Endpoints ──────────────────────────────────────────

  async createWorkOrder(req: Request, res: Response): Promise<void> {
    try {
      const workOrder = await manufacturingService.createWorkOrder(req.body);
      res.status(201).json({ success: true, data: workOrder });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async startWorkOrder(req: Request, res: Response): Promise<void> {
    try {
      const { workOrderId } = req.params;
      const { operatorId, machineId } = req.body;
      const workOrder = await manufacturingService.startWorkOrder(workOrderId, operatorId, machineId);
      res.json({ success: true, data: workOrder });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async completeWorkOrder(req: Request, res: Response): Promise<void> {
    try {
      const { workOrderId } = req.params;
      const metrics = req.body;
      const workOrder = await manufacturingService.completeWorkOrder(workOrderId, metrics);
      res.json({ success: true, data: workOrder });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async logOperation(req: Request, res: Response): Promise<void> {
    try {
      const log = await manufacturingService.logOperation(req.body);
      res.status(201).json({ success: true, data: log });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async getMachineStatus(req: Request, res: Response): Promise<void> {
    try {
      const { machineId } = req.params;
      const machine = await manufacturingService.getMachineStatus(machineId);
      res.json({ success: true, data: machine });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async calculateOEE(req: Request, res: Response): Promise<void> {
    try {
      const { workCenterId } = req.params;
      const { startDate, endDate } = req.query;
      const oee = await manufacturingService.calculateOEE(
        workCenterId,
        new Date(startDate as string),
        new Date(endDate as string)
      );
      res.json({ success: true, data: oee });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  // ─── QMS Endpoints ──────────────────────────────────────────

  async createInspectionPlan(req: Request, res: Response): Promise<void> {
    try {
      const plan = await manufacturingService.createInspectionPlan(req.body);
      res.status(201).json({ success: true, data: plan });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async recordInspection(req: Request, res: Response): Promise<void> {
    try {
      const result = await manufacturingService.recordInspection(req.body);
      res.status(201).json({ success: true, data: result });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async createNonConformance(req: Request, res: Response): Promise<void> {
    try {
      const nc = await manufacturingService.createNonConformance(req.body);
      res.status(201).json({ success: true, data: nc });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async createCAPA(req: Request, res: Response): Promise<void> {
    try {
      const capa = await manufacturingService.createCAPA(req.body);
      res.status(201).json({ success: true, data: capa });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async scheduleAudit(req: Request, res: Response): Promise<void> {
    try {
      const audit = await manufacturingService.scheduleAudit(req.body);
      res.status(201).json({ success: true, data: audit });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async getQualityMetrics(req: Request, res: Response): Promise<void> {
    try {
      const { startDate, endDate } = req.query;
      const metrics = await manufacturingService.getQualityMetrics(
        new Date(startDate as string),
        new Date(endDate as string)
      );
      res.json({ success: true, data: metrics });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
}

export default new ManufacturingIndustryController();
