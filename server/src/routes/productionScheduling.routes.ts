/**
 * Production Scheduling Optimization Routes (Task 31.7)
 */

import express from 'express';
import * as productionSchedulingController from '../controllers/productionScheduling.controller';

const router = express.Router();

// ============================================================================
// Production Scheduling Routes
// ============================================================================

// Create optimized production schedule
router.post('/schedules/optimize', productionSchedulingController.createOptimizedSchedule);

// Get schedule by ID
router.get('/schedules/:scheduleId', productionSchedulingController.getSchedule);

// Get all schedules
router.get('/schedules', productionSchedulingController.getAllSchedules);

// Activate a schedule
router.post('/schedules/:scheduleId/activate', productionSchedulingController.activateSchedule);

// Complete a schedule
router.post('/schedules/:scheduleId/complete', productionSchedulingController.completeSchedule);

// Compare scheduling algorithms
router.post('/schedules/compare-algorithms', productionSchedulingController.compareAlgorithms);

export default router;
