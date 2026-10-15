/**
 * Healthcare Industry Controller
 * Handles EMR, Appointments, and HIPAA Compliance endpoints
 * Requirements: 17.2, 17.5
 */

import { Request, Response } from 'express';
import healthcareService from '../models/healthcare-industry';

export class HealthcareIndustryController {
  // ─── EMR Endpoints ──────────────────────────────────────────

  async createPatient(req: Request, res: Response): Promise<void> {
    try {
      const patient = await healthcareService.createPatient(req.body);
      res.status(201).json({ success: true, data: patient });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async getPatient(req: Request, res: Response): Promise<void> {
    try {
      const { patientId } = req.params;
      const userId = (req as any).user?.id || 'system';
      const patient = await healthcareService.getPatientById(patientId, userId);
      res.json({ success: true, data: patient });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async updatePatient(req: Request, res: Response): Promise<void> {
    try {
      const { patientId } = req.params;
      const userId = (req as any).user?.id || 'system';
      const patient = await healthcareService.updatePatient(patientId, req.body, userId);
      res.json({ success: true, data: patient });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async addMedicalHistory(req: Request, res: Response): Promise<void> {
    try {
      const history = await healthcareService.addMedicalHistory(req.body);
      res.status(201).json({ success: true, data: history });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async createEncounter(req: Request, res: Response): Promise<void> {
    try {
      const encounter = await healthcareService.createEncounter(req.body);
      res.status(201).json({ success: true, data: encounter });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async createPrescription(req: Request, res: Response): Promise<void> {
    try {
      const prescription = await healthcareService.createPrescription(req.body);
      res.status(201).json({ success: true, data: prescription });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async getPrescriptionHistory(req: Request, res: Response): Promise<void> {
    try {
      const { patientId } = req.params;
      const userId = (req as any).user?.id || 'system';
      const prescriptions = await healthcareService.getPrescriptionHistory(patientId, userId);
      res.json({ success: true, data: prescriptions });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async createLabOrder(req: Request, res: Response): Promise<void> {
    try {
      const labOrder = await healthcareService.createLabOrder(req.body);
      res.status(201).json({ success: true, data: labOrder });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async updateLabResults(req: Request, res: Response): Promise<void> {
    try {
      const { orderId } = req.params;
      const { results } = req.body;
      const labOrder = await healthcareService.updateLabResults(orderId, results);
      res.json({ success: true, data: labOrder });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  // ─── Appointment Endpoints ──────────────────────────────────

  async scheduleAppointment(req: Request, res: Response): Promise<void> {
    try {
      const appointment = await healthcareService.scheduleAppointment(req.body);
      res.status(201).json({ success: true, data: appointment });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async getAvailableSlots(req: Request, res: Response): Promise<void> {
    try {
      const { providerId } = req.params;
      const { date } = req.query;
      const slots = await healthcareService.getAvailableSlots(providerId, new Date(date as string));
      res.json({ success: true, data: slots });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async confirmAppointment(req: Request, res: Response): Promise<void> {
    try {
      const { appointmentId } = req.params;
      const appointment = await healthcareService.confirmAppointment(appointmentId);
      res.json({ success: true, data: appointment });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async cancelAppointment(req: Request, res: Response): Promise<void> {
    try {
      const { appointmentId } = req.params;
      const { reason } = req.body;
      const appointment = await healthcareService.cancelAppointment(appointmentId, reason);
      res.json({ success: true, data: appointment });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async checkInPatient(req: Request, res: Response): Promise<void> {
    try {
      const { appointmentId } = req.params;
      const appointment = await healthcareService.checkInPatient(appointmentId);
      res.json({ success: true, data: appointment });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async sendAppointmentReminder(req: Request, res: Response): Promise<void> {
    try {
      const { appointmentId } = req.params;
      await healthcareService.sendAppointmentReminder(appointmentId);
      res.json({ success: true, message: 'Reminder sent successfully' });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  // ─── Provider Endpoints ─────────────────────────────────────

  async createProvider(req: Request, res: Response): Promise<void> {
    try {
      const provider = await healthcareService.createProvider(req.body);
      res.status(201).json({ success: true, data: provider });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async updateProviderSchedule(req: Request, res: Response): Promise<void> {
    try {
      const { providerId } = req.params;
      const { schedule } = req.body;
      const provider = await healthcareService.updateProviderSchedule(providerId, schedule);
      res.json({ success: true, data: provider });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  // ─── Facility Endpoints ─────────────────────────────────────

  async createFacility(req: Request, res: Response): Promise<void> {
    try {
      const facility = await healthcareService.createFacility(req.body);
      res.status(201).json({ success: true, data: facility });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  // ─── HIPAA Compliance Endpoints ─────────────────────────────

  async createConsent(req: Request, res: Response): Promise<void> {
    try {
      const consent = await healthcareService.createConsent(req.body);
      res.status(201).json({ success: true, data: consent });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async revokeConsent(req: Request, res: Response): Promise<void> {
    try {
      const { consentId } = req.params;
      const consent = await healthcareService.revokeConsent(consentId);
      res.json({ success: true, data: consent });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async reportBreachIncident(req: Request, res: Response): Promise<void> {
    try {
      const incident = await healthcareService.reportBreachIncident(req.body);
      res.status(201).json({ success: true, data: incident });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async getHIPAAComplianceReport(req: Request, res: Response): Promise<void> {
    try {
      const { startDate, endDate } = req.query;
      const report = await healthcareService.getHIPAAComplianceReport(
        new Date(startDate as string),
        new Date(endDate as string)
      );
      res.json({ success: true, data: report });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
}

export default new HealthcareIndustryController();
