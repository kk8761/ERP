/**
 * Production Scheduling Optimization Controller (Task 31.7)
 */

import { Request, Response } from 'express';
import { productionSchedulingService } from '../services/productionScheduling.service';
import { SchedulingAlgorithm } from '../models/Industry40';

/**
 * Create optimized production schedule
 */
export const createOptimizedSchedule = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      scheduleName,
      algorithm,
      startDate,
      endDate,
      workCenterIds,
      productionOrderIds,
      constraints,
    } = req.body;

    // Validate required fields
    if (!scheduleName || !algorithm || !startDate || !endDate || !workCenterIds) {
      res.status(400).json({
        error: 'Missing required fields: scheduleName, algorithm, startDate, endDate, workCenterIds',
      });
      return;
    }

    // Validate algorithm
    if (!Object.values(SchedulingAlgorithm).includes(algorithm)) {
      res.status(400).json({
        error: `Invalid algorithm. Must be one of: ${Object.values(SchedulingAlgorithm).join(', ')}`,
      });
      return;
    }

    // Validate work center IDs
    if (!Array.isArray(workCenterIds) || workCenterIds.length === 0) {
      res.status(400).json({
        error: 'workCenterIds must be a non-empty array',
      });
      return;
    }

    const result = await productionSchedulingService.createOptimizedSchedule({
      scheduleName,
      algorithm,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      workCenterIds,
      productionOrderIds,
      constraints,
    });

    res.status(201).json({
      message: 'Production schedule optimized successfully',
      schedule: result.schedule.toJSON(),
      metrics: result.metrics,
      warnings: result.warnings,
      recommendations: result.recommendations,
    });
  } catch (error: any) {
    console.error('Error creating optimized schedule:', error);
    res.status(500).json({
      error: 'Failed to create optimized schedule',
      details: error.message,
    });
  }
};

/**
 * Get schedule by ID
 */
export const getSchedule = async (req: Request, res: Response): Promise<void> => {
  try {
    const { scheduleId } = req.params;

    const schedule = await productionSchedulingService.getSchedule(scheduleId);

    if (!schedule) {
      res.status(404).json({ error: 'Schedule not found' });
      return;
    }

    res.json({
      schedule: schedule.toJSON(),
    });
  } catch (error: any) {
    console.error('Error getting schedule:', error);
    res.status(500).json({
      error: 'Failed to get schedule',
      details: error.message,
    });
  }
};

/**
 * Get all schedules
 */
export const getAllSchedules = async (req: Request, res: Response): Promise<void> => {
  try {
    const { status } = req.query;

    const schedules = await productionSchedulingService.getAllSchedules(
      status as string | undefined
    );

    res.json({
      schedules: schedules.map((s) => s.toJSON()),
      count: schedules.length,
    });
  } catch (error: any) {
    console.error('Error getting schedules:', error);
    res.status(500).json({
      error: 'Failed to get schedules',
      details: error.message,
    });
  }
};

/**
 * Activate a schedule
 */
export const activateSchedule = async (req: Request, res: Response): Promise<void> => {
  try {
    const { scheduleId } = req.params;

    const schedule = await productionSchedulingService.activateSchedule(scheduleId);

    res.json({
      message: 'Schedule activated successfully',
      schedule: schedule.toJSON(),
    });
  } catch (error: any) {
    console.error('Error activating schedule:', error);
    res.status(500).json({
      error: 'Failed to activate schedule',
      details: error.message,
    });
  }
};

/**
 * Complete a schedule
 */
export const completeSchedule = async (req: Request, res: Response): Promise<void> => {
  try {
    const { scheduleId } = req.params;

    const schedule = await productionSchedulingService.completeSchedule(scheduleId);

    res.json({
      message: 'Schedule completed successfully',
      schedule: schedule.toJSON(),
    });
  } catch (error: any) {
    console.error('Error completing schedule:', error);
    res.status(500).json({
      error: 'Failed to complete schedule',
      details: error.message,
    });
  }
};

/**
 * Compare scheduling algorithms
 */
export const compareAlgorithms = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      scheduleName,
      startDate,
      endDate,
      workCenterIds,
      productionOrderIds,
      constraints,
    } = req.body;

    // Validate required fields
    if (!scheduleName || !startDate || !endDate || !workCenterIds) {
      res.status(400).json({
        error: 'Missing required fields: scheduleName, startDate, endDate, workCenterIds',
      });
      return;
    }

    // Run optimization with all algorithms
    const algorithms = Object.values(SchedulingAlgorithm);
    const results = [];

    for (const algorithm of algorithms) {
      try {
        const result = await productionSchedulingService.createOptimizedSchedule({
          scheduleName: `${scheduleName} - ${algorithm}`,
          algorithm,
          startDate: new Date(startDate),
          endDate: new Date(endDate),
          workCenterIds,
          productionOrderIds,
          constraints,
        });

        results.push({
          algorithm,
          metrics: result.metrics,
          warnings: result.warnings,
          recommendations: result.recommendations,
        });
      } catch (error: any) {
        console.error(`Error with algorithm ${algorithm}:`, error);
        results.push({
          algorithm,
          error: error.message,
        });
      }
    }

    res.json({
      message: 'Algorithm comparison completed',
      results,
    });
  } catch (error: any) {
    console.error('Error comparing algorithms:', error);
    res.status(500).json({
      error: 'Failed to compare algorithms',
      details: error.message,
    });
  }
};
