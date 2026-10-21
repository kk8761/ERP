/**
 * Financial Consolidation Service
 * 
 * Handles multi-entity financial consolidation including:
 * - Consolidation group and hierarchy management
 * - Subsidiary financial statement combination
 * - Intercompany transaction tracking and elimination
 * - Consolidated financial statement generation
 */

import prisma from '../config/prisma';
// import { Prisma } from '@prisma/client';

// ============================================================================
// Company Management
// ============================================================================

export interface CompanyInput {
  companyCode: string;
  name: string;
  legalName: string;
  taxId?: string;
  currency?: string;
  fiscalYearEnd: string; // MM-DD format
  parentCompanyId?: string;
  ownershipPercentage?: number;
  consolidationMethod?: 'full' | 'proportional' | 'equity';
}

/**
 * Create a new company entity
 */
export async function createCompany(data: CompanyInput) {
  return await prisma.company.create({
    data: {
      companyCode: data.companyCode,
      name: data.name,
      legalName: data.legalName,
      taxId: data.taxId,
      currency: data.currency || 'USD',
      fiscalYearEnd: data.fiscalYearEnd,
      parentCompanyId: data.parentCompanyId,
      ownershipPercentage: data.ownershipPercentage || 100,
      consolidationMethod: data.consolidationMethod || 'full',
    },
    include: {
      parentCompany: true,
      subsidiaries: true,
    },
  });
}

/**
 * Get all companies
 */
export async function getCompanies(filters?: { isActive?: boolean }) {
  return await prisma.company.findMany({
    where: {
      isActive: filters?.isActive,
    },
    include: {
      parentCompany: true,
      subsidiaries: true,
    },
    orderBy: {
      name: 'asc',
    },
  });
}

/**
 * Get company hierarchy (parent and all subsidiaries)
 */
export async function getCompanyHierarchy(companyId: string) {
  const company = await prisma.company.findUnique({
    where: { id: companyId },
    include: {
      parentCompany: true,
      subsidiaries: {
        include: {
          subsidiaries: true, // Get grandchildren too
        },
      },
    },
  });

  return company;
}

/**
 * Update company ownership percentage
 */
export async function updateCompanyOwnership(
  companyId: string,
  ownershipPercentage: number,
  consolidationMethod: 'full' | 'proportional' | 'equity'
) {
  return await prisma.company.update({
    where: { id: companyId },
    data: {
      ownershipPercentage,
      consolidationMethod,
    },
  });
}

// ============================================================================
// Consolidation Group Management
// ============================================================================

export interface ConsolidationGroupInput {
  name: string;
  description?: string;
  groupType: 'legal' | 'management' | 'reporting';
  members: {
    companyId: string;
    role: 'parent' | 'subsidiary' | 'associate';
    effectiveDate: Date;
  }[];
}

/**
 * Create a consolidation group
 */
export async function createConsolidationGroup(data: ConsolidationGroupInput) {
  return await prisma.consolidationGroup.create({
    data: {
      name: data.name,
      description: data.description,
      groupType: data.groupType,
      members: {
        create: data.members.map((member) => ({
          companyId: member.companyId,
          role: member.role,
          effectiveDate: member.effectiveDate,
        })),
      },
    },
    include: {
      members: {
        include: {
          company: true,
        },
      },
    },
  });
}

/**
 * Get all consolidation groups
 */
export async function getConsolidationGroups(filters?: { isActive?: boolean }) {
  return await prisma.consolidationGroup.findMany({
    where: {
      isActive: filters?.isActive,
    },
    include: {
      members: {
        include: {
          company: true,
        },
        where: {
          endDate: null, // Only active members
        },
      },
    },
    orderBy: {
      name: 'asc',
    },
  });
}

/**
 * Add company to consolidation group
 */
export async function addCompanyToGroup(
  groupId: string,
  companyId: string,
  role: 'parent' | 'subsidiary' | 'associate',
  effectiveDate: Date
) {
  return await prisma.consolidationGroupMember.create({
    data: {
      groupId,
      companyId,
      role,
      effectiveDate,
    },
    include: {
      company: true,
      group: true,
    },
  });
}

/**
 * Remove company from consolidation group
 */
