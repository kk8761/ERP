/**
 * Industry-Specific Modules Models
 * Type definitions for Manufacturing, Healthcare, and Banking industry modules
 */

import { BaseEntity, BaseEntityData } from './BaseEntity';

// ==================== Manufacturing Industry Models ====================

// Product Lifecycle Management (PLM)
export interface PLMProductData extends BaseEntityData {
  productCode: string;
  productName: string;
  version: string;
  stage: 'concept' | 'design' | 'development' | 'testing' | 'production' | 'end_of_life';
  specifications: Record<string, unknown>;
  documents: string[]; // Document IDs
  changeHistory: PLMChangeRecord[];
  approvalStatus: 'draft' | 'pending_approval' | 'approved' | 'rejected';
  approvedBy?: string;
  approvedDate?: Date;
}

export interface PLMChangeRecord {
  changeNumber: string;
  description: string;
  changedBy: string;
  changedDate: Date;
  reason: string;
}

export class PLMProduct extends BaseEntity implements PLMProductData {
  productCode: string;
  productName: string;
  version: string;
  stage: 'concept' | 'design' | 'development' | 'testing' | 'production' | 'end_of_life';
  specifications: Record<string, unknown>;
  documents: string[];
  changeHistory: PLMChangeRecord[];
  approvalStatus: 'draft' | 'pending_approval' | 'approved' | 'rejected';
  approvedBy?: string;
  approvedDate?: Date;

  constructor(data: PLMProductData) {
    super(data);
    this.productCode = data.productCode;
    this.productName = data.productName;
    this.version = data.version;
    this.stage = data.stage;
    this.specifications = data.specifications;
    this.documents = data.documents;
    this.changeHistory = data.changeHistory;
    this.approvalStatus = data.approvalStatus;
    this.approvedBy = data.approvedBy;
    this.approvedDate = data.approvedDate;
  }

  toJSON(): Record<string, unknown> {
    return {
      ...super.toJSON(),
      productCode: this.productCode,
      productName: this.productName,
      version: this.version,
      stage: this.stage,
      specifications: this.specifications,
      documents: this.documents,
      changeHistory: this.changeHistory,
      approvalStatus: this.approvalStatus,
      approvedBy: this.approvedBy,
      approvedDate: this.approvedDate,
    };
  }
}

// Manufacturing Execution System (MES)
export interface MESOperationData extends BaseEntityData {
  operationNumber: string;
  productionOrderId: string;
  workCenterId: string;
  operationName: string;
  status: 'pending' | 'in_progress' | 'completed' | 'on_hold' | 'cancelled';
  operatorId?: string;
  operatorName?: string;
  startTime?: Date;
  endTime?: Date;
  standardDuration: number; // in minutes
  actualDuration?: number; // in minutes
  efficiency?: number; // percentage
  quantityPlanned: number;
  quantityCompleted: number;
  quantityRejected: number;
  notes?: string;
}

export class MESOperation extends BaseEntity implements MESOperationData {
  operationNumber: string;
  productionOrderId: string;
  workCenterId: string;
  operationName: string;
  status: 'pending' | 'in_progress' | 'completed' | 'on_hold' | 'cancelled';
  operatorId?: string;
  operatorName?: string;
  startTime?: Date;
  endTime?: Date;
  standardDuration: number;
  actualDuration?: number;
  efficiency?: number;
  quantityPlanned: number;
  quantityCompleted: number;
  quantityRejected: number;
  notes?: string;

  constructor(data: MESOperationData) {
    super(data);
    this.operationNumber = data.operationNumber;
    this.productionOrderId = data.productionOrderId;
    this.workCenterId = data.workCenterId;
    this.operationName = data.operationName;
    this.status = data.status;
    this.operatorId = data.operatorId;
    this.operatorName = data.operatorName;
    this.startTime = data.startTime;
    this.endTime = data.endTime;
    this.standardDuration = data.standardDuration;
    this.actualDuration = data.actualDuration;
    this.efficiency = data.efficiency;
    this.quantityPlanned = data.quantityPlanned;
    this.quantityCompleted = data.quantityCompleted;
    this.quantityRejected = data.quantityRejected;
    this.notes = data.notes;
  }

