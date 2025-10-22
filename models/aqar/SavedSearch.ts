/**
 * Aqar Souq - SavedSearch Model
 * 
 * User saved searches with email/SMS alerts
 * Auto-notify when new listings match criteria
 */

import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ISavedSearchCriteria {
  intent?: 'BUY' | 'RENT' | 'DAILY';
  propertyTypes?: string[];
  city?: string;
  neighborhoods?: string[];
  minPrice?: number;
  maxPrice?: number;
  minBeds?: number;
  maxBeds?: number;
  minArea?: number;
  maxArea?: number;
  furnishing?: 'FURNISHED' | 'UNFURNISHED' | 'PARTLY';
  amenities?: string[];
  
  // Geo (radius search)
  geoCenter?: {
    type: 'Point';
    coordinates: [number, number]; // [lng, lat]
  };
  geoRadiusKm?: number;
}

export interface ISavedSearch extends Document {
  // User
  userId: mongoose.Types.ObjectId;
  orgId: mongoose.Types.ObjectId;
  
  // Search details
  name: string;
  criteria: ISavedSearchCriteria;
  
  // Notifications
  emailAlerts: boolean;
  smsAlerts: boolean;
  whatsappAlerts: boolean;
  
  // Frequency
  alertFrequency: 'INSTANT' | 'DAILY' | 'WEEKLY';
  
  // Tracking
  lastNotifiedAt?: Date;
  matchCount: number;              // Total matches found
  notificationsSent: number;       // Total alerts sent
  
  // Status
  active: boolean;
  
  // Instance methods
  recordMatch(): Promise<void>;
  recordNotification(): Promise<void>;
  toggleActive(): Promise<void>;
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

const SavedSearchSchema = new Schema<ISavedSearch>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    orgId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
    
    name: { type: String, required: true, maxlength: 200 },
    criteria: {
      intent: { type: String, enum: ['BUY', 'RENT', 'DAILY'] },
      propertyTypes: [{ type: String }],
      city: { type: String },
      neighborhoods: [{ type: String }],
      minPrice: { type: Number, min: 0 },
      maxPrice: { type: Number, min: 0 },
      minBeds: { type: Number, min: 0 },
      maxBeds: { type: Number, min: 0 },
      minArea: { type: Number, min: 0 },
      maxArea: { type: Number, min: 0 },
      furnishing: { type: String, enum: ['FURNISHED', 'UNFURNISHED', 'PARTLY'] },
      amenities: [{ type: String }],
      geoCenter: {
        type: { type: String, enum: ['Point'] },
        coordinates: {
          type: [Number],
          validate: {
            validator: function(coords: number[]) {
              return coords.length === 2 && 
                     coords[0] >= -180 && coords[0] <= 180 && // longitude
                     coords[1] >= -90 && coords[1] <= 90;     // latitude
            },
            message: 'GeoJSON coordinates must be exactly [longitude, latitude] within valid ranges'
          }
        },
      },
      geoRadiusKm: { type: Number, min: 0 },
    },
    
    emailAlerts: { type: Boolean, default: true },
    smsAlerts: { type: Boolean, default: false },
    whatsappAlerts: { type: Boolean, default: false },
    
    alertFrequency: {
      type: String,
      enum: ['INSTANT', 'DAILY', 'WEEKLY'],
      default: 'DAILY',
      required: true,
    },
    
    lastNotifiedAt: { type: Date },
    matchCount: { type: Number, default: 0 },
    notificationsSent: { type: Number, default: 0 },
    
    active: { type: Boolean, default: true, index: true },
  },
  {
    timestamps: true,
    collection: 'aqar_saved_searches',
  }
);

// Indexes
SavedSearchSchema.index({ userId: 1, active: 1, createdAt: -1 });
SavedSearchSchema.index({ 'criteria.city': 1 });
SavedSearchSchema.index({ 'criteria.geoCenter': '2dsphere' });

// Methods - use atomic operations to prevent race conditions
SavedSearchSchema.methods.recordMatch = async function (this: ISavedSearch) {
  await (this.constructor as typeof import('mongoose').Model).updateOne(
    { _id: this._id },
    { $inc: { matchCount: 1 } }
  );
  this.matchCount += 1; // Update in-memory
};

SavedSearchSchema.methods.recordNotification = async function (this: ISavedSearch) {
  await (this.constructor as typeof import('mongoose').Model).updateOne(
    { _id: this._id },
    { $inc: { notificationsSent: 1 } }
  );
  this.notificationsSent += 1; // Update in-memory
  this.lastNotifiedAt = new Date();
  await this.save();
};

SavedSearchSchema.methods.toggleActive = async function (this: ISavedSearch) {
  this.active = !this.active;
  await this.save();
};

const SavedSearch: Model<ISavedSearch> =
  mongoose.models.AqarSavedSearch ||
  mongoose.model<ISavedSearch>('AqarSavedSearch', SavedSearchSchema);

export default SavedSearch;
