# Zero-Trust Security Implementation

## Overview

This document describes the implementation of zero-trust security for NexaERP, completing **Task 38.1: Implement zero-trust security** from the comprehensive ERP enhancement specification.

## Zero-Trust Principles

The implementation follows these core zero-trust principles:

1. **Never trust, always verify** - Every request is authenticated and authorized
2. **Verify explicitly** - Authentication and authorization on every request
3. **Use least privilege access** - Users only get the minimum permissions needed
4. **Assume breach** - Design with the assumption that the network is already compromised
5. **Verify device trust** - Assess device trustworthiness before granting access

## Implementation Components

### 1. Zero-Trust Middleware (`zero-trust.middleware.ts`)

#### `enforceZeroTrustAuth`
Enforces authentication on EVERY request with the following checks:

- **User Authentication**: Verifies user is authenticated
- **Session Validity**: Confirms session is still valid in database
- **Device Trust Verification**: Calculates device trust score (0-100)
- **Risk Score Calculation**: Assesses request risk based on multiple factors
- **Trust Thresholds**: Enforces minimum trust scores
- **MFA Requirements**: Requires MFA for high-risk requests
- **Security Event Logging**: Logs all verification attempts

**Device Trust Score Factors:**
- Device is registered (40 points)
- Recent device usage (20 points)
- IP address matches known IP (20 points)
- Explicitly trusted by user (20 points)

**Risk Score Factors:**
- Blocked IP address (30 points)
- Unusual access pattern (25 points)
- Rapid requests (20 points)
- Unusual time of access (15 points)
- Suspicious user agent (10 points)

#### `enforceContinuousAuthorization`
Re-validates permissions on every request:

- **Real-time Permission Check**: No caching, always checks current permissions
- **User Account Status**: Verifies account is active and not locked
- **Unauthorized Access Logging**: Logs all failed authorization attempts
- **Success Logging**: Tracks successful authorizations for audit

### 2. Device Trust Service (`device-trust.service.ts`)

#### DeviceTrustService
Manages trusted devices and device verification:

**Methods:**
- `generateDeviceFingerprint()` - Creates unique device identifier from browser characteristics
- `verifyDeviceTrust()` - Verifies device and calculates trust score
- `calculateDeviceTrustScore()` - Computes trust score based on multiple factors
- `registerDevice()` - Registers a new trusted device
- `trustDevice()` - Marks device as explicitly trusted
- `untrustDevice()` - Revokes trust for a device
- `removeDevice()` - Removes device from trusted list
- `getUserDevices()` - Gets all devices for a user
- `cleanupOldDevices()` - Removes devices not used in 90+ days

#### IPBlockingService
Manages IP address blocking:

**Methods:**
- `isIPBlocked()` - Checks if IP is blocked (with Redis caching)
- `blockIP()` - Blocks an IP address
- `unblockIP()` - Unblocks an IP address
- `getBlockedIPs()` - Gets all blocked IPs
- `cleanupExpiredBlocks()` - Removes expired IP blocks

#### SecurityEventService
Logs and analyzes security events:

**Methods:**
- `logEvent()` - Logs a security event
- `getUserEvents()` - Gets security events for a user
- `getFailedAccessAttempts()` - Counts failed access attempts
- `detectAnomalies()` - Detects anomalous activity patterns
- `cleanupOldEvents()` - Removes events older than 90 days

**Anomaly Detection:**
- Multiple failed attempts (>10 in 24 hours)
- Access from multiple IPs (>5 in 24 hours)
- High-risk score events (>5 with risk score >70)

### 3. Database Models (Prisma Schema)

#### TrustedDevice
Tracks devices that have been verified and trusted:

```prisma
model TrustedDevice {
  id              String   @id @default(uuid())
  deviceId        String   @unique // SHA-256 hash of device fingerprint
  userId          String
  deviceName      String?  // User-friendly name
  ipAddress       String
  userAgent       String
  isTrusted       Boolean  @default(false)
  trustScore      Int      @default(0) // 0-100
  lastUsedAt      DateTime @default(now())
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
}
```

