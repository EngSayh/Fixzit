const mongoose = require('mongoose');

const SensorReadingSchema = new mongoose.Schema(
  {
    sensorId: { type: String, required: true },
    sensorName: String,
    deviceId: { type: mongoose.Schema.Types.ObjectId, ref: 'IoTDevice' },
    type: { 
      type: String, 
      enum: ['temperature', 'humidity', 'pressure', 'motion', 'energy', 'water', 'air_quality', 'vibration'],
      required: true 
    },
    value: { type: Number, required: true },
    unit: { type: String, required: true },
    timestamp: { type: Date, default: Date.now },
    status: { 
      type: String, 
      enum: ['normal', 'warning', 'critical', 'offline'],
      default: 'normal'
    },
    propertyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Property' },
    propertyName: String,
    location: { type: String, trim: true },
    battery: { type: Number, min: 0, max: 100 },
    signalStrength: { type: Number, min: 0, max: 100 },
    threshold: {
      min: Number,
      max: Number,
      critical: Number
    },
    trend: {
      type: String,
      enum: ['increasing', 'decreasing', 'stable']
    },
    trendPercentage: Number,
    alerts: [{
      type: {
        type: String,
        enum: ['warning', 'critical', 'info']
      },
      message: String,
      timestamp: { type: Date, default: Date.now },
      acknowledged: { type: Boolean, default: false },
      acknowledgedBy: String,
      acknowledgedAt: Date
    }],
    metadata: mongoose.Schema.Types.Mixed
  },
  { timestamps: true }
);

// Indexes for performance
SensorReadingSchema.index({ sensorId: 1, timestamp: -1 });
SensorReadingSchema.index({ deviceId: 1, timestamp: -1 });
SensorReadingSchema.index({ propertyId: 1, type: 1, timestamp: -1 });

// Determine status based on value and thresholds
SensorReadingSchema.pre('save', function(next) {
  if (this.threshold && typeof this.value === 'number') {
    if (this.threshold.critical && this.value >= this.threshold.critical) {
      this.status = 'critical';
    } else if (this.threshold.max && this.value > this.threshold.max) {
      this.status = 'warning';
    } else if (this.threshold.min && this.value < this.threshold.min) {
      this.status = 'warning';
    } else {
      this.status = 'normal';
    }
  }
  next();
});

module.exports = mongoose.models.SensorReading || mongoose.model('SensorReading', SensorReadingSchema);

