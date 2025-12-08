/**
 * SMS Template Service
 *
 * Provides SMS template management with variable substitution.
 * Supports per-organization templates with fallback to global defaults.
 *
 * @module lib/sms-templates
 */

import { logger } from "@/lib/logger";

// Template variable patterns
const VARIABLE_PATTERN = /\{\{(\w+)\}\}/g;

/**
 * Predefined SMS template types
 */
export const SMSTemplateType = [
  "OTP_LOGIN",
  "OTP_VERIFY",
  "OTP_RESET_PASSWORD",
  "WORK_ORDER_CREATED",
  "WORK_ORDER_ASSIGNED",
  "WORK_ORDER_COMPLETED",
  "WORK_ORDER_CANCELLED",
  "INVOICE_CREATED",
  "INVOICE_PAID",
  "INVOICE_OVERDUE",
  "PAYMENT_RECEIVED",
  "APPOINTMENT_REMINDER",
  "APPOINTMENT_CONFIRMED",
  "APPOINTMENT_CANCELLED",
  "ACCOUNT_WELCOME",
  "ACCOUNT_SUSPENDED",
  "PASSWORD_RESET",
  "CUSTOM",
] as const;

export type TSMSTemplateType = (typeof SMSTemplateType)[number];

/**
 * Template definition with content for different locales
 */
export interface ISMSTemplate {
  type: TSMSTemplateType;
  name: string;
  description?: string;
  content: {
    en: string;
    ar: string;
    [locale: string]: string;
  };
  variables: string[];
  maxLength?: number; // SMS segment limit
  isActive: boolean;
}

/**
 * Variable context for template substitution
 */
export interface ITemplateVariables {
  [key: string]: string | number | undefined;
}

/**
 * Default SMS templates (global fallback)
 */
