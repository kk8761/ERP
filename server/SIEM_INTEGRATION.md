# SIEM Integration Guide

## Overview

NexaERP includes comprehensive Security Information and Event Management (SIEM) integration that provides:

- **Structured Security Event Logging**: All security events are logged in a structured JSON format compatible with major SIEM platforms
- **Correlation IDs**: Every request is assigned a unique correlation ID for distributed tracing across services
- **Automatic Event Forwarding**: Security events can be automatically forwarded to external SIEM systems
- **Threat Detection**: Built-in detection for common attack patterns (SQL injection, XSS, path traversal)
- **Compliance Support**: Comprehensive audit trails for SOX, GDPR, HIPAA, and other regulatory requirements

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Express Application                      │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────────────────────────────────────────────┐  │
│  │         Correlation ID Middleware (First)             │  │
│  │  - Generates/extracts correlation ID                  │  │
│  │  - Adds X-Correlation-ID header to response          │  │
│  └──────────────────────────────────────────────────────┘  │
│                           ↓                                   │
│  ┌──────────────────────────────────────────────────────┐  │
│  │         Security Logging Middleware                   │  │
│  │  - Request Logger                                     │  │
│  │  - Authentication Logger                              │  │
│  │  - Authorization Logger                               │  │
│  │  - Suspicious Activity Detector                       │  │
│  └──────────────────────────────────────────────────────┘  │
│                           ↓                                   │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              SIEM Service                             │  │
│  │  - Event Queue Management                             │  │
│  │  - Structured Logging                                 │  │
│  │  - Batch Processing                                   │  │
│  │  - External SIEM Forwarding                           │  │
│  └──────────────────────────────────────────────────────┘  │
│                           ↓                                   │
│  ┌──────────────────────────────────────────────────────┐  │
│  │         Console (Structured JSON Logs)                │  │
│  └──────────────────────────────────────────────────────┘  │
│                           ↓                                   │
│  ┌──────────────────────────────────────────────────────┐  │
│  │    External SIEM (Splunk, ELK, Azure Sentinel)       │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

## Configuration

### Environment Variables

Add the following to your `.env` file:

```bash
# SIEM Integration Configuration
SIEM_ENABLED=true
SIEM_ENDPOINT=https://your-siem-endpoint.com/api/events
SIEM_API_KEY=your-siem-api-key
SIEM_BATCH_SIZE=100
SIEM_FLUSH_INTERVAL=5000
SIEM_RETRY_ATTEMPTS=3
SIEM_RETRY_DELAY=1000

# Service identification
SERVICE_NAME=nexaerp-backend
HOSTNAME=nexaerp-prod-01
```

### Configuration Options

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `SIEM_ENABLED` | Enable/disable SIEM forwarding | `false` | No |
| `SIEM_ENDPOINT` | SIEM endpoint URL | - | Yes (if enabled) |
| `SIEM_API_KEY` | Authentication token | - | Yes (if enabled) |
| `SIEM_BATCH_SIZE` | Events per batch | `100` | No |
| `SIEM_FLUSH_INTERVAL` | Flush interval (ms) | `5000` | No |
| `SIEM_RETRY_ATTEMPTS` | Retry attempts | `3` | No |
| `SIEM_RETRY_DELAY` | Retry delay (ms) | `1000` | No |
| `SERVICE_NAME` | Service identifier | `nexaerp-backend` | No |
| `HOSTNAME` | Host identifier | Auto-detected | No |

## Security Event Types

The system logs the following security event types:

### Authentication Events
- `AUTHENTICATION_SUCCESS` - Successful login
- `AUTHENTICATION_FAILURE` - Failed login attempt
- `MFA_ENABLED` - Multi-factor authentication enabled
- `MFA_DISABLED` - Multi-factor authentication disabled
- `MFA_VERIFICATION_SUCCESS` - MFA verification succeeded
- `MFA_VERIFICATION_FAILURE` - MFA verification failed
- `PASSWORD_CHANGE` - Password changed
- `PASSWORD_RESET_REQUESTED` - Password reset requested
- `PASSWORD_RESET_COMPLETED` - Password reset completed

### Authorization Events
- `AUTHORIZATION_FAILURE` - Access denied
- `PERMISSION_GRANTED` - Permission granted
- `PERMISSION_DENIED` - Permission denied
- `ROLE_ASSIGNED` - Role assigned to user
- `ROLE_REVOKED` - Role revoked from user

