/**
 * Counter Model
 * 
 * Provides atomic sequence generation for unique codes
 */

import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ICounter extends Document {
  _id: string; // Counter name (e.g., 'userCode', 'invoiceNumber')
  seq: number; // Current sequence value
}

const CounterSchema = new Schema<ICounter>(
  {
    _id: { type: String, required: true },
    seq: { type: Number, default: 0, required: true },
  },
  {
    collection: 'counters',
  }
);

const Counter: Model<ICounter> =
  mongoose.models.Counter || mongoose.model<ICounter>('Counter', CounterSchema);

export default Counter;
