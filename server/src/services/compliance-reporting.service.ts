/**
 * Compliance Reporting Service
 * 
 * Generates IFRS and GAAP compliant financial reports with country-specific templates.
 * 
 * Requirements:
 * - 10.7: Support IFRS and GAAP standards
 * - 18.6: Use country-specific templates
 */

import * as accountingService from './accounting.service';

// ─── Types ────────────────────────────────────────────────────────────────

export type AccountingStandard = 'IFRS' | 'GAAP';
export type CountryCode = 'US' | 'UK' | 'DE' | 'FR' | 'IN' | 'CN' | 'JP' | 'AU' | 'CA' | 'BR';

export interface IFRSReport {
  standard: 'IFRS';
  reportDate: Date;
  period: {
    startDate: Date;
    endDate: Date;
  };
  statementOfFinancialPosition: {
    assets: {
      nonCurrentAssets: { [key: string]: number };
      currentAssets: { [key: string]: number };
      totalAssets: number;
    };
    equityAndLiabilities: {
      equity: { [key: string]: number };
      nonCurrentLiabilities: { [key: string]: number };
      currentLiabilities: { [key: string]: number };
      totalEquityAndLiabilities: number;
    };
  };
  statementOfProfitOrLoss: {
    revenue: number;
    costOfSales: number;
    grossProfit: number;
    operatingExpenses: { [key: string]: number };
    operatingProfit: number;
    financeIncome: number;
    financeCosts: number;
    profitBeforeTax: number;
    incomeTaxExpense: number;
    profitForThePeriod: number;
  };
  statementOfCashFlows: {
    operatingActivities: { [key: string]: number };
    investingActivities: { [key: string]: number };
    financingActivities: { [key: string]: number };
    netCashFlow: number;
  };
  notes: string[];
}

export interface GAAPReport {
  standard: 'GAAP';
  reportDate: Date;
  period: {
    startDate: Date;
    endDate: Date;
  };
  balanceSheet: {
    assets: {
      currentAssets: { [key: string]: number };
      propertyPlantEquipment: number;
      intangibleAssets: number;
      otherAssets: { [key: string]: number };
      totalAssets: number;
    };
    liabilitiesAndEquity: {
      currentLiabilities: { [key: string]: number };
      longTermLiabilities: { [key: string]: number };
      stockholdersEquity: { [key: string]: number };
      totalLiabilitiesAndEquity: number;
    };
  };
  incomeStatement: {
    revenues: { [key: string]: number };
    totalRevenues: number;
    costOfRevenue: number;
    grossProfit: number;
    operatingExpenses: { [key: string]: number };
    totalOperatingExpenses: number;
    operatingIncome: number;
    otherIncomeExpense: { [key: string]: number };
    incomeBeforeTax: number;
    incomeTaxExpense: number;
    netIncome: number;
  };
  cashFlowStatement: {
    operatingActivities: { [key: string]: number };
    investingActivities: { [key: string]: number };
    financingActivities: { [key: string]: number };
    netIncreaseInCash: number;
  };
  notes: string[];
}

export interface CountrySpecificReport {
  country: CountryCode;
  countryName: string;
  standard: AccountingStandard;
  reportDate: Date;
  period: {
    startDate: Date;
    endDate: Date;
  };
  financialStatements: any;
  localRequirements: {
    taxReporting: any;
    statutoryDisclosures: string[];
    localGAAP: string[];
  };
  notes: string[];
}

// ─── IFRS Compliance Reporting ───────────────────────────────────────────

/**
 * Generate IFRS-compliant financial report
 * 
 * IFRS (International Financial Reporting Standards) requirements:
 * - Statement of Financial Position (Balance Sheet)
 * - Statement of Profit or Loss and Other Comprehensive Income
 * - Statement of Cash Flows
 * - Statement of Changes in Equity
 * - Notes to the financial statements
 */