  toJSON(): Record<string, unknown> {
    return {
      ...super.toJSON(),
      operationNumber: this.operationNumber,
      productionOrderId: this.productionOrderId,
      workCenterId: this.workCenterId,
      operationName: this.operationName,
      status: this.status,
      operatorId: this.operatorId,
      operatorName: this.operatorName,
      startTime: this.startTime,
      endTime: this.endTime,
      standardDuration: this.standardDuration,
      actualDuration: this.actualDuration,
      efficiency: this.efficiency,
      quantityPlanned: this.quantityPlanned,
      quantityCompleted: this.quantityCompleted,
      quantityRejected: this.quantityRejected,
      notes: this.notes,
    };
  }
}

// ==================== Healthcare Industry Models ====================

// Electronic Medical Records (EMR)
export interface PatientRecordData extends BaseEntityData {
  patientId: string;
  firstName: string;
  lastName: string;
  dateOfBirth: Date;
  gender: 'male' | 'female' | 'other';
  bloodType?: string;
  allergies: string[];
  chronicConditions: string[];
  emergencyContact: {
    name: string;
    relationship: string;
    phone: string;
  };
  insuranceInfo?: {
    provider: string;
    policyNumber: string;
    groupNumber?: string;
  };
  medicalHistory: MedicalHistoryEntry[];
  prescriptions: Prescription[];
  isActive: boolean;
}

export interface MedicalHistoryEntry {
  date: Date;
  diagnosis: string;
  treatment: string;
  providerId: string;
  providerName: string;
  notes?: string;
}

export interface Prescription {
  prescriptionId: string;
  medication: string;
  dosage: string;
  frequency: string;
  startDate: Date;
  endDate?: Date;
  prescribedBy: string;
  prescribedByName: string;
  refillsRemaining: number;
  status: 'active' | 'completed' | 'cancelled';
}

export class PatientRecord extends BaseEntity implements PatientRecordData {
  patientId: string;
  firstName: string;
  lastName: string;
  dateOfBirth: Date;
  gender: 'male' | 'female' | 'other';
  bloodType?: string;
  allergies: string[];
  chronicConditions: string[];
  emergencyContact: {
    name: string;
    relationship: string;
    phone: string;
  };
  insuranceInfo?: {
    provider: string;
    policyNumber: string;
    groupNumber?: string;
  };
  medicalHistory: MedicalHistoryEntry[];
  prescriptions: Prescription[];
  isActive: boolean;

  constructor(data: PatientRecordData) {
    super(data);
    this.patientId = data.patientId;
    this.firstName = data.firstName;
    this.lastName = data.lastName;
    this.dateOfBirth = data.dateOfBirth;
    this.gender = data.gender;
    this.bloodType = data.bloodType;
    this.allergies = data.allergies;
    this.chronicConditions = data.chronicConditions;
    this.emergencyContact = data.emergencyContact;
    this.insuranceInfo = data.insuranceInfo;
    this.medicalHistory = data.medicalHistory;
    this.prescriptions = data.prescriptions;
    this.isActive = data.isActive;
  }

  get fullName(): string {
    return `${this.firstName} ${this.lastName}`;
  }

  toJSON(): Record<string, unknown> {
    return {
      ...super.toJSON(),
      patientId: this.patientId,
      firstName: this.firstName,
      lastName: this.lastName,
      dateOfBirth: this.dateOfBirth,
      gender: this.gender,
      bloodType: this.bloodType,
      allergies: this.allergies,
      chronicConditions: this.chronicConditions,
      emergencyContact: this.emergencyContact,
      insuranceInfo: this.insuranceInfo,
      medicalHistory: this.medicalHistory,
      prescriptions: this.prescriptions,
      isActive: this.isActive,
    };
  }
}

