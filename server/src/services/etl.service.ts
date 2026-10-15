/**
 * ETL Service for Data Warehouse
 * Handles Extract, Transform, Load operations from operational databases to data warehouse
 */

import prisma from '../config/prisma';
import { format, startOfDay, endOfDay, subDays } from 'date-fns';

export class ETLService {
  /**
   * Generate date dimension for a given year
   */
  static async generateDateDimension(year: number): Promise<void> {
    const startDate = new Date(year, 0, 1);
    const endDate = new Date(year, 11, 31);
    const dates = [];

    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      const date = new Date(d);
      const dateKey = format(date, 'yyyyMMdd');
      const dayOfWeek = date.getDay();
      const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

      dates.push({
        dateKey,
        fullDate: date,
        year: date.getFullYear(),
        quarter: Math.floor(date.getMonth() / 3) + 1,
        month: date.getMonth() + 1,
        monthName: monthNames[date.getMonth()],
        week: Math.ceil((date.getDate() + new Date(date.getFullYear(), date.getMonth(), 1).getDay()) / 7),
        dayOfMonth: date.getDate(),
        dayOfWeek,
        dayName: dayNames[dayOfWeek],
        isWeekend: dayOfWeek === 0 || dayOfWeek === 6,
        isHoliday: false, // Can be enhanced with holiday calendar
        fiscalYear: date.getMonth() >= 3 ? date.getFullYear() : date.getFullYear() - 1, // Assuming fiscal year starts in April
        fiscalQuarter: Math.floor((date.getMonth() + 9) % 12 / 3) + 1,
        fiscalPeriod: `FY${date.getMonth() >= 3 ? date.getFullYear() : date.getFullYear() - 1}-Q${Math.floor((date.getMonth() + 9) % 12 / 3) + 1}`,
      });
    }

    // Bulk insert dates
    await prisma.dimDate.createMany({
      data: dates,
      skipDuplicates: true,
    });