#### BlockedIP
Tracks blocked IP addresses:

```prisma
model BlockedIP {
  id              String   @id @default(uuid())
  ipAddress       String   @unique
  reason          String
  blockedBy       String   // User ID or "system"
  blockedAt       DateTime @default(now())
  expiresAt       DateTime? // Optional expiry
  isActive        Boolean  @default(true)
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
}
```

#### SecurityEvent
Comprehensive security event logging:

```prisma
model SecurityEvent {
  id              String   @id @default(uuid())
  userId          String
  eventType       String   // Event type
  resource        String?  // Resource being accessed
  action          String?  // Action being performed
  ipAddress       String
  deviceId        String?
  deviceTrustScore Int?
  riskScore       Int?
  success         Boolean  @default(true)
  errorMessage    String?
  metadata        Json?
  timestamp       DateTime @default(now())
}
```

#### UserLockStatus
Tracks account lock status:

```prisma
model UserLockStatus {
  id              String   @id @default(uuid())
  userId          String   @unique
  failedAttempts  Int      @default(0)
  lockedUntil     DateTime?
  lastFailedAt    DateTime?
  lockReason      String?
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
}
```

### 4. API Endpoints (`device-trust.routes.ts`)

#### User Device Management
- `GET /api/device-trust/devices` - Get all trusted devices
- `POST /api/device-trust/devices/register` - Register current device
- `PUT /api/device-trust/devices/:deviceId/trust` - Mark device as trusted
- `PUT /api/device-trust/devices/:deviceId/untrust` - Revoke device trust
- `DELETE /api/device-trust/devices/:deviceId` - Remove device
- `GET /api/device-trust/current` - Get current device trust status

#### Security Events
- `GET /api/device-trust/events` - Get security events
- `GET /api/device-trust/anomalies` - Detect anomalous activity

#### Admin: IP Blocking
- `GET /api/device-trust/admin/blocked-ips` - Get blocked IPs (Admin only)
- `POST /api/device-trust/admin/blocked-ips` - Block IP (Admin only)
- `DELETE /api/device-trust/admin/blocked-ips/:ipAddress` - Unblock IP (Admin only)

## Usage Examples

### 1. Applying Zero-Trust to Routes

```typescript
import { enforceZeroTrustAuth, enforceContinuousAuthorization } from './middleware/zero-trust.middleware';

// Apply zero-trust authentication to all routes
router.use(enforceZeroTrustAuth);

// Apply continuous authorization to specific routes
router.get('/sensitive-data', 
  enforceContinuousAuthorization('sensitive-data', 'read'),
  getSensitiveData
);
```

### 2. Registering a Device

```typescript
// Client-side: Register current device
const response = await fetch('/api/device-trust/devices/register', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    deviceName: 'My Laptop'
  })
});
```

### 3. Checking Device Trust

```typescript
// Get current device trust status
const response = await fetch('/api/device-trust/current', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});

const { data } = await response.json();
console.log('Trust Score:', data.trustScore);
console.log('Is Trusted:', data.isTrusted);
console.log('Requires Verification:', data.requiresVerification);
```

### 4. Viewing Security Events

```typescript
// Get recent security events
const response = await fetch('/api/device-trust/events?limit=50', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});

const { data } = await response.json();
data.forEach(event => {
  console.log(`${event.eventType}: ${event.success ? 'Success' : 'Failed'}`);
});
```

### 5. Detecting Anomalies

```typescript
// Check for anomalous activity
const response = await fetch('/api/device-trust/anomalies', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});

const { data } = await response.json();
data.forEach(anomaly => {
  console.log(`${anomaly.type} (${anomaly.severity}): ${anomaly.message}`);
});
```

## Security Event Types

The system logs the following security event types:

