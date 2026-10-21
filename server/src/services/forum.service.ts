/**
 * Forum Service
 *
 * Business logic for the NexaERP community forum — threads, replies,
 * category filtering, search, pinning, and accepted-answer management.
 *
 * Requirements: 28.8
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// ─── Types ────────────────────────────────────────────────────────────────────

export type ForumCategory =
  | 'General'
  | 'Features'
  | 'Bug Reports'
  | 'How-To'
  | 'Announcements';

export interface CreateThreadData {
  title: string;
  content: string;
  category: ForumCategory;
  authorId: string;
  authorName: string;
  tags?: string[];
  tenantId?: string;
}

export interface CreateReplyData {
  threadId: string;
  content: string;
  authorId: string;
  authorName: string;
}

export interface ThreadFilters {
  category?: string;
  search?: string;
  page?: number;
  pageSize?: number;
  tenantId?: string;
}

// ─── Thread Operations ────────────────────────────────────────────────────────

/**
 * List published threads with optional category filter and full-text search.
 * Pinned threads always surface first; then sorted by newest first.
 *
 * Requirements: 28.8
 */
export async function listThreads(filters: ThreadFilters = {}) {
  const { category, search, page = 1, pageSize = 20, tenantId } = filters;

  const where: any = { isPublished: true };

  if (category && category !== 'all') {
    where.category = category;
  }

  if (search) {
    where.OR = [
      { title: { contains: search, mode: 'insensitive' } },
      { content: { contains: search, mode: 'insensitive' } },
    ];
  }

  if (tenantId) {
    where.tenantId = tenantId;
  }

  const skip = (page - 1) * pageSize;

  const [threads, total] = await Promise.all([
    prisma.forumThread.findMany({
      where,
      orderBy: [{ isPinned: 'desc' }, { createdAt: 'desc' }],
      skip,
      take: pageSize,
      select: {
        id: true,
        title: true,
        category: true,
        authorId: true,
        authorName: true,
        tags: true,
        viewCount: true,
        replyCount: true,
        isAnswered: true,
        isPinned: true,
        isClosed: true,
        createdAt: true,
        updatedAt: true,
      },
    }),
    prisma.forumThread.count({ where }),
  ]);

  return {
    threads,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}

/**
 * Get a single thread by ID along with all its published replies.
 * Increments the view counter atomically.
 *
 * Requirements: 28.8
 */
export async function getThreadById(id: string) {
  // Increment view count
  const thread = await prisma.forumThread.update({
    where: { id, isPublished: true },
    data: { viewCount: { increment: 1 } },
    include: {
      replies: {
        where: { isPublished: true },
        orderBy: [{ isAcceptedAnswer: 'desc' }, { createdAt: 'asc' }],
      },
    },
  });

  return thread;
}

/**
 * Create a new forum thread.
 *
 * Requirements: 28.8
 */
export async function createThread(data: CreateThreadData) {
  const thread = await prisma.forumThread.create({
    data: {
      title: data.title,
      content: data.content,
      category: data.category,
      authorId: data.authorId,
      authorName: data.authorName,
      tags: data.tags ?? [],
      tenantId: data.tenantId,
      isPublished: true,
    },
  });

  return thread;
}

/**
 * Post a reply to an existing thread.
 * Also increments the parent thread's replyCount.
 *
 * Requirements: 28.8
 */
export async function createReply(data: CreateReplyData) {
  const [reply] = await prisma.$transaction([
    prisma.forumReply.create({
      data: {
        threadId: data.threadId,
        content: data.content,
        authorId: data.authorId,
        authorName: data.authorName,
        isPublished: true,
      },
    }),
    prisma.forumThread.update({
      where: { id: data.threadId },
      data: { replyCount: { increment: 1 } },
    }),
  ]);

  return reply;
}

/**
 * Mark a reply as the accepted answer for a thread.
 * Clears the previous accepted answer (if any) and sets isAnswered = true on the thread.
 *
 * Requirements: 28.8
 */
export async function markAnswered(threadId: string, replyId: string) {
  await prisma.$transaction([
    // Clear any existing accepted answers on this thread
    prisma.forumReply.updateMany({
      where: { threadId, isAcceptedAnswer: true },
      data: { isAcceptedAnswer: false },
    }),
    // Set the new accepted answer
    prisma.forumReply.update({
      where: { id: replyId },
      data: { isAcceptedAnswer: true },
    }),
    // Mark thread as answered
    prisma.forumThread.update({
      where: { id: threadId },
      data: { isAnswered: true },
    }),
  ]);

  return { success: true };
}

/**
 * Toggle the pinned status of a thread (admin action).
 *
 * Requirements: 28.8
 */
export async function togglePin(threadId: string) {
  const thread = await prisma.forumThread.findUniqueOrThrow({
    where: { id: threadId },
    select: { isPinned: true },
  });

  return prisma.forumThread.update({
    where: { id: threadId },
    data: { isPinned: !thread.isPinned },
  });
}

/**
 * Soft-delete a thread by setting isPublished = false.
 *
 * Requirements: 28.8
 */
export async function deleteThread(threadId: string) {
  await prisma.forumThread.update({
    where: { id: threadId },
    data: { isPublished: false },
  });

  return { success: true };
}

// ─── Stats ────────────────────────────────────────────────────────────────────

/**
 * Return aggregate forum stats: thread count, reply count, unique author count.
 *
 * Requirements: 28.8
 */
export async function getForumStats() {
  const [threadCount, replyCount, activeUsers] = await Promise.all([
    prisma.forumThread.count({ where: { isPublished: true } }),
    prisma.forumReply.count({ where: { isPublished: true } }),
    prisma.forumThread
      .findMany({
        where: { isPublished: true },
        select: { authorId: true },
        distinct: ['authorId'],
      })
      .then((rows) => rows.length),
  ]);

  return { threadCount, replyCount, activeUsers };
}

// ─── Seed ─────────────────────────────────────────────────────────────────────

/**
 * Seed sample forum threads for each category.
 * Idempotent — skips seeding if threads already exist.
 *
 * Requirements: 28.8
 */
export async function seedForumThreads() {
  const existing = await prisma.forumThread.count();
  if (existing > 0) {
    return { skipped: true, existing };
  }

  const seeds: CreateThreadData[] = [
    // General
    {
      title: 'Welcome to the NexaERP Community Forum!',
      content:
        "We're thrilled to launch the NexaERP community forum. This is the place to connect with other users, share tips, and help each other get the most out of the platform. Feel free to introduce yourself and let us know what type of business you run!",
      category: 'General',
      authorId: 'system',
      authorName: 'NexaERP Team',
      tags: ['welcome', 'community', 'introduction'],
    },
    {
      title: 'How are you using NexaERP for your grocery store?',
      content:
        "I've been running NexaERP for my grocery store for three months now. The POS and inventory modules have saved me hours every week. Would love to hear how other grocery store owners are using the platform — any workflow tips?",
      category: 'General',
      authorId: 'demo-user-1',
      authorName: 'Priya Sharma',
      tags: ['grocery', 'pos', 'inventory', 'tips'],
    },
    // Features
    {
      title: 'Feature Request: Bulk barcode scanning in inventory',
      content:
        'It would be great to scan multiple barcodes at once during stock-take instead of one at a time. This would dramatically speed up the process for stores with large inventories. Has anyone found a workaround?',
      category: 'Features',
      authorId: 'demo-user-2',
      authorName: 'Rajesh Kumar',
      tags: ['inventory', 'barcode', 'feature-request'],
    },
    {
      title: 'Requesting multi-store support in the POS module',
      content:
        "Our business has three locations and we'd love to see a consolidated view of sales across all stores. Currently we need to log in separately to each. Any plans for a multi-store dashboard?",
      category: 'Features',
      authorId: 'demo-user-3',
      authorName: 'Anita Verma',
      tags: ['pos', 'multi-store', 'feature-request', 'dashboard'],
    },
    // Bug Reports
    {
      title: 'GST invoice total rounding off incorrectly in some edge cases',
      content:
        "I noticed that when an item price has three decimal places and GST is applied, the final invoice total sometimes rounds up by ₹0.01 more than expected. This affects about 1 in 50 invoices. I've attached a screenshot of a sample invoice. Is anyone else seeing this?",
      category: 'Bug Reports',
      authorId: 'demo-user-4',
      authorName: 'Suresh Patel',
      tags: ['gst', 'invoice', 'rounding', 'bug'],
    },
    {
      title: 'Low-stock alert emails not sending for some products',
      content:
        "I have configured low-stock alerts for 20 products but only about half of them trigger email notifications when the threshold is hit. The others show the red badge in the dashboard but no email is sent. Running v1.2.1 on the cloud plan.",
      category: 'Bug Reports',
      authorId: 'demo-user-5',
      authorName: 'Meena Nair',
      tags: ['inventory', 'alerts', 'email', 'bug'],
    },
    // How-To
    {
      title: 'How to set up automatic reorder points for fast-moving items',
      content:
        "Setting up reorder points in NexaERP is straightforward once you know where to look. Here's the step-by-step process I use for my pharmacy:\n\n1. Go to Inventory → Products → select a product\n2. Click 'Edit' and scroll to the Stock Settings section\n3. Set the Reorder Point (minimum stock level) and Reorder Quantity\n4. Enable the 'Auto Reorder Alert' toggle\n5. Save\n\nNexaERP will now automatically flag the product when stock dips below your threshold and can generate a purchase order.",
      category: 'How-To',
      authorId: 'demo-user-6',
      authorName: 'Dr. Arjun Mehta',
      tags: ['inventory', 'reorder', 'how-to', 'pharmacy'],
    },
    {
      title: 'Exporting monthly GST reports for CA filing — step by step',
      content:
        "Every month I need to export GSTR-1 data for my CA. Here's how I do it in NexaERP:\n\n1. Navigate to Accounting → Reports → GST Reports\n2. Select the month and financial year\n3. Choose 'GSTR-1 Summary' from the report type dropdown\n4. Click Export → Excel\n5. The downloaded file is already in the format my CA needs\n\nTip: Schedule the report to auto-email your CA on the last day of each month from Settings → Report Schedules.",
      category: 'How-To',
      authorId: 'demo-user-7',
      authorName: 'Kavitha Reddy',
      tags: ['accounting', 'gst', 'reports', 'export', 'how-to'],
    },
    // Announcements
    {
      title: 'NexaERP v1.3 Release — What's New',
      content:
        "We're excited to announce NexaERP v1.3! Here are the highlights:\n\n✅ **Community Forum** — Connect with other users, ask questions, and share best practices\n✅ **Enhanced GST Reporting** — Improved GSTR-1/GSTR-3B export with validation\n✅ **Bulk Import** — Import products, customers, and vendors via Excel/CSV\n✅ **AI Assistant Improvements** — More accurate revenue forecasts and reorder suggestions\n✅ **Mobile App** — PWA improvements for offline POS use\n\nFull changelog available in the Release Notes tab. As always, reach out if you have questions!",
      category: 'Announcements',
      authorId: 'system',
      authorName: 'NexaERP Team',
      tags: ['release', 'v1.3', 'announcement', 'changelog'],
    },
  ];

  const created = await prisma.forumThread.createMany({ data: seeds });

  return { created: created.count };
}
