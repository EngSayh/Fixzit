const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const EventEmitter = require('events');

class CorporateSubscriptionManager extends EventEmitter {
  constructor(options = {}) {
    super();
    
    this.config = {
      stripe: {
        secretKey: process.env.STRIPE_SECRET_KEY,
        webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
        currency: 'sar'
      },
      billing: {
        gracePeriodDays: 7,
        trialPeriodDays: 14,
        invoiceReminderDays: [7, 3, 1],
        autoSuspendAfterDays: 30
      },
      plans: this.initializePlans(),
      features: this.initializeFeatures(),
      ...options
    };

    this.subscriptions = new Map();
    this.organizations = new Map();
    this.usageMetrics = new Map();
    
    this.initialize();
  }

  initializePlans() {
    return {
      STARTER: {
        id: 'starter',
        name: 'Starter Plan',
        description: 'Perfect for small property portfolios',
        price: {
          monthly: 299,
          annual: 2990, // 2 months free
          currency: 'SAR'
        },
        limits: {
          properties: 5,
          units: 50,
          users: 3,
          workOrders: 100,
          storage: 5, // GB
          apiCalls: 1000,
          reports: 10
        },
        features: [
          'basic_property_management',
          'work_order_system',
          'tenant_portal',
          'basic_reporting',
          'email_support'
        ],
        trial: true,
        popular: false
      },

      PROFESSIONAL: {
        id: 'professional',
        name: 'Professional Plan',
        description: 'For growing property management companies',
        price: {
          monthly: 799,
          annual: 7990, // 2 months free
          currency: 'SAR'
        },
        limits: {
          properties: 25,
          units: 500,
          users: 10,
          workOrders: 1000,
          storage: 25, // GB
          apiCalls: 10000,
          reports: 50
        },
        features: [
          'advanced_property_management',
          'work_order_system',
          'tenant_portal',
          'financial_management',
          'hr_management',
          'advanced_reporting',
          'mobile_apps',
          'priority_support',
          'zatca_compliance'
        ],
        trial: true,
        popular: true
      },

      ENTERPRISE: {
        id: 'enterprise',
        name: 'Enterprise Plan',
        description: 'For large property management enterprises',
        price: {
          monthly: 1999,
          annual: 19990, // 2 months free
          currency: 'SAR'
        },
        limits: {
          properties: 100,
          units: 2000,
          users: 50,
          workOrders: 10000,
          storage: 100, // GB
          apiCalls: 100000,
          reports: 'unlimited'
        },
        features: [
          'complete_platform_access',
          'advanced_analytics',
          'workflow_automation',
          'iot_integration',
          'digital_signatures',
          'compliance_management',
          'dedicated_support',
          'custom_integrations',
          'white_label_options'
        ],
        trial: true,
        popular: false
      },

      CUSTOM: {
        id: 'custom',
        name: 'Custom Enterprise',
        description: 'Tailored solutions for large organizations',
        price: {
          monthly: 'custom',
          annual: 'custom',
          currency: 'SAR'
        },
        limits: {
          properties: 'unlimited',
          units: 'unlimited',
          users: 'unlimited',
          workOrders: 'unlimited',
          storage: 'unlimited',
          apiCalls: 'unlimited',
          reports: 'unlimited'
        },
        features: [
          'everything_included',
          'custom_development',
          'dedicated_infrastructure',
          'sla_guarantees',
          'premium_support',
          'training_included',
          'migration_assistance'
        ],
        trial: false,
        popular: false
      }
    };
  }

