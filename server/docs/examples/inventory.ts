/**
 * NexaERP API — Inventory Examples
 *
 * Covers: list products, create product, update stock, get by ID.
 * Run with: npx ts-node inventory.ts
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

interface Product {
  id: string;
  name: string;
  sku: string;
  category: string;
  price: number;
  purchasePrice: number;
  stock: number;
  reorderLevel: number;
  unit: string;
  barcode?: string;
  taxRate: number;
  supplier?: string;
}

interface CreateProductPayload {
  name: string;
  sku: string;
  category: string;
  price: number;
  purchasePrice: number;
  stock: number;
  reorderLevel: number;
  unit: string;
  barcode?: string;
  taxRate: number;
  supplier?: string;
}

interface Pagination {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

// ─── List Products ────────────────────────────────────────────────────────────

async function listProducts(
  client: AxiosInstance,
  options: {
    page?: number;
    pageSize?: number;
    search?: string;
    category?: string;
    lowStock?: boolean;
  } = {}
): Promise<{ items: Product[]; pagination: Pagination }> {
  const params = new URLSearchParams();
  if (options.page) params.set('page', String(options.page));
  if (options.pageSize) params.set('pageSize', String(options.pageSize));
  if (options.search) params.set('search', options.search);
  if (options.category) params.set('category', options.category);
  if (options.lowStock) params.set('lowStock', 'true');

  const res = await client.get(`/inventory?${params}`);

  if (!res.data.success) {
    throw new Error(`Failed to list products: ${res.data.error}`);
  }

  const { items, pagination } = res.data.data;
  console.log(`✅ Found ${pagination.total} products (page ${pagination.page}/${pagination.totalPages})`);
  items.forEach((p: Product) =>
    console.log(`   - [${p.sku}] ${p.name} — stock: ${p.stock}, price: ₹${p.price}`)
  );

  return { items, pagination };
}

// ─── Create Product ───────────────────────────────────────────────────────────

async function createProduct(
  client: AxiosInstance,
  payload: CreateProductPayload
): Promise<Product> {
  const res = await client.post('/inventory', payload);

  if (res.status !== 201 || !res.data.success) {
    const errors = res.data.errors?.join(', ') ?? res.data.error;
    throw new Error(`Failed to create product: ${errors}`);
  }

  const product: Product = res.data.data;
  console.log(`✅ Product created: [${product.id}] ${product.name}`);
  return product;
}

// ─── Get Product by ID ────────────────────────────────────────────────────────

async function getProduct(client: AxiosInstance, id: string): Promise<Product> {
  const res = await client.get(`/inventory/${id}`);

  if (!res.data.success) {
    throw new Error(`Product not found: ${id}`);
  }

  const product: Product = res.data.data;
  console.log(`✅ Product: ${product.name} | Stock: ${product.stock}`);
  return product;
}

// ─── Update Stock ─────────────────────────────────────────────────────────────

async function adjustStock(
  client: AxiosInstance,
  productId: string,
  adjustment: number,
  reason: string
): Promise<void> {
  const res = await client.patch(`/inventory/${productId}/stock`, {
    adjustment,
    reason,
  });

  if (!res.data.success) {
    throw new Error(`Stock adjustment failed: ${res.data.error}`);
  }

  const direction = adjustment > 0 ? '+' : '';
  console.log(`✅ Stock adjusted: ${direction}${adjustment} units. Reason: ${reason}`);
}

// ─── Update Product ───────────────────────────────────────────────────────────

async function updateProduct(
  client: AxiosInstance,
  id: string,
  updates: Partial<CreateProductPayload>
): Promise<Product> {
  const res = await client.put(`/inventory/${id}`, updates);

  if (!res.data.success) {
    throw new Error(`Failed to update product: ${res.data.error}`);
  }

  const product: Product = res.data.data;
  console.log(`✅ Product updated: ${product.name}`);
  return product;
}

// ─── Delete Product ───────────────────────────────────────────────────────────

async function deleteProduct(client: AxiosInstance, id: string): Promise<void> {
  const res = await client.delete(`/inventory/${id}`);

  if (!res.data.success) {
    throw new Error(`Failed to delete product: ${res.data.error}`);
  }

  console.log(`✅ Product deleted: ${id}`);
}

// ─── Find Low-Stock Products ──────────────────────────────────────────────────

async function getLowStockProducts(
  client: AxiosInstance
): Promise<Product[]> {
  const { items } = await listProducts(client, { lowStock: true, pageSize: 50 });
  console.log(`⚠️  ${items.length} products are below reorder level`);
  return items;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const client = createClient();

  // Authenticate first
  await client.post('/auth/login', {
    email: 'admin@store.com',
    password: 'SecurePass123!',
  });

  console.log('\n--- LIST PRODUCTS ---');
  await listProducts(client, { pageSize: 5, search: 'rice' });

  console.log('\n--- CREATE PRODUCT ---');
  const product = await createProduct(client, {
    name: 'Organic Wheat Flour 2kg',
    sku: 'FLOUR-ORG-2KG',
    category: 'Grocery',
    price: 120.00,
    purchasePrice: 95.00,
    stock: 50,
    reorderLevel: 10,
    unit: 'bag',
    barcode: '8901234567891',
    taxRate: 5,
    supplier: 'Nature Fresh Co.',
  });

  console.log('\n--- GET PRODUCT ---');
  await getProduct(client, product.id);

  console.log('\n--- ADJUST STOCK (+100) ---');
  await adjustStock(client, product.id, 100, 'Received shipment from supplier');

  console.log('\n--- ADJUST STOCK (-5) ---');
  await adjustStock(client, product.id, -5, 'Damaged goods removed');

  console.log('\n--- UPDATE PRODUCT ---');
  await updateProduct(client, product.id, { price: 125.00, reorderLevel: 15 });

  console.log('\n--- LOW STOCK ALERT ---');
  await getLowStockProducts(client);

  console.log('\n--- DELETE PRODUCT ---');
  await deleteProduct(client, product.id);

  console.log('\nAll inventory examples completed.');
}

main().catch(console.error);
