/**
 * Formula Field Engine - Usage Examples
 * 
 * This file demonstrates how to use the Formula Field Engine
 * to create calculated fields and evaluate formulas.
 */

import { formulaFieldService } from '../src/services/formulaField.service';

// ============================================================================
// Example 1: Create a Simple Formula Field
// ============================================================================

async function example1_CreateSimpleFormula() {
  console.log('\n=== Example 1: Create Simple Formula ===\n');

  const formulaField = {
    name: 'totalAmount',
    label: 'Total Amount',
    entityName: 'Order',
    formula: '{quantity} * {price}',
    returnType: 'number' as const,
    description: 'Calculate total amount from quantity and price',
  };

  const result = await formulaFieldService.createFormulaField(
    formulaField,
    'user-123',
    'tenant-456'
  );

  console.log('Created Formula Field:', result);
}

// ============================================================================
// Example 2: Evaluate Formula with Sample Data
// ============================================================================

async function example2_EvaluateFormula() {
  console.log('\n=== Example 2: Evaluate Formula ===\n');

  const formula = '{quantity} * {price}';
  const sampleData = {
    quantity: 10,
    price: 50,
  };

  const result = await formulaFieldService.testFormula(
    formula,
    sampleData,
    'number'
  );

  console.log('Formula:', formula);
  console.log('Sample Data:', sampleData);
  console.log('Result:', result);
}

// ============================================================================
// Example 3: Complex Financial Calculation
// ============================================================================

async function example3_FinancialCalculation() {
  console.log('\n=== Example 3: Financial Calculation ===\n');

  // Create formula for net amount after discount
  const netAmountFormula = {
    name: 'netAmount',
    label: 'Net Amount',
    entityName: 'Invoice',
    formula: '{total} - ({total} * ({discountPercent} / 100))',
    returnType: 'number' as const,
    description: 'Calculate net amount after discount',
  };

  const result = await formulaFieldService.createFormulaField(
    netAmountFormula,
    'user-123',
    'tenant-456'
  );

  // Test the formula
  const testData = {
    total: 1000,
    discountPercent: 15,
  };

  const evaluation = await formulaFieldService.testFormula(
    netAmountFormula.formula,
    testData,
    'number'
  );

  console.log('Formula:', netAmountFormula.formula);
  console.log('Test Data:', testData);
  console.log('Net Amount:', evaluation.result); // Should be 850
}

// ============================================================================
// Example 4: Date Calculations
// ============================================================================

async function example4_DateCalculations() {
  console.log('\n=== Example 4: Date Calculations ===\n');

  // Days overdue formula
  const daysOverdueFormula = {
    name: 'daysOverdue',
    label: 'Days Overdue',
    entityName: 'Payment',
    formula: 'Math.floor((Date.now() - new Date({dueDate}).getTime()) / (1000 * 60 * 60 * 24))',
    returnType: 'number' as const,
    description: 'Calculate days overdue from due date',
  };

  const result = await formulaFieldService.createFormulaField(
    daysOverdueFormula,
    'user-123',
    'tenant-456'
  );

  // Test with a date 5 days ago
  const fiveDaysAgo = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000);
  const testData = {
    dueDate: fiveDaysAgo.toISOString(),
  };

  const evaluation = await formulaFieldService.testFormula(
    daysOverdueFormula.formula,
    testData,
    'number'
  );

  console.log('Formula:', daysOverdueFormula.formula);
  console.log('Due Date:', testData.dueDate);
  console.log('Days Overdue:', evaluation.result); // Should be ~5
}

// ============================================================================
// Example 5: Conditional Logic
// ============================================================================

async function example5_ConditionalLogic() {
  console.log('\n=== Example 5: Conditional Logic ===\n');

  // Priority level based on amount
  const priorityFormula = {
    name: 'priorityLevel',
    label: 'Priority Level',
    entityName: 'Order',
    formula: '{amount} > 10000 ? "Premium" : {amount} > 5000 ? "Standard" : "Basic"',
    returnType: 'text' as const,
    description: 'Determine priority level based on order amount',
  };

  const result = await formulaFieldService.createFormulaField(
    priorityFormula,
    'user-123',
    'tenant-456'
  );

  // Test with different amounts
  const testCases = [
    { amount: 15000 }, // Premium
    { amount: 7500 },  // Standard
    { amount: 2000 },  // Basic
  ];

  for (const testData of testCases) {
    const evaluation = await formulaFieldService.testFormula(
      priorityFormula.formula,
      testData,
      'text'
    );
    console.log(`Amount: ${testData.amount} => Priority: ${evaluation.result}`);
  }
}

// ============================================================================
// Example 6: Text Operations
// ============================================================================

async function example6_TextOperations() {
  console.log('\n=== Example 6: Text Operations ===\n');

  // Full name formula
  const fullNameFormula = {
    name: 'fullName',
    label: 'Full Name',
    entityName: 'Customer',
    formula: 'CONCAT({firstName}, " ", {lastName})',
    returnType: 'text' as const,
    description: 'Concatenate first and last name',
  };

  const result = await formulaFieldService.createFormulaField(
    fullNameFormula,
    'user-123',
    'tenant-456'
  );

  // Test the formula
  const testData = {
    firstName: 'John',
    lastName: 'Doe',
  };

  const evaluation = await formulaFieldService.testFormula(
    fullNameFormula.formula,
    testData,
    'text'
  );

  console.log('Formula:', fullNameFormula.formula);
  console.log('Test Data:', testData);
  console.log('Full Name:', evaluation.result); // Should be "John Doe"
}

// ============================================================================
// Example 7: Statistical Functions
// ============================================================================

async function example7_StatisticalFunctions() {
  console.log('\n=== Example 7: Statistical Functions ===\n');

  // Average score formula
  const avgScoreFormula = {
    name: 'averageScore',
    label: 'Average Score',
    entityName: 'Student',
    formula: 'AVG({math}, {science}, {english})',
    returnType: 'number' as const,
    description: 'Calculate average score across subjects',
  };

  const result = await formulaFieldService.createFormulaField(
    avgScoreFormula,
    'user-123',
    'tenant-456'
  );

  // Test the formula
  const testData = {
    math: 85,
    science: 90,
    english: 88,
  };

  const evaluation = await formulaFieldService.testFormula(
    avgScoreFormula.formula,
    testData,
    'number'
  );

  console.log('Formula:', avgScoreFormula.formula);
  console.log('Test Data:', testData);
  console.log('Average Score:', evaluation.result); // Should be 87.67
}

// ============================================================================
// Example 8: Nested Field References
// ============================================================================

async function example8_NestedFields() {
  console.log('\n=== Example 8: Nested Field References ===\n');

  // Available credit formula
  const availableCreditFormula = {
    name: 'availableCredit',
    label: 'Available Credit',
    entityName: 'Order',
    formula: '{customer.creditLimit} - {customer.currentBalance}',
    returnType: 'number' as const,
    description: 'Calculate available credit for customer',
  };

  const result = await formulaFieldService.createFormulaField(
    availableCreditFormula,
    'user-123',
    'tenant-456'
  );

  // Test with nested data
  const testData = {
    customer: {
      creditLimit: 10000,
      currentBalance: 3500,
    },
  };

  const evaluation = await formulaFieldService.testFormula(
    availableCreditFormula.formula,
    testData,
    'number'
  );

  console.log('Formula:', availableCreditFormula.formula);
  console.log('Test Data:', JSON.stringify(testData, null, 2));
  console.log('Available Credit:', evaluation.result); // Should be 6500
}

// ============================================================================
// Example 9: Enrich Entity with Formulas
// ============================================================================

async function example9_EnrichEntity() {
  console.log('\n=== Example 9: Enrich Entity with Formulas ===\n');

  // Simulate an order record
  const order = {
    id: 'order-123',
    quantity: 10,
    price: 50,
    discountPercent: 10,
    taxRate: 18,
  };

  // Enrich with formula values
  const enrichedOrder = await formulaFieldService.enrichEntityWithFormulas(
    'Order',
    order,
    'tenant-456'
  );

  console.log('Original Order:', order);
  console.log('Enriched Order:', enrichedOrder);
  console.log('\nFormula Values:');
  console.log('- Total Amount:', enrichedOrder.formulas?.totalAmount);
  console.log('- Discount Amount:', enrichedOrder.formulas?.discountAmount);
  console.log('- Net Amount:', enrichedOrder.formulas?.netAmount);
}

// ============================================================================
// Example 10: Get Formula Suggestions
// ============================================================================

async function example10_FormulaSuggestions() {
  console.log('\n=== Example 10: Formula Suggestions ===\n');

  const suggestions = formulaFieldService.getFormulaSuggestions();

  console.log(`Total Suggestions: ${suggestions.length}\n`);

  // Group by category
  const categories = suggestions.reduce((acc, suggestion) => {
    if (!acc[suggestion.category]) {
      acc[suggestion.category] = [];
    }
    acc[suggestion.category].push(suggestion);
    return acc;
  }, {} as Record<string, typeof suggestions>);

  // Display suggestions by category
  for (const [category, items] of Object.entries(categories)) {
    console.log(`\n${category} (${items.length} formulas):`);
    items.forEach((item) => {
      console.log(`  - ${item.name}: ${item.description}`);
      console.log(`    Formula: ${item.formula}`);
    });
  }
}

// ============================================================================
// Example 11: Inventory Management Formulas
// ============================================================================