### Session Events
- `SESSION_CREATED` - New session created
- `SESSION_EXPIRED` - Session expired
- `SESSION_REVOKED` - Session manually revoked
- `ACCOUNT_LOCKED` - Account locked due to failed attempts
- `ACCOUNT_UNLOCKED` - Account unlocked

### Data Access Events
- `DATA_ACCESS` - Data accessed
- `DATA_MODIFICATION` - Data modified
- `DATA_DELETION` - Data deleted
- `SENSITIVE_DATA_ACCESS` - Sensitive data accessed (PII, financial)

### Security Events
- `SUSPICIOUS_ACTIVITY` - Suspicious activity detected
- `RATE_LIMIT_EXCEEDED` - Rate limit exceeded
- `INVALID_INPUT` - Invalid input detected
- `SQL_INJECTION_ATTEMPT` - SQL injection attempt
- `XSS_ATTEMPT` - Cross-site scripting attempt
- `CSRF_ATTEMPT` - Cross-site request forgery attempt
- `BRUTE_FORCE_ATTEMPT` - Brute force attack detected

### System Events
- `CONFIGURATION_CHANGE` - System configuration changed
- `ENCRYPTION_KEY_ROTATION` - Encryption key rotated
- `ENCRYPTION_FAILURE` - Encryption operation failed
- `DECRYPTION_FAILURE` - Decryption operation failed
- `SYSTEM_ERROR` - System error occurred
- `BACKUP_CREATED` - Backup created
- `BACKUP_RESTORED` - Backup restored
- `AUDIT_LOG_ACCESS` - Audit log accessed

## Structured Log Format

All security events are logged in the following structured JSON format:

```json
{
  "@timestamp": "2024-01-15T10:30:45.123Z",
  "event_id": "550e8400-e29b-41d4-a716-446655440000",
  "correlation_id": "req-123-456-789",
  "event_type": "AUTHENTICATION_SUCCESS",
  "severity": "INFO",
  "result": "SUCCESS",
  "message": "User test@example.com authenticated successfully",
  "user": {
    "id": "user-123",
    "username": "test@example.com"
  },
  "source": {
    "ip": "192.168.1.100",
    "user_agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"
  },
  "resource": "/api/auth/login",
  "action": "POST",
  "session_id": "session-abc-123",
  "tenant_id": "tenant-xyz",
  "location": {
    "country": "US",
    "city": "Seattle",
    "latitude": 47.6062,
    "longitude": -122.3321
  },
  "threat": {
    "type": "NONE",
    "score": 0,
    "indicators": []
  },
  "metadata": {
    "duration_ms": 145,
    "status_code": 200
  }
}
```

### Field Descriptions

| Field | Type | Description |
|-------|------|-------------|
| `@timestamp` | ISO 8601 | Event timestamp in UTC |
| `event_id` | UUID | Unique event identifier |
| `correlation_id` | String | Request correlation ID for tracing |
| `event_type` | Enum | Type of security event |
| `severity` | Enum | Event severity (CRITICAL, HIGH, MEDIUM, LOW, INFO) |
| `result` | Enum | Event result (SUCCESS, FAILURE) |
| `message` | String | Human-readable event description |
| `user.id` | String | User identifier |
| `user.username` | String | Username or email |
| `source.ip` | String | Client IP address |
| `source.user_agent` | String | Client user agent |
| `resource` | String | Resource path accessed |
| `action` | String | HTTP method or action type |
| `session_id` | String | Session identifier |
| `tenant_id` | String | Tenant identifier (multi-tenant) |
| `location` | Object | Geographic location data |
| `threat` | Object | Threat intelligence data |
| `metadata` | Object | Additional event-specific data |

## Correlation IDs

Every request is assigned a unique correlation ID that:

1. **Propagates across services**: The correlation ID is passed through all internal service calls
2. **Returned to clients**: Added to response headers as `X-Correlation-ID`
3. **Logged with all events**: Included in every security event for tracing
4. **Supports distributed tracing**: Can be used to trace requests across microservices

### Using Correlation IDs

```typescript
import { getCorrelationId } from './middleware/correlationId';

// In a controller or middleware
const correlationId = getCorrelationId(req);
console.log(`Processing request ${correlationId}`);
```

### Client-Side Correlation

Clients can provide their own correlation ID:

