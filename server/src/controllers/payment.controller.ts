/**
 * Payment Controller
 * Handles Razorpay payment processing and coupon management
 */

import { Request, Response } from 'express';
import { getPaymentGateway } from '../services/payment-gateway';

export class PaymentController {
  // ─── Payment Endpoints ──────────────────────────────────────

  async createOrder(req: Request, res: Response): Promise<void> {
    try {
      const paymentGateway = getPaymentGateway();
      const { amount, currency, orderId, notes } = req.body;

      const razorpayOrder = await paymentGateway.createOrder({
        amount,
        currency: currency || 'INR',
        receipt: orderId,
        notes,
      });

      res.status(201).json({
        success: true,
        data: razorpayOrder,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }

  async verifyPayment(req: Request, res: Response): Promise<void> {
    try {
      const paymentGateway = getPaymentGateway();
      const { razorpayOrderId, razorpayPaymentId, razorpaySignature } = req.body;

      const isValid = paymentGateway.verifyPaymentSignature({
        razorpayOrderId,
        razorpayPaymentId,
        razorpaySignature,
      });

      if (isValid) {
        res.json({
          success: true,
          message: 'Payment verified successfully',
        });
      } else {
        res.status(400).json({
          success: false,
          error: 'Invalid payment signature',
        });
      }
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }

  async capturePayment(req: Request, res: Response): Promise<void> {
    try {
      const paymentGateway = getPaymentGateway();
      const { paymentId, amount, currency } = req.body;

      const payment = await paymentGateway.capturePayment(paymentId, amount, currency || 'INR');

      res.json({
        success: true,
        data: payment,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }

  async refundPayment(req: Request, res: Response): Promise<void> {
    try {
      const paymentGateway = getPaymentGateway();
      const { paymentId, amount } = req.body;

      const refund = await paymentGateway.refundPayment(paymentId, amount);

      res.json({
        success: true,
        data: refund,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }

  async getPayment(req: Request, res: Response): Promise<void> {
    try {
      const paymentGateway = getPaymentGateway();
      const { paymentId } = req.params;

      const payment = await paymentGateway.getPayment(paymentId);

      res.json({
        success: true,
        data: payment,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }

  // ─── Coupon Endpoints ───────────────────────────────────────

  async createCoupon(req: Request, res: Response): Promise<void> {
    try {
      const paymentGateway = getPaymentGateway();
      const coupon = await paymentGateway.createCoupon(req.body);

      res.status(201).json({
        success: true,
        data: coupon,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }

  async applyCoupon(req: Request, res: Response): Promise<void> {
    try {
      const paymentGateway = getPaymentGateway();
      const { couponCode, orderAmount, customerId, productIds, categoryIds } = req.body;

      const result = await paymentGateway.applyCoupon(
        couponCode,
        orderAmount,
        customerId,
        productIds,
        categoryIds
      );

      res.json({
        success: result.valid,
        data: result,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }

  async getActiveCoupons(req: Request, res: Response): Promise<void> {
    try {
      const paymentGateway = getPaymentGateway();
      const coupons = await paymentGateway.getActiveCoupons();

      res.json({
        success: true,
        data: coupons,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }

  async deactivateCoupon(req: Request, res: Response): Promise<void> {
    try {
      const paymentGateway = getPaymentGateway();
      const { couponId } = req.params;

      const coupon = await paymentGateway.deactivateCoupon(couponId);

      res.json({
        success: true,
        data: coupon,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }

  async getCouponUsageHistory(req: Request, res: Response): Promise<void> {
    try {
      const paymentGateway = getPaymentGateway();
      const { couponId } = req.params;

      const history = await paymentGateway.getCouponUsageHistory(couponId);

      res.json({
        success: true,
        data: history,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }

  // ─── Combined Payment with Coupon ───────────────────────────

  async processPaymentWithCoupon(req: Request, res: Response): Promise<void> {
    try {
      const paymentGateway = getPaymentGateway();
      const {
        orderId,
        originalAmount,
        currency,
        couponCode,
        customerId,
        customerEmail,
        customerPhone,
        productIds,
        categoryIds,
      } = req.body;

      const result = await paymentGateway.processPaymentWithCoupon({
        orderId,
        originalAmount,
        currency: currency || 'INR',
        couponCode,
        customerId,
        customerEmail,
        customerPhone,
        productIds,
        categoryIds,
      });

      res.status(201).json({
        success: true,
        data: result,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }
}

export default new PaymentController();
