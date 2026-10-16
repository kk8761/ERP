# Notification Preferences - User Guide

## Overview

The Notification Preferences system allows users to customize how and when they receive notifications from NexaERP. This guide explains how to configure notification preferences through the API.

## Features

### 1. Channel Selection per Event Type

Choose which notification channels to receive for each type of event:

**Available Channels**:
- 📧 **Email** - Receive notifications via email
- 📱 **SMS** - Receive notifications via text message  
- 🔔 **In-App** - See notifications within the application
- 📲 **Push** - Receive push notifications on mobile devices

**Event Types**:
- Order events (created, shipped, delivered, cancelled)
- Inventory alerts (low stock, out of stock)
- Approval requests (pending, granted, rejected)
- Financial events (invoices, payments)
- System notifications (maintenance, security)

### 2. Do-Not-Disturb (DND) Schedules

Set quiet hours when you don't want to be disturbed:

**Configuration Options**:
- ⏰ **Time Range**: Define start and end times (e.g., 22:00 to 08:00)
- 📅 **Days Selection**: Choose which days DND applies (weekdays, weekends, or specific days)
- 🚨 **Urgent Override**: Critical notifications still get through during DND

**Use Cases**:
- Nighttime quiet hours (10 PM - 8 AM)
- Weekend do-not-disturb
- Working hours only (9 AM - 5 PM notifications)
- Vacation mode (24/7 DND)

### 3. Digest Notifications

Batch multiple notifications into a single summary:

**Digest Types**:
- 📊 **Daily Digest**: Receive a summary once per day
- 📈 **Weekly Digest**: Receive a summary once per week

**Configuration**:
- Choose delivery time
- Choose delivery day (for weekly)
- Select which event types to include

## API Reference

### Base URL
```
/api/notifications/preferences
```

All endpoints require authentication via `Authorization: Bearer <token>` header.

---

## Endpoint Details

### 1. Get All Preferences

```http
GET /api/notifications/preferences
```

Returns all notification preferences for the authenticated user.

**Response Example**:
```json
{
  "success": true,
  "data": [
    {
      "id": "pref-uuid-1",
      "userId": "user-uuid",
      "eventType": "order_created",
      "enableEmail": true,
      "enableSMS": false,
      "enableInApp": true,
      "enablePush": true,
      "channels": ["email", "in_app", "push"],
      "dndEnabled": false,
      "dndStartTime": null,
      "dndEndTime": null,
      "dndDays": [],
      "digestEnabled": false,
      "digestFrequency": "daily",
      "digestTime": null,
      "digestDay": null,
      "createdAt": "2024-01-15T10:00:00Z",
      "updatedAt": "2024-01-15T10:00:00Z"
    },
    {
      "id": "pref-uuid-2",
      "userId": "user-uuid",
      "eventType": "low_stock",
      "channels": ["email", "sms", "in_app"],
      ...
    }
  ]
}
```

---

### 2. Get Preference for Specific Event

```http
GET /api/notifications/preferences?eventType=order_created
```

Returns preference configuration for a specific event type.

**Query Parameters**:
- `eventType` (required) - The event type to query

**Response Example**:
```json
{
  "success": true,
  "data": {
    "id": "pref-uuid",
    "userId": "user-uuid",
    "eventType": "order_created",
    "channels": ["email", "in_app"],
    "enableEmail": true,
    "enableSMS": false,
    "enableInApp": true,
    "enablePush": false,
    "dndEnabled": true,
    "dndStartTime": "22:00",
    "dndEndTime": "08:00",
    "dndDays": ["monday", "tuesday", "wednesday", "thursday", "friday"],
    ...
  }
}
```

---

### 3. Update Preference for Event Type

```http
PUT /api/notifications/preferences/:eventType
Content-Type: application/json
```

Creates or updates preference for a specific event type.

**URL Parameters**:
- `eventType` - The event type to configure

**Request Body**:
```json
{
  "enableEmail": true,
  "enableSMS": true,
  "enableInApp": true,
  "enablePush": false,
  "channels": ["email", "sms", "in_app"],
  "dndEnabled": false,
  "digestEnabled": false
}
```

