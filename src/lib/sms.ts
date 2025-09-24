import { config } from '@/src/config/environment';

interface SMSOptions {
  to: string;
  message: string;
  from?: string;
}

interface OTPData {
  phone: string;
  code: string;
  expiresAt: Date;
  attempts: number;
}

export class SMSService {
  private accountSid: string;
  private authToken: string;
  private fromNumber: string;
  private baseUrl: string = 'https://api.twilio.com/2010-04-01';
  
  // In-memory OTP storage (should be Redis in production)
  private otpStore = new Map<string, OTPData>();

  constructor() {
    this.accountSid = config.sms.accountSid;
    this.authToken = config.sms.authToken;
    this.fromNumber = config.sms.phoneNumber;
  }

  /**
   * Send SMS message
   */
  async send(options: SMSOptions): Promise<boolean> {
    if (!this.accountSid || !this.authToken) {
      console.warn('SMS service not configured - skipping SMS send');
      return false;
    }

    // Format phone number for Saudi Arabia if needed
    let toNumber = options.to;
    if (!toNumber.startsWith('+')) {
      if (toNumber.startsWith('0')) {
        toNumber = `+966${toNumber.substring(1)}`;
      } else {
        toNumber = `+966${toNumber}`;
      }
    }

    const payload = new URLSearchParams({
      To: toNumber,
      From: options.from || this.fromNumber,
      Body: options.message
    });

    try {
      const response = await fetch(
        `${this.baseUrl}/Accounts/${this.accountSid}/Messages.json`,
        {
          method: 'POST',
          headers: {
            'Authorization': 'Basic ' + Buffer.from(`${this.accountSid}:${this.authToken}`).toString('base64'),
            'Content-Type': 'application/x-www-form-urlencoded'
          },
          body: payload.toString()
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(`Twilio error: ${error.message || response.statusText}`);
      }

      const data = await response.json();
      console.log(`SMS sent successfully: ${data.sid}`);
      return true;
    } catch (error) {
      console.error('SMS send error:', error);
      return false;
    }
  }

  /**
   * Generate and send OTP
   */
  async sendOTP(phone: string, language: 'en' | 'ar' = 'en'): Promise<boolean> {
    // Generate 6-digit OTP
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Store OTP with 5-minute expiry
    const otpData: OTPData = {
      phone,
      code,
      expiresAt: new Date(Date.now() + 5 * 60 * 1000), // 5 minutes
      attempts: 0
    };
    this.otpStore.set(phone, otpData);

    // Compose message
    const message = language === 'ar' 
      ? `رمز التحقق الخاص بك في Fixzit هو: ${code}\nصالح لمدة 5 دقائق.`
      : `Your Fixzit verification code is: ${code}\nValid for 5 minutes.`;

    // Send SMS
    const sent = await this.send({
      to: phone,
      message
    });

    if (!sent) {
      this.otpStore.delete(phone);
    }

    return sent;
  }

  /**
   * Verify OTP
   */
  verifyOTP(phone: string, code: string): boolean {
    const otpData = this.otpStore.get(phone);
    
    if (!otpData) {
      return false;
    }

    // Check if expired
    if (new Date() > otpData.expiresAt) {
      this.otpStore.delete(phone);
      return false;
    }

    // Check attempts (max 3)
    if (otpData.attempts >= 3) {
      this.otpStore.delete(phone);
      return false;
    }

    // Verify code
    if (otpData.code !== code) {
      otpData.attempts++;
      return false;
    }

    // Success - remove OTP
    this.otpStore.delete(phone);
    return true;
  }

  /**
   * Send templated SMS
   */
  async sendTemplate(template: string, phone: string, data: Record<string, any>, language: 'en' | 'ar' = 'en'): Promise<boolean> {
    const message = this.getTemplate(template, data, language);
    return this.send({ to: phone, message });
  }

  /**
   * Get SMS template
   */
  private getTemplate(name: string, data: Record<string, any>, language: 'en' | 'ar'): string {
    const templates: Record<string, Record<'en' | 'ar', string>> = {
      workOrderUpdate: {
        en: `Fixzit: Work Order ${data.code} status updated to ${data.status}. View details at ${data.link}`,
        ar: `Fixzit: تم تحديث حالة أمر العمل ${data.code} إلى ${data.status}. عرض التفاصيل على ${data.link}`
      },
      
      maintenanceReminder: {
        en: `Fixzit: Scheduled maintenance for ${data.property} on ${data.date}. Technician: ${data.technician}`,
        ar: `Fixzit: صيانة مجدولة لـ ${data.property} في ${data.date}. الفني: ${data.technician}`
      },
      
      paymentReceived: {
        en: `Fixzit: Payment of ${data.amount} ${data.currency} received for Invoice #${data.invoiceNumber}. Thank you!`,
        ar: `Fixzit: تم استلام دفعة بقيمة ${data.amount} ${data.currency} للفاتورة رقم ${data.invoiceNumber}. شكراً لك!`
      },
      
      emergencyAlert: {
        en: `URGENT - Fixzit: ${data.message}. Contact support immediately at ${data.supportPhone}`,
        ar: `عاجل - Fixzit: ${data.message}. اتصل بالدعم فوراً على ${data.supportPhone}`
      },
      
      appointmentConfirmation: {
        en: `Fixzit: Your appointment at ${data.property} is confirmed for ${data.date} at ${data.time}`,
        ar: `Fixzit: تم تأكيد موعدك في ${data.property} بتاريخ ${data.date} الساعة ${data.time}`
      }
    };

    const template = templates[name];
    if (!template) {
      throw new Error(`SMS template '${name}' not found`);
    }

    return template[language];
  }

  /**
   * Send bulk SMS
   */
  async sendBulk(messages: Array<{ phone: string; message: string }>): Promise<number> {
    let successCount = 0;
    
    for (const msg of messages) {
      const success = await this.send({
        to: msg.phone,
        message: msg.message
      });
      
      if (success) successCount++;
      
      // Rate limiting - Twilio recommends max 1 message per second
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    return successCount;
  }

  /**
   * Clean expired OTPs (should be called periodically)
   */
  cleanExpiredOTPs(): void {
    const now = new Date();
    for (const [phone, otpData] of this.otpStore.entries()) {
      if (now > otpData.expiresAt) {
        this.otpStore.delete(phone);
      }
    }
  }
}

// Export singleton instance
export const smsService = new SMSService();

// Clean expired OTPs every minute
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    smsService.cleanExpiredOTPs();
  }, 60000);
}
