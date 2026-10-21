/**
 * Analytics Service
 * Handles KPI calculations, dashboard data, and analytics queries
 */

import prisma from '../config/prisma';
import { format, subDays, startOfMonth, endOfMonth, startOfYear, endOfYear } from 'date-fns';

export interface KPIResult {
  name: string;
  value: number;
  target?: number;
  variance?: number;
  variancePercent?: number;
  trend?: 'up' | 'down' | 'stable';
  status?: 'good' | 'warning' | 'critical';
  unit: string;
}

export interface DashboardWidget {
  id: string;
  title: string;
  type: 'metric' | 'chart' | 'table';
  data: any;
}

export class AnalyticsService {
  /**
   * Calculate sales KPIs
   */
  static async calculateSalesKPIs(startDate: Date, endDate: Date): Promise<KPIResult[]> {
    const dateKeyStart = format(startDate, 'yyyyMMdd');
    const dateKeyEnd = format(endDate, 'yyyyMMdd');

    // Total Revenue
    const revenueResult = await prisma.factSales.aggregate({
      where: {
        dateKey: {
          gte: dateKeyStart,
          lte: dateKeyEnd,
        },
      },
      _sum: {
        totalAmount: true,
        profitAmount: true,
      },
      _count: true,
    });

    const totalRevenue = revenueResult._sum.totalAmount || 0;
    const totalProfit = revenueResult._sum.profitAmount || 0;
    const orderCount = revenueResult._count;

    // Average Order Value
    const avgOrderValue = orderCount > 0 ? totalRevenue / orderCount : 0;

    // Profit Margin
    const profitMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;

    // Sales Growth (compare with previous period)
    const periodLength = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    const prevStartDate = subDays(startDate, periodLength);
    const prevEndDate = subDays(endDate, periodLength);
    const prevDateKeyStart = format(prevStartDate, 'yyyyMMdd');
    const prevDateKeyEnd = format(prevEndDate, 'yyyyMMdd');

    const prevRevenueResult = await prisma.factSales.aggregate({
      where: {
        dateKey: {
          gte: prevDateKeyStart,
          lte: prevDateKeyEnd,
        },
      },
      _sum: {
        totalAmount: true,
      },
    });

    const prevRevenue = prevRevenueResult._sum.totalAmount || 0;
    const revenueGrowth = prevRevenue > 0 ? ((totalRevenue - prevRevenue) / prevRevenue) * 100 : 0;

    return [
      {
        name: 'Total Revenue',
        value: totalRevenue,
        unit: 'currency',
        trend: revenueGrowth > 0 ? 'up' : revenueGrowth < 0 ? 'down' : 'stable',
        status: revenueGrowth >= 0 ? 'good' : 'warning',
      },
      {
        name: 'Total Profit',
        value: totalProfit,
        unit: 'currency',
        status: totalProfit > 0 ? 'good' : 'critical',
      },
      {
        name: 'Profit Margin',
        value: profitMargin,
        target: 20,
        variance: profitMargin - 20,
        variancePercent: 20 > 0 ? ((profitMargin - 20) / 20) * 100 : 0,
        unit: 'percentage',
        status: profitMargin >= 20 ? 'good' : profitMargin >= 15 ? 'warning' : 'critical',
      },
      {
        name: 'Average Order Value',
        value: avgOrderValue,
        unit: 'currency',
      },
      {
        name: 'Revenue Growth',
        value: revenueGrowth,
        unit: 'percentage',
        trend: revenueGrowth > 0 ? 'up' : revenueGrowth < 0 ? 'down' : 'stable',
        status: revenueGrowth >= 5 ? 'good' : revenueGrowth >= 0 ? 'warning' : 'critical',
      },
      {
        name: 'Order Count',
        value: orderCount,
        unit: 'count',
      },
    ];
  }