export async function removeCompanyFromGroup(
  groupId: string,
  companyId: string,
  endDate: Date
) {
  // Find the active membership
  const membership = await prisma.consolidationGroupMember.findFirst({
    where: {
      groupId,
      companyId,
      endDate: null,
    },
  });

  if (!membership) {
    throw new Error('Active membership not found');
  }

  return await prisma.consolidationGroupMember.update({
    where: { id: membership.id },
    data: { endDate },
  });
}

// ============================================================================
// Intercompany Transaction Management
// ============================================================================

export interface IntercompanyTransactionInput {
  transactionDate: Date;
  fromCompanyId: string;
  toCompanyId: string;
  transactionType: 'sale' | 'purchase' | 'loan' | 'dividend' | 'service';
  description: string;
  amount: number;
  currency?: string;
  fromAccountId?: string;
  toAccountId?: string;
  sourceDocumentType?: string;
  sourceDocumentId?: string;
}

/**
 * Create an intercompany transaction
 */
export async function createIntercompanyTransaction(
  data: IntercompanyTransactionInput
) {
  // Generate transaction number
  const count = await prisma.intercompanyTransaction.count();
  const transactionNumber = `IC-${String(count + 1).padStart(6, '0')}`;

  return await prisma.intercompanyTransaction.create({
    data: {
      transactionNumber,
      transactionDate: data.transactionDate,
      fromCompanyId: data.fromCompanyId,
      toCompanyId: data.toCompanyId,
      transactionType: data.transactionType,
      description: data.description,
      amount: data.amount,
      currency: data.currency || 'USD',
      fromAccountId: data.fromAccountId,
      toAccountId: data.toAccountId,
      sourceDocumentType: data.sourceDocumentType,
      sourceDocumentId: data.sourceDocumentId,
      requiresElimination: true,
      isEliminated: false,
    },
    include: {
      fromCompany: true,
      toCompany: true,
    },
  });
}

/**
 * Find intercompany transactions for consolidation
 */
export async function findIntercompanyTransactions(
  companyIds: string[],
  periodStart: Date,
  periodEnd: Date,
  onlyUneliminated: boolean = true
) {
  return await prisma.intercompanyTransaction.findMany({
    where: {
      AND: [
        {
          fromCompanyId: { in: companyIds },
          toCompanyId: { in: companyIds },
        },
        {
          transactionDate: {
            gte: periodStart,
            lte: periodEnd,
          },
        },
        onlyUneliminated ? { isEliminated: false } : {},
      ],
    },
    include: {
      fromCompany: true,
      toCompany: true,
    },
    orderBy: {
      transactionDate: 'asc',
    },
  });
}

/**
 * Get intercompany transactions by type
 */
export async function getIntercompanyTransactionsByType(
  companyIds: string[],
  transactionType: string,
  periodStart: Date,
  periodEnd: Date
) {
  return await prisma.intercompanyTransaction.findMany({
    where: {
      fromCompanyId: { in: companyIds },
      toCompanyId: { in: companyIds },
      transactionType,
      transactionDate: {
        gte: periodStart,
        lte: periodEnd,
      },
    },
    include: {
      fromCompany: true,
      toCompany: true,
    },
  });
}

// ============================================================================
// Consolidation Process
// ============================================================================

export interface ConsolidationInput {
  consolidationDate: Date;
  periodStart: Date;
  periodEnd: Date;
  parentCompanyId: string;
  consolidationGroupId?: string;
  subsidiaryIds: string[];
  consolidationMethod?: 'full' | 'proportional' | 'equity';
  createdBy: string;
}

/**
 * Create a new consolidation run
 */
export async function createConsolidation(data: ConsolidationInput) {
  // Generate consolidation number
  const count = await prisma.consolidation.count();
  const consolidationNumber = `CONS-${String(count + 1).padStart(6, '0')}`;

  // Create consolidation with subsidiaries
  const consolidation = await prisma.consolidation.create({
    data: {
      consolidationNumber,
      consolidationDate: data.consolidationDate,
      periodStart: data.periodStart,
      periodEnd: data.periodEnd,
      parentCompanyId: data.parentCompanyId,
      consolidationGroupId: data.consolidationGroupId,
      consolidationMethod: data.consolidationMethod || 'full',
      status: 'draft',
      createdBy: data.createdBy,
    },
  });

  // Add subsidiaries
  for (const subsidiaryId of data.subsidiaryIds) {
    const company = await prisma.company.findUnique({
      where: { id: subsidiaryId },
    });

    if (!company) {
      throw new Error(`Company ${subsidiaryId} not found`);
    }

    await prisma.consolidationSubsidiary.create({
      data: {
        consolidationId: consolidation.id,
        companyId: subsidiaryId,
        ownershipPercentage: company.ownershipPercentage || 100,
        consolidationMethod: company.consolidationMethod || 'full',
      },
    });
  }

  return await prisma.consolidation.findUnique({
    where: { id: consolidation.id },
    include: {
      parentCompany: true,
      consolidationGroup: true,
      subsidiaries: {
        include: {
          company: true,
        },
      },
    },
  });
}