const DEFAULT_TEMPLATES: Record<TSMSTemplateType, ISMSTemplate> = {
  OTP_LOGIN: {
    type: "OTP_LOGIN",
    name: "OTP Login Code",
    description: "One-time password for login verification",
    content: {
      en: "Your Fixzit login code is {{code}}. Valid for {{expiryMinutes}} minutes. Do not share this code.",
      ar: "رمز الدخول الخاص بك في فيكسيت هو {{code}}. صالح لمدة {{expiryMinutes}} دقيقة. لا تشارك هذا الرمز.",
    },
    variables: ["code", "expiryMinutes"],
    maxLength: 160,
    isActive: true,
  },
  OTP_VERIFY: {
    type: "OTP_VERIFY",
    name: "OTP Verification",
    description: "One-time password for phone verification",
    content: {
      en: "Your Fixzit verification code is {{code}}. This code expires in {{expiryMinutes}} minutes.",
      ar: "رمز التحقق الخاص بك في فيكسيت هو {{code}}. ينتهي هذا الرمز خلال {{expiryMinutes}} دقيقة.",
    },
    variables: ["code", "expiryMinutes"],
    maxLength: 160,
    isActive: true,
  },
  OTP_RESET_PASSWORD: {
    type: "OTP_RESET_PASSWORD",
    name: "Password Reset OTP",
    description: "One-time password for password reset",
    content: {
      en: "Your password reset code is {{code}}. Valid for {{expiryMinutes}} minutes. If you did not request this, ignore this message.",
      ar: "رمز إعادة تعيين كلمة المرور هو {{code}}. صالح لمدة {{expiryMinutes}} دقيقة. إذا لم تطلب ذلك، تجاهل هذه الرسالة.",
    },
    variables: ["code", "expiryMinutes"],
    maxLength: 160,
    isActive: true,
  },
  WORK_ORDER_CREATED: {
    type: "WORK_ORDER_CREATED",
    name: "Work Order Created",
    description: "Notification when a work order is created",
    content: {
      en: "Work order #{{woNumber}} has been created for {{propertyName}}. Priority: {{priority}}. Track at: {{trackingUrl}}",
      ar: "تم إنشاء أمر العمل #{{woNumber}} للعقار {{propertyName}}. الأولوية: {{priority}}. التتبع: {{trackingUrl}}",
    },
    variables: ["woNumber", "propertyName", "priority", "trackingUrl"],
    maxLength: 160,
    isActive: true,
  },
  WORK_ORDER_ASSIGNED: {
    type: "WORK_ORDER_ASSIGNED",
    name: "Work Order Assigned",
    description: "Notification when a work order is assigned to a technician",
    content: {
      en: "Hi {{technicianName}}, work order #{{woNumber}} has been assigned to you. Property: {{propertyName}}. Due: {{dueDate}}",
      ar: "مرحباً {{technicianName}}، تم تعيين أمر العمل #{{woNumber}} لك. العقار: {{propertyName}}. الموعد: {{dueDate}}",
    },
    variables: ["technicianName", "woNumber", "propertyName", "dueDate"],
    maxLength: 160,
    isActive: true,
  },
  WORK_ORDER_COMPLETED: {
    type: "WORK_ORDER_COMPLETED",
    name: "Work Order Completed",
    description: "Notification when a work order is completed",
    content: {
      en: "Work order #{{woNumber}} has been completed. Thank you for using Fixzit. Rate your experience: {{ratingUrl}}",
      ar: "تم إكمال أمر العمل #{{woNumber}}. شكراً لاستخدامك فيكسيت. قيّم تجربتك: {{ratingUrl}}",
    },
    variables: ["woNumber", "ratingUrl"],
    maxLength: 160,
    isActive: true,
  },
  WORK_ORDER_CANCELLED: {
    type: "WORK_ORDER_CANCELLED",
    name: "Work Order Cancelled",
    description: "Notification when a work order is cancelled",
    content: {
      en: "Work order #{{woNumber}} has been cancelled. Reason: {{reason}}. Contact support for questions.",
      ar: "تم إلغاء أمر العمل #{{woNumber}}. السبب: {{reason}}. تواصل مع الدعم للاستفسارات.",
    },
    variables: ["woNumber", "reason"],
    maxLength: 160,
    isActive: true,
  },
  INVOICE_CREATED: {
    type: "INVOICE_CREATED",
    name: "Invoice Created",
    description: "Notification when an invoice is created",
    content: {
      en: "Invoice #{{invoiceNumber}} for {{amount}} {{currency}} is ready. Due: {{dueDate}}. Pay at: {{paymentUrl}}",
      ar: "الفاتورة #{{invoiceNumber}} بمبلغ {{amount}} {{currency}} جاهزة. الاستحقاق: {{dueDate}}. الدفع: {{paymentUrl}}",
    },
    variables: ["invoiceNumber", "amount", "currency", "dueDate", "paymentUrl"],
    maxLength: 160,
    isActive: true,
  },
  INVOICE_PAID: {
    type: "INVOICE_PAID",
    name: "Invoice Paid",
    description: "Confirmation when an invoice is paid",
    content: {
      en: "Payment of {{amount}} {{currency}} received for invoice #{{invoiceNumber}}. Thank you!",
      ar: "تم استلام دفعة بمبلغ {{amount}} {{currency}} للفاتورة #{{invoiceNumber}}. شكراً لك!",
    },
    variables: ["amount", "currency", "invoiceNumber"],
    maxLength: 160,
    isActive: true,
  },
  INVOICE_OVERDUE: {
    type: "INVOICE_OVERDUE",
    name: "Invoice Overdue",
    description: "Reminder for overdue invoices",
    content: {
      en: "REMINDER: Invoice #{{invoiceNumber}} for {{amount}} {{currency}} is overdue. Please pay immediately: {{paymentUrl}}",
      ar: "تذكير: الفاتورة #{{invoiceNumber}} بمبلغ {{amount}} {{currency}} متأخرة. يرجى الدفع فوراً: {{paymentUrl}}",
    },
    variables: ["invoiceNumber", "amount", "currency", "paymentUrl"],
    maxLength: 160,
    isActive: true,
  },
  PAYMENT_RECEIVED: {
    type: "PAYMENT_RECEIVED",
    name: "Payment Received",
    description: "Confirmation of payment receipt",
    content: {
      en: "Payment of {{amount}} {{currency}} received. Transaction ID: {{transactionId}}. Receipt: {{receiptUrl}}",
      ar: "تم استلام دفعة بمبلغ {{amount}} {{currency}}. رقم المعاملة: {{transactionId}}. الإيصال: {{receiptUrl}}",
    },
    variables: ["amount", "currency", "transactionId", "receiptUrl"],
    maxLength: 160,
    isActive: true,
  },
  APPOINTMENT_REMINDER: {
    type: "APPOINTMENT_REMINDER",
    name: "Appointment Reminder",
    description: "Reminder for upcoming appointments",
    content: {
      en: "Reminder: Your appointment is scheduled for {{date}} at {{time}}. Location: {{location}}. Reschedule: {{rescheduleUrl}}",
      ar: "تذكير: موعدك في {{date}} الساعة {{time}}. الموقع: {{location}}. لإعادة الجدولة: {{rescheduleUrl}}",
    },
    variables: ["date", "time", "location", "rescheduleUrl"],
    maxLength: 160,
    isActive: true,
  },
  APPOINTMENT_CONFIRMED: {
    type: "APPOINTMENT_CONFIRMED",
    name: "Appointment Confirmed",
    description: "Confirmation of appointment booking",
    content: {
      en: "Your appointment is confirmed for {{date}} at {{time}}. We look forward to seeing you!",
      ar: "تم تأكيد موعدك في {{date}} الساعة {{time}}. نتطلع لرؤيتك!",
    },
    variables: ["date", "time"],
    maxLength: 160,
    isActive: true,
  },
  APPOINTMENT_CANCELLED: {
    type: "APPOINTMENT_CANCELLED",
    name: "Appointment Cancelled",
    description: "Notification of appointment cancellation",
    content: {
      en: "Your appointment on {{date}} at {{time}} has been cancelled. Reason: {{reason}}. Rebook: {{rebookUrl}}",
      ar: "تم إلغاء موعدك في {{date}} الساعة {{time}}. السبب: {{reason}}. لإعادة الحجز: {{rebookUrl}}",
    },
    variables: ["date", "time", "reason", "rebookUrl"],
    maxLength: 160,
    isActive: true,
  },
  ACCOUNT_WELCOME: {
    type: "ACCOUNT_WELCOME",
    name: "Account Welcome",
    description: "Welcome message for new accounts",
    content: {
      en: "Welcome to Fixzit, {{name}}! Your account is ready. Get started: {{dashboardUrl}}",
      ar: "مرحباً بك في فيكسيت، {{name}}! حسابك جاهز. ابدأ الآن: {{dashboardUrl}}",
    },
    variables: ["name", "dashboardUrl"],
    maxLength: 160,
    isActive: true,
  },
  ACCOUNT_SUSPENDED: {
    type: "ACCOUNT_SUSPENDED",
    name: "Account Suspended",
    description: "Notification of account suspension",
    content: {
      en: "Your Fixzit account has been suspended. Reason: {{reason}}. Contact support: {{supportUrl}}",
      ar: "تم تعليق حسابك في فيكسيت. السبب: {{reason}}. تواصل مع الدعم: {{supportUrl}}",
    },
    variables: ["reason", "supportUrl"],
    maxLength: 160,
    isActive: true,
  },
  PASSWORD_RESET: {
    type: "PASSWORD_RESET",
    name: "Password Reset Link",
    description: "Password reset notification",
    content: {
      en: "Your password has been successfully reset. If you did not do this, contact support immediately: {{supportUrl}}",
      ar: "تم إعادة تعيين كلمة المرور بنجاح. إذا لم تفعل ذلك، تواصل مع الدعم فوراً: {{supportUrl}}",
    },
    variables: ["supportUrl"],
    maxLength: 160,
    isActive: true,
  },
  CUSTOM: {
    type: "CUSTOM",
    name: "Custom Template",
    description: "Custom template for ad-hoc messages",
    content: {
      en: "{{message}}",
      ar: "{{message}}",
    },
    variables: ["message"],
    maxLength: 160,
    isActive: true,
  },
};