// Appointment Scheduling
export interface AppointmentData extends BaseEntityData {
  appointmentNumber: string;
  patientId: string;
  patientName: string;
  providerId: string;
  providerName: string;
  appointmentType: 'consultation' | 'follow_up' | 'procedure' | 'emergency';
  scheduledDate: Date;
  duration: number; // in minutes
  status: 'scheduled' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled' | 'no_show';
  reason: string;
  notes?: string;
  checkedInAt?: Date;
  completedAt?: Date;
  cancelledAt?: Date;
  cancellationReason?: string;
}

export class Appointment extends BaseEntity implements AppointmentData {
  appointmentNumber: string;
  patientId: string;
  patientName: string;
  providerId: string;
  providerName: string;
  appointmentType: 'consultation' | 'follow_up' | 'procedure' | 'emergency';
  scheduledDate: Date;
  duration: number;
  status: 'scheduled' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled' | 'no_show';
  reason: string;
  notes?: string;
  checkedInAt?: Date;
  completedAt?: Date;
  cancelledAt?: Date;
  cancellationReason?: string;

  constructor(data: AppointmentData) {
    super(data);
    this.appointmentNumber = data.appointmentNumber;
    this.patientId = data.patientId;
    this.patientName = data.patientName;
    this.providerId = data.providerId;
    this.providerName = data.providerName;
    this.appointmentType = data.appointmentType;
    this.scheduledDate = data.scheduledDate;
    this.duration = data.duration;
    this.status = data.status;
    this.reason = data.reason;
    this.notes = data.notes;
    this.checkedInAt = data.checkedInAt;
    this.completedAt = data.completedAt;
    this.cancelledAt = data.cancelledAt;
    this.cancellationReason = data.cancellationReason;
  }

  toJSON(): Record<string, unknown> {
    return {
      ...super.toJSON(),
      appointmentNumber: this.appointmentNumber,
      patientId: this.patientId,
      patientName: this.patientName,
      providerId: this.providerId,
      providerName: this.providerName,
      appointmentType: this.appointmentType,
      scheduledDate: this.scheduledDate,
      duration: this.duration,
      status: this.status,
      reason: this.reason,
      notes: this.notes,
      checkedInAt: this.checkedInAt,
      completedAt: this.completedAt,
      cancelledAt: this.cancelledAt,
      cancellationReason: this.cancellationReason,
    };
  }
}

// HIPAA Compliance Control
export interface HIPAAAccessLogData extends BaseEntityData {
  patientId: string;
  userId: string;
  userName: string;
  accessType: 'view' | 'create' | 'update' | 'delete' | 'export';
  resourceType: string; // e.g., 'patient_record', 'prescription', 'appointment'
  resourceId: string;
  purpose: string;
  ipAddress: string;
  userAgent: string;
  timestamp: Date;
}

export class HIPAAAccessLog extends BaseEntity implements HIPAAAccessLogData {
  patientId: string;
  userId: string;
  userName: string;
  accessType: 'view' | 'create' | 'update' | 'delete' | 'export';
  resourceType: string;
  resourceId: string;
  purpose: string;
  ipAddress: string;
  userAgent: string;
  timestamp: Date;

  constructor(data: HIPAAAccessLogData) {
    super(data);
    this.patientId = data.patientId;
    this.userId = data.userId;
    this.userName = data.userName;
    this.accessType = data.accessType;
    this.resourceType = data.resourceType;
    this.resourceId = data.resourceId;
    this.purpose = data.purpose;
    this.ipAddress = data.ipAddress;
    this.userAgent = data.userAgent;
    this.timestamp = data.timestamp;
  }

  toJSON(): Record<string, unknown> {
    return {
      ...super.toJSON(),
      patientId: this.patientId,
      userId: this.userId,
      userName: this.userName,
      accessType: this.accessType,
      resourceType: this.resourceType,
      resourceId: this.resourceId,
      purpose: this.purpose,
      ipAddress: this.ipAddress,
      userAgent: this.userAgent,
      timestamp: this.timestamp,
    };
  }
}

