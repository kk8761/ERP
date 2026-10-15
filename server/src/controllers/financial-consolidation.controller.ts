import { Request, Response } from 'express';
import * as consolidationService from '../services/financial-consolidation.service';

export class FinancialConsolidationController {
  // ============================================================================
  // Company Management
  // ============================================================================

  static async createCompany(req: Request, res: Response) {
    try {
      const company = await consolidationService.createCompany(req.body);
      res.status(201).json(company);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  static async getCompanies(req: Request, res: Response) {
    try {
      const { isActive } = req.query;
      const companies = await consolidationService.getCompanies({
        isActive: isActive === 'true' ? true : isActive === 'false' ? false : undefined,
      });
      res.json(companies);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  static async getCompanyHierarchy(req: Request, res: Response) {
    try {
      const { companyId } = req.params;
      const hierarchy = await consolidationService.getCompanyHierarchy(companyId);
      res.json(hierarchy);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  static async updateCompanyOwnership(req: Request, res: Response) {
    try {
      const { companyId } = req.params;
      const { ownershipPercentage, consolidationMethod } = req.body;
      const company = await consolidationService.updateCompanyOwnership(
        companyId,
        ownershipPercentage,
        consolidationMethod
      );
      res.json(company);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  // ============================================================================
  // Consolidation Group Management
  // ============================================================================

  static async createConsolidationGroup(req: Request, res: Response) {
    try {
      const group = await consolidationService.createConsolidationGroup(req.body);
      res.status(201).json(group);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  static async getConsolidationGroups(req: Request, res: Response) {
    try {
      const { isActive } = req.query;
      const groups = await consolidationService.getConsolidationGroups({
        isActive: isActive === 'true' ? true : isActive === 'false' ? false : undefined,
      });
      res.json(groups);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  static async addCompanyToGroup(req: Request, res: Response) {
    try {
      const { groupId } = req.params;
      const { companyId, role, effectiveDate } = req.body;
      const membership = await consolidationService.addCompanyToGroup(
        groupId,
        companyId,
        role,
        new Date(effectiveDate)
      );
      res.status(201).json(membership);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  static async removeCompanyFromGroup(req: Request, res: Response) {
    try {
      const { groupId, companyId } = req.params;
      const { endDate } = req.body;
      const membership = await consolidationService.removeCompanyFromGroup(
        groupId,
        companyId,
        new Date(endDate)
      );
      res.json(membership);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  // ============================================================================
  // Intercompany Transaction Management
  // ============================================================================

  static async createIntercompanyTransaction(req: Request, res: Response) {
    try {
      const data = {
        ...req.body,
        transactionDate: new Date(req.body.transactionDate),
      };
      const transaction = await consolidationService.createIntercompanyTransaction(data);
      res.status(201).json(transaction);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  static async findIntercompanyTransactions(req: Request, res: Response): Promise<void> {
    try {
      const { companyIds, periodStart, periodEnd, onlyUneliminated } = req.query;
      
      if (!companyIds || !periodStart || !periodEnd) {
        res.status(400).json({ 
          error: 'companyIds, periodStart, and periodEnd are required' 
        });
        return;
      }

      const transactions = await consolidationService.findIntercompanyTransactions(
        (companyIds as string).split(','),
        new Date(periodStart as string),
        new Date(periodEnd as string),
        onlyUneliminated === 'true'
      );
      res.json(transactions);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  static async getIntercompanyTransactionsByType(req: Request, res: Response): Promise<void> {
    try {
      const { companyIds, transactionType, periodStart, periodEnd } = req.query;
      
      if (!companyIds || !transactionType || !periodStart || !periodEnd) {
        res.status(400).json({ 
          error: 'companyIds, transactionType, periodStart, and periodEnd are required' 
        });
        return;
      }

      const transactions = await consolidationService.getIntercompanyTransactionsByType(
        (companyIds as string).split(','),
        transactionType as string,
        new Date(periodStart as string),
        new Date(periodEnd as string)
      );
      res.json(transactions);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  // ============================================================================
  // Consolidation Process
  // ============================================================================

  static async createConsolidation(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.id || 'system';
      const data = {
        ...req.body,
        consolidationDate: new Date(req.body.consolidationDate),
        periodStart: new Date(req.body.periodStart),
        periodEnd: new Date(req.body.periodEnd),
        createdBy: userId,
      };
      const consolidation = await consolidationService.createConsolidation(data);
      res.status(201).json(consolidation);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  static async performConsolidation(req: Request, res: Response) {
    try {
      const { consolidationId } = req.params;
      const consolidation = await consolidationService.performConsolidation(consolidationId);
      res.json(consolidation);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  static async updateSubsidiaryFinancials(req: Request, res: Response) {
    try {
      const { consolidationId, subsidiaryId } = req.params;
      const subsidiary = await consolidationService.updateSubsidiaryFinancials(
        consolidationId,
        subsidiaryId,
        req.body
      );
      res.json(subsidiary);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  static async getConsolidation(req: Request, res: Response): Promise<void> {
    try {
      const { consolidationId } = req.params;
      const consolidation = await consolidationService.getConsolidation(consolidationId);
      if (!consolidation) {
        res.status(404).json({ error: 'Consolidation not found' });
        return;
      }
      res.json(consolidation);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  static async getConsolidations(req: Request, res: Response) {
    try {
      const { parentCompanyId, status, startDate, endDate } = req.query;
      const consolidations = await consolidationService.getConsolidations({
        parentCompanyId: parentCompanyId as string,
        status: status as string,
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined,
      });
      res.json(consolidations);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  static async approveConsolidation(req: Request, res: Response) {
    try {
      const { consolidationId } = req.params;
      const userId = (req as any).user?.id || 'system';
      const consolidation = await consolidationService.approveConsolidation(
        consolidationId,
        userId
      );
      res.json(consolidation);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  // ============================================================================
  // Elimination Entries
  // ============================================================================

  static async createEliminationEntry(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.id || 'system';
      const data = {
        ...req.body,
        entryDate: new Date(req.body.entryDate),
        createdBy: userId,
      };
      const entry = await consolidationService.createEliminationEntry(data);
      res.status(201).json(entry);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  static async postEliminationEntry(req: Request, res: Response) {
    try {
      const { entryId } = req.params;
      const userId = (req as any).user?.id || 'system';
      const entry = await consolidationService.postEliminationEntry(entryId, userId);
      res.json(entry);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  static async createEliminationsForIntercompanyTransactions(req: Request, res: Response) {
    try {
      const { consolidationId } = req.params;
      const { intercompanyTransactionIds } = req.body;
      const userId = (req as any).user?.id || 'system';
      
      const entries = await consolidationService.createEliminationsForIntercompanyTransactions(
        consolidationId,
        intercompanyTransactionIds,
        userId
      );
      res.status(201).json(entries);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  // ============================================================================
  // Reporting
  // ============================================================================

  static async generateConsolidatedFinancialStatements(req: Request, res: Response) {
    try {
      const { consolidationId } = req.params;
      const statements = await consolidationService.generateConsolidatedFinancialStatements(
        consolidationId
      );
      res.json(statements);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
}