/**
 * Get subsidiary financial data for consolidation
 * In a real implementation, this would query the financial statements
 * For now, we'll use placeholder data
 */
async function getSubsidiaryFinancials(
  _companyId: string,
  _periodStart: Date,
  _periodEnd: Date
) {
  // TODO: Implement actual financial statement queries
  // This would aggregate data from JournalEntry, Account, etc.
  
  // Placeholder implementation
  return {
    revenue: 0,
    expenses: 0,
    assets: 0,
    liabilities: 0,
    equity: 0,
    netIncome: 0,
  };
}

/**
 * Calculate consolidated amounts based on ownership percentage
 */
function calculateConsolidatedAmounts(
  financials: {
    revenue: number;
    expenses: number;
    assets: number;
    liabilities: number;
    equity: number;
    netIncome: number;
  },
  ownershipPercentage: number,
  consolidationMethod: string
) {
  if (consolidationMethod === 'full') {
    // Full consolidation - include 100% regardless of ownership
    return {
      consolidatedRevenue: financials.revenue,
      consolidatedExpenses: financials.expenses,
      consolidatedAssets: financials.assets,
      consolidatedLiabilities: financials.liabilities,
      consolidatedEquity: financials.equity,
      consolidatedNetIncome: financials.netIncome,
      minorityInterest:
        ownershipPercentage < 100
          ? (financials.equity * (100 - ownershipPercentage)) / 100
          : 0,
    };
  } else if (consolidationMethod === 'proportional') {
    // Proportional consolidation - include only ownership %
    const factor = ownershipPercentage / 100;
    return {
      consolidatedRevenue: financials.revenue * factor,
      consolidatedExpenses: financials.expenses * factor,
      consolidatedAssets: financials.assets * factor,
      consolidatedLiabilities: financials.liabilities * factor,
      consolidatedEquity: financials.equity * factor,
      consolidatedNetIncome: financials.netIncome * factor,
      minorityInterest: 0,
    };
  } else {
    // Equity method - only include net income proportionally
    const factor = ownershipPercentage / 100;
    return {
      consolidatedRevenue: 0,
      consolidatedExpenses: 0,
      consolidatedAssets: 0,
      consolidatedLiabilities: 0,
      consolidatedEquity: 0,
      consolidatedNetIncome: financials.netIncome * factor,
      minorityInterest: 0,
    };
  }
}

/**
 * Update subsidiary financial data in consolidation
 */
export async function updateSubsidiaryFinancials(
  consolidationId: string,
  subsidiaryId: string,
  financials: {
    revenue: number;
    expenses: number;
    assets: number;
    liabilities: number;
    equity: number;
    netIncome: number;
  }
) {
  const subsidiary = await prisma.consolidationSubsidiary.findUnique({
    where: {
      consolidationId_companyId: {
        consolidationId,
        companyId: subsidiaryId,
      },
    },
  });

  if (!subsidiary) {
    throw new Error('Subsidiary not found in consolidation');
  }

  // Calculate consolidated amounts
  const consolidated = calculateConsolidatedAmounts(
    financials,
    subsidiary.ownershipPercentage,
    subsidiary.consolidationMethod
  );

  return await prisma.consolidationSubsidiary.update({
    where: { id: subsidiary.id },
    data: {
      revenue: financials.revenue,
      expenses: financials.expenses,
      assets: financials.assets,
      liabilities: financials.liabilities,
      equity: financials.equity,
      netIncome: financials.netIncome,
      ...consolidated,
    },
  });
}

/**
 * Perform consolidation - combine subsidiary financials
 */
