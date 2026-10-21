/**
 * Release Notes Service
 *
 * Business logic for creating, updating, publishing, and querying
 * NexaERP version release notes (changelog entries).
 *
 * Requirements: 28.6
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// ─── Types ──────────────────────────────────────────────────────────────────

export interface ReleaseSection {
  category: string;
  items: string[];
}

export interface CreateReleaseNoteData {
  version: string;
  title: string;
  releaseDate: string | Date;
  summary: string;
  type?: 'major' | 'minor' | 'patch';
  sections?: ReleaseSection[];
  isPublished?: boolean;
  createdBy?: string;
  tenantId?: string;
}

export interface UpdateReleaseNoteData {
  title?: string;
  releaseDate?: string | Date;
  summary?: string;
  type?: 'major' | 'minor' | 'patch';
  sections?: ReleaseSection[];
  isPublished?: boolean;
}

export interface ReleaseNoteFilters {
  isPublished?: boolean;
  tenantId?: string;
  page?: number;
  pageSize?: number;
}

// ─── Public / Read Functions ─────────────────────────────────────────────────

/**
 * listReleaseNotes
 *
 * Returns paginated release notes. When called without isPublished filter
 * (or with isPublished = true) it surfaces only published notes — used by
 * the public-facing changelog page.  Admin callers may pass isPublished =
 * undefined to see all entries.
 *
 * Requirements: 28.6
 */
