const crypto = require('crypto');
const axios = require('axios');

class PaymentService {
  constructor() {
    this.gateways = {
      stripe: {
        apiKey: process.env.STRIPE_API_KEY,
        secretKey: process.env.STRIPE_SECRET_KEY,
        webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
        apiUrl: 'https://api.stripe.com/v1'
      },
      payfort: {
        merchantIdentifier: process.env.PAYFORT_MERCHANT_ID,
        accessCode: process.env.PAYFORT_ACCESS_CODE,
        shaRequestPhrase: process.env.PAYFORT_SHA_REQUEST,
        shaResponsePhrase: process.env.PAYFORT_SHA_RESPONSE,
        apiUrl: process.env.PAYFORT_TEST ? 'https://sbcheckout.payfort.com/FortAPI/paymentPage' : 'https://checkout.payfort.com/FortAPI/paymentPage'
      },
      tap: {
        apiKey: process.env.TAP_API_KEY,
        secretKey: process.env.TAP_SECRET_KEY,
        apiUrl: 'https://api.tap.company/v2'
      }
    };
  }

  // Process payment through selected gateway
  async processPayment(paymentData) {
    const { gateway, amount, currency, customer, invoice, method } = paymentData;
    
    switch (gateway) {
      case 'stripe':
        return await this.processStripePayment(paymentData);
      case 'payfort':
        return await this.processPayfortPayment(paymentData);
      case 'tap':
        return await this.processTapPayment(paymentData);
      default:
        throw new Error(`Unsupported payment gateway: ${gateway}`);
    }
  }

  // Stripe payment processing
  async processStripePayment(paymentData) {
    const { amount, currency, customer, invoice, paymentMethod } = paymentData;
    
    try {
      // Create payment intent
      const paymentIntent = {
        amount: Math.round(amount * 100), // Convert to cents
        currency: currency.toLowerCase(),
        payment_method: paymentMethod,
        customer: customer.stripeCustomerId,
        metadata: {
          invoiceId: invoice._id.toString(),
          invoiceNumber: invoice.invoiceNumber
        },
        confirm: true,
        return_url: `${process.env.FRONTEND_URL}/payments/success`
      };

      // In production, use actual Stripe API
      const response = {
        id: `pi_${this.generateRandomId()}`,
        status: 'succeeded',
        amount: paymentIntent.amount,
        currency: paymentIntent.currency,
        created: Math.floor(Date.now() / 1000),
        charges: {
          data: [{
            id: `ch_${this.generateRandomId()}`,
            amount: paymentIntent.amount,
            receipt_url: `https://pay.stripe.com/receipts/${this.generateRandomId()}`
          }]
        }
      };

      return {
        success: true,
        gateway: 'stripe',
        transactionId: response.id,
        status: response.status,
        amount: amount,
        currency: currency,
        receiptUrl: response.charges.data[0].receipt_url,
        rawResponse: response
      };
    } catch (error) {
      return {
        success: false,
        gateway: 'stripe',
        error: error.message,
        code: error.code
      };
    }
  }

  // PayFort payment processing (Popular in Middle East)
  async processPayfortPayment(paymentData) {
    const { amount, currency, customer, invoice, returnUrl } = paymentData;
    const config = this.gateways.payfort;
    
    // Generate signature
    const requestData = {
      command: 'PURCHASE',
      access_code: config.accessCode,
      merchant_identifier: config.merchantIdentifier,
      merchant_reference: invoice.invoiceNumber,
      amount: Math.round(amount * 100),
      currency: currency,
      language: customer.language || 'en',
      customer_email: customer.email,
      customer_name: customer.name,
      return_url: returnUrl || `${process.env.FRONTEND_URL}/payments/callback`,
      fort_id: this.generateRandomId()
    };
    
    requestData.signature = this.calculatePayfortSignature(requestData, 'request');
    
    return {
      success: true,
      gateway: 'payfort',
      action: 'redirect',
      redirectUrl: config.apiUrl,
      formData: requestData
    };
  }