- `ZERO_TRUST_VERIFICATION` - Zero-trust authentication verification
- `CONTINUOUS_AUTHORIZATION_SUCCESS` - Successful continuous authorization
- `CONTINUOUS_AUTHORIZATION_FAILURE` - Failed continuous authorization
- `UNAUTHORIZED_ACCESS_ATTEMPT` - Unauthorized access attempt
- `DEVICE_REGISTERED` - Device registered
- `DEVICE_TRUSTED` - Device marked as trusted
- `DEVICE_UNTRUSTED` - Device trust revoked
- `DEVICE_REMOVED` - Device removed
- `MFA_REQUIRED` - MFA required for high-risk request
- `MFA_VERIFIED` - MFA successfully verified
- `IP_BLOCKED` - IP address blocked
- `IP_UNBLOCKED` - IP address unblocked

## Trust Score Thresholds

### Device Trust Thresholds
- **HIGH**: 80+ (Full access)
- **MEDIUM**: 50-79 (Normal access)
- **LOW**: 30-49 (Limited access, may require MFA)
- **BLOCKED**: <30 (Access denied, device registration required)

### Risk Score Thresholds
- **LOW**: 0-29 (Normal access)
- **MEDIUM**: 30-59 (Normal access with monitoring)
- **HIGH**: 60-79 (MFA required)
- **CRITICAL**: 80-100 (Access denied or MFA required)

## Integration with Existing Systems

### 1. Session Management
Zero-trust integrates with the existing session management system:

```typescript
import { SessionService } from '../config/session';

// Verify session validity
const sessionValid = await SessionService.verifySession(userId, sessionId);
```

### 2. RBAC Integration
Continuous authorization uses the existing RBAC system:

```typescript
import { checkUserPermission } from '../middleware/rbac.middleware';

// Check permission in real-time
const hasPermission = await checkUserPermission(userId, action, resource);
```

### 3. MFA Integration
Zero-trust requires MFA for high-risk requests:

```typescript
import { MFAService } from '../services/mfa.service';

// Verify MFA
const mfaValid = await MFAService.verifyMFA(userId, code);
```

## Maintenance Tasks

### Scheduled Cleanup Jobs

Add these to your cron scheduler:

```typescript
import { DeviceTrustService, IPBlockingService, SecurityEventService } from './services/device-trust.service';

// Daily: Clean up old devices (not used in 90+ days)
schedule.scheduleJob('0 2 * * *', async () => {
  const count = await DeviceTrustService.cleanupOldDevices();
  console.log(`Cleaned up ${count} old devices`);
});

// Daily: Clean up expired IP blocks
schedule.scheduleJob('0 3 * * *', async () => {
  const count = await IPBlockingService.cleanupExpiredBlocks();
  console.log(`Cleaned up ${count} expired IP blocks`);
});

// Weekly: Clean up old security events (>90 days)
schedule.scheduleJob('0 4 * * 0', async () => {
  const count = await SecurityEventService.cleanupOldEvents();
  console.log(`Cleaned up ${count} old security events`);
});
```

## Performance Considerations

### Redis Caching
The implementation uses Redis caching to optimize performance:

- **Blocked IP checks**: Cached for 5 minutes
- **MFA verification**: Cached for 15 minutes
- **Device trust scores**: Recalculated on each request (no caching for security)

### Database Indexes
Ensure these indexes exist for optimal performance:

```sql
-- TrustedDevice indexes
CREATE INDEX idx_trusted_device_user_id ON "TrustedDevice"("userId");
CREATE INDEX idx_trusted_device_device_id ON "TrustedDevice"("deviceId");
CREATE INDEX idx_trusted_device_last_used ON "TrustedDevice"("lastUsedAt");

-- BlockedIP indexes
CREATE INDEX idx_blocked_ip_address ON "BlockedIP"("ipAddress");
CREATE INDEX idx_blocked_ip_active ON "BlockedIP"("isActive");
CREATE INDEX idx_blocked_ip_expires ON "BlockedIP"("expiresAt");

-- SecurityEvent indexes
CREATE INDEX idx_security_event_user_id ON "SecurityEvent"("userId");
CREATE INDEX idx_security_event_type ON "SecurityEvent"("eventType");
CREATE INDEX idx_security_event_timestamp ON "SecurityEvent"("timestamp");
CREATE INDEX idx_security_event_success ON "SecurityEvent"("success");
CREATE INDEX idx_security_event_risk_score ON "SecurityEvent"("riskScore");
```

