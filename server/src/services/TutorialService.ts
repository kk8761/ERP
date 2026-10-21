/**
 * Tutorial Service
 *
 * Business logic for interactive guided tutorials.
 * Manages tutorial definitions, step data, and per-user progress tracking.
 *
 * Requirements: 28.3
 */

import prisma from '../config/prisma';

// ─── Interfaces ──────────────────────────────────────────────────────────────

export interface CreateTutorialData {
  title: string;
  description?: string;
  slug: string;
  module: string;
  category: string;
  tags?: string[];
  sortOrder?: number;
  isActive?: boolean;
  tenantId?: string;
  createdBy?: string;
  steps?: CreateTutorialStepData[];
}

export interface CreateTutorialStepData {
  stepNumber: number;
  title: string;
  content: string;
  mediaUrl?: string;
  targetSelector?: string;
  placement?: string;
  actionType?: string;
  route?: string;
}

export interface UpdateTutorialData {
  title?: string;
  description?: string;
  slug?: string;
  module?: string;
  category?: string;
  tags?: string[];
  sortOrder?: number;
  isActive?: boolean;
  updatedBy?: string;
}

export interface TutorialFilters {
  module?: string;
  category?: string;
  tags?: string[];
  isActive?: boolean;
  tenantId?: string;
  search?: string;
  page?: number;
  pageSize?: number;
}

export interface TutorialProgressSummary {
  tutorialId: string;
  title: string;
  module: string;
  status: string;
  currentStep: number;
  totalSteps: number;
  completedSteps: number;
  percentComplete: number;
  startedAt: Date | null;
  completedAt: Date | null;
}

// ─── Tutorial CRUD ────────────────────────────────────────────────────────────

/**
 * List tutorials with optional filters.
 * Requirements: 28.3
 */
