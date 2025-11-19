/**
 * Aqar Souq - Favorite Model
 * 
 * User bookmarks for listings and projects
 */

import mongoose, { Schema, Document, Model } from 'mongoose'
import { getModel, MModel } from '@/src/types/mongoose-compat';;

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
    
    targetId: { type: Schema.Types.ObjectId, refPath: 'targetType', required: true },
    targetType: {
      type: String,
      enum: Object.values(FavoriteType),
      required: true,
      index: true,
    },
    
    notes: { type: String, maxlength: 1000 },
    tags: [{ type: String, maxlength: 50 }],
  },
  {
    timestamps: true,
    collection: 'aqar_favorites',
  }
);

// Indexes
FavoriteSchema.index({ userId: 1, targetType: 1, createdAt: -1 });
FavoriteSchema.index({ userId: 1, targetId: 1, targetType: 1 }, { unique: true }); // Prevent duplicates

const Favorite =
  getModel<any>('AqarFavorite', FavoriteSchema);

export default Favorite;