  /**
   * Calculate inventory KPIs
   */
  static async calculateInventoryKPIs(date: Date): Promise<KPIResult[]> {
    const dateKey = format(date, 'yyyyMMdd');

    // Get latest inventory snapshot
    const inventoryResult = await prisma.factInventory.aggregate({
      where: { dateKey },
      _sum: {
        quantityOnHand: true,
        totalValue: true,
      },
      _count: true,
    });

    const totalQuantity = inventoryResult._sum.quantityOnHand || 0;
    const totalValue = inventoryResult._sum.totalValue || 0;
    const productCount = inventoryResult._count;

    // Stock status distribution
    const stockStatusCounts = await prisma.factInventory.groupBy({
      by: ['stockStatus'],
      where: { dateKey },
      _count: true,
    });

    const outOfStockCount = stockStatusCounts.find((s) => s.stockStatus === 'out_of_stock')?._count || 0;
    const lowStockCount = stockStatusCounts.find((s) => s.stockStatus === 'low_stock')?._count || 0;

    // Inventory turnover (simplified - sales / average inventory)
    const last30Days = subDays(date, 30);
    const dateKeyStart = format(last30Days, 'yyyyMMdd');
    const dateKeyEnd = format(date, 'yyyyMMdd');

    const salesResult = await prisma.factSales.aggregate({
      where: {
        dateKey: {
          gte: dateKeyStart,
          lte: dateKeyEnd,
        },
      },
      _sum: {
        costAmount: true,
      },
    });

    const costOfGoodsSold = salesResult._sum.costAmount || 0;
    const inventoryTurnover = totalValue > 0 ? (costOfGoodsSold / totalValue) * 12 : 0; // Annualized

    // Stock-out rate
    const stockOutRate = productCount > 0 ? (outOfStockCount / productCount) * 100 : 0;

    return [
      {
        name: 'Total Inventory Value',
        value: totalValue,
        unit: 'currency',
      },
      {
        name: 'Total Inventory Quantity',
        value: totalQuantity,
        unit: 'count',
      },
      {
        name: 'Inventory Turnover Ratio',
        value: inventoryTurnover,
        target: 6,
        variance: inventoryTurnover - 6,
        unit: 'ratio',
        status: inventoryTurnover >= 6 ? 'good' : inventoryTurnover >= 4 ? 'warning' : 'critical',
      },
      {
        name: 'Stock-Out Rate',
        value: stockOutRate,
        target: 5,
        variance: stockOutRate - 5,
        unit: 'percentage',
        status: stockOutRate <= 5 ? 'good' : stockOutRate <= 10 ? 'warning' : 'critical',
      },
      {
        name: 'Low Stock Items',
        value: lowStockCount,
        unit: 'count',
        status: lowStockCount <= 10 ? 'good' : lowStockCount <= 20 ? 'warning' : 'critical',
      },
      {
        name: 'Out of Stock Items',
        value: outOfStockCount,
        unit: 'count',
        status: outOfStockCount === 0 ? 'good' : outOfStockCount <= 5 ? 'warning' : 'critical',
      },
    ];
  }

  /**
   * Calculate financial KPIs
   */
  static async calculateFinancialKPIs(startDate: Date, endDate: Date): Promise<KPIResult[]> {
    const dateKeyStart = format(startDate, 'yyyyMMdd');
    const dateKeyEnd = format(endDate, 'yyyyMMdd');

    // Revenue (credit to revenue accounts)
    const revenueResult = await prisma.factFinancial.aggregate({
      where: {
        dateKey: {
          gte: dateKeyStart,
          lte: dateKeyEnd,
        },
        accountType: 'Revenue',
      },
      _sum: {
        creditAmount: true,
      },
    });

    const totalRevenue = revenueResult._sum.creditAmount || 0;

    // Expenses (debit to expense accounts)
    const expenseResult = await prisma.factFinancial.aggregate({
      where: {
        dateKey: {
          gte: dateKeyStart,
          lte: dateKeyEnd,
        },
        accountType: 'Expense',
      },
      _sum: {
        debitAmount: true,
      },
    });

    const totalExpenses = expenseResult._sum.debitAmount || 0;

    // Net Income
    const netIncome = totalRevenue - totalExpenses;

    // Net Profit Margin
    const netProfitMargin = totalRevenue > 0 ? (netIncome / totalRevenue) * 100 : 0;

    // Assets (debit balance)
    const assetResult = await prisma.factFinancial.aggregate({
      where: {
        dateKey: {
          lte: dateKeyEnd,
        },
        accountType: 'Asset',
      },
      _sum: {
        debitAmount: true,
        creditAmount: true,
      },
    });

    const totalAssets = (assetResult._sum.debitAmount || 0) - (assetResult._sum.creditAmount || 0);

    // Liabilities (credit balance)
    const liabilityResult = await prisma.factFinancial.aggregate({
      where: {
        dateKey: {
          lte: dateKeyEnd,
        },
        accountType: 'Liability',
      },
      _sum: {
        debitAmount: true,
        creditAmount: true,
      },
    });

    const totalLiabilities = (liabilityResult._sum.creditAmount || 0) - (liabilityResult._sum.debitAmount || 0);

    // Equity
    const totalEquity = totalAssets - totalLiabilities;

    // ROA (Return on Assets)
    const roa = totalAssets > 0 ? (netIncome / totalAssets) * 100 : 0;

    return [
      {
        name: 'Total Revenue',
        value: totalRevenue,
        unit: 'currency',
      },
      {
        name: 'Total Expenses',
        value: totalExpenses,
        unit: 'currency',
      },
      {
        name: 'Net Income',
        value: netIncome,
        unit: 'currency',
        status: netIncome > 0 ? 'good' : 'critical',
      },
      {
        name: 'Net Profit Margin',
        value: netProfitMargin,
        target: 10,
        variance: netProfitMargin - 10,
        unit: 'percentage',
        status: netProfitMargin >= 10 ? 'good' : netProfitMargin >= 5 ? 'warning' : 'critical',
      },
      {
        name: 'Total Assets',
        value: totalAssets,
        unit: 'currency',
      },
      {
        name: 'Total Liabilities',
        value: totalLiabilities,
        unit: 'currency',
      },
      {
        name: 'Total Equity',
        value: totalEquity,
        unit: 'currency',
      },
      {
        name: 'Return on Assets (ROA)',
        value: roa,
        target: 5,
        variance: roa - 5,
        unit: 'percentage',
        status: roa >= 5 ? 'good' : roa >= 2 ? 'warning' : 'critical',
      },
    ];
  }