  initializeFeatures() {
    return {
      // Core Features
      basic_property_management: {
        name: 'Basic Property Management',
        description: 'Manage properties, units, and basic tenant information'
      },
      advanced_property_management: {
        name: 'Advanced Property Management',
        description: 'Full property lifecycle management with advanced features'
      },
      complete_platform_access: {
        name: 'Complete Platform Access',
        description: 'Access to all platform modules and features'
      },

      // Functional Features
      work_order_system: {
        name: 'Work Order System',
        description: 'Create, assign, and track maintenance work orders'
      },
      tenant_portal: {
        name: 'Tenant Portal',
        description: 'Self-service portal for tenants'
      },
      financial_management: {
        name: 'Financial Management',
        description: 'Invoicing, payments, and financial reporting'
      },
      hr_management: {
        name: 'HR Management',
        description: 'Employee management and HR workflows'
      },

      // Advanced Features
      workflow_automation: {
        name: 'Workflow Automation',
        description: 'Visual workflow designer and automation engine'
      },
      iot_integration: {
        name: 'IoT Integration',
        description: 'Smart building sensors and automation'
      },
      digital_signatures: {
        name: 'Digital Signatures',
        description: 'Legally binding electronic document signing'
      },
      compliance_management: {
        name: 'Compliance Management',
        description: 'Regulatory compliance and audit trails'
      },

      // Reporting & Analytics
      basic_reporting: {
        name: 'Basic Reporting',
        description: 'Standard reports and dashboards'
      },
      advanced_reporting: {
        name: 'Advanced Reporting',
        description: 'Custom reports and advanced analytics'
      },
      advanced_analytics: {
        name: 'Advanced Analytics',
        description: 'Predictive analytics and business intelligence'
      },

      // Support & Compliance
      zatca_compliance: {
        name: 'ZATCA Compliance',
        description: 'Saudi tax authority e-invoicing compliance'
      },
      mobile_apps: {
        name: 'Mobile Applications',
        description: 'iOS and Android mobile apps'
      },
      email_support: {
        name: 'Email Support',
        description: 'Standard email support'
      },
      priority_support: {
        name: 'Priority Support',
        description: 'Priority customer support with faster response times'
      },
      dedicated_support: {
        name: 'Dedicated Support',
        description: 'Dedicated customer success manager'
      }
    };
  }