## Testing

### Unit Tests
Test the zero-trust middleware and services:

```typescript
describe('Zero-Trust Security', () => {
  describe('Device Trust', () => {
    it('should calculate device trust score correctly', async () => {
      // Test device trust score calculation
    });
    
    it('should register new device', async () => {
      // Test device registration
    });
  });
  
  describe('Risk Score', () => {
    it('should calculate risk score correctly', async () => {
      // Test risk score calculation
    });
    
    it('should detect suspicious activity', async () => {
      // Test anomaly detection
    });
  });
  
  describe('Continuous Authorization', () => {
    it('should re-validate permissions on every request', async () => {
      // Test continuous authorization
    });
  });
});
```

### Integration Tests
Test the complete zero-trust flow:

```typescript
describe('Zero-Trust Integration', () => {
  it('should enforce zero-trust on protected routes', async () => {
    // Test zero-trust enforcement
  });
  
  it('should require MFA for high-risk requests', async () => {
    // Test MFA requirement
  });
  
  it('should block access from untrusted devices', async () => {
    // Test device blocking
  });
});
```

## Compliance

This implementation supports compliance with:

- **NIST 800-207**: Zero Trust Architecture
- **GDPR**: Data protection and privacy
- **SOX**: Financial data security
- **PCI DSS**: Payment card data security
- **HIPAA**: Healthcare data security

## Monitoring and Alerting

### Key Metrics to Monitor

1. **Failed Authentication Rate**: Track failed zero-trust verifications
2. **Device Trust Score Distribution**: Monitor average trust scores
3. **Risk Score Distribution**: Track high-risk requests
4. **MFA Challenge Rate**: Monitor MFA requirement frequency
5. **Blocked IP Count**: Track blocked IP addresses
6. **Anomaly Detection Rate**: Monitor detected anomalies

### Alert Thresholds

- **Critical**: >10 failed attempts from same user in 5 minutes
- **High**: >5 high-risk requests from same IP in 1 hour
- **Medium**: >3 anomalies detected for same user in 24 hours
- **Low**: Device trust score <30 for registered device

## Future Enhancements

1. **Machine Learning**: Use ML to improve risk score calculation
2. **Behavioral Biometrics**: Add typing patterns and mouse movements
3. **Geolocation**: Use IP geolocation for risk assessment
4. **Device Reputation**: Integrate with device reputation services
5. **Threat Intelligence**: Integrate with threat intelligence feeds
6. **Adaptive Authentication**: Dynamically adjust authentication requirements

## References

- [NIST Zero Trust Architecture (SP 800-207)](https://csrc.nist.gov/publications/detail/sp/800-207/final)
- [Zero Trust Security Model](https://www.nist.gov/publications/zero-trust-architecture)
- [Requirement 15.2: Zero-Trust Security](../../.Nexa Core Engineering Team/specs/comprehensive-erp-enhancement/requirements.md#requirement-15-enterprise-security-architecture)

## Task Completion

This implementation completes **Task 38.1: Implement zero-trust security** with the following deliverables:

✅ Enforce authentication on every request
✅ Implement continuous authorization
✅ Add device trust verification
✅ Comprehensive security event logging
✅ IP blocking and management
✅ Anomaly detection
✅ API endpoints for device management
✅ Database models for zero-trust data
✅ Documentation and usage examples

**Requirements Met**: Requirement 15.2 - Zero-trust security with comprehensive threat protection
