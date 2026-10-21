# Governance, Risk & Compliance (GRC) Module Implementation

## Overview

This document describes the implementation of the GRC module for NexaERP, specifically Task 27.1: Implement Risk Management. The module provides enterprise-grade risk management capabilities including risk identification, assessment, mitigation tracking, and visualization through heat maps.

## Implementation Summary

### Requirements Addressed

**Requirement 14.1**: WHEN risks are identified, THE System SHALL record likelihood, impact, and calculate risk scores
- ✅ Risk model with likelihood (1-5) and impact (1-5) fields
- ✅ Automatic risk score calculation (likelihood × impact)
- ✅ Risk scores range from 1-25

**Requirement 14.2**: WHEN risk mitigations are created, THE System SHALL track actions, owners, and due dates
- ✅ Mitigation model with action, owner, and due date fields
- ✅ Mitigation status tracking (planned, in_progress, completed, cancelled)
- ✅ Effectiveness tracking (0-100%)

### Architecture

The implementation follows the monolithic MVC pattern established in the project:

```
server/src/
├── models/
│   └── GRC.ts                    # TypeScript models for Risk, Compliance, Audit
├── services/
│   └── grc.service.ts            # Business logic for GRC operations
├── controllers/
│   └── grc.controller.ts         # HTTP request handlers
├── routes/
│   └── grc.routes.ts             # API route definitions
├── views/pages/
│   ├── grc-risks.ejs             # Risk list view
│   └── grc-risk-heatmap.ejs      # Risk heat map visualization
└── tests/
    └── grc.test.ts               # Unit tests for GRC service
```

## Features Implemented

### 1. Risk Management

#### Risk Model
```typescript
interface RiskItem {
  id: string;
  riskNumber: string;              // Auto-generated: RISK-YYYY-NNNN
  title: string;
  description: string;
  category: RiskCategory;          // operational, financial, strategic, etc.
  likelihood: number;              // 1-5
  impact: number;                  // 1-5
  riskScore: number;               // likelihood × impact (1-25)
  owner: string;
  status: RiskStatus;              // identified, assessed, mitigating, monitoring, closed
  mitigations: Mitigation[];
  identifiedDate: Date;
  lastAssessmentDate?: Date;
}
```

#### Risk Categories
- Operational
- Financial
- Strategic
- Compliance
- Reputational
- Cybersecurity

#### Risk Scoring
- **Likelihood Scale (1-5)**:
  - 1: Very Low (Rare)
  - 2: Low (Unlikely)
  - 3: Medium (Possible)
  - 4: High (Likely)
  - 5: Very High (Almost Certain)

- **Impact Scale (1-5)**:
  - 1: Very Low (Negligible)
  - 2: Low (Minor)
  - 3: Medium (Moderate)
  - 4: High (Major)
  - 5: Very High (Catastrophic)

- **Risk Score = Likelihood × Impact (1-25)**:
  - 1-6: Low Risk (Green)
  - 7-12: Medium Risk (Yellow)
  - 13-19: High Risk (Orange)
  - 20-25: Critical Risk (Red)

### 2. Mitigation Tracking

#### Mitigation Model
```typescript
interface Mitigation {
  id: string;
  action: string;                  // Description of mitigation action
  owner: string;                   // User ID responsible
  ownerName?: string;
  dueDate: Date;
  status: MitigationStatus;        // planned, in_progress, completed, cancelled
  effectiveness?: number;          // 0-100%
  completedDate?: Date;
  notes?: string;
}
```

#### Mitigation Workflow
1. Risk is identified → Status: "identified"
2. Risk is assessed → Status: "assessed"
3. Mitigation is added → Status: "mitigating"
4. Mitigation is tracked → Status: "monitoring"
5. Risk is resolved → Status: "closed"

### 3. Risk Heat Map

The heat map provides a visual representation of risk distribution:
- 5×5 matrix (Likelihood × Impact)
- Color-coded by risk level
- Interactive cells showing risk count
- Click to view risks in each cell
- Filterable by category and status

### 4. Risk Statistics

The system calculates comprehensive risk statistics:
- Total risk count
- Risks by category
- Risks by status
- Risks by level (low, medium, high, critical)
- Average risk score

## API Endpoints

### Risk Management

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/grc/risks` | Get all risks with optional filtering |
| GET | `/api/grc/risks/statistics` | Get risk statistics |
| GET | `/api/grc/risks/heatmap` | Get risk heat map data |
| GET | `/api/grc/risks/:id` | Get risk by ID |
| POST | `/api/grc/risks` | Create new risk |
| PUT | `/api/grc/risks/:id/assess` | Update risk assessment |
| PUT | `/api/grc/risks/:id/status` | Update risk status |
| DELETE | `/api/grc/risks/:id` | Delete risk |
| POST | `/api/grc/risks/:id/mitigations` | Add mitigation to risk |
| PUT | `/api/grc/risks/:id/mitigations/:mitigationId` | Update mitigation |

### Compliance Management

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/grc/compliance` | Create compliance requirement |