  // Subscription Management
  async createSubscription(organizationData, planId, billingCycle = 'monthly') {
    try {
      const plan = this.config.plans[planId.toUpperCase()];
      if (!plan) {
        throw new Error(`Plan ${planId} not found`);
      }

      // Create Stripe customer
      const customer = await stripe.customers.create({
        name: organizationData.name,
        email: organizationData.email,
        phone: organizationData.phone,
        metadata: {
          organizationId: organizationData.id,
          planId: planId,
          billingCycle: billingCycle
        }
      });

      // Create subscription
      const subscription = {
        id: this.generateSubscriptionId(),
        organizationId: organizationData.id,
        customerId: customer.id,
        planId: planId,
        billingCycle: billingCycle,
        status: 'trial', // Start with trial
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + this.config.billing.trialPeriodDays * 24 * 60 * 60 * 1000),
        trialEnd: new Date(Date.now() + this.config.billing.trialPeriodDays * 24 * 60 * 60 * 1000),
        limits: { ...plan.limits },
        features: [...plan.features],
        usage: this.initializeUsageTracking(),
        createdAt: new Date(),
        updatedAt: new Date()
      };

      this.subscriptions.set(subscription.id, subscription);
      await this.saveSubscription(subscription);

      // Initialize organization with subscription
      await this.setupOrganization(organizationData, subscription);

      this.emit('subscription_created', { subscription, organization: organizationData });
      
      return subscription;
    } catch (error) {
      console.error('Failed to create subscription:', error);
      throw error;
    }
  }

  async upgradeSubscription(subscriptionId, newPlanId, effectiveDate = new Date()) {
    const subscription = this.subscriptions.get(subscriptionId);
    if (!subscription) {
      throw new Error(`Subscription ${subscriptionId} not found`);
    }

    const newPlan = this.config.plans[newPlanId.toUpperCase()];
    if (!newPlan) {
      throw new Error(`Plan ${newPlanId} not found`);
    }

    // Calculate prorated charges
    const prorationResult = this.calculateProration(subscription, newPlan, effectiveDate);

    // Update subscription
    subscription.planId = newPlanId;
    subscription.limits = { ...newPlan.limits };
    subscription.features = [...newPlan.features];
    subscription.updatedAt = new Date();

    // Create upgrade invoice if needed
    if (prorationResult.amountDue > 0) {
      await this.createUpgradeInvoice(subscription, prorationResult);
    }

    await this.updateSubscription(subscription);
    this.emit('subscription_upgraded', { subscription, oldPlan: subscription.planId, newPlan: newPlanId });

    return {
      subscription,
      proration: prorationResult,
      effectiveDate
    };
  }

  async cancelSubscription(subscriptionId, cancelAt = 'period_end', reason = '') {
    const subscription = this.subscriptions.get(subscriptionId);
    if (!subscription) {
      throw new Error(`Subscription ${subscriptionId} not found`);
    }

    if (cancelAt === 'immediately') {
      subscription.status = 'cancelled';
      subscription.cancelledAt = new Date();
      subscription.currentPeriodEnd = new Date();
    } else {
      subscription.status = 'cancel_at_period_end';
      subscription.cancelAtPeriodEnd = true;
      subscription.cancellationReason = reason;
    }

    subscription.updatedAt = new Date();
    await this.updateSubscription(subscription);

    this.emit('subscription_cancelled', { subscription, cancelAt, reason });
    
    return subscription;
  }

  // Usage Tracking
  initializeUsageTracking() {
    return {
      properties: 0,
      units: 0,
      users: 0,
      workOrders: 0,
      storage: 0,
      apiCalls: 0,
      reports: 0,
      lastReset: new Date(),
      history: []
    };
  }

  async trackUsage(organizationId, metric, amount = 1) {
    const subscription = this.getSubscriptionByOrganization(organizationId);
    if (!subscription) return;

    const usage = subscription.usage;
    usage[metric] = (usage[metric] || 0) + amount;
    usage.lastUpdated = new Date();

    // Check limits
    const limit = subscription.limits[metric];
    if (limit && limit !== 'unlimited' && usage[metric] > limit) {
      await this.handleUsageExceeded(subscription, metric, usage[metric], limit);
    }

    await this.updateSubscriptionUsage(subscription.id, usage);
  }

  async handleUsageExceeded(subscription, metric, currentUsage, limit) {
    const overage = currentUsage - limit;
    const overagePercent = (overage / limit) * 100;

    // Emit warning at 80% usage
    if (overagePercent >= 80 && overagePercent < 100) {
      this.emit('usage_warning', {
        subscription,
        metric,
        usage: currentUsage,
        limit,
        percent: (currentUsage / limit) * 100
      });
    }

    // Handle limit exceeded
    if (overagePercent >= 100) {
      this.emit('usage_exceeded', {
        subscription,
        metric,
        usage: currentUsage,
        limit,
        overage
      });

      // Apply usage-based restrictions
      await this.applyUsageRestrictions(subscription, metric);
    }
  }

  async applyUsageRestrictions(subscription, metric) {
    const restrictions = {
      properties: 'disable_property_creation',
      users: 'disable_user_creation',
      storage: 'disable_file_uploads',
      apiCalls: 'rate_limit_api',
      reports: 'disable_report_generation'
    };

    const restriction = restrictions[metric];
    if (restriction) {
      await this.addSubscriptionRestriction(subscription.id, restriction);
      
      // Notify organization admins
      await this.notifyUsageExceeded(subscription, metric);
    }
  }

  // Billing and Invoicing
  async generateInvoice(subscription, billingPeriod) {
    const plan = this.config.plans[subscription.planId.toUpperCase()];
    const amount = subscription.billingCycle === 'annual' ? plan.price.annual : plan.price.monthly;

    // Calculate usage overages
    const overageCharges = await this.calculateOverageCharges(subscription);
    const totalAmount = amount + overageCharges.total;

    const invoice = {
      id: this.generateInvoiceId(),
      subscriptionId: subscription.id,
      organizationId: subscription.organizationId,
      customerId: subscription.customerId,
      
      // Invoice details
      invoiceNumber: this.generateInvoiceNumber(),
      amount: amount,
      overageCharges: overageCharges.charges,
      totalAmount: totalAmount,
      currency: plan.price.currency,
      
      // Billing period
      periodStart: billingPeriod.start,
      periodEnd: billingPeriod.end,
      
      // Status and dates
      status: 'pending',
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      createdAt: new Date(),
      
      // Line items
      lineItems: [
        {
          description: `${plan.name} - ${subscription.billingCycle}`,
          quantity: 1,
          unitPrice: amount,
          totalPrice: amount
        },
        ...overageCharges.charges.map(charge => ({
          description: charge.description,
          quantity: charge.quantity,
          unitPrice: charge.unitPrice,
          totalPrice: charge.total
        }))
      ],

      // Tax calculation (Saudi VAT)
      tax: {
        rate: 0.15, // 15% VAT
        amount: totalAmount * 0.15
      },
      
      // ZATCA compliance
      zatca: {
        required: true,
        qrCode: null, // Will be generated
        hash: null // Will be calculated
      }
    };

    // Calculate final amount with tax
    invoice.finalAmount = invoice.totalAmount + invoice.tax.amount;

    await this.saveInvoice(invoice);
    
    // Generate ZATCA-compliant QR code
    if (invoice.zatca.required) {
      invoice.zatca.qrCode = await this.generateZATCAQRCode(invoice);
      invoice.zatca.hash = this.calculateInvoiceHash(invoice);
    }

    this.emit('invoice_generated', invoice);
    
    return invoice;
  }

  calculateOverageCharges(subscription) {
    const charges = [];
    const plan = this.config.plans[subscription.planId.toUpperCase()];
    
    // Define overage rates
    const overageRates = {
      properties: 50, // SAR per property
      units: 5, // SAR per unit
      users: 25, // SAR per user
      storage: 10, // SAR per GB
      apiCalls: 0.001, // SAR per API call
      reports: 15 // SAR per report
    };

    Object.entries(subscription.usage).forEach(([metric, usage]) => {
      const limit = plan.limits[metric];
      if (limit && limit !== 'unlimited' && usage > limit) {
        const overage = usage - limit;
        const rate = overageRates[metric];
        
        if (rate) {
          const total = overage * rate;
          charges.push({
            metric,
            description: `${metric.replace('_', ' ').toUpperCase()} overage (${overage} × ${rate} SAR)`,
            quantity: overage,
            unitPrice: rate,
            total
          });
        }
      }
    });

    return {
      charges,
      total: charges.reduce((sum, charge) => sum + charge.total, 0)
    };
  }

  // Feature Access Control
  hasFeature(organizationId, featureId) {
    const subscription = this.getSubscriptionByOrganization(organizationId);
    if (!subscription) return false;

    if (subscription.status === 'cancelled' || subscription.status === 'suspended') {
      return false;
    }

    return subscription.features.includes(featureId);
  }

  async checkUsageLimit(organizationId, metric) {
    const subscription = this.getSubscriptionByOrganization(organizationId);
    if (!subscription) return { allowed: false, reason: 'No subscription' };

    const usage = subscription.usage[metric] || 0;
    const limit = subscription.limits[metric];

    if (limit === 'unlimited') {
      return { allowed: true };
    }

    if (typeof limit === 'number' && usage >= limit) {
      return { 
        allowed: false, 
        reason: 'Usage limit exceeded',
        usage,
        limit
      };
    }

    return { allowed: true, usage, limit };
  }

  // Organization Setup
  async setupOrganization(organizationData, subscription) {
    const organization = {
      id: organizationData.id,
      name: organizationData.name,
      email: organizationData.email,
      phone: organizationData.phone,
      address: organizationData.address,
      
      // Subscription info
      subscriptionId: subscription.id,
      planId: subscription.planId,
      
      // Settings based on plan
      settings: {
        features: subscription.features,
        limits: subscription.limits,
        branding: {
          customLogo: this.hasFeature(organizationData.id, 'white_label_options'),
          customColors: this.hasFeature(organizationData.id, 'white_label_options'),
          customDomain: this.hasFeature(organizationData.id, 'custom_integrations')
        },
        integrations: {
          api: this.hasFeature(organizationData.id, 'custom_integrations'),
          webhooks: this.hasFeature(organizationData.id, 'custom_integrations'),
          sso: this.hasFeature(organizationData.id, 'enterprise_features')
        }
      },
      
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.organizations.set(organization.id, organization);
    await this.saveOrganization(organization);

    // Create default admin user
    await this.createDefaultAdminUser(organization, organizationData.adminUser);

    return organization;
  }

  async createDefaultAdminUser(organization, adminUserData) {
    const adminUser = {
      id: this.generateUserId(),
      organizationId: organization.id,
      email: adminUserData.email,
      name: adminUserData.name,
      role: 'corporate_admin',
      permissions: this.getRolePermissions('corporate_admin'),
      status: 'active',
      isOwner: true,
      createdAt: new Date()
    };

    await this.saveUser(adminUser);
    
    // Send welcome email
    this.emit('admin_user_created', { user: adminUser, organization });
    
    return adminUser;
  }

  // Billing Automation
  async processBillingCycle() {
    console.log('🔄 Processing billing cycle...');
    
    const subscriptions = Array.from(this.subscriptions.values());
    const results = {
      processed: 0,
      failed: 0,
      errors: []
    };

    for (const subscription of subscriptions) {
      try {
        if (this.shouldGenerateInvoice(subscription)) {
          const billingPeriod = this.getCurrentBillingPeriod(subscription);
          const invoice = await this.generateInvoice(subscription, billingPeriod);
          
          // Attempt to charge
          if (subscription.status === 'active') {
            await this.processPayment(invoice);
          }
          
          results.processed++;
        }
      } catch (error) {
        console.error(`Billing error for subscription ${subscription.id}:`, error);
        results.failed++;
        results.errors.push({
          subscriptionId: subscription.id,
          error: error.message
        });
      }
    }

    console.log(`✅ Billing cycle completed: ${results.processed} processed, ${results.failed} failed`);
    return results;
  }

  shouldGenerateInvoice(subscription) {
    if (subscription.status !== 'active') return false;
    
    const now = new Date();
    const nextBillingDate = new Date(subscription.currentPeriodEnd);
    
    // Generate invoice 3 days before period end
    const invoiceGenerationDate = new Date(nextBillingDate.getTime() - 3 * 24 * 60 * 60 * 1000);
    
    return now >= invoiceGenerationDate;
  }

  async processPayment(invoice) {
    try {
      const subscription = this.subscriptions.get(invoice.subscriptionId);
      
      // Create payment intent with Stripe
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(invoice.finalAmount * 100), // Convert to halalas
        currency: 'sar',
        customer: subscription.customerId,
        description: `Invoice ${invoice.invoiceNumber}`,
        metadata: {
          invoiceId: invoice.id,
          subscriptionId: subscription.id,
          organizationId: subscription.organizationId
        }
      });

      invoice.paymentIntentId = paymentIntent.id;
      invoice.status = 'sent';
      
      await this.updateInvoice(invoice);
      
      // Send invoice notification
      this.emit('invoice_sent', invoice);
      
      return paymentIntent;
    } catch (error) {
      console.error('Payment processing error:', error);
      invoice.status = 'failed';
      invoice.error = error.message;
      await this.updateInvoice(invoice);
      throw error;
    }
  }

  // Webhook Handling
  async handleStripeWebhook(event) {
    try {
      switch (event.type) {
        case 'payment_intent.succeeded':
          await this.handlePaymentSuccess(event.data.object);
          break;
        case 'payment_intent.payment_failed':
          await this.handlePaymentFailure(event.data.object);
          break;
        case 'customer.subscription.updated':
          await this.handleSubscriptionUpdate(event.data.object);
          break;
        case 'customer.subscription.deleted':
          await this.handleSubscriptionCancellation(event.data.object);
          break;
        case 'invoice.payment_succeeded':
          await this.handleInvoicePayment(event.data.object);
          break;
        default:
          console.log(`Unhandled Stripe event: ${event.type}`);
      }
    } catch (error) {
      console.error('Webhook handling error:', error);
      throw error;
    }
  }

  async handlePaymentSuccess(paymentIntent) {
    const invoiceId = paymentIntent.metadata.invoiceId;
    const invoice = await this.getInvoice(invoiceId);
    
    if (invoice) {
      invoice.status = 'paid';
      invoice.paidAt = new Date();
      await this.updateInvoice(invoice);

      // Update subscription
      const subscription = this.subscriptions.get(invoice.subscriptionId);
      if (subscription) {
        subscription.status = 'active';
        subscription.currentPeriodStart = new Date();
        subscription.currentPeriodEnd = this.calculateNextBillingDate(subscription);
        await this.updateSubscription(subscription);
      }

      this.emit('payment_received', { invoice, paymentIntent });
    }
  }

  // Analytics and Reporting
  async getSubscriptionAnalytics(organizationId = null) {
    const subscriptions = organizationId ? 
      [this.getSubscriptionByOrganization(organizationId)].filter(Boolean) :
      Array.from(this.subscriptions.values());

    const analytics = {
      total: subscriptions.length,
      byStatus: this.groupBy(subscriptions, 'status'),
      byPlan: this.groupBy(subscriptions, 'planId'),
      byBillingCycle: this.groupBy(subscriptions, 'billingCycle'),
      revenue: {
        monthly: 0,
        annual: 0,
        total: 0
      },
      usage: {
        averageUsage: {},
        topUsers: [],
        growthTrend: []
      },
      churn: {
        rate: 0,
        reasons: {}
      }
    };

    // Calculate revenue
    subscriptions.forEach(sub => {
      if (sub.status === 'active') {
        const plan = this.config.plans[sub.planId.toUpperCase()];
        if (plan) {
          if (sub.billingCycle === 'monthly') {
            analytics.revenue.monthly += plan.price.monthly;
          } else {
            analytics.revenue.annual += plan.price.annual;
          }
        }
      }
    });

    analytics.revenue.total = analytics.revenue.monthly * 12 + analytics.revenue.annual;

    return analytics;
  }

  // Utility Methods
  getSubscriptionByOrganization(organizationId) {
    return Array.from(this.subscriptions.values()).find(sub => sub.organizationId === organizationId);
  }

  calculateProration(subscription, newPlan, effectiveDate) {
    const currentPlan = this.config.plans[subscription.planId.toUpperCase()];
    const daysRemaining = Math.ceil((subscription.currentPeriodEnd.getTime() - effectiveDate.getTime()) / (24 * 60 * 60 * 1000));
    const totalDays = Math.ceil((subscription.currentPeriodEnd.getTime() - subscription.currentPeriodStart.getTime()) / (24 * 60 * 60 * 1000));
    
    const currentPlanDailyRate = subscription.billingCycle === 'annual' ? 
      currentPlan.price.annual / 365 : 
      currentPlan.price.monthly / 30;
    
    const newPlanDailyRate = subscription.billingCycle === 'annual' ? 
      newPlan.price.annual / 365 : 
      newPlan.price.monthly / 30;

    const refund = currentPlanDailyRate * daysRemaining;
    const newCharge = newPlanDailyRate * daysRemaining;
    const amountDue = newCharge - refund;

    return {
      refund,
      newCharge,
      amountDue,
      daysRemaining,
      effectiveDate
    };
  }

  calculateNextBillingDate(subscription) {
    const current = subscription.currentPeriodEnd;
    if (subscription.billingCycle === 'annual') {
      return new Date(current.getFullYear() + 1, current.getMonth(), current.getDate());
    } else {
      return new Date(current.getFullYear(), current.getMonth() + 1, current.getDate());
    }
  }

  getCurrentBillingPeriod(subscription) {
    return {
      start: subscription.currentPeriodStart,
      end: subscription.currentPeriodEnd
    };
  }

  generateSubscriptionId() {
    return `sub_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  generateInvoiceId() {
    return `inv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  generateInvoiceNumber() {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const sequence = String(Math.floor(Math.random() * 9999)).padStart(4, '0');
    return `INV-${year}${month}-${sequence}`;
  }

  generateUserId() {
    return `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  generateZATCAQRCode(invoice) {
    // Implement ZATCA QR code generation
    const qrData = {
      sellerName: 'Fixzit Enterprise',
      vatNumber: '300123456789003',
      timestamp: invoice.createdAt.toISOString(),
      totalAmount: invoice.finalAmount,
      vatAmount: invoice.tax.amount
    };
    
    return Buffer.from(JSON.stringify(qrData)).toString('base64');
  }

  calculateInvoiceHash(invoice) {
    const crypto = require('crypto');
    const data = `${invoice.invoiceNumber}${invoice.totalAmount}${invoice.createdAt.toISOString()}`;
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  groupBy(array, key) {
    return array.reduce((groups, item) => {
      const value = item[key];
      groups[value] = (groups[value] || 0) + 1;
      return groups;
    }, {});
  }

  getRolePermissions(role) {
    // This would integrate with your RBAC system
    const rolePermissions = {
      corporate_admin: ['all_within_organization'],
      corporate_user: ['limited_access']
    };
    
    return rolePermissions[role] || [];
  }

  // Abstract methods - implement based on your database
  async saveSubscription(subscription) { /* Implement database save */ }
  async updateSubscription(subscription) { /* Implement database update */ }
  async saveOrganization(organization) { /* Implement database save */ }
  async saveUser(user) { /* Implement database save */ }
  async saveInvoice(invoice) { /* Implement database save */ }
  async updateInvoice(invoice) { /* Implement database update */ }
  async getInvoice(invoiceId) { /* Implement database get */ }
  async updateSubscriptionUsage(subscriptionId, usage) { /* Implement usage update */ }
  async addSubscriptionRestriction(subscriptionId, restriction) { /* Implement restriction */ }
  async notifyUsageExceeded(subscription, metric) { /* Implement notification */ }
  async createUpgradeInvoice(subscription, prorationResult) { /* Implement upgrade invoice */ }

  // Health check
  getHealthStatus() {
    return {
      activeSubscriptions: Array.from(this.subscriptions.values()).filter(s => s.status === 'active').length,
      totalSubscriptions: this.subscriptions.size,
      totalOrganizations: this.organizations.size,
      stripeConnected: !!process.env.STRIPE_SECRET_KEY,
      billingEnabled: true
    };
  }
}

module.exports = CorporateSubscriptionManager;