export async function performConsolidation(consolidationId: string) {
  const consolidation = await prisma.consolidation.findUnique({
    where: { id: consolidationId },
    include: {
      subsidiaries: {
        include: {
          company: true,
        },
      },
    },
  });

  if (!consolidation) {
    throw new Error('Consolidation not found');
  }

  // Update status
  await prisma.consolidation.update({
    where: { id: consolidationId },
    data: { status: 'in_progress' },
  });

  // Get financial data for each subsidiary
  for (const subsidiary of consolidation.subsidiaries) {
    const financials = await getSubsidiaryFinancials(
      subsidiary.companyId,
      consolidation.periodStart,
      consolidation.periodEnd
    );

    await updateSubsidiaryFinancials(
      consolidationId,
      subsidiary.companyId,
      financials
    );
  }

  // Calculate consolidated totals
  const subsidiaries = await prisma.consolidationSubsidiary.findMany({
    where: { consolidationId },
  });

  const totals = subsidiaries.reduce(
    (acc, sub) => ({
      totalRevenue: acc.totalRevenue + sub.consolidatedRevenue,
      totalExpenses: acc.totalExpenses + sub.consolidatedExpenses,
      totalAssets: acc.totalAssets + sub.consolidatedAssets,
      totalLiabilities: acc.totalLiabilities + sub.consolidatedLiabilities,
      totalEquity: acc.totalEquity + sub.consolidatedEquity,
      netIncome: acc.netIncome + sub.consolidatedNetIncome,
    }),
    {
      totalRevenue: 0,
      totalExpenses: 0,
      totalAssets: 0,
      totalLiabilities: 0,
      totalEquity: 0,
      netIncome: 0,
    }
  );

  // Update consolidation with totals
  return await prisma.consolidation.update({
    where: { id: consolidationId },
    data: {
      ...totals,
      status: 'completed',
    },
    include: {
      parentCompany: true,
      subsidiaries: {
        include: {
          company: true,
        },
      },
      eliminationEntries: true,
    },
  });
}

// ============================================================================
// Elimination Entries
// ============================================================================

export interface EliminationEntryInput {
  consolidationId: string;
  entryDate: Date;
  description: string;
  eliminationType: 'intercompany_sale' | 'intercompany_loan' | 'dividend' | 'investment';
  lines: {
    accountCode: string;
    accountName: string;
    debit: number;
    credit: number;
    description?: string;
    companyId?: string;
  }[];
  intercompanyTransactionIds?: string[];
  createdBy: string;
}

/**
 * Create an elimination entry
 */
export async function createEliminationEntry(data: EliminationEntryInput) {
  // Validate that debits equal credits
  const totalDebits = data.lines.reduce((sum, line) => sum + line.debit, 0);
  const totalCredits = data.lines.reduce((sum, line) => sum + line.credit, 0);

  if (Math.abs(totalDebits - totalCredits) > 0.01) {
    throw new Error(
      `Elimination entry is not balanced. Debits: ${totalDebits}, Credits: ${totalCredits}`
    );
  }

  // Generate entry number
  const count = await prisma.eliminationEntry.count();
  const entryNumber = `ELIM-${String(count + 1).padStart(6, '0')}`;

  const eliminationEntry = await prisma.eliminationEntry.create({
    data: {
      entryNumber,
      consolidationId: data.consolidationId,
      entryDate: data.entryDate,
      description: data.description,
      eliminationType: data.eliminationType,
      totalAmount: totalDebits, // or totalCredits, they're equal
      status: 'draft',
      createdBy: data.createdBy,
      lines: {
        create: data.lines.map((line) => ({
          accountCode: line.accountCode,
          accountName: line.accountName,
          debit: line.debit,
          credit: line.credit,
          description: line.description,
          companyId: line.companyId,
        })),
      },
    },
    include: {
      lines: true,
    },
  });

  // Link intercompany transactions if provided
  if (data.intercompanyTransactionIds && data.intercompanyTransactionIds.length > 0) {
    await prisma.intercompanyTransaction.updateMany({
      where: {
        id: { in: data.intercompanyTransactionIds },
      },
      data: {
        eliminationEntryId: eliminationEntry.id,
        isEliminated: false, // Will be true when entry is posted
      },
    });
  }

  return eliminationEntry;
}

/**
 * Post an elimination entry
 */