export async function generateIFRSReport(
  startDate: Date,
  endDate: Date
): Promise<IFRSReport> {
  // Get base financial statements
  const [profitAndLoss, balanceSheet, cashFlow] = await Promise.all([
    accountingService.generateProfitAndLoss(startDate, endDate),
    accountingService.generateBalanceSheet(endDate),
    accountingService.generateCashFlowStatement(startDate, endDate),
  ]);

  // Transform to IFRS format
  const ifrsReport: IFRSReport = {
    standard: 'IFRS',
    reportDate: new Date(),
    period: {
      startDate,
      endDate,
    },
    statementOfFinancialPosition: {
      assets: {
        nonCurrentAssets: {
          'Property, Plant and Equipment': balanceSheet.assets.find((a: any) => a.accountName.toLowerCase().includes('fixed asset'))?.amount || 0,
          'Intangible Assets': balanceSheet.assets.find((a: any) => a.accountName.toLowerCase().includes('intangible'))?.amount || 0,
          'Investment Property': 0,
          'Financial Assets': 0,
        },
        currentAssets: {
          'Inventories': balanceSheet.assets.find((a: any) => a.accountName.toLowerCase().includes('inventory'))?.amount || 0,
          'Trade and Other Receivables': balanceSheet.assets.find((a: any) => a.accountName.toLowerCase().includes('receivable'))?.amount || 0,
          'Cash and Cash Equivalents': balanceSheet.assets.find((a: any) => a.accountName.toLowerCase().includes('cash'))?.amount || 0,
          'Prepayments': balanceSheet.assets.find((a: any) => a.accountName.toLowerCase().includes('prepaid'))?.amount || 0,
        },
        totalAssets: balanceSheet.totalAssets,
      },
      equityAndLiabilities: {
        equity: {
          'Share Capital': balanceSheet.equity.find((e: any) => e.accountName.toLowerCase().includes('capital') || e.accountName.toLowerCase().includes('stock'))?.amount || 0,
          'Retained Earnings': balanceSheet.equity.find((e: any) => e.accountName.toLowerCase().includes('retained'))?.amount || 0,
          'Other Reserves': 0,
        },
        nonCurrentLiabilities: {
          'Long-term Borrowings': balanceSheet.liabilities.find((l: any) => l.accountName.toLowerCase().includes('long-term') && l.accountName.toLowerCase().includes('debt'))?.amount || 0,
          'Deferred Tax Liabilities': 0,
          'Provisions': 0,
        },
        currentLiabilities: {
          'Trade and Other Payables': balanceSheet.liabilities.find((l: any) => l.accountName.toLowerCase().includes('payable'))?.amount || 0,
          'Short-term Borrowings': balanceSheet.liabilities.find((l: any) => l.accountName.toLowerCase().includes('short-term') && l.accountName.toLowerCase().includes('debt'))?.amount || 0,
          'Current Tax Payable': 0,
          'Accruals': balanceSheet.liabilities.find((l: any) => l.accountName.toLowerCase().includes('accrued'))?.amount || 0,
        },
        totalEquityAndLiabilities: balanceSheet.totalLiabilitiesAndEquity,
      },
    },
    statementOfProfitOrLoss: {
      revenue: profitAndLoss.totalRevenue,
      costOfSales: profitAndLoss.totalCOGS,
      grossProfit: profitAndLoss.grossProfit,
      operatingExpenses: {
        'Selling and Distribution Expenses': profitAndLoss.expenses.find((e: any) => e.accountName.toLowerCase().includes('selling'))?.amount || 0,
        'Administrative Expenses': profitAndLoss.expenses.find((e: any) => e.accountName.toLowerCase().includes('administrative'))?.amount || 0,
        'Research and Development': profitAndLoss.expenses.find((e: any) => e.accountName.toLowerCase().includes('research'))?.amount || 0,
        'Other Operating Expenses': profitAndLoss.expenses.find((e: any) => e.accountName.toLowerCase().includes('other'))?.amount || 0,
      },
      operatingProfit: profitAndLoss.grossProfit - profitAndLoss.totalExpenses,
      financeIncome: 0,
      financeCosts: profitAndLoss.expenses.find((e: any) => e.accountName.toLowerCase().includes('interest'))?.amount || 0,
      profitBeforeTax: profitAndLoss.netIncome,
      incomeTaxExpense: profitAndLoss.expenses.find((e: any) => e.accountName.toLowerCase().includes('tax'))?.amount || 0,
      profitForThePeriod: profitAndLoss.netIncome,
    },
    statementOfCashFlows: {
      operatingActivities: {
        'Profit Before Tax': profitAndLoss.netIncome,
        'Adjustments for Non-Cash Items': 0,
        'Changes in Working Capital': 0,
        'Cash Generated from Operations': cashFlow.operatingCashFlow,
        'Income Tax Paid': -(profitAndLoss.expenses.find((e: any) => e.accountName.toLowerCase().includes('tax'))?.amount || 0),
      },
      investingActivities: {
        'Purchase of Property, Plant and Equipment': cashFlow.investingCashFlow,
        'Proceeds from Sale of Assets': 0,
        'Interest Received': 0,
      },
      financingActivities: {
        'Proceeds from Borrowings': cashFlow.financingCashFlow > 0 ? cashFlow.financingCashFlow : 0,
        'Repayment of Borrowings': cashFlow.financingCashFlow < 0 ? cashFlow.financingCashFlow : 0,
        'Dividends Paid': 0,
        'Interest Paid': -(profitAndLoss.expenses.find((e: any) => e.accountName.toLowerCase().includes('interest'))?.amount || 0),
      },
      netCashFlow: cashFlow.netCashFlow,
    },
    notes: [
      '1. Basis of Preparation: These financial statements have been prepared in accordance with International Financial Reporting Standards (IFRS).',
      '2. Significant Accounting Policies: Revenue is recognized when control of goods or services is transferred to the customer.',
      '3. Revenue Recognition: Revenue is measured at the fair value of consideration received or receivable (IFRS 15).',
      '4. Property, Plant and Equipment: Measured at cost less accumulated depreciation and impairment losses (IAS 16).',
      '5. Financial Instruments: Classified and measured in accordance with IFRS 9.',
      '6. Leases: Recognized as right-of-use assets and lease liabilities (IFRS 16).',
      '7. Income Taxes: Accounted for using the liability method (IAS 12).',
      '8. Fair Value Measurements: Determined in accordance with IFRS 13.',
    ],
  };

  return ifrsReport;
}

