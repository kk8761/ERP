/**
 * Tax Engine Usage Examples
 * 
 * This file demonstrates how to use the tax engine integration
 * in various scenarios.
 */

import { taxEngineService, TaxCalculationRequest } from '../src/services/tax-engine.service';
import prisma from '../src/config/prisma';

/**
 * Example 1: Calculate tax for a simple US transaction
 */
async function example1_USTransaction() {
  console.log('\n=== Example 1: US Sales Tax Calculation ===\n');

  const request: TaxCalculationRequest = {
    transactionType: 'invoice',
    customerAddress: {
      line1: '123 Main Street',
      city: 'Seattle',
      state: 'WA',
      postalCode: '98101',
      country: 'US',
    },
    sellerAddress: {
      line1: '456 Business Ave',
      city: 'Seattle',
      state: 'WA',
      postalCode: '98102',
      country: 'US',
    },
    lineItems: [
      {
        description: 'Laptop Computer',
        quantity: 1,
        amount: 1200.00,
      },
      {
        description: 'Wireless Mouse',
        quantity: 2,
        amount: 50.00,
      },
    ],
    currency: 'USD',
  };

  const result = await taxEngineService.calculateTax(request);

  console.log('Tax Calculation Result:');
  console.log(`  Total Tax: $${result.totalTax.toFixed(2)}`);
  console.log(`  Taxable Amount: $${result.taxableAmount.toFixed(2)}`);
  console.log(`  Tax Engine: ${result.taxEngineProvider}`);
  console.log('\nTax Breakdown:');
  result.taxByType.forEach((tax) => {
    console.log(`  ${tax.taxName}: ${tax.rate}% = $${tax.taxAmount.toFixed(2)}`);
  });
}

/**
 * Example 2: Calculate VAT for UK transaction
 */
async function example2_UKVATTransaction() {
  console.log('\n=== Example 2: UK VAT Calculation ===\n');

  const request: TaxCalculationRequest = {
    transactionType: 'invoice',
    customerAddress: {
      line1: '10 Downing Street',
      city: 'London',
      postalCode: 'SW1A 2AA',
      country: 'GB',
    },
    sellerAddress: {
      line1: '123 Business Park',
      city: 'London',
      postalCode: 'E1 6AN',
      country: 'GB',
    },
    lineItems: [
      {
        description: 'Consulting Services',
        quantity: 10,
        amount: 1000.00,
      },
    ],
    currency: 'GBP',
  };

  const result = await taxEngineService.calculateTax(request);

  console.log('VAT Calculation Result:');
  console.log(`  Total VAT: £${result.totalTax.toFixed(2)}`);
  console.log(`  Net Amount: £${result.taxableAmount.toFixed(2)}`);
  console.log(`  Gross Amount: £${(result.taxableAmount + result.totalTax).toFixed(2)}`);
}

/**
 * Example 3: Calculate GST for India transaction
 */
async function example3_IndiaGSTTransaction() {
  console.log('\n=== Example 3: India GST Calculation ===\n');

  const request: TaxCalculationRequest = {
    transactionType: 'invoice',
    customerAddress: {
      line1: 'MG Road',
      city: 'Bangalore',
      state: 'Karnataka',
      postalCode: '560001',
      country: 'IN',
    },
    sellerAddress: {
      line1: 'Tech Park',
      city: 'Bangalore',
      state: 'Karnataka',
      postalCode: '560001',
      country: 'IN',
    },
    lineItems: [
      {
        description: 'Software License',
        quantity: 1,
        amount: 50000.00,
      },
    ],
    currency: 'INR',
  };

  const result = await taxEngineService.calculateTax(request);

  console.log('GST Calculation Result:');
  console.log(`  Total GST: ₹${result.totalTax.toFixed(2)}`);
  console.log(`  Taxable Amount: ₹${result.taxableAmount.toFixed(2)}`);
  console.log(`  Total Amount: ₹${(result.taxableAmount + result.totalTax).toFixed(2)}`);
}

/**
 * Example 4: Calculate tax for an existing invoice
 */
