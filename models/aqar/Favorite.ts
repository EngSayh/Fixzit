/**
 * Aqar Souq - Favorite Model
 * 
 * User bookmarks for listings and projects
 */

import mongoose, { Schema, Document, Model } from 'mongoose';

export enum FavoriteType {
  LISTING = 'LISTING',
  PROJECT = 'PROJECT',
}

export interface IFavorite extends Document {
  // User
  userId: mongoose.Types.ObjectId;
  orgId: mongoose.Types.ObjectId;
  
  // Target
  targetId: mongoose.Types.ObjectId;
  targetType: FavoriteType;
  targetTypeModel?: string; // Virtual field for refPath mapping
  
  // Metadata
  notes?: string;
  tags?: string[];
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

const FavoriteSchema = new Schema<IFavorite>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    orgId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
    
    targetId: { 
      type: Schema.Types.ObjectId, 
      required: true,
      refPath: 'targetTypeModel'
    },
    targetType: {
      type: String,
      enum: Object.values(FavoriteType),
      required: true,
      index: true,
    },
    // Virtual field for refPath - maps enum to model name
    targetTypeModel: {
      type: String,
      default: function(this: IFavorite) {
        return this.targetType === FavoriteType.LISTING ? 'AqarListing' : 'AqarProject';
      }
    },
    
    notes: { type: String, maxLength: 1000 },
    tags: [{ type: String, maxLength: 50 }],
  },
  {
    timestamps: true,
    collection: 'aqar_favorites',
  }
);

// Indexes
FavoriteSchema.index({ userId: 1, targetType: 1, createdAt: -1 });
// Compound unique index for tenant-scoped favorites
FavoriteSchema.index({ userId: 1, orgId: 1, targetId: 1, targetType: 1 }, { unique: true }); // Prevent duplicates

const Favorite: Model<IFavorite> =
  mongoose.models.AqarFavorite || mongoose.model<IFavorite>('AqarFavorite', FavoriteSchema);

export default Favorite;