### Audit Management

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/grc/audits` | Create audit plan |

## View Routes

| Route | Description |
|-------|-------------|
| `/grc/risks` | Risk list view with filters and statistics |
| `/grc/risks/heatmap` | Interactive risk heat map |
| `/grc/risks/new` | Create new risk form |
| `/grc/risks/:id` | Risk detail view |
| `/grc/risks/:id/edit` | Edit risk form |
| `/grc/compliance` | Compliance requirements list |
| `/grc/audits` | Audit plans list |

## Database Schema

### RiskItem Table
```sql
CREATE TABLE "RiskItem" (
  id                  UUID PRIMARY KEY,
  riskNumber          VARCHAR(100) UNIQUE,
  title               VARCHAR(255),
  description         TEXT,
  category            VARCHAR(50),
  likelihood          INTEGER,
  impact              INTEGER,
  riskScore           INTEGER,
  owner               VARCHAR(255),
  ownerName           VARCHAR(255),
  status              VARCHAR(50),
  mitigations         JSONB,
  identifiedDate      TIMESTAMP,
  lastAssessmentDate  TIMESTAMP,
  notes               TEXT,
  createdAt           TIMESTAMP DEFAULT NOW(),
  updatedAt           TIMESTAMP,
  createdBy           VARCHAR(255),
  updatedBy           VARCHAR(255)
);
```

### Indexes
- `(category, status)` - For filtering by category and status
- `(owner)` - For filtering by owner
- `(riskScore)` - For sorting by risk score
- `(status)` - For filtering by status

## Usage Examples

### Creating a Risk

```typescript
POST /api/grc/risks
{
  "title": "Data Breach Risk",
  "description": "Potential unauthorized access to customer data",
  "category": "cybersecurity",
  "likelihood": 4,
  "impact": 5,
  "owner": "user-id-123",
  "ownerName": "John Doe",
  "notes": "High priority - requires immediate attention"
}

Response:
{
  "success": true,
  "message": "Risk created successfully",
  "data": {
    "id": "uuid",
    "riskNumber": "RISK-2024-0001",
    "riskScore": 20,  // 4 × 5 = 20 (Critical)
    "status": "identified",
    ...
  }
}
```

### Assessing a Risk

```typescript
PUT /api/grc/risks/:id/assess
{
  "likelihood": 3,
  "impact": 4
}

Response:
{
  "success": true,
  "message": "Risk assessed successfully",
  "data": {
    "riskScore": 12,  // 3 × 4 = 12 (Medium)
    "status": "assessed",
    "lastAssessmentDate": "2024-01-15T10:30:00Z",
    ...
  }
}
```

### Adding a Mitigation

```typescript
POST /api/grc/risks/:id/mitigations
{
  "action": "Implement multi-factor authentication",
  "owner": "security-team-lead-id",
  "ownerName": "Jane Smith",
  "dueDate": "2024-02-15",
  "notes": "Priority 1 - Critical security control"
}

Response:
{
  "success": true,
  "message": "Mitigation added successfully",
  "data": {
    "status": "mitigating",
    "mitigations": [
      {
        "id": "mitigation-uuid",
        "action": "Implement multi-factor authentication",
        "status": "planned",
        ...
      }
    ],
    ...
  }
}
```

### Getting Risk Heat Map

```typescript
GET /api/grc/risks/heatmap

Response:
{
  "success": true,
  "data": {
    "matrix": [
      [1, 2, 0, 1, 0],  // Likelihood 1
      [0, 3, 1, 2, 0],  // Likelihood 2
      [1, 1, 4, 1, 1],  // Likelihood 3
      [0, 2, 2, 3, 1],  // Likelihood 4
      [0, 0, 1, 2, 2]   // Likelihood 5
    ],
    "risks": {
      "3-3": [/* array of risks with likelihood 3, impact 3 */],
      "4-4": [/* array of risks with likelihood 4, impact 4 */],
      ...
    }
  }
}
```

## Testing

The implementation includes comprehensive unit tests covering:
- Risk creation with automatic score calculation
- Likelihood and impact validation (1-5 range)
- Risk assessment and score recalculation
- Mitigation tracking and status updates
- Heat map generation
- Risk statistics calculation
- Filtering by category, status, and risk score

Run tests:
```bash
cd server
npm test -- grc.test.ts
```

## Future Enhancements (Tasks 27.2-27.4)

The current implementation focuses on Task 27.1 (Risk Management). Future tasks will add:

### Task 27.2: Compliance Management
- Compliance requirement tracking
- Control effectiveness assessment
- Evidence management
- Compliance status reporting

### Task 27.3: Audit Management
- Audit planning and scheduling
- Audit finding tracking
- Remediation management
- Audit reporting

### Task 27.4: Compliance Reporting
- SOX compliance reports
- GDPR compliance reports
- Custom compliance reports
- Regulatory submission support

## Integration Points

The GRC module integrates with:
- **User Management**: Risk and mitigation owners
- **Audit Log**: All GRC operations are audited
- **RBAC**: Permission-based access control
- **Notification Service**: Alerts for high-risk items and overdue mitigations
- **Workflow Engine**: Automated risk review workflows

## Security Considerations

- All API endpoints require authentication
- RBAC controls access to GRC functions
- Audit trail for all risk modifications
- Field-level security for sensitive risk data
- Encryption at rest for risk information

## Performance Considerations

- Indexed database queries for fast filtering
- Efficient heat map calculation
- Cached statistics for dashboard
- Pagination support for large risk lists

## Compliance & Standards

The implementation follows:
- ISO 31000 (Risk Management)
- COSO ERM Framework
- NIST Risk Management Framework
- SOX compliance requirements
- GDPR data protection requirements

## Conclusion

The GRC Risk Management module provides a comprehensive, enterprise-grade solution for identifying, assessing, and mitigating organizational risks. The implementation follows the established monolithic architecture pattern and integrates seamlessly with existing NexaERP modules.
