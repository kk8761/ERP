# Razorpay Payment Gateway Integration

## Overview

This document describes the Razorpay payment gateway integration with coupon code system for NexaERP.

## Features

### Payment Processing
- Create Razorpay orders
- Verify payment signatures
- Capture authorized payments
- Process refunds (full or partial)
- Fetch payment details

### Coupon System
- **Free Coupons**: 100% discount
- **Percentage Coupons**: 10%, 20%, 50% off with optional max discount
- **Fixed Amount Coupons**: Fixed discount amount
- Minimum order amount requirements
- Usage limits and tracking
- Product/category-specific coupons
- Validity date ranges

## Setup

### 1. Get Razorpay Credentials

1. Sign up at [Razorpay Dashboard](https://dashboard.razorpay.com/)
2. Navigate to Settings → API Keys
3. Generate API keys (Key ID and Key Secret)
4. Copy the credentials

### 2. Configure Environment Variables

Add to your `.env` file:

```env
RAZORPAY_KEY_ID=rzp_test_xxxxxxxxxx
RAZORPAY_KEY_SECRET=your_secret_key
RAZORPAY_WEBHOOK_SECRET=your_webhook_secret
```

**Note**: Use test credentials (`rzp_test_`) for development and live credentials (`rzp_live_`) for production.

### 3. Initialize Payment Gateway

The payment gateway is automatically initialized on server startup if credentials are configured.

## API Endpoints

### Payment Endpoints

#### Create Order
```http
POST /api/industry/payments/orders
Content-Type: application/json

{
  "amount": 1000,
  "currency": "INR",
  "orderId": "ORD-2024-001",
  "notes": {
    "customerId": "CUST-123"
  }
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "id": "order_xyz123",
    "amount": 100000,
    "currency": "INR",
    "receipt": "ORD-2024-001",
    "status": "created"
  }
}
```

#### Verify Payment
```http
POST /api/industry/payments/verify
Content-Type: application/json

{
  "razorpayOrderId": "order_xyz123",
  "razorpayPaymentId": "pay_abc456",
  "razorpaySignature": "signature_hash"
}
```

**Response**:
```json
{
  "success": true,
  "message": "Payment verified successfully"
}
```

#### Capture Payment
```http
POST /api/industry/payments/capture
Content-Type: application/json

{
  "paymentId": "pay_abc456",
  "amount": 1000,
  "currency": "INR"
}
```

#### Refund Payment
```http
POST /api/industry/payments/refund
Content-Type: application/json

{
  "paymentId": "pay_abc456",
  "amount": 500
}
```

#### Get Payment Details
```http
GET /api/industry/payments/pay_abc456
```

### Coupon Endpoints

#### Create Coupon
```http
POST /api/industry/payments/coupons
Content-Type: application/json

{
  "code": "SAVE20",
  "type": "percentage",
  "discountValue": 20,
  "description": "20% off on all products",
  "minOrderAmount": 500,
  "maxDiscountAmount": 200,
  "usageLimit": 100,
  "validFrom": "2024-01-01T00:00:00Z",
  "validUntil": "2024-12-31T23:59:59Z",
  "isActive": true
}
```

**Coupon Types**:
- `free`: 100% discount (discountValue must be 100)
- `percentage`: Percentage discount (discountValue: 0-100)
- `fixed`: Fixed amount discount

#### Apply Coupon
```http
POST /api/industry/payments/coupons/apply
Content-Type: application/json

{
  "couponCode": "SAVE20",
  "orderAmount": 1000,
  "customerId": "CUST-123",
  "productIds": ["PROD-1", "PROD-2"],
  "categoryIds": ["CAT-1"]
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "valid": true,
    "discountAmount": 200,
    "finalAmount": 800,
    "message": "Coupon applied successfully"
  }
}
```

#### Get Active Coupons
```http
GET /api/industry/payments/coupons/active
```

#### Deactivate Coupon
```http
PUT /api/industry/payments/coupons/{couponId}/deactivate
```

#### Get Coupon Usage History
```http
GET /api/industry/payments/coupons/{couponId}/usage
```

### Combined Payment with Coupon

Process payment with automatic coupon application:

```http
POST /api/industry/payments/process-with-coupon
Content-Type: application/json

{
  "orderId": "ORD-2024-001",
  "originalAmount": 1000,
  "currency": "INR",
  "couponCode": "SAVE20",
  "customerId": "CUST-123",
  "customerEmail": "customer@example.com",
  "customerPhone": "+919876543210",
  "productIds": ["PROD-1", "PROD-2"],
  "categoryIds": ["CAT-1"]
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "razorpayOrder": {
      "id": "order_xyz123",
      "amount": 80000,
      "currency": "INR"
    },
    "discountAmount": 200,
    "finalAmount": 800,
    "couponApplied": true
  }
}
```

## Frontend Integration

### 1. Load Razorpay Checkout Script

```html
<script src="https://checkout.razorpay.com/v1/checkout.js"></script>
```

### 2. Create Order and Open Checkout

```javascript
async function processPayment() {
  try {
    // Step 1: Create order with coupon
    const response = await fetch('/api/industry/payments/process-with-coupon', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        orderId: 'ORD-2024-001',
        originalAmount: 1000,
        currency: 'INR',
        couponCode: 'SAVE20',
        customerId: 'CUST-123',
        customerEmail: 'customer@example.com',
        customerPhone: '+919876543210'
      })
    });

    const { data } = await response.json();
    const { razorpayOrder, discountAmount, finalAmount } = data;

    // Step 2: Open Razorpay Checkout
    const options = {
      key: 'rzp_test_xxxxxxxxxx', // Your Razorpay Key ID
      amount: razorpayOrder.amount,
      currency: razorpayOrder.currency,
      name: 'NexaERP',
      description: `Order ${razorpayOrder.receipt}`,
      order_id: razorpayOrder.id,
      handler: async function(response) {
        // Step 3: Verify payment
        await verifyPayment(response);
      },
      prefill: {
        email: 'customer@example.com',
        contact: '+919876543210'
      },
      theme: {
        color: '#3399cc'
      }
    };

    const rzp = new Razorpay(options);
    rzp.open();

  } catch (error) {
    console.error('Payment error:', error);
  }
}

async function verifyPayment(response) {
  try {
    const result = await fetch('/api/industry/payments/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        razorpayOrderId: response.razorpay_order_id,
        razorpayPaymentId: response.razorpay_payment_id,
        razorpaySignature: response.razorpay_signature
      })
    });

    const data = await result.json();
    
    if (data.success) {
      alert('Payment successful!');
      // Update order status, redirect to success page, etc.
    } else {
      alert('Payment verification failed!');
    }
  } catch (error) {
    console.error('Verification error:', error);
  }
}
```

## Coupon Validation Rules

The system validates coupons based on:

1. **Active Status**: Coupon must be active
2. **Validity Dates**: Current date must be between validFrom and validUntil
3. **Usage Limit**: Total usage must not exceed usageLimit
4. **Minimum Order**: Order amount must meet minOrderAmount
5. **Product Applicability**: If specified, order must contain applicable products
6. **Category Applicability**: If specified, order must contain products from applicable categories

## Security

### Payment Signature Verification

All Razorpay payments are verified using HMAC-SHA256 signature:

```typescript
const text = `${razorpayOrderId}|${razorpayPaymentId}`;
const expectedSignature = crypto
  .createHmac('sha256', razorpayKeySecret)
  .update(text)
  .digest('hex');

return expectedSignature === razorpaySignature;
```

### Best Practices

1. **Never expose Key Secret**: Keep it in environment variables only
2. **Always verify signatures**: Verify all payment callbacks
3. **Use HTTPS**: Always use HTTPS in production
4. **Validate amounts**: Verify amounts on server-side
5. **Log transactions**: Maintain audit logs for all transactions
6. **Handle webhooks**: Implement webhook handlers for payment events

## Webhook Configuration

### 1. Configure Webhook URL

In Razorpay Dashboard:
1. Go to Settings → Webhooks
2. Add webhook URL: `https://yourdomain.com/api/industry/payments/webhook`
3. Select events: `payment.captured`, `payment.failed`, `refund.created`
4. Copy the webhook secret

### 2. Implement Webhook Handler

```typescript
app.post('/api/industry/payments/webhook', (req, res) => {
  const webhookSignature = req.headers['x-razorpay-signature'];
  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;

  // Verify webhook signature
  const expectedSignature = crypto
    .createHmac('sha256', webhookSecret)
    .update(JSON.stringify(req.body))
    .digest('hex');

  if (webhookSignature === expectedSignature) {
    const event = req.body.event;
    const payload = req.body.payload;

    switch (event) {
      case 'payment.captured':
        // Handle successful payment
        break;
      case 'payment.failed':
        // Handle failed payment
        break;
      case 'refund.created':
        // Handle refund
        break;
    }

    res.json({ status: 'ok' });
  } else {
    res.status(400).json({ error: 'Invalid signature' });
  }
});
```

## Testing

### Test Cards

Razorpay provides test cards for testing:

**Successful Payment**:
- Card Number: `4111 1111 1111 1111`
- CVV: Any 3 digits
- Expiry: Any future date

**Failed Payment**:
- Card Number: `4000 0000 0000 0002`

### Test UPI
- UPI ID: `success@razorpay`

### Test Netbanking
- Select any bank and use credentials provided by Razorpay

## Error Handling

Common errors and solutions:

| Error | Cause | Solution |
|-------|-------|----------|
| `Invalid API key` | Wrong Key ID or Secret | Verify credentials in .env |
| `Invalid signature` | Signature mismatch | Check Key Secret and signature calculation |
| `Amount mismatch` | Order amount doesn't match | Verify amount calculation |
| `Order expired` | Order older than 15 minutes | Create new order |
| `Payment failed` | Customer cancelled or insufficient funds | Handle gracefully, allow retry |

## Production Checklist

- [ ] Replace test credentials with live credentials
- [ ] Enable HTTPS
- [ ] Configure webhook URL
- [ ] Test payment flow end-to-end
- [ ] Implement proper error handling
- [ ] Set up monitoring and alerts
- [ ] Configure refund policies
- [ ] Test coupon validation
- [ ] Verify signature validation
- [ ] Set up audit logging

## Support

- **Razorpay Documentation**: https://razorpay.com/docs/
- **API Reference**: https://razorpay.com/docs/api/
- **Support**: https://razorpay.com/support/

## License

This integration is part of NexaERP and follows the same license terms.