**Response Example**:
```json
{
  "success": true,
  "data": {
    "id": "pref-uuid",
    "eventType": "order_created",
    "channels": ["email", "sms", "in_app"],
    ...
  },
  "message": "Preferences updated successfully"
}
```

---

### 4. Delete Preference

```http
DELETE /api/notifications/preferences/:eventType
```

Removes preference configuration for an event type (reverts to defaults).

**URL Parameters**:
- `eventType` - The event type preference to delete

**Response Example**:
```json
{
  "success": true,
  "message": "Preference deleted successfully"
}
```

---

### 5. Set Global DND Schedule

```http
POST /api/notifications/preferences/dnd
Content-Type: application/json
```

Configure a global do-not-disturb schedule that applies to all events.

**Request Body**:
```json
{
  "enabled": true,
  "startTime": "22:00",
  "endTime": "08:00",
  "days": ["monday", "tuesday", "wednesday", "thursday", "friday"]
}
```

**Time Format**: HH:MM (24-hour format)  
**Valid Days**: monday, tuesday, wednesday, thursday, friday, saturday, sunday

**Response Example**:
```json
{
  "success": true,
  "data": {
    "id": "pref-uuid",
    "eventType": "global",
    "dndEnabled": true,
    "dndStartTime": "22:00",
    "dndEndTime": "08:00",
    "dndDays": ["monday", "tuesday", "wednesday", "thursday", "friday"],
    ...
  },
  "message": "DND schedule updated successfully"
}
```

---

### 6. Get Global DND Schedule

```http
GET /api/notifications/preferences/dnd
```

Retrieve the current global DND configuration.

**Response Example**:
```json
{
  "success": true,
  "data": {
    "enabled": true,
    "startTime": "22:00",
    "endTime": "08:00",
    "days": ["monday", "tuesday", "wednesday", "thursday", "friday"]
  }
}
```

If no DND is configured:
```json
{
  "success": true,
  "data": null
}
```

---

### 7. Check DND Status

```http
GET /api/notifications/preferences/dnd-status
GET /api/notifications/preferences/dnd-status?eventType=order_created
```

Check if the user is currently in a do-not-disturb period.

**Query Parameters**:
- `eventType` (optional) - Check DND for specific event type

**Response Example**:
```json
{
  "success": true,
  "data": {
    "inDND": true
  }
}
```

---

### 8. Bulk Update Channels

```http
POST /api/notifications/preferences/bulk-channels
Content-Type: application/json
```

Update notification channels for multiple event types in one request.

**Request Body**:
```json
{
  "updates": [
    {
      "eventType": "order_created",
      "channels": ["email", "in_app"]
    },
    {
      "eventType": "order_shipped",
      "channels": ["email", "sms", "in_app"]
    },
    {
      "eventType": "low_stock",
      "channels": ["email", "sms", "in_app", "push"]
    }
  ]
}
```

**Response Example**:
```json
{
  "success": true,
  "data": [
    {
      "id": "pref-uuid-1",
      "eventType": "order_created",
      "channels": ["email", "in_app"],
      ...
    },
    {
      "id": "pref-uuid-2",
      "eventType": "order_shipped",
      "channels": ["email", "sms", "in_app"],
      ...
    },
    ...
  ],
  "message": "Channels updated successfully"
}
```

---

### 9. Reset Preferences

```http
POST /api/notifications/preferences/reset
Content-Type: application/json
```

Reset preferences to default values.

**Request Body**:
```json
{
  "eventType": "order_created"
}
```

To reset ALL preferences, omit the `eventType`:
```json
{}
```

**Response Example**:
```json
{
  "success": true,
  "message": "Preferences reset to defaults"
}
```

---

## Usage Examples

### Example 1: Configure Email Only for Orders

```javascript
// Set preference to receive order notifications via email only
await fetch('/api/notifications/preferences/order_created', {
  method: 'PUT',
  headers: {
    'Authorization': 'Bearer YOUR_TOKEN',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    enableEmail: true,
    enableSMS: false,
    enableInApp: true,
    enablePush: false,
    channels: ['email', 'in_app']
  })
});
```

