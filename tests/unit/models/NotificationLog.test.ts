import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import mongoose from 'mongoose';
import { resetTestMocks } from "@/tests/helpers/mockDefaults";

beforeEach(() => {
  vi.clearAllMocks();
  resetTestMocks();
});


let NotificationLogModel: mongoose.Model<unknown>;
let NotificationDeadLetterModel: mongoose.Model<unknown>;

const LOG_TTL_DAYS = '7';
const DLQ_TTL_DAYS = '3';

beforeAll(async () => {
  // Ensure deterministic TTLs for index assertions
  process.env.NOTIFICATION_LOG_TTL_DAYS = LOG_TTL_DAYS;
  process.env.NOTIFICATION_DLQ_TTL_DAYS = DLQ_TTL_DAYS;

  if (mongoose.connection.readyState !== 1) {
    throw new Error('Mongoose not connected - tests require active connection');
  }

  // Remove cached models so schema definitions (including indexes) are reapplied
  if (mongoose.connection.models.NotificationLog) {
    mongoose.connection.deleteModel('NotificationLog');
  }
  if (mongoose.connection.models.NotificationDeadLetter) {
    mongoose.connection.deleteModel('NotificationDeadLetter');
  }

  // Load module once to apply env overrides and refresh indexes
  // Note: vi.resetModules() removed to prevent open handle leaks (P189)
  const notificationModels = await import('@/server/models/NotificationLog');
  NotificationLogModel = notificationModels.NotificationLogModel;
  NotificationDeadLetterModel = notificationModels.NotificationDeadLetterModel;

  if (!NotificationLogModel?.schema) {
    throw new Error('NotificationLog model not initialized');
  }
  if (!NotificationDeadLetterModel?.schema) {
    throw new Error('NotificationDeadLetter model not initialized');
  }
});

afterAll(async () => {
  // Clean up models to prevent leaks between test files
  if (mongoose.connection.models.NotificationLog) {
    mongoose.connection.deleteModel('NotificationLog');
  }
  if (mongoose.connection.models.NotificationDeadLetter) {
    mongoose.connection.deleteModel('NotificationDeadLetter');
  }
});

describe('NotificationLog model', () => {
  it('applies org-scoped unique index and TTL index', () => {
    const indexes = NotificationLogModel.schema.indexes();
    // Debug: surface index definitions when assertions fail
    // eslint-disable-next-line no-console
    console.log('NotificationLog indexes', indexes);
    const orgScoped = indexes.find(([fields]) => fields.orgId === 1 && fields.notificationId === 1);
    expect(orgScoped).toBeDefined();
    expect(orgScoped?.[1]?.unique).toBe(true);

    const ttlIndex = indexes.find(
      ([fields, opts]) => fields.createdAt === 1 && typeof opts?.expireAfterSeconds === 'number'
    );
    expect(ttlIndex?.[1]?.expireAfterSeconds).toBe(Number(LOG_TTL_DAYS) * 24 * 60 * 60);
  });

  it('uses ObjectId for orgId, recipients.userId, and issues.userId', () => {
    expect(NotificationLogModel.schema.path('orgId')?.instance).toBe('ObjectId');
    expect(NotificationLogModel.schema.path('orgId')?.options.required).toBe(true);

    const recipientUserId = NotificationLogModel.schema
      .path('recipients')
      .caster?.schema?.path('userId');
    expect(recipientUserId?.instance).toBe('ObjectId');
    expect(recipientUserId?.options.required).toBe(true);

    const issueUserId = NotificationLogModel.schema.path('issues').caster?.schema?.path('userId');
    expect(issueUserId?.instance).toBe('ObjectId');
    expect(issueUserId?.options.required).toBe(true);
  });
});

describe('NotificationDeadLetter model', () => {
  it('applies org-scoped index and TTL index', () => {
    const indexes = NotificationDeadLetterModel.schema.indexes();
    // Debug: surface index definitions when assertions fail
    // eslint-disable-next-line no-console
    console.log('NotificationDeadLetter indexes', indexes);
    const orgScoped = indexes.find(([fields]) => fields.orgId === 1 && fields.notificationId === 1);
    expect(orgScoped).toBeDefined();

    const ttlIndex = indexes.find(
      ([fields, opts]) => fields.createdAt === 1 && typeof opts?.expireAfterSeconds === 'number'
    );
    expect(ttlIndex?.[1]?.expireAfterSeconds).toBe(Number(DLQ_TTL_DAYS) * 24 * 60 * 60);
  });

  it('uses ObjectId for orgId and recipient.userId', () => {
    expect(NotificationDeadLetterModel.schema.path('orgId')?.instance).toBe('ObjectId');
    expect(NotificationDeadLetterModel.schema.path('orgId')?.options.required).toBe(true);

    const recipientUserId = NotificationDeadLetterModel.schema.path('recipient.userId');
    expect(recipientUserId?.instance).toBe('ObjectId');
  });
});
