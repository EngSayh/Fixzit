import { Schema, model, models, Document } from 'mongoose';

export interface ICartItem {
  productId: string;
  variantSku?: string;
  quantity: number;
  price: number;
  currency: string;
  vendorId: string;
  addedAt: Date;
}

export interface ICart extends Document {
  orgId: string;
  userId: string;
  sessionId?: string;
  status: 'active' | 'ordered' | 'abandoned' | 'expired';
  items: ICartItem[];
  totals: {
    subtotal: number;
    vat: number;
    shipping: number;
    discount: number;
    total: number;
  };
  currency: string;
  expiresAt?: Date;
  convertedToOrderId?: string;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

const CartItemSchema = new Schema<ICartItem>({
  productId: { 
    type: String, 
    required: true 
  },
  variantSku: String,
  quantity: { 
    type: Number, 
    required: true,
    min: 1
  },
  price: { 
    type: Number, 
    required: true,
    min: 0
  },
  currency: { 
    type: String, 
    default: 'SAR' 
  },
  vendorId: { 
    type: String, 
    required: true 
  },
  addedAt: { 
    type: Date, 
    default: Date.now 
  }
}, { _id: true });

const CartSchema = new Schema<ICart>({
  orgId: { 
    type: String, 
    required: true, 
    index: true 
  },
  userId: { 
    type: String, 
    required: true, 
    index: true 
  },
  sessionId: { 
    type: String, 
    index: true 
  },
  status: { 
    type: String, 
    enum: ['active', 'ordered', 'abandoned', 'expired'], 
    default: 'active',
    index: true
  },
  items: [CartItemSchema],
  totals: {
    subtotal: { 
      type: Number, 
      default: 0 
    },
    vat: { 
      type: Number, 
      default: 0 
    },
    shipping: { 
      type: Number, 
      default: 0 
    },
    discount: { 
      type: Number, 
      default: 0 
    },
    total: { 
      type: Number, 
      default: 0 
    }
  },
  currency: { 
    type: String, 
    default: 'SAR' 
  },
  expiresAt: Date,
  convertedToOrderId: String,
  metadata: {
    type: Map,
    of: Schema.Types.Mixed
  }
}, { 
  timestamps: true,
  collection: 'carts'
});

// Indexes
CartSchema.index({ orgId: 1, userId: 1, status: 1 }, { 
  unique: true, 
  partialFilterExpression: { status: 'active' } 
});
CartSchema.index({ expiresAt: 1 }, { 
  expireAfterSeconds: 0 
});
CartSchema.index({ createdAt: -1 });
CartSchema.index({ 'items.productId': 1 });

// Methods
CartSchema.methods.addItem = async function(item: Partial<ICartItem>) {
  // Check if item already exists
  const existingItemIndex = this.items.findIndex(
    (i: ICartItem) => i.productId === item.productId && i.variantSku === item.variantSku
  );

  if (existingItemIndex >= 0) {
    // Update quantity
    this.items[existingItemIndex].quantity += item.quantity || 1;
  } else {
    // Add new item
    this.items.push({
      ...item,
      addedAt: new Date()
    } as ICartItem);
  }

  return this.recalculateTotals();
};

CartSchema.methods.updateItemQuantity = async function(productId: string, quantity: number, variantSku?: string) {
  const itemIndex = this.items.findIndex(
    (i: ICartItem) => i.productId === productId && i.variantSku === variantSku
  );

  if (itemIndex >= 0) {
    if (quantity <= 0) {
      // Remove item
      this.items.splice(itemIndex, 1);
    } else {
      // Update quantity
      this.items[itemIndex].quantity = quantity;
    }
  }

  return this.recalculateTotals();
};

CartSchema.methods.removeItem = async function(productId: string, variantSku?: string) {
  return this.updateItemQuantity(productId, 0, variantSku);
};

CartSchema.methods.recalculateTotals = async function() {
  let subtotal = 0;

  this.items.forEach((item: ICartItem) => {
    subtotal += item.price * item.quantity;
  });

  const vatRate = 0.15; // 15% VAT in Saudi Arabia
  const vat = subtotal * vatRate;
  const shipping = this.items.length > 0 ? 25 : 0; // Flat shipping rate
  const discount = 0; // Calculate based on promo codes, etc.
  
  this.totals = {
    subtotal,
    vat,
    shipping,
    discount,
    total: subtotal + vat + shipping - discount
  };

  return this.save();
};

CartSchema.methods.clear = async function() {
  this.items = [];
  this.totals = {
    subtotal: 0,
    vat: 0,
    shipping: 0,
    discount: 0,
    total: 0
  };
  return this.save();
};

CartSchema.methods.convertToOrder = async function(orderId: string) {
  this.status = 'ordered';
  this.convertedToOrderId = orderId;
  return this.save();
};

// Static methods
CartSchema.statics.findActiveCart = function(this: any, orgId: string, userId: string) {
  return this.findOne({ orgId, userId, status: 'active' });
};

CartSchema.statics.findOrCreateCart = async function(this: any, orgId: string, userId: string, sessionId?: string) {
  let cart = await this.findOne({ orgId, userId, status: 'active' });
  
  if (!cart) {
    cart = new this({
      orgId,
      userId,
      sessionId,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
    });
    await cart.save();
  }
  
  return cart;
};

CartSchema.statics.cleanupExpiredCarts = async function() {
  const expiredCarts = await this.find({
    status: 'active',
    updatedAt: { $lt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
  });

  for (const cart of expiredCarts) {
    cart.status = 'expired';
    await cart.save();
  }

  return expiredCarts.length;
};

export const Cart = models.Cart || model<ICart>('Cart', CartSchema);