export async function postEliminationEntry(entryId: string, userId: string) {
  const entry = await prisma.eliminationEntry.findUnique({
    where: { id: entryId },
    include: {
      intercompanyTransactions: true,
    },
  });

  if (!entry) {
    throw new Error('Elimination entry not found');
  }

  if (entry.status === 'posted') {
    throw new Error('Elimination entry is already posted');
  }

  // Update entry status
  const updatedEntry = await prisma.eliminationEntry.update({
    where: { id: entryId },
    data: {
      status: 'posted',
      postedBy: userId,
      postedAt: new Date(),
    },
    include: {
      lines: true,
      intercompanyTransactions: true,
    },
  });

  // Mark intercompany transactions as eliminated
  if (entry.intercompanyTransactions.length > 0) {
    await prisma.intercompanyTransaction.updateMany({
      where: {
        eliminationEntryId: entryId,
      },
      data: {
        isEliminated: true,
      },
    });
  }

  // Update consolidation total eliminations
  const consolidation = await prisma.consolidation.findUnique({
    where: { id: entry.consolidationId },
  });

  if (consolidation) {
    await prisma.consolidation.update({
      where: { id: entry.consolidationId },
      data: {
        totalEliminations: consolidation.totalEliminations + entry.totalAmount,
      },
    });
  }

  return updatedEntry;
}

/**
 * Create elimination entries for intercompany transactions
 */
export async function createEliminationsForIntercompanyTransactions(
  consolidationId: string,
  intercompanyTransactionIds: string[],
  createdBy: string
) {
  const transactions = await prisma.intercompanyTransaction.findMany({
    where: {
      id: { in: intercompanyTransactionIds },
    },
    include: {
      fromCompany: true,
      toCompany: true,
    },
  });

  const eliminationEntries = [];

  for (const txn of transactions) {
    // Create elimination entry based on transaction type
    let eliminationType: 'intercompany_sale' | 'intercompany_loan' | 'dividend' | 'investment';
    let lines: EliminationEntryInput['lines'] = [];

    switch (txn.transactionType) {
      case 'sale':
      case 'purchase':
        eliminationType = 'intercompany_sale';
        // Eliminate intercompany revenue and COGS
        lines = [
          {
            accountCode: '4100',
            accountName: 'Intercompany Revenue',
            debit: txn.amount,
            credit: 0,
            description: `Eliminate intercompany sale from ${txn.fromCompany.name}`,
            companyId: txn.fromCompanyId,
          },
          {
            accountCode: '5100',
            accountName: 'Intercompany COGS',
            debit: 0,
            credit: txn.amount,
            description: `Eliminate intercompany purchase to ${txn.toCompany.name}`,
            companyId: txn.toCompanyId,
          },
        ];
        break;

      case 'loan':
        eliminationType = 'intercompany_loan';
        // Eliminate intercompany receivable and payable
        lines = [
          {
            accountCode: '2100',
            accountName: 'Intercompany Payable',
            debit: txn.amount,
            credit: 0,
            description: `Eliminate intercompany payable to ${txn.fromCompany.name}`,
            companyId: txn.toCompanyId,
          },
          {
            accountCode: '1200',
            accountName: 'Intercompany Receivable',
            debit: 0,
            credit: txn.amount,
            description: `Eliminate intercompany receivable from ${txn.toCompany.name}`,
            companyId: txn.fromCompanyId,
          },
        ];
        break;

      case 'dividend':
        eliminationType = 'dividend';
        // Eliminate dividend income and dividend paid
        lines = [
          {
            accountCode: '4200',
            accountName: 'Dividend Income',
            debit: txn.amount,
            credit: 0,
            description: `Eliminate dividend income from ${txn.fromCompany.name}`,
            companyId: txn.toCompanyId,
          },
          {
            accountCode: '3200',
            accountName: 'Dividends Paid',
            debit: 0,
            credit: txn.amount,
            description: `Eliminate dividends paid to ${txn.toCompany.name}`,
            companyId: txn.fromCompanyId,
          },
        ];
        break;

      default:
        // Generic elimination
        eliminationType = 'intercompany_sale';
        lines = [
          {
            accountCode: '9999',
            accountName: 'Intercompany Elimination',
            debit: txn.amount,
            credit: 0,
            description: `Eliminate intercompany transaction`,
          },
          {
            accountCode: '9999',
            accountName: 'Intercompany Elimination',
            debit: 0,
            credit: txn.amount,
            description: `Eliminate intercompany transaction`,
          },
        ];
    }

    const eliminationEntry = await createEliminationEntry({
      consolidationId,
      entryDate: txn.transactionDate,
      description: `Elimination for ${txn.transactionType}: ${txn.description}`,
      eliminationType,
      lines,
      intercompanyTransactionIds: [txn.id],
      createdBy,
    });

    eliminationEntries.push(eliminationEntry);
  }

  return eliminationEntries;
}

