# Anomaly Detection Implementation

**Task 38.6**: Implement anomaly detection for detecting unusual access patterns, alerting on suspicious activities, and implementing automated responses.

## Overview

The Anomaly Detection system provides real-time detection of suspicious activities and unusual access patterns across the NexaERP platform. It uses statistical analysis and behavioral profiling to identify potential security threats and automatically responds based on severity.

## Features Implemented

### 1. Anomaly Detection Types

The system detects the following anomaly types:

#### Access Pattern Anomalies
- **Unusual Login Time**: Detects logins outside typical hours
- **Unusual IP Address**: Identifies access from new or unknown IP addresses
- **Unusual Location**: Detects access from unexpected geographic locations
- **Suspicious User Agent**: Identifies bot/scraper patterns and unusual clients

#### Attack Pattern Anomalies
- **Multiple Failed Logins**: Detects brute force attempts
- **Rapid Requests**: Identifies potential DDoS or bot attacks
- **Privilege Escalation**: Detects unauthorized access attempts
- **Data Exfiltration**: Identifies unusual data access patterns
- **Account Takeover**: Detects potential account compromise

### 2. User Behavior Profiling

The system builds behavioral profiles for each user based on:
- **Typical Login Hours**: Historical login time patterns
- **Typical IP Addresses**: Known IP addresses used by the user
- **Typical User Agents**: Known browsers/devices
- **Typical Resources Accessed**: Normal access patterns
- **Average Session Duration**: Normal session length
- **Average Requests Per Session**: Normal activity level

Profiles are:
- Built from 30 days of historical data
- Cached in Redis for 1 hour
- Automatically updated as user behavior evolves
- Require minimum 10 events to establish baseline

### 3. Anomaly Scoring

Each anomaly is assigned:
- **Score (0-100)**: Higher scores indicate more anomalous behavior
- **Severity Level**: CRITICAL, HIGH, MEDIUM, LOW
- **Recommended Action**: Suggested response to the anomaly

#### Scoring Thresholds
- **Unusual Login Time**: Score 75 (MEDIUM)
- **Unusual IP Address**: Score 85 (HIGH)
- **Suspicious User Agent**: Score 90 (HIGH)
- **Rapid Requests**: Score 95 (CRITICAL)
- **Multiple Failed Logins**: Score 90 (HIGH)
- **Data Exfiltration**: Score 100 (CRITICAL)
- **Privilege Escalation**: Score 95 (CRITICAL)

### 4. Automated Response System

The system automatically responds to detected anomalies based on severity:

#### CRITICAL Severity
- **Action**: Immediately lock user account for 24 hours
- **Notification**: Alert security team
- **Logging**: Log to SIEM with CRITICAL severity
- **Triggers**: Data exfiltration, privilege escalation, rapid requests

#### HIGH Severity
- **Action**: Require MFA for next login (1 hour)
- **Notification**: Notify user of suspicious activity
- **Logging**: Log to SIEM with HIGH severity
- **Triggers**: Unusual IP, multiple failed logins, suspicious user agent

#### MEDIUM Severity
- **Action**: Monitor user activity closely
- **Notification**: Log for security review
- **Logging**: Log to SIEM with MEDIUM severity
- **Triggers**: Unusual login time

#### LOW Severity
- **Action**: Log for analysis
- **Logging**: Log to SIEM with LOW severity

### 5. SIEM Integration

All detected anomalies are automatically logged to the SIEM system with:
- **Event Type**: Specific anomaly type
- **Category**: ANOMALY_DETECTED
- **Severity**: Mapped from anomaly severity
- **User Context**: User ID, IP address, user agent
- **Details**: Anomaly score, reason, recommended action
- **Correlation ID**: For tracking related events

## API Endpoints

### Analyze User Activity
```http
POST /api/anomaly-detection/analyze
Authorization: Bearer <token>
Content-Type: application/json

{
  "userId": "user-123",
  "ipAddress": "192.168.1.100",
  "userAgent": "Mozilla/5.0...",
  "resource": "/api/users",
  "action": "READ"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "anomaliesDetected": 2,
    "anomalies": [
      {
        "isAnomaly": true,
        "anomalyType": "UNUSUAL_LOGIN_TIME",
        "severity": "MEDIUM",
        "score": 75,
        "reason": "Login at unusual time: 3:00",
        "recommendedAction": "Verify user identity with MFA"
      }
    ]
  }
}
```

### Detect Failed Login Attempts
```http
POST /api/anomaly-detection/detect-failed-logins
Authorization: Bearer <token>
Content-Type: application/json

{
  "userId": "user-123",
  "ipAddress": "192.168.1.100"
}
```

### Detect Data Exfiltration
```http
POST /api/anomaly-detection/detect-data-exfiltration
Authorization: Bearer <token>
Content-Type: application/json

{
  "userId": "user-123",
  "recordsAccessed": 1500,
  "timeWindowMinutes": 10
}
```

### Detect Privilege Escalation
```http
POST /api/anomaly-detection/detect-privilege-escalation
Authorization: Bearer <token>
Content-Type: application/json

{
  "userId": "user-123",
  "attemptedAction": "DELETE",
  "attemptedResource": "/api/admin/users"
}
```