    console.log(`✅ Generated ${dates.length} date dimension records for year ${year}`);
  }

  /**
   * Extract and load product dimension (SCD Type 2)
   */
  static async loadProductDimension(): Promise<void> {
    const jobId = await this.createETLJob('Product Dimension Load', 'dimension', 'Product', 'DimProduct');

    try {
      await this.updateETLJobStatus(jobId, 'running');

      // Get all products from operational database
      const products = await prisma.product.findMany({
        include: {
          category: true,
        },
      });

      let inserted = 0;
      let updated = 0;

      for (const product of products) {
        // Check if product dimension already exists
        const existing = await prisma.dimProduct.findFirst({
          where: {
            productId: product.id,
            expiryDate: null, // Current record
          },
        });

        const categoryHierarchy = product.category
          ? `${product.category.name}`
          : 'Uncategorized';

        const dimData = {
          productId: product.id,
          productName: product.name,
          sku: product.sku || '',
          category: product.category?.name || 'Uncategorized',
          categoryHierarchy,
          brand: product.brand,
          unit: product.unit,
          trackingType: product.trackingType,
          isActive: product.isActive,
        };

        if (!existing) {
          // Insert new dimension record
          await prisma.dimProduct.create({
            data: dimData,
          });
          inserted++;
        } else {
          // Check if attributes have changed (SCD Type 2)
          const hasChanged =
            existing.productName !== dimData.productName ||
            existing.category !== dimData.category ||
            existing.brand !== dimData.brand ||
            existing.isActive !== dimData.isActive;

          if (hasChanged) {
            // Expire old record
            await prisma.dimProduct.update({
              where: { productKey: existing.productKey },
              data: { expiryDate: new Date() },
            });

            // Insert new record
            await prisma.dimProduct.create({
              data: dimData,
            });
            updated++;
          }
        }
      }

      await this.completeETLJob(jobId, products.length, inserted, updated, 0);
      console.log(`✅ Product dimension loaded: ${inserted} inserted, ${updated} updated`);
    } catch (error: any) {
      await this.failETLJob(jobId, error.message);
      throw error;
    }
  }

  /**
   * Extract and load customer dimension (SCD Type 2)
   */
  static async loadCustomerDimension(): Promise<void> {
    const jobId = await this.createETLJob('Customer Dimension Load', 'dimension', 'Order', 'DimCustomer');

    try {
      await this.updateETLJobStatus(jobId, 'running');

      // Get unique customers from orders
      const customers = await prisma.order.findMany({
        where: {
          customerId: { not: null },
        },
        distinct: ['customerId'],
        select: {
          customerId: true,
          customerName: true,
          customerPhone: true,
        },
      });

      let inserted = 0;

      for (const customer of customers) {
        if (!customer.customerId) continue;

        const existing = await prisma.dimCustomer.findFirst({
          where: {
            customerId: customer.customerId,
            expiryDate: null,
          },
        });

        if (!existing) {
          await prisma.dimCustomer.create({
            data: {
              customerId: customer.customerId,
              customerName: customer.customerName,
              customerType: 'individual',
              segment: 'retail',
              region: null,
              country: null,
              city: null,
              isActive: true,
            },
          });
          inserted++;
        }
      }

      await this.completeETLJob(jobId, customers.length, inserted, 0, 0);
      console.log(`✅ Customer dimension loaded: ${inserted} inserted`);
    } catch (error: any) {
      await this.failETLJob(jobId, error.message);
      throw error;
    }
  }

  /**
   * Extract and load warehouse dimension
   */
  static async loadWarehouseDimension(): Promise<void> {
    const jobId = await this.createETLJob('Warehouse Dimension Load', 'dimension', 'Warehouse', 'DimWarehouse');

    try {
      await this.updateETLJobStatus(jobId, 'running');

      const warehouses = await prisma.warehouse.findMany();
      let inserted = 0;

      for (const warehouse of warehouses) {
        const existing = await prisma.dimWarehouse.findFirst({
          where: {
            warehouseId: warehouse.id,
            expiryDate: null,
          },
        });

        if (!existing) {
          await prisma.dimWarehouse.create({
            data: {
              warehouseId: warehouse.id,
              warehouseName: warehouse.name,
              warehouseCode: warehouse.code,
              region: null,
              country: null,
              city: null,
              isActive: true,
            },
          });
          inserted++;
        }
      }

      await this.completeETLJob(jobId, warehouses.length, inserted, 0, 0);
      console.log(`✅ Warehouse dimension loaded: ${inserted} inserted`);
    } catch (error: any) {
      await this.failETLJob(jobId, error.message);
      throw error;
    }
  }

  /**
   * Extract and load employee dimension
   */
  static async loadEmployeeDimension(): Promise<void> {
    const jobId = await this.createETLJob('Employee Dimension Load', 'dimension', 'Employee', 'DimEmployee');

    try {
      await this.updateETLJobStatus(jobId, 'running');

      const employees = await prisma.employee.findMany();
      let inserted = 0;

      for (const employee of employees) {
        const existing = await prisma.dimEmployee.findFirst({
          where: {
            employeeId: employee.id,
            expiryDate: null,
          },
        });

        if (!existing) {
          await prisma.dimEmployee.create({
            data: {
              employeeId: employee.id,
              employeeName: `${employee.firstName} ${employee.lastName}`,
              department: employee.department || null,
              position: employee.position || null,
              managerId: employee.managerId || null,
              isActive: employee.status === 'active',
            },
          });
          inserted++;
        }
      }

      await this.completeETLJob(jobId, employees.length, inserted, 0, 0);
      console.log(`✅ Employee dimension loaded: ${inserted} inserted`);
    } catch (error: any) {
      await this.failETLJob(jobId, error.message);
      throw error;
    }
  }

  /**
   * Load sales fact table (incremental)
   */
  static async loadSalesFact(startDate?: Date, endDate?: Date): Promise<void> {
    const start = startDate || subDays(new Date(), 1);
    const end = endDate || new Date();

    const jobId = await this.createETLJob(
      'Sales Fact Load',
      'incremental',
      'Order',
      'FactSales'
    );

    try {
      await this.updateETLJobStatus(jobId, 'running');

      const orders = await prisma.order.findMany({
        where: {
          createdAt: {
            gte: startOfDay(start),
            lte: endOfDay(end),
          },
          type: 'sale',
        },
        include: {
          items: {
            include: {
              product: true,
            },
          },
        },
      });

      let inserted = 0;
      let failed = 0;

      for (const order of orders) {
        for (const item of order.items) {
          if (!item.product) {
            failed++;
            continue;
          }

          const dateKey = format(order.createdAt, 'yyyyMMdd');

          // Get dimension keys
          const productDim = await prisma.dimProduct.findFirst({
            where: { productId: item.product.id, expiryDate: null },
          });

          const customerDim = order.customerId
            ? await prisma.dimCustomer.findFirst({
                where: { customerId: order.customerId, expiryDate: null },
              })
            : null;

          const warehouseDim = await prisma.dimWarehouse.findFirst({
            where: { isActive: true },
            orderBy: { effectiveDate: 'desc' },
          });

          const employeeDim = order.cashierId
            ? await prisma.dimEmployee.findFirst({
                where: { employeeId: order.cashierId, expiryDate: null },
              })
            : null;

          if (!productDim || !warehouseDim) {
            failed++;
            continue;
          }

          // Create default customer if not found
          let customerKey = customerDim?.customerKey;
          if (!customerKey) {
            const defaultCustomer = await prisma.dimCustomer.upsert({
              where: { customerKey: 'default-customer' },
              create: {
                customerKey: 'default-customer',
                customerId: 'walk-in',
                customerName: 'Walk-in Customer',
                customerType: 'individual',
                segment: 'retail',
                isActive: true,
              },
              update: {},
            });
            customerKey = defaultCustomer.customerKey;
          }

          // Create default employee if not found
          let employeeKey = employeeDim?.employeeKey;
          if (!employeeKey) {
            const defaultEmployee = await prisma.dimEmployee.upsert({
              where: { employeeKey: 'default-employee' },
              create: {
                employeeKey: 'default-employee',
                employeeId: 'system',
                employeeName: 'System User',
                isActive: true,
              },
              update: {},
            });
            employeeKey = defaultEmployee.employeeKey;
          }

          const profitAmount = item.subtotal - (item.cost || 0) * item.qty;
          const profitMargin = item.subtotal > 0 ? (profitAmount / item.subtotal) * 100 : 0;

          // Check if fact already exists
          const existing = await prisma.factSales.findFirst({
            where: {
              orderId: order.id,
              productKey: productDim.productKey,
            },
          });

          if (!existing) {
            await prisma.factSales.create({
              data: {
                dateKey,
                productKey: productDim.productKey,
                customerKey,
                warehouseKey: warehouseDim.warehouseKey,
                employeeKey,
                orderId: order.id,
                orderNumber: order.orderNo,
                quantity: item.qty,
                unitPrice: item.price,
                discount: item.discount,
                taxAmount: item.gstAmount,
                totalAmount: item.subtotal + item.gstAmount,
                costAmount: (item.cost || 0) * item.qty,
                profitAmount,
                profitMargin,
                paymentMode: order.paymentMode,
                orderStatus: order.status,
              },
            });
            inserted++;
          }
        }
      }

      await this.completeETLJob(jobId, orders.length, inserted, 0, failed);
      console.log(`✅ Sales fact loaded: ${inserted} inserted, ${failed} failed`);
    } catch (error: any) {
      await this.failETLJob(jobId, error.message);
      throw error;
    }
  }

  /**
   * Load inventory fact table (daily snapshot)
   */
  static async loadInventoryFact(snapshotDate?: Date): Promise<void> {
    const date = snapshotDate || new Date();
    const dateKey = format(date, 'yyyyMMdd');

    const jobId = await this.createETLJob(
      'Inventory Fact Load',
      'incremental',
      'Product',
      'FactInventory'
    );

    try {
      await this.updateETLJobStatus(jobId, 'running');

      const products = await prisma.product.findMany({
        where: { isActive: true },
      });

      const warehouses = await prisma.warehouse.findMany();

      let inserted = 0;

      for (const product of products) {
        for (const warehouse of warehouses) {
          const productDim = await prisma.dimProduct.findFirst({
            where: { productId: product.id, expiryDate: null },
          });

          const warehouseDim = await prisma.dimWarehouse.findFirst({
            where: { warehouseId: warehouse.id, expiryDate: null },
          });

          if (!productDim || !warehouseDim) continue;

          // Calculate inventory metrics
          const quantityOnHand = product.stock;
          const quantityReserved = 0; // Can be calculated from pending orders
          const quantityAvailable = quantityOnHand - quantityReserved;
          const unitCost = product.cost;
          const totalValue = quantityOnHand * unitCost;
          const reorderPoint = product.reorderPoint || product.minStock;
          const daysOfSupply = quantityOnHand > 0 ? quantityOnHand / 10 : 0; // Simplified calculation

          let stockStatus = 'in_stock';
          if (quantityOnHand === 0) stockStatus = 'out_of_stock';
          else if (quantityOnHand < reorderPoint) stockStatus = 'low_stock';
          else if (quantityOnHand > product.maxStock) stockStatus = 'overstock';

          // Check if snapshot already exists
          const existing = await prisma.factInventory.findFirst({
            where: {
              dateKey,
              productKey: productDim.productKey,
              warehouseKey: warehouseDim.warehouseKey,
            },
          });

          if (!existing) {
            await prisma.factInventory.create({
              data: {
                dateKey,
                productKey: productDim.productKey,
                warehouseKey: warehouseDim.warehouseKey,
                quantityOnHand,
                quantityReserved,
                quantityAvailable,
                unitCost,
                totalValue,
                reorderPoint,
                daysOfSupply,
                stockStatus,
                snapshotDate: date,
              },
            });
            inserted++;
          }
        }
      }

      await this.completeETLJob(jobId, products.length * warehouses.length, inserted, 0, 0);
      console.log(`✅ Inventory fact loaded: ${inserted} snapshots created`);
    } catch (error: any) {
      await this.failETLJob(jobId, error.message);
      throw error;
    }
  }

  /**
   * Run full ETL pipeline
   */
  static async runFullETL(): Promise<void> {
    console.log('🚀 Starting full ETL pipeline...');

    try {
      // Generate date dimension for current and next year
      const currentYear = new Date().getFullYear();
      await this.generateDateDimension(currentYear);
      await this.generateDateDimension(currentYear + 1);

      // Load dimensions
      await this.loadProductDimension();
      await this.loadCustomerDimension();
      await this.loadWarehouseDimension();
      await this.loadEmployeeDimension();

      // Load facts (last 30 days)
      const startDate = subDays(new Date(), 30);
      await this.loadSalesFact(startDate);
      await this.loadInventoryFact();

      console.log('✅ Full ETL pipeline completed successfully');
    } catch (error) {
      console.error('❌ ETL pipeline failed:', error);
      throw error;
    }
  }

  /**
   * Run incremental ETL (daily)
   */
  static async runIncrementalETL(): Promise<void> {
    console.log('🚀 Starting incremental ETL...');

    try {
      // Update dimensions (only new/changed records)
      await this.loadProductDimension();
      await this.loadCustomerDimension();
      await this.loadWarehouseDimension();
      await this.loadEmployeeDimension();

      // Load yesterday's facts
      const yesterday = subDays(new Date(), 1);
      await this.loadSalesFact(yesterday, yesterday);
      await this.loadInventoryFact();

      console.log('✅ Incremental ETL completed successfully');
    } catch (error) {
      console.error('❌ Incremental ETL failed:', error);
      throw error;
    }
  }

  // Helper methods for ETL job tracking

  private static async createETLJob(
    jobName: string,
    jobType: string,
    sourceTable: string,
    targetTable: string
  ): Promise<string> {
    const job = await prisma.eTLJob.create({
      data: {
        jobName,
        jobType,
        sourceTable,
        targetTable,
        status: 'pending',
        startTime: new Date(),
      },
    });
    return job.id;
  }

  private static async updateETLJobStatus(jobId: string, status: string): Promise<void> {
    await prisma.eTLJob.update({
      where: { id: jobId },
      data: { status },
    });
  }

  private static async completeETLJob(
    jobId: string,
    processed: number,
    inserted: number,
    updated: number,
    failed: number
  ): Promise<void> {
    await prisma.eTLJob.update({
      where: { id: jobId },
      data: {
        status: 'completed',
        endTime: new Date(),
        recordsProcessed: processed,
        recordsInserted: inserted,
        recordsUpdated: updated,
        recordsFailed: failed,
        lastSuccessfulRun: new Date(),
      },
    });
  }

  private static async failETLJob(jobId: string, errorMessage: string): Promise<void> {
    await prisma.eTLJob.update({
      where: { id: jobId },
      data: {
        status: 'failed',
        endTime: new Date(),
        errorMessage,
      },
    });

    await prisma.eTLJobLog.create({
      data: {
        jobId,
        logLevel: 'error',
        message: 'ETL job failed',
        details: { error: errorMessage },
      },
    });
  }
}
