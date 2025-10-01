import mongoose, { Schema, Document } from 'mongoose';

export interface IOrganization extends Document {
  _id: mongoose.Types.ObjectId;
  name: string;
  subscriptionPlan: 'Standard' | 'Premium' | 'Enterprise';
  logoUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

const OrganizationSchema = new Schema<IOrganization>({
  name: { 
    type: String, 
    required: [true, 'Organization name is required'],
    trim: true,
    minlength: [2, 'Organization name must be at least 2 characters'],
    maxlength: [100, 'Organization name cannot exceed 100 characters']
  },
  subscriptionPlan: { 
    type: String, 
    enum: {
      values: ['Standard', 'Premium', 'Enterprise'],
      message: '{VALUE} is not a valid subscription plan'
    },
    default: 'Standard',
    required: true
  },
  logoUrl: { 
    type: String,
    validate: {
      validator: function(v: string | undefined) {
        // Field is optional
        if (!v) return true;
        
        try {
          // Parse to ensure well-formed URL
          const url = new URL(v);
          // Enforce HTTPS and check file extension on pathname
          return url.protocol === 'https:' &&
                 /\.(jpg|jpeg|png|webp|svg)$/i.test(url.pathname);
        } catch {
          // Invalid URL syntax
          return false;
        }
      },
      message: 'Please provide a valid HTTPS image URL ending with .jpg, .jpeg, .png, .webp, or .svg'
    }
  }
}, { 
  timestamps: true,
  collection: 'organizations',
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for performance
OrganizationSchema.index({ name: 1 }, { unique: true });
OrganizationSchema.index({ subscriptionPlan: 1 });

export default mongoose.models.Organization || mongoose.model<IOrganization>('Organization', OrganizationSchema);
