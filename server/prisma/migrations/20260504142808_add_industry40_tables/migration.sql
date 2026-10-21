-- AlterTable
ALTER TABLE "Employee" ADD COLUMN     "email" VARCHAR(255),
ADD COLUMN     "employmentType" VARCHAR(50) NOT NULL DEFAULT 'full_time',
ADD COLUMN     "managerId" TEXT,
ADD COLUMN     "phone" VARCHAR(50),
ADD COLUMN     "skills" JSONB;

-- CreateTable
CREATE TABLE "InspectionPlan" (
    "id" TEXT NOT NULL,
    "planNumber" VARCHAR(100) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "productId" TEXT,
    "inspectionType" VARCHAR(50) NOT NULL DEFAULT 'receiving',
    "samplingType" VARCHAR(50) NOT NULL DEFAULT 'none',
    "sampleSize" INTEGER,
    "samplePercentage" DOUBLE PRECISION,
    "acceptanceLevel" DOUBLE PRECISION,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InspectionPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InspectionCheckpoint" (
    "id" TEXT NOT NULL,
    "inspectionPlanId" TEXT NOT NULL,
    "checkpointNumber" INTEGER NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "checkType" VARCHAR(50) NOT NULL DEFAULT 'visual',
    "measurementUnit" VARCHAR(50),
    "targetValue" DOUBLE PRECISION,
    "minValue" DOUBLE PRECISION,
    "maxValue" DOUBLE PRECISION,
    "isMandatory" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InspectionCheckpoint_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InspectionResult" (
    "id" TEXT NOT NULL,
    "resultNumber" VARCHAR(100) NOT NULL,
    "inspectionPlanId" TEXT NOT NULL,
    "productId" TEXT,
    "batchNumber" VARCHAR(100),
    "lotNumber" VARCHAR(100),
    "inspectionDate" TIMESTAMP(3) NOT NULL,
    "inspectedBy" TEXT NOT NULL,
    "quantityInspected" DOUBLE PRECISION NOT NULL,
    "quantityAccepted" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "quantityRejected" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "status" VARCHAR(50) NOT NULL DEFAULT 'pending',
    "overallResult" VARCHAR(50),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InspectionResult_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InspectionCheckpointResult" (
    "id" TEXT NOT NULL,
    "inspectionResultId" TEXT NOT NULL,
    "checkpointId" TEXT NOT NULL,
    "result" VARCHAR(50) NOT NULL DEFAULT 'pending',
    "measuredValue" DOUBLE PRECISION,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InspectionCheckpointResult_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NonConformance" (
    "id" TEXT NOT NULL,
    "ncNumber" VARCHAR(100) NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "description" TEXT NOT NULL,
    "productId" TEXT,
    "batchNumber" VARCHAR(100),
    "inspectionResultId" TEXT,
    "severity" VARCHAR(50) NOT NULL DEFAULT 'minor',
    "status" VARCHAR(50) NOT NULL DEFAULT 'open',
    "detectedDate" TIMESTAMP(3) NOT NULL,
    "detectedBy" TEXT NOT NULL,
    "quantityAffected" DOUBLE PRECISION,
    "disposition" VARCHAR(50),
    "rootCause" TEXT,
    "rootCauseCategory" VARCHAR(100),
    "assignedTo" TEXT,
    "targetCloseDate" TIMESTAMP(3),
    "actualCloseDate" TIMESTAMP(3),
    "closedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NonConformance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CorrectiveAction" (
    "id" TEXT NOT NULL,
    "caNumber" VARCHAR(100) NOT NULL,
    "nonConformanceId" TEXT NOT NULL,
    "actionType" VARCHAR(50) NOT NULL DEFAULT 'corrective',
    "description" TEXT NOT NULL,
    "assignedTo" TEXT NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "completedDate" TIMESTAMP(3),
    "status" VARCHAR(50) NOT NULL DEFAULT 'open',
    "effectiveness" VARCHAR(50),
    "verifiedBy" TEXT,
    "verifiedDate" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CorrectiveAction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JobRequisition" (
    "id" TEXT NOT NULL,
    "requisitionNo" VARCHAR(100) NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "department" VARCHAR(100) NOT NULL,
    "positions" INTEGER NOT NULL DEFAULT 1,
    "description" TEXT NOT NULL,
    "requirements" JSONB NOT NULL,
    "status" VARCHAR(50) NOT NULL DEFAULT 'draft',
    "priority" VARCHAR(20) NOT NULL DEFAULT 'medium',
    "approvalStatus" VARCHAR(50) NOT NULL DEFAULT 'pending',
    "approvedBy" TEXT,
    "approvedDate" TIMESTAMP(3),
    "postedDate" TIMESTAMP(3),
    "closedDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "JobRequisition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Candidate" (
    "id" TEXT NOT NULL,
    "requisitionId" TEXT NOT NULL,
    "firstName" VARCHAR(100) NOT NULL,
    "lastName" VARCHAR(100) NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "phone" VARCHAR(50),
    "resumeUrl" TEXT,
    "coverLetter" TEXT,
    "appliedDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "stage" VARCHAR(50) NOT NULL DEFAULT 'applied',
    "score" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "source" VARCHAR(100),
    "hiredDate" TIMESTAMP(3),
    "employeeId" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Candidate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Interview" (
    "id" TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,
    "interviewType" VARCHAR(50) NOT NULL,
    "scheduledDate" TIMESTAMP(3) NOT NULL,
    "duration" INTEGER NOT NULL DEFAULT 60,
    "interviewerId" TEXT,
    "interviewerName" VARCHAR(255),
    "location" VARCHAR(255),
    "meetingLink" TEXT,
    "status" VARCHAR(50) NOT NULL DEFAULT 'scheduled',
    "rating" DOUBLE PRECISION,
    "feedback" TEXT,
    "recommendation" VARCHAR(50),
    "completedDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Interview_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PerformanceReview" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "reviewPeriodStart" TIMESTAMP(3) NOT NULL,
    "reviewPeriodEnd" TIMESTAMP(3) NOT NULL,
    "reviewerId" TEXT NOT NULL,
    "reviewerName" VARCHAR(255) NOT NULL,
    "goals" JSONB NOT NULL,
    "competencies" JSONB NOT NULL,
    "overallRating" DOUBLE PRECISION NOT NULL,
    "selfAssessment" TEXT,
    "managerFeedback" TEXT,
    "peerFeedback" JSONB,
    "status" VARCHAR(50) NOT NULL DEFAULT 'draft',
    "dueDate" TIMESTAMP(3),
    "completedDate" TIMESTAMP(3),
    "acknowledgedDate" TIMESTAMP(3),
    "comments" TEXT,
    "developmentPlan" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PerformanceReview_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LearningCourse" (
    "id" TEXT NOT NULL,
    "courseCode" VARCHAR(50) NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "description" TEXT NOT NULL,
    "category" VARCHAR(100) NOT NULL,
    "level" VARCHAR(50) NOT NULL DEFAULT 'beginner',
    "duration" INTEGER NOT NULL,
    "instructor" VARCHAR(255),
    "instructorBio" TEXT,
    "content" JSONB NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "maxEnrollments" INTEGER,
    "prerequisites" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LearningCourse_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CourseEnrollment" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "enrolledDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startDate" TIMESTAMP(3),
    "completionDate" TIMESTAMP(3),
    "progress" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "status" VARCHAR(50) NOT NULL DEFAULT 'enrolled',
    "score" DOUBLE PRECISION,
    "passed" BOOLEAN NOT NULL DEFAULT false,
    "certificateUrl" TEXT,
    "certificateIssued" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CourseEnrollment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SuccessionPlan" (
    "id" TEXT NOT NULL,
    "positionTitle" VARCHAR(255) NOT NULL,
    "department" VARCHAR(100) NOT NULL,
    "currentEmployeeId" TEXT,
    "criticality" VARCHAR(50) NOT NULL DEFAULT 'medium',
    "riskLevel" VARCHAR(50) NOT NULL DEFAULT 'medium',
    "candidates" JSONB NOT NULL,
    "targetDate" TIMESTAMP(3),
    "status" VARCHAR(50) NOT NULL DEFAULT 'active',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SuccessionPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payroll" (
    "id" TEXT NOT NULL,
    "payrollNo" VARCHAR(100) NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "paymentDate" TIMESTAMP(3) NOT NULL,
    "country" VARCHAR(50) NOT NULL,
    "currency" VARCHAR(10) NOT NULL DEFAULT 'USD',
    "status" VARCHAR(50) NOT NULL DEFAULT 'draft',
    "totalGrossPay" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalDeductions" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalNetPay" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "processedBy" TEXT,
    "processedDate" TIMESTAMP(3),
    "approvedBy" TEXT,
    "approvedDate" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Payroll_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PayrollItem" (
    "id" TEXT NOT NULL,
    "payrollId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "basicSalary" DOUBLE PRECISION NOT NULL,
    "overtime" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "bonus" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "allowances" JSONB NOT NULL,
    "tax" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "socialSecurity" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "insurance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "otherDeductions" JSONB NOT NULL,
    "grossPay" DOUBLE PRECISION NOT NULL,
    "totalDeductions" DOUBLE PRECISION NOT NULL,
    "netPay" DOUBLE PRECISION NOT NULL,
    "taxFormUrl" TEXT,
    "payslipUrl" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PayrollItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmployeeCertification" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "certificationName" VARCHAR(255) NOT NULL,
    "issuingOrg" VARCHAR(255) NOT NULL,
    "issueDate" TIMESTAMP(3) NOT NULL,
    "expiryDate" TIMESTAMP(3),
    "certificateUrl" TEXT,
    "status" VARCHAR(50) NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmployeeCertification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmployeeDocument" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "documentType" VARCHAR(100) NOT NULL,
    "documentName" VARCHAR(255) NOT NULL,
    "documentUrl" TEXT NOT NULL,
    "uploadedBy" TEXT,
    "uploadedDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiryDate" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmployeeDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Asset" (
    "id" TEXT NOT NULL,
    "assetNumber" VARCHAR(100) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "category" VARCHAR(50) NOT NULL,
    "location" VARCHAR(255) NOT NULL,
    "department" VARCHAR(100),
    "status" VARCHAR(50) NOT NULL DEFAULT 'operational',
    "acquisitionDate" TIMESTAMP(3) NOT NULL,
    "acquisitionCost" DOUBLE PRECISION NOT NULL,
    "currentValue" DOUBLE PRECISION NOT NULL,
    "depreciationMethod" VARCHAR(50),
    "usefulLife" INTEGER,
    "salvageValue" DOUBLE PRECISION,
    "specifications" JSONB NOT NULL,
    "qrCode" VARCHAR(255),
    "serialNumber" VARCHAR(100),
    "manufacturer" VARCHAR(255),
    "model" VARCHAR(255),
    "warrantyExpiry" TIMESTAMP(3),
    "parentAssetId" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,
    "updatedBy" TEXT,

    CONSTRAINT "Asset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MaintenancePlan" (
    "id" TEXT NOT NULL,
    "planNumber" VARCHAR(100) NOT NULL,
    "assetId" TEXT NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "frequency" VARCHAR(50) NOT NULL,
    "frequencyValue" INTEGER,
    "tasks" TEXT[],
    "estimatedDuration" DOUBLE PRECISION NOT NULL,
    "requiredParts" TEXT[],
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastExecuted" TIMESTAMP(3),
    "nextScheduled" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,
    "updatedBy" TEXT,

    CONSTRAINT "MaintenancePlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MaintenanceTask" (
    "id" TEXT NOT NULL,
    "taskNumber" VARCHAR(100) NOT NULL,
    "assetId" TEXT NOT NULL,
    "planId" TEXT,
    "taskType" VARCHAR(50) NOT NULL,
    "description" TEXT NOT NULL,
    "priority" VARCHAR(50) NOT NULL DEFAULT 'medium',
    "scheduledDate" TIMESTAMP(3) NOT NULL,
    "completedDate" TIMESTAMP(3),
    "technicianId" TEXT,
    "technicianName" VARCHAR(255),
    "status" VARCHAR(50) NOT NULL DEFAULT 'scheduled',
    "actualDuration" DOUBLE PRECISION,
    "laborCost" DOUBLE PRECISION,
    "partsCost" DOUBLE PRECISION,
    "totalCost" DOUBLE PRECISION,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,
    "updatedBy" TEXT,

    CONSTRAINT "MaintenanceTask_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MaintenanceRecord" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "completedDate" TIMESTAMP(3) NOT NULL,
    "technicianId" TEXT NOT NULL,
    "technicianName" VARCHAR(255) NOT NULL,
    "actualDuration" DOUBLE PRECISION NOT NULL,
    "spareParts" JSONB NOT NULL,
    "laborCost" DOUBLE PRECISION NOT NULL,
    "partsCost" DOUBLE PRECISION NOT NULL,
    "totalCost" DOUBLE PRECISION NOT NULL,
    "workPerformed" TEXT NOT NULL,
    "findings" TEXT,
    "recommendations" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,
    "updatedBy" TEXT,

    CONSTRAINT "MaintenanceRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssetHealth" (
    "id" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "healthScore" DOUBLE PRECISION NOT NULL,
    "status" VARCHAR(50) NOT NULL,
    "metrics" JSONB NOT NULL,
    "lastInspectionDate" TIMESTAMP(3),
    "nextInspectionDate" TIMESTAMP(3),
    "mtbf" DOUBLE PRECISION,
    "mttr" DOUBLE PRECISION,
    "availability" DOUBLE PRECISION,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AssetHealth_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssetUtilization" (
    "id" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "period" DATE NOT NULL,
    "totalHours" DOUBLE PRECISION NOT NULL,
    "operationalHours" DOUBLE PRECISION NOT NULL,
    "maintenanceHours" DOUBLE PRECISION NOT NULL,
    "downtimeHours" DOUBLE PRECISION NOT NULL,
    "utilizationRate" DOUBLE PRECISION NOT NULL,
    "efficiency" DOUBLE PRECISION NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AssetUtilization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlantShutdown" (
    "id" TEXT NOT NULL,
    "shutdownNumber" VARCHAR(100) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "status" VARCHAR(50) NOT NULL DEFAULT 'planned',
    "assets" JSONB NOT NULL,
    "totalEstimatedCost" DOUBLE PRECISION NOT NULL,
    "actualCost" DOUBLE PRECISION,
    "completionPercentage" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,
    "updatedBy" TEXT,

    CONSTRAINT "PlantShutdown_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Project" (
    "id" TEXT NOT NULL,
    "projectNumber" VARCHAR(100) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "projectType" VARCHAR(50) NOT NULL,
    "status" VARCHAR(50) NOT NULL DEFAULT 'planning',
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "budget" DOUBLE PRECISION NOT NULL,
    "actualCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "phases" JSONB NOT NULL,
    "resources" JSONB NOT NULL,
    "milestones" JSONB NOT NULL,
    "customerId" TEXT,
    "customerName" VARCHAR(255),
    "projectManagerId" TEXT,
    "projectManagerName" VARCHAR(255),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,
    "updatedBy" TEXT,

    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectCost" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "costType" VARCHAR(50) NOT NULL,
    "description" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "phaseId" VARCHAR(100),
    "taskId" VARCHAR(100),
    "resourceId" VARCHAR(100),
    "invoiceId" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,
    "updatedBy" TEXT,

    CONSTRAINT "ProjectCost_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectEVM" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "reportDate" TIMESTAMP(3) NOT NULL,
    "metrics" JSONB NOT NULL,
    "completionPercentage" DOUBLE PRECISION NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,
    "updatedBy" TEXT,

    CONSTRAINT "ProjectEVM_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectInvoice" (
    "id" TEXT NOT NULL,
    "invoiceNumber" VARCHAR(100) NOT NULL,
    "projectId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "customerName" VARCHAR(255) NOT NULL,
    "billingType" VARCHAR(50) NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "subtotal" DOUBLE PRECISION NOT NULL,
    "taxAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "total" DOUBLE PRECISION NOT NULL,
    "status" VARCHAR(50) NOT NULL DEFAULT 'draft',
    "dueDate" TIMESTAMP(3) NOT NULL,
    "paidDate" TIMESTAMP(3),
    "lineItems" JSONB NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,
    "updatedBy" TEXT,

    CONSTRAINT "ProjectInvoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectTemplate" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "projectType" VARCHAR(50) NOT NULL,
    "defaultDuration" INTEGER NOT NULL,
    "phases" JSONB NOT NULL,
    "milestones" JSONB NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,
    "updatedBy" TEXT,

    CONSTRAINT "ProjectTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RiskItem" (
    "id" TEXT NOT NULL,
    "riskNumber" VARCHAR(100) NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "description" TEXT NOT NULL,
    "category" VARCHAR(50) NOT NULL,
    "likelihood" INTEGER NOT NULL,
    "impact" INTEGER NOT NULL,
    "riskScore" INTEGER NOT NULL,
    "owner" TEXT NOT NULL,
    "ownerName" VARCHAR(255),
    "status" VARCHAR(50) NOT NULL,
    "mitigations" JSONB NOT NULL,
    "identifiedDate" TIMESTAMP(3) NOT NULL,
    "lastAssessmentDate" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,
    "updatedBy" TEXT,

    CONSTRAINT "RiskItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ComplianceRequirement" (
    "id" TEXT NOT NULL,
    "requirementNumber" VARCHAR(100) NOT NULL,
    "regulation" VARCHAR(255) NOT NULL,
    "requirement" TEXT NOT NULL,
    "applicability" TEXT NOT NULL,
    "controls" JSONB NOT NULL,
    "status" VARCHAR(50) NOT NULL,
    "lastAssessmentDate" TIMESTAMP(3),
    "nextAssessmentDate" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,
    "updatedBy" TEXT,

    CONSTRAINT "ComplianceRequirement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditPlan" (
    "id" TEXT NOT NULL,
    "auditNumber" VARCHAR(100) NOT NULL,
    "auditType" VARCHAR(50) NOT NULL,
    "scope" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "auditors" JSONB NOT NULL,
    "auditorNames" JSONB,
    "findings" JSONB NOT NULL,
    "status" VARCHAR(50) NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,
    "updatedBy" TEXT,

    CONSTRAINT "AuditPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DimDate" (
    "dateKey" VARCHAR(8) NOT NULL,
    "fullDate" DATE NOT NULL,
    "year" INTEGER NOT NULL,
    "quarter" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "monthName" VARCHAR(20) NOT NULL,
    "week" INTEGER NOT NULL,
    "dayOfMonth" INTEGER NOT NULL,
    "dayOfWeek" INTEGER NOT NULL,
    "dayName" VARCHAR(20) NOT NULL,
    "isWeekend" BOOLEAN NOT NULL DEFAULT false,
    "isHoliday" BOOLEAN NOT NULL DEFAULT false,
    "fiscalYear" INTEGER NOT NULL,
    "fiscalQuarter" INTEGER NOT NULL,
    "fiscalPeriod" VARCHAR(20) NOT NULL,

    CONSTRAINT "DimDate_pkey" PRIMARY KEY ("dateKey")
);

-- CreateTable
CREATE TABLE "DimProduct" (
    "productKey" TEXT NOT NULL,
    "productId" VARCHAR(100) NOT NULL,
    "productName" VARCHAR(255) NOT NULL,
    "sku" VARCHAR(100) NOT NULL,
    "category" VARCHAR(255) NOT NULL,
    "categoryHierarchy" VARCHAR(500) NOT NULL,
    "brand" VARCHAR(100),
    "unit" VARCHAR(20) NOT NULL,
    "trackingType" VARCHAR(20) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "effectiveDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiryDate" TIMESTAMP(3),

    CONSTRAINT "DimProduct_pkey" PRIMARY KEY ("productKey")
);

-- CreateTable
CREATE TABLE "DimCustomer" (
    "customerKey" TEXT NOT NULL,
    "customerId" VARCHAR(100) NOT NULL,
    "customerName" VARCHAR(255) NOT NULL,
    "customerType" VARCHAR(50) NOT NULL,
    "segment" VARCHAR(50) NOT NULL,
    "region" VARCHAR(100),
    "country" VARCHAR(100),
    "city" VARCHAR(100),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "effectiveDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiryDate" TIMESTAMP(3),

    CONSTRAINT "DimCustomer_pkey" PRIMARY KEY ("customerKey")
);

-- CreateTable
CREATE TABLE "DimSupplier" (
    "supplierKey" TEXT NOT NULL,
    "supplierId" VARCHAR(100) NOT NULL,
    "supplierName" VARCHAR(255) NOT NULL,
    "category" VARCHAR(100),
    "rating" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "effectiveDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiryDate" TIMESTAMP(3),

    CONSTRAINT "DimSupplier_pkey" PRIMARY KEY ("supplierKey")
);

-- CreateTable
CREATE TABLE "DimWarehouse" (
    "warehouseKey" TEXT NOT NULL,
    "warehouseId" VARCHAR(100) NOT NULL,
    "warehouseName" VARCHAR(255) NOT NULL,
    "warehouseCode" VARCHAR(50) NOT NULL,
    "region" VARCHAR(100),
    "country" VARCHAR(100),
    "city" VARCHAR(100),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "effectiveDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiryDate" TIMESTAMP(3),

    CONSTRAINT "DimWarehouse_pkey" PRIMARY KEY ("warehouseKey")
);

-- CreateTable
CREATE TABLE "DimEmployee" (
    "employeeKey" TEXT NOT NULL,
    "employeeId" VARCHAR(100) NOT NULL,
    "employeeName" VARCHAR(255) NOT NULL,
    "department" VARCHAR(100),
    "position" VARCHAR(100),
    "managerId" VARCHAR(100),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "effectiveDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiryDate" TIMESTAMP(3),

    CONSTRAINT "DimEmployee_pkey" PRIMARY KEY ("employeeKey")
);

-- CreateTable
CREATE TABLE "FactSales" (
    "salesKey" TEXT NOT NULL,
    "dateKey" VARCHAR(8) NOT NULL,
    "productKey" TEXT NOT NULL,
    "customerKey" TEXT NOT NULL,
    "warehouseKey" TEXT NOT NULL,
    "employeeKey" TEXT NOT NULL,
    "orderId" VARCHAR(100) NOT NULL,
    "orderNumber" VARCHAR(100) NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "unitPrice" DOUBLE PRECISION NOT NULL,
    "discount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "taxAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalAmount" DOUBLE PRECISION NOT NULL,
    "costAmount" DOUBLE PRECISION NOT NULL,
    "profitAmount" DOUBLE PRECISION NOT NULL,
    "profitMargin" DOUBLE PRECISION NOT NULL,
    "paymentMode" VARCHAR(50) NOT NULL,
    "orderStatus" VARCHAR(50) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FactSales_pkey" PRIMARY KEY ("salesKey")
);

-- CreateTable
CREATE TABLE "FactInventory" (
    "inventoryKey" TEXT NOT NULL,
    "dateKey" VARCHAR(8) NOT NULL,
    "productKey" TEXT NOT NULL,
    "warehouseKey" TEXT NOT NULL,
    "quantityOnHand" DOUBLE PRECISION NOT NULL,
    "quantityReserved" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "quantityAvailable" DOUBLE PRECISION NOT NULL,
    "unitCost" DOUBLE PRECISION NOT NULL,
    "totalValue" DOUBLE PRECISION NOT NULL,
    "reorderPoint" DOUBLE PRECISION NOT NULL,
    "daysOfSupply" DOUBLE PRECISION NOT NULL,
    "stockStatus" VARCHAR(50) NOT NULL,
    "snapshotDate" DATE NOT NULL,

    CONSTRAINT "FactInventory_pkey" PRIMARY KEY ("inventoryKey")
);

-- CreateTable
CREATE TABLE "FactPurchase" (
    "purchaseKey" TEXT NOT NULL,
    "dateKey" VARCHAR(8) NOT NULL,
    "productKey" TEXT NOT NULL,
    "supplierKey" TEXT NOT NULL,
    "warehouseKey" TEXT NOT NULL,
    "purchaseOrderId" VARCHAR(100) NOT NULL,
    "purchaseOrderNumber" VARCHAR(100) NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "unitCost" DOUBLE PRECISION NOT NULL,
    "taxAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalAmount" DOUBLE PRECISION NOT NULL,
    "paymentTerms" VARCHAR(100),
    "deliveryDate" TIMESTAMP(3),
    "status" VARCHAR(50) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FactPurchase_pkey" PRIMARY KEY ("purchaseKey")
);

-- CreateTable
CREATE TABLE "FactProduction" (
    "productionKey" TEXT NOT NULL,
    "dateKey" VARCHAR(8) NOT NULL,
    "productKey" TEXT NOT NULL,
    "warehouseKey" TEXT NOT NULL,
    "employeeKey" TEXT NOT NULL,
    "productionOrderId" VARCHAR(100) NOT NULL,
    "productionOrderNumber" VARCHAR(100) NOT NULL,
    "plannedQuantity" DOUBLE PRECISION NOT NULL,
    "actualQuantity" DOUBLE PRECISION NOT NULL,
    "scrapQuantity" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "yieldPercentage" DOUBLE PRECISION NOT NULL,
    "standardCost" DOUBLE PRECISION NOT NULL,
    "actualCost" DOUBLE PRECISION NOT NULL,
    "costVariance" DOUBLE PRECISION NOT NULL,
    "duration" INTEGER NOT NULL,
    "efficiency" DOUBLE PRECISION NOT NULL,
    "status" VARCHAR(50) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FactProduction_pkey" PRIMARY KEY ("productionKey")
);

-- CreateTable
CREATE TABLE "FactFinancial" (
    "financialKey" TEXT NOT NULL,
    "dateKey" VARCHAR(8) NOT NULL,
    "accountId" VARCHAR(100) NOT NULL,
    "accountCode" VARCHAR(50) NOT NULL,
    "accountName" VARCHAR(255) NOT NULL,
    "accountType" VARCHAR(50) NOT NULL,
    "transactionId" VARCHAR(100) NOT NULL,
    "transactionNumber" VARCHAR(100) NOT NULL,
    "transactionType" VARCHAR(50) NOT NULL,
    "debitAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "creditAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "netAmount" DOUBLE PRECISION NOT NULL,
    "currency" VARCHAR(10) NOT NULL,
    "description" TEXT NOT NULL,
    "fiscalPeriod" VARCHAR(20) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FactFinancial_pkey" PRIMARY KEY ("financialKey")
);

-- CreateTable
CREATE TABLE "FactHR" (
    "hrKey" TEXT NOT NULL,
    "dateKey" VARCHAR(8) NOT NULL,
    "employeeKey" TEXT NOT NULL,
    "department" VARCHAR(100) NOT NULL,
    "eventType" VARCHAR(50) NOT NULL,
    "eventValue" DOUBLE PRECISION,
    "eventDescription" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FactHR_pkey" PRIMARY KEY ("hrKey")
);

-- CreateTable
CREATE TABLE "ETLJob" (
    "id" TEXT NOT NULL,
    "jobName" VARCHAR(255) NOT NULL,
    "jobType" VARCHAR(50) NOT NULL,
    "sourceTable" VARCHAR(255) NOT NULL,
    "targetTable" VARCHAR(255) NOT NULL,
    "status" VARCHAR(50) NOT NULL,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3),
    "recordsProcessed" INTEGER NOT NULL DEFAULT 0,
    "recordsInserted" INTEGER NOT NULL DEFAULT 0,
    "recordsUpdated" INTEGER NOT NULL DEFAULT 0,
    "recordsFailed" INTEGER NOT NULL DEFAULT 0,
    "errorMessage" TEXT,
    "lastSuccessfulRun" TIMESTAMP(3),
    "nextScheduledRun" TIMESTAMP(3),
    "schedule" VARCHAR(100),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ETLJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ETLJobLog" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "logLevel" VARCHAR(20) NOT NULL,
    "message" TEXT NOT NULL,
    "details" JSONB,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ETLJobLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DataQualityMetric" (
    "id" TEXT NOT NULL,
    "tableName" VARCHAR(255) NOT NULL,
    "metricType" VARCHAR(50) NOT NULL,
    "metricName" VARCHAR(255) NOT NULL,
    "metricValue" DOUBLE PRECISION NOT NULL,
    "threshold" DOUBLE PRECISION NOT NULL,
    "status" VARCHAR(20) NOT NULL,
    "checkDate" DATE NOT NULL,
    "details" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DataQualityMetric_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KPIDefinition" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "category" VARCHAR(100) NOT NULL,
    "calculationFormula" TEXT NOT NULL,
    "unit" VARCHAR(50) NOT NULL,
    "targetValue" DOUBLE PRECISION,
    "thresholdGood" DOUBLE PRECISION,
    "thresholdWarning" DOUBLE PRECISION,
    "frequency" VARCHAR(50) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "KPIDefinition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KPIValue" (
    "id" TEXT NOT NULL,
    "kpiId" TEXT NOT NULL,
    "periodStart" DATE NOT NULL,
    "periodEnd" DATE NOT NULL,
    "actualValue" DOUBLE PRECISION NOT NULL,
    "targetValue" DOUBLE PRECISION,
    "variance" DOUBLE PRECISION,
    "variancePercent" DOUBLE PRECISION,
    "trend" VARCHAR(20),
    "status" VARCHAR(20) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "KPIValue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScheduledReport" (
    "id" TEXT NOT NULL,
    "reportTemplateId" TEXT NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "schedule" VARCHAR(100) NOT NULL,
    "recipients" TEXT[],
    "format" VARCHAR(20) NOT NULL,
    "parameters" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastRun" TIMESTAMP(3),
    "nextRun" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ScheduledReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReportExecution" (
    "id" TEXT NOT NULL,
    "scheduledReportId" TEXT,
    "reportTemplateId" TEXT NOT NULL,
    "executedBy" VARCHAR(100),
    "status" VARCHAR(50) NOT NULL,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3),
    "fileUrl" VARCHAR(1024),
    "fileSize" INTEGER,
    "recordCount" INTEGER,
    "errorMessage" TEXT,

    CONSTRAINT "ReportExecution_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShopFloorOperation" (
    "id" TEXT NOT NULL,
    "productionOrderId" VARCHAR(100) NOT NULL,
    "workCenterId" VARCHAR(100) NOT NULL,
    "operationId" VARCHAR(100) NOT NULL,
    "operationName" VARCHAR(255) NOT NULL,
    "status" VARCHAR(50) NOT NULL,
    "startTime" TIMESTAMP(3),
    "endTime" TIMESTAMP(3),
    "plannedDuration" INTEGER NOT NULL,
    "actualDuration" INTEGER,
    "operatorId" VARCHAR(100),
    "operatorName" VARCHAR(255),
    "efficiency" DOUBLE PRECISION,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShopFloorOperation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IoTDevice" (
    "id" TEXT NOT NULL,
    "deviceId" VARCHAR(100) NOT NULL,
    "deviceName" VARCHAR(255) NOT NULL,
    "deviceType" VARCHAR(100) NOT NULL,
    "workCenterId" VARCHAR(100),
    "assetId" VARCHAR(100),
    "status" VARCHAR(50) NOT NULL DEFAULT 'offline',
    "lastHeartbeat" TIMESTAMP(3),
    "configuration" JSONB,
    "location" VARCHAR(255),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IoTDevice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SensorMetric" (
    "id" TEXT NOT NULL,
    "deviceId" TEXT NOT NULL,
    "metricName" VARCHAR(100) NOT NULL,
    "metricValue" DOUBLE PRECISION NOT NULL,
    "unit" VARCHAR(50) NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL,
    "quality" VARCHAR(20),
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SensorMetric_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EquipmentHealth" (
    "id" TEXT NOT NULL,
    "assetId" VARCHAR(100) NOT NULL,
    "assetName" VARCHAR(255) NOT NULL,
    "healthScore" DOUBLE PRECISION NOT NULL,
    "predictedFailureDate" TIMESTAMP(3),
    "remainingUsefulLife" INTEGER,
    "algorithm" VARCHAR(100) NOT NULL,
    "confidence" DOUBLE PRECISION,
    "recommendations" JSONB,
    "sensorData" JSONB,
    "calculatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EquipmentHealth_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PredictiveMaintenanceTask" (
    "id" TEXT NOT NULL,
    "taskNumber" VARCHAR(100) NOT NULL,
    "equipmentHealthId" TEXT NOT NULL,
    "assetId" VARCHAR(100) NOT NULL,
    "taskType" VARCHAR(100) NOT NULL,
    "priority" VARCHAR(50) NOT NULL,
    "description" TEXT NOT NULL,
    "scheduledDate" TIMESTAMP(3) NOT NULL,
    "completedDate" TIMESTAMP(3),
    "status" VARCHAR(50) NOT NULL DEFAULT 'scheduled',
    "assignedTo" VARCHAR(255),
    "estimatedCost" DOUBLE PRECISION,
    "actualCost" DOUBLE PRECISION,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PredictiveMaintenanceTask_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DigitalTwin" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "physicalAssetId" VARCHAR(100) NOT NULL,
    "modelType" VARCHAR(100) NOT NULL,
    "modelVersion" VARCHAR(50) NOT NULL,
    "parameters" JSONB NOT NULL,
    "state" JSONB NOT NULL,
    "lastSyncTime" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DigitalTwin_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Simulation" (
    "id" TEXT NOT NULL,
    "digitalTwinId" TEXT NOT NULL,
    "simulationName" VARCHAR(255) NOT NULL,
    "simulationType" VARCHAR(100) NOT NULL,
    "inputParameters" JSONB NOT NULL,
    "outputResults" JSONB NOT NULL,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3),
    "duration" INTEGER,
    "status" VARCHAR(50) NOT NULL,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Simulation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OEEMetrics" (
    "id" TEXT NOT NULL,
    "workCenterId" VARCHAR(100) NOT NULL,
    "assetId" VARCHAR(100),
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "plannedProductionTime" INTEGER NOT NULL,
    "actualProductionTime" INTEGER NOT NULL,
    "downtime" INTEGER NOT NULL,
    "availability" DOUBLE PRECISION NOT NULL,
    "idealCycleTime" DOUBLE PRECISION NOT NULL,
    "totalUnitsProduced" INTEGER NOT NULL,
    "performanceRate" DOUBLE PRECISION NOT NULL,
    "goodUnits" INTEGER NOT NULL,
    "defectiveUnits" INTEGER NOT NULL,
    "qualityRate" DOUBLE PRECISION NOT NULL,
    "oee" DOUBLE PRECISION NOT NULL,
    "calculatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OEEMetrics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductionStatus" (
    "id" TEXT NOT NULL,
    "workCenterId" VARCHAR(100) NOT NULL,
    "workCenterName" VARCHAR(255) NOT NULL,
    "status" VARCHAR(50) NOT NULL,
    "currentOperationId" VARCHAR(100),
    "currentProductionOrder" VARCHAR(100),
    "currentProduct" VARCHAR(255),
    "unitsProduced" INTEGER NOT NULL DEFAULT 0,
    "targetUnits" INTEGER NOT NULL DEFAULT 0,
    "efficiency" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "alerts" JSONB,
    "lastUpdated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductionStatus_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductionAlert" (
    "id" TEXT NOT NULL,
    "workCenterId" VARCHAR(100) NOT NULL,
    "severity" VARCHAR(50) NOT NULL,
    "message" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "acknowledged" BOOLEAN NOT NULL DEFAULT false,
    "acknowledgedBy" VARCHAR(255),
    "acknowledgedAt" TIMESTAMP(3),
    "resolved" BOOLEAN NOT NULL DEFAULT false,
    "resolvedBy" VARCHAR(255),
    "resolvedAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductionAlert_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductionSchedule" (
    "id" TEXT NOT NULL,
    "scheduleNumber" VARCHAR(100) NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "status" VARCHAR(50) NOT NULL DEFAULT 'draft',
    "optimizationGoal" VARCHAR(100) NOT NULL,
    "constraints" JSONB,
    "schedule" JSONB NOT NULL,
    "makespan" INTEGER,
    "throughput" DOUBLE PRECISION,
    "utilizationRate" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductionSchedule_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "InspectionPlan_planNumber_key" ON "InspectionPlan"("planNumber");

-- CreateIndex
CREATE INDEX "InspectionPlan_productId_idx" ON "InspectionPlan"("productId");

-- CreateIndex
CREATE INDEX "InspectionPlan_isActive_idx" ON "InspectionPlan"("isActive");

-- CreateIndex
CREATE INDEX "InspectionPlan_inspectionType_idx" ON "InspectionPlan"("inspectionType");

-- CreateIndex
CREATE INDEX "InspectionCheckpoint_inspectionPlanId_idx" ON "InspectionCheckpoint"("inspectionPlanId");

-- CreateIndex
CREATE UNIQUE INDEX "InspectionCheckpoint_inspectionPlanId_checkpointNumber_key" ON "InspectionCheckpoint"("inspectionPlanId", "checkpointNumber");

-- CreateIndex
CREATE UNIQUE INDEX "InspectionResult_resultNumber_key" ON "InspectionResult"("resultNumber");

-- CreateIndex
CREATE INDEX "InspectionResult_inspectionPlanId_idx" ON "InspectionResult"("inspectionPlanId");

-- CreateIndex
CREATE INDEX "InspectionResult_productId_idx" ON "InspectionResult"("productId");

-- CreateIndex
CREATE INDEX "InspectionResult_status_idx" ON "InspectionResult"("status");

-- CreateIndex
CREATE INDEX "InspectionResult_inspectionDate_idx" ON "InspectionResult"("inspectionDate");

-- CreateIndex
CREATE INDEX "InspectionResult_batchNumber_idx" ON "InspectionResult"("batchNumber");

-- CreateIndex
CREATE INDEX "InspectionCheckpointResult_inspectionResultId_idx" ON "InspectionCheckpointResult"("inspectionResultId");

-- CreateIndex
CREATE INDEX "InspectionCheckpointResult_checkpointId_idx" ON "InspectionCheckpointResult"("checkpointId");

-- CreateIndex
CREATE UNIQUE INDEX "NonConformance_ncNumber_key" ON "NonConformance"("ncNumber");

-- CreateIndex
CREATE INDEX "NonConformance_productId_idx" ON "NonConformance"("productId");

-- CreateIndex
CREATE INDEX "NonConformance_status_idx" ON "NonConformance"("status");

-- CreateIndex
CREATE INDEX "NonConformance_severity_idx" ON "NonConformance"("severity");

-- CreateIndex
CREATE INDEX "NonConformance_inspectionResultId_idx" ON "NonConformance"("inspectionResultId");

-- CreateIndex
CREATE INDEX "NonConformance_assignedTo_idx" ON "NonConformance"("assignedTo");

-- CreateIndex
CREATE INDEX "NonConformance_detectedDate_idx" ON "NonConformance"("detectedDate");

-- CreateIndex
CREATE UNIQUE INDEX "CorrectiveAction_caNumber_key" ON "CorrectiveAction"("caNumber");

-- CreateIndex
CREATE INDEX "CorrectiveAction_nonConformanceId_idx" ON "CorrectiveAction"("nonConformanceId");

-- CreateIndex
CREATE INDEX "CorrectiveAction_status_idx" ON "CorrectiveAction"("status");

-- CreateIndex
CREATE INDEX "CorrectiveAction_assignedTo_idx" ON "CorrectiveAction"("assignedTo");

-- CreateIndex
CREATE INDEX "CorrectiveAction_dueDate_idx" ON "CorrectiveAction"("dueDate");

-- CreateIndex
CREATE UNIQUE INDEX "JobRequisition_requisitionNo_key" ON "JobRequisition"("requisitionNo");

-- CreateIndex
CREATE INDEX "JobRequisition_status_idx" ON "JobRequisition"("status");

-- CreateIndex
CREATE INDEX "JobRequisition_department_idx" ON "JobRequisition"("department");

-- CreateIndex
CREATE INDEX "Candidate_requisitionId_stage_idx" ON "Candidate"("requisitionId", "stage");

-- CreateIndex
CREATE INDEX "Candidate_email_idx" ON "Candidate"("email");

-- CreateIndex
CREATE INDEX "Interview_candidateId_idx" ON "Interview"("candidateId");

-- CreateIndex
CREATE INDEX "Interview_scheduledDate_idx" ON "Interview"("scheduledDate");

-- CreateIndex
CREATE INDEX "PerformanceReview_employeeId_idx" ON "PerformanceReview"("employeeId");

-- CreateIndex
CREATE INDEX "PerformanceReview_reviewPeriodEnd_idx" ON "PerformanceReview"("reviewPeriodEnd");

-- CreateIndex
CREATE UNIQUE INDEX "LearningCourse_courseCode_key" ON "LearningCourse"("courseCode");

-- CreateIndex
CREATE INDEX "LearningCourse_category_idx" ON "LearningCourse"("category");

-- CreateIndex
CREATE INDEX "LearningCourse_isActive_idx" ON "LearningCourse"("isActive");

-- CreateIndex
CREATE INDEX "CourseEnrollment_employeeId_idx" ON "CourseEnrollment"("employeeId");

-- CreateIndex
CREATE INDEX "CourseEnrollment_status_idx" ON "CourseEnrollment"("status");

-- CreateIndex
CREATE UNIQUE INDEX "CourseEnrollment_courseId_employeeId_key" ON "CourseEnrollment"("courseId", "employeeId");

-- CreateIndex
CREATE INDEX "SuccessionPlan_department_idx" ON "SuccessionPlan"("department");

-- CreateIndex
CREATE INDEX "SuccessionPlan_criticality_idx" ON "SuccessionPlan"("criticality");

-- CreateIndex
CREATE UNIQUE INDEX "Payroll_payrollNo_key" ON "Payroll"("payrollNo");

-- CreateIndex
CREATE INDEX "Payroll_periodEnd_idx" ON "Payroll"("periodEnd");

-- CreateIndex
CREATE INDEX "Payroll_status_idx" ON "Payroll"("status");

-- CreateIndex
CREATE INDEX "PayrollItem_employeeId_idx" ON "PayrollItem"("employeeId");

-- CreateIndex
CREATE UNIQUE INDEX "PayrollItem_payrollId_employeeId_key" ON "PayrollItem"("payrollId", "employeeId");

-- CreateIndex
CREATE INDEX "EmployeeCertification_employeeId_idx" ON "EmployeeCertification"("employeeId");

-- CreateIndex
CREATE INDEX "EmployeeCertification_expiryDate_idx" ON "EmployeeCertification"("expiryDate");

-- CreateIndex
CREATE INDEX "EmployeeDocument_employeeId_idx" ON "EmployeeDocument"("employeeId");

-- CreateIndex
CREATE INDEX "EmployeeDocument_documentType_idx" ON "EmployeeDocument"("documentType");

-- CreateIndex
CREATE UNIQUE INDEX "Asset_assetNumber_key" ON "Asset"("assetNumber");

-- CreateIndex
CREATE INDEX "Asset_category_status_idx" ON "Asset"("category", "status");

-- CreateIndex
CREATE INDEX "Asset_location_idx" ON "Asset"("location");

-- CreateIndex
CREATE INDEX "Asset_parentAssetId_idx" ON "Asset"("parentAssetId");

-- CreateIndex
CREATE INDEX "Asset_assetNumber_idx" ON "Asset"("assetNumber");

-- CreateIndex
CREATE UNIQUE INDEX "MaintenancePlan_planNumber_key" ON "MaintenancePlan"("planNumber");

-- CreateIndex
CREATE INDEX "MaintenancePlan_assetId_isActive_idx" ON "MaintenancePlan"("assetId", "isActive");

-- CreateIndex
CREATE INDEX "MaintenancePlan_nextScheduled_idx" ON "MaintenancePlan"("nextScheduled");

-- CreateIndex
CREATE UNIQUE INDEX "MaintenanceTask_taskNumber_key" ON "MaintenanceTask"("taskNumber");

-- CreateIndex
CREATE INDEX "MaintenanceTask_assetId_status_idx" ON "MaintenanceTask"("assetId", "status");

-- CreateIndex
CREATE INDEX "MaintenanceTask_planId_idx" ON "MaintenanceTask"("planId");

-- CreateIndex
CREATE INDEX "MaintenanceTask_scheduledDate_idx" ON "MaintenanceTask"("scheduledDate");

-- CreateIndex
CREATE INDEX "MaintenanceTask_technicianId_status_idx" ON "MaintenanceTask"("technicianId", "status");

-- CreateIndex
CREATE INDEX "MaintenanceRecord_taskId_idx" ON "MaintenanceRecord"("taskId");

-- CreateIndex
CREATE INDEX "MaintenanceRecord_assetId_idx" ON "MaintenanceRecord"("assetId");

-- CreateIndex
CREATE INDEX "MaintenanceRecord_completedDate_idx" ON "MaintenanceRecord"("completedDate");

-- CreateIndex
CREATE INDEX "AssetHealth_assetId_idx" ON "AssetHealth"("assetId");

-- CreateIndex
CREATE INDEX "AssetHealth_healthScore_idx" ON "AssetHealth"("healthScore");

-- CreateIndex
CREATE INDEX "AssetHealth_status_idx" ON "AssetHealth"("status");

-- CreateIndex
CREATE INDEX "AssetUtilization_assetId_idx" ON "AssetUtilization"("assetId");

-- CreateIndex
CREATE INDEX "AssetUtilization_period_idx" ON "AssetUtilization"("period");

-- CreateIndex
CREATE UNIQUE INDEX "AssetUtilization_assetId_period_key" ON "AssetUtilization"("assetId", "period");

-- CreateIndex
CREATE UNIQUE INDEX "PlantShutdown_shutdownNumber_key" ON "PlantShutdown"("shutdownNumber");

-- CreateIndex
CREATE INDEX "PlantShutdown_status_idx" ON "PlantShutdown"("status");

-- CreateIndex
CREATE INDEX "PlantShutdown_startDate_idx" ON "PlantShutdown"("startDate");

-- CreateIndex
CREATE UNIQUE INDEX "Project_projectNumber_key" ON "Project"("projectNumber");

-- CreateIndex
CREATE INDEX "Project_status_idx" ON "Project"("status");

-- CreateIndex
CREATE INDEX "Project_projectType_idx" ON "Project"("projectType");

-- CreateIndex
CREATE INDEX "Project_projectManagerId_idx" ON "Project"("projectManagerId");

-- CreateIndex
CREATE INDEX "Project_customerId_idx" ON "Project"("customerId");

-- CreateIndex
CREATE INDEX "Project_startDate_idx" ON "Project"("startDate");

-- CreateIndex
CREATE INDEX "ProjectCost_projectId_date_idx" ON "ProjectCost"("projectId", "date");

-- CreateIndex
CREATE INDEX "ProjectCost_costType_idx" ON "ProjectCost"("costType");

-- CreateIndex
CREATE INDEX "ProjectCost_date_idx" ON "ProjectCost"("date");

-- CreateIndex
CREATE INDEX "ProjectEVM_projectId_reportDate_idx" ON "ProjectEVM"("projectId", "reportDate");

-- CreateIndex
CREATE INDEX "ProjectEVM_reportDate_idx" ON "ProjectEVM"("reportDate");

-- CreateIndex
CREATE UNIQUE INDEX "ProjectInvoice_invoiceNumber_key" ON "ProjectInvoice"("invoiceNumber");

-- CreateIndex
CREATE INDEX "ProjectInvoice_projectId_idx" ON "ProjectInvoice"("projectId");

-- CreateIndex
CREATE INDEX "ProjectInvoice_status_idx" ON "ProjectInvoice"("status");

-- CreateIndex
CREATE INDEX "ProjectInvoice_customerId_idx" ON "ProjectInvoice"("customerId");

-- CreateIndex
CREATE INDEX "ProjectInvoice_dueDate_idx" ON "ProjectInvoice"("dueDate");

-- CreateIndex
CREATE INDEX "ProjectTemplate_projectType_isActive_idx" ON "ProjectTemplate"("projectType", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "RiskItem_riskNumber_key" ON "RiskItem"("riskNumber");

-- CreateIndex
CREATE INDEX "RiskItem_category_status_idx" ON "RiskItem"("category", "status");

-- CreateIndex
CREATE INDEX "RiskItem_owner_idx" ON "RiskItem"("owner");

-- CreateIndex
CREATE INDEX "RiskItem_riskScore_idx" ON "RiskItem"("riskScore");

-- CreateIndex
CREATE INDEX "RiskItem_status_idx" ON "RiskItem"("status");

-- CreateIndex
CREATE UNIQUE INDEX "ComplianceRequirement_requirementNumber_key" ON "ComplianceRequirement"("requirementNumber");

-- CreateIndex
CREATE INDEX "ComplianceRequirement_regulation_status_idx" ON "ComplianceRequirement"("regulation", "status");

-- CreateIndex
CREATE INDEX "ComplianceRequirement_status_idx" ON "ComplianceRequirement"("status");

-- CreateIndex
CREATE INDEX "ComplianceRequirement_nextAssessmentDate_idx" ON "ComplianceRequirement"("nextAssessmentDate");

-- CreateIndex
CREATE UNIQUE INDEX "AuditPlan_auditNumber_key" ON "AuditPlan"("auditNumber");

-- CreateIndex
CREATE INDEX "AuditPlan_auditType_status_idx" ON "AuditPlan"("auditType", "status");

-- CreateIndex
CREATE INDEX "AuditPlan_status_idx" ON "AuditPlan"("status");

-- CreateIndex
CREATE INDEX "AuditPlan_startDate_endDate_idx" ON "AuditPlan"("startDate", "endDate");

-- CreateIndex
CREATE INDEX "DimDate_year_month_idx" ON "DimDate"("year", "month");

-- CreateIndex
CREATE INDEX "DimDate_fiscalYear_fiscalQuarter_idx" ON "DimDate"("fiscalYear", "fiscalQuarter");

-- CreateIndex
CREATE INDEX "DimProduct_productId_effectiveDate_idx" ON "DimProduct"("productId", "effectiveDate");

-- CreateIndex
CREATE INDEX "DimProduct_category_idx" ON "DimProduct"("category");

-- CreateIndex
CREATE INDEX "DimProduct_isActive_idx" ON "DimProduct"("isActive");

-- CreateIndex
CREATE INDEX "DimCustomer_customerId_effectiveDate_idx" ON "DimCustomer"("customerId", "effectiveDate");

-- CreateIndex
CREATE INDEX "DimCustomer_segment_idx" ON "DimCustomer"("segment");

-- CreateIndex
CREATE INDEX "DimCustomer_isActive_idx" ON "DimCustomer"("isActive");

-- CreateIndex
CREATE INDEX "DimSupplier_supplierId_effectiveDate_idx" ON "DimSupplier"("supplierId", "effectiveDate");

-- CreateIndex
CREATE INDEX "DimSupplier_isActive_idx" ON "DimSupplier"("isActive");

-- CreateIndex
CREATE INDEX "DimWarehouse_warehouseId_effectiveDate_idx" ON "DimWarehouse"("warehouseId", "effectiveDate");

-- CreateIndex
CREATE INDEX "DimWarehouse_isActive_idx" ON "DimWarehouse"("isActive");

-- CreateIndex
CREATE INDEX "DimEmployee_employeeId_effectiveDate_idx" ON "DimEmployee"("employeeId", "effectiveDate");

-- CreateIndex
CREATE INDEX "DimEmployee_department_idx" ON "DimEmployee"("department");

-- CreateIndex
CREATE INDEX "DimEmployee_isActive_idx" ON "DimEmployee"("isActive");

-- CreateIndex
CREATE INDEX "FactSales_dateKey_idx" ON "FactSales"("dateKey");

-- CreateIndex
CREATE INDEX "FactSales_productKey_idx" ON "FactSales"("productKey");

-- CreateIndex
CREATE INDEX "FactSales_customerKey_idx" ON "FactSales"("customerKey");

-- CreateIndex
CREATE INDEX "FactSales_warehouseKey_idx" ON "FactSales"("warehouseKey");

-- CreateIndex
CREATE INDEX "FactSales_employeeKey_idx" ON "FactSales"("employeeKey");

-- CreateIndex
CREATE INDEX "FactSales_orderId_idx" ON "FactSales"("orderId");

-- CreateIndex
CREATE INDEX "FactInventory_dateKey_idx" ON "FactInventory"("dateKey");

-- CreateIndex
CREATE INDEX "FactInventory_productKey_idx" ON "FactInventory"("productKey");

-- CreateIndex
CREATE INDEX "FactInventory_warehouseKey_idx" ON "FactInventory"("warehouseKey");

-- CreateIndex
CREATE INDEX "FactInventory_stockStatus_idx" ON "FactInventory"("stockStatus");

-- CreateIndex
CREATE UNIQUE INDEX "FactInventory_dateKey_productKey_warehouseKey_key" ON "FactInventory"("dateKey", "productKey", "warehouseKey");

-- CreateIndex
CREATE INDEX "FactPurchase_dateKey_idx" ON "FactPurchase"("dateKey");

-- CreateIndex
CREATE INDEX "FactPurchase_productKey_idx" ON "FactPurchase"("productKey");

-- CreateIndex
CREATE INDEX "FactPurchase_supplierKey_idx" ON "FactPurchase"("supplierKey");

-- CreateIndex
CREATE INDEX "FactPurchase_warehouseKey_idx" ON "FactPurchase"("warehouseKey");

-- CreateIndex
CREATE INDEX "FactPurchase_purchaseOrderId_idx" ON "FactPurchase"("purchaseOrderId");

-- CreateIndex
CREATE INDEX "FactProduction_dateKey_idx" ON "FactProduction"("dateKey");

-- CreateIndex
CREATE INDEX "FactProduction_productKey_idx" ON "FactProduction"("productKey");

-- CreateIndex
CREATE INDEX "FactProduction_warehouseKey_idx" ON "FactProduction"("warehouseKey");

-- CreateIndex
CREATE INDEX "FactProduction_employeeKey_idx" ON "FactProduction"("employeeKey");

-- CreateIndex
CREATE INDEX "FactProduction_productionOrderId_idx" ON "FactProduction"("productionOrderId");

-- CreateIndex
CREATE INDEX "FactFinancial_dateKey_idx" ON "FactFinancial"("dateKey");

-- CreateIndex
CREATE INDEX "FactFinancial_accountId_idx" ON "FactFinancial"("accountId");

-- CreateIndex
CREATE INDEX "FactFinancial_accountType_idx" ON "FactFinancial"("accountType");

-- CreateIndex
CREATE INDEX "FactFinancial_fiscalPeriod_idx" ON "FactFinancial"("fiscalPeriod");

-- CreateIndex
CREATE INDEX "FactFinancial_transactionId_idx" ON "FactFinancial"("transactionId");

-- CreateIndex
CREATE INDEX "FactHR_dateKey_idx" ON "FactHR"("dateKey");

-- CreateIndex
CREATE INDEX "FactHR_employeeKey_idx" ON "FactHR"("employeeKey");

-- CreateIndex
CREATE INDEX "FactHR_eventType_idx" ON "FactHR"("eventType");

-- CreateIndex
CREATE INDEX "FactHR_department_idx" ON "FactHR"("department");

-- CreateIndex
CREATE INDEX "ETLJob_jobName_status_idx" ON "ETLJob"("jobName", "status");

-- CreateIndex
CREATE INDEX "ETLJob_status_idx" ON "ETLJob"("status");

-- CreateIndex
CREATE INDEX "ETLJob_nextScheduledRun_idx" ON "ETLJob"("nextScheduledRun");

-- CreateIndex
CREATE INDEX "ETLJobLog_jobId_timestamp_idx" ON "ETLJobLog"("jobId", "timestamp");

-- CreateIndex
CREATE INDEX "ETLJobLog_logLevel_idx" ON "ETLJobLog"("logLevel");

-- CreateIndex
CREATE INDEX "DataQualityMetric_tableName_checkDate_idx" ON "DataQualityMetric"("tableName", "checkDate");

-- CreateIndex
CREATE INDEX "DataQualityMetric_metricType_status_idx" ON "DataQualityMetric"("metricType", "status");

-- CreateIndex
CREATE INDEX "DataQualityMetric_status_idx" ON "DataQualityMetric"("status");

-- CreateIndex
CREATE INDEX "KPIDefinition_category_isActive_idx" ON "KPIDefinition"("category", "isActive");

-- CreateIndex
CREATE INDEX "KPIDefinition_isActive_idx" ON "KPIDefinition"("isActive");

-- CreateIndex
CREATE INDEX "KPIValue_kpiId_periodStart_idx" ON "KPIValue"("kpiId", "periodStart");

-- CreateIndex
CREATE INDEX "KPIValue_status_idx" ON "KPIValue"("status");

-- CreateIndex
CREATE UNIQUE INDEX "KPIValue_kpiId_periodStart_periodEnd_key" ON "KPIValue"("kpiId", "periodStart", "periodEnd");

-- CreateIndex
CREATE INDEX "ScheduledReport_isActive_nextRun_idx" ON "ScheduledReport"("isActive", "nextRun");

-- CreateIndex
CREATE INDEX "ScheduledReport_reportTemplateId_idx" ON "ScheduledReport"("reportTemplateId");

-- CreateIndex
CREATE INDEX "ReportExecution_scheduledReportId_idx" ON "ReportExecution"("scheduledReportId");

-- CreateIndex
CREATE INDEX "ReportExecution_reportTemplateId_startTime_idx" ON "ReportExecution"("reportTemplateId", "startTime");

-- CreateIndex
CREATE INDEX "ReportExecution_status_idx" ON "ReportExecution"("status");

-- CreateIndex
CREATE INDEX "ShopFloorOperation_productionOrderId_idx" ON "ShopFloorOperation"("productionOrderId");

-- CreateIndex
CREATE INDEX "ShopFloorOperation_workCenterId_idx" ON "ShopFloorOperation"("workCenterId");

-- CreateIndex
CREATE INDEX "ShopFloorOperation_status_idx" ON "ShopFloorOperation"("status");

-- CreateIndex
CREATE INDEX "ShopFloorOperation_operatorId_idx" ON "ShopFloorOperation"("operatorId");

-- CreateIndex
CREATE UNIQUE INDEX "IoTDevice_deviceId_key" ON "IoTDevice"("deviceId");

-- CreateIndex
CREATE INDEX "IoTDevice_deviceId_idx" ON "IoTDevice"("deviceId");

-- CreateIndex
CREATE INDEX "IoTDevice_workCenterId_idx" ON "IoTDevice"("workCenterId");

-- CreateIndex
CREATE INDEX "IoTDevice_assetId_idx" ON "IoTDevice"("assetId");

-- CreateIndex
CREATE INDEX "IoTDevice_status_idx" ON "IoTDevice"("status");

-- CreateIndex
CREATE INDEX "SensorMetric_deviceId_timestamp_idx" ON "SensorMetric"("deviceId", "timestamp");

-- CreateIndex
CREATE INDEX "SensorMetric_metricName_timestamp_idx" ON "SensorMetric"("metricName", "timestamp");

-- CreateIndex
CREATE INDEX "SensorMetric_timestamp_idx" ON "SensorMetric"("timestamp");

-- CreateIndex
CREATE INDEX "EquipmentHealth_assetId_idx" ON "EquipmentHealth"("assetId");

-- CreateIndex
CREATE INDEX "EquipmentHealth_healthScore_idx" ON "EquipmentHealth"("healthScore");

-- CreateIndex
CREATE INDEX "EquipmentHealth_predictedFailureDate_idx" ON "EquipmentHealth"("predictedFailureDate");

-- CreateIndex
CREATE UNIQUE INDEX "PredictiveMaintenanceTask_taskNumber_key" ON "PredictiveMaintenanceTask"("taskNumber");

-- CreateIndex
CREATE INDEX "PredictiveMaintenanceTask_assetId_idx" ON "PredictiveMaintenanceTask"("assetId");

-- CreateIndex
CREATE INDEX "PredictiveMaintenanceTask_status_idx" ON "PredictiveMaintenanceTask"("status");

-- CreateIndex
CREATE INDEX "PredictiveMaintenanceTask_scheduledDate_idx" ON "PredictiveMaintenanceTask"("scheduledDate");

-- CreateIndex
CREATE INDEX "PredictiveMaintenanceTask_priority_idx" ON "PredictiveMaintenanceTask"("priority");

-- CreateIndex
CREATE INDEX "DigitalTwin_physicalAssetId_idx" ON "DigitalTwin"("physicalAssetId");

-- CreateIndex
CREATE INDEX "DigitalTwin_isActive_idx" ON "DigitalTwin"("isActive");

-- CreateIndex
CREATE INDEX "Simulation_digitalTwinId_idx" ON "Simulation"("digitalTwinId");

-- CreateIndex
CREATE INDEX "Simulation_status_idx" ON "Simulation"("status");

-- CreateIndex
CREATE INDEX "Simulation_startTime_idx" ON "Simulation"("startTime");

-- CreateIndex
CREATE INDEX "OEEMetrics_workCenterId_startDate_idx" ON "OEEMetrics"("workCenterId", "startDate");

-- CreateIndex
CREATE INDEX "OEEMetrics_assetId_startDate_idx" ON "OEEMetrics"("assetId", "startDate");

-- CreateIndex
CREATE INDEX "OEEMetrics_calculatedAt_idx" ON "OEEMetrics"("calculatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "ProductionStatus_workCenterId_key" ON "ProductionStatus"("workCenterId");

-- CreateIndex
CREATE INDEX "ProductionStatus_workCenterId_idx" ON "ProductionStatus"("workCenterId");

-- CreateIndex
CREATE INDEX "ProductionStatus_status_idx" ON "ProductionStatus"("status");

-- CreateIndex
CREATE INDEX "ProductionAlert_workCenterId_acknowledged_idx" ON "ProductionAlert"("workCenterId", "acknowledged");

-- CreateIndex
CREATE INDEX "ProductionAlert_severity_acknowledged_idx" ON "ProductionAlert"("severity", "acknowledged");

-- CreateIndex
CREATE INDEX "ProductionAlert_timestamp_idx" ON "ProductionAlert"("timestamp");

-- CreateIndex
CREATE UNIQUE INDEX "ProductionSchedule_scheduleNumber_key" ON "ProductionSchedule"("scheduleNumber");

-- CreateIndex
CREATE INDEX "ProductionSchedule_status_idx" ON "ProductionSchedule"("status");

-- CreateIndex
CREATE INDEX "ProductionSchedule_startDate_idx" ON "ProductionSchedule"("startDate");

-- AddForeignKey
ALTER TABLE "InspectionPlan" ADD CONSTRAINT "InspectionPlan_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InspectionCheckpoint" ADD CONSTRAINT "InspectionCheckpoint_inspectionPlanId_fkey" FOREIGN KEY ("inspectionPlanId") REFERENCES "InspectionPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InspectionResult" ADD CONSTRAINT "InspectionResult_inspectionPlanId_fkey" FOREIGN KEY ("inspectionPlanId") REFERENCES "InspectionPlan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InspectionResult" ADD CONSTRAINT "InspectionResult_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InspectionCheckpointResult" ADD CONSTRAINT "InspectionCheckpointResult_inspectionResultId_fkey" FOREIGN KEY ("inspectionResultId") REFERENCES "InspectionResult"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InspectionCheckpointResult" ADD CONSTRAINT "InspectionCheckpointResult_checkpointId_fkey" FOREIGN KEY ("checkpointId") REFERENCES "InspectionCheckpoint"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NonConformance" ADD CONSTRAINT "NonConformance_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NonConformance" ADD CONSTRAINT "NonConformance_inspectionResultId_fkey" FOREIGN KEY ("inspectionResultId") REFERENCES "InspectionResult"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CorrectiveAction" ADD CONSTRAINT "CorrectiveAction_nonConformanceId_fkey" FOREIGN KEY ("nonConformanceId") REFERENCES "NonConformance"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Candidate" ADD CONSTRAINT "Candidate_requisitionId_fkey" FOREIGN KEY ("requisitionId") REFERENCES "JobRequisition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Interview" ADD CONSTRAINT "Interview_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "Candidate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PerformanceReview" ADD CONSTRAINT "PerformanceReview_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CourseEnrollment" ADD CONSTRAINT "CourseEnrollment_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "LearningCourse"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CourseEnrollment" ADD CONSTRAINT "CourseEnrollment_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayrollItem" ADD CONSTRAINT "PayrollItem_payrollId_fkey" FOREIGN KEY ("payrollId") REFERENCES "Payroll"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayrollItem" ADD CONSTRAINT "PayrollItem_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeCertification" ADD CONSTRAINT "EmployeeCertification_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeDocument" ADD CONSTRAINT "EmployeeDocument_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Asset" ADD CONSTRAINT "Asset_parentAssetId_fkey" FOREIGN KEY ("parentAssetId") REFERENCES "Asset"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaintenancePlan" ADD CONSTRAINT "MaintenancePlan_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaintenanceTask" ADD CONSTRAINT "MaintenanceTask_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaintenanceTask" ADD CONSTRAINT "MaintenanceTask_planId_fkey" FOREIGN KEY ("planId") REFERENCES "MaintenancePlan"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaintenanceRecord" ADD CONSTRAINT "MaintenanceRecord_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "MaintenanceTask"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaintenanceRecord" ADD CONSTRAINT "MaintenanceRecord_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssetHealth" ADD CONSTRAINT "AssetHealth_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssetUtilization" ADD CONSTRAINT "AssetUtilization_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectCost" ADD CONSTRAINT "ProjectCost_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectEVM" ADD CONSTRAINT "ProjectEVM_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectInvoice" ADD CONSTRAINT "ProjectInvoice_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FactSales" ADD CONSTRAINT "FactSales_dateKey_fkey" FOREIGN KEY ("dateKey") REFERENCES "DimDate"("dateKey") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FactSales" ADD CONSTRAINT "FactSales_productKey_fkey" FOREIGN KEY ("productKey") REFERENCES "DimProduct"("productKey") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FactSales" ADD CONSTRAINT "FactSales_customerKey_fkey" FOREIGN KEY ("customerKey") REFERENCES "DimCustomer"("customerKey") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FactSales" ADD CONSTRAINT "FactSales_warehouseKey_fkey" FOREIGN KEY ("warehouseKey") REFERENCES "DimWarehouse"("warehouseKey") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FactSales" ADD CONSTRAINT "FactSales_employeeKey_fkey" FOREIGN KEY ("employeeKey") REFERENCES "DimEmployee"("employeeKey") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FactInventory" ADD CONSTRAINT "FactInventory_dateKey_fkey" FOREIGN KEY ("dateKey") REFERENCES "DimDate"("dateKey") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FactInventory" ADD CONSTRAINT "FactInventory_productKey_fkey" FOREIGN KEY ("productKey") REFERENCES "DimProduct"("productKey") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FactInventory" ADD CONSTRAINT "FactInventory_warehouseKey_fkey" FOREIGN KEY ("warehouseKey") REFERENCES "DimWarehouse"("warehouseKey") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FactPurchase" ADD CONSTRAINT "FactPurchase_dateKey_fkey" FOREIGN KEY ("dateKey") REFERENCES "DimDate"("dateKey") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FactPurchase" ADD CONSTRAINT "FactPurchase_productKey_fkey" FOREIGN KEY ("productKey") REFERENCES "DimProduct"("productKey") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FactPurchase" ADD CONSTRAINT "FactPurchase_supplierKey_fkey" FOREIGN KEY ("supplierKey") REFERENCES "DimSupplier"("supplierKey") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FactPurchase" ADD CONSTRAINT "FactPurchase_warehouseKey_fkey" FOREIGN KEY ("warehouseKey") REFERENCES "DimWarehouse"("warehouseKey") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FactProduction" ADD CONSTRAINT "FactProduction_dateKey_fkey" FOREIGN KEY ("dateKey") REFERENCES "DimDate"("dateKey") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FactProduction" ADD CONSTRAINT "FactProduction_productKey_fkey" FOREIGN KEY ("productKey") REFERENCES "DimProduct"("productKey") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FactProduction" ADD CONSTRAINT "FactProduction_warehouseKey_fkey" FOREIGN KEY ("warehouseKey") REFERENCES "DimWarehouse"("warehouseKey") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FactProduction" ADD CONSTRAINT "FactProduction_employeeKey_fkey" FOREIGN KEY ("employeeKey") REFERENCES "DimEmployee"("employeeKey") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FactFinancial" ADD CONSTRAINT "FactFinancial_dateKey_fkey" FOREIGN KEY ("dateKey") REFERENCES "DimDate"("dateKey") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FactHR" ADD CONSTRAINT "FactHR_dateKey_fkey" FOREIGN KEY ("dateKey") REFERENCES "DimDate"("dateKey") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FactHR" ADD CONSTRAINT "FactHR_employeeKey_fkey" FOREIGN KEY ("employeeKey") REFERENCES "DimEmployee"("employeeKey") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ETLJobLog" ADD CONSTRAINT "ETLJobLog_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "ETLJob"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KPIValue" ADD CONSTRAINT "KPIValue_kpiId_fkey" FOREIGN KEY ("kpiId") REFERENCES "KPIDefinition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReportExecution" ADD CONSTRAINT "ReportExecution_scheduledReportId_fkey" FOREIGN KEY ("scheduledReportId") REFERENCES "ScheduledReport"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SensorMetric" ADD CONSTRAINT "SensorMetric_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "IoTDevice"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PredictiveMaintenanceTask" ADD CONSTRAINT "PredictiveMaintenanceTask_equipmentHealthId_fkey" FOREIGN KEY ("equipmentHealthId") REFERENCES "EquipmentHealth"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Simulation" ADD CONSTRAINT "Simulation_digitalTwinId_fkey" FOREIGN KEY ("digitalTwinId") REFERENCES "DigitalTwin"("id") ON DELETE CASCADE ON UPDATE CASCADE;
