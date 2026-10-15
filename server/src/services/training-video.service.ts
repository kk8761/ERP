/**
 * Training Video Service
 *
 * Manages the video training library catalogue.
 * Supports CRUD, filtering by module, full-text search, and view-count tracking.
 *
 * Requirements: 28.4
 */

import prisma from '../config/prisma';

// ─── Interfaces ─────────────────────────────────────────────────────────────

export interface CreateVideoData {
  title: string;
  description: string;
  module: string;
  duration: string;
  videoUrl: string;
  thumbnailUrl?: string;
  tags?: string[];
  level?: string;
  sortOrder?: number;
  isActive?: boolean;
  tenantId?: string;
  createdBy?: string;
}

export interface UpdateVideoData {
  title?: string;
  description?: string;
  module?: string;
  duration?: string;
  videoUrl?: string;
  thumbnailUrl?: string;
  tags?: string[];
  level?: string;
  sortOrder?: number;
  isActive?: boolean;
  updatedBy?: string;
}

export interface VideoFilters {
  module?: string;
  level?: string;
  tags?: string[];
  search?: string;
  isActive?: boolean;
  tenantId?: string;
  page?: number;
  pageSize?: number;
}

export interface PaginatedVideos {
  videos: object[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// ─── Service Functions ──────────────────────────────────────────────────────

/**
 * List videos with optional filters and pagination.
 *
 * Requirements: 28.4
 */
export async function listVideos(filters: VideoFilters = {}): Promise<PaginatedVideos> {
  const {
    module,
    level,
    tags,
    search,
    isActive = true,
    tenantId,
    page = 1,
    pageSize = 20,
  } = filters;

  const where: Record<string, unknown> = { isActive };

  if (module) where.module = { equals: module, mode: 'insensitive' };
  if (level) where.level = level;
  if (tenantId) where.tenantId = tenantId;

  if (tags && tags.length > 0) {
    where.tags = { hasSome: tags };
  }

  if (search) {
    where.OR = [
      { title: { contains: search, mode: 'insensitive' } },
      { description: { contains: search, mode: 'insensitive' } },
      { module: { contains: search, mode: 'insensitive' } },
      { tags: { has: search } },
    ];
  }

  const skip = (page - 1) * pageSize;

  const [videos, total] = await Promise.all([
    prisma.trainingVideo.findMany({
      where,
      orderBy: [{ module: 'asc' }, { sortOrder: 'asc' }, { createdAt: 'desc' }],
      skip,
      take: pageSize,
    }),
    prisma.trainingVideo.count({ where }),
  ]);

  return { videos, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
}

/**
 * Get a single video by ID and increment its view count.
 *
 * Requirements: 28.4
 */
export async function getVideoById(id: string): Promise<object | null> {
  const video = await prisma.trainingVideo.findUnique({ where: { id } });

  if (!video) return null;

  // Fire-and-forget view count increment
  prisma.trainingVideo
    .update({ where: { id }, data: { viewCount: { increment: 1 } } })
    .catch((err: Error) =>
      console.warn(`[TrainingVideoService] Failed to increment view count: ${err.message}`)
    );

  return video;
}

/**
 * Get all active videos for a specific module, ordered by sortOrder.
 *
 * Requirements: 28.4
 */
export async function getVideosByModule(
  module: string,
  tenantId?: string
): Promise<object[]> {
  const where: Record<string, unknown> = {
    module: { equals: module, mode: 'insensitive' },
    isActive: true,
  };

  if (tenantId) where.tenantId = tenantId;

  return prisma.trainingVideo.findMany({
    where,
    orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
  });
}

/**
 * Get distinct active module names (for sidebar/filter UI).
 *
 * Requirements: 28.4
 */
export async function getModules(tenantId?: string): Promise<string[]> {
  const where: Record<string, unknown> = { isActive: true };
  if (tenantId) where.tenantId = tenantId;

  const rows = await prisma.trainingVideo.findMany({
    where,
    select: { module: true },
    distinct: ['module'],
    orderBy: { module: 'asc' },
  });

  return rows.map((r: { module: string }) => r.module);
}

/**
 * Create a new training video entry.
 *
 * Requirements: 28.4
 */
export async function createVideo(data: CreateVideoData): Promise<object> {
  return prisma.trainingVideo.create({
    data: {
      title: data.title,
      description: data.description,
      module: data.module,
      duration: data.duration,
      videoUrl: data.videoUrl,
      thumbnailUrl: data.thumbnailUrl,
      tags: data.tags ?? [],
      level: data.level ?? 'beginner',
      sortOrder: data.sortOrder ?? 0,
      isActive: data.isActive ?? true,
      tenantId: data.tenantId,
      createdBy: data.createdBy,
    },
  });
}

/**
 * Update an existing training video entry.
 *
 * Requirements: 28.4
 */
export async function updateVideo(id: string, data: UpdateVideoData): Promise<object> {
  const existing = await prisma.trainingVideo.findUnique({ where: { id } });

  if (!existing) throw new Error('Training video not found');

  return prisma.trainingVideo.update({
    where: { id },
    data: {
      ...(data.title !== undefined && { title: data.title }),
      ...(data.description !== undefined && { description: data.description }),
      ...(data.module !== undefined && { module: data.module }),
      ...(data.duration !== undefined && { duration: data.duration }),
      ...(data.videoUrl !== undefined && { videoUrl: data.videoUrl }),
      ...(data.thumbnailUrl !== undefined && { thumbnailUrl: data.thumbnailUrl }),
      ...(data.tags !== undefined && { tags: data.tags }),
      ...(data.level !== undefined && { level: data.level }),
      ...(data.sortOrder !== undefined && { sortOrder: data.sortOrder }),
      ...(data.isActive !== undefined && { isActive: data.isActive }),
      ...(data.updatedBy !== undefined && { updatedBy: data.updatedBy }),
    },
  });
}

/**
 * Delete a training video permanently.
 *
 * Requirements: 28.4
 */
export async function deleteVideo(id: string): Promise<void> {
  const existing = await prisma.trainingVideo.findUnique({ where: { id } });

  if (!existing) throw new Error('Training video not found');

  await prisma.trainingVideo.delete({ where: { id } });
}

/**
 * Seed default training video metadata for all major modules.
 * Idempotent — skips insertion if videos already exist.
 *
 * Requirements: 28.4
 */
export async function seedDefaultVideos(): Promise<{ seeded: number }> {
  const count = await prisma.trainingVideo.count();
  if (count > 0) return { seeded: 0 };

  const defaults: CreateVideoData[] = [
    // Dashboard
    {
      title: 'Dashboard Overview',
      description: 'Get familiar with the NexaERP dashboard — KPIs, charts, alerts, and AI assistant.',
      module: 'Dashboard',
      duration: '3:45',
      videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
      thumbnailUrl: 'https://img.youtube.com/vi/dQw4w9WgXcQ/hqdefault.jpg',
      tags: ['dashboard', 'overview', 'kpi'],
      level: 'beginner',
      sortOrder: 1,
    },
    {
      title: 'Customizing Your Dashboard Widgets',
      description: 'Learn how to add, remove, and rearrange widgets to tailor your dashboard view.',
      module: 'Dashboard',
      duration: '5:12',
      videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
      thumbnailUrl: 'https://img.youtube.com/vi/dQw4w9WgXcQ/hqdefault.jpg',
      tags: ['dashboard', 'widgets', 'customization'],
      level: 'intermediate',
      sortOrder: 2,
    },
    // POS
    {
      title: 'Processing Your First Sale',
      description: 'Step-by-step walkthrough of adding items, applying discounts, and completing a transaction.',
      module: 'POS',
      duration: '6:20',
      videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
      thumbnailUrl: 'https://img.youtube.com/vi/dQw4w9WgXcQ/hqdefault.jpg',
      tags: ['pos', 'sale', 'billing'],
      level: 'beginner',
      sortOrder: 1,
    },
    {
      title: 'GST Invoices & Receipts',
      description: 'How to generate, print, and email GST-compliant invoices from the POS module.',
      module: 'POS',
      duration: '4:55',
      videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
      thumbnailUrl: 'https://img.youtube.com/vi/dQw4w9WgXcQ/hqdefault.jpg',
      tags: ['pos', 'gst', 'invoice', 'print'],
      level: 'beginner',
      sortOrder: 2,
    },
    {
      title: 'Split Payments & Refunds',
      description: 'Handle split payment methods and process customer refunds efficiently.',
      module: 'POS',
      duration: '5:30',
      videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
      thumbnailUrl: 'https://img.youtube.com/vi/dQw4w9WgXcQ/hqdefault.jpg',
      tags: ['pos', 'payments', 'refunds'],
      level: 'intermediate',
      sortOrder: 3,
    },
    // Inventory
    {
      title: 'Adding & Managing Products',
      description: 'Create product records, set pricing, configure tax rates, and manage categories.',
      module: 'Inventory',
      duration: '7:15',
      videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
      thumbnailUrl: 'https://img.youtube.com/vi/dQw4w9WgXcQ/hqdefault.jpg',
      tags: ['inventory', 'products', 'sku'],
      level: 'beginner',
      sortOrder: 1,
    },
    {
      title: 'Stock Movements & Adjustments',
      description: 'Record incoming stock, perform stock counts, and adjust for shrinkage or damage.',
      module: 'Inventory',
      duration: '6:40',
      videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
      thumbnailUrl: 'https://img.youtube.com/vi/dQw4w9WgXcQ/hqdefault.jpg',
      tags: ['inventory', 'stock', 'adjustments'],
      level: 'beginner',
      sortOrder: 2,
    },
    {
      title: 'Barcode Scanning & Labels',
      description: 'Set up barcode scanning via camera or USB scanner and print product labels.',
      module: 'Inventory',
      duration: '4:10',
      videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
      thumbnailUrl: 'https://img.youtube.com/vi/dQw4w9WgXcQ/hqdefault.jpg',
      tags: ['inventory', 'barcode', 'labels'],
      level: 'intermediate',
      sortOrder: 3,
    },
    // Orders
    {
      title: 'Creating Purchase Orders',
      description: 'Raise purchase orders for suppliers, track delivery status, and receive goods.',
      module: 'Orders',
      duration: '5:50',
      videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
      thumbnailUrl: 'https://img.youtube.com/vi/dQw4w9WgXcQ/hqdefault.jpg',
      tags: ['orders', 'purchase', 'supplier'],
      level: 'beginner',
      sortOrder: 1,
    },
    {
      title: 'Sales Order Workflow',
      description: 'Manage the complete sales order lifecycle from quote to fulfilment and invoice.',
      module: 'Orders',
      duration: '6:05',
      videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
      thumbnailUrl: 'https://img.youtube.com/vi/dQw4w9WgXcQ/hqdefault.jpg',
      tags: ['orders', 'sales', 'fulfilment'],
      level: 'beginner',
      sortOrder: 2,
    },
    // Accounting
    {
      title: 'Recording Income & Expenses',
      description: 'Add journal entries, categorise transactions, and reconcile accounts.',
      module: 'Accounting',
      duration: '7:30',
      videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
      thumbnailUrl: 'https://img.youtube.com/vi/dQw4w9WgXcQ/hqdefault.jpg',
      tags: ['accounting', 'income', 'expenses', 'journal'],
      level: 'beginner',
      sortOrder: 1,
    },
    {
      title: 'Generating P&L and Balance Sheet',
      description: 'Run standard financial statements and export them to PDF or Excel.',
      module: 'Accounting',
      duration: '5:00',
      videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
      thumbnailUrl: 'https://img.youtube.com/vi/dQw4w9WgXcQ/hqdefault.jpg',
      tags: ['accounting', 'reports', 'p&l', 'balance-sheet'],
      level: 'intermediate',
      sortOrder: 2,
    },
    // CRM
    {
      title: 'Managing Customers & Leads',
      description: 'Add customer profiles, track leads through the pipeline, and log activities.',
      module: 'CRM',
      duration: '6:45',
      videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
      thumbnailUrl: 'https://img.youtube.com/vi/dQw4w9WgXcQ/hqdefault.jpg',
      tags: ['crm', 'customers', 'leads'],
      level: 'beginner',
      sortOrder: 1,
    },
    {
      title: 'Loyalty Points & Customer Retention',
      description: 'Configure loyalty programme rules, award points, and redeem rewards at checkout.',
      module: 'CRM',
      duration: '4:25',
      videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
      thumbnailUrl: 'https://img.youtube.com/vi/dQw4w9WgXcQ/hqdefault.jpg',
      tags: ['crm', 'loyalty', 'retention'],
      level: 'intermediate',
      sortOrder: 2,
    },
    // Staff
    {
      title: 'Employee Onboarding & Profiles',
      description: 'Create employee records, assign roles, and manage HR information.',
      module: 'Staff',
      duration: '5:15',
      videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
      thumbnailUrl: 'https://img.youtube.com/vi/dQw4w9WgXcQ/hqdefault.jpg',
      tags: ['staff', 'hr', 'employees', 'onboarding'],
      level: 'beginner',
      sortOrder: 1,
    },
    {
      title: 'Running Payroll',
      description: 'Calculate salaries, deductions, and generate pay slips for your team.',
      module: 'Staff',
      duration: '6:00',
      videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
      thumbnailUrl: 'https://img.youtube.com/vi/dQw4w9WgXcQ/hqdefault.jpg',
      tags: ['staff', 'payroll', 'salary'],
      level: 'intermediate',
      sortOrder: 2,
    },
    // Analytics
    {
      title: 'Revenue Trends & KPI Reports',
      description: 'Use the analytics module to visualise revenue trends, top products, and customer insights.',
      module: 'Analytics',
      duration: '5:40',
      videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
      thumbnailUrl: 'https://img.youtube.com/vi/dQw4w9WgXcQ/hqdefault.jpg',
      tags: ['analytics', 'reports', 'kpi', 'charts'],
      level: 'beginner',
      sortOrder: 1,
    },
    {
      title: 'Exporting Reports to PDF & Excel',
      description: 'Export any report or data table to PDF or Excel for sharing with stakeholders.',
      module: 'Analytics',
      duration: '3:20',
      videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
      thumbnailUrl: 'https://img.youtube.com/vi/dQw4w9WgXcQ/hqdefault.jpg',
      tags: ['analytics', 'export', 'pdf', 'excel'],
      level: 'beginner',
      sortOrder: 2,
    },
    // Settings / Admin
    {
      title: 'User Roles & Permissions',
      description: 'Configure role-based access control — create roles, assign permissions, and manage staff access.',
      module: 'Settings',
      duration: '6:50',
      videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
      thumbnailUrl: 'https://img.youtube.com/vi/dQw4w9WgXcQ/hqdefault.jpg',
      tags: ['settings', 'rbac', 'permissions', 'roles'],
      level: 'intermediate',
      sortOrder: 1,
    },
    {
      title: 'Multi-Store Setup',
      description: 'Set up multiple store locations, configure store-level settings, and transfer stock between branches.',
      module: 'Settings',
      duration: '7:00',
      videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
      thumbnailUrl: 'https://img.youtube.com/vi/dQw4w9WgXcQ/hqdefault.jpg',
      tags: ['settings', 'multi-store', 'branches'],
      level: 'advanced',
      sortOrder: 2,
    },
  ];

  let seeded = 0;
  for (const video of defaults) {
    await prisma.trainingVideo.create({ data: { ...video, tags: video.tags ?? [] } });
    seeded++;
  }

  return { seeded };
}

export default {
  listVideos,
  getVideoById,
  getVideosByModule,
  getModules,
  createVideo,
  updateVideo,
  deleteVideo,
  seedDefaultVideos,
};