export async function listTutorials(filters: TutorialFilters = {}): Promise<{
  tutorials: object[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}> {
  const {
    module,
    category,
    isActive = true,
    tenantId,
    search,
    tags,
    page = 1,
    pageSize = 20,
  } = filters;

  const where: Record<string, unknown> = { isActive };

  if (module) where.module = module;
  if (category) where.category = category;
  if (tenantId) where.tenantId = tenantId;

  if (tags && tags.length > 0) {
    where.tags = { hasSome: tags };
  }

  if (search) {
    where.OR = [
      { title: { contains: search, mode: 'insensitive' } },
      { description: { contains: search, mode: 'insensitive' } },
    ];
  }

  const skip = (page - 1) * pageSize;

  const [tutorials, total] = await Promise.all([
    prisma.tutorial.findMany({
      where,
      orderBy: [{ module: 'asc' }, { sortOrder: 'asc' }, { title: 'asc' }],
      skip,
      take: pageSize,
      include: {
        _count: { select: { steps: true, userProgress: true } },
      },
    }),
    prisma.tutorial.count({ where }),
  ]);

  return {
    tutorials,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}

/**
 * Get a single tutorial by ID, including all steps in order.
 * Requirements: 28.3
 */
export async function getTutorialById(id: string): Promise<object | null> {
  const tutorial = await prisma.tutorial.findUnique({
    where: { id },
    include: {
      steps: {
        orderBy: { stepNumber: 'asc' },
      },
      _count: { select: { userProgress: true } },
    },
  });

  return tutorial;
}

/**
 * Get a single tutorial by slug, including all steps.
 * Requirements: 28.3
 */
export async function getTutorialBySlug(slug: string, tenantId?: string): Promise<object | null> {
  const where: Record<string, unknown> = { slug, isActive: true };
  if (tenantId) where.tenantId = tenantId;

  return prisma.tutorial.findFirst({
    where,
    include: {
      steps: {
        orderBy: { stepNumber: 'asc' },
      },
    },
  });
}

/**
 * Get tutorials for a specific module (for the frontend tutorial launcher).
 * Requirements: 28.3
 */
export async function getTutorialsByModule(module: string, tenantId?: string): Promise<object[]> {
  const where: Record<string, unknown> = { module, isActive: true };
  if (tenantId) where.tenantId = tenantId;

  return prisma.tutorial.findMany({
    where,
    orderBy: [{ sortOrder: 'asc' }, { title: 'asc' }],
    include: {
      steps: {
        orderBy: { stepNumber: 'asc' },
      },
      _count: { select: { steps: true } },
    },
  });
}

/**
 * Create a new tutorial (optionally with inline steps).
 * Requirements: 28.3
 */
export async function createTutorial(data: CreateTutorialData): Promise<object> {
  const existing = await prisma.tutorial.findUnique({ where: { slug: data.slug } });
  if (existing) {
    throw new Error(`A tutorial with slug '${data.slug}' already exists`);
  }

  return prisma.tutorial.create({
    data: {
      title: data.title,
      description: data.description,
      slug: data.slug,
      module: data.module,
      category: data.category,
      tags: data.tags ?? [],
      sortOrder: data.sortOrder ?? 0,
      isActive: data.isActive ?? true,
      tenantId: data.tenantId,
      createdBy: data.createdBy,
      steps: data.steps
        ? {
            create: data.steps.map((s) => ({
              stepNumber: s.stepNumber,
              title: s.title,
              content: s.content,
              mediaUrl: s.mediaUrl,
              targetSelector: s.targetSelector,
              placement: s.placement ?? 'bottom',
              actionType: s.actionType,
              route: s.route,
            })),
          }
        : undefined,
    },
    include: {
      steps: { orderBy: { stepNumber: 'asc' } },
    },
  });
}

/**
 * Update tutorial metadata.
 * Requirements: 28.3
 */
export async function updateTutorial(id: string, data: UpdateTutorialData): Promise<object> {
  const tutorial = await prisma.tutorial.findUnique({ where: { id } });
  if (!tutorial) throw new Error('Tutorial not found');

  if (data.slug && data.slug !== tutorial.slug) {
    const conflict = await prisma.tutorial.findUnique({ where: { slug: data.slug } });
    if (conflict) throw new Error(`A tutorial with slug '${data.slug}' already exists`);
  }

  return prisma.tutorial.update({
    where: { id },
    data: {
      ...(data.title !== undefined && { title: data.title }),
      ...(data.description !== undefined && { description: data.description }),
      ...(data.slug !== undefined && { slug: data.slug }),
      ...(data.module !== undefined && { module: data.module }),
      ...(data.category !== undefined && { category: data.category }),
      ...(data.tags !== undefined && { tags: data.tags }),
      ...(data.sortOrder !== undefined && { sortOrder: data.sortOrder }),
      ...(data.isActive !== undefined && { isActive: data.isActive }),
      ...(data.updatedBy !== undefined && { updatedBy: data.updatedBy }),
    },
    include: {
      steps: { orderBy: { stepNumber: 'asc' } },
    },
  });
}

/**
 * Delete a tutorial and all its steps (cascades via Prisma schema).
 * Requirements: 28.3
 */
export async function deleteTutorial(id: string): Promise<void> {
  const tutorial = await prisma.tutorial.findUnique({ where: { id } });
  if (!tutorial) throw new Error('Tutorial not found');

  await prisma.tutorial.delete({ where: { id } });
}

// ─── Step Management ──────────────────────────────────────────────────────────

/**
 * Add or replace all steps for a tutorial.
 * Requirements: 28.3
 */
export async function replaceTutorialSteps(
  tutorialId: string,
  steps: CreateTutorialStepData[]
): Promise<object[]> {
  const tutorial = await prisma.tutorial.findUnique({ where: { id: tutorialId } });
  if (!tutorial) throw new Error('Tutorial not found');

  // Delete all existing steps then re-create
  await prisma.tutorialStep.deleteMany({ where: { tutorialId } });

  await prisma.tutorialStep.createMany({
    data: steps.map((s) => ({
      tutorialId,
      stepNumber: s.stepNumber,
      title: s.title,
      content: s.content,
      mediaUrl: s.mediaUrl,
      targetSelector: s.targetSelector,
      placement: s.placement ?? 'bottom',
      actionType: s.actionType,
      route: s.route,
    })),
  });

  return prisma.tutorialStep.findMany({
    where: { tutorialId },
    orderBy: { stepNumber: 'asc' },
  });
}

// ─── Progress Tracking ────────────────────────────────────────────────────────

/**
 * Start (or resume) a tutorial for a user.
 * Returns the progress record and full tutorial with steps.
 * Requirements: 28.3
 */
export async function startTutorial(
  userId: string,
  tutorialId: string
): Promise<{ progress: object; tutorial: object }> {
  const tutorial = await prisma.tutorial.findUnique({
    where: { id: tutorialId },
    include: { steps: { orderBy: { stepNumber: 'asc' } } },
  });

  if (!tutorial) throw new Error('Tutorial not found');
  if (!tutorial.isActive) throw new Error('Tutorial is not active');

  // Check for an existing progress record so we can preserve startedAt on resume
  const existing = await prisma.userTutorialProgress.findUnique({
    where: { userId_tutorialId: { userId, tutorialId } },
  });

  // Upsert: create if first visit, otherwise update to in_progress (allows resume)
  const progress = await prisma.userTutorialProgress.upsert({
    where: { userId_tutorialId: { userId, tutorialId } },
    update: {
      status: 'in_progress',
      startedAt: existing?.startedAt ?? new Date(),
    },
    create: {
      userId,
      tutorialId,
      status: 'in_progress',
      currentStep: 1,
      startedAt: new Date(),
    },
    include: {
      stepProgresses: true,
    },
  });

  return { progress, tutorial };
}

/**
 * Mark an individual step as completed for a user.
 * Advances currentStep and marks the tutorial complete if all steps are done.
 * Requirements: 28.3
 */
export async function completeStep(
  userId: string,
  tutorialId: string,
  stepId: string
): Promise<object> {
  // Validate tutorial + step
  const step = await prisma.tutorialStep.findFirst({
    where: { id: stepId, tutorialId },
  });
  if (!step) throw new Error('Step not found for this tutorial');

  // Get or create overall progress record
  let progress = await prisma.userTutorialProgress.findUnique({
    where: { userId_tutorialId: { userId, tutorialId } },
    include: { stepProgresses: true },
  });

  if (!progress) {
    // Auto-start if the user jumps directly to a step
    progress = await prisma.userTutorialProgress.create({
      data: {
        userId,
        tutorialId,
        status: 'in_progress',
        currentStep: step.stepNumber,
        startedAt: new Date(),
      },
      include: { stepProgresses: true },
    });
  }

  // Record step completion (upsert to be idempotent)
  await prisma.userTutorialStepProgress.upsert({
    where: { progressId_stepId: { progressId: progress.id, stepId } },
    update: { completedAt: new Date() },
    create: {
      userId,
      progressId: progress.id,
      stepId,
      completedAt: new Date(),
    },
  });

  // Count total steps and completed steps
  const [totalSteps, completedCount] = await Promise.all([
    prisma.tutorialStep.count({ where: { tutorialId } }),
    prisma.userTutorialStepProgress.count({ where: { progressId: progress.id } }),
  ]);

  const allDone = completedCount >= totalSteps;
  const nextStep = Math.min(step.stepNumber + 1, totalSteps);

  const updated = await prisma.userTutorialProgress.update({
    where: { id: progress.id },
    data: {
      currentStep: allDone ? totalSteps : nextStep,
      status: allDone ? 'completed' : 'in_progress',
      completedAt: allDone ? new Date() : null,
    },
    include: { stepProgresses: true },
  });

  return {
    ...updated,
    totalSteps,
    completedSteps: completedCount,
    percentComplete: totalSteps > 0 ? Math.round((completedCount / totalSteps) * 100) : 0,
  };
}

/**
 * Skip (dismiss) a tutorial without completing it.
 * Requirements: 28.3
 */
export async function skipTutorial(userId: string, tutorialId: string): Promise<object> {
  const tutorial = await prisma.tutorial.findUnique({ where: { id: tutorialId } });
  if (!tutorial) throw new Error('Tutorial not found');

  return prisma.userTutorialProgress.upsert({
    where: { userId_tutorialId: { userId, tutorialId } },
    update: { status: 'skipped' },
    create: {
      userId,
      tutorialId,
      status: 'skipped',
      currentStep: 1,
    },
  });
}

/**
 * Get all tutorial progress records for a user.
 * Returns a summary with completion percentages.
 * Requirements: 28.3
 */
export async function getUserProgress(
  userId: string,
  tenantId?: string
): Promise<TutorialProgressSummary[]> {
  const tutorialWhere: Record<string, unknown> = { isActive: true };
  if (tenantId) tutorialWhere.tenantId = tenantId;

  const tutorials = await prisma.tutorial.findMany({
    where: tutorialWhere,
    include: {
      _count: { select: { steps: true } },
      userProgress: {
        where: { userId },
        include: { stepProgresses: true },
      },
    },
    orderBy: [{ module: 'asc' }, { sortOrder: 'asc' }],
  });

  return tutorials.map((t) => {
    const prog = t.userProgress[0] ?? null;
    const totalSteps = t._count.steps;
    const completedSteps = prog?.stepProgresses.length ?? 0;

    return {
      tutorialId: t.id,
      title: t.title,
      module: t.module,
      status: prog?.status ?? 'not_started',
      currentStep: prog?.currentStep ?? 1,
      totalSteps,
      completedSteps,
      percentComplete: totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0,
      startedAt: prog?.startedAt ?? null,
      completedAt: prog?.completedAt ?? null,
    };
  });
}

/**
 * Reset a user's progress for a tutorial (so they can replay it).
 * Requirements: 28.3
 */
export async function resetProgress(userId: string, tutorialId: string): Promise<void> {
  const existing = await prisma.userTutorialProgress.findUnique({
    where: { userId_tutorialId: { userId, tutorialId } },
  });

  if (!existing) return; // Nothing to reset

  // Delete step-level records first, then the progress record
  await prisma.userTutorialStepProgress.deleteMany({ where: { progressId: existing.id } });
  await prisma.userTutorialProgress.delete({ where: { id: existing.id } });
}

export default {
  listTutorials,
  getTutorialById,
  getTutorialBySlug,
  getTutorialsByModule,
  createTutorial,
  updateTutorial,
  deleteTutorial,
  replaceTutorialSteps,
  startTutorial,
  completeStep,
  skipTutorial,
  getUserProgress,
  resetProgress,
};
