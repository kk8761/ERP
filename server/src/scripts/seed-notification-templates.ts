/**
 * Seed Notification Templates
 * 
 * Creates common notification templates with multi-language support
 * Requirements: 27.4
 * Task: 41.3
 */

import { PrismaClient } from '@prisma/client';
import * as TemplateService from '../services/notification-template.service';

const prisma = new PrismaClient();

// Template definitions with English and Spanish versions
const templates = [
  // Order Notifications - English
  {
    name: 'Order Confirmation',
    code: 'ORDER_CONFIRMED',
    description: 'Sent when an order is confirmed',
    subject: 'Order #{{orderNumber}} Confirmed',
    body: 'Hello {{customerName}},\n\nYour order #{{orderNumber}} has been confirmed for {{orderTotal}}.\n\nExpected delivery: {{deliveryDate}}',
    htmlBody: `
      <div style="font-family: Arial, sans-serif;">
        <h2>Order Confirmed</h2>
        <p>Hello <strong>{{customerName}}</strong>,</p>
        <p>Your order <strong>#{{orderNumber}}</strong> has been confirmed.</p>
        <table style="border-collapse: collapse; margin: 20px 0;">
          <tr><td style="padding: 10px;"><strong>Order Total:</strong></td><td>{{orderTotal}}</td></tr>
          <tr><td style="padding: 10px;"><strong>Expected Delivery:</strong></td><td>{{deliveryDate}}</td></tr>
        </table>
        <p><a href="{{orderUrl}}" style="background: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">View Order</a></p>
      </div>
    `,
    smsBody: 'Order #{{orderNumber}} confirmed for {{orderTotal}}. Delivery: {{deliveryDate}}',
    pushTitle: 'Order Confirmed',
    pushBody: 'Order #{{orderNumber}} for {{orderTotal}}',
    eventType: 'order_confirmed',
    category: 'order',
    priority: 'normal',
    language: 'en',
    actionUrl: '/orders/{{orderId}}',
    actionLabel: 'View Order',
    variables: {
      orderNumber: { type: 'string', description: 'Order number' },
      customerName: { type: 'string', description: 'Customer full name' },
      orderTotal: { type: 'string', description: 'Order total amount with currency' },
      deliveryDate: { type: 'string', description: 'Expected delivery date' },
      orderId: { type: 'string', description: 'Order ID for URL' },
      orderUrl: { type: 'string', description: 'Full URL to order details' },
    },
  },
  // Order Notifications - Spanish
  {
    name: 'Confirmación de Pedido',
    code: 'ORDER_CONFIRMED',
    description: 'Enviado cuando se confirma un pedido',
    subject: 'Pedido #{{orderNumber}} Confirmado',
    body: 'Hola {{customerName}},\n\nSu pedido #{{orderNumber}} ha sido confirmado por {{orderTotal}}.\n\nEntrega esperada: {{deliveryDate}}',
    htmlBody: `
      <div style="font-family: Arial, sans-serif;">
        <h2>Pedido Confirmado</h2>
        <p>Hola <strong>{{customerName}}</strong>,</p>
        <p>Su pedido <strong>#{{orderNumber}}</strong> ha sido confirmado.</p>
        <table style="border-collapse: collapse; margin: 20px 0;">
          <tr><td style="padding: 10px;"><strong>Total del Pedido:</strong></td><td>{{orderTotal}}</td></tr>
          <tr><td style="padding: 10px;"><strong>Entrega Esperada:</strong></td><td>{{deliveryDate}}</td></tr>
        </table>
        <p><a href="{{orderUrl}}" style="background: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Ver Pedido</a></p>
      </div>
    `,
    smsBody: 'Pedido #{{orderNumber}} confirmado por {{orderTotal}}. Entrega: {{deliveryDate}}',
    pushTitle: 'Pedido Confirmado',
    pushBody: 'Pedido #{{orderNumber}} por {{orderTotal}}',
    eventType: 'order_confirmed',
    category: 'order',
    priority: 'normal',
    language: 'es',
    actionUrl: '/orders/{{orderId}}',
    actionLabel: 'Ver Pedido',
    variables: {
      orderNumber: { type: 'string', description: 'Número de pedido' },
      customerName: { type: 'string', description: 'Nombre completo del cliente' },
      orderTotal: { type: 'string', description: 'Total del pedido con moneda' },
      deliveryDate: { type: 'string', description: 'Fecha de entrega esperada' },
      orderId: { type: 'string', description: 'ID del pedido para URL' },
      orderUrl: { type: 'string', description: 'URL completa a detalles del pedido' },
    },
  },
  // Inventory Low Stock - English
  {
    name: 'Low Stock Alert',
    code: 'INVENTORY_LOW_STOCK',
    description: 'Alert when inventory falls below reorder point',
    subject: 'Low Stock Alert: {{productName}}',
    body: 'Stock alert for {{productName}} (SKU: {{sku}}).\n\nCurrent quantity: {{currentQuantity}}\nReorder point: {{reorderPoint}}\n\nAction required: Restock immediately.',
    htmlBody: `
      <div style="font-family: Arial, sans-serif;">
        <h2 style="color: #dc3545;">⚠️ Low Stock Alert</h2>
        <p><strong>Product:</strong> {{productName}}</p>
        <p><strong>SKU:</strong> {{sku}}</p>
        <table style="border-collapse: collapse; margin: 20px 0;">
          <tr><td style="padding: 10px;"><strong>Current Quantity:</strong></td><td style="color: #dc3545;">{{currentQuantity}}</td></tr>
          <tr><td style="padding: 10px;"><strong>Reorder Point:</strong></td><td>{{reorderPoint}}</td></tr>
        </table>
        <p style="color: #dc3545;"><strong>Action Required:</strong> Restock immediately.</p>
        <p><a href="{{productUrl}}" style="background: #dc3545; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">View Product</a></p>
      </div>
    `,
    smsBody: 'LOW STOCK: {{productName}} - Only {{currentQuantity}} units left. Reorder now!',
    pushTitle: 'Low Stock Alert',
    pushBody: '{{productName}}: {{currentQuantity}} units remaining',
    eventType: 'inventory_low_stock',
    category: 'inventory',
    priority: 'high',
    language: 'en',
    actionUrl: '/inventory/{{productId}}',
    actionLabel: 'View Product',
    variables: {
      productName: { type: 'string', description: 'Product name' },
      sku: { type: 'string', description: 'Product SKU' },
      currentQuantity: { type: 'number', description: 'Current stock quantity' },
      reorderPoint: { type: 'number', description: 'Reorder point threshold' },
      productId: { type: 'string', description: 'Product ID for URL' },
      productUrl: { type: 'string', description: 'Full URL to product details' },
    },
  },
  // Approval Required - English
  {
    name: 'Approval Required',
    code: 'APPROVAL_REQUIRED',
    description: 'Notification when approval is required',
    subject: 'Approval Required: {{itemType}} #{{itemNumber}}',
    body: 'Hello {{approverName}},\n\n{{requesterName}} has submitted {{itemType}} #{{itemNumber}} for your approval.\n\nAmount: {{amount}}\nReason: {{reason}}\n\nPlease review and approve or reject.',
    htmlBody: `
      <div style="font-family: Arial, sans-serif;">
        <h2>Approval Required</h2>
        <p>Hello <strong>{{approverName}}</strong>,</p>
        <p><strong>{{requesterName}}</strong> has submitted <strong>{{itemType}} #{{itemNumber}}</strong> for your approval.</p>
        <table style="border-collapse: collapse; margin: 20px 0; border: 1px solid #ddd;">
          <tr><td style="padding: 10px; background: #f8f9fa;"><strong>Type:</strong></td><td style="padding: 10px;">{{itemType}}</td></tr>
          <tr><td style="padding: 10px; background: #f8f9fa;"><strong>Number:</strong></td><td style="padding: 10px;">{{itemNumber}}</td></tr>
          <tr><td style="padding: 10px; background: #f8f9fa;"><strong>Amount:</strong></td><td style="padding: 10px;">{{amount}}</td></tr>
          <tr><td style="padding: 10px; background: #f8f9fa;"><strong>Reason:</strong></td><td style="padding: 10px;">{{reason}}</td></tr>
        </table>
        <p>
          <a href="{{approvalUrl}}" style="background: #28a745; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; margin-right: 10px;">Review & Approve</a>
        </p>
      </div>
    `,
    smsBody: 'Approval needed: {{itemType}} #{{itemNumber}} from {{requesterName}}. Amount: {{amount}}',
    pushTitle: 'Approval Required',
    pushBody: '{{itemType}} #{{itemNumber}} needs your approval',
    eventType: 'approval_required',
    category: 'approval',
    priority: 'high',
    language: 'en',
    actionUrl: '/approvals/{{approvalId}}',
    actionLabel: 'Review & Approve',
    variables: {
      approverName: { type: 'string', description: 'Approver name' },
      requesterName: { type: 'string', description: 'Requester name' },
      itemType: { type: 'string', description: 'Type of item (Purchase Order, Expense, etc.)' },
      itemNumber: { type: 'string', description: 'Item number/identifier' },
      amount: { type: 'string', description: 'Amount with currency' },
      reason: { type: 'string', description: 'Reason for request' },
      approvalId: { type: 'string', description: 'Approval ID for URL' },
      approvalUrl: { type: 'string', description: 'Full URL to approval page' },
    },
  },
  // System Maintenance - English
  {
    name: 'System Maintenance Notice',
    code: 'SYSTEM_MAINTENANCE',
    description: 'Notification about scheduled system maintenance',
    subject: 'Scheduled Maintenance: {{maintenanceDate}}',
    body: 'Hello {{userName}},\n\nScheduled maintenance will occur on {{maintenanceDate}} at {{maintenanceTime}}.\n\nDuration: {{duration}}\nImpact: {{impact}}\n\nPlease plan accordingly.',
    htmlBody: `
      <div style="font-family: Arial, sans-serif;">
        <h2 style="color: #ffc107;">🔧 Scheduled Maintenance Notice</h2>
        <p>Hello <strong>{{userName}}</strong>,</p>
        <p>We will be performing scheduled maintenance on our systems.</p>
        <table style="border-collapse: collapse; margin: 20px 0; border: 1px solid #ddd;">
          <tr><td style="padding: 10px; background: #fff3cd;"><strong>Date:</strong></td><td style="padding: 10px;">{{maintenanceDate}}</td></tr>
          <tr><td style="padding: 10px; background: #fff3cd;"><strong>Time:</strong></td><td style="padding: 10px;">{{maintenanceTime}}</td></tr>
          <tr><td style="padding: 10px; background: #fff3cd;"><strong>Duration:</strong></td><td style="padding: 10px;">{{duration}}</td></tr>
          <tr><td style="padding: 10px; background: #fff3cd;"><strong>Impact:</strong></td><td style="padding: 10px;">{{impact}}</td></tr>
        </table>
        <p>Please plan accordingly and save your work before the maintenance window.</p>
      </div>
    `,
    smsBody: 'Maintenance scheduled for {{maintenanceDate}} at {{maintenanceTime}}. Duration: {{duration}}',
    pushTitle: 'Scheduled Maintenance',
    pushBody: 'System maintenance on {{maintenanceDate}}',
    eventType: 'system_maintenance',
    category: 'system',
    priority: 'normal',
    language: 'en',
    variables: {
      userName: { type: 'string', description: 'User name' },
      maintenanceDate: { type: 'string', description: 'Maintenance date' },
      maintenanceTime: { type: 'string', description: 'Maintenance time' },
      duration: { type: 'string', description: 'Estimated duration' },
      impact: { type: 'string', description: 'Expected impact description' },
    },
  },
  // Password Reset - English
  {
    name: 'Password Reset Request',
    code: 'PASSWORD_RESET',
    description: 'Password reset request notification',
    subject: 'Password Reset Request',
    body: 'Hello {{userName}},\n\nWe received a request to reset your password. Use the link below to set a new password:\n\n{{resetLink}}\n\nThis link expires in {{expiryTime}}.\n\nIf you did not request this, please ignore this message.',
    htmlBody: `
      <div style="font-family: Arial, sans-serif;">
        <h2>Password Reset Request</h2>
        <p>Hello <strong>{{userName}}</strong>,</p>
        <p>We received a request to reset your password for your NexaERP account.</p>
        <p style="margin: 30px 0;">
          <a href="{{resetLink}}" style="background: #007bff; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-size: 16px;">Reset Password</a>
        </p>
        <p style="color: #6c757d; font-size: 14px;">This link will expire in <strong>{{expiryTime}}</strong>.</p>
        <p style="color: #6c757d; font-size: 14px;">If you did not request this password reset, please ignore this email. Your password will remain unchanged.</p>
      </div>
    `,
    smsBody: 'Password reset requested. Link: {{resetLink}} (expires in {{expiryTime}})',
    pushTitle: 'Password Reset',
    pushBody: 'Password reset link sent to your email',
    eventType: 'password_reset',
    category: 'security',
    priority: 'high',
    language: 'en',
    actionUrl: '{{resetLink}}',
    actionLabel: 'Reset Password',
    variables: {
      userName: { type: 'string', description: 'User name' },
      resetLink: { type: 'string', description: 'Password reset link' },
      expiryTime: { type: 'string', description: 'Link expiry time (e.g., "1 hour")' },
    },
  },
  // Invoice Generated - English
  {
    name: 'Invoice Generated',
    code: 'INVOICE_GENERATED',
    description: 'Notification when invoice is generated',
    subject: 'Invoice {{invoiceNumber}} - Amount Due: {{amount}}',
    body: 'Hello {{customerName}},\n\nYour invoice {{invoiceNumber}} has been generated.\n\nAmount Due: {{amount}}\nDue Date: {{dueDate}}\n\nPlease make payment by the due date.',
    htmlBody: `
      <div style="font-family: Arial, sans-serif;">
        <h2>Invoice Generated</h2>
        <p>Hello <strong>{{customerName}}</strong>,</p>
        <p>Your invoice has been generated and is ready for payment.</p>
        <table style="border-collapse: collapse; margin: 20px 0; border: 1px solid #ddd; width: 100%;">
          <tr><td style="padding: 10px; background: #f8f9fa; width: 40%;"><strong>Invoice Number:</strong></td><td style="padding: 10px;">{{invoiceNumber}}</td></tr>
          <tr><td style="padding: 10px; background: #f8f9fa;"><strong>Invoice Date:</strong></td><td style="padding: 10px;">{{invoiceDate}}</td></tr>
          <tr><td style="padding: 10px; background: #f8f9fa;"><strong>Amount Due:</strong></td><td style="padding: 10px; font-size: 18px; color: #28a745;"><strong>{{amount}}</strong></td></tr>
          <tr><td style="padding: 10px; background: #f8f9fa;"><strong>Due Date:</strong></td><td style="padding: 10px;">{{dueDate}}</td></tr>
        </table>
        <p>
          <a href="{{invoiceUrl}}" style="background: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; margin-right: 10px;">View Invoice</a>
          <a href="{{paymentUrl}}" style="background: #28a745; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Pay Now</a>
        </p>
      </div>
    `,
    smsBody: 'Invoice {{invoiceNumber}} generated. Amount: {{amount}}. Due: {{dueDate}}',
    pushTitle: 'New Invoice',
    pushBody: 'Invoice {{invoiceNumber}} - {{amount}} due by {{dueDate}}',
    eventType: 'invoice_generated',
    category: 'accounting',
    priority: 'normal',
    language: 'en',
    actionUrl: '/invoices/{{invoiceId}}',
    actionLabel: 'View Invoice',
    variables: {
      customerName: { type: 'string', description: 'Customer name' },
      invoiceNumber: { type: 'string', description: 'Invoice number' },
      invoiceDate: { type: 'string', description: 'Invoice date' },
      amount: { type: 'string', description: 'Amount due with currency' },
      dueDate: { type: 'string', description: 'Payment due date' },
      invoiceId: { type: 'string', description: 'Invoice ID for URL' },
      invoiceUrl: { type: 'string', description: 'Full URL to invoice' },
      paymentUrl: { type: 'string', description: 'Full URL to payment page' },
    },
  },
  // Welcome New User - English
  {
    name: 'Welcome to NexaERP',
    code: 'USER_WELCOME',
    description: 'Welcome message for new users',
    subject: 'Welcome to NexaERP, {{userName}}!',
    body: 'Hello {{userName}},\n\nWelcome to NexaERP! Your account has been created successfully.\n\nYour username: {{username}}\n\nGet started by exploring our features and setting up your workspace.',
    htmlBody: `
      <div style="font-family: Arial, sans-serif;">
        <h1 style="color: #007bff;">Welcome to NexaERP! 🎉</h1>
        <p>Hello <strong>{{userName}}</strong>,</p>
        <p>Thank you for joining NexaERP. Your account has been successfully created and you're ready to get started!</p>
        <table style="border-collapse: collapse; margin: 20px 0;">
          <tr><td style="padding: 10px;"><strong>Username:</strong></td><td>{{username}}</td></tr>
          <tr><td style="padding: 10px;"><strong>Email:</strong></td><td>{{email}}</td></tr>
        </table>
        <p><strong>Quick Start Guide:</strong></p>
        <ul>
          <li>Complete your profile setup</li>
          <li>Explore the dashboard</li>
          <li>Configure notification preferences</li>
          <li>Invite team members</li>
        </ul>
        <p>
          <a href="{{dashboardUrl}}" style="background: #007bff; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-size: 16px;">Go to Dashboard</a>
        </p>
        <p style="margin-top: 30px; color: #6c757d; font-size: 14px;">Need help? Contact our support team at support@nexaerp.com</p>
      </div>
    `,
    smsBody: 'Welcome to NexaERP! Your account is ready. Login at {{loginUrl}}',
    pushTitle: 'Welcome to NexaERP',
    pushBody: 'Your account has been created successfully',
    eventType: 'user_welcome',
    category: 'user',
    priority: 'normal',
    language: 'en',
    actionUrl: '/dashboard',
    actionLabel: 'Go to Dashboard',
    variables: {
      userName: { type: 'string', description: 'User full name' },
      username: { type: 'string', description: 'Username for login' },
      email: { type: 'string', description: 'User email address' },
      dashboardUrl: { type: 'string', description: 'Full URL to dashboard' },
      loginUrl: { type: 'string', description: 'Full URL to login page' },
    },
  },
];

