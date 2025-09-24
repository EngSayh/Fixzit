/**
 * Test framework: Jest (ts-jest)
 * These tests validate the Mongoose schema behavior (defaults, required fields, enums, subdocs, and indexes)
 * without requiring a live MongoDB connection by relying on Mongoose client-side validation and defaults.
 *
 * Note: No <diff> context was provided; tests focus on the provided schema content.
 */

import { Types, models } from 'mongoose';
// Import model from the provided path. If your repository stores the model in a different file (e.g., AqarLead.ts),
// update the import accordingly.
import { AqarLead } from '../AqarLead.test';

type AnyErr = any;

const makeValidBase = () => ({
  tenantId: 'tenant-123',
  listingId: new Types.ObjectId(),
  propertyId: new Types.ObjectId(),
  name: 'Alice',
  phone: '+966500000001',
  createdBy: 'user-xyz',
  // Include budget object to exercise default currency behavior
  budget: {},
});

describe('AqarLead schema', () => {
  it('validates a minimal valid lead and sets defaults correctly', async () => {
    const lead = new AqarLead(makeValidBase());
    await expect(lead.validate()).resolves.toBeUndefined();

    expect(lead.source).toBe('marketplace');
    expect(lead.status).toBe('new');
    expect(lead.priority).toBe('medium');

    // Budget default currency should be set if budget object exists
    expect(lead.budget?.currency).toBe('SAR');
  });

  it('requires tenantId, listingId, propertyId, name, phone, and createdBy', async () => {
    const invalid = new AqarLead({});

    try {
      await invalid.validate();
      throw new Error('Expected validation to fail for missing required fields');
    } catch (err: any) {
      expect(err).toHaveProperty('errors.tenantId');
      expect(err).toHaveProperty('errors.listingId');
      expect(err).toHaveProperty('errors.propertyId');
      expect(err).toHaveProperty('errors.name');
      expect(err).toHaveProperty('errors.phone');
      expect(err).toHaveProperty('errors.createdBy');

      expect(err.errors.tenantId.kind).toBe('required');
      expect(err.errors.listingId.kind).toBe('required');
      expect(err.errors.propertyId.kind).toBe('required');
      expect(err.errors.name.kind).toBe('required');
      expect(err.errors.phone.kind).toBe('required');
      expect(err.errors.createdBy.kind).toBe('required');
    }
  });

  it('enforces enum values for status, source, and priority', async () => {
    const lead = new AqarLead(makeValidBase());

    lead.status = 'pending' as any;
    await lead.validate().then(
      () => { throw new Error('Expected enum validation to fail for status'); },
      (err: AnyErr) => { expect(err.errors.status.kind).toBe('enum'); }
    );

    lead.status = 'new';
    lead.source = 'unknown' as any;
    await lead.validate().then(
      () => { throw new Error('Expected enum validation to fail for source'); },
      (err: AnyErr) => { expect(err.errors.source.kind).toBe('enum'); }
    );

    lead.source = 'marketplace';
    lead.priority = 'critical' as any;
    await lead.validate().then(
      () => { throw new Error('Expected enum validation to fail for priority'); },
      (err: AnyErr) => { expect(err.errors.priority.kind).toBe('enum'); }
    );
  });

  it('sets default createdAt on notes entries', () => {
    const lead = new AqarLead(makeValidBase());
    const before = Date.now();

    // Push a note without createdAt to assert the default is applied
    lead.notes.push({ text: 'First contact', createdBy: 'agent-1' } as any);

    expect(lead.notes).toHaveLength(1);
    const note = lead.notes[0] as any;
    expect(note.createdAt).toBeInstanceOf(Date);
    expect((note.createdAt as Date).getTime()).toBeGreaterThanOrEqual(before - 5);
  });

  it('sets default timestamp on communications entries', () => {
    const lead = new AqarLead(makeValidBase());
    const before = Date.now();

    lead.communications.push({
      type: 'call',
      direction: 'inbound',
      content: 'Hello',
      createdBy: 'agent-2',
    } as any);

    expect(lead.communications).toHaveLength(1);
    const comm = lead.communications[0] as any;
    expect(comm.timestamp).toBeInstanceOf(Date);
    expect((comm.timestamp as Date).getTime()).toBeGreaterThanOrEqual(before - 5);
  });

  it('enforces enum values inside subdocuments (communications, convertedTo.type)', async () => {
    const lead1 = new AqarLead(makeValidBase());
    lead1.communications.push({ type: 'sms' as any, direction: 'north' as any, content: 'ping', createdBy: 'x' });

    await lead1.validate().then(
      () => { throw new Error('Expected enum validation to fail for communications'); },
      (err: AnyErr) => {
        expect(err.errors['communications.0.type'].kind).toBe('enum');
        expect(err.errors['communications.0.direction'].kind).toBe('enum');
      }
    );

    const lead2 = new AqarLead({
      ...makeValidBase(),
      convertedTo: { type: 'sale', amount: 10000, currency: 'SAR', date: new Date(), commission: 5 },
    });
    await expect(lead2.validate()).resolves.toBeUndefined();

    lead2.convertedTo = { type: 'lease' as any, amount: 1500, currency: 'SAR', date: new Date(), commission: 3 } as any;
    await lead2.validate().then(
      () => { throw new Error('Expected enum validation to fail for convertedTo.type'); },
      (err: AnyErr) => {
        expect(err.errors['convertedTo.type'].kind).toBe('enum');
      }
    );
  });

  it('accepts flexible customFields and casts tags to strings', async () => {
    const lead = new AqarLead({
      ...makeValidBase(),
      customFields: { any: { nested: ['x'] }, num: 42, bool: true, arr: [1, 'two'] },
      tags: ['hot', 123 as any],
    });

    await expect(lead.validate()).resolves.toBeUndefined();
    expect(Array.isArray(lead.tags)).toBe(true);
    // Mongoose casts non-strings in [String] arrays
    expect(lead.tags[1]).toBe('123');
  });

  it('declares expected indexes on the schema', () => {
    const indexes = AqarLead.schema.indexes();
    const keysList = indexes.map((i) => JSON.stringify(i[0]));
    const expectHas = (keyObj: Record<string, number>) =>
      expect(keysList).toContain(JSON.stringify(keyObj));

    expectHas({ tenantId: 1, status: 1 });
    expectHas({ tenantId: 1, assignedTo: 1 });
    expectHas({ listingId: 1, status: 1 });
    expectHas({ phone: 1, email: 1 });
    expectHas({ createdAt: -1 });
  });

  it('reuses compiled model via mongoose.models', () => {
    expect(AqarLead.modelName).toBe('AqarLead');
    expect(models.AqarLead).toBe(AqarLead);
  });
});