async function example4_ExistingInvoice() {
  console.log('\n=== Example 4: Calculate Tax for Existing Invoice ===\n');

  // First, create a sample invoice
  const invoice = await prisma.invoice.create({
    data: {
      invoiceNo: `INV-TAX-${Date.now()}`,
      type: 'AR',
      issueDate: new Date(),
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      subtotal: 500.00,
      taxAmount: 0,
      total: 500.00,
      status: 'unpaid',
      lineItems: {
        create: [
          {
            lineNumber: 1,
            description: 'Product A',
            quantity: 5,
            unitPrice: 100.00,
            amount: 500.00,
            taxAmount: 0,
          },
        ],
      },
    },
    include: {
      lineItems: true,
    },
  });

  console.log(`Created invoice: ${invoice.invoiceNo}`);

  // Calculate tax for the invoice
  const request: TaxCalculationRequest = {
    transactionId: invoice.id,
    transactionType: 'invoice',
    customerAddress: {
      line1: '123 Customer St',
      city: 'Seattle',
      state: 'WA',
      postalCode: '98101',
      country: 'US',
    },
    sellerAddress: {
      line1: '456 Company Ave',
      city: 'Seattle',
      state: 'WA',
      postalCode: '98102',
      country: 'US',
    },
    lineItems: invoice.lineItems.map((item) => ({
      description: item.description,
      quantity: item.quantity,
      amount: item.amount,
    })),
    currency: 'USD',
    transactionDate: invoice.issueDate,
  };

  const result = await taxEngineService.calculateTax(request);

  // Update invoice with calculated tax
  const updatedInvoice = await prisma.invoice.update({
    where: { id: invoice.id },
    data: {
      taxAmount: result.totalTax,
      total: invoice.subtotal + result.totalTax,
    },
  });

  console.log('\nInvoice Updated:');
  console.log(`  Subtotal: $${updatedInvoice.subtotal.toFixed(2)}`);
  console.log(`  Tax: $${updatedInvoice.taxAmount.toFixed(2)}`);
  console.log(`  Total: $${updatedInvoice.total.toFixed(2)}`);

  // Clean up
  await prisma.invoice.delete({ where: { id: invoice.id } });
}

/**
 * Example 5: Create and use tax rules
 */
async function example5_TaxRules() {
  console.log('\n=== Example 5: Tax Rules Management ===\n');

  // Create a tax rule
  const rule = await prisma.taxRule.create({
    data: {
      name: 'California Sales Tax',
      country: 'US',
      state: 'CA',
      taxType: 'sales_tax',
      rate: 7.25,
      jurisdiction: 'California',
      priority: 1,
      isActive: true,
      effectiveFrom: new Date('2024-01-01'),
    },
  });

  console.log('Created Tax Rule:');
  console.log(`  Name: ${rule.name}`);
  console.log(`  Rate: ${rule.rate}%`);
  console.log(`  Jurisdiction: ${rule.jurisdiction}`);

  // Use the tax rule in a calculation
  const request: TaxCalculationRequest = {
    transactionType: 'order',
    customerAddress: {
      line1: '123 Main St',
      city: 'Los Angeles',
      state: 'CA',
      postalCode: '90001',
      country: 'US',
    },
    sellerAddress: {
      line1: '456 Seller Ave',
      city: 'Los Angeles',
      state: 'CA',
      postalCode: '90002',
      country: 'US',
    },
    lineItems: [
      {
        description: 'Product',
        quantity: 1,
        amount: 1000.00,
      },
    ],
    currency: 'USD',
  };

  const result = await taxEngineService.calculateTax(request);

  console.log('\nTax Calculation with Rule:');
  console.log(`  Tax Amount: $${result.totalTax.toFixed(2)}`);
  console.log(`  Applied Rate: ${result.taxByType[0]?.rate}%`);

  // Clean up
  await prisma.taxRule.delete({ where: { id: rule.id } });
}

/**
 * Example 6: Tax exemption handling
 */