/**
 * SMS Template Service
 *
 * Handles template retrieval and variable substitution for SMS messages.
 */
export class SMSTemplateService {
  private orgTemplates: Map<string, Map<TSMSTemplateType, ISMSTemplate>> =
    new Map();

  /**
   * Get a template by type, with org-specific override support
   */
  getTemplate(
    type: TSMSTemplateType,
    orgId?: string
  ): ISMSTemplate | undefined {
    // Check for org-specific template first
    if (orgId) {
      const orgTemplateMap = this.orgTemplates.get(orgId);
      if (orgTemplateMap?.has(type)) {
        return orgTemplateMap.get(type);
      }
    }

    // Fall back to default template
    return DEFAULT_TEMPLATES[type];
  }

  /**
   * Register a custom template for an organization
   */
  registerOrgTemplate(orgId: string, template: ISMSTemplate): void {
    if (!this.orgTemplates.has(orgId)) {
      this.orgTemplates.set(orgId, new Map());
    }
    this.orgTemplates.get(orgId)!.set(template.type, template);
    logger.info("[SMSTemplateService] Registered org template", {
      orgId,
      type: template.type,
      name: template.name,
    });
  }

  /**
   * Render a template with variable substitution
   */
  render(
    type: TSMSTemplateType,
    variables: ITemplateVariables,
    locale: string = "en",
    orgId?: string
  ): string {
    const template = this.getTemplate(type, orgId);
    if (!template) {
      logger.error("[SMSTemplateService] Template not found", { type, orgId });
      throw new Error(`SMS template not found: ${type}`);
    }

    if (!template.isActive) {
      logger.warn("[SMSTemplateService] Template is inactive", {
        type,
        orgId,
      });
      throw new Error(`SMS template is inactive: ${type}`);
    }

    // Get content for locale, fallback to English
    const content = template.content[locale] || template.content.en;
    if (!content) {
      throw new Error(`No content for template ${type} in locale ${locale}`);
    }

    // Perform variable substitution
    const rendered = this.substitute(content, variables);

    // Validate message length if maxLength is set
    if (template.maxLength && rendered.length > template.maxLength) {
      logger.warn("[SMSTemplateService] Message exceeds max length", {
        type,
        orgId,
        length: rendered.length,
        maxLength: template.maxLength,
      });
    }

    return rendered;
  }

