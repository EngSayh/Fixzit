const databaseConnection = require('../config/database');

/**
 * Centralized database service to prevent duplicate database operations
 * and provide consistent database interaction patterns
 */
class DatabaseService {
  constructor() {
    this.connection = null;
  }

  async initialize() {
    try {
      this.connection = await databaseConnection.connect();
      console.log('🚀 Database service initialized');
      return this.connection;
    } catch (error) {
      console.error('❌ Failed to initialize database service:', error);
      throw error;
    }
  }

  async healthCheck() {
    return await databaseConnection.healthCheck();
  }

  async cleanup() {
    try {
      await databaseConnection.disconnect();
      console.log('🧹 Database service cleaned up');
    } catch (error) {
      console.error('❌ Error during database cleanup:', error);
      throw error;
    }
  }

  getConnection() {
    return databaseConnection.getConnection();
  }

  isConnected() {
    return databaseConnection.isConnectionActive();
  }

  // Common database operations to prevent code duplication
  async withTransaction(operations) {
    const session = await this.connection.connection.startSession();
    
    try {
      session.startTransaction();
      
      const result = await operations(session);
      
      await session.commitTransaction();
      return result;
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  // Bulk operations helper
  async bulkWrite(Model, operations) {
    try {
      return await Model.bulkWrite(operations);
    } catch (error) {
      console.error('❌ Bulk write operation failed:', error);
      throw error;
    }
  }

  // Aggregation pipeline helper
  async aggregate(Model, pipeline) {
    try {
      return await Model.aggregate(pipeline);
    } catch (error) {
      console.error('❌ Aggregation operation failed:', error);
      throw error;
    }
  }

  // Search helper with text indexing
  async textSearch(Model, searchTerm, options = {}) {
    try {
      const {
        limit = 10,
        skip = 0,
        sortBy = { score: { $meta: 'textScore' } }
      } = options;

      return await Model.find(
        { $text: { $search: searchTerm } },
        { score: { $meta: 'textScore' } }
      )
      .sort(sortBy)
      .limit(limit)
      .skip(skip);
    } catch (error) {
      console.error('❌ Text search operation failed:', error);
      throw error;
    }
  }

  // Pagination helper
  async paginate(Model, query = {}, options = {}) {
    try {
      const {
        page = 1,
        limit = 10,
        sort = { createdAt: -1 },
        select = '',
        populate = ''
      } = options;

      const skip = (page - 1) * limit;

      let queryBuilder = Model.find(query)
        .sort(sort)
        .skip(skip)
        .limit(limit);

      if (select) queryBuilder = queryBuilder.select(select);
      if (populate) queryBuilder = queryBuilder.populate(populate);

      const [data, total] = await Promise.all([
        queryBuilder.exec(),
        Model.countDocuments(query)
      ]);

      return {
        data,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(total / limit),
          totalItems: total,
          itemsPerPage: limit,
          hasNext: page * limit < total,
          hasPrev: page > 1
        }
      };
    } catch (error) {
      console.error('❌ Pagination operation failed:', error);
      throw error;
    }
  }
}

// Singleton pattern
const databaseService = new DatabaseService();

module.exports = databaseService;