async function example6_TaxExemption() {
  console.log('\n=== Example 6: Tax Exemption ===\n');

  // Create a tax exemption
  const exemption = await prisma.taxExemption.create({
    data: {
      exemptionType: 'customer',
      entityId: 'CUSTOMER-001',
      entityType: 'customer',
      certificateNumber: 'EXEMPT-2024-001',
      certificateType: 'Resale Certificate',
      issuingAuthority: 'State of Washington',
      country: 'US',
      state: 'WA',
      taxTypes: JSON.stringify(['sales_tax']),
      effectiveFrom: new Date('2024-01-01'),
      effectiveTo: new Date('2025-12-31'),
      isActive: true,
      notes: 'Valid resale certificate for wholesale purchases',
    },
  });

  console.log('Created Tax Exemption:');
  console.log(`  Certificate: ${exemption.certificateNumber}`);
  console.log(`  Type: ${exemption.certificateType}`);
  console.log(`  Valid Until: ${exemption.effectiveTo?.toLocaleDateString()}`);

  // In a real scenario, you would check for exemptions before calculating tax
  const exemptions = await prisma.taxExemption.findMany({
    where: {
      entityId: 'CUSTOMER-001',
      isActive: true,
      effectiveFrom: { lte: new Date() },
      OR: [
        { effectiveTo: null },
        { effectiveTo: { gte: new Date() } },
      ],
    },
  });

  console.log(`\nActive exemptions found: ${exemptions.length}`);

  // Clean up
  await prisma.taxExemption.delete({ where: { id: exemption.id } });
}

/**
 * Example 7: Test tax engine connection
 */
async function example7_TestConnection() {
  console.log('\n=== Example 7: Test Tax Engine Connection ===\n');

  const result = await taxEngineService.testConnection();

  console.log('Connection Test Result:');
  console.log(`  Success: ${result.success}`);
  console.log(`  Provider: ${result.provider}`);
  console.log(`  Message: ${result.message}`);
}

/**
 * Example 8: Get tax calculation history
 */
async function example8_TaxHistory() {
  console.log('\n=== Example 8: Tax Calculation History ===\n');

  const transactionId = `TEST-${Date.now()}`;

  // Perform a calculation
  const request: TaxCalculationRequest = {
    transactionId,
    transactionType: 'invoice',
    customerAddress: {
      line1: '123 Main St',
      city: 'Seattle',
      state: 'WA',
      postalCode: '98101',
      country: 'US',
    },
    sellerAddress: {
      line1: '456 Seller Ave',
      city: 'Seattle',
      state: 'WA',
      postalCode: '98102',
      country: 'US',
    },
    lineItems: [
      {
        description: 'Test Product',
        quantity: 1,
        amount: 100.00,
      },
    ],
    currency: 'USD',
  };

  await taxEngineService.calculateTax(request);

  // Get history
  const history = await taxEngineService.getTaxCalculationHistory(transactionId);

  console.log(`Found ${history.length} calculation(s) for transaction ${transactionId}`);
  history.forEach((calc, index) => {
    console.log(`\nCalculation ${index + 1}:`);
    console.log(`  Date: ${calc.calculationDate.toLocaleString()}`);
    console.log(`  Provider: ${calc.taxEngineProvider}`);
    console.log(`  Total Tax: $${calc.totalTax.toFixed(2)}`);
  });
}

/**
 * Run all examples
 */
async function runAllExamples() {
  try {
    await example1_USTransaction();
    await example2_UKVATTransaction();
    await example3_IndiaGSTTransaction();
    await example4_ExistingInvoice();
    await example5_TaxRules();
    await example6_TaxExemption();
    await example7_TestConnection();
    await example8_TaxHistory();

    console.log('\n=== All Examples Completed Successfully ===\n');
  } catch (error) {
    console.error('Error running examples:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run examples if this file is executed directly
if (require.main === module) {
  runAllExamples();
}

export {
  example1_USTransaction,
  example2_UKVATTransaction,
  example3_IndiaGSTTransaction,
  example4_ExistingInvoice,
  example5_TaxRules,
  example6_TaxExemption,
  example7_TestConnection,
  example8_TaxHistory,
};