  /**
   * Substitute variables in a template string
   */
  private substitute(content: string, variables: ITemplateVariables): string {
    return content.replace(VARIABLE_PATTERN, (match, varName) => {
      const value = variables[varName];
      if (value === undefined) {
        logger.warn("[SMSTemplateService] Missing variable", {
          variable: varName,
        });
        return match; // Keep placeholder if variable is missing
      }
      return String(value);
    });
  }

  /**
   * Validate that all required variables are provided
   */
  validateVariables(
    type: TSMSTemplateType,
    variables: ITemplateVariables,
    orgId?: string
  ): { valid: boolean; missing: string[] } {
    const template = this.getTemplate(type, orgId);
    if (!template) {
      return { valid: false, missing: [] };
    }

    const missing = template.variables.filter(
      (v) => variables[v] === undefined
    );
    return {
      valid: missing.length === 0,
      missing,
    };
  }

  /**
   * Get all available template types
   */
  getAvailableTypes(): TSMSTemplateType[] {
    return [...SMSTemplateType];
  }

  /**
   * Get all templates (with org overrides if applicable)
   */
  getAllTemplates(orgId?: string): ISMSTemplate[] {
    const templates: ISMSTemplate[] = [];
    const orgTemplateMap = orgId ? this.orgTemplates.get(orgId) : undefined;

    for (const type of SMSTemplateType) {
      if (orgTemplateMap?.has(type)) {
        templates.push(orgTemplateMap.get(type)!);
      } else if (DEFAULT_TEMPLATES[type]) {
        templates.push(DEFAULT_TEMPLATES[type]);
      }
    }

    return templates;
  }

  /**
   * Extract variables from a template string
   */
  static extractVariables(content: string): string[] {
    const variables: string[] = [];
    let match: RegExpExecArray | null;
    while ((match = VARIABLE_PATTERN.exec(content)) !== null) {
      if (!variables.includes(match[1])) {
        variables.push(match[1]);
      }
    }
    return variables;
  }
}

// Singleton instance
export const smsTemplateService = new SMSTemplateService();

// Re-export default templates for reference
export { DEFAULT_TEMPLATES };