// ─── GAAP Compliance Reporting ───────────────────────────────────────────

/**
 * Generate US GAAP-compliant financial report
 * 
 * US GAAP (Generally Accepted Accounting Principles) requirements:
 * - Balance Sheet
 * - Income Statement
 * - Statement of Cash Flows
 * - Statement of Stockholders' Equity
 * - Notes to the financial statements
 */
export async function generateGAAPReport(
  startDate: Date,
  endDate: Date
): Promise<GAAPReport> {
  // Get base financial statements
  const [profitAndLoss, balanceSheet, cashFlow] = await Promise.all([
    accountingService.generateProfitAndLoss(startDate, endDate),
    accountingService.generateBalanceSheet(endDate),
    accountingService.generateCashFlowStatement(startDate, endDate),
  ]);

  // Transform to US GAAP format
  const gaapReport: GAAPReport = {
    standard: 'GAAP',
    reportDate: new Date(),
    period: {
      startDate,
      endDate,
    },
    balanceSheet: {
      assets: {
        currentAssets: {
          'Cash and Cash Equivalents': balanceSheet.assets.find((a: any) => a.accountName.toLowerCase().includes('cash'))?.amount || 0,
          'Accounts Receivable': balanceSheet.assets.find((a: any) => a.accountName.toLowerCase().includes('receivable'))?.amount || 0,
          'Inventory': balanceSheet.assets.find((a: any) => a.accountName.toLowerCase().includes('inventory'))?.amount || 0,
          'Prepaid Expenses': balanceSheet.assets.find((a: any) => a.accountName.toLowerCase().includes('prepaid'))?.amount || 0,
          'Other Current Assets': 0,
        },
        propertyPlantEquipment: balanceSheet.assets.find((a: any) => a.accountName.toLowerCase().includes('fixed asset'))?.amount || 0,
        intangibleAssets: balanceSheet.assets.find((a: any) => a.accountName.toLowerCase().includes('intangible'))?.amount || 0,
        otherAssets: {
          'Long-term Investments': 0,
          'Deferred Tax Assets': 0,
          'Other Non-Current Assets': 0,
        },
        totalAssets: balanceSheet.totalAssets,
      },
      liabilitiesAndEquity: {
        currentLiabilities: {
          'Accounts Payable': balanceSheet.liabilities.find((l: any) => l.accountName.toLowerCase().includes('payable'))?.amount || 0,
          'Accrued Expenses': balanceSheet.liabilities.find((l: any) => l.accountName.toLowerCase().includes('accrued'))?.amount || 0,
          'Short-term Debt': balanceSheet.liabilities.find((l: any) => l.accountName.toLowerCase().includes('short-term') && l.accountName.toLowerCase().includes('debt'))?.amount || 0,
          'Current Portion of Long-term Debt': 0,
          'Other Current Liabilities': 0,
        },
        longTermLiabilities: {
          'Long-term Debt': balanceSheet.liabilities.find((l: any) => l.accountName.toLowerCase().includes('long-term') && l.accountName.toLowerCase().includes('debt'))?.amount || 0,
          'Deferred Tax Liabilities': 0,
          'Other Long-term Liabilities': 0,
        },
        stockholdersEquity: {
          'Common Stock': balanceSheet.equity.find((e: any) => e.accountName.toLowerCase().includes('capital') || e.accountName.toLowerCase().includes('stock'))?.amount || 0,
          'Additional Paid-in Capital': 0,
          'Retained Earnings': balanceSheet.equity.find((e: any) => e.accountName.toLowerCase().includes('retained'))?.amount || 0,
          'Treasury Stock': 0,
          'Accumulated Other Comprehensive Income': 0,
        },
        totalLiabilitiesAndEquity: balanceSheet.totalLiabilitiesAndEquity,
      },
    },
    incomeStatement: {
      revenues: {
        'Product Sales': profitAndLoss.revenue.find((r: any) => r.accountName.toLowerCase().includes('product'))?.amount || 0,
        'Service Revenue': profitAndLoss.revenue.find((r: any) => r.accountName.toLowerCase().includes('service'))?.amount || 0,
        'Other Revenue': profitAndLoss.revenue.find((r: any) => r.accountName.toLowerCase().includes('other'))?.amount || 0,
      },
      totalRevenues: profitAndLoss.totalRevenue,
      costOfRevenue: profitAndLoss.totalCOGS,
      grossProfit: profitAndLoss.grossProfit,
      operatingExpenses: {
        'Selling, General and Administrative': (profitAndLoss.expenses.find((e: any) => e.accountName.toLowerCase().includes('selling'))?.amount || 0) + 
                                                (profitAndLoss.expenses.find((e: any) => e.accountName.toLowerCase().includes('administrative'))?.amount || 0),
        'Research and Development': profitAndLoss.expenses.find((e: any) => e.accountName.toLowerCase().includes('research'))?.amount || 0,
        'Depreciation and Amortization': profitAndLoss.expenses.find((e: any) => e.accountName.toLowerCase().includes('depreciation'))?.amount || 0,
        'Other Operating Expenses': profitAndLoss.expenses.find((e: any) => e.accountName.toLowerCase().includes('other'))?.amount || 0,
      },
      totalOperatingExpenses: profitAndLoss.totalExpenses,
      operatingIncome: profitAndLoss.grossProfit - profitAndLoss.totalExpenses,
      otherIncomeExpense: {
        'Interest Income': 0,
        'Interest Expense': -(profitAndLoss.expenses.find((e: any) => e.accountName.toLowerCase().includes('interest'))?.amount || 0),
        'Gain (Loss) on Sale of Assets': 0,
        'Other Income (Expense)': 0,
      },
      incomeBeforeTax: profitAndLoss.netIncome,
      incomeTaxExpense: profitAndLoss.expenses.find((e: any) => e.accountName.toLowerCase().includes('tax'))?.amount || 0,
      netIncome: profitAndLoss.netIncome,
    },
    cashFlowStatement: {
      operatingActivities: {
        'Net Income': profitAndLoss.netIncome,
        'Depreciation and Amortization': profitAndLoss.expenses.find((e: any) => e.accountName.toLowerCase().includes('depreciation'))?.amount || 0,
        'Changes in Accounts Receivable': 0,
        'Changes in Inventory': 0,
        'Changes in Accounts Payable': 0,
        'Changes in Accrued Expenses': 0,
        'Other Operating Activities': 0,
        'Net Cash from Operating Activities': cashFlow.operatingCashFlow,
      },
      investingActivities: {
        'Capital Expenditures': cashFlow.investingCashFlow,
        'Proceeds from Sale of Assets': 0,
        'Acquisitions': 0,
        'Other Investing Activities': 0,
        'Net Cash from Investing Activities': cashFlow.investingCashFlow,
      },
      financingActivities: {
        'Proceeds from Debt': cashFlow.financingCashFlow > 0 ? cashFlow.financingCashFlow : 0,
        'Repayment of Debt': cashFlow.financingCashFlow < 0 ? cashFlow.financingCashFlow : 0,
        'Dividends Paid': 0,
        'Stock Issuance': 0,
        'Stock Repurchase': 0,
        'Net Cash from Financing Activities': cashFlow.financingCashFlow,
      },
      netIncreaseInCash: cashFlow.netCashFlow,
    },
    notes: [
      '1. Summary of Significant Accounting Policies: These financial statements are prepared in accordance with US GAAP.',
      '2. Revenue Recognition: Revenue is recognized in accordance with ASC 606 when performance obligations are satisfied.',
      '3. Inventory Valuation: Inventories are stated at the lower of cost or net realizable value.',
      '4. Property, Plant and Equipment: Recorded at cost and depreciated using the straight-line method.',
      '5. Leases: Accounted for in accordance with ASC 842, recognizing right-of-use assets and lease liabilities.',
      '6. Income Taxes: Accounted for under the asset and liability method (ASC 740).',
      '7. Fair Value Measurements: Determined in accordance with ASC 820.',
      '8. Contingencies: Disclosed in accordance with ASC 450.',
    ],
  };

  return gaapReport;
}

// ─── Country-Specific Reporting ──────────────────────────────────────────

/**
 * Generate country-specific compliance report
 * 
 * Supports country-specific templates and local statutory requirements
 */
export async function generateCountrySpecificReport(
  country: CountryCode,
  startDate: Date,
  endDate: Date
): Promise<CountrySpecificReport> {
  // Determine which standard to use based on country
  const standard = getCountryStandard(country);
  
  // Get base report
  const baseReport = standard === 'IFRS' 
    ? await generateIFRSReport(startDate, endDate)
    : await generateGAAPReport(startDate, endDate);

  // Get country-specific requirements
  const localRequirements = getCountryRequirements(country);

  const countryReport: CountrySpecificReport = {
    country,
    countryName: getCountryName(country),
    standard,
    reportDate: new Date(),
    period: {
      startDate,
      endDate,
    },
    financialStatements: baseReport,
    localRequirements,
    notes: [
      ...baseReport.notes,
      ...localRequirements.localGAAP,
    ],
  };

  return countryReport;
}

// ─── Helper Functions ─────────────────────────────────────────────────────

function getCountryStandard(country: CountryCode): AccountingStandard {
  const gaapCountries: CountryCode[] = ['US'];
  return gaapCountries.includes(country) ? 'GAAP' : 'IFRS';
}