### Example 2: Set Nighttime DND

```javascript
// Configure DND from 10 PM to 8 AM on weeknights
await fetch('/api/notifications/preferences/dnd', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer YOUR_TOKEN',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    enabled: true,
    startTime: '22:00',
    endTime: '08:00',
    days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday']
  })
});
```

### Example 3: Weekend Do-Not-Disturb

```javascript
// Disable notifications all weekend
await fetch('/api/notifications/preferences/dnd', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer YOUR_TOKEN',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    enabled: true,
    startTime: '00:00',
    endTime: '23:59',
    days: ['saturday', 'sunday']
  })
});
```

### Example 4: Configure Multiple Events at Once

```javascript
// Set up channels for multiple event types
await fetch('/api/notifications/preferences/bulk-channels', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer YOUR_TOKEN',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    updates: [
      {
        eventType: 'order_created',
        channels: ['email', 'in_app']
      },
      {
        eventType: 'order_shipped',
        channels: ['email', 'sms', 'in_app']
      },
      {
        eventType: 'order_delivered',
        channels: ['in_app']
      },
      {
        eventType: 'low_stock',
        channels: ['email', 'sms', 'in_app']
      },
      {
        eventType: 'approval_needed',
        channels: ['email', 'in_app', 'push']
      }
    ]
  })
});
```

### Example 5: Enable Daily Digest

```javascript
// Configure daily digest at 9 AM
await fetch('/api/notifications/preferences/digest_notifications', {
  method: 'PUT',
  headers: {
    'Authorization': 'Bearer YOUR_TOKEN',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    digestEnabled: true,
    digestFrequency: 'daily',
    digestTime: '09:00',
    channels: ['email']
  })
});
```

### Example 6: Check if Currently in DND

```javascript
// Check if user is currently in DND period
const response = await fetch('/api/notifications/preferences/dnd-status', {
  headers: {
    'Authorization': 'Bearer YOUR_TOKEN'
  }
});

const data = await response.json();
if (data.data.inDND) {
  console.log('User is currently in do-not-disturb mode');
} else {
  console.log('User can receive notifications now');
}
```

---

## Common Scenarios

### Scenario 1: Business Hours Only

Configure to only receive notifications during business hours:

```json
{
  "enabled": true,
  "startTime": "17:00",
  "endTime": "09:00",
  "days": ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]
}
```

This creates DND from 5 PM to 9 AM every day, effectively allowing notifications only during 9 AM - 5 PM.

### Scenario 2: Critical Alerts Only Outside Hours

1. Set global DND for non-business hours
2. Configure critical events (like security alerts) with all channels
3. System automatically overrides DND for urgent priority notifications

```javascript
// Set DND
await setDND({ enabled: true, startTime: '17:00', endTime: '09:00', days: [...] });

// Configure security alerts with all channels
await updatePreference('security_alert', {
  channels: ['email', 'sms', 'in_app', 'push']
});
```

When a security alert is created with priority "urgent", it will bypass DND and deliver to all channels.

### Scenario 3: Email Only for Important, In-App for Everything

```javascript
// Important events get email + in-app
const importantEvents = ['order_created', 'payment_received', 'approval_needed'];
for (const event of importantEvents) {
  await updatePreference(event, {
    channels: ['email', 'in_app']
  });
}

// Less important events get in-app only
const normalEvents = ['order_status_update', 'system_notification'];
for (const event of normalEvents) {
  await updatePreference(event, {
    channels: ['in_app']
  });
}
```

### Scenario 4: Vacation Mode

Completely disable all notifications except critical emergencies:

```javascript
// Set 24/7 DND
await fetch('/api/notifications/preferences/dnd', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer YOUR_TOKEN',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    enabled: true,
    startTime: '00:00',
    endTime: '23:59',
    days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
  })
});
```