### Get Statistics
```http
GET /api/anomaly-detection/statistics?days=7
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "totalAnomalies": 45,
    "anomaliesByType": {
      "UNUSUAL_LOGIN_TIME": 15,
      "UNUSUAL_IP_ADDRESS": 10,
      "RAPID_REQUESTS": 5,
      "MULTIPLE_FAILED_LOGINS": 15
    },
    "anomaliesBySeverity": {
      "CRITICAL": 5,
      "HIGH": 20,
      "MEDIUM": 15,
      "LOW": 5
    },
    "topAffectedUsers": [
      { "userId": "user-123", "count": 10 },
      { "userId": "user-456", "count": 8 }
    ]
  }
}
```

### Update User Profile
```http
PUT /api/anomaly-detection/users/:userId/profile
Authorization: Bearer <token>
```

### Trigger Automated Response
```http
POST /api/anomaly-detection/respond
Authorization: Bearer <token>
Content-Type: application/json

{
  "userId": "user-123",
  "anomalyType": "DATA_EXFILTRATION",
  "severity": "CRITICAL",
  "reason": "Manual security review"
}
```

### Get Anomaly Metadata
```http
GET /api/anomaly-detection/metadata
Authorization: Bearer <token>
```

## Configuration

### Detection Thresholds

Thresholds can be configured in `AnomalyDetectionService`:

```typescript
private static readonly THRESHOLDS = {
  FAILED_LOGIN_ATTEMPTS: 5,           // Failed logins in 15 minutes
  RAPID_REQUESTS_PER_MINUTE: 100,     // Requests per minute
  UNUSUAL_TIME_SCORE: 70,             // Score threshold for unusual time
  UNUSUAL_LOCATION_SCORE: 80,         // Score threshold for unusual location
  DATA_EXFILTRATION_RECORDS: 1000,    // Records accessed in time window
  SESSION_DURATION_MULTIPLIER: 3,     // 3x normal session duration
};
```

### Profile Building

User profiles are built from:
- **Historical Period**: 30 days
- **Minimum Events**: 10 events required
- **Cache Duration**: 1 hour
- **Update Frequency**: On-demand or after significant changes

## Integration with Other Systems

### Zero-Trust Security
- Anomaly detection feeds into continuous authorization
- High-severity anomalies trigger additional MFA challenges
- Risk scores influence access decisions

### SIEM Integration
- All anomalies logged to SIEM in real-time
- Correlation IDs enable event tracking
- Structured logging for analysis

### Audit System
- All anomalies recorded in audit trail
- Automated responses logged
- User profile updates tracked

## Monitoring and Alerting

### Key Metrics to Monitor

1. **Anomaly Detection Rate**: Anomalies per hour/day
2. **False Positive Rate**: Anomalies that were legitimate
3. **Response Time**: Time from detection to response
4. **Top Anomaly Types**: Most common anomalies
5. **Top Affected Users**: Users with most anomalies
6. **Automated Response Rate**: Percentage of anomalies with automated response

### Alert Thresholds

- **CRITICAL**: Immediate alert to security team
- **HIGH**: Alert within 15 minutes
- **MEDIUM**: Daily digest
- **LOW**: Weekly report

## Testing

Comprehensive test suite covers:
- ✅ Unusual login time detection
- ✅ Unusual IP address detection
- ✅ Suspicious user agent detection
- ✅ Rapid requests detection
- ✅ Failed login attempts detection
- ✅ Data exfiltration detection
- ✅ Privilege escalation detection
- ✅ Automated response mechanisms
- ✅ Statistics generation
- ✅ User profile management

Run tests:
```bash
npm test -- anomaly-detection.test.ts
```

## Security Considerations

1. **Privacy**: User profiles stored in Redis with TTL
2. **Performance**: Caching prevents database overload
3. **Accuracy**: Minimum data requirements prevent false positives
4. **Transparency**: All actions logged and auditable
5. **Reversibility**: Account locks can be manually reversed

## Future Enhancements

1. **Machine Learning**: Train ML models on historical data
2. **Geolocation**: Add location-based anomaly detection
3. **Peer Comparison**: Compare user behavior to peer groups
4. **Adaptive Thresholds**: Automatically adjust thresholds based on environment
5. **Threat Intelligence**: Integrate with external threat feeds
6. **Behavioral Biometrics**: Analyze typing patterns, mouse movements
7. **Network Analysis**: Detect lateral movement and network anomalies

## Troubleshooting

### High False Positive Rate
- Review and adjust detection thresholds
- Increase minimum events for profile building
- Exclude known legitimate patterns (VPN IPs, scheduled jobs)

### Missed Anomalies
- Lower detection thresholds
- Reduce profile cache duration
- Add more anomaly detection types

### Performance Issues
- Increase Redis cache duration
- Batch profile updates
- Use async processing for non-critical checks

## Compliance

This implementation supports:
- **SOX**: Audit trail of all security events
- **GDPR**: User data privacy and retention policies
- **PCI DSS**: Fraud detection and prevention
- **HIPAA**: Access monitoring and anomaly detection
- **ISO 27001**: Security incident detection and response

## Task Completion

✅ **Task 38.6 Complete**: Anomaly detection system fully implemented with:
- Multiple anomaly detection types
- User behavior profiling
- Automated response system
- SIEM integration
- Comprehensive API
- Full test coverage
- Documentation

**Requirements Met**: Requirement 15.7 - Anomaly detection for unusual access patterns, suspicious activity alerts, and automated responses.