// ==================== Banking Industry Models ====================

// Core Banking Account
export interface BankAccountData extends BaseEntityData {
  accountNumber: string;
  accountType: 'savings' | 'checking' | 'fixed_deposit' | 'loan' | 'credit_card';
  customerId: string;
  customerName: string;
  currency: string;
  balance: number;
  availableBalance: number;
  status: 'active' | 'dormant' | 'frozen' | 'closed';
  openedDate: Date;
  closedDate?: Date;
  interestRate?: number;
  minimumBalance?: number;
  kycStatus: 'pending' | 'verified' | 'rejected' | 'expired';
  kycVerifiedDate?: Date;
  kycVerifiedBy?: string;
  amlStatus: 'clear' | 'flagged' | 'under_review' | 'blocked';
  lastAMLCheckDate?: Date;
}

export class BankAccount extends BaseEntity implements BankAccountData {
  accountNumber: string;
  accountType: 'savings' | 'checking' | 'fixed_deposit' | 'loan' | 'credit_card';
  customerId: string;
  customerName: string;
  currency: string;
  balance: number;
  availableBalance: number;
  status: 'active' | 'dormant' | 'frozen' | 'closed';
  openedDate: Date;
  closedDate?: Date;
  interestRate?: number;
  minimumBalance?: number;
  kycStatus: 'pending' | 'verified' | 'rejected' | 'expired';
  kycVerifiedDate?: Date;
  kycVerifiedBy?: string;
  amlStatus: 'clear' | 'flagged' | 'under_review' | 'blocked';
  lastAMLCheckDate?: Date;

  constructor(data: BankAccountData) {
    super(data);
    this.accountNumber = data.accountNumber;
    this.accountType = data.accountType;
    this.customerId = data.customerId;
    this.customerName = data.customerName;
    this.currency = data.currency;
    this.balance = data.balance;
    this.availableBalance = data.availableBalance;
    this.status = data.status;
    this.openedDate = data.openedDate;
    this.closedDate = data.closedDate;
    this.interestRate = data.interestRate;
    this.minimumBalance = data.minimumBalance;
    this.kycStatus = data.kycStatus;
    this.kycVerifiedDate = data.kycVerifiedDate;
    this.kycVerifiedBy = data.kycVerifiedBy;
    this.amlStatus = data.amlStatus;
    this.lastAMLCheckDate = data.lastAMLCheckDate;
  }

  toJSON(): Record<string, unknown> {
    return {
      ...super.toJSON(),
      accountNumber: this.accountNumber,
      accountType: this.accountType,
      customerId: this.customerId,
      customerName: this.customerName,
      currency: this.currency,
      balance: this.balance,
      availableBalance: this.availableBalance,
      status: this.status,
      openedDate: this.openedDate,
      closedDate: this.closedDate,
      interestRate: this.interestRate,
      minimumBalance: this.minimumBalance,
      kycStatus: this.kycStatus,
      kycVerifiedDate: this.kycVerifiedDate,
      kycVerifiedBy: this.kycVerifiedBy,
      amlStatus: this.amlStatus,
      lastAMLCheckDate: this.lastAMLCheckDate,
    };
  }
}

// Loan Management
export interface LoanData extends BaseEntityData {
  loanNumber: string;
  accountId: string;
  customerId: string;
  customerName: string;
  loanType: 'personal' | 'home' | 'auto' | 'business' | 'education';
  principalAmount: number;
  interestRate: number;
  tenure: number; // in months
  emiAmount: number;
  outstandingBalance: number;
  status: 'pending_approval' | 'approved' | 'disbursed' | 'active' | 'closed' | 'defaulted';
  applicationDate: Date;
  approvalDate?: Date;
  disbursementDate?: Date;
  maturityDate?: Date;
  nextEMIDate?: Date;
  collateral?: {
    type: string;
    value: number;
    description: string;
  };
}

