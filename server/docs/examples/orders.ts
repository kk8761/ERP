/**
 * NexaERP API — Purchase Orders Examples
 *
 * Covers: create purchase order, receive goods (GRN), list purchase orders.
 * Run with: npx ts-node orders.ts
 */

import axios, { AxiosInstance } from 'axios';

const BASE_URL = process.env.NEXAERP_API_URL || 'http://localhost:5000/api';

function createClient(): AxiosInstance {
  return axios.create({
    baseURL: BASE_URL,
    withCredentials: true,
    headers: { 'Content-Type': 'application/json' },
    validateStatus: () => true,
  });
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface PurchaseOrderItem {
  productId: string;
  quantity: number;
  unitPrice: number;
}

interface CreatePurchaseOrderPayload {
  supplierId: string;
  expectedDelivery?: string;      // ISO date string
  items: PurchaseOrderItem[];
  notes?: string;
}

interface ReceivedItem {
  productId: string;
  receivedQty: number;
  batchNo?: string;
}

interface GoodsReceiptPayload {
  receivedItems: ReceivedItem[];
  receivedAt?: string;            // ISO datetime
}

interface PurchaseOrder {
  id: string;
  orderNumber: string;
  supplierId: string;
  status: string;
  totalAmount: number;
  expectedDelivery?: string;
  createdAt: string;
}

// ─── Create Purchase Order ────────────────────────────────────────────────────

async function createPurchaseOrder(
  client: AxiosInstance,
  payload: CreatePurchaseOrderPayload
): Promise<PurchaseOrder> {
  const res = await client.post('/orders/purchase', payload);

  if (res.status !== 201 || !res.data.success) {
    const errors = res.data.errors?.join(', ') ?? res.data.error;
    throw new Error(`Failed to create purchase order: ${errors}`);
  }

  const order: PurchaseOrder = res.data.data;
  console.log(`✅ Purchase order created: ${order.orderNumber}`);
  console.log(`   Supplier: ${order.supplierId}`);
  console.log(`   Total:    ₹${order.totalAmount}`);
  console.log(`   Expected: ${order.expectedDelivery ?? 'Not specified'}`);

  return order;
}

// ─── Receive Goods (GRN) ──────────────────────────────────────────────────────

async function receiveGoods(
  client: AxiosInstance,
  orderId: string,
  payload: GoodsReceiptPayload
): Promise<void> {
  const res = await client.post(`/orders/${orderId}/receive`, {
    receivedItems: payload.receivedItems,
    receivedAt: payload.receivedAt ?? new Date().toISOString(),
  });

  if (!res.data.success) {
    throw new Error(`Goods receipt failed: ${res.data.error}`);
  }

  const totalReceived = payload.receivedItems.reduce((sum, i) => sum + i.receivedQty, 0);
  console.log(`✅ Goods received for order ${orderId}: ${totalReceived} units total`);
  payload.receivedItems.forEach((item) =>
    console.log(
      `   - Product ${item.productId}: ${item.receivedQty} units${item.batchNo ? ` (batch: ${item.batchNo})` : ''}`
    )
  );
}

// ─── List Purchase Orders ─────────────────────────────────────────────────────

async function listPurchaseOrders(
  client: AxiosInstance,
  options: { status?: string; page?: number } = {}
): Promise<PurchaseOrder[]> {
  const params = new URLSearchParams({ type: 'PURCHASE' });
  if (options.status) params.set('status', options.status);
  if (options.page) params.set('page', String(options.page));

  const res = await client.get(`/orders?${params}`);

  if (!res.data.success) {
    throw new Error(`Failed to list purchase orders: ${res.data.error}`);
  }

  const { items, pagination } = res.data.data;
  console.log(`✅ Purchase orders: ${pagination.total} total`);
  items.slice(0, 5).forEach((o: PurchaseOrder) =>
    console.log(`   - ${o.orderNumber} | ₹${o.totalAmount} | ${o.status}`)
  );

  return items;
}

// ─── Full Procurement Workflow ─────────────────────────────────────────────────
//
// This example walks through the full procurement cycle:
//   1. Create a purchase order with multiple line items
//   2. Supplier delivers goods
//   3. Warehouse records the goods receipt (GRN)
//   4. Stock is automatically updated in inventory

async function fullProcurementWorkflow(client: AxiosInstance): Promise<void> {
  console.log('\n=== Full Procurement Workflow ===');

  // Step 1: Create purchase order
  const po = await createPurchaseOrder(client, {
    supplierId: 'sup_agrisupply',
    expectedDelivery: (() => {
      const d = new Date();
      d.setDate(d.getDate() + 7);
      return d.toISOString().split('T')[0];
    })(),
    notes: 'Monthly restocking — priority delivery requested',
    items: [
      { productId: 'prod_rice_5kg',   quantity: 500, unitPrice: 380.00 },
      { productId: 'prod_sugar_1kg',  quantity: 200, unitPrice: 40.00  },
      { productId: 'prod_flour_2kg',  quantity: 150, unitPrice: 88.00  },
    ],
  });

  // Step 2: Simulate receiving goods (partial delivery)
  console.log('\n--- Partial Delivery Received ---');
  await receiveGoods(client, po.id, {
    receivedItems: [
      { productId: 'prod_rice_5kg',   receivedQty: 500, batchNo: 'B24-DEC-01' },
      { productId: 'prod_sugar_1kg',  receivedQty: 180, batchNo: 'B24-DEC-02' }, // 20 units short
      // flour not yet delivered
    ],
  });

  console.log('\n--- Second Delivery (remaining items) ---');
  await receiveGoods(client, po.id, {
    receivedItems: [
      { productId: 'prod_sugar_1kg', receivedQty: 20,  batchNo: 'B24-DEC-03' },
      { productId: 'prod_flour_2kg', receivedQty: 150, batchNo: 'B24-DEC-04' },
    ],
  });

  console.log('\n✅ Procurement workflow complete — all items received');
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const client = createClient();

  // Authenticate
  await client.post('/auth/login', {
    email: 'admin@store.com',
    password: 'SecurePass123!',
  });

  console.log('\n--- LIST PENDING PURCHASE ORDERS ---');
  await listPurchaseOrders(client, { status: 'PENDING' });

  console.log('\n--- RUN FULL PROCUREMENT WORKFLOW ---');
  await fullProcurementWorkflow(client);

  console.log('\n--- LIST ALL PURCHASE ORDERS ---');
  await listPurchaseOrders(client);

  console.log('\nAll order examples completed.');
}

main().catch(console.error);
