const mongoose = require('mongoose');

const SensorReadingSchema = new mongoose.Schema(
  {
    type: { type: String, required: true },
    location: { type: String, trim: true },
    value: { type: String, trim: true },
    status: { type: String, trim: true },
  },
  { timestamps: true }
);

module.exports = mongoose.models.SensorReading || mongoose.model('SensorReading', SensorReadingSchema);

