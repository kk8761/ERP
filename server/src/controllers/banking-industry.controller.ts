/**
 * Banking Industry Controller
 * Handles Core Banking, Loans, AML, and KYC endpoints
 * Requirements: 17.3, 17.6, 17.7
 */

import { Request, Response } from 'express';
import bankingService from '../models/banking-industry';

export class BankingIndustryController {
  // ─── Core Banking Endpoints ─────────────────────────────────

  async createAccount(req: Request, res: Response): Promise<void> {
    try {
      const account = await bankingService.createAccount(req.body);
      res.status(201).json({ success: true, data: account });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async getAccountBalance(req: Request, res: Response): Promise<void> {
    try {
      const { accountId } = req.params;
      const balance = await bankingService.getAccountBalance(accountId);
      res.json({ success: true, data: balance });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async processTransaction(req: Request, res: Response): Promise<void> {
    try {
      const transaction = await bankingService.processTransaction(req.body);
      res.status(201).json({ success: true, data: transaction });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async transferFunds(req: Request, res: Response): Promise<void> {
    try {
      const { fromAccountId, toAccountId, amount, description } = req.body;
      const transaction = await bankingService.transferFunds(fromAccountId, toAccountId, amount, description);
      res.status(201).json({ success: true, data: transaction });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async getAccountStatement(req: Request, res: Response): Promise<void> {
    try {
      const { accountId } = req.params;
      const { startDate, endDate } = req.query;
      const statement = await bankingService.getAccountStatement(
        accountId,
        new Date(startDate as string),
        new Date(endDate as string)
      );
      res.json({ success: true, data: statement });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  // ─── Loan Management Endpoints ──────────────────────────────

  async createLoanApplication(req: Request, res: Response): Promise<void> {
    try {
      const application = await bankingService.createLoanApplication(req.body);
      res.status(201).json({ success: true, data: application });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async approveLoan(req: Request, res: Response): Promise<void> {
    try {
      const { applicationId } = req.params;
      const { approvedBy, approvedAmount, interestRate, tenure } = req.body;
      const loan = await bankingService.approveLoan(applicationId, approvedBy, approvedAmount, interestRate, tenure);
      res.json({ success: true, data: loan });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async disburseLoan(req: Request, res: Response): Promise<void> {
    try {
      const { loanId } = req.params;
      const { accountId } = req.body;
      const loan = await bankingService.disburseLoan(loanId, accountId);
      res.json({ success: true, data: loan });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async calculateEMI(req: Request, res: Response): Promise<void> {
    try {
      const { principal, interestRate, tenure } = req.query;
      const emi = await bankingService.calculateEMI(
        parseFloat(principal as string),
        parseFloat(interestRate as string),
        parseInt(tenure as string)
      );
      res.json({ success: true, data: { emi } });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async getRepaymentSchedule(req: Request, res: Response): Promise<void> {
    try {
      const { loanId } = req.params;
      const schedule = await bankingService.generateRepaymentSchedule(loanId);
      res.json({ success: true, data: schedule });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async recordLoanPayment(req: Request, res: Response): Promise<void> {
    try {
      const { loanId } = req.params;
      const { amount, paymentMode } = req.body;
      const payment = await bankingService.recordLoanPayment(loanId, amount, paymentMode);
      res.json({ success: true, data: payment });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async getLoanStatus(req: Request, res: Response): Promise<void> {
    try {
      const { loanId } = req.params;
      const status = await bankingService.getLoanStatus(loanId);
      res.json({ success: true, data: status });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  // ─── KYC Endpoints ──────────────────────────────────────────

  async initiateKYC(req: Request, res: Response): Promise<void> {
    try {
      const { customerId, verificationType } = req.body;
      const kyc = await bankingService.initiateKYC(customerId, verificationType);
      res.status(201).json({ success: true, data: kyc });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async uploadKYCDocument(req: Request, res: Response): Promise<void> {
    try {
      const { kycId } = req.params;
      const document = await bankingService.uploadKYCDocument(kycId, req.body);
      res.status(201).json({ success: true, data: document });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async verifyIdentity(req: Request, res: Response): Promise<void> {
    try {
      const { kycId } = req.params;
      const kyc = await bankingService.verifyIdentity(kycId, req.body);
      res.json({ success: true, data: kyc });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async verifyAddress(req: Request, res: Response): Promise<void> {
    try {
      const { kycId } = req.params;
      const kyc = await bankingService.verifyAddress(kycId, req.body);
      res.json({ success: true, data: kyc });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async assessRisk(req: Request, res: Response): Promise<void> {
    try {
      const { customerId } = req.params;
      const assessment = await bankingService.assessRisk(customerId);
      res.json({ success: true, data: assessment });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async completeKYC(req: Request, res: Response): Promise<void> {
    try {
      const { kycId } = req.params;
      const { verifiedBy } = req.body;
      const kyc = await bankingService.completeKYC(kycId, verifiedBy);
      res.json({ success: true, data: kyc });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  // ─── AML Endpoints ──────────────────────────────────────────

  async screenCustomer(req: Request, res: Response): Promise<void> {
    try {
      const { customerId, screeningType } = req.body;
      const screening = await bankingService.screenCustomer(customerId, screeningType);
      res.status(201).json({ success: true, data: screening });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async checkWatchlist(req: Request, res: Response): Promise<void> {
    try {
      const { name, dateOfBirth, nationality } = req.query;
      const matches = await bankingService.checkWatchlist(
        name as string,
        dateOfBirth ? new Date(dateOfBirth as string) : undefined,
        nationality as string | undefined
      );
      res.json({ success: true, data: matches });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async reportSuspiciousActivity(req: Request, res: Response): Promise<void> {
    try {
      const sar = await bankingService.reportSuspiciousActivity(req.body);
      res.status(201).json({ success: true, data: sar });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async screenPEP(req: Request, res: Response): Promise<void> {
    try {
      const { customerId } = req.params;
      const pepScreening = await bankingService.screenPEP(customerId);
      res.json({ success: true, data: pepScreening });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async getAMLComplianceReport(req: Request, res: Response): Promise<void> {
    try {
      const { startDate, endDate } = req.query;
      const report = await bankingService.getAMLComplianceReport(
        new Date(startDate as string),
        new Date(endDate as string)
      );
      res.json({ success: true, data: report });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
}

export default new BankingIndustryController();