```bash
curl -H "X-Correlation-ID: client-generated-id" \
     https://api.nexaerp.com/api/users
```

## Threat Detection

The system includes built-in threat detection for:

### SQL Injection
Detects patterns like:
- `UNION SELECT`
- `OR 1=1`
- `DROP TABLE`
- `DELETE FROM`

### Cross-Site Scripting (XSS)
Detects patterns like:
- `<script>` tags
- `javascript:` protocol
- Event handlers (`onerror=`, `onload=`)

### Path Traversal
Detects patterns like:
- `../` sequences
- Absolute path references

### Suspicious User Agents
Detects known attack tools:
- sqlmap
- nikto
- nmap
- masscan
- metasploit

### Automatic Response

When critical threats are detected:
1. Event is logged with HIGH or CRITICAL severity
2. Request is blocked with 403 Forbidden
3. Alert is sent to SIEM system
4. Threat indicators are included in the log

## Integration with SIEM Platforms

### Splunk

Configure Splunk HTTP Event Collector (HEC):

```bash
SIEM_ENABLED=true
SIEM_ENDPOINT=https://splunk.example.com:8088/services/collector/event
SIEM_API_KEY=your-splunk-hec-token
```

### Elastic Stack (ELK)

Configure Elasticsearch bulk API:

```bash
SIEM_ENABLED=true
SIEM_ENDPOINT=https://elasticsearch.example.com:9200/_bulk
SIEM_API_KEY=your-elasticsearch-api-key
```

### Azure Sentinel

Configure Azure Monitor Data Collector API:

```bash
SIEM_ENABLED=true
SIEM_ENDPOINT=https://sentinel.azure.com/api/logs
SIEM_API_KEY=your-workspace-key
```

### Custom SIEM

For custom SIEM platforms, implement an endpoint that accepts:

**Request Format:**
```json
POST /api/events
Content-Type: application/json
Authorization: Bearer <api-key>

{
  "events": [
    {
      "@timestamp": "2024-01-15T10:30:45.123Z",
      "event_id": "...",
      "correlation_id": "...",
      ...
    }
  ]
}
```

**Response Format:**
```json
{
  "success": true,
  "received": 100
}
```

## Usage Examples

### Logging Custom Security Events

```typescript
import { siemService, SecurityEventType, SecuritySeverity } from './services/SIEMService';

// Log authentication success
siemService.logAuthenticationSuccess('user-123', 'test@example.com', {
  ipAddress: '192.168.1.1',
  userAgent: 'Mozilla/5.0',
  correlationId: 'req-123',
});

// Log authorization failure
siemService.logAuthorizationFailure('user-123', '/api/admin/users', 'DELETE', {
  username: 'test@example.com',
  ipAddress: '192.168.1.1',
  correlationId: 'req-123',
});

// Log suspicious activity
siemService.logSuspiciousActivity('Multiple failed login attempts', SecuritySeverity.HIGH, {
  userId: 'user-123',
  ipAddress: '192.168.1.1',
  threat: {
    type: 'BRUTE_FORCE',
    score: 85,
    indicators: ['5 failed attempts in 60 seconds'],
  },
});

// Log sensitive data access
siemService.logSensitiveDataAccess('user-123', '/api/users/passwords', 'READ', {
  ipAddress: '192.168.1.1',
  correlationId: 'req-123',
});

// Log configuration change
siemService.logConfigurationChange('admin-123', 'MAX_LOGIN_ATTEMPTS', 3, 5, {
  ipAddress: '192.168.1.1',
  correlationId: 'req-123',
});

// Log custom security event
siemService.logSecurityEvent(
  SecurityEventType.DATA_MODIFICATION,
  SecuritySeverity.MEDIUM,
  'SUCCESS',
  'User updated customer record',
  {
    userId: 'user-123',
    username: 'test@example.com',
    ipAddress: '192.168.1.1',
    resource: '/api/customers/456',
    action: 'PUT',
    correlationId: 'req-123',
    metadata: {
      customerId: '456',
      fieldsChanged: ['email', 'phone'],
    },
  }
);
```

### Using in Middleware

```typescript
import { siemService } from './services/SIEMService';
import { getCorrelationId } from './middleware/correlationId';

export const auditMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const correlationId = getCorrelationId(req);
  
  // Log data access
  siemService.logDataAccess(
    req.user?.userId || 'anonymous',
    req.path,
    req.method,
    {
      correlationId,
      ipAddress: req.socket.remoteAddress,
      userAgent: req.headers['user-agent'],
    }
  );
  
  next();
};
```

