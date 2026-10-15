/**
 * NexaERP API — POS / Billing Examples
 *
 * Covers: create sale, list orders, get order details, download GST invoice.
 * Run with: npx ts-node pos.ts
 */

import axios, { AxiosInstance } from 'axios';
import fs from 'fs';
import path from 'path';

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

interface OrderItem {
  productId: string;
  quantity: number;
  unitPrice: number;
  discount?: number;
}

interface CreateSalePayload {
  customerId?: string;
  items: OrderItem[];
  paymentMethod: 'CASH' | 'CARD' | 'UPI' | 'CREDIT';
  notes?: string;
}

interface Order {
  id: string;
  orderNumber: string;
  total: number;
  tax: number;
  grandTotal: number;
  status: string;
  paymentMethod: string;
  createdAt: string;
}

// ─── Create a POS Sale ────────────────────────────────────────────────────────

async function createSale(
  client: AxiosInstance,
  payload: CreateSalePayload
): Promise<Order> {
  const res = await client.post('/orders', payload);

  if (res.status !== 201 || !res.data.success) {
    const errors = res.data.errors?.join(', ') ?? res.data.error;
    throw new Error(`Failed to create sale: ${errors}`);
  }

  const order: Order = res.data.data;
  console.log(`✅ Sale created: ${order.orderNumber}`);
  console.log(`   Items total: ₹${order.total}`);
  console.log(`   GST:         ₹${order.tax}`);
  console.log(`   Grand total: ₹${order.grandTotal}`);
  console.log(`   Payment:     ${order.paymentMethod}`);

  return order;
}

// ─── Get Order Details ────────────────────────────────────────────────────────

async function getOrder(client: AxiosInstance, orderId: string): Promise<Order> {
  const res = await client.get(`/orders/${orderId}`);

  if (!res.data.success) {
    throw new Error(`Order not found: ${orderId}`);
  }

  const order: Order = res.data.data;
  console.log(`✅ Order ${order.orderNumber} — status: ${order.status}`);
  return order;
}

// ─── List Orders ──────────────────────────────────────────────────────────────

async function listOrders(
  client: AxiosInstance,
  options: {
    type?: 'SALE' | 'PURCHASE';
    status?: string;
    from?: string;
    to?: string;
    page?: number;
  } = {}
): Promise<Order[]> {
  const params = new URLSearchParams();
  if (options.type) params.set('type', options.type);
  if (options.status) params.set('status', options.status);
  if (options.from) params.set('from', options.from);
  if (options.to) params.set('to', options.to);
  if (options.page) params.set('page', String(options.page));

  const res = await client.get(`/orders?${params}`);

  if (!res.data.success) {
    throw new Error(`Failed to list orders: ${res.data.error}`);
  }

  const { items, pagination } = res.data.data;
  console.log(`✅ Orders: ${pagination.total} total`);
  items.slice(0, 5).forEach((o: Order) =>
    console.log(`   - ${o.orderNumber} | ₹${o.grandTotal} | ${o.status}`)
  );

  return items;
}

// ─── Download GST Invoice as PDF ──────────────────────────────────────────────

async function downloadInvoice(
  client: AxiosInstance,
  orderId: string,
  outputPath: string
): Promise<void> {
  // Need a separate client for binary response
  const binaryClient = axios.create({
    baseURL: BASE_URL,
    withCredentials: true,
    responseType: 'arraybuffer',       // receive raw binary
    validateStatus: () => true,
  });

  // Copy session cookies from main client (share cookie jar in real apps)
  const res = await binaryClient.get(`/orders/${orderId}/invoice`);

  if (res.status !== 200) {
    throw new Error(`Failed to download invoice: HTTP ${res.status}`);
  }

  fs.writeFileSync(outputPath, Buffer.from(res.data));
  console.log(`✅ Invoice downloaded: ${path.resolve(outputPath)}`);
}

// ─── POS Sale with Discount ───────────────────────────────────────────────────

async function createSaleWithDiscount(client: AxiosInstance): Promise<Order> {
  return createSale(client, {
    customerId: 'cust_demo',                    // optional loyalty tracking
    paymentMethod: 'UPI',
    notes: 'Loyalty member discount applied',
    items: [
      {
        productId: 'prod_rice_5kg',
        quantity: 3,
        unitPrice: 450.00,
        discount: 10,                           // 10% line discount
      },
      {
        productId: 'prod_sugar_1kg',
        quantity: 2,
        unitPrice: 48.00,
        discount: 0,
      },
    ],
  });
}

// ─── Quick Cash Sale ──────────────────────────────────────────────────────────

async function quickCashSale(
  client: AxiosInstance,
  productId: string,
  quantity: number,
  unitPrice: number
): Promise<Order> {
  return createSale(client, {
    paymentMethod: 'CASH',
    items: [{ productId, quantity, unitPrice }],
  });
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const client = createClient();

  // Authenticate
  await client.post('/auth/login', {
    email: 'admin@store.com',
    password: 'SecurePass123!',
  });

  console.log('\n--- CREATE SALE (cash) ---');
  const sale = await quickCashSale(client, 'prod_rice_5kg', 2, 450.00);

  console.log('\n--- GET ORDER DETAILS ---');
  await getOrder(client, sale.id);

  console.log('\n--- CREATE SALE WITH DISCOUNT ---');
  const discountedSale = await createSaleWithDiscount(client);

  console.log('\n--- LIST TODAY\'S SALES ---');
  const today = new Date().toISOString().split('T')[0];
  await listOrders(client, { type: 'SALE', from: today, to: today });

  console.log('\n--- DOWNLOAD INVOICE ---');
  await downloadInvoice(client, discountedSale.id, `./invoice-${discountedSale.orderNumber}.pdf`);

  console.log('\nAll POS examples completed.');
}

main().catch(console.error);
