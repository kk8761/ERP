/**
 * NexaERP API — Authentication Examples
 *
 * Covers: login, current user, MFA setup, logout, session management.
 * Run with: npx ts-node auth.ts
 */

import axios, { AxiosInstance } from 'axios';

const BASE_URL = process.env.NEXAERP_API_URL || 'http://localhost:5000/api';

// ─── Create an Axios client that persists the session cookie ──────────────────
function createClient(): AxiosInstance {
  return axios.create({
    baseURL: BASE_URL,
    withCredentials: true,              // keep session cookies across requests
    headers: { 'Content-Type': 'application/json' },
    validateStatus: () => true,         // don't throw on non-2xx
  });
}

// ─── Login ────────────────────────────────────────────────────────────────────

interface LoginPayload {
  email: string;
  password: string;
}

interface UserData {
  id: string;
  email: string;
  name: string;
  role: string;
}

async function login(client: AxiosInstance, payload: LoginPayload): Promise<UserData> {
  const res = await client.post('/auth/login', payload);

  if (res.status !== 200 || !res.data.success) {
    throw new Error(`Login failed: ${res.data.error ?? res.status}`);
  }

  console.log('✅ Logged in as:', res.data.data.user.email);
  return res.data.data.user as UserData;
}

// ─── Get Current User ──────────────────────────────────────────────────────────

async function getCurrentUser(client: AxiosInstance): Promise<UserData> {
  const res = await client.get('/auth/me');

  if (res.status !== 200 || !res.data.success) {
    throw new Error('Not authenticated');
  }

  return res.data.data.user as UserData;
}

// ─── MFA Setup ────────────────────────────────────────────────────────────────

interface MFASetupData {
  qrCodeUrl: string;
  secret: string;
}

async function setupMFA(client: AxiosInstance): Promise<MFASetupData> {
  const res = await client.get('/auth/mfa/setup');

  if (res.status !== 200 || !res.data.success) {
    throw new Error(`MFA setup failed: ${res.data.error}`);
  }

  console.log('✅ MFA QR code URL:', res.data.data.qrCodeUrl.substring(0, 40) + '...');
  console.log('   Secret (save securely):', res.data.data.secret);
  return res.data.data as MFASetupData;
}

// ─── Confirm MFA (after scanning QR code) ─────────────────────────────────────

async function confirmMFA(client: AxiosInstance, totpToken: string): Promise<void> {
  const res = await client.post('/auth/mfa/confirm', { token: totpToken });

  if (res.status !== 200 || !res.data.success) {
    throw new Error(`MFA confirmation failed: ${res.data.error}`);
  }

  console.log('✅ MFA enabled successfully');
}

// ─── Verify MFA (during login when MFA is active) ─────────────────────────────

async function verifyMFA(client: AxiosInstance, totpToken: string): Promise<void> {
  const res = await client.post('/auth/mfa/verify', { token: totpToken });

  if (res.status !== 200 || !res.data.success) {
    throw new Error(`MFA verification failed: ${res.data.error}`);
  }

  console.log('✅ MFA verified');
}

// ─── Logout ───────────────────────────────────────────────────────────────────

async function logout(client: AxiosInstance): Promise<void> {
  const res = await client.post('/auth/logout');

  if (res.status !== 200) {
    console.warn('⚠️ Logout returned unexpected status:', res.status);
    return;
  }

  console.log('✅ Logged out');
}

// ─── List Active Sessions ──────────────────────────────────────────────────────

async function listSessions(client: AxiosInstance): Promise<void> {
  const res = await client.get('/auth/sessions');

  if (!res.data.success) {
    throw new Error(`Failed to list sessions: ${res.data.error}`);
  }

  const sessions: Array<{ id: string; createdAt: string; userAgent?: string }> =
    res.data.data.sessions ?? [];

  console.log(`✅ Active sessions (${sessions.length}):`);
  sessions.forEach((s) =>
    console.log(`   - ${s.id} | created: ${s.createdAt} | ${s.userAgent ?? 'unknown UA'}`)
  );
}

// ─── Revoke a Specific Session ─────────────────────────────────────────────────

async function revokeSession(client: AxiosInstance, sessionToken: string): Promise<void> {
  const res = await client.delete(`/auth/sessions/${sessionToken}`);

  if (!res.data.success) {
    throw new Error(`Failed to revoke session: ${res.data.error}`);
  }

  console.log('✅ Session revoked:', sessionToken);
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const client = createClient();

  // 1. Login
  const user = await login(client, {
    email: 'admin@store.com',
    password: 'SecurePass123!',
  });
  console.log('   User role:', user.role);

  // 2. Confirm identity
  const me = await getCurrentUser(client);
  console.log('   Confirmed:', me.email);

  // 3. List sessions
  await listSessions(client);

  // 4. Setup MFA (optional — comment out if already set up)
  // const mfa = await setupMFA(client);
  // await confirmMFA(client, '123456'); // replace with real TOTP code

  // 5. Logout
  await logout(client);

  console.log('\nAll authentication examples completed.');
}

main().catch(console.error);
