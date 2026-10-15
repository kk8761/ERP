/**
 * Financial Consolidation Module Tests
 * 
 * Tests for:
 * - Company management
 * - Consolidation group management
 * - Intercompany transaction tracking
 * - Consolidation process
 * - Elimination entries
 */

import * as consolidationService from '../services/financial-consolidation.service';
import prisma from '../config/prisma';

async function testFinancialConsolidation() {
  console.log('🧪 Testing Financial Consolidation Module...\n');
  
  try {
    // ========================================================================
    // Test 1: Create Companies
    // ========================================================================
    console.log('1️⃣  Creating parent and subsidiary companies...');
    
    const parentCompany = await consolidationService.createCompany({
      companyCode: 'PARENT-001',
      name: 'Parent Corporation',
      legalName: 'Parent Corporation Inc.',
      taxId: 'TAX-PARENT-001',
      currency: 'USD',
      fiscalYearEnd: '12-31',
    });
    console.log(`✅ Created parent company: ${parentCompany.name}`);
    
    const subsidiary1 = await consolidationService.createCompany({
      companyCode: 'SUB-001',
      name: 'Subsidiary One LLC',
      legalName: 'Subsidiary One Limited Liability Company',
      taxId: 'TAX-SUB-001',
      currency: 'USD',
      fiscalYearEnd: '12-31',
      parentCompanyId: parentCompany.id,
      ownershipPercentage: 100,
      consolidationMethod: 'full',
    });
    console.log(`✅ Created subsidiary 1: ${subsidiary1.name} (100% owned)`);
    
    const subsidiary2 = await consolidationService.createCompany({
      companyCode: 'SUB-002',
      name: 'Subsidiary Two Inc',
      legalName: 'Subsidiary Two Incorporated',
      taxId: 'TAX-SUB-002',
      currency: 'USD',
      fiscalYearEnd: '12-31',
      parentCompanyId: parentCompany.id,
      ownershipPercentage: 75,
      consolidationMethod: 'full',
    });
    console.log(`✅ Created subsidiary 2: ${subsidiary2.name} (75% owned)\n`);
    
    // ========================================================================
    // Test 2: Get Company Hierarchy
    // ========================================================================
    console.log('2️⃣  Fetching company hierarchy...');
    const hierarchy = await consolidationService.getCompanyHierarchy(parentCompany.id);
    console.log(`✅ Parent: ${hierarchy?.name}`);
    console.log(`   Subsidiaries: ${hierarchy?.subsidiaries.length}`);
    hierarchy?.subsidiaries.forEach(sub => {
      console.log(`   - ${sub.name} (${sub.ownershipPercentage}%)`);
    });
    console.log('');
    
    // ========================================================================
    // Test 3: Create Consolidation Group
    // ========================================================================
    console.log('3️⃣  Creating consolidation group...');
    const group = await consolidationService.createConsolidationGroup({
      name: 'Corporate Group',
      description: 'Main corporate consolidation group',
      groupType: 'legal',
      members: [
        {
          companyId: parentCompany.id,
          role: 'parent',
          effectiveDate: new Date('2024-01-01'),
        },
        {
          companyId: subsidiary1.id,
          role: 'subsidiary',
          effectiveDate: new Date('2024-01-01'),
        },
        {
          companyId: subsidiary2.id,
          role: 'subsidiary',
          effectiveDate: new Date('2024-01-01'),
        },
      ],
    });
    console.log(`✅ Created consolidation group: ${group.name}`);
    console.log(`   Members: ${group.members.length}\n`);
    
    // ========================================================================
    // Test 4: Create Intercompany Transactions
    // ========================================================================
    console.log('4️⃣  Creating intercompany transactions...');
    
    const icTransaction1 = await consolidationService.createIntercompanyTransaction({
      transactionDate: new Date('2024-06-15'),
      fromCompanyId: subsidiary1.id,
      toCompanyId: subsidiary2.id,
      transactionType: 'sale',
      description: 'Intercompany sale of goods',
      amount: 50000,
      currency: 'USD',
    });
    console.log(`✅ Created intercompany sale: ${icTransaction1.transactionNumber} ($${icTransaction1.amount})`);
    
    const icTransaction2 = await consolidationService.createIntercompanyTransaction({
      transactionDate: new Date('2024-06-20'),
      fromCompanyId: parentCompany.id,
      toCompanyId: subsidiary1.id,
      transactionType: 'loan',
      description: 'Intercompany loan',
      amount: 100000,
      currency: 'USD',
    });
    console.log(`✅ Created intercompany loan: ${icTransaction2.transactionNumber} ($${icTransaction2.amount})\n`);
    
    // ========================================================================
    // Test 5: Find Intercompany Transactions
    // ========================================================================
    console.log('5️⃣  Finding intercompany transactions...');
    const companyIds = [parentCompany.id, subsidiary1.id, subsidiary2.id];
    const icTransactions = await consolidationService.findIntercompanyTransactions(
      companyIds,
      new Date('2024-01-01'),
      new Date('2024-12-31'),
      true // only uneliminated
    );
    console.log(`✅ Found ${icTransactions.length} uneliminated intercompany transactions`);
    icTransactions.forEach(txn => {
      console.log(`   - ${txn.transactionNumber}: ${txn.fromCompany.name} → ${txn.toCompany.name} ($${txn.amount})`);
    });
    console.log('');
    
    // ========================================================================
    // Test 6: Create Consolidation
    // ========================================================================
    console.log('6️⃣  Creating consolidation...');
    const consolidation = await consolidationService.createConsolidation({
      consolidationDate: new Date('2024-06-30'),
      periodStart: new Date('2024-01-01'),
      periodEnd: new Date('2024-06-30'),
      parentCompanyId: parentCompany.id,
      consolidationGroupId: group.id,
      subsidiaryIds: [subsidiary1.id, subsidiary2.id],
      consolidationMethod: 'full',
      createdBy: 'test-user',
    });
    console.log(`✅ Created consolidation: ${consolidation?.consolidationNumber}`);
    console.log(`   Status: ${consolidation?.status}`);
    console.log(`   Subsidiaries: ${consolidation?.subsidiaries.length}\n`);
    
    // ========================================================================
    // Test 7: Update Subsidiary Financials
    // ========================================================================
    console.log('7️⃣  Updating subsidiary financial data...');
    
    if (consolidation) {
      await consolidationService.updateSubsidiaryFinancials(
        consolidation.id,
        subsidiary1.id,
        {
          revenue: 500000,
          expenses: 350000,
          assets: 1000000,
          liabilities: 400000,
          equity: 600000,
          netIncome: 150000,
        }
      );
      console.log(`✅ Updated financials for ${subsidiary1.name}`);
      
      await consolidationService.updateSubsidiaryFinancials(
        consolidation.id,
        subsidiary2.id,
        {
          revenue: 300000,
          expenses: 220000,
          assets: 600000,
          liabilities: 250000,
          equity: 350000,
          netIncome: 80000,
        }
      );
      console.log(`✅ Updated financials for ${subsidiary2.name}\n`);
    }
    
    // ========================================================================
    // Test 8: Perform Consolidation
    // ========================================================================
    console.log('8️⃣  Performing consolidation...');
    if (consolidation) {
      const completedConsolidation = await consolidationService.performConsolidation(
        consolidation.id
      );
      console.log(`✅ Consolidation completed`);
      console.log(`   Status: ${completedConsolidation.status}`);
      console.log(`   Total Revenue: $${completedConsolidation.totalRevenue.toLocaleString()}`);
      console.log(`   Total Expenses: $${completedConsolidation.totalExpenses.toLocaleString()}`);
      console.log(`   Total Assets: $${completedConsolidation.totalAssets.toLocaleString()}`);
      console.log(`   Total Liabilities: $${completedConsolidation.totalLiabilities.toLocaleString()}`);
      console.log(`   Net Income: $${completedConsolidation.netIncome.toLocaleString()}\n`);
    }
    
    // ========================================================================
    // Test 9: Create Elimination Entries
    // ========================================================================
    console.log('9️⃣  Creating elimination entries for intercompany transactions...');
    if (consolidation) {
      const eliminationEntries = await consolidationService.createEliminationsForIntercompanyTransactions(
        consolidation.id,
        [icTransaction1.id, icTransaction2.id],
        'test-user'
      );
      console.log(`✅ Created ${eliminationEntries.length} elimination entries`);
      eliminationEntries.forEach(entry => {
        console.log(`   - ${entry.entryNumber}: ${entry.eliminationType} ($${entry.totalAmount})`);
      });
      console.log('');
      
      // Post elimination entries
      console.log('🔟 Posting elimination entries...');
      for (const entry of eliminationEntries) {
        const postedEntry = await consolidationService.postEliminationEntry(
          entry.id,
          'test-user'
        );
        console.log(`✅ Posted ${postedEntry.entryNumber}`);
      }
      console.log('');
    }
    
    // ========================================================================
    // Test 10: Generate Consolidated Financial Statements
    // ========================================================================
    console.log('1️⃣1️⃣  Generating consolidated financial statements...');
    if (consolidation) {
      const statements = await consolidationService.generateConsolidatedFinancialStatements(
        consolidation.id
      );
      console.log(`✅ Generated consolidated financial statements`);
      console.log(`\n📊 Income Statement:`);
      console.log(`   Revenue: $${statements.incomeStatement.revenue.toLocaleString()}`);
      console.log(`   Expenses: $${statements.incomeStatement.expenses.toLocaleString()}`);
      console.log(`   Net Income: $${statements.incomeStatement.netIncome.toLocaleString()}`);
      console.log(`\n📊 Balance Sheet:`);
      console.log(`   Assets: $${statements.balanceSheet.assets.toLocaleString()}`);
      console.log(`   Liabilities: $${statements.balanceSheet.liabilities.toLocaleString()}`);
      console.log(`   Equity: $${statements.balanceSheet.equity.toLocaleString()}`);
      console.log(`\n📊 Eliminations:`);
      console.log(`   Total Eliminations: $${statements.totalEliminations.toLocaleString()}`);
      console.log(`   Elimination Entries: ${statements.eliminations.length}`);
      console.log('');
    }
    
    // ========================================================================
    // Test 11: Approve Consolidation
    // ========================================================================
    console.log('1️⃣2️⃣  Approving consolidation...');
    if (consolidation) {
      const approvedConsolidation = await consolidationService.approveConsolidation(
        consolidation.id,
        'test-approver'
      );
      console.log(`✅ Consolidation approved`);
      console.log(`   Status: ${approvedConsolidation.status}`);
      console.log(`   Approved by: ${approvedConsolidation.approvedBy}`);
      console.log(`   Approved at: ${approvedConsolidation.approvedAt}\n`);
    }
    
    // ========================================================================
    // Test 12: Get All Consolidations
    // ========================================================================
    console.log('1️⃣3️⃣  Fetching all consolidations...');
    const allConsolidations = await consolidationService.getConsolidations({
      parentCompanyId: parentCompany.id,
    });
    console.log(`✅ Found ${allConsolidations.length} consolidations for ${parentCompany.name}`);
    allConsolidations.forEach(cons => {
      console.log(`   - ${cons.consolidationNumber}: ${cons.status} (${cons.subsidiaries.length} subsidiaries)`);
    });
    console.log('');
    
    console.log('✅ All Financial Consolidation tests passed!\n');
    
  } catch (error: any) {
    console.error('❌ Test failed:', error.message);
    console.error(error.stack);
    throw error;
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  testFinancialConsolidation()
    .then(() => {
      console.log('✅ Test suite completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Test suite failed:', error);
      process.exit(1);
    });
}

export { testFinancialConsolidation };
