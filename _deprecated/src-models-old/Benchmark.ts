import { Schema, model, models, Document } from 'mongoose';

export interface IBenchmark extends Document {
  _id: string;
  name: string;
  category: string;
  subcategory?: string;
  unit: string;
  currentValue: number;
  targetValue?: number;
  historicalValues?: Array<{
    value: number;
    date: Date;
    source?: string;
  }>;
  comparisonData?: Array<{
    competitor: string;
    value: number;
    date: Date;
    verified: boolean;
  }>;
  metadata?: {
    region?: string;
    market?: string;
    segment?: string;
    dataSource?: string;
  };
  isActive: boolean;
  lastUpdated: Date;
  createdAt: Date;
  updatedAt: Date;
}

const benchmarkSchema = new Schema<IBenchmark>({
  name: {
    type: String,
    required: true,
    trim: true
  },
  category: {
    type: String,
    required: true,
    trim: true
  },
  subcategory: {
    type: String,
    trim: true
  },
  unit: {
    type: String,
    required: true,
    trim: true
  },
  currentValue: {
    type: Number,
    required: true
  },
  targetValue: {
    type: Number
  },
  historicalValues: [{
    value: {
      type: Number,
      required: true
    },
    date: {
      type: Date,
      required: true
    },
    source: {
      type: String,
      trim: true
    }
  }],
  comparisonData: [{
    competitor: {
      type: String,
      required: true,
      trim: true
    },
    value: {
      type: Number,
      required: true
    },
    date: {
      type: Date,
      required: true
    },
    verified: {
      type: Boolean,
      default: false
    }
  }],
  metadata: {
    region: {
      type: String,
      trim: true
    },
    market: {
      type: String,
      trim: true
    },
    segment: {
      type: String,
      trim: true
    },
    dataSource: {
      type: String,
      trim: true
    }
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Add indexes for performance
benchmarkSchema.index({ name: 1, category: 1 });
benchmarkSchema.index({ category: 1, subcategory: 1 });
benchmarkSchema.index({ isActive: 1 });
benchmarkSchema.index({ lastUpdated: -1 });

// Virtual for latest comparison
benchmarkSchema.virtual('latestComparison').get(function() {
  if (!this.comparisonData || this.comparisonData.length === 0) return null;
  return this.comparisonData.sort((a, b) => b.date.getTime() - a.date.getTime())[0];
});

export const Benchmark = models.Benchmark || model<IBenchmark>('Benchmark', benchmarkSchema);
export default Benchmark;