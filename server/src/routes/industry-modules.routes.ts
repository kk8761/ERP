/**
 * Industry-Specific Modules Routes
 * Routes for Manufacturing, Healthcare, and Banking industries
 */

import { Router } from 'express';
import manufacturingController from '../controllers/manufacturing-industry.controller';
import healthcareController from '../controllers/healthcare-industry.controller';
import bankingController from '../controllers/banking-industry.controller';
import paymentController from '../controllers/payment.controller';

const router = Router();

// ═══════════════════════════════════════════════════════════
// MANUFACTURING INDUSTRY ROUTES
// ═══════════════════════════════════════════════════════════

// PLM Routes
router.post('/manufacturing/plm/products', manufacturingController.createPLMProduct.bind(manufacturingController));
router.put('/manufacturing/plm/products/:productId/stage', manufacturingController.updatePLMProductStage.bind(manufacturingController));
router.post('/manufacturing/plm/change-requests', manufacturingController.createChangeRequest.bind(manufacturingController));
router.put('/manufacturing/plm/change-requests/:changeId/approve', manufacturingController.approveChangeRequest.bind(manufacturingController));

// MES Routes
router.post('/manufacturing/mes/work-orders', manufacturingController.createWorkOrder.bind(manufacturingController));
router.post('/manufacturing/mes/work-orders/:workOrderId/start', manufacturingController.startWorkOrder.bind(manufacturingController));
router.post('/manufacturing/mes/work-orders/:workOrderId/complete', manufacturingController.completeWorkOrder.bind(manufacturingController));
router.post('/manufacturing/mes/operations/log', manufacturingController.logOperation.bind(manufacturingController));
router.get('/manufacturing/mes/machines/:machineId/status', manufacturingController.getMachineStatus.bind(manufacturingController));
router.get('/manufacturing/mes/work-centers/:workCenterId/oee', manufacturingController.calculateOEE.bind(manufacturingController));

// QMS Routes
router.post('/manufacturing/qms/inspection-plans', manufacturingController.createInspectionPlan.bind(manufacturingController));
router.post('/manufacturing/qms/inspections', manufacturingController.recordInspection.bind(manufacturingController));
router.post('/manufacturing/qms/non-conformances', manufacturingController.createNonConformance.bind(manufacturingController));
router.post('/manufacturing/qms/capa', manufacturingController.createCAPA.bind(manufacturingController));
router.post('/manufacturing/qms/audits', manufacturingController.scheduleAudit.bind(manufacturingController));
router.get('/manufacturing/qms/metrics', manufacturingController.getQualityMetrics.bind(manufacturingController));

// ═══════════════════════════════════════════════════════════
// HEALTHCARE INDUSTRY ROUTES
// ═══════════════════════════════════════════════════════════

// EMR Routes
router.post('/healthcare/emr/patients', healthcareController.createPatient.bind(healthcareController));
router.get('/healthcare/emr/patients/:patientId', healthcareController.getPatient.bind(healthcareController));
router.put('/healthcare/emr/patients/:patientId', healthcareController.updatePatient.bind(healthcareController));
router.post('/healthcare/emr/medical-history', healthcareController.addMedicalHistory.bind(healthcareController));
router.post('/healthcare/emr/encounters', healthcareController.createEncounter.bind(healthcareController));
router.post('/healthcare/emr/prescriptions', healthcareController.createPrescription.bind(healthcareController));
router.get('/healthcare/emr/patients/:patientId/prescriptions', healthcareController.getPrescriptionHistory.bind(healthcareController));
router.post('/healthcare/emr/lab-orders', healthcareController.createLabOrder.bind(healthcareController));
router.put('/healthcare/emr/lab-orders/:orderId/results', healthcareController.updateLabResults.bind(healthcareController));

// Appointment Routes
router.post('/healthcare/appointments', healthcareController.scheduleAppointment.bind(healthcareController));
router.get('/healthcare/appointments/providers/:providerId/slots', healthcareController.getAvailableSlots.bind(healthcareController));
router.put('/healthcare/appointments/:appointmentId/confirm', healthcareController.confirmAppointment.bind(healthcareController));
router.put('/healthcare/appointments/:appointmentId/cancel', healthcareController.cancelAppointment.bind(healthcareController));
router.put('/healthcare/appointments/:appointmentId/check-in', healthcareController.checkInPatient.bind(healthcareController));
router.post('/healthcare/appointments/:appointmentId/reminder', healthcareController.sendAppointmentReminder.bind(healthcareController));

