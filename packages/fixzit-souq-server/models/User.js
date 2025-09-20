const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: function() {
      return !this.ssoProviders || Object.keys(this.ssoProviders).length === 0;
    }
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  nameArabic: String,
  phone: {
    type: String,
    trim: true
  },
  role: {
    type: String,
    enum: ['super_admin', 'admin', 'manager', 'technician', 'tenant', 'user'],
    default: 'user'
  },
  permissions: [{
    type: String
  }],
  department: String,
  employeeId: String,
  avatar: String,
  language: {
    type: String,
    enum: ['en', 'ar'],
    default: 'en'
  },
  timezone: {
    type: String,
    default: 'Asia/Riyadh'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  emailVerificationToken: String,
  emailVerificationExpires: Date,
  passwordResetToken: String,
  passwordResetExpires: Date,
  lastLogin: Date,
  loginAttempts: {
    type: Number,
    default: 0
  },
  lockUntil: Date,
  // SSO providers
  ssoProviders: {
    google: {
      id: String,
      email: String,
      profile: Object,
      lastLogin: Date
    },
    microsoft: {
      id: String,
      email: String,
      profile: Object,
      lastLogin: Date
    },
    okta: {
      id: String,
      email: String,
      profile: Object,
      lastLogin: Date
    },
    saml: {
      nameID: String,
      nameIDFormat: String,
      profile: Object,
      lastLogin: Date
    }
  },
  // Multi-factor authentication
  mfa: {
    enabled: {
      type: Boolean,
      default: false
    },
    secret: String,
    backupCodes: [String],
    lastUsed: Date
  },
  // Notification preferences
  notifications: {
    email: {
      type: Boolean,
      default: true
    },
    sms: {
      type: Boolean,
      default: true
    },
    push: {
      type: Boolean,
      default: true
    },
    whatsapp: {
      type: Boolean,
      default: false
    }
  },
  // Device tokens for push notifications
  deviceTokens: [{
    token: String,
    platform: {
      type: String,
      enum: ['ios', 'android', 'web']
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  // Properties assigned (for property managers/technicians)
  assignedProperties: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Property'
  }],
  // Audit fields
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Indexes
userSchema.index({ email: 1 });
userSchema.index({ role: 1 });
userSchema.index({ isActive: 1 });
userSchema.index({ 'ssoProviders.google.id': 1 });
userSchema.index({ 'ssoProviders.microsoft.id': 1 });

// Virtual for full name
userSchema.virtual('fullName').get(function() {
  return this.name;
});

// Check if account is locked
userSchema.virtual('isLocked').get(function() {
  return !!(this.lockUntil && this.lockUntil > Date.now());
});

// Pre-save hook to hash password
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
  if (!this.password) return false;
  return await bcrypt.compare(candidatePassword, this.password);
};

// Increment login attempts
userSchema.methods.incLoginAttempts = async function() {
  // Reset attempts if lock has expired
  if (this.lockUntil && this.lockUntil < Date.now()) {
    return await this.updateOne({
      $set: { loginAttempts: 1 },
      $unset: { lockUntil: 1 }
    });
  }
  
  const updates = { $inc: { loginAttempts: 1 } };
  
  // Lock account after 5 attempts for 2 hours
  const maxAttempts = 5;
  const lockTime = 2 * 60 * 60 * 1000; // 2 hours
  
  if (this.loginAttempts + 1 >= maxAttempts && !this.isLocked) {
    updates.$set = { lockUntil: Date.now() + lockTime };
  }
  
  return await this.updateOne(updates);
};

// Reset login attempts
userSchema.methods.resetLoginAttempts = async function() {
  return await this.updateOne({
    $set: { loginAttempts: 0, lastLogin: new Date() },
    $unset: { lockUntil: 1 }
  });
};

// Generate password reset token
userSchema.methods.generatePasswordResetToken = function() {
  const resetToken = crypto.randomBytes(32).toString('hex');
  
  this.passwordResetToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');
  
  this.passwordResetExpires = Date.now() + 60 * 60 * 1000; // 1 hour
  
  return resetToken;
};

// Generate email verification token
userSchema.methods.generateEmailVerificationToken = function() {
  const verificationToken = crypto.randomBytes(32).toString('hex');
  
  this.emailVerificationToken = crypto
    .createHash('sha256')
    .update(verificationToken)
    .digest('hex');
  
  this.emailVerificationExpires = Date.now() + 24 * 60 * 60 * 1000; // 24 hours
  
  return verificationToken;
};

// Check permissions
userSchema.methods.hasPermission = function(permission) {
  // Super admin has all permissions
  if (this.role === 'super_admin') return true;
  
  // Check role-based permissions
  const rolePermissions = {
    admin: ['read', 'write', 'delete', 'manage_users', 'manage_properties'],
    manager: ['read', 'write', 'manage_properties', 'manage_work_orders'],
    technician: ['read', 'write', 'manage_work_orders'],
    tenant: ['read', 'create_tickets'],
    user: ['read']
  };
  
  const userRolePermissions = rolePermissions[this.role] || [];
  
  // Check if permission is in role permissions or user's custom permissions
  return userRolePermissions.includes(permission) || this.permissions.includes(permission);
};

// Clean sensitive data
userSchema.methods.toJSON = function() {
  const user = this.toObject();
  
  delete user.password;
  delete user.passwordResetToken;
  delete user.passwordResetExpires;
  delete user.emailVerificationToken;
  delete user.emailVerificationExpires;
  delete user.loginAttempts;
  delete user.lockUntil;
  delete user.mfa?.secret;
  delete user.mfa?.backupCodes;
  
  return user;
};

const crypto = require('crypto');

module.exports = mongoose.model('User', userSchema);