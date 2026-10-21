/**
 * Help Service
 *
 * Manages context-sensitive help articles keyed by page/module context.
 * Articles can be fetched by their context key (e.g. "inventory.product-create")
 * so that each page in NexaERP can display relevant help content automatically.
 *
 * Requirements: 28.1
 */

import prisma from '../config/prisma';

// ─── Interfaces ─────────────────────────────────────────────────────────────

export interface CreateArticleData {
  title: string;
  slug: string;
  summary?: string;
  content: string;
  contextKey: string;
  category: string;
  tags?: string[];
  relatedArticleIds?: string[];
  isPublished?: boolean;
  tenantId?: string;
  createdBy?: string;
}

export interface UpdateArticleData {
  title?: string;
  slug?: string;
  summary?: string;
  content?: string;
  contextKey?: string;
  category?: string;
  tags?: string[];
  relatedArticleIds?: string[];
  isPublished?: boolean;
  isArchived?: boolean;
  updatedBy?: string;
}

export interface ArticleFilters {
  category?: string;
  tags?: string[];
  isPublished?: boolean;
  isArchived?: boolean;
  tenantId?: string;
  search?: string;
  page?: number;
  pageSize?: number;
}

export interface HelpFeedback {
  helpful: boolean;
}

// ─── Service Functions ──────────────────────────────────────────────────────

/**
 * Retrieve help articles for a specific context key.
 * Returns all published articles matching the exact context key, ordered by
 * view count descending so the most-read article appears first.
 *
 * Requirements: 28.1
 */
