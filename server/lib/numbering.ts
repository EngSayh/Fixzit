/**
 * Auto-numbering service for Finance Pack documents
 * Generates sequential numbers with format PREFIX-YYYYMM-#### (e.g., PAY-202510-0001)
 */

import mongoose, { Schema, Document } from 'mongoose'
import { getModel, MModel } from '@/src/types/mongoose-compat';;

interface ICounter extends Document {
  orgId: string;
  prefix: string; // PAY, EXP, INV, JE, etc.
  year: number;
  month: number;
  sequence: number;
  createdAt: Date;
  updatedAt: Date;
}

const CounterSchema = new Schema<ICounter>(
  {
    orgId: { type: String, required: true, index: true },
    prefix: { type: String, required: true },
    year: { type: Number, required: true },
    month: { type: Number, required: true, min: 1, max: 12 },
    sequence: { type: Number, required: true, default: 0 },
  },
  {
    timestamps: true,
  }
);

// Compound unique index to prevent duplicates
CounterSchema.index({ orgId: 1, prefix: 1, year: 1, month: 1 }, { unique: true });

const Counter = getModel<ICounter>('Counter', CounterSchema);

/**
 * Get next sequential number for a given prefix
 * Thread-safe using MongoDB's findOneAndUpdate with $inc
 * 
 * @param orgId - Organization ID for tenant isolation
 * @param prefix - Document prefix (PAY, EXP, INV, JE)
 * @param date - Date for year/month extraction (defaults to now)
 * @returns Formatted document number (e.g., PAY-202510-0001)
 */
export async function nextNumber(
  orgId: string,
  prefix: string,
  date: Date = new Date()
): Promise<string> {
  const year = date.getFullYear();
  const month = date.getMonth() + 1; // 1-indexed

  // Atomic increment - thread-safe
  const counter = await Counter.findOneAndUpdate(
    { orgId, prefix, year, month },
    { $inc: { sequence: 1 } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  // Format: PREFIX-YYYYMM-####
  const paddedMonth = month.toString().padStart(2, '0');
  const paddedSequence = counter.sequence.toString().padStart(4, '0');
  
  return `${prefix}-${year}${paddedMonth}-${paddedSequence}`;
}

/**
 * Reset counter for testing purposes
 * WARNING: Only use in test environments
 */
export async function resetCounter(
  orgId: string,
  prefix: string,
  year?: number,
  month?: number
): Promise<void> {
  const query: { orgId: string; prefix: string; year?: number; month?: number } = { orgId, prefix };
  if (year !== undefined) query.year = year;
  if (month !== undefined) query.month = month;
  
  await Counter.deleteMany(query);
}

/**
 * Get current counter value (without incrementing)
 */
export async function getCurrentSequence(
  orgId: string,
  prefix: string,
  date: Date = new Date()
): Promise<number> {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  
  const counter = await Counter.findOne({ orgId, prefix, year, month });
  return counter?.sequence || 0;
}

const numberingService = { nextNumber, resetCounter, getCurrentSequence };
export default numberingService;
