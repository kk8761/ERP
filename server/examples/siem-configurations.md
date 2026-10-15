# SIEM Platform Configuration Examples

This document provides configuration examples for integrating NexaERP with popular SIEM platforms.

## Table of Contents

- [Splunk](#splunk)
- [Elastic Stack (ELK)](#elastic-stack-elk)
- [Azure Sentinel](#azure-sentinel)
- [AWS Security Hub](#aws-security-hub)
- [IBM QRadar](#ibm-qradar)
- [LogRhythm](#logrhythm)
- [Sumo Logic](#sumo-logic)
- [Datadog](#datadog)

---

## Splunk

### Setup

1. **Enable HTTP Event Collector (HEC)**
   - Navigate to Settings > Data Inputs > HTTP Event Collector
   - Click "New Token"
   - Name: `nexaerp-security-events`
   - Source type: `_json`
   - Index: `security` (or your preferred index)
   - Copy the token value

2. **Configure NexaERP**

```bash
# .env
SIEM_ENABLED=true
SIEM_ENDPOINT=https://splunk.example.com:8088/services/collector/event
SIEM_API_KEY=your-splunk-hec-token
SIEM_BATCH_SIZE=100
SIEM_FLUSH_INTERVAL=5000
```

### Splunk Query Examples

```spl
# All security events
index=security sourcetype=_json

# Authentication failures
index=security event_type=AUTHENTICATION_FAILURE

# High severity events
index=security severity=HIGH OR severity=CRITICAL

# Events by user
index=security user.username="test@example.com"

# Suspicious activity
index=security event_type=SUSPICIOUS_ACTIVITY

# Events with correlation ID
index=security correlation_id="req-123-456"

# Failed authorization attempts
index=security event_type=AUTHORIZATION_FAILURE
| stats count by user.username, resource
| sort -count

# Top attacked resources
index=security result=FAILURE
| stats count by resource
| sort -count
| head 10

# Geographic distribution of events
index=security
| stats count by location.country
| geostats latfield=location.latitude longfield=location.longitude count

# Timeline of security events
index=security
| timechart span=1h count by severity
```

### Splunk Dashboard

Create a dashboard with these panels:

1. **Security Event Volume**: Line chart of events over time
2. **Event Severity Distribution**: Pie chart of severity levels
3. **Top Users**: Table of users with most events
4. **Failed Authentication Attempts**: Counter with trend
5. **Suspicious Activity**: Table of recent suspicious events
6. **Geographic Map**: Map of event locations

---

## Elastic Stack (ELK)

### Setup

1. **Create Index Template**

```json
PUT _index_template/nexaerp-security
{
  "index_patterns": ["nexaerp-security-*"],
  "template": {
    "settings": {
      "number_of_shards": 1,
      "number_of_replicas": 1
    },
    "mappings": {
      "properties": {
        "@timestamp": { "type": "date" },
        "event_id": { "type": "keyword" },
        "correlation_id": { "type": "keyword" },
        "event_type": { "type": "keyword" },
        "severity": { "type": "keyword" },
        "result": { "type": "keyword" },
        "message": { "type": "text" },
        "user": {
          "properties": {
            "id": { "type": "keyword" },
            "username": { "type": "keyword" }
          }
        },
        "source": {
          "properties": {
            "ip": { "type": "ip" },
            "user_agent": { "type": "text" }
          }
        },
        "resource": { "type": "keyword" },
        "action": { "type": "keyword" },
        "location": {
          "properties": {
            "country": { "type": "keyword" },
            "city": { "type": "keyword" },
            "coordinates": { "type": "geo_point" }
          }
        },
        "threat": {
          "properties": {
            "type": { "type": "keyword" },
            "score": { "type": "integer" },
            "indicators": { "type": "keyword" }
          }
        }
      }
    }
  }
}
```

2. **Configure NexaERP**

```bash
# .env
SIEM_ENABLED=true
SIEM_ENDPOINT=https://elasticsearch.example.com:9200/nexaerp-security-events/_bulk
SIEM_API_KEY=your-elasticsearch-api-key
SIEM_BATCH_SIZE=100
SIEM_FLUSH_INTERVAL=5000
```

3. **Create API Key**

```bash
POST /_security/api_key
{
  "name": "nexaerp-siem",
  "role_descriptors": {
    "nexaerp-writer": {
      "cluster": ["monitor"],
      "index": [
        {
          "names": ["nexaerp-security-*"],
          "privileges": ["create_index", "write", "create"]
        }
      ]
    }
  }
}
```

### Kibana Query Examples

```
# All security events
event_type:*

# Authentication failures
event_type:AUTHENTICATION_FAILURE

# High severity events
severity:(HIGH OR CRITICAL)

# Events by user
user.username:"test@example.com"

# Suspicious activity
event_type:SUSPICIOUS_ACTIVITY

# Failed authorization with specific resource
event_type:AUTHORIZATION_FAILURE AND resource:"/api/admin/*"

# SQL injection attempts
threat.indicators:SQL_INJECTION

# Events from specific IP
source.ip:"192.168.1.100"

# Events with correlation ID
correlation_id:"req-123-456"
```

### Kibana Dashboard

Create visualizations:

1. **Event Timeline**: Area chart of events over time
2. **Severity Breakdown**: Donut chart of severity distribution
3. **Top Resources**: Data table of most accessed resources
4. **Failed Logins**: Metric showing failed authentication count
5. **Threat Map**: Coordinate map of threat locations
6. **User Activity**: Heat map of user activity by hour

---

## Azure Sentinel

### Setup

1. **Create Log Analytics Workspace**
   - Navigate to Azure Portal > Log Analytics workspaces
   - Create new workspace
   - Note the Workspace ID and Primary Key

2. **Configure Data Connector**
   - Navigate to Azure Sentinel > Data connectors
   - Add custom log connector
   - Configure log format as JSON

3. **Configure NexaERP**

```bash
# .env
SIEM_ENABLED=true
SIEM_ENDPOINT=https://<workspace-id>.ods.opinsights.azure.com/api/logs?api-version=2016-04-01
SIEM_API_KEY=<workspace-primary-key>
SIEM_BATCH_SIZE=100
SIEM_FLUSH_INTERVAL=5000
```

### KQL Query Examples

```kql
// All security events
NexaERPSecurityEvents_CL

// Authentication failures
NexaERPSecurityEvents_CL
| where event_type_s == "AUTHENTICATION_FAILURE"

// High severity events
NexaERPSecurityEvents_CL
| where severity_s in ("HIGH", "CRITICAL")

// Events by user
NexaERPSecurityEvents_CL
| where user_username_s == "test@example.com"

// Suspicious activity timeline
NexaERPSecurityEvents_CL
| where event_type_s == "SUSPICIOUS_ACTIVITY"
| summarize count() by bin(TimeGenerated, 1h)
| render timechart

// Failed authorization by resource
NexaERPSecurityEvents_CL
| where event_type_s == "AUTHORIZATION_FAILURE"
| summarize count() by resource_s
| order by count_ desc

// Threat indicators
NexaERPSecurityEvents_CL
| where isnotempty(threat_indicators_s)
| project TimeGenerated, user_username_s, source_ip_s, threat_type_s, threat_score_d

// Geographic distribution
NexaERPSecurityEvents_CL
| where isnotempty(location_country_s)
| summarize count() by location_country_s
| render piechart
```

### Azure Sentinel Workbook

Create a workbook with:

1. **Overview**: Key metrics and trends
2. **Authentication**: Login success/failure rates
3. **Authorization**: Access denied events
4. **Threats**: Detected threats and indicators
5. **Users**: User activity and anomalies
6. **Resources**: Most accessed resources

---

## AWS Security Hub

### Setup

1. **Enable Security Hub**
   - Navigate to AWS Security Hub
   - Enable Security Hub in your region

2. **Create Custom Action**
   - Navigate to Settings > Custom actions
   - Create action for NexaERP events

3. **Configure NexaERP**

```bash
# .env
SIEM_ENABLED=true
SIEM_ENDPOINT=https://securityhub.<region>.amazonaws.com/findings
SIEM_API_KEY=<aws-access-key>:<aws-secret-key>
SIEM_BATCH_SIZE=100
SIEM_FLUSH_INTERVAL=5000

# AWS Configuration
AWS_REGION=us-east-1
AWS_ACCOUNT_ID=123456789012
```

### CloudWatch Insights Queries

```
# All security events
fields @timestamp, event_type, severity, message
| filter @message like /SECURITY/
| sort @timestamp desc

# Authentication failures
fields @timestamp, user.username, source.ip, message
| filter event_type = "AUTHENTICATION_FAILURE"
| stats count() by user.username

# High severity events
fields @timestamp, event_type, message
| filter severity in ["HIGH", "CRITICAL"]
| sort @timestamp desc

# Suspicious activity
fields @timestamp, user.username, threat.type, threat.score
| filter event_type = "SUSPICIOUS_ACTIVITY"
| sort threat.score desc
```

---

## IBM QRadar

### Setup

1. **Configure Log Source**
   - Navigate to Admin > Log Sources
   - Add log source: Generic JSON
   - Protocol: HTTP Receiver
   - Note the endpoint URL

2. **Configure NexaERP**

```bash
# .env
SIEM_ENABLED=true
SIEM_ENDPOINT=https://qradar.example.com:8443/api/siem/events
SIEM_API_KEY=your-qradar-api-token
SIEM_BATCH_SIZE=100
SIEM_FLUSH_INTERVAL=5000
```

### AQL Query Examples

```sql
-- All security events
SELECT * FROM events WHERE "Log Source" = 'NexaERP'

-- Authentication failures
SELECT username, sourceip, eventcount 
FROM events 
WHERE "Log Source" = 'NexaERP' 
  AND "Event Type" = 'AUTHENTICATION_FAILURE'
GROUP BY username, sourceip

-- High severity events
SELECT * FROM events 
WHERE "Log Source" = 'NexaERP' 
  AND severity IN ('HIGH', 'CRITICAL')
ORDER BY starttime DESC

-- Top attacked resources
SELECT resource, COUNT(*) as attack_count
FROM events
WHERE "Log Source" = 'NexaERP'
  AND result = 'FAILURE'
GROUP BY resource
ORDER BY attack_count DESC
LIMIT 10
```

---

## LogRhythm

### Setup

1. **Add Log Source**
   - Navigate to Deployment Manager > System Monitors
   - Add new log source: Flat File - JSON
   - Configure log path

2. **Configure NexaERP**

```bash
# .env
SIEM_ENABLED=true
SIEM_ENDPOINT=https://logrhythm.example.com:8443/api/events
SIEM_API_KEY=your-logrhythm-api-key
SIEM_BATCH_SIZE=100
SIEM_FLUSH_INTERVAL=5000
```

### LogRhythm Search Examples

```
# Authentication failures
Classification:"Authentication Failure" AND Origin:"NexaERP"

# High severity events
Priority:(High OR Critical) AND Origin:"NexaERP"

# Suspicious activity
CommonEvent:"Suspicious Activity" AND Origin:"NexaERP"

# Failed authorization
Classification:"Authorization Failure" AND Origin:"NexaERP"
```

---

## Sumo Logic

### Setup

1. **Create HTTP Source**
   - Navigate to Manage Data > Collection
   - Add HTTP Source
   - Copy the HTTP Source URL

2. **Configure NexaERP**

```bash
# .env
SIEM_ENABLED=true
SIEM_ENDPOINT=https://collectors.sumologic.com/receiver/v1/http/<unique-id>
SIEM_API_KEY=  # Not required for HTTP source
SIEM_BATCH_SIZE=100
SIEM_FLUSH_INTERVAL=5000
```

### Sumo Logic Query Examples

```
# All security events
_sourceCategory=nexaerp/security

# Authentication failures
_sourceCategory=nexaerp/security
| json field=_raw "event_type" as event_type
| where event_type = "AUTHENTICATION_FAILURE"

# High severity events
_sourceCategory=nexaerp/security
| json field=_raw "severity" as severity
| where severity in ("HIGH", "CRITICAL")

# Events by user
_sourceCategory=nexaerp/security
| json field=_raw "user.username" as username
| count by username
| sort by _count desc

# Threat timeline
_sourceCategory=nexaerp/security
| json field=_raw "event_type" as event_type, "threat.score" as threat_score
| where event_type = "SUSPICIOUS_ACTIVITY"
| timeslice 1h
| count by _timeslice
| sort by _timeslice
```

---

## Datadog

### Setup

1. **Create API Key**
   - Navigate to Organization Settings > API Keys
   - Create new API key
   - Copy the key value

2. **Configure NexaERP**

```bash
# .env
SIEM_ENABLED=true
SIEM_ENDPOINT=https://http-intake.logs.datadoghq.com/v1/input
SIEM_API_KEY=your-datadog-api-key
SIEM_BATCH_SIZE=100
SIEM_FLUSH_INTERVAL=5000
```

### Datadog Query Examples

```
# All security events
source:nexaerp service:security

# Authentication failures
source:nexaerp event_type:AUTHENTICATION_FAILURE

# High severity events
source:nexaerp severity:(HIGH OR CRITICAL)

# Events by user
source:nexaerp @user.username:test@example.com

# Suspicious activity
source:nexaerp event_type:SUSPICIOUS_ACTIVITY

# Failed authorization
source:nexaerp event_type:AUTHORIZATION_FAILURE
| group by @resource
| sort -count
```

### Datadog Dashboard

Create a dashboard with:

1. **Event Stream**: Real-time security events
2. **Severity Distribution**: Pie chart of severity levels
3. **Authentication Metrics**: Success/failure rates
4. **Top Users**: List of most active users
5. **Threat Map**: Geographic distribution of threats
6. **Resource Access**: Heat map of resource access patterns

---

## Testing SIEM Integration

### Test Event Generation

```bash
# Send test event
curl -X POST http://localhost:5000/api/test/siem \
  -H "Content-Type: application/json" \
  -d '{
    "event_type": "TEST_EVENT",
    "message": "Test SIEM integration"
  }'
```

### Verify Event Delivery

1. Check application logs for SIEM forwarding status
2. Query your SIEM platform for test events
3. Verify event format and field mapping
4. Test alert rules and notifications

### Common Issues

**Events not appearing in SIEM:**
- Verify SIEM_ENABLED=true
- Check SIEM endpoint URL
- Verify API key/authentication
- Check network connectivity
- Review application logs for errors

**Incorrect field mapping:**
- Verify SIEM platform field mapping configuration
- Check index template (Elasticsearch)
- Review log source configuration (Splunk, QRadar)

**Performance issues:**
- Adjust SIEM_BATCH_SIZE
- Increase SIEM_FLUSH_INTERVAL
- Monitor network latency
- Check SIEM platform ingestion limits

---

## Best Practices

1. **Start with Test Environment**: Test SIEM integration in non-production first
2. **Monitor Performance**: Track event delivery rates and latency
3. **Set Up Alerts**: Configure alerts for critical security events
4. **Regular Review**: Review SIEM dashboards regularly
5. **Tune Detection Rules**: Adjust threat detection rules based on false positives
6. **Document Configuration**: Keep SIEM configuration documented
7. **Test Failover**: Test SIEM failover and retry mechanisms
8. **Secure API Keys**: Store SIEM API keys securely

---

## Support

For platform-specific issues, consult:
- Splunk: https://docs.splunk.com/
- Elastic: https://www.elastic.co/guide/
- Azure Sentinel: https://docs.microsoft.com/azure/sentinel/
- AWS Security Hub: https://docs.aws.amazon.com/securityhub/
- IBM QRadar: https://www.ibm.com/docs/en/qradar-common
- LogRhythm: https://docs.logrhythm.com/
- Sumo Logic: https://help.sumologic.com/
- Datadog: https://docs.datadoghq.com/
