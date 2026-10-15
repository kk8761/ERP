/**
 * Compliance Reporting Controller
 * 
 * Handles HTTP requests for IFRS, GAAP, and country-specific compliance reports.
 * 
 * Requirements:
 * - 10.7: Support IFRS and GAAP standards
 * - 18.6: Use country-specific templates
 */

import { Request, Response } from 'express';
import * as complianceReportingService from '../services/compliance-reporting.service';

export class ComplianceReportingController {
  
  /**
   * Generate IFRS-compliant financial report
   * GET /api/compliance-reporting/ifrs?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
   */
  static async generateIFRSReport(req: Request, res: Response) {
    try {
      const startDate = new Date(req.query.startDate as string);
      const endDate = new Date(req.query.endDate as string);

      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        return res.status(400).json({
          success: false,
          message: 'Invalid date format. Use YYYY-MM-DD format.',
        });
      }

      const report = await complianceReportingService.generateIFRSReport(startDate, endDate);
      
      res.json({
        success: true,
        report,
        message: 'IFRS-compliant report generated successfully',
      });
    } catch (error: any) {
      console.error('Error generating IFRS report:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to generate IFRS report',
      });
    }
  }

  /**
   * Generate US GAAP-compliant financial report
   * GET /api/compliance-reporting/gaap?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
   */
  static async generateGAAPReport(req: Request, res: Response) {
    try {
      const startDate = new Date(req.query.startDate as string);
      const endDate = new Date(req.query.endDate as string);

      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        return res.status(400).json({
          success: false,
          message: 'Invalid date format. Use YYYY-MM-DD format.',
        });
      }

      const report = await complianceReportingService.generateGAAPReport(startDate, endDate);
      
      res.json({
        success: true,
        report,
        message: 'US GAAP-compliant report generated successfully',
      });
    } catch (error: any) {
      console.error('Error generating GAAP report:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to generate GAAP report',
      });
    }
  }

  /**
   * Generate country-specific compliance report
   * GET /api/compliance-reporting/country/:countryCode?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
   */
  static async generateCountrySpecificReport(req: Request, res: Response) {
    try {
      const { countryCode } = req.params;
      const startDate = new Date(req.query.startDate as string);
      const endDate = new Date(req.query.endDate as string);

      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        return res.status(400).json({
          success: false,
          message: 'Invalid date format. Use YYYY-MM-DD format.',
        });
      }

      const validCountryCodes = ['US', 'UK', 'DE', 'FR', 'IN', 'CN', 'JP', 'AU', 'CA', 'BR'];
      if (!validCountryCodes.includes(countryCode.toUpperCase())) {
        return res.status(400).json({
          success: false,
          message: `Invalid country code. Supported countries: ${validCountryCodes.join(', ')}`,
        });
      }

      const report = await complianceReportingService.generateCountrySpecificReport(
        countryCode.toUpperCase() as complianceReportingService.CountryCode,
        startDate,
        endDate
      );
      
      res.json({
        success: true,
        report,
        message: `${report.countryName} compliance report generated successfully`,
      });
    } catch (error: any) {
      console.error('Error generating country-specific report:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to generate country-specific report',
      });
    }
  }

  /**
   * Get list of supported countries
   * GET /api/compliance-reporting/countries
   */
  static async getSupportedCountries(_req: Request, res: Response) {
    try {
      const countries = complianceReportingService.getSupportedCountries();
      
      res.json({
        success: true,
        countries,
      });
    } catch (error: any) {
      console.error('Error fetching supported countries:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to fetch supported countries',
      });
    }
  }
}
