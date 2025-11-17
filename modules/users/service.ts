import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import User from './schema';
import type { CreateUserInput, UpdateUserInput, QueryUsersInput } from './validator';
import { setTenantContext, clearTenantContext } from '@/server/plugins/tenantIsolation';
import { setAuditContext, clearAuditContext } from '@/server/plugins/auditPlugin';

export class UserService {
  static async list(orgId: string, filters: QueryUsersInput) {
    const { page, limit, role, isActive, search, sortBy, sortOrder } = filters;
    const query: Record<string, unknown> = { orgId }; // Plugin will auto-filter, but explicit is better
    
    if (role) query.role = role;
    if (isActive !== undefined) query.isActive = isActive;
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { employeeId: { $regex: search, $options: 'i' } }
      ];
    }
    
    const skip = (page - 1) * limit;
    const sort: Record<string, 1 | -1> = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };
    
    // Set tenant context for automatic filtering
    setTenantContext({ orgId });
    try {
      const [users, total] = await Promise.all([
        User.find(query).sort(sort).skip(skip).limit(limit).select('-passwordHash').lean().exec(),
        User.countDocuments(query).exec()
      ]);
      
      return {
        data: users,
        pagination: {
          page, limit, total,
          totalPages: Math.ceil(total / limit),
          hasNext: page < Math.ceil(total / limit),
          hasPrev: page > 1
        }
      };
    } finally {
      clearTenantContext();
    }
  }
  
  static async getById(id: string, orgId: string) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new Error('Invalid user ID format');
    }
    
    setTenantContext({ orgId });
    try {
      const user = await User.findOne({ _id: id, orgId }).select('-passwordHash').lean().exec();
      if (!user) throw new Error('User not found');
      return user;
    } finally {
      clearTenantContext();
    }
  }
  
  static async create(data: CreateUserInput, orgId: string, createdBy?: string) {
    // Set tenant and audit context
    setTenantContext({ orgId });
    setAuditContext({ 
      userId: createdBy || 'SYSTEM',
      timestamp: new Date()
    });
    
    try {
      const existing = await User.findOne({ orgId, email: data.email }).exec();
      if (existing) throw new Error('User with this email already exists in this organization');
      
      const passwordHash = await bcrypt.hash(data.password, 12);
      const user = new User({
        ...data,
        orgId, // Explicitly set orgId (plugin will use context as fallback)
        passwordHash
        // createdBy will be set automatically by auditPlugin from context
      });
      // ✅ Remove password field before saving (security best practice)
      delete (user as any).password;
      await user.save();
      return user.toObject();
    } finally {
      clearTenantContext();
      clearAuditContext();
    }
  }
  
  static async update(id: string, data: UpdateUserInput, orgId: string, updatedBy?: string) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new Error('Invalid user ID format');
    }
    
    setTenantContext({ orgId });
    setAuditContext({ 
      userId: updatedBy || 'SYSTEM',
      timestamp: new Date()
    });
    
    try {
      const user = await User.findOne({ _id: id, orgId }).exec();
      if (!user) throw new Error('User not found');
      
      if (data.email && data.email !== user.email) {
        const existing = await User.findOne({ orgId, email: data.email, _id: { $ne: id } }).exec();
        if (existing) throw new Error('User with this email already exists');
      }
      
      Object.assign(user, data);
      // updatedBy will be set automatically by auditPlugin from context
      await user.save();
      
      const result = user.toObject() as any;
      delete result.passwordHash;  // ✅ Remove sensitive field for security
      return result;
    } finally {
      clearTenantContext();
      clearAuditContext();
    }
  }
  
  static async delete(id: string, orgId: string, deletedBy?: string) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new Error('Invalid user ID format');
    }
    
    setTenantContext({ orgId });
    setAuditContext({ 
      userId: deletedBy || 'SYSTEM',
      timestamp: new Date()
    });
    
    try {
      const user = await User.findOne({ _id: id, orgId }).exec();
      if (!user) throw new Error('User not found');
      
      user.isActive = false;
      // updatedBy will be set automatically by auditPlugin from context
      await user.save();
      
      const result = user.toObject() as any;
      delete result.passwordHash;  // ✅ Remove sensitive field for security
      return result;
    } finally {
      clearTenantContext();
      clearAuditContext();
    }
  }
  
  static async verifyPassword(email: string, password: string): Promise<Record<string, unknown> | null> {
    const user = await User.findOne({ email }).select('+passwordHash').exec();
    if (!user || !user.isActive) return null;
    
    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) return null;
    
    // Update last login with audit context
    setAuditContext({ 
      userId: user._id.toString(),
      timestamp: new Date()
    });
    
    try {
      user.lastLoginAt = new Date();
      await user.save();
      
      const result = user.toObject() as any;
      delete result.passwordHash;  // ✅ Remove sensitive field for security
      return result as Record<string, unknown>;
    } finally {
      clearAuditContext();
    }
  }
}
