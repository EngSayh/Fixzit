const mongoose = require('mongoose');

const iotDeviceSchema = new mongoose.Schema({
  deviceId: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  type: { type: String, required: true },
  manufacturer: { type: String },
  model: { type: String },
  propertyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Property', required: true },
  propertyName: { type: String, required: true },
  location: { type: String, required: true },
  status: {
    type: String,
    enum: ['online', 'offline', 'maintenance'],
    default: 'offline'
  },
  lastSeen: { type: Date, default: Date.now },
  installDate: { type: Date, default: Date.now },
  firmwareVersion: { type: String },
  sensors: [String],
  configuration: { type: mongoose.Schema.Types.Mixed },
  maintenanceSchedule: { type: mongoose.Schema.Types.ObjectId, ref: 'MaintenanceSchedule' },
  alerts: { type: Number, default: 0 },
  batteryLevel: { type: Number },
  signalStrength: { type: Number },
  metadata: {
    ipAddress: String,
    macAddress: String,
    protocol: String,
    port: Number
  },
  credentials: {
    username: String,
    password: String, // Should be encrypted
    apiKey: String
  },
  telemetry: {
    messagesReceived: { type: Number, default: 0 },
    messagesSent: { type: Number, default: 0 },
    dataUsage: { type: Number, default: 0 }, // in MB
    uptime: { type: Number, default: 0 } // in seconds
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Update last seen on any activity
iotDeviceSchema.methods.updateLastSeen = function() {
  this.lastSeen = new Date();
  this.status = 'online';
  return this.save();
};

// Check if device is offline (no activity for 5 minutes)
iotDeviceSchema.methods.checkStatus = function() {
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
  if (this.lastSeen < fiveMinutesAgo && this.status === 'online') {
    this.status = 'offline';
    return this.save();
  }
  return Promise.resolve(this);
};

module.exports = mongoose.model('IoTDevice', iotDeviceSchema);