export class Loan extends BaseEntity implements LoanData {
  loanNumber: string;
  accountId: string;
  customerId: string;
  customerName: string;
  loanType: 'personal' | 'home' | 'auto' | 'business' | 'education';
  principalAmount: number;
  interestRate: number;
  tenure: number;
  emiAmount: number;
  outstandingBalance: number;
  status: 'pending_approval' | 'approved' | 'disbursed' | 'active' | 'closed' | 'defaulted';
  applicationDate: Date;
  approvalDate?: Date;
  disbursementDate?: Date;
  maturityDate?: Date;
  nextEMIDate?: Date;
  collateral?: {
    type: string;
    value: number;
    description: string;
  };

  constructor(data: LoanData) {
    super(data);
    this.loanNumber = data.loanNumber;
    this.accountId = data.accountId;
    this.customerId = data.customerId;
    this.customerName = data.customerName;
    this.loanType = data.loanType;
    this.principalAmount = data.principalAmount;
    this.interestRate = data.interestRate;
    this.tenure = data.tenure;
    this.emiAmount = data.emiAmount;
    this.outstandingBalance = data.outstandingBalance;
    this.status = data.status;
    this.applicationDate = data.applicationDate;
    this.approvalDate = data.approvalDate;
    this.disbursementDate = data.disbursementDate;
    this.maturityDate = data.maturityDate;
    this.nextEMIDate = data.nextEMIDate;
    this.collateral = data.collateral;
  }

  toJSON(): Record<string, unknown> {
    return {
      ...super.toJSON(),
      loanNumber: this.loanNumber,
      accountId: this.accountId,
      customerId: this.customerId,
      customerName: this.customerName,
      loanType: this.loanType,
      principalAmount: this.principalAmount,
      interestRate: this.interestRate,
      tenure: this.tenure,
      emiAmount: this.emiAmount,
      outstandingBalance: this.outstandingBalance,
      status: this.status,
      applicationDate: this.applicationDate,
      approvalDate: this.approvalDate,
      disbursementDate: this.disbursementDate,
      maturityDate: this.maturityDate,
      nextEMIDate: this.nextEMIDate,
      collateral: this.collateral,
    };
  }
}

// KYC Verification
export interface KYCVerificationData extends BaseEntityData {
  customerId: string;
  customerName: string;
  verificationType: 'individual' | 'business';
  documentType: string; // passport, drivers_license, national_id, etc.
  documentNumber: string;
  documentExpiryDate?: Date;
  documentImages: string[]; // Document IDs
  addressProofType?: string;
  addressProofNumber?: string;
  addressProofImages?: string[];
  status: 'pending' | 'in_review' | 'verified' | 'rejected' | 'expired';
  verifiedBy?: string;
  verifiedDate?: Date;
  rejectionReason?: string;
  expiryDate?: Date;
  riskLevel: 'low' | 'medium' | 'high';
}

export class KYCVerification extends BaseEntity implements KYCVerificationData {
  customerId: string;
  customerName: string;
  verificationType: 'individual' | 'business';
  documentType: string;
  documentNumber: string;
  documentExpiryDate?: Date;
  documentImages: string[];
  addressProofType?: string;
  addressProofNumber?: string;
  addressProofImages?: string[];
  status: 'pending' | 'in_review' | 'verified' | 'rejected' | 'expired';
  verifiedBy?: string;
  verifiedDate?: Date;
  rejectionReason?: string;
  expiryDate?: Date;
  riskLevel: 'low' | 'medium' | 'high';