// Provider Routes
router.post('/healthcare/providers', healthcareController.createProvider.bind(healthcareController));
router.put('/healthcare/providers/:providerId/schedule', healthcareController.updateProviderSchedule.bind(healthcareController));

// Facility Routes
router.post('/healthcare/facilities', healthcareController.createFacility.bind(healthcareController));

// HIPAA Compliance Routes
router.post('/healthcare/hipaa/consents', healthcareController.createConsent.bind(healthcareController));
router.put('/healthcare/hipaa/consents/:consentId/revoke', healthcareController.revokeConsent.bind(healthcareController));
router.post('/healthcare/hipaa/breach-incidents', healthcareController.reportBreachIncident.bind(healthcareController));
router.get('/healthcare/hipaa/compliance-report', healthcareController.getHIPAAComplianceReport.bind(healthcareController));

// ═══════════════════════════════════════════════════════════
// BANKING INDUSTRY ROUTES
// ═══════════════════════════════════════════════════════════

// Core Banking Routes
router.post('/banking/accounts', bankingController.createAccount.bind(bankingController));
router.get('/banking/accounts/:accountId/balance', bankingController.getAccountBalance.bind(bankingController));
router.post('/banking/transactions', bankingController.processTransaction.bind(bankingController));
router.post('/banking/transfers', bankingController.transferFunds.bind(bankingController));
router.get('/banking/accounts/:accountId/statement', bankingController.getAccountStatement.bind(bankingController));

// Loan Management Routes
router.post('/banking/loans/applications', bankingController.createLoanApplication.bind(bankingController));
router.post('/banking/loans/applications/:applicationId/approve', bankingController.approveLoan.bind(bankingController));
router.post('/banking/loans/:loanId/disburse', bankingController.disburseLoan.bind(bankingController));
router.get('/banking/loans/calculate-emi', bankingController.calculateEMI.bind(bankingController));
router.get('/banking/loans/:loanId/repayment-schedule', bankingController.getRepaymentSchedule.bind(bankingController));
router.post('/banking/loans/:loanId/payments', bankingController.recordLoanPayment.bind(bankingController));
router.get('/banking/loans/:loanId/status', bankingController.getLoanStatus.bind(bankingController));

// KYC Routes
router.post('/banking/kyc/initiate', bankingController.initiateKYC.bind(bankingController));
router.post('/banking/kyc/:kycId/documents', bankingController.uploadKYCDocument.bind(bankingController));
router.post('/banking/kyc/:kycId/verify-identity', bankingController.verifyIdentity.bind(bankingController));
router.post('/banking/kyc/:kycId/verify-address', bankingController.verifyAddress.bind(bankingController));
router.get('/banking/kyc/customers/:customerId/risk-assessment', bankingController.assessRisk.bind(bankingController));
router.post('/banking/kyc/:kycId/complete', bankingController.completeKYC.bind(bankingController));

// AML Routes
router.post('/banking/aml/screen-customer', bankingController.screenCustomer.bind(bankingController));
router.get('/banking/aml/watchlist-check', bankingController.checkWatchlist.bind(bankingController));
router.post('/banking/aml/suspicious-activity', bankingController.reportSuspiciousActivity.bind(bankingController));
router.get('/banking/aml/customers/:customerId/pep-screening', bankingController.screenPEP.bind(bankingController));
router.get('/banking/aml/compliance-report', bankingController.getAMLComplianceReport.bind(bankingController));

// ═══════════════════════════════════════════════════════════
// PAYMENT GATEWAY ROUTES (Razorpay)
// ═══════════════════════════════════════════════════════════

// Payment Routes
router.post('/payments/orders', paymentController.createOrder.bind(paymentController));
router.post('/payments/verify', paymentController.verifyPayment.bind(paymentController));
router.post('/payments/capture', paymentController.capturePayment.bind(paymentController));
router.post('/payments/refund', paymentController.refundPayment.bind(paymentController));
router.get('/payments/:paymentId', paymentController.getPayment.bind(paymentController));

// Coupon Routes
router.post('/payments/coupons', paymentController.createCoupon.bind(paymentController));
router.post('/payments/coupons/apply', paymentController.applyCoupon.bind(paymentController));
router.get('/payments/coupons/active', paymentController.getActiveCoupons.bind(paymentController));
router.put('/payments/coupons/:couponId/deactivate', paymentController.deactivateCoupon.bind(paymentController));
router.get('/payments/coupons/:couponId/usage', paymentController.getCouponUsageHistory.bind(paymentController));

// Combined Payment with Coupon
router.post('/payments/process-with-coupon', paymentController.processPaymentWithCoupon.bind(paymentController));

export default router;
