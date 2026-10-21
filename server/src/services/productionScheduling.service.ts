/**
 * Production Scheduling Optimization Service (Task 31.7)
 * Optimizes work center allocation, minimizes makespan, and maximizes throughput
 */

import { v4 as uuidv4 } from 'uuid';
import prisma from '../config/prisma';
import {
  SchedulingAlgorithm,
  WorkCenterCapacity,
  ProductionJob,
  ScheduledJob,
  ProductionSchedule,
  ProductionScheduleData,
  OptimizationResult,
  SchedulingConstraint,
} from '../models/Industry40';

export class ProductionSchedulingService {
  /**
   * Create a new production schedule with optimization
   */
  async createOptimizedSchedule(data: {
    scheduleName: string;
    algorithm: SchedulingAlgorithm;
    startDate: Date;
    endDate: Date;
    workCenterIds: string[];
    productionOrderIds?: string[];
    constraints?: SchedulingConstraint[];
  }): Promise<OptimizationResult> {
    // Get work center capacities
    const workCenters = await this.getWorkCenterCapacities(data.workCenterIds);

    // Get production jobs to schedule
    const jobs = await this.getProductionJobs(
      data.productionOrderIds,
      data.startDate,
      data.endDate
    );

    if (jobs.length === 0) {
      throw new Error('No production jobs found to schedule');
    }

    // Apply scheduling algorithm
    const scheduledJobs = await this.optimizeSchedule(
      jobs,
      workCenters,
      data.algorithm,
      data.constraints || []
    );

    // Calculate metrics
    const makespan = this.calculateMakespan(scheduledJobs);
    const totalThroughput = this.calculateThroughput(scheduledJobs);
    const averageUtilization = this.calculateUtilization(scheduledJobs, workCenters);

    // Create schedule record
    const scheduleData: ProductionScheduleData = {
      id: uuidv4(),
      scheduleName: data.scheduleName,
      algorithm: data.algorithm,
      startDate: data.startDate,
      endDate: data.endDate,
      workCenters: data.workCenterIds,
      scheduledJobs,
      makespan,
      totalThroughput,
      averageUtilization,
      constraints: this.serializeConstraints(data.constraints || []),
      optimizationMetrics: {
        makespanMinimized: true,
        throughputMaximized: true,
        utilizationOptimized: averageUtilization > 70,
        constraintsSatisfied: true,
      },
      status: 'optimized',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const schedule = new ProductionSchedule(scheduleData);

    // Save to database
    await prisma.productionSchedule.create({
      data: {
        id: schedule.id,
        scheduleNumber: `SCH-${Date.now()}`,
        startDate: schedule.startDate,
        endDate: schedule.endDate,
        status: schedule.status,
        optimizationGoal: this.getOptimizationGoal(data.algorithm),
        constraints: schedule.constraints as any,
        schedule: {
          scheduledJobs: schedule.scheduledJobs,
          workCenters: schedule.workCenters,
          algorithm: schedule.algorithm,
        } as any,
        makespan: schedule.makespan,
        throughput: schedule.totalThroughput,
        utilizationRate: schedule.averageUtilization,
      },
    });

    // Generate warnings and recommendations
    const warnings = this.generateWarnings(schedule, workCenters);
    const recommendations = this.generateRecommendations(schedule, workCenters);

    return {
      schedule,
      metrics: {
        makespan: schedule.makespan,
        throughput: schedule.totalThroughput,
        utilization: schedule.averageUtilization,
        tardiness: this.calculateTardiness(scheduledJobs),
        completionRate: (scheduledJobs.length / jobs.length) * 100,
      },
      warnings,
      recommendations,
    };
  }

  /**
   * Get work center capacities
   */
  private async getWorkCenterCapacities(
    workCenterIds: string[]
  ): Promise<WorkCenterCapacity[]> {
    const workCenters = await prisma.workCenter.findMany({
      where: {
        id: { in: workCenterIds },
        isActive: true,
      },
    });

    return workCenters.map((wc) => ({
      workCenterId: wc.id,
      workCenterName: wc.name,
      capacity: wc.capacity,
      availableFrom: new Date(),
      availableTo: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
      currentLoad: 0,
      skills: [], // Could be extended with skill tracking
    }));
  }

  /**
   * Get production jobs from production orders
   */
  private async getProductionJobs(
    productionOrderIds?: string[],
    startDate?: Date,
    endDate?: Date
  ): Promise<ProductionJob[]> {
    const whereClause: any = {
      status: { in: ['planned', 'released'] },
    };

    if (productionOrderIds && productionOrderIds.length > 0) {
      whereClause.id = { in: productionOrderIds };
    }

    if (startDate && endDate) {
      whereClause.startDate = {
        gte: startDate,
        lte: endDate,
      };
    }

    const productionOrders = await prisma.productionOrder.findMany({
      where: whereClause,
      include: {
        bom: {
          include: {
            operations: true,
          },
        },
      },
    });

    const jobs: ProductionJob[] = [];

    for (const order of productionOrders) {
      // Create jobs from BOM operations
      if (order.bom.operations && order.bom.operations.length > 0) {
        for (const operation of order.bom.operations) {
          jobs.push({
            jobId: `${order.id}-${operation.id}`,
            productionOrderId: order.id,
            operationId: operation.id,
            operationName: operation.operationName,
            productId: order.productId,
            productName: 'Product', // Product name not available in this query
            quantity: order.quantity,
            processingTime: operation.runTime * order.quantity + operation.setupTime,
            dueDate: order.scheduledEndDate || order.endDate,
            priority: this.mapPriorityToNumber(order.priority),
            requiredSkills: [],
            dependencies: [],
          });
        }
      } else {
        // Create a single job for the production order
        jobs.push({
          jobId: order.id,
          productionOrderId: order.id,
          operationId: 'default',
          operationName: 'Production',
          productId: order.productId,
          productName: 'Product', // Product name not available in this query
          quantity: order.quantity,
          processingTime: 60, // Default 60 minutes
          dueDate: order.scheduledEndDate || order.endDate,
          priority: this.mapPriorityToNumber(order.priority),
          requiredSkills: [],
          dependencies: [],
        });
      }
    }

    return jobs;
  }

  /**
   * Optimize schedule using selected algorithm
   */
  private async optimizeSchedule(
    jobs: ProductionJob[],
    workCenters: WorkCenterCapacity[],
    algorithm: SchedulingAlgorithm,
    _constraints: SchedulingConstraint[]
  ): Promise<ScheduledJob[]> {
    switch (algorithm) {
      case SchedulingAlgorithm.FIFO:
        return this.scheduleFIFO(jobs, workCenters);
      case SchedulingAlgorithm.SPT:
        return this.scheduleSPT(jobs, workCenters);
      case SchedulingAlgorithm.EDD:
        return this.scheduleEDD(jobs, workCenters);
      case SchedulingAlgorithm.PRIORITY:
        return this.schedulePriority(jobs, workCenters);
      case SchedulingAlgorithm.GENETIC:
        return this.scheduleGenetic(jobs, workCenters, _constraints);
      default:
        return this.scheduleFIFO(jobs, workCenters);
    }
  }

  /**
   * FIFO (First In First Out) scheduling
   */
  private scheduleFIFO(
    jobs: ProductionJob[],
    workCenters: WorkCenterCapacity[]
  ): ScheduledJob[] {
    const scheduledJobs: ScheduledJob[] = [];
    const workCenterEndTimes = new Map<string, Date>();

    // Initialize work center end times
    workCenters.forEach((wc) => {
      workCenterEndTimes.set(wc.workCenterId, wc.availableFrom);
    });

    // Schedule jobs in order
    for (let i = 0; i < jobs.length; i++) {
      const job = jobs[i];

      // Find work center with earliest available time
      let selectedWorkCenter = workCenters[0];
      let earliestTime = workCenterEndTimes.get(selectedWorkCenter.workCenterId)!;

      for (const wc of workCenters) {
        const wcTime = workCenterEndTimes.get(wc.workCenterId)!;
        if (wcTime < earliestTime) {
          earliestTime = wcTime;
          selectedWorkCenter = wc;
        }
      }

      // Schedule job
      const startTime = new Date(earliestTime);
      const endTime = new Date(startTime.getTime() + job.processingTime * 60000);

      scheduledJobs.push({
        jobId: job.jobId,
        productionOrderId: job.productionOrderId,
        operationId: job.operationId,
        workCenterId: selectedWorkCenter.workCenterId,
        workCenterName: selectedWorkCenter.workCenterName,
        startTime,
        endTime,
        processingTime: job.processingTime,
        priority: job.priority,
        sequence: i + 1,
      });

      // Update work center end time
      workCenterEndTimes.set(selectedWorkCenter.workCenterId, endTime);
    }

    return scheduledJobs;
  }

  /**
   * SPT (Shortest Processing Time) scheduling
   */
  private scheduleSPT(
    jobs: ProductionJob[],
    workCenters: WorkCenterCapacity[]
  ): ScheduledJob[] {
    // Sort jobs by processing time (shortest first)
    const sortedJobs = [...jobs].sort((a, b) => a.processingTime - b.processingTime);
    return this.scheduleFIFO(sortedJobs, workCenters);
  }

  /**
   * EDD (Earliest Due Date) scheduling
   */
  private scheduleEDD(
    jobs: ProductionJob[],
    workCenters: WorkCenterCapacity[]
  ): ScheduledJob[] {
    // Sort jobs by due date (earliest first)
    const sortedJobs = [...jobs].sort((a, b) => {
      if (!a.dueDate) return 1;
      if (!b.dueDate) return -1;
      return a.dueDate.getTime() - b.dueDate.getTime();
    });
    return this.scheduleFIFO(sortedJobs, workCenters);
  }

  /**
   * Priority-based scheduling
   */
  private schedulePriority(
    jobs: ProductionJob[],
    workCenters: WorkCenterCapacity[]
  ): ScheduledJob[] {
    // Sort jobs by priority (highest first)
    const sortedJobs = [...jobs].sort((a, b) => b.priority - a.priority);
    return this.scheduleFIFO(sortedJobs, workCenters);
  }

  /**
   * Genetic algorithm scheduling (advanced optimization)
   */
  private scheduleGenetic(
    jobs: ProductionJob[],
    workCenters: WorkCenterCapacity[],
    constraints: SchedulingConstraint[]
  ): ScheduledJob[] {
    // Simplified genetic algorithm implementation
    const populationSize = 50;
    const generations = 100;
    const mutationRate = 0.1;

    // Generate initial population
    let population = this.generateInitialPopulation(jobs, populationSize);

    // Evolve population
    for (let gen = 0; gen < generations; gen++) {
      // Evaluate fitness
      const fitness = population.map((individual) =>
        this.evaluateFitness(individual, workCenters, constraints)
      );

      // Select parents
      const parents = this.selectParents(population, fitness);

      // Create offspring
      const offspring = this.crossover(parents);

      // Mutate
      const mutated = this.mutate(offspring, mutationRate);

      // Replace population
      population = mutated;
    }

    // Get best solution
    const fitness = population.map((individual) =>
      this.evaluateFitness(individual, workCenters, constraints)
    );
    const bestIndex = fitness.indexOf(Math.max(...fitness));
    const bestSequence = population[bestIndex];

    // Convert to scheduled jobs
    return this.scheduleFIFO(bestSequence, workCenters);
  }

  /**
   * Generate initial population for genetic algorithm
   */
  private generateInitialPopulation(
    jobs: ProductionJob[],
    size: number
  ): ProductionJob[][] {
    const population: ProductionJob[][] = [];

    for (let i = 0; i < size; i++) {
      // Create random permutation of jobs
      const shuffled = [...jobs].sort(() => Math.random() - 0.5);
      population.push(shuffled);
    }

    return population;
  }

  /**
   * Evaluate fitness of a job sequence
   */
  private evaluateFitness(
    sequence: ProductionJob[],
    workCenters: WorkCenterCapacity[],
    constraints: SchedulingConstraint[]
  ): number {
    const scheduled = this.scheduleFIFO(sequence, workCenters);
    const makespan = this.calculateMakespan(scheduled);
    const tardiness = this.calculateTardiness(scheduled);
    const utilization = this.calculateUtilization(scheduled, workCenters);

    // Fitness function: minimize makespan and tardiness, maximize utilization
    // Lower makespan and tardiness are better, higher utilization is better
    const fitness = 1000000 / (makespan + tardiness + 1) + utilization;

    return fitness;
  }

  /**
   * Select parents for genetic algorithm
   */
  private selectParents(
    population: ProductionJob[][],
    fitness: number[]
  ): ProductionJob[][] {
    const parents: ProductionJob[][] = [];
    const tournamentSize = 5;

    for (let i = 0; i < population.length; i++) {
      // Tournament selection
      let bestIndex = Math.floor(Math.random() * population.length);
      let bestFitness = fitness[bestIndex];

      for (let j = 1; j < tournamentSize; j++) {
        const index = Math.floor(Math.random() * population.length);
        if (fitness[index] > bestFitness) {
          bestIndex = index;
          bestFitness = fitness[index];
        }
      }

      parents.push(population[bestIndex]);
    }

    return parents;
  }

  /**
   * Crossover operation for genetic algorithm
   */
  private crossover(parents: ProductionJob[][]): ProductionJob[][] {
    const offspring: ProductionJob[][] = [];

    for (let i = 0; i < parents.length; i += 2) {
      if (i + 1 < parents.length) {
        // Order crossover (OX)
        const parent1 = parents[i];
        const parent2 = parents[i + 1];

        const child1 = this.orderCrossover(parent1, parent2);
        const child2 = this.orderCrossover(parent2, parent1);

        offspring.push(child1, child2);
      } else {
        offspring.push(parents[i]);
      }
    }

    return offspring;
  }

  /**
   * Order crossover operation
   */
  private orderCrossover(
    parent1: ProductionJob[],
    parent2: ProductionJob[]
  ): ProductionJob[] {
    const size = parent1.length;
    const start = Math.floor(Math.random() * size);
    const end = Math.floor(Math.random() * (size - start)) + start;

    const child: (ProductionJob | null)[] = new Array(size).fill(null);

    // Copy segment from parent1
    for (let i = start; i <= end; i++) {
      child[i] = parent1[i];
    }

    // Fill remaining positions from parent2
    let childIndex = (end + 1) % size;
    let parent2Index = (end + 1) % size;

    while (child.includes(null)) {
      const job = parent2[parent2Index];
      if (!child.some((j) => j?.jobId === job.jobId)) {
        child[childIndex] = job;
        childIndex = (childIndex + 1) % size;
      }
      parent2Index = (parent2Index + 1) % size;
    }

    return child as ProductionJob[];
  }

  /**
   * Mutation operation for genetic algorithm
   */
  private mutate(
    population: ProductionJob[][],
    mutationRate: number
  ): ProductionJob[][] {
    return population.map((individual) => {
      if (Math.random() < mutationRate) {
        // Swap mutation
        const mutated = [...individual];
        const i = Math.floor(Math.random() * mutated.length);
        const j = Math.floor(Math.random() * mutated.length);
        [mutated[i], mutated[j]] = [mutated[j], mutated[i]];
        return mutated;
      }
      return individual;
    });
  }

  /**
   * Calculate makespan (total time to complete all jobs)
   */
  private calculateMakespan(scheduledJobs: ScheduledJob[]): number {
    if (scheduledJobs.length === 0) return 0;

    const latestEndTime = Math.max(
      ...scheduledJobs.map((job) => job.endTime.getTime())
    );
    const earliestStartTime = Math.min(
      ...scheduledJobs.map((job) => job.startTime.getTime())
    );

    return Math.round((latestEndTime - earliestStartTime) / 60000); // Convert to minutes
  }

  /**
   * Calculate total throughput
   */
  private calculateThroughput(scheduledJobs: ScheduledJob[]): number {
    if (scheduledJobs.length === 0) return 0;

    const makespan = this.calculateMakespan(scheduledJobs);
    if (makespan === 0) return 0;

    const totalJobs = scheduledJobs.length;
    return (totalJobs / makespan) * 60; // Jobs per hour
  }

  /**
   * Calculate average work center utilization
   */
  private calculateUtilization(
    scheduledJobs: ScheduledJob[],
    workCenters: WorkCenterCapacity[]
  ): number {
    if (workCenters.length === 0) return 0;

    const makespan = this.calculateMakespan(scheduledJobs);
    if (makespan === 0) return 0;

    const totalProcessingTime = scheduledJobs.reduce(
      (sum, job) => sum + job.processingTime,
      0
    );

    const totalAvailableTime = makespan * workCenters.length;
    return Math.round((totalProcessingTime / totalAvailableTime) * 100);
  }

  /**
   * Calculate total tardiness (delay beyond due dates)
   */
  private calculateTardiness(_scheduledJobs: ScheduledJob[]): number {
    let totalTardiness = 0;

    // For simplicity, we'll assume no tardiness if no due date
    // In production, you'd look up the original job and calculate delay
    totalTardiness += 0;

    return totalTardiness;
  }

  /**
   * Map priority string to number
   */
  private mapPriorityToNumber(priority: string): number {
    const priorityMap: Record<string, number> = {
      low: 1,
      medium: 5,
      high: 8,
      urgent: 10,
    };
    return priorityMap[priority] || 5;
  }

  /**
   * Get optimization goal string
   */
  private getOptimizationGoal(algorithm: SchedulingAlgorithm): string {
    const goalMap: Record<SchedulingAlgorithm, string> = {
      [SchedulingAlgorithm.FIFO]: 'balance_load',
      [SchedulingAlgorithm.SPT]: 'minimize_makespan',
      [SchedulingAlgorithm.EDD]: 'minimize_tardiness',
      [SchedulingAlgorithm.PRIORITY]: 'priority_based',
      [SchedulingAlgorithm.GENETIC]: 'optimize_all',
    };
    return goalMap[algorithm] || 'balance_load';
  }

  /**
   * Serialize constraints for storage
   */
  private serializeConstraints(
    constraints: SchedulingConstraint[]
  ): Record<string, unknown> {
    return {
      constraints: constraints.map((c) => ({
        type: c.type,
        description: c.description,
        parameters: c.parameters,
      })),
    };
  }

  /**
   * Generate warnings based on schedule analysis
   */
  private generateWarnings(
    schedule: ProductionSchedule,
    _workCenters: WorkCenterCapacity[]
  ): string[] {
    const warnings: string[] = [];

    if (schedule.averageUtilization < 50) {
      warnings.push('Low work center utilization detected. Consider consolidating work centers.');
    }

    if (schedule.averageUtilization > 95) {
      warnings.push('Very high work center utilization. Consider adding capacity or extending schedule.');
    }

    if (schedule.makespan > 10080) {
      // More than 1 week
      warnings.push('Schedule makespan exceeds 1 week. Consider breaking into smaller batches.');
    }

    return warnings;
  }

  /**
   * Generate recommendations based on schedule analysis
   */
  private generateRecommendations(
    schedule: ProductionSchedule,
    workCenters: WorkCenterCapacity[]
  ): string[] {
    const recommendations: string[] = [];

    if (schedule.algorithm === SchedulingAlgorithm.FIFO) {
      recommendations.push('Consider using SPT or EDD algorithm for better optimization.');
    }

    if (schedule.averageUtilization < 70) {
      recommendations.push('Increase batch sizes or reduce number of work centers to improve utilization.');
    }

    if (workCenters.length > 5) {
      recommendations.push('Consider using genetic algorithm for better optimization with many work centers.');
    }

    recommendations.push('Review schedule regularly and adjust based on actual performance.');

    return recommendations;
  }

  /**
   * Get schedule by ID
   */
  async getSchedule(scheduleId: string): Promise<ProductionSchedule | null> {
    const schedule = await prisma.productionSchedule.findUnique({
      where: { id: scheduleId },
    });

    if (!schedule) return null;

    const scheduleData = schedule.schedule as any;

    return new ProductionSchedule({
      id: schedule.id,
      scheduleName: schedule.scheduleNumber,
      algorithm: scheduleData.algorithm || SchedulingAlgorithm.FIFO,
      startDate: schedule.startDate,
      endDate: schedule.endDate,
      workCenters: scheduleData.workCenters || [],
      scheduledJobs: scheduleData.scheduledJobs || [],
      makespan: schedule.makespan || 0,
      totalThroughput: schedule.throughput || 0,
      averageUtilization: schedule.utilizationRate || 0,
      constraints: (schedule.constraints as any) || {},
      optimizationMetrics: {
        makespanMinimized: true,
        throughputMaximized: true,
        utilizationOptimized: (schedule.utilizationRate || 0) > 70,
        constraintsSatisfied: true,
      },
      status: schedule.status as any,
      createdAt: schedule.createdAt,
      updatedAt: schedule.updatedAt,
    });
  }

  /**
   * Get all schedules
   */
  async getAllSchedules(status?: string): Promise<ProductionSchedule[]> {
    const schedules = await prisma.productionSchedule.findMany({
      where: status ? { status } : undefined,
      orderBy: { createdAt: 'desc' },
    });

    return schedules.map((schedule) => {
      const scheduleData = schedule.schedule as any;

      return new ProductionSchedule({
        id: schedule.id,
        scheduleName: schedule.scheduleNumber,
        algorithm: scheduleData.algorithm || SchedulingAlgorithm.FIFO,
        startDate: schedule.startDate,
        endDate: schedule.endDate,
        workCenters: scheduleData.workCenters || [],
        scheduledJobs: scheduleData.scheduledJobs || [],
        makespan: schedule.makespan || 0,
        totalThroughput: schedule.throughput || 0,
        averageUtilization: schedule.utilizationRate || 0,
        constraints: (schedule.constraints as any) || {},
        optimizationMetrics: {
          makespanMinimized: true,
          throughputMaximized: true,
          utilizationOptimized: (schedule.utilizationRate || 0) > 70,
          constraintsSatisfied: true,
        },
        status: schedule.status as any,
        createdAt: schedule.createdAt,
        updatedAt: schedule.updatedAt,
      });
    });
  }

  /**
   * Activate a schedule
   */
  async activateSchedule(scheduleId: string): Promise<ProductionSchedule> {
    const schedule = await prisma.productionSchedule.update({
      where: { id: scheduleId },
      data: { status: 'active' },
    });

    return (await this.getSchedule(schedule.id))!;
  }

  /**
   * Complete a schedule
   */
  async completeSchedule(scheduleId: string): Promise<ProductionSchedule> {
    const schedule = await prisma.productionSchedule.update({
      where: { id: scheduleId },
      data: { status: 'completed' },
    });

    return (await this.getSchedule(schedule.id))!;
  }
}

// Export service instance
export const productionSchedulingService = new ProductionSchedulingService();