## Data Retention and Privacy

### Sensitive Data Sanitization

The SIEM service automatically sanitizes sensitive fields:

- `password`
- `token`
- `secret`
- `apiKey`
- `creditCard`
- `ssn`

These fields are replaced with `[REDACTED]` in logs.

### Custom Sanitization

To add custom sanitization rules, modify the `sanitizeMetadata` function in `SIEMService.ts`:

```typescript
private sanitizeMetadata(metadata?: Record<string, any>): Record<string, any> | undefined {
  if (!metadata) return undefined;

  const sanitized = { ...metadata };
  const sensitiveKeys = [
    'password',
    'token',
    'secret',
    // Add your custom sensitive fields here
    'customSensitiveField',
  ];

  for (const key of Object.keys(sanitized)) {
    if (sensitiveKeys.some((sensitive) => key.toLowerCase().includes(sensitive))) {
      sanitized[key] = '[REDACTED]';
    }
  }

  return sanitized;
}
```

## Performance Considerations

### Batching

Events are batched to reduce network overhead:
- Default batch size: 100 events
- Default flush interval: 5 seconds
- Critical events are flushed immediately

### Async Processing

Event forwarding is asynchronous and does not block request processing.

### Retry Logic

Failed SIEM forwarding attempts are retried with exponential backoff:
- Default retry attempts: 3
- Default retry delay: 1 second (increases with each retry)

### Memory Management

The event queue is limited to 10,000 events to prevent memory issues. Older events are dropped if the queue is full.

## Monitoring and Troubleshooting

### Enable Debug Logging

Set log level to debug:

```bash
LOG_LEVEL=debug
```

### Check SIEM Connection

Monitor console logs for SIEM forwarding status:

```
[SIEM] Successfully sent 100 events to SIEM
[SIEM] Failed to send events: Connection timeout
[SIEM] Retry attempt 1/3
```

### Verify Event Generation

Check that events are being logged:

```bash
# Filter security logs
grep '\[SECURITY\]' logs/app.log | jq .
```

### Test SIEM Endpoint

Test your SIEM endpoint manually:

```bash
curl -X POST https://your-siem-endpoint.com/api/events \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-api-key" \
  -d '{
    "events": [{
      "@timestamp": "2024-01-15T10:30:45.123Z",
      "event_type": "TEST_EVENT",
      "message": "Test event"
    }]
  }'
```

## Compliance and Audit

### SOX Compliance

The SIEM integration supports SOX compliance by:
- Logging all financial data access
- Tracking configuration changes
- Maintaining immutable audit trails
- Providing segregation of duties monitoring

### GDPR Compliance

The SIEM integration supports GDPR compliance by:
- Logging personal data access
- Tracking data modifications and deletions
- Providing audit trails for data subject requests
- Sanitizing sensitive personal data in logs

### HIPAA Compliance

The SIEM integration supports HIPAA compliance by:
- Logging all PHI access
- Tracking authentication and authorization
- Providing comprehensive audit trails
- Encrypting logs in transit and at rest

## Best Practices

1. **Enable SIEM in Production**: Always enable SIEM forwarding in production environments
2. **Use Correlation IDs**: Always include correlation IDs in custom logs
3. **Monitor Critical Events**: Set up alerts for CRITICAL and HIGH severity events
4. **Regular Review**: Review security logs regularly for suspicious patterns
5. **Test Integrations**: Test SIEM integration before deploying to production
6. **Secure API Keys**: Store SIEM API keys securely (use environment variables or secrets management)
7. **Configure Retention**: Configure appropriate log retention policies in your SIEM
8. **Monitor Performance**: Monitor SIEM forwarding performance and adjust batch sizes if needed

## Testing

Run SIEM integration tests:

```bash
cd server
npm test -- siem.test.ts
```

Test coverage includes:
- Structured logging format
- Correlation ID generation and propagation
- Threat detection (SQL injection, XSS, path traversal)
- Sensitive data sanitization
- Event batching and forwarding
- Retry logic

## Support

For issues or questions:
- Check logs for error messages
- Verify SIEM endpoint connectivity
- Review configuration settings
- Contact your SIEM platform support for endpoint-specific issues
