/**
 * Data Warehouse Setup Script
 * Initializes the data warehouse with dimensions and runs initial ETL
 */

import { ETLService } from '../services/etl.service';
import { AnalyticsService } from '../services/analytics.service';
import prisma from '../config/prisma';

async function setupDataWarehouse() {
  console.log('🚀 Setting up Data Warehouse...\n');

  try {
    // Step 1: Generate date dimensions
    console.log('📅 Step 1: Generating date dimensions...');
    const currentYear = new Date().getFullYear();
    await ETLService.generateDateDimension(currentYear - 1); // Previous year
    await ETLService.generateDateDimension(currentYear); // Current year
    await ETLService.generateDateDimension(currentYear + 1); // Next year
    console.log('✅ Date dimensions generated\n');

    // Step 2: Load dimension tables
    console.log('📊 Step 2: Loading dimension tables...');
    await ETLService.loadProductDimension();
    await ETLService.loadCustomerDimension();
    await ETLService.loadWarehouseDimension();
    await ETLService.loadEmployeeDimension();
    console.log('✅ Dimension tables loaded\n');

    // Step 3: Load fact tables (last 90 days)
    console.log('📈 Step 3: Loading fact tables...');
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 90);
    
    await ETLService.loadSalesFact(startDate, endDate);
    await ETLService.loadInventoryFact();
    console.log('✅ Fact tables loaded\n');

    // Step 4: Create default KPI definitions
    console.log('🎯 Step 4: Creating default KPI definitions...');
    await createDefaultKPIs();
    console.log('✅ Default KPIs created\n');

    // Step 5: Create sample report templates
    console.log('📄 Step 5: Creating sample report templates...');
    await createSampleReports();
    console.log('✅ Sample reports created\n');

    console.log('✅ Data Warehouse setup completed successfully!');
    console.log('\n📊 Summary:');
    console.log('  - Date dimensions: 3 years');
    console.log('  - Dimension tables: Product, Customer, Warehouse, Employee');
    console.log('  - Fact tables: Sales, Inventory');
    console.log('  - KPI definitions: Created');
    console.log('  - Sample reports: Created');
    console.log('\n🔄 ETL jobs will run automatically daily at 2:00 AM');
    console.log('📊 KPI calculations will run automatically daily at 3:00 AM');
  } catch (error) {
    console.error('❌ Data Warehouse setup failed:', error);
    throw error;
  }
}

async function createDefaultKPIs() {
  const kpis = [
    // Sales KPIs
    {
      name: 'Total Revenue',
      description: 'Total sales revenue',
      category: 'sales',
      calculationFormula: 'SUM(totalAmount) FROM FactSales',
      unit: 'currency',
      targetValue: 100000,
      thresholdGood: 100000,
      thresholdWarning: 80000,
      frequency: 'monthly',
    },
    {
      name: 'Profit Margin',
      description: 'Profit margin percentage',
      category: 'sales',
      calculationFormula: '(SUM(profitAmount) / SUM(totalAmount)) * 100',
      unit: 'percentage',
      targetValue: 20,
      thresholdGood: 20,
      thresholdWarning: 15,
      frequency: 'monthly',
    },
    {
      name: 'Average Order Value',
      description: 'Average value per order',
      category: 'sales',
      calculationFormula: 'AVG(totalAmount) FROM FactSales',
      unit: 'currency',
      targetValue: 500,
      thresholdGood: 500,
      thresholdWarning: 400,
      frequency: 'monthly',
    },
    // Inventory KPIs
    {
      name: 'Inventory Turnover Ratio',
      description: 'How many times inventory is sold and replaced',
      category: 'inventory',
      calculationFormula: 'COGS / Average Inventory Value',
      unit: 'ratio',
      targetValue: 6,
      thresholdGood: 6,
      thresholdWarning: 4,
      frequency: 'monthly',
    },
    {
      name: 'Stock-Out Rate',
      description: 'Percentage of products out of stock',
      category: 'inventory',
      calculationFormula: '(Out of Stock Items / Total Items) * 100',
      unit: 'percentage',
      targetValue: 5,
      thresholdGood: 5,
      thresholdWarning: 10,
      frequency: 'daily',
    },
    // Financial KPIs
    {
      name: 'Net Profit Margin',
      description: 'Net income as percentage of revenue',
      category: 'finance',
      calculationFormula: '(Net Income / Revenue) * 100',
      unit: 'percentage',
      targetValue: 10,
      thresholdGood: 10,
      thresholdWarning: 5,
      frequency: 'monthly',
    },
    {
      name: 'Return on Assets (ROA)',
      description: 'Net income relative to total assets',
      category: 'finance',
      calculationFormula: '(Net Income / Total Assets) * 100',
      unit: 'percentage',
      targetValue: 5,
      thresholdGood: 5,
      thresholdWarning: 2,
      frequency: 'monthly',
    },
  ];

  for (const kpi of kpis) {
    const existing = await prisma.kPIDefinition.findFirst({
      where: { name: kpi.name },
    });

    if (!existing) {
      await AnalyticsService.createKPIDefinition(kpi);
      console.log(`  ✓ Created KPI: ${kpi.name}`);
    } else {
      console.log(`  ⊙ KPI already exists: ${kpi.name}`);
    }
  }
}