export async function listReleaseNotes(filters: ReleaseNoteFilters = {}): Promise<{
  notes: object[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}> {
  const { isPublished = true, tenantId, page = 1, pageSize = 20 } = filters;

  const where: Record<string, unknown> = {};

  if (isPublished !== undefined) {
    where.isPublished = isPublished;
  }

  if (tenantId) {
    where.tenantId = tenantId;
  }

  const skip = (page - 1) * pageSize;

  const [notes, total] = await Promise.all([
    prisma.releaseNote.findMany({
      where,
      orderBy: { releaseDate: 'desc' },
      skip,
      take: pageSize,
      select: {
        id: true,
        version: true,
        title: true,
        releaseDate: true,
        summary: true,
        type: true,
        sections: true,
        isPublished: true,
        createdBy: true,
        createdAt: true,
        updatedAt: true,
      },
    }),
    prisma.releaseNote.count({ where }),
  ]);

  return {
    notes,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}

/**
 * getReleaseNoteByVersion
 *
 * Returns a single published release note by semver string.
 * Admin paths may bypass the published filter.
 *
 * Requirements: 28.6
 */
export async function getReleaseNoteByVersion(
  version: string,
  requirePublished = true,
): Promise<object | null> {
  const where: Record<string, unknown> = { version };
  if (requirePublished) where.isPublished = true;

  return prisma.releaseNote.findFirst({ where });
}

/**
 * getReleaseNoteById
 *
 * Returns a release note by ID (admin use).
 *
 * Requirements: 28.6
 */
export async function getReleaseNoteById(id: string): Promise<object | null> {
  return prisma.releaseNote.findUnique({ where: { id } });
}

/**
 * getLatestPublished
 *
 * Returns the most recently released and published note.
 * Used for the "What's New" login notification.
 *
 * Requirements: 28.6
 */
export async function getLatestPublished(): Promise<object | null> {
  return prisma.releaseNote.findFirst({
    where: { isPublished: true },
    orderBy: { releaseDate: 'desc' },
    select: {
      id: true,
      version: true,
      title: true,
      releaseDate: true,
      summary: true,
      type: true,
    },
  });
}

// ─── Write Functions ─────────────────────────────────────────────────────────

/**
 * createReleaseNote
 *
 * Creates a new release note entry. Validates that the version string is
 * unique before inserting.
 *
 * Requirements: 28.6
 */
export async function createReleaseNote(data: CreateReleaseNoteData): Promise<object> {
  const { version, title, releaseDate, summary, type = 'minor', sections = [], isPublished = false, createdBy, tenantId } = data;

  // Validate semver-ish format (major.minor.patch)
  if (!/^\d+\.\d+\.\d+$/.test(version)) {
    throw new Error(`Invalid version format "${version}". Expected semver (e.g. 1.2.3).`);
  }

  const existing = await prisma.releaseNote.findUnique({ where: { version } });
  if (existing) {
    throw new Error(`A release note for version ${version} already exists.`);
  }

  return prisma.releaseNote.create({
    data: {
      version,
      title,
      releaseDate: new Date(releaseDate),
      summary,
      type,
      sections: sections as any,
      isPublished,
      createdBy,
      tenantId,
    },
  });
}

/**
 * updateReleaseNote
 *
 * Partially updates an existing release note by ID.
 *
 * Requirements: 28.6
 */
export async function updateReleaseNote(
  id: string,
  data: UpdateReleaseNoteData,
): Promise<object> {
  const existing = await prisma.releaseNote.findUnique({ where: { id } });
  if (!existing) {
    throw new Error(`Release note ${id} not found.`);
  }

  const updateData: Record<string, unknown> = {};
  if (data.title !== undefined) updateData.title = data.title;
  if (data.summary !== undefined) updateData.summary = data.summary;
  if (data.type !== undefined) updateData.type = data.type;
  if (data.sections !== undefined) updateData.sections = data.sections as any;
  if (data.isPublished !== undefined) updateData.isPublished = data.isPublished;
  if (data.releaseDate !== undefined) updateData.releaseDate = new Date(data.releaseDate);

  return prisma.releaseNote.update({ where: { id }, data: updateData });
}

/**
 * publishReleaseNote
 *
 * Sets isPublished = true on a release note. Idempotent.
 *
 * Requirements: 28.6
 */
export async function publishReleaseNote(id: string): Promise<object> {
  const existing = await prisma.releaseNote.findUnique({ where: { id } });
  if (!existing) {
    throw new Error(`Release note ${id} not found.`);
  }

  return prisma.releaseNote.update({ where: { id }, data: { isPublished: true } });
}

/**
 * seedReleaseNotes
 *
 * Seeds 4 realistic sample release notes for NexaERP v1.0–v1.3.
 * Idempotent — skips versions that already exist.
 *
 * Requirements: 28.6
 */
export async function seedReleaseNotes(): Promise<{ seeded: number }> {
  const samples: CreateReleaseNoteData[] = [
    {
      version: '1.0.0',
      title: 'NexaERP — General Availability',
      releaseDate: '2024-01-15',
      summary:
        'The first stable release of NexaERP brings a full-featured POS, real-time inventory tracking, and a modern glassmorphism dashboard to small businesses.',
      type: 'major',
      isPublished: true,
      sections: [
        {
          category: '🚀 New Features',
          items: [
            'Point-of-Sale (POS) module with touch-friendly billing, barcode scanning, and GST invoice generation',
            'Real-time inventory management with low-stock alerts, category management, and bulk import',
            'Animated dashboard with revenue charts, KPI cards, and daily sales summary',
            'Multi-role authentication — owner, manager, cashier — with JWT sessions',
            'Dark-mode glassmorphism UI with Inter + Space Grotesk typography',
            'Progressive Web App (PWA) support — install to home screen',
          ],
        },
        {
          category: '⚙️ Improvements',
          items: [
            'Responsive layout for tablet and mobile POS workflows',
            'Demo data seeder for quick onboarding without a backend',
          ],
        },
      ],
    },
    {
      version: '1.1.0',
      title: 'Accounting, CRM & Orders',
      releaseDate: '2024-03-10',
      summary:
        'Adds a double-entry accounting ledger, customer relationship management with loyalty points, and purchase/sales order workflows.',
      type: 'minor',
      isPublished: true,
      sections: [
        {
          category: '🚀 New Features',
          items: [
            'Accounting module — income/expense ledger, chart of accounts, and P&L statements',
            'CRM module — lead pipeline, opportunity tracking, and customer loyalty points',
            'Orders module — purchase orders with supplier management, and sales order fulfilment',
            'Staff & Payroll — employee records, attendance, and salary processing',
          ],
        },
        {
          category: '⚙️ Improvements',
          items: [
            'POS now supports split payment (cash + card)',
            'Inventory low-stock alerts now send email notifications',
            'Dashboard KPI cards are now clickable drill-downs',
          ],
        },
        {
          category: '🐛 Bug Fixes',
          items: [
            'Fixed rounding error in GST calculation for multi-item invoices',
            'Resolved session timeout not redirecting to login on mobile',
          ],
        },
      ],
    },
    {
      version: '1.2.0',
      title: 'Analytics, Reports & AI Assistant',
      releaseDate: '2024-05-22',
      summary:
        'Introduces rich business analytics, GST report exports, a natural-language AI assistant, and multi-branch support.',
      type: 'minor',
      isPublished: true,
      sections: [
        {
          category: '🚀 New Features',
          items: [
            'Analytics & Reports — revenue trend charts, category breakdown, export to PDF/Excel',
            'GST report generation with GSTR-1 compatible CSV export',
            'AI Assistant — natural language queries ("What were my top products last month?")',
            'Multi-branch / store support with per-branch inventory isolation',
            'Barcode label printing directly from inventory management',
          ],
        },
        {
          category: '⚙️ Improvements',
          items: [
            'POS receipt now includes QR code linking to digital invoice',
            'CRM customer list now supports bulk tagging and export',
            'Improved search performance with database full-text indexes',
          ],
        },
        {
          category: '🐛 Bug Fixes',
          items: [
            'Fixed chart data gap when no sales occur on a weekend',
            'Resolved duplicate barcode entry not showing validation error',
            'Fixed payroll calculation ignoring pro-rated deductions',
          ],
        },
        {
          category: '🔐 Security',
          items: [
            'Added rate limiting on login endpoint (5 attempts / 15 min)',
            'All API responses now include Content-Security-Policy headers',
          ],
        },
      ],
    },
    {
      version: '1.3.0',
      title: 'Enterprise Security, Help Center & Notifications',
      releaseDate: '2024-08-05',
      summary:
        'Delivers zero-trust security architecture, a full help center with tutorials and video training, real-time notifications, and multi-factor authentication.',
      type: 'minor',
      isPublished: true,
      sections: [
        {
          category: '🚀 New Features',
          items: [
            'Help Center — searchable knowledge base, interactive tutorials, and video training library',
            'Release Notes — in-app changelog with "What\'s New" login banner',
            'Multi-Factor Authentication (TOTP / SMS / email)',
            'Real-time in-app notifications with notification center',
            'Zero-trust security — anomaly detection, trusted device management, blocked IP list',
            'Role-Based Access Control (RBAC) with granular permission sets',
            'End-to-end field-level encryption for sensitive data',
            'Document Management System (DMS) with e-signature support',
            'Approval workflow engine with configurable multi-step flows',
          ],
        },
        {
          category: '⚙️ Improvements',
          items: [
            'Dashboard now shows real-time updates via WebSocket',
            'Inventory import now validates duplicates and shows conflict report',
            'POS offline mode caches last 500 transactions in IndexedDB',
          ],
        },
        {
          category: '🐛 Bug Fixes',
          items: [
            'Fixed notification badge not resetting after marking all as read',
            'Resolved tutorial progress not saving on mobile browsers',
            'Fixed PDF invoice generation truncating long product names',
          ],
        },
        {
          category: '⚠️ Breaking Changes',
          items: [
            'JWT tokens now expire after 8 hours (previously 30 days) — users must re-login',
            'Legacy `/api/v1/` prefix endpoints removed; use `/api/` prefix going forward',
          ],
        },
      ],
    },
  ];

  let seeded = 0;
  for (const sample of samples) {
    const exists = await prisma.releaseNote.findUnique({ where: { version: sample.version } });
    if (!exists) {
      await createReleaseNote(sample);
      seeded++;
    }
  }

  return { seeded };
}