  /**
   * Get sales trend data for charts
   */
  static async getSalesTrend(startDate: Date, endDate: Date, groupBy: 'day' | 'week' | 'month' = 'day') {
    const dateKeyStart = format(startDate, 'yyyyMMdd');
    const dateKeyEnd = format(endDate, 'yyyyMMdd');

    const sales = await prisma.factSales.findMany({
      where: {
        dateKey: {
          gte: dateKeyStart,
          lte: dateKeyEnd,
        },
      },
      include: {
        date: true,
      },
      orderBy: {
        dateKey: 'asc',
      },
    });

    // Group by specified period
    const grouped = new Map<string, { revenue: number; profit: number; orders: number }>();

    for (const sale of sales) {
      let key: string;
      if (groupBy === 'day') {
        key = sale.dateKey;
      } else if (groupBy === 'week') {
        key = `${sale.date.year}-W${sale.date.week}`;
      } else {
        key = `${sale.date.year}-${String(sale.date.month).padStart(2, '0')}`;
      }

      const existing = grouped.get(key) || { revenue: 0, profit: 0, orders: 0 };
      existing.revenue += sale.totalAmount;
      existing.profit += sale.profitAmount;
      existing.orders += 1;
      grouped.set(key, existing);
    }

    return Array.from(grouped.entries()).map(([period, data]) => ({
      period,
      revenue: data.revenue,
      profit: data.profit,
      orders: data.orders,
      avgOrderValue: data.orders > 0 ? data.revenue / data.orders : 0,
    }));
  }

  /**
   * Get top products by revenue
   */
  static async getTopProducts(startDate: Date, endDate: Date, limit: number = 10) {
    const dateKeyStart = format(startDate, 'yyyyMMdd');
    const dateKeyEnd = format(endDate, 'yyyyMMdd');

    const topProducts = await prisma.factSales.groupBy({
      by: ['productKey'],
      where: {
        dateKey: {
          gte: dateKeyStart,
          lte: dateKeyEnd,
        },
      },
      _sum: {
        totalAmount: true,
        quantity: true,
        profitAmount: true,
      },
      orderBy: {
        _sum: {
          totalAmount: 'desc',
        },
      },
      take: limit,
    });

    // Enrich with product details
    const enriched = await Promise.all(
      topProducts.map(async (item) => {
        const product = await prisma.dimProduct.findUnique({
          where: { productKey: item.productKey },
        });

        return {
          productKey: item.productKey,
          productName: product?.productName || 'Unknown',
          sku: product?.sku || '',
          category: product?.category || '',
          revenue: item._sum.totalAmount || 0,
          quantity: item._sum.quantity || 0,
          profit: item._sum.profitAmount || 0,
        };
      })
    );

    return enriched;
  }

