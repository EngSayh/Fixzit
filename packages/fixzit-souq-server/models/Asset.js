const mongoose = require('mongoose');

const assetSchema = new mongoose.Schema({
  name: { type: String, required: true },
  type: { type: String, required: true },
  category: { type: String, required: true },
  propertyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Property', required: true },
  propertyName: { type: String, required: true },
  manufacturer: { type: String },
  model: { type: String },
  serialNumber: { type: String, unique: true, sparse: true },
  installDate: { type: Date },
  warrantyExpiry: { type: Date },
  lifeExpectancy: { type: Number }, // in years
  currentCondition: {
    type: String,
    enum: ['excellent', 'good', 'fair', 'poor', 'critical'],
    default: 'good'
  },
  maintenanceSchedules: [{ type: mongoose.Schema.Types.ObjectId, ref: 'MaintenanceSchedule' }],
  totalMaintenanceCost: { type: Number, default: 0 },
  lastInspection: { type: Date },
  nextInspection: { type: Date },
  documents: [{
    type: String,
    name: String,
    url: String
  }],
  specifications: { type: mongoose.Schema.Types.Mixed },
  location: {
    building: String,
    floor: String,
    room: String,
    coordinates: {
      lat: Number,
      lng: Number
    }
  },
  qrCode: { type: String },
  status: {
    type: String,
    enum: ['active', 'inactive', 'maintenance', 'retired'],
    default: 'active'
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Generate QR code on save
assetSchema.pre('save', function(next) {
  if (!this.qrCode) {
    this.qrCode = `ASSET-${this._id}`;
  }
  this.updatedAt = new Date();
  next();
});

module.exports = mongoose.model('Asset', assetSchema);