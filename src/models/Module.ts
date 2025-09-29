import { Schema, model, models, Document } from 'mongoose';

export interface IModule extends Document {
  _id: string;
  name: string;
  displayName: string;
  description?: string;
  version: string;
  isEnabled: boolean;
  dependencies?: string[];
  routes?: string[];
  permissions?: string[];
  configSchema?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

const moduleSchema = new Schema<IModule>({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  displayName: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  version: {
    type: String,
    required: true,
    default: '1.0.0'
  },
  isEnabled: {
    type: Boolean,
    default: true
  },
  dependencies: [{
    type: String,
    trim: true
  }],
  routes: [{
    type: String,
    trim: true
  }],
  permissions: [{
    type: String,
    trim: true
  }],
  configSchema: {
    type: Schema.Types.Mixed,
    default: {}
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Add indexes for performance
moduleSchema.index({ name: 1 });
moduleSchema.index({ isEnabled: 1 });

export const Module = models.Module || model<IModule>('Module', moduleSchema);
export default Module;