/**
 * Seed notification templates
 */
async function seedNotificationTemplates() {
  console.log('🌱 Seeding notification templates...');

  try {
    let created = 0;
    let skipped = 0;

    for (const templateData of templates) {
      try {
        // Check if template already exists with this code and language
        const existing = await prisma.notificationTemplate.findFirst({
          where: {
            code: templateData.code,
            language: templateData.language,
          },
        });

        if (existing) {
          console.log(`⏭️  Skipping existing template: ${templateData.name} (${templateData.language})`);
          skipped++;
          continue;
        }

        // Create template
        await TemplateService.createTemplate(templateData as any);
        console.log(`✅ Created template: ${templateData.name} (${templateData.language})`);
        created++;
      } catch (error: any) {
        console.error(`❌ Error creating template ${templateData.name}:`, error.message);
      }
    }

    console.log(`\n✨ Seeding complete!`);
    console.log(`   Created: ${created} templates`);
    console.log(`   Skipped: ${skipped} templates (already exist)`);
    console.log(`   Total templates in database: ${await prisma.notificationTemplate.count()}`);
  } catch (error) {
    console.error('❌ Error seeding templates:', error);
    throw error;
  }
}

// Run seeding if this file is executed directly
if (require.main === module) {
  seedNotificationTemplates()
    .then(() => {
      console.log('✅ Seeding completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Seeding failed:', error);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}

export default seedNotificationTemplates;