Urgent notifications will still get through, but everything else will be in-app only (which user won't see while on vacation).

---

## Default Behavior

If no preferences are configured:

1. **Channel Selection**: In-app only
2. **DND**: Disabled
3. **Digest**: Disabled
4. **Urgent Priority**: Always delivers to all available channels regardless of preferences

---

## Notification Priority Levels

The system respects four priority levels:

| Priority | DND Behavior | Channels |
|----------|--------------|----------|
| **Urgent** | Bypasses DND | All configured channels |
| **High** | Bypasses DND | All configured channels |
| **Normal** | Respects DND | User preferences or in-app only during DND |
| **Low** | Respects DND | User preferences or in-app only during DND |

---

## Best Practices

### 1. Start with Defaults

Don't configure preferences for everything immediately. Start with the most important event types.

### 2. Use Bulk Updates

When configuring multiple events, use the bulk update endpoint for efficiency.

### 3. Test Your DND Schedule

After setting DND, use the `/dnd-status` endpoint to verify it's working as expected.

### 4. Consider Time Zones

All times are in the server's timezone. Make sure to convert times appropriately if your server is in a different timezone.

### 5. Don't Disable All Channels

Always keep at least in-app notifications enabled to ensure you don't miss critical information.

### 6. Review Periodically

Review your notification preferences quarterly to ensure they still meet your needs.

---

## Troubleshooting

### Problem: Not Receiving Notifications

**Check**:
1. Verify channels are enabled for that event type
2. Check if you're currently in DND period (`/dnd-status`)
3. Verify notification priority (low priority respects DND)
4. Check that at least one channel is enabled

### Problem: Receiving Too Many Notifications

**Solutions**:
1. Enable digest mode for non-critical events
2. Set up DND for quiet hours
3. Reduce channels for less important events
4. Switch some events to in-app only

### Problem: Missing Urgent Notifications During DND

**Check**:
1. Verify notification priority is set to "urgent"
2. Check email/SMS delivery logs
3. Verify contact information (email/phone) is correct

### Problem: DND Not Working

**Check**:
1. Verify DND is enabled: `GET /preferences/dnd`
2. Check time format is correct (HH:MM)
3. Verify current day is in dndDays array
4. Use `/dnd-status` to check current status

---

## Frontend UI Recommendations

### Preference Settings Page

Recommended UI structure:

```
Notification Preferences
├── General Settings
│   ├── Email Notifications [Toggle]
│   ├── SMS Notifications [Toggle]
│   ├── In-App Notifications [Toggle]
│   └── Push Notifications [Toggle]
│
├── Event-Specific Settings
│   ├── Orders
│   │   ├── Order Created [Channel Checkboxes]
│   │   ├── Order Shipped [Channel Checkboxes]
│   │   └── Order Delivered [Channel Checkboxes]
│   ├── Inventory
│   │   ├── Low Stock Alert [Channel Checkboxes]
│   │   └── Out of Stock Alert [Channel Checkboxes]
│   └── Approvals
│       ├── Approval Needed [Channel Checkboxes]
│       └── Approval Granted [Channel Checkboxes]
│
├── Do Not Disturb
│   ├── Enable DND [Toggle]
│   ├── Start Time [Time Picker]
│   ├── End Time [Time Picker]
│   └── Active Days [Day Checkboxes]
│
└── Digest Settings
    ├── Enable Digest [Toggle]
    ├── Frequency [Daily/Weekly Radio]
    ├── Delivery Time [Time Picker]
    └── Delivery Day [Dropdown - for weekly]
```

### Quick Actions

Provide quick actions for common configurations:
- "Mute for 1 hour"
- "Weekend mode"
- "Vacation mode"
- "Work hours only"
- "Reset to defaults"

---

## Rate Limits

Currently no rate limits are enforced on preference endpoints, but bulk updates are recommended for efficiency.

---

## Support

For issues or questions:
- Check this documentation first
- Review API error messages for specific validation errors
- Contact system administrator for database or configuration issues

---

**Last Updated**: January 2025  
**API Version**: 2.0  
**Status**: Production Ready ✅
