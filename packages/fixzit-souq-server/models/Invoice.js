const mongoose = require('mongoose');

const invoiceSchema = new mongoose.Schema({
  invoiceNumber: {
    type: String,
    required: true,
    unique: true
  },
  uuid: String,
  typeCode: {
    type: String,
    enum: ['388', '381', '383'], // 388: Tax Invoice, 381: Credit Note, 383: Debit Note
    default: '388'
  },
  issueDate: {
    type: String,
    required: true
  },
  issueTime: {
    type: String,
    required: true
  },
  dueDate: Date,
  supplier: {
    name: String,
    nameArabic: String,
    vatNumber: {
      type: String,
      required: true
    },
    crn: String,
    address: {
      street: String,
      city: String,
      postalCode: String,
      country: { type: String, default: 'SA' }
    }
  },
  customer: {
    name: {
      type: String,
      required: true
    },
    nameArabic: String,
    vatNumber: String,
    nationalId: String,
    crn: String,
    email: String,
    phone: String,
    address: {
      street: String,
      city: String,
      postalCode: String,
      country: { type: String, default: 'SA' }
    }
  },
  items: [{
    description: {
      type: String,
      required: true
    },
    descriptionArabic: String,
    quantity: {
      type: Number,
      required: true
    },
    unitCode: {
      type: String,
      default: 'PCE'
    },
    unitPrice: {
      type: Number,
      required: true
    },
    discount: {
      type: Number,
      default: 0
    },
    lineTotal: Number,
    vatRate: {
      type: Number,
      default: 15
    },
    vatAmount: Number,
    taxCategory: {
      type: String,
      default: 'S' // S: Standard, Z: Zero-rated, E: Exempt
    },
    totalWithVat: Number
  }],
  subtotal: {
    type: Number,
    required: true
  },
  totalDiscount: {
    type: Number,
    default: 0
  },
  totalVat: {
    type: Number,
    required: true
  },
  total: {
    type: Number,
    required: true
  },
  currency: {
    type: String,
    default: 'SAR'
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'partial', 'paid', 'overdue'],
    default: 'pending'
  },
  paymentMethod: {
    type: String,
    enum: ['cash', 'bank_transfer', 'credit_card', 'check']
  },
  propertyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Property'
  },
  workOrderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'WorkOrder'
  },
  contractId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Contract'
  },
  notes: String,
  termsAndConditions: String,
  zatcaSubmission: {
    status: {
      type: String,
      enum: ['DRAFT', 'REPORTED', 'CANCELLED']
    },
    clearanceStatus: {
      type: String,
      enum: ['CLEARED', 'NOT_CLEARED', 'REJECTED']
    },
    submissionDate: Date,
    invoiceHash: String,
    signature: String,
    qrCode: String,
    xml: String,
    response: Object,
    errors: [String]
  }
}, {
  timestamps: true
});

// Calculate totals before saving
invoiceSchema.pre('save', function(next) {
  // Calculate line totals
  this.items.forEach(item => {
    item.lineTotal = item.quantity * item.unitPrice - (item.discount || 0);
    item.vatAmount = item.lineTotal * (item.vatRate / 100);
    item.totalWithVat = item.lineTotal + item.vatAmount;
  });
  
  // Calculate invoice totals
  this.subtotal = this.items.reduce((sum, item) => sum + item.lineTotal, 0);
  this.totalVat = this.items.reduce((sum, item) => sum + item.vatAmount, 0);
  this.total = this.subtotal + this.totalVat;
  
  // Generate UUID if not exists
  if (!this.uuid) {
    this.uuid = require('../services/zatca').generateUUID();
  }
  
  // Set issue time if not provided
  if (!this.issueTime && this.issueDate) {
    this.issueTime = new Date().toTimeString().split(' ')[0];
  }
  
  // Update payment status based on due date
  if (this.paymentStatus === 'pending' && this.dueDate && new Date() > this.dueDate) {
    this.paymentStatus = 'overdue';
  }
  
  next();
});

// Generate invoice number
invoiceSchema.statics.generateInvoiceNumber = async function() {
  const year = new Date().getFullYear();
  const lastInvoice = await this.findOne({ 
    invoiceNumber: new RegExp(`^INV-${year}-`) 
  }).sort({ invoiceNumber: -1 });
  
  let sequence = 1;
  if (lastInvoice) {
    const lastSequence = parseInt(lastInvoice.invoiceNumber.split('-').pop());
    sequence = lastSequence + 1;
  }
  
  return `INV-${year}-${sequence.toString().padStart(6, '0')}`;
};

module.exports = mongoose.model('Invoice', invoiceSchema);