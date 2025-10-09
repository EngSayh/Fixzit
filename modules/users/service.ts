import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import User from './schema';
import type { CreateUserInput, UpdateUserInput, QueryUsersInput } from './validator';

export class UserService {
  static async list(orgId: string, filters: QueryUsersInput) {
    const { page, limit, role, isActive, search, sortBy, sortOrder } = filters;
    const query: Record<string, unknown> = { orgId: new mongoose.Types.ObjectId(orgId) };
    
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
    const sort: Record<string, unknown> = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };
    
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
  }
  
  static async getById(id: string, orgId: string) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new Error('Invalid user ID format');
    }
    const user = await User.findOne({ _id: id, orgId }).select('-passwordHash').lean().exec();
    if (!user) throw new Error('User not found');
    return user;
  }
  
  static async create(data: CreateUserInput, orgId: string, createdBy?: string) {
    const existing = await User.findOne({ orgId, email: data.email }).exec();
    if (existing) throw new Error('User with this email already exists in this organization');
    
    const passwordHash = await bcrypt.hash(data.password, 12);
    const user = new User({
      ...data,
      orgId: new mongoose.Types.ObjectId(orgId),
      passwordHash,
      createdBy: createdBy ? new mongoose.Types.ObjectId(createdBy) : undefined,
      updatedBy: createdBy ? new mongoose.Types.ObjectId(createdBy) : undefined
    });
    delete user.password;
    await user.save();
    return user.toObject();
  }
  
  static async update(id: string, data: UpdateUserInput, orgId: string, updatedBy?: string) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new Error('Invalid user ID format');
    }
    const user = await User.findOne({ _id: id, orgId }).exec();
    if (!user) throw new Error('User not found');
    
    if (data.email && data.email !== user.email) {
      const existing = await User.findOne({ orgId, email: data.email, _id: { $ne: id } }).exec();
      if (existing) throw new Error('User with this email already exists');
    }
    
    Object.assign(user, data);
    if (updatedBy) user.updatedBy = new mongoose.Types.ObjectId(updatedBy);
    await user.save();
    
    const result = user.toObject();
    delete result.passwordHash;
    return result;
  }
  
  static async delete(id: string, orgId: string, deletedBy?: string) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new Error('Invalid user ID format');
    }
    const user = await User.findOne({ _id: id, orgId }).exec();
    if (!user) throw new Error('User not found');
    
    user.isActive = false;
    if (deletedBy) user.updatedBy = new mongoose.Types.ObjectId(deletedBy);
    await user.save();
    
    const result = user.toObject();
    delete result.passwordHash;
    return result;
  }
  
  static async verifyPassword(email: string, password: string): Promise<any> {
    const user = await User.findOne({ email }).select('+passwordHash').exec();
    if (!user || !user.isActive) return null;
    
    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) return null;
    
    user.lastLoginAt = new Date();
    await user.save();
    
    const result = user.toObject();
    delete result.passwordHash;
    return result;
  }
}