async function example11_InventoryFormulas() {
  console.log('\n=== Example 11: Inventory Management Formulas ===\n');

  // Reorder quantity formula
  const reorderQtyFormula = {
    name: 'reorderQuantity',
    label: 'Reorder Quantity',
    entityName: 'Product',
    formula: '{maxStock} - {currentStock}',
    returnType: 'number' as const,
    description: 'Calculate reorder quantity',
  };

  // Stock value formula
  const stockValueFormula = {
    name: 'stockValue',
    label: 'Stock Value',
    entityName: 'Product',
    formula: '{quantity} * {unitCost}',
    returnType: 'number' as const,
    description: 'Calculate total stock value',
  };

  // Days of stock formula
  const daysOfStockFormula = {
    name: 'daysOfStock',
    label: 'Days of Stock',
    entityName: 'Product',
    formula: 'Math.floor({currentStock} / {avgDailyUsage})',
    returnType: 'number' as const,
    description: 'Calculate days of stock remaining',
  };

  // Create all formulas
  await formulaFieldService.createFormulaField(reorderQtyFormula, 'user-123', 'tenant-456');
  await formulaFieldService.createFormulaField(stockValueFormula, 'user-123', 'tenant-456');
  await formulaFieldService.createFormulaField(daysOfStockFormula, 'user-123', 'tenant-456');

  // Test with sample product data
  const productData = {
    maxStock: 1000,
    currentStock: 250,
    quantity: 250,
    unitCost: 15.50,
    avgDailyUsage: 25,
  };

  console.log('Product Data:', productData);
  console.log('\nCalculated Values:');

  const reorderQty = await formulaFieldService.testFormula(
    reorderQtyFormula.formula,
    productData,
    'number'
  );
  console.log('- Reorder Quantity:', reorderQty.result);

  const stockValue = await formulaFieldService.testFormula(
    stockValueFormula.formula,
    productData,
    'number'
  );
  console.log('- Stock Value:', stockValue.result);

  const daysOfStock = await formulaFieldService.testFormula(
    daysOfStockFormula.formula,
    productData,
    'number'
  );
  console.log('- Days of Stock:', daysOfStock.result);
}

// ============================================================================
// Example 12: HR & Payroll Formulas
// ============================================================================

async function example12_HRFormulas() {
  console.log('\n=== Example 12: HR & Payroll Formulas ===\n');

  // Gross salary formula
  const grossSalaryFormula = {
    name: 'grossSalary',
    label: 'Gross Salary',
    entityName: 'Employee',
    formula: '{basicSalary} + {allowances}',
    returnType: 'number' as const,
    description: 'Calculate gross salary',
  };

  // Net salary formula
  const netSalaryFormula = {
    name: 'netSalary',
    label: 'Net Salary',
    entityName: 'Employee',
    formula: '{grossSalary} - {deductions}',
    returnType: 'number' as const,
    description: 'Calculate net salary after deductions',
  };

  // Years of service formula
  const yearsOfServiceFormula = {
    name: 'yearsOfService',
    label: 'Years of Service',
    entityName: 'Employee',
    formula: 'Math.floor((Date.now() - new Date({joinDate}).getTime()) / (1000 * 60 * 60 * 24 * 365))',
    returnType: 'number' as const,
    description: 'Calculate years of service',
  };

  // Create all formulas
  await formulaFieldService.createFormulaField(grossSalaryFormula, 'user-123', 'tenant-456');
  await formulaFieldService.createFormulaField(netSalaryFormula, 'user-123', 'tenant-456');
  await formulaFieldService.createFormulaField(yearsOfServiceFormula, 'user-123', 'tenant-456');

  // Test with sample employee data
  const fiveYearsAgo = new Date(Date.now() - 5 * 365 * 24 * 60 * 60 * 1000);
  const employeeData = {
    basicSalary: 50000,
    allowances: 10000,
    grossSalary: 60000,
    deductions: 8000,
    joinDate: fiveYearsAgo.toISOString(),
  };

  console.log('Employee Data:', employeeData);
  console.log('\nCalculated Values:');

  const grossSalary = await formulaFieldService.testFormula(
    grossSalaryFormula.formula,
    employeeData,
    'number'
  );
  console.log('- Gross Salary:', grossSalary.result);

  const netSalary = await formulaFieldService.testFormula(
    netSalaryFormula.formula,
    employeeData,
    'number'
  );
  console.log('- Net Salary:', netSalary.result);

  const yearsOfService = await formulaFieldService.testFormula(
    yearsOfServiceFormula.formula,
    employeeData,
    'number'
  );
  console.log('- Years of Service:', yearsOfService.result);
}

// ============================================================================
// Run All Examples
// ============================================================================

async function runAllExamples() {
  try {
    await example1_CreateSimpleFormula();
    await example2_EvaluateFormula();
    await example3_FinancialCalculation();
    await example4_DateCalculations();
    await example5_ConditionalLogic();
    await example6_TextOperations();
    await example7_StatisticalFunctions();
    await example8_NestedFields();
    await example9_EnrichEntity();
    await example10_FormulaSuggestions();
    await example11_InventoryFormulas();
    await example12_HRFormulas();

    console.log('\n\n✅ All examples completed successfully!\n');
  } catch (error) {
    console.error('\n❌ Error running examples:', error);
  }
}

// Run examples if this file is executed directly
if (require.main === module) {
  runAllExamples();
}

export {
  example1_CreateSimpleFormula,
  example2_EvaluateFormula,
  example3_FinancialCalculation,
  example4_DateCalculations,
  example5_ConditionalLogic,
  example6_TextOperations,
  example7_StatisticalFunctions,
  example8_NestedFields,
  example9_EnrichEntity,
  example10_FormulaSuggestions,
  example11_InventoryFormulas,
  example12_HRFormulas,
};