  // Tap Payment processing (Kuwait-based, popular in GCC)
  async processTapPayment(paymentData) {
    const { amount, currency, customer, invoice, card } = paymentData;
    const config = this.gateways.tap;
    
    try {
      const chargeData = {
        amount,
        currency,
        customer: {
          first_name: customer.name.split(' ')[0],
          last_name: customer.name.split(' ').slice(1).join(' '),
          email: customer.email,
          phone: {
            country_code: '966',
            number: customer.phone
          }
        },
        source: {
          id: card.tokenId || 'tok_visa' // Card token from Tap.js
        },
        post: {
          url: `${process.env.BACKEND_URL}/api/payments/webhook/tap`
        },
        redirect: {
          url: `${process.env.FRONTEND_URL}/payments/success`
        },
        metadata: {
          invoiceId: invoice._id.toString(),
          invoiceNumber: invoice.invoiceNumber
        },
        reference: {
          transaction: invoice.invoiceNumber,
          order: invoice._id.toString()
        },
        receipt: {
          email: true,
          sms: true
        },
        customer: {
          email: customer.email,
          phone: customer.phone
        }
      };

      // In production, call actual Tap API
      const response = {
        id: `chg_${this.generateRandomId()}`,
        status: 'CAPTURED',
        amount,
        currency,
        customer: {
          id: `cus_${this.generateRandomId()}`,
          email: customer.email
        },
        source: {
          payment_method: 'VISA',
          last4: '4242'
        },
        transaction: {
          url: `https://tap.company/v2/charges/${this.generateRandomId()}`
        }
      };

      return {
        success: true,
        gateway: 'tap',
        transactionId: response.id,
        status: response.status,
        amount,
        currency,
        receiptUrl: response.transaction.url,
        rawResponse: response
      };
    } catch (error) {
      return {
        success: false,
        gateway: 'tap',
        error: error.message
      };
    }
  }

  // Calculate PayFort signature
  calculatePayfortSignature(data, type) {
    const phrase = type === 'request' ? this.gateways.payfort.shaRequestPhrase : this.gateways.payfort.shaResponsePhrase;
    
    // Sort parameters alphabetically
    const sortedKeys = Object.keys(data).sort();
    let signatureString = phrase;
    
    sortedKeys.forEach(key => {
      if (key !== 'signature' && data[key] !== undefined && data[key] !== null) {
        signatureString += `${key}=${data[key]}`;
      }
    });
    
    signatureString += phrase;
    
    // Generate SHA-256 signature
    return crypto.createHash('sha256').update(signatureString).digest('hex');
  }

  // Verify webhook signature
  verifyWebhookSignature(gateway, payload, signature) {
    switch (gateway) {
      case 'stripe':
        return this.verifyStripeWebhook(payload, signature);
      case 'payfort':
        return this.verifyPayfortWebhook(payload);
      case 'tap':
        return this.verifyTapWebhook(payload, signature);
      default:
        return false;
    }
  }

  // Verify Stripe webhook
  verifyStripeWebhook(payload, signature) {
    const secret = this.gateways.stripe.webhookSecret;
    const computedSignature = crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex');
    
    return computedSignature === signature;
  }

  // Verify PayFort response
  verifyPayfortWebhook(data) {
    const receivedSignature = data.signature;
    delete data.signature;
    
    const calculatedSignature = this.calculatePayfortSignature(data, 'response');
    return receivedSignature === calculatedSignature;
  }

  // Verify Tap webhook
  verifyTapWebhook(payload, signature) {
    const secret = this.gateways.tap.secretKey;
    const computedSignature = crypto
      .createHmac('sha256', secret)
      .update(JSON.stringify(payload))
      .digest('hex');
    
    return computedSignature === signature;
  }

  // Process refund
  async processRefund(transactionId, amount, reason, gateway) {
    const refundData = {
      transactionId,
      amount,
      reason,
      refundId: `ref_${this.generateRandomId()}`,
      status: 'succeeded',
      processedAt: new Date()
    };

    // In production, call actual gateway API for refund
    return {
      success: true,
      gateway,
      refund: refundData
    };
  }

  // Get transaction details
  async getTransaction(transactionId, gateway) {
    // In production, fetch from actual gateway
    return {
      id: transactionId,
      gateway,
      status: 'succeeded',
      amount: 1000,
      currency: 'SAR',
      created: new Date(),
      customer: {
        email: 'customer@example.com'
      }
    };
  }

  // Generate random ID for testing
  generateRandomId() {
    return crypto.randomBytes(16).toString('hex');
  }

  // Create payment link
  async createPaymentLink(invoice, expiryHours = 48) {
    const link = {
      id: `link_${this.generateRandomId()}`,
      url: `${process.env.FRONTEND_URL}/pay/${this.generateRandomId()}`,
      amount: invoice.total,
      currency: invoice.currency,
      description: `Invoice ${invoice.invoiceNumber}`,
      metadata: {
        invoiceId: invoice._id.toString(),
        invoiceNumber: invoice.invoiceNumber
      },
      expiresAt: new Date(Date.now() + expiryHours * 60 * 60 * 1000),
      status: 'active'
    };

    return link;
  }

  // Handle recurring payments
  async setupRecurringPayment(customer, plan) {
    const subscription = {
      id: `sub_${this.generateRandomId()}`,
      customerId: customer._id,
      planId: plan.id,
      status: 'active',
      currentPeriodStart: new Date(),
      currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      amount: plan.amount,
      currency: plan.currency,
      interval: plan.interval // monthly, yearly
    };

    return subscription;
  }
}

module.exports = new PaymentService();