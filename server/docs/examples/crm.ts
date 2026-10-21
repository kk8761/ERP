/**
 * NexaERP API — CRM Examples
 *
 * Covers: create customer, get customer, list customers, log activity,
 *         get purchase history.
 * Run with: npx ts-node crm.ts
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

type LoyaltyTier = 'BRONZE' | 'SILVER' | 'GOLD' | 'PLATINUM';
type ActivityType = 'CALL' | 'EMAIL' | 'MEETING' | 'NOTE';
type ActivityOutcome = 'POSITIVE' | 'NEUTRAL' | 'NEGATIVE';

interface CreateCustomerPayload {
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  loyaltyTier?: LoyaltyTier;
  notes?: string;
}

interface Customer {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  loyaltyPoints: number;
  loyaltyTier: LoyaltyTier;
  createdAt: string;
}

interface LogActivityPayload {
  customerId: string;
  type: ActivityType;
  subject: string;
  description?: string;
  outcome?: ActivityOutcome;
  scheduledAt?: string;
}

interface Activity {
  id: string;
  customerId: string;
  type: ActivityType;
  subject: string;
  outcome?: ActivityOutcome;
  createdAt: string;
}

// ─── Create Customer ──────────────────────────────────────────────────────────

async function createCustomer(
  client: AxiosInstance,
  payload: CreateCustomerPayload
): Promise<Customer> {
  const res = await client.post('/crm/customers', payload);

  if (res.status !== 201 || !res.data.success) {
    const errors = res.data.errors?.join(', ') ?? res.data.error;
    throw new Error(`Failed to create customer: ${errors}`);
  }

  const customer: Customer = res.data.data;
  console.log(`✅ Customer created: [${customer.id}] ${customer.name}`);
  console.log(`   Tier: ${customer.loyaltyTier} | Points: ${customer.loyaltyPoints}`);
  return customer;
}

// ─── Get Customer ─────────────────────────────────────────────────────────────

async function getCustomer(client: AxiosInstance, id: string): Promise<Customer> {
  const res = await client.get(`/crm/customers/${id}`);

  if (!res.data.success) {
    throw new Error(`Customer not found: ${id}`);
  }

  const customer: Customer = res.data.data;
  console.log(`✅ Customer: ${customer.name} | ${customer.email ?? 'no email'} | Tier: ${customer.loyaltyTier}`);
  return customer;
}

// ─── Update Customer ──────────────────────────────────────────────────────────

async function updateCustomer(
  client: AxiosInstance,
  id: string,
  updates: Partial<CreateCustomerPayload>
): Promise<Customer> {
  const res = await client.put(`/crm/customers/${id}`, updates);

  if (!res.data.success) {
    throw new Error(`Failed to update customer: ${res.data.error}`);
  }

  const customer: Customer = res.data.data;
  console.log(`✅ Customer updated: ${customer.name}`);
  return customer;
}

// ─── List Customers ───────────────────────────────────────────────────────────

async function listCustomers(
  client: AxiosInstance,
  options: { search?: string; tier?: LoyaltyTier; page?: number } = {}
): Promise<Customer[]> {
  const params = new URLSearchParams();
  if (options.search) params.set('search', options.search);
  if (options.tier) params.set('tier', options.tier);
  if (options.page) params.set('page', String(options.page));

  const res = await client.get(`/crm/customers?${params}`);

  if (!res.data.success) {
    throw new Error(`Failed to list customers: ${res.data.error}`);
  }

  const { items, pagination } = res.data.data;
  console.log(`✅ Customers: ${pagination.total} total`);
  items.slice(0, 5).forEach((c: Customer) =>
    console.log(`   - ${c.name} | ${c.phone ?? 'no phone'} | ${c.loyaltyTier}`)
  );

  return items;
}

// ─── Log Activity ─────────────────────────────────────────────────────────────

async function logActivity(
  client: AxiosInstance,
  payload: LogActivityPayload
): Promise<Activity> {
  const res = await client.post('/crm/activities', payload);

  if (res.status !== 201 || !res.data.success) {
    const errors = res.data.errors?.join(', ') ?? res.data.error;
    throw new Error(`Failed to log activity: ${errors}`);
  }

  const activity: Activity = res.data.data;
  console.log(`✅ Activity logged: [${activity.type}] ${activity.subject}`);
  if (activity.outcome) {
    console.log(`   Outcome: ${activity.outcome}`);
  }
  return activity;
}

// ─── Get Purchase History ─────────────────────────────────────────────────────

async function getCustomerPurchaseHistory(
  client: AxiosInstance,
  customerId: string
): Promise<void> {
  const res = await client.get(`/crm/customers/${customerId}/orders`);

  if (!res.data.success) {
    throw new Error(`Failed to get purchase history: ${res.data.error}`);
  }

  const { items, pagination } = res.data.data;
  const totalSpent = items.reduce(
    (sum: number, o: { grandTotal: number }) => sum + o.grandTotal,
    0
  );

  console.log(`✅ Purchase history for ${customerId}:`);
  console.log(`   Orders: ${pagination.total} | Total spent: ₹${totalSpent.toFixed(2)}`);
  items.slice(0, 3).forEach((o: { orderNumber: string; grandTotal: number; createdAt: string }) =>
    console.log(`   - ${o.orderNumber} | ₹${o.grandTotal} | ${o.createdAt.split('T')[0]}`)
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const client = createClient();

  // Authenticate
  await client.post('/auth/login', {
    email: 'admin@store.com',
    password: 'SecurePass123!',
  });

  console.log('\n--- CREATE CUSTOMER ---');
  const customer = await createCustomer(client, {
    name: 'Ramesh Kumar',
    email: 'ramesh.kumar@example.com',
    phone: '+91-9876543210',
    address: '12 MG Road, Bengaluru - 560001',
    loyaltyTier: 'SILVER',
    notes: 'Regular customer, prefers organic produce',
  });

  console.log('\n--- GET CUSTOMER ---');
  await getCustomer(client, customer.id);

  console.log('\n--- UPDATE CUSTOMER (upgrade tier) ---');
  await updateCustomer(client, customer.id, { loyaltyTier: 'GOLD' });

  console.log('\n--- LIST GOLD TIER CUSTOMERS ---');
  await listCustomers(client, { tier: 'GOLD' });

  console.log('\n--- LOG ACTIVITY (call) ---');
  await logActivity(client, {
    customerId: customer.id,
    type: 'CALL',
    subject: 'Follow-up on bulk rice order',
    description: 'Customer confirmed 50 bags of Basmati rice for next week.',
    outcome: 'POSITIVE',
  });

  console.log('\n--- LOG ACTIVITY (note) ---');
  await logActivity(client, {
    customerId: customer.id,
    type: 'NOTE',
    subject: 'Preferred delivery time',
    description: 'Customer prefers deliveries before 10 AM on weekdays.',
  });

  console.log('\n--- PURCHASE HISTORY ---');
  await getCustomerPurchaseHistory(client, customer.id);

  console.log('\n--- SEARCH CUSTOMERS ---');
  await listCustomers(client, { search: 'ramesh' });

  console.log('\nAll CRM examples completed.');
}

main().catch(console.error);