async function createSampleReports() {
  // Get a system user for report creation
  const systemUser = await prisma.user.findFirst({
    where: { role: 'admin' },
  });

  if (!systemUser) {
    console.log('  ⚠️ No admin user found, skipping sample reports');
    return;
  }

  const reports = [
    {
      name: 'Sales Summary Report',
      module: 'sales',
      sqlQuery: `
        SELECT 
          d.fullDate as date,
          p.productName,
          p.category,
          SUM(f.quantity) as quantity_sold,
          SUM(f.totalAmount) as revenue,
          SUM(f.profitAmount) as profit
        FROM "FactSales" f
        JOIN "DimDate" d ON f.dateKey = d.dateKey
        JOIN "DimProduct" p ON f.productKey = p.productKey
        WHERE d.dateKey >= '{{startDate}}' AND d.dateKey <= '{{endDate}}'
        GROUP BY d.fullDate, p.productName, p.category
        ORDER BY d.fullDate DESC, revenue DESC
      `,
      columns: [
        { field: 'date', header: 'Date', type: 'date', width: 15 },
        { field: 'productName', header: 'Product', type: 'string', width: 30 },
        { field: 'category', header: 'Category', type: 'string', width: 20 },
        { field: 'quantity_sold', header: 'Quantity', type: 'number', width: 15, aggregate: 'sum' },
        { field: 'revenue', header: 'Revenue', type: 'currency', width: 15, aggregate: 'sum' },
        { field: 'profit', header: 'Profit', type: 'currency', width: 15, aggregate: 'sum' },
      ],
    },
    {
      name: 'Inventory Status Report',
      module: 'inventory',
      sqlQuery: `
        SELECT 
          p.productName,
          p.sku,
          p.category,
          w.warehouseName,
          f.quantityOnHand,
          f.quantityAvailable,
          f.unitCost,
          f.totalValue,
          f.stockStatus
        FROM "FactInventory" f
        JOIN "DimProduct" p ON f.productKey = p.productKey
        JOIN "DimWarehouse" w ON f.warehouseKey = w.warehouseKey
        WHERE f.dateKey = '{{dateKey}}'
        ORDER BY f.totalValue DESC
      `,
      columns: [
        { field: 'productName', header: 'Product', type: 'string', width: 30 },
        { field: 'sku', header: 'SKU', type: 'string', width: 15 },
        { field: 'category', header: 'Category', type: 'string', width: 20 },
        { field: 'warehouseName', header: 'Warehouse', type: 'string', width: 20 },
        { field: 'quantityOnHand', header: 'On Hand', type: 'number', width: 12 },
        { field: 'quantityAvailable', header: 'Available', type: 'number', width: 12 },
        { field: 'unitCost', header: 'Unit Cost', type: 'currency', width: 12 },
        { field: 'totalValue', header: 'Total Value', type: 'currency', width: 15 },
        { field: 'stockStatus', header: 'Status', type: 'string', width: 15 },
      ],
    },
    {
      name: 'Top Products by Revenue',
      module: 'sales',
      sqlQuery: `
        SELECT 
          p.productName,
          p.category,
          SUM(f.quantity) as total_quantity,
          SUM(f.totalAmount) as total_revenue,
          SUM(f.profitAmount) as total_profit,
          AVG(f.profitMargin) as avg_profit_margin
        FROM "FactSales" f
        JOIN "DimProduct" p ON f.productKey = p.productKey
        JOIN "DimDate" d ON f.dateKey = d.dateKey
        WHERE d.dateKey >= '{{startDate}}' AND d.dateKey <= '{{endDate}}'
        GROUP BY p.productName, p.category
        ORDER BY total_revenue DESC
        LIMIT 20
      `,
      columns: [
        { field: 'productName', header: 'Product', type: 'string', width: 30 },
        { field: 'category', header: 'Category', type: 'string', width: 20 },
        { field: 'total_quantity', header: 'Quantity Sold', type: 'number', width: 15 },
        { field: 'total_revenue', header: 'Revenue', type: 'currency', width: 15 },
        { field: 'total_profit', header: 'Profit', type: 'currency', width: 15 },
        { field: 'avg_profit_margin', header: 'Profit Margin %', type: 'percentage', width: 15 },
      ],
    },
  ];

  for (const report of reports) {
    const existing = await prisma.reportTemplate.findFirst({
      where: { name: report.name },
    });

    if (!existing) {
      await prisma.reportTemplate.create({
        data: {
          name: report.name,
          module: report.module,
          sqlQuery: report.sqlQuery,
          columns: report.columns as any,
          createdById: systemUser.id,
        },
      });
      console.log(`  ✓ Created report: ${report.name}`);
    } else {
      console.log(`  ⊙ Report already exists: ${report.name}`);
    }
  }
}

// Run the setup
setupDataWarehouse()
  .then(() => {
    console.log('\n✅ Setup completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Setup failed:', error);
    process.exit(1);
  });