  constructor(data: KYCVerificationData) {
    super(data);
    this.customerId = data.customerId;
    this.customerName = data.customerName;
    this.verificationType = data.verificationType;
    this.documentType = data.documentType;
    this.documentNumber = data.documentNumber;
    this.documentExpiryDate = data.documentExpiryDate;
    this.documentImages = data.documentImages;
    this.addressProofType = data.addressProofType;
    this.addressProofNumber = data.addressProofNumber;
    this.addressProofImages = data.addressProofImages;
    this.status = data.status;
    this.verifiedBy = data.verifiedBy;
    this.verifiedDate = data.verifiedDate;
    this.rejectionReason = data.rejectionReason;
    this.expiryDate = data.expiryDate;
    this.riskLevel = data.riskLevel;
  }

  toJSON(): Record<string, unknown> {
    return {
      ...super.toJSON(),
      customerId: this.customerId,
      customerName: this.customerName,
      verificationType: this.verificationType,
      documentType: this.documentType,
      documentNumber: this.documentNumber,
      documentExpiryDate: this.documentExpiryDate,
      documentImages: this.documentImages,
      addressProofType: this.addressProofType,
      addressProofNumber: this.addressProofNumber,
      addressProofImages: this.addressProofImages,
      status: this.status,
      verifiedBy: this.verifiedBy,
      verifiedDate: this.verifiedDate,
      rejectionReason: this.rejectionReason,
      expiryDate: this.expiryDate,
      riskLevel: this.riskLevel,
    };
  }
}

// AML Screening
export interface AMLScreeningData extends BaseEntityData {
  screeningNumber: string;
  customerId: string;
  customerName: string;
  accountId?: string;
  transactionId?: string;
  screeningType: 'customer_onboarding' | 'periodic_review' | 'transaction_monitoring';
  watchlistsChecked: string[]; // OFAC, UN, EU, etc.
  matchesFound: AMLMatch[];
  riskScore: number; // 0-100
  status: 'clear' | 'potential_match' | 'confirmed_match' | 'false_positive' | 'under_investigation';
  reviewedBy?: string;
  reviewedDate?: Date;
  resolution?: string;
  notes?: string;
}

export interface AMLMatch {
  watchlistName: string;
  matchedName: string;
  matchScore: number; // 0-100
  matchType: 'exact' | 'fuzzy' | 'phonetic';
  details: Record<string, unknown>;
}

export class AMLScreening extends BaseEntity implements AMLScreeningData {
  screeningNumber: string;
  customerId: string;
  customerName: string;
  accountId?: string;
  transactionId?: string;
  screeningType: 'customer_onboarding' | 'periodic_review' | 'transaction_monitoring';
  watchlistsChecked: string[];
  matchesFound: AMLMatch[];
  riskScore: number;
  status: 'clear' | 'potential_match' | 'confirmed_match' | 'false_positive' | 'under_investigation';
  reviewedBy?: string;
  reviewedDate?: Date;
  resolution?: string;
  notes?: string;

  constructor(data: AMLScreeningData) {
    super(data);
    this.screeningNumber = data.screeningNumber;
    this.customerId = data.customerId;
    this.customerName = data.customerName;
    this.accountId = data.accountId;
    this.transactionId = data.transactionId;
    this.screeningType = data.screeningType;
    this.watchlistsChecked = data.watchlistsChecked;
    this.matchesFound = data.matchesFound;
    this.riskScore = data.riskScore;
    this.status = data.status;
    this.reviewedBy = data.reviewedBy;
    this.reviewedDate = data.reviewedDate;
    this.resolution = data.resolution;
    this.notes = data.notes;
  }

  toJSON(): Record<string, unknown> {
    return {
      ...super.toJSON(),
      screeningNumber: this.screeningNumber,
      customerId: this.customerId,
      customerName: this.customerName,
      accountId: this.accountId,
      transactionId: this.transactionId,
      screeningType: this.screeningType,
      watchlistsChecked: this.watchlistsChecked,
      matchesFound: this.matchesFound,
      riskScore: this.riskScore,
      status: this.status,
      reviewedBy: this.reviewedBy,
      reviewedDate: this.reviewedDate,
      resolution: this.resolution,
      notes: this.notes,
    };
  }
}
