const mongoose = require('mongoose');

/**
 * Base model class to prevent duplicate model definitions
 * and provide common functionality across all models
 */
class BaseModel {
  constructor(modelName, schema, options = {}) {
    this.modelName = modelName;
    this.schema = schema;
    this.options = {
      timestamps: true,
      versionKey: false,
      ...options
    };

    // Add common fields to all schemas
    this.addCommonFields();
    
    // Apply schema options
    this.schema.set('timestamps', this.options.timestamps);
    this.schema.set('versionKey', this.options.versionKey);

    // Create or get existing model to prevent duplicate compilation
    this.model = this.getOrCreateModel();
  }

  addCommonFields() {
    // Add common fields that all models should have
    if (!this.schema.paths.isActive) {
      this.schema.add({
        isActive: {
          type: Boolean,
          default: true
        }
      });
    }

    if (!this.schema.paths.metadata) {
      this.schema.add({
        metadata: {
          type: mongoose.Schema.Types.Mixed,
          default: {}
        }
      });
    }
  }

  getOrCreateModel() {
    // Check if model already exists to prevent duplicate compilation
    if (mongoose.models[this.modelName]) {
      console.log(`📋 Using existing model: ${this.modelName}`);
      return mongoose.models[this.modelName];
    }

    console.log(`🆕 Creating new model: ${this.modelName}`);
    return mongoose.model(this.modelName, this.schema);
  }

  getModel() {
    return this.model;
  }

  // Common query methods to prevent code duplication
  async findActive(query = {}) {
    return this.model.find({ ...query, isActive: true });
  }

  async findOneActive(query = {}) {
    return this.model.findOne({ ...query, isActive: true });
  }

  async softDelete(id) {
    return this.model.findByIdAndUpdate(id, { isActive: false }, { new: true });
  }

  async restore(id) {
    return this.model.findByIdAndUpdate(id, { isActive: true }, { new: true });
  }
}

module.exports = BaseModel;