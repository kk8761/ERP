/**
 * Payment Gateway Service with Razorpay Integration
 * Includes coupon code system for discounts
 */

import crypto from 'crypto';

// ─── Payment Gateway Types ──────────────────────────────────

export interface PaymentOrder {
  id: string;
  orderId: string;
  amount: number;
  currency: string;
  status: 'created' | 'authorized' | 'captured' | 'refunded' | 'failed';
  paymentMethod?: 'card' | 'upi' | 'netbanking' | 'wallet';
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
  razorpaySignature?: string;
  customerId?: string;
  customerEmail?: string;
  customerPhone?: string;
  notes?: Record<string, string>;
  createdAt: Date;
  updatedAt: Date;
}

export interface CouponCode {
  id: string;
  code: string;
  type: 'free' | 'percentage' | 'fixed';
  discountValue: number; // 100 for free, 0-100 for percentage, fixed amount for fixed
  description?: string;
  minOrderAmount?: number;
  maxDiscountAmount?: number;
  usageLimit?: number;
  usageCount: number;
  validFrom: Date;
  validUntil: Date;
  isActive: boolean;
  applicableProducts?: string[]; // Product IDs
  applicableCategories?: string[]; // Category IDs
  createdAt: Date;
  updatedAt: Date;
}

export interface CouponUsage {
  id: string;
  couponId: string;
  customerId: string;
  orderId: string;
  discountAmount: number;
  usedAt: Date;
}

export interface PaymentConfig {
  razorpayKeyId: string;
  razorpayKeySecret: string;
  webhookSecret?: string;
}

// ─── Razorpay Integration ──────────────────────────────────

export class PaymentGatewayService {
  private config: PaymentConfig;

  constructor(config: PaymentConfig) {
    this.config = config;
  }

  /**
   * Create a Razorpay order
   */
  async createOrder(data: {
    amount: number;
    currency: string;
    receipt: string;
    notes?: Record<string, string>;
  }): Promise<any> {
    try {
      const auth = Buffer.from(`${this.config.razorpayKeyId}:${this.config.razorpayKeySecret}`).toString('base64');
      
      const response = await fetch('https://api.razorpay.com/v1/orders', {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: Math.round(data.amount * 100), // Convert to paise
          currency: data.currency,
          receipt: data.receipt,
          notes: data.notes,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(`Razorpay API error: ${error.error?.description || 'Unknown error'}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error creating Razorpay order:', error);
      throw error;
    }
  }

  /**
   * Verify Razorpay payment signature
   */
  verifyPaymentSignature(data: {
    razorpayOrderId: string;
    razorpayPaymentId: string;
    razorpaySignature: string;
  }): boolean {
    try {
      const text = `${data.razorpayOrderId}|${data.razorpayPaymentId}`;
      const expectedSignature = crypto
        .createHmac('sha256', this.config.razorpayKeySecret)
        .update(text)
        .digest('hex');

      return expectedSignature === data.razorpaySignature;
    } catch (error) {
      console.error('Error verifying payment signature:', error);
      return false;
    }
  }

  /**
   * Capture a payment
   */
  async capturePayment(paymentId: string, amount: number, currency: string): Promise<any> {
    try {
      const auth = Buffer.from(`${this.config.razorpayKeyId}:${this.config.razorpayKeySecret}`).toString('base64');
      
      const response = await fetch(`https://api.razorpay.com/v1/payments/${paymentId}/capture`, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: Math.round(amount * 100), // Convert to paise
          currency: currency,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(`Razorpay API error: ${error.error?.description || 'Unknown error'}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error capturing payment:', error);
      throw error;
    }
  }

  /**
   * Refund a payment
   */
  async refundPayment(paymentId: string, amount?: number): Promise<any> {
    try {
      const auth = Buffer.from(`${this.config.razorpayKeyId}:${this.config.razorpayKeySecret}`).toString('base64');
      
      const body: any = {};
      if (amount) {
        body.amount = Math.round(amount * 100); // Convert to paise
      }

      const response = await fetch(`https://api.razorpay.com/v1/payments/${paymentId}/refund`, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(`Razorpay API error: ${error.error?.description || 'Unknown error'}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error refunding payment:', error);
      throw error;
    }
  }

  /**
   * Get payment details
   */
  async getPayment(paymentId: string): Promise<any> {
    try {
      const auth = Buffer.from(`${this.config.razorpayKeyId}:${this.config.razorpayKeySecret}`).toString('base64');
      
      const response = await fetch(`https://api.razorpay.com/v1/payments/${paymentId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Basic ${auth}`,
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(`Razorpay API error: ${error.error?.description || 'Unknown error'}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching payment:', error);
      throw error;
    }
  }

  // ─── Coupon Code Management ────────────────────────────────

  /**
   * Create a coupon code
   */
  async createCoupon(data: Omit<CouponCode, 'id' | 'usageCount' | 'createdAt' | 'updatedAt'>): Promise<CouponCode> {
    // Validate coupon data
    if (data.type === 'percentage' && (data.discountValue < 0 || data.discountValue > 100)) {
      throw new Error('Percentage discount must be between 0 and 100');
    }

    if (data.type === 'free' && data.discountValue !== 100) {
      throw new Error('Free coupon must have discount value of 100');
    }

    // Store in database
    throw new Error('Not implemented - store in database');
  }

  /**
   * Validate and apply coupon code
   */
  async applyCoupon(
    couponCode: string,
    orderAmount: number,
    customerId?: string,
    productIds?: string[],
    categoryIds?: string[]
  ): Promise<{
    valid: boolean;
    discountAmount: number;
    finalAmount: number;
    message?: string;
  }> {
    // Fetch coupon from database
    const coupon = await this.getCouponByCode(couponCode);

    if (!coupon) {
      return {
        valid: false,
        discountAmount: 0,
        finalAmount: orderAmount,
        message: 'Invalid coupon code',
      };
    }

    // Check if coupon is active
    if (!coupon.isActive) {
      return {
        valid: false,
        discountAmount: 0,
        finalAmount: orderAmount,
        message: 'Coupon is not active',
      };
    }

    // Check validity dates
    const now = new Date();
    if (now < coupon.validFrom || now > coupon.validUntil) {
      return {
        valid: false,
        discountAmount: 0,
        finalAmount: orderAmount,
        message: 'Coupon has expired or not yet valid',
      };
    }

    // Check usage limit
    if (coupon.usageLimit && coupon.usageCount >= coupon.usageLimit) {
      return {
        valid: false,
        discountAmount: 0,
        finalAmount: orderAmount,
        message: 'Coupon usage limit reached',
      };
    }

    // Check minimum order amount
    if (coupon.minOrderAmount && orderAmount < coupon.minOrderAmount) {
      return {
        valid: false,
        discountAmount: 0,
        finalAmount: orderAmount,
        message: `Minimum order amount of ${coupon.minOrderAmount} required`,
      };
    }

    // Check product/category applicability
    if (coupon.applicableProducts && coupon.applicableProducts.length > 0) {
      if (!productIds || !productIds.some(id => coupon.applicableProducts!.includes(id))) {
        return {
          valid: false,
          discountAmount: 0,
          finalAmount: orderAmount,
          message: 'Coupon not applicable to selected products',
        };
      }
    }

    if (coupon.applicableCategories && coupon.applicableCategories.length > 0) {
      if (!categoryIds || !categoryIds.some(id => coupon.applicableCategories!.includes(id))) {
        return {
          valid: false,
          discountAmount: 0,
          finalAmount: orderAmount,
          message: 'Coupon not applicable to selected categories',
        };
      }
    }

    // Calculate discount
    let discountAmount = 0;

    if (coupon.type === 'free') {
      discountAmount = orderAmount; // 100% discount
    } else if (coupon.type === 'percentage') {
      discountAmount = (orderAmount * coupon.discountValue) / 100;
      
      // Apply max discount limit if specified
      if (coupon.maxDiscountAmount && discountAmount > coupon.maxDiscountAmount) {
        discountAmount = coupon.maxDiscountAmount;
      }
    } else if (coupon.type === 'fixed') {
      discountAmount = Math.min(coupon.discountValue, orderAmount);
    }

    const finalAmount = Math.max(0, orderAmount - discountAmount);

    return {
      valid: true,
      discountAmount,
      finalAmount,
      message: 'Coupon applied successfully',
    };
  }

  /**
   * Record coupon usage
   */
  async recordCouponUsage(couponId: string, customerId: string, orderId: string, discountAmount: number): Promise<CouponUsage> {
    // Store in database and increment usage count
    throw new Error('Not implemented - store in database');
  }

  /**
   * Get coupon by code
   */
  async getCouponByCode(code: string): Promise<CouponCode | null> {
    // Fetch from database
    throw new Error('Not implemented - fetch from database');
  }

  /**
   * Get all active coupons
   */
  async getActiveCoupons(): Promise<CouponCode[]> {
    // Fetch from database
    throw new Error('Not implemented - fetch from database');
  }

  /**
   * Deactivate coupon
   */
  async deactivateCoupon(couponId: string): Promise<CouponCode> {
    // Update in database
    throw new Error('Not implemented - update in database');
  }

  /**
   * Get coupon usage history
   */
  async getCouponUsageHistory(couponId: string): Promise<CouponUsage[]> {
    // Fetch from database
    throw new Error('Not implemented - fetch from database');
  }

  // ─── Payment Processing with Coupons ───────────────────────

  /**
   * Process payment with coupon
   */
  async processPaymentWithCoupon(data: {
    orderId: string;
    originalAmount: number;
    currency: string;
    couponCode?: string;
    customerId?: string;
    customerEmail?: string;
    customerPhone?: string;
    productIds?: string[];
    categoryIds?: string[];
  }): Promise<{
    razorpayOrder: any;
    discountAmount: number;
    finalAmount: number;
    couponApplied: boolean;
  }> {
    let discountAmount = 0;
    let finalAmount = data.originalAmount;
    let couponApplied = false;

    // Apply coupon if provided
    if (data.couponCode) {
      const couponResult = await this.applyCoupon(
        data.couponCode,
        data.originalAmount,
        data.customerId,
        data.productIds,
        data.categoryIds
      );

      if (couponResult.valid) {
        discountAmount = couponResult.discountAmount;
        finalAmount = couponResult.finalAmount;
        couponApplied = true;
      }
    }

    // Create Razorpay order with final amount
    const razorpayOrder = await this.createOrder({
      amount: finalAmount,
      currency: data.currency,
      receipt: data.orderId,
      notes: {
        orderId: data.orderId,
        customerId: data.customerId || '',
        couponCode: data.couponCode || '',
        discountAmount: discountAmount.toString(),
      },
    });

    return {
      razorpayOrder,
      discountAmount,
      finalAmount,
      couponApplied,
    };
  }
}

// Export singleton instance
let paymentGatewayService: PaymentGatewayService | null = null;

export function initializePaymentGateway(config: PaymentConfig): PaymentGatewayService {
  paymentGatewayService = new PaymentGatewayService(config);
  return paymentGatewayService;
}

export function getPaymentGateway(): PaymentGatewayService {
  if (!paymentGatewayService) {
    throw new Error('Payment gateway not initialized. Call initializePaymentGateway first.');
  }
  return paymentGatewayService;
}

export default PaymentGatewayService;
