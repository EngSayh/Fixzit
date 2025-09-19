const BaseRouter = require('./BaseRouter');
const User = require('../models/User');

class UserRouter extends BaseRouter {
  constructor() {
    super('UserRouter');
  }

  setupRoutes() {
    // Call parent setupRoutes to get common routes
    super.setupRoutes();

    // User-specific routes
    this.router.get('/', this.getAllUsers.bind(this));
    this.router.get('/:id', this.getUserById.bind(this));
    this.router.post('/', this.createUser.bind(this));
    this.router.put('/:id', this.updateUser.bind(this));
    this.router.delete('/:id', this.deleteUser.bind(this));
  }

  async getAllUsers(req, res) {
    try {
      const { page = 1, limit = 10, search = '' } = req.query;
      const skip = (page - 1) * limit;

      let query = { isActive: true };
      
      if (search) {
        query.$or = [
          { username: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } },
          { 'profile.firstName': { $regex: search, $options: 'i' } },
          { 'profile.lastName': { $regex: search, $options: 'i' } }
        ];
      }

      const users = await User.find(query)
        .select('-password')
        .skip(skip)
        .limit(parseInt(limit))
        .sort({ createdAt: -1 });

      const total = await User.countDocuments(query);

      this.sendSuccess(res, {
        users,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / limit),
          totalUsers: total,
          hasNext: page * limit < total,
          hasPrev: page > 1
        }
      });
    } catch (error) {
      this.sendError(res, error, 'Failed to fetch users');
    }
  }

  async getUserById(req, res) {
    try {
      const user = await User.findOne({ _id: req.params.id, isActive: true })
        .select('-password');
      
      if (!user) {
        return this.sendNotFound(res, 'User not found');
      }

      this.sendSuccess(res, user);
    } catch (error) {
      this.sendError(res, error, 'Failed to fetch user');
    }
  }

  async createUser(req, res) {
    try {
      const { username, email, password, profile, role } = req.body;

      // Basic validation
      if (!username || !email || !password) {
        return this.sendValidationError(res, {
          username: !username ? 'Username is required' : null,
          email: !email ? 'Email is required' : null,
          password: !password ? 'Password is required' : null
        });
      }

      // Check for existing user
      const existingUser = await User.findOne({
        $or: [{ email }, { username }],
        isActive: true
      });

      if (existingUser) {
        return this.sendValidationError(res, {
          user: 'User with this email or username already exists'
        });
      }

      const user = new User({
        username,
        email,
        password, // In a real app, this should be hashed
        profile: profile || {},
        role: role || 'user'
      });

      await user.save();

      // Remove password from response
      const userResponse = user.toObject();
      delete userResponse.password;

      this.sendSuccess(res, userResponse, 'User created successfully', 201);
    } catch (error) {
      this.sendError(res, error, 'Failed to create user');
    }
  }

  async updateUser(req, res) {
    try {
      const { id } = req.params;
      const updates = req.body;

      // Remove sensitive fields that shouldn't be updated directly
      delete updates.password;
      delete updates._id;
      delete updates.__v;

      const user = await User.findOneAndUpdate(
        { _id: id, isActive: true },
        { ...updates, updatedAt: new Date() },
        { new: true, runValidators: true }
      ).select('-password');

      if (!user) {
        return this.sendNotFound(res, 'User not found');
      }

      this.sendSuccess(res, user, 'User updated successfully');
    } catch (error) {
      this.sendError(res, error, 'Failed to update user');
    }
  }

  async deleteUser(req, res) {
    try {
      const { id } = req.params;

      // Soft delete - set isActive to false
      const user = await User.findOneAndUpdate(
        { _id: id, isActive: true },
        { isActive: false, updatedAt: new Date() },
        { new: true }
      ).select('-password');

      if (!user) {
        return this.sendNotFound(res, 'User not found');
      }

      this.sendSuccess(res, user, 'User deleted successfully');
    } catch (error) {
      this.sendError(res, error, 'Failed to delete user');
    }
  }
}

module.exports = new UserRouter().getRouter();