function getCountryName(country: CountryCode): string {
  const countryNames: Record<CountryCode, string> = {
    US: 'United States',
    UK: 'United Kingdom',
    DE: 'Germany',
    FR: 'France',
    IN: 'India',
    CN: 'China',
    JP: 'Japan',
    AU: 'Australia',
    CA: 'Canada',
    BR: 'Brazil',
  };
  return countryNames[country];
}

function getCountryRequirements(country: CountryCode) {
  const requirements: Record<CountryCode, any> = {
    US: {
      taxReporting: {
        form: 'Form 10-K',
        filingRequirement: 'SEC Filing Required',
        taxYear: 'Calendar or Fiscal Year',
      },
      statutoryDisclosures: [
        'SEC Regulation S-X requirements',
        'Sarbanes-Oxley Act compliance',
        'Dodd-Frank Act disclosures',
      ],
      localGAAP: [
        'US GAAP: Revenue recognition per ASC 606',
        'US GAAP: Lease accounting per ASC 842',
        'US GAAP: Financial instruments per ASC 825',
      ],
    },
    UK: {
      taxReporting: {
        form: 'Companies House Annual Return',
        filingRequirement: 'FRS 102 or IFRS',
        taxYear: 'Financial Year',
      },
      statutoryDisclosures: [
        'Companies Act 2006 requirements',
        'FRC reporting standards',
        'Directors\' report and strategic report',
      ],
      localGAAP: [
        'UK GAAP: FRS 102 - The Financial Reporting Standard',
        'UK GAAP: Small entities regime available',
        'UK GAAP: True and fair view requirement',
      ],
    },
    DE: {
      taxReporting: {
        form: 'Jahresabschluss (Annual Financial Statements)',
        filingRequirement: 'HGB (German Commercial Code)',
        taxYear: 'Geschäftsjahr (Business Year)',
      },
      statutoryDisclosures: [
        'HGB §§ 264-289 requirements',
        'Lagebericht (Management Report)',
        'Bilanz and GuV (Balance Sheet and P&L)',
      ],
      localGAAP: [
        'German GAAP: HGB accounting principles',
        'German GAAP: Principle of prudence (Vorsichtsprinzip)',
        'German GAAP: Going concern assumption',
      ],
    },
    FR: {
      taxReporting: {
        form: 'Liasse fiscale',
        filingRequirement: 'Plan Comptable Général (PCG)',
        taxYear: 'Exercice comptable',
      },
      statutoryDisclosures: [
        'Code de commerce requirements',
        'Annexe (Notes to financial statements)',
        'Rapport de gestion (Management report)',
      ],
      localGAAP: [
        'French GAAP: Plan Comptable Général',
        'French GAAP: Principe de prudence',
        'French GAAP: Image fidèle (True and fair view)',
      ],
    },
    IN: {
      taxReporting: {
        form: 'Form AOC-4 (Financial Statements)',
        filingRequirement: 'Ind AS or Indian GAAP',
        taxYear: 'Financial Year (April-March)',
      },
      statutoryDisclosures: [
        'Companies Act 2013 requirements',
        'Schedule III format for financial statements',
        'CARO (Companies Auditor Report Order)',
      ],
      localGAAP: [
        'Ind AS: Converged with IFRS',
        'Ind AS: Revenue recognition per Ind AS 115',
        'Ind AS: Financial instruments per Ind AS 109',
      ],
    },
    CN: {
      taxReporting: {
        form: 'Annual Report (年度报告)',
        filingRequirement: 'Chinese Accounting Standards (CAS)',
        taxYear: 'Calendar Year',
      },
      statutoryDisclosures: [
        'Company Law requirements',
        'Securities Law disclosures (for listed companies)',
        'CSRC (China Securities Regulatory Commission) rules',
      ],
      localGAAP: [
        'CAS: Substantially converged with IFRS',
        'CAS: Revenue recognition per CAS 14',
        'CAS: Financial instruments per CAS 22',
      ],
    },
    JP: {
      taxReporting: {
        form: '有価証券報告書 (Securities Report)',
        filingRequirement: 'J-GAAP or IFRS',
        taxYear: 'Fiscal Year',
      },
      statutoryDisclosures: [
        'Companies Act requirements',
        'Financial Instruments and Exchange Act',
        'Corporate governance disclosures',
      ],
      localGAAP: [
        'J-GAAP: Japanese Generally Accepted Accounting Principles',
        'J-GAAP: Revenue recognition standards',
        'J-GAAP: Lease accounting standards',
      ],
    },
    AU: {
      taxReporting: {
        form: 'Annual Financial Report',
        filingRequirement: 'AASB (Australian Accounting Standards)',
        taxYear: 'Financial Year',
      },
      statutoryDisclosures: [
        'Corporations Act 2001 requirements',
        'ASIC regulatory requirements',
        'Directors\' declaration',
      ],
      localGAAP: [
        'AASB: Equivalent to IFRS',
        'AASB: Revenue recognition per AASB 15',
        'AASB: Leases per AASB 16',
      ],
    },
    CA: {
      taxReporting: {
        form: 'T2 Corporation Income Tax Return',
        filingRequirement: 'IFRS or ASPE',
        taxYear: 'Taxation Year',
      },
      statutoryDisclosures: [
        'Canada Business Corporations Act requirements',
        'Provincial securities regulations',
        'CPA Canada Handbook requirements',
      ],
      localGAAP: [
        'Canadian GAAP: IFRS for public companies',
        'Canadian GAAP: ASPE for private enterprises',
        'Canadian GAAP: Revenue recognition standards',
      ],
    },
    BR: {
      taxReporting: {
        form: 'Demonstrações Financeiras',
        filingRequirement: 'BR GAAP or IFRS',
        taxYear: 'Ano Fiscal',
      },
      statutoryDisclosures: [
        'Lei das S.A. (Corporate Law) requirements',
        'CVM (Securities Commission) regulations',
        'Notas explicativas (Explanatory notes)',
      ],
      localGAAP: [
        'BR GAAP: Converged with IFRS',
        'BR GAAP: CPC (Accounting Pronouncements Committee)',
        'BR GAAP: Revenue recognition per CPC 47',
      ],
    },
  };

  return requirements[country];
}

/**
 * Get list of supported countries
 */
export function getSupportedCountries(): Array<{ code: CountryCode; name: string; standard: AccountingStandard }> {
  const countries: CountryCode[] = ['US', 'UK', 'DE', 'FR', 'IN', 'CN', 'JP', 'AU', 'CA', 'BR'];
  
  return countries.map(code => ({
    code,
    name: getCountryName(code),
    standard: getCountryStandard(code),
  }));
}