  /**
   * Get customer segmentation
   */
  static async getCustomerSegmentation(startDate: Date, endDate: Date) {
    const dateKeyStart = format(startDate, 'yyyyMMdd');
    const dateKeyEnd = format(endDate, 'yyyyMMdd');

    const customerSales = await prisma.factSales.groupBy({
      by: ['customerKey'],
      where: {
        dateKey: {
          gte: dateKeyStart,
          lte: dateKeyEnd,
        },
      },
      _sum: {
        totalAmount: true,
      },
      _count: true,
    });

    // Segment customers by revenue
    const segments = {
      high: { count: 0, revenue: 0, threshold: 10000 },
      medium: { count: 0, revenue: 0, threshold: 5000 },
      low: { count: 0, revenue: 0, threshold: 0 },
    };

    for (const customer of customerSales) {
      const revenue = customer._sum.totalAmount || 0;
      if (revenue >= segments.high.threshold) {
        segments.high.count++;
        segments.high.revenue += revenue;
      } else if (revenue >= segments.medium.threshold) {
        segments.medium.count++;
        segments.medium.revenue += revenue;
      } else {
        segments.low.count++;
        segments.low.revenue += revenue;
      }
    }

    return segments;
  }

  /**
   * Create or update KPI definition
   */
  static async createKPIDefinition(data: {
    name: string;
    description?: string;
    category: string;
    calculationFormula: string;
    unit: string;
    targetValue?: number;
    thresholdGood?: number;
    thresholdWarning?: number;
    frequency: string;
  }) {
    return await prisma.kPIDefinition.create({
      data,
    });
  }

  /**
   * Record KPI value
   */
  static async recordKPIValue(
    kpiId: string,
    periodStart: Date,
    periodEnd: Date,
    actualValue: number,
    targetValue?: number
  ) {
    const variance = targetValue !== undefined ? actualValue - targetValue : null;
    const variancePercent = targetValue && targetValue !== 0 ? (variance! / targetValue) * 100 : null;

    // Determine status based on thresholds
    const kpi = await prisma.kPIDefinition.findUnique({ where: { id: kpiId } });
    let status = 'good';
    if (kpi) {
      if (kpi.thresholdWarning && actualValue < kpi.thresholdWarning) {
        status = 'warning';
      }
      if (kpi.thresholdGood && actualValue < kpi.thresholdGood) {
        status = 'critical';
      }
    }

    return await prisma.kPIValue.create({
      data: {
        kpiId,
        periodStart,
        periodEnd,
        actualValue,
        targetValue: targetValue || null,
        variance,
        variancePercent,
        status,
      },
    });
  }

  /**
   * Get dashboard data
   */
  static async getDashboardData(userId: string): Promise<DashboardWidget[]> {
    const widgets = await prisma.dashboardWidget.findMany({
      where: { userId },
      orderBy: [{ positionY: 'asc' }, { positionX: 'asc' }],
    });

    const today = new Date();
    const startOfThisMonth = startOfMonth(today);
    const endOfThisMonth = endOfMonth(today);
    const startOfThisYear = startOfYear(today);
    const endOfThisYear = endOfYear(today);

    // Populate widget data based on type
    const populatedWidgets: DashboardWidget[] = await Promise.all(
      widgets.map(async (widget) => {
        let data: any = null;

        if (widget.dataSource === 'sales_kpis_monthly') {
          data = await this.calculateSalesKPIs(startOfThisMonth, endOfThisMonth);
        } else if (widget.dataSource === 'inventory_kpis') {
          data = await this.calculateInventoryKPIs(today);
        } else if (widget.dataSource === 'financial_kpis_yearly') {
          data = await this.calculateFinancialKPIs(startOfThisYear, endOfThisYear);
        } else if (widget.dataSource === 'sales_trend_monthly') {
          data = await this.getSalesTrend(startOfThisMonth, endOfThisMonth, 'day');
        } else if (widget.dataSource === 'top_products_monthly') {
          data = await this.getTopProducts(startOfThisMonth, endOfThisMonth, 10);
        }

        return {
          id: widget.id,
          title: widget.title,
          type: widget.type as 'metric' | 'chart' | 'table',
          data,
        };
      })
    );

    return populatedWidgets;
  }
}