export async function getArticlesByContext(
  contextKey: string,
  tenantId?: string
): Promise<object[]> {
  const where: Record<string, unknown> = {
    contextKey,
    isPublished: true,
    isArchived: false,
  };

  if (tenantId) {
    where.tenantId = tenantId;
  }

  const articles = await prisma.helpArticle.findMany({
    where,
    orderBy: { viewCount: 'desc' },
    select: {
      id: true,
      title: true,
      slug: true,
      summary: true,
      content: true,
      contextKey: true,
      category: true,
      tags: true,
      relatedArticleIds: true,
      helpfulCount: true,
      notHelpfulCount: true,
      viewCount: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return articles;
}

/**
 * Retrieve a single published article by its slug.
 * Also increments the view counter.
 *
 * Requirements: 28.1
 */
export async function getArticleBySlug(
  slug: string,
  tenantId?: string
): Promise<object | null> {
  const where: Record<string, unknown> = {
    slug,
    isPublished: true,
    isArchived: false,
  };

  if (tenantId) {
    where.tenantId = tenantId;
  }

  const article = await prisma.helpArticle.findFirst({ where });

  if (!article) {
    return null;
  }

  // Increment view count (fire-and-forget — don't block the response)
  prisma.helpArticle
    .update({
      where: { id: article.id },
      data: { viewCount: { increment: 1 } },
    })
    .catch((err: Error) =>
      console.warn(`[HelpService] Failed to increment view count: ${err.message}`)
    );

  // Resolve related articles if any IDs are stored
  const relatedIds = (article.relatedArticleIds as string[]) ?? [];
  let relatedArticles: object[] = [];

  if (relatedIds.length > 0) {
    relatedArticles = await prisma.helpArticle.findMany({
      where: {
        id: { in: relatedIds },
        isPublished: true,
        isArchived: false,
      },
      select: {
        id: true,
        title: true,
        slug: true,
        summary: true,
        contextKey: true,
        category: true,
        tags: true,
      },
    });
  }

  return { ...article, relatedArticles };
}

/**
 * Get a single article by ID (admin use — not restricted to published).
 *
 * Requirements: 28.1
 */
export async function getArticleById(id: string): Promise<object | null> {
  return prisma.helpArticle.findUnique({ where: { id } });
}

/**
 * List articles with optional filters and pagination.
 * Intended for admin UIs and the documentation portal.
 *
 * Requirements: 28.1, 28.2
 */
export async function listArticles(filters: ArticleFilters = {}): Promise<{
  articles: object[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}> {
  const {
    category,
    tags,
    isPublished,
    isArchived = false,
    tenantId,
    search,
    page = 1,
    pageSize = 20,
  } = filters;

  const where: Record<string, unknown> = { isArchived };

  if (category) where.category = category;
  if (isPublished !== undefined) where.isPublished = isPublished;
  if (tenantId) where.tenantId = tenantId;

  if (tags && tags.length > 0) {
    // Prisma scalar list filter: check that every specified tag is present
    where.tags = { hasSome: tags };
  }

  if (search) {
    where.OR = [
      { title: { contains: search, mode: 'insensitive' } },
      { summary: { contains: search, mode: 'insensitive' } },
      { content: { contains: search, mode: 'insensitive' } },
      { contextKey: { contains: search, mode: 'insensitive' } },
    ];
  }

  const skip = (page - 1) * pageSize;

  const [articles, total] = await Promise.all([
    prisma.helpArticle.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      skip,
      take: pageSize,
      select: {
        id: true,
        title: true,
        slug: true,
        summary: true,
        contextKey: true,
        category: true,
        tags: true,
        isPublished: true,
        isArchived: true,
        helpfulCount: true,
        notHelpfulCount: true,
        viewCount: true,
        createdBy: true,
        createdAt: true,
        updatedAt: true,
      },
    }),
    prisma.helpArticle.count({ where }),
  ]);

  return {
    articles,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}

/**
 * Create a new help article.
 *
 * Requirements: 28.1
 */
export async function createArticle(data: CreateArticleData): Promise<object> {
  const existing = await prisma.helpArticle.findUnique({
    where: { slug: data.slug },
  });

  if (existing) {
    throw new Error(`A help article with slug '${data.slug}' already exists`);
  }

  return prisma.helpArticle.create({
    data: {
      title: data.title,
      slug: data.slug,
      summary: data.summary,
      content: data.content,
      contextKey: data.contextKey,
      category: data.category,
      tags: data.tags ?? [],
      relatedArticleIds: data.relatedArticleIds ?? [],
      isPublished: data.isPublished ?? false,
      tenantId: data.tenantId,
      createdBy: data.createdBy,
    },
  });
}

/**
 * Update an existing help article.
 *
 * Requirements: 28.1
 */
export async function updateArticle(
  id: string,
  data: UpdateArticleData
): Promise<object> {
  const article = await prisma.helpArticle.findUnique({ where: { id } });

  if (!article) {
    throw new Error('Help article not found');
  }

  // If slug is being changed, ensure uniqueness
  if (data.slug && data.slug !== article.slug) {
    const slugConflict = await prisma.helpArticle.findUnique({
      where: { slug: data.slug },
    });
    if (slugConflict) {
      throw new Error(`A help article with slug '${data.slug}' already exists`);
    }
  }

  return prisma.helpArticle.update({
    where: { id },
    data: {
      ...(data.title !== undefined && { title: data.title }),
      ...(data.slug !== undefined && { slug: data.slug }),
      ...(data.summary !== undefined && { summary: data.summary }),
      ...(data.content !== undefined && { content: data.content }),
      ...(data.contextKey !== undefined && { contextKey: data.contextKey }),
      ...(data.category !== undefined && { category: data.category }),
      ...(data.tags !== undefined && { tags: data.tags }),
      ...(data.relatedArticleIds !== undefined && {
        relatedArticleIds: data.relatedArticleIds,
      }),
      ...(data.isPublished !== undefined && { isPublished: data.isPublished }),
      ...(data.isArchived !== undefined && { isArchived: data.isArchived }),
      ...(data.updatedBy !== undefined && { updatedBy: data.updatedBy }),
    },
  });
}

/**
 * Publish a draft article.
 *
 * Requirements: 28.1
 */
export async function publishArticle(id: string, updatedBy?: string): Promise<object> {
  const article = await prisma.helpArticle.findUnique({ where: { id } });

  if (!article) {
    throw new Error('Help article not found');
  }

  return prisma.helpArticle.update({
    where: { id },
    data: { isPublished: true, updatedBy },
  });
}

/**
 * Archive an article (soft delete).
 *
 * Requirements: 28.1
 */
export async function archiveArticle(id: string, updatedBy?: string): Promise<object> {
  const article = await prisma.helpArticle.findUnique({ where: { id } });

  if (!article) {
    throw new Error('Help article not found');
  }

  return prisma.helpArticle.update({
    where: { id },
    data: { isArchived: true, isPublished: false, updatedBy },
  });
}

/**
 * Permanently delete a help article.
 *
 * Requirements: 28.1
 */
export async function deleteArticle(id: string): Promise<void> {
  const article = await prisma.helpArticle.findUnique({ where: { id } });

  if (!article) {
    throw new Error('Help article not found');
  }

  await prisma.helpArticle.delete({ where: { id } });
}

/**
 * Record user feedback (helpful / not helpful) on an article.
 *
 * Requirements: 28.1
 */
export async function recordFeedback(
  id: string,
  feedback: HelpFeedback
): Promise<{ helpfulCount: number; notHelpfulCount: number }> {
  const article = await prisma.helpArticle.findUnique({ where: { id } });

  if (!article) {
    throw new Error('Help article not found');
  }

  const updated = await prisma.helpArticle.update({
    where: { id },
    data: feedback.helpful
      ? { helpfulCount: { increment: 1 } }
      : { notHelpfulCount: { increment: 1 } },
    select: { helpfulCount: true, notHelpfulCount: true },
  });

  return updated;
}

/**
 * Get distinct categories used across all published articles.
 *
 * Requirements: 28.1
 */
export async function getCategories(tenantId?: string): Promise<string[]> {
  const where: Record<string, unknown> = {
    isPublished: true,
    isArchived: false,
  };
  if (tenantId) where.tenantId = tenantId;

  const articles = await prisma.helpArticle.findMany({
    where,
    select: { category: true },
    distinct: ['category'],
    orderBy: { category: 'asc' },
  });

  return articles.map((a: { category: string }) => a.category);
}

export default {
  getArticlesByContext,
  getArticleBySlug,
  getArticleById,
  listArticles,
  createArticle,
  updateArticle,
  publishArticle,
  archiveArticle,
  deleteArticle,
  recordFeedback,
  getCategories,
};