/**
 * Get consolidation details
 */
export async function getConsolidation(consolidationId: string) {
  return await prisma.consolidation.findUnique({
    where: { id: consolidationId },
    include: {
      parentCompany: true,
      consolidationGroup: {
        include: {
          members: {
            include: {
              company: true,
            },
          },
        },
      },
      subsidiaries: {
        include: {
          company: true,
        },
      },
      eliminationEntries: {
        include: {
          lines: true,
          intercompanyTransactions: true,
        },
      },
    },
  });
}

/**
 * Get all consolidations
 */
export async function getConsolidations(filters?: {
  parentCompanyId?: string;
  status?: string;
  startDate?: Date;
  endDate?: Date;
}) {
  return await prisma.consolidation.findMany({
    where: {
      parentCompanyId: filters?.parentCompanyId,
      status: filters?.status,
      consolidationDate: {
        gte: filters?.startDate,
        lte: filters?.endDate,
      },
    },
    include: {
      parentCompany: true,
      consolidationGroup: true,
      subsidiaries: {
        include: {
          company: true,
        },
      },
    },
    orderBy: {
      consolidationDate: 'desc',
    },
  });
}

/**
 * Approve consolidation
 */
export async function approveConsolidation(
  consolidationId: string,
  approvedBy: string
) {
  const consolidation = await prisma.consolidation.findUnique({
    where: { id: consolidationId },
  });

  if (!consolidation) {
    throw new Error('Consolidation not found');
  }

  if (consolidation.status !== 'completed') {
    throw new Error('Consolidation must be completed before approval');
  }

  return await prisma.consolidation.update({
    where: { id: consolidationId },
    data: {
      status: 'approved',
      approvedBy,
      approvedAt: new Date(),
    },
  });
}

/**
 * Generate consolidated financial statements
 */
export async function generateConsolidatedFinancialStatements(
  consolidationId: string
) {
  const consolidation = await getConsolidation(consolidationId);

  if (!consolidation) {
    throw new Error('Consolidation not found');
  }

  // Calculate final consolidated amounts after eliminations
  const consolidatedRevenue =
    consolidation.totalRevenue - consolidation.totalEliminations;
  const consolidatedNetIncome = consolidation.netIncome;

  return {
    consolidationNumber: consolidation.consolidationNumber,
    consolidationDate: consolidation.consolidationDate,
    periodStart: consolidation.periodStart,
    periodEnd: consolidation.periodEnd,
    parentCompany: consolidation.parentCompany,
    
    // Income Statement
    incomeStatement: {
      revenue: consolidatedRevenue,
      expenses: consolidation.totalExpenses,
      netIncome: consolidatedNetIncome,
    },
    
    // Balance Sheet
    balanceSheet: {
      assets: consolidation.totalAssets,
      liabilities: consolidation.totalLiabilities,
      equity: consolidation.totalEquity,
    },
    
    // Subsidiary details
    subsidiaries: consolidation.subsidiaries.map((sub) => ({
      company: sub.company,
      ownershipPercentage: sub.ownershipPercentage,
      consolidationMethod: sub.consolidationMethod,
      revenue: sub.revenue,
      consolidatedRevenue: sub.consolidatedRevenue,
      netIncome: sub.netIncome,
      consolidatedNetIncome: sub.consolidatedNetIncome,
      minorityInterest: sub.minorityInterest,
    })),
    
    // Elimination entries
    eliminations: consolidation.eliminationEntries.map((entry) => ({
      entryNumber: entry.entryNumber,
      description: entry.description,
      eliminationType: entry.eliminationType,
      totalAmount: entry.totalAmount,
      status: entry.status,
      lines: entry.lines,
    })),
    
    totalEliminations: consolidation.totalEliminations,
  };
}
