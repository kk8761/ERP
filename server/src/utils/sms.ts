/**
 * SMS Utility
 * 
 * Handles SMS sending through Twilio
 * Requirements: 27.2
 */

interface SMSOptions {
  to: string;
  message: string;
  from?: string;
}

/**
 * Send an SMS
 */
export async function sendSMS(options: SMSOptions): Promise<{
  success: boolean;
  messageId?: string;
  error?: string;
}> {
  try {
    const provider = process.env.SMS_PROVIDER || 'twilio';

    if (provider === 'twilio') {
      return await sendViaTwilio(options);
    } else {
      // Add other SMS providers here (AWS SNS, Vonage, etc.)
      throw new Error(`Unsupported SMS provider: ${provider}`);
    }
  } catch (error: any) {
    console.error('Error sending SMS:', error);
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Send SMS via Twilio
 */
async function sendViaTwilio(options: SMSOptions): Promise<{
  success: boolean;
  messageId?: string;
  error?: string;
}> {
  try {
    // Check if Twilio credentials are configured
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const fromNumber = options.from || process.env.TWILIO_PHONE_NUMBER;

    if (!accountSid || !authToken || !fromNumber) {
      console.warn('Twilio credentials not configured, SMS not sent');
      return {
        success: false,
        error: 'Twilio credentials not configured',
      };
    }

    // Dynamically import Twilio to avoid requiring it if not configured
    const twilio = require('twilio');
    const client = twilio(accountSid, authToken);

    const message = await client.messages.create({
      body: options.message,
      from: fromNumber,
      to: options.to,
    });

    console.log('SMS sent successfully:', message.sid);

    return {
      success: true,
      messageId: message.sid,
    };
  } catch (error: any) {
    console.error('Error sending SMS via Twilio:', error);
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Send bulk SMS (batch processing)
 */
export async function sendBulkSMS(
  messages: SMSOptions[]
): Promise<Array<{ success: boolean; messageId?: string; error?: string }>> {
  const results = [];

  for (const sms of messages) {
    try {
      const result = await sendSMS(sms);
      results.push(result);
      
      // Add small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 200));
    } catch (error: any) {
      results.push({
        success: false,
        error: error.message,
      });
    }
  }

  return results;
}

/**
 * Format phone number for SMS (E.164 format)
 */
export function formatPhoneNumber(phone: string, countryCode: string = '+1'): string {
  // Remove all non-numeric characters
  const cleaned = phone.replace(/\D/g, '');
  
  // Add country code if not present
  if (!cleaned.startsWith(countryCode.replace('+', ''))) {
    return `${countryCode}${cleaned}`;
  }
  
  return `+${cleaned}`;
}

/**
 * Validate phone number
 */
export function isValidPhoneNumber(phone: string): boolean {
  // Basic validation for E.164 format
  const e164Regex = /^\+[1-9]\d{1,14}$/;
  return e164Regex.test(phone);
}

export default {
  sendSMS,
  sendBulkSMS,
  formatPhoneNumber,
  isValidPhoneNumber,
};
