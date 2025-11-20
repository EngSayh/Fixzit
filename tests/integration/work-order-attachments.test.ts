/**
 * Integration Test: Work Order Attachment Flow
 * 
 * Tests the complete attachment lifecycle:
 * 1. Create work order
 * 2. Upload attachment with AV scan
 * 3. PATCH work order with attachment metadata
 * 4. Verify persistence in database
 * 5. Remove attachment
 * 6. Verify removal persisted
 */

import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { WorkOrder } from '@/server/models/WorkOrder';

describe('Work Order Attachment Flow', () => {
  let mongoServer: MongoMemoryServer;
  let testConnection: typeof mongoose;
  let workOrderId: string;
  let WorkOrderModel: mongoose.Model<mongoose.InferSchemaType<typeof WorkOrder.schema>>;

  // Helper to create work order with minimal validation for testing
  const createTestWorkOrder = async (data: Record<string, any>) => {
    const wo = new WorkOrderModel({
      ...data,
      orgId: data.orgId || new mongoose.Types.ObjectId(),
      createdBy: data.createdBy || new mongoose.Types.ObjectId(),
      updatedBy: data.updatedBy || new mongoose.Types.ObjectId(),
    });
    await wo.save({ validateBeforeSave: false });
    return wo;
  };

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    // Create separate connection for this test suite
    testConnection = await mongoose.createConnection(uri).asPromise();
    // Bind WorkOrder model to test connection
    WorkOrderModel = testConnection.models.WorkOrder || testConnection.model('WorkOrder', WorkOrder.schema);
    console.log('✅ MongoDB Memory Server started:', uri);
  });

  afterAll(async () => {
    if (testConnection) {
      await testConnection.close();
    }
    await mongoServer.stop();
    console.log('✅ MongoDB Memory Server stopped');
  });

  afterEach(async () => {
    if (testConnection?.models?.WorkOrder) {
      await testConnection.models.WorkOrder.deleteMany({});
    }
  });

  it('should create work order and persist attachments', async () => {
    // 1. Create work order
    const workOrder = await createTestWorkOrder({
      workOrderNumber: 'WO-2025-TEST001',
      title: 'Test Attachment Upload',
      description: 'Testing attachment persistence',
      type: 'MAINTENANCE',
      priority: 'MEDIUM',
      category: 'GENERAL',
      status: 'SUBMITTED',
      location: {
        propertyId: new mongoose.Types.ObjectId(),
      },
      requester: {
        type: 'TENANT',
        name: 'Test User',
      },
      sla: {
        responseTimeMinutes: 120,
        resolutionTimeMinutes: 1440,
        responseDeadline: new Date(Date.now() + 120 * 60 * 1000),
        resolutionDeadline: new Date(Date.now() + 1440 * 60 * 1000),
        status: 'ON_TIME',
      },
    });

    workOrderId = workOrder._id.toString();
    expect(workOrder.attachments || []).toEqual([]);

    // 2. Simulate attachment upload (normally comes from S3 presign + AV scan)
    const attachment = {
      key: 's3://test-bucket/work-orders/test.pdf',
      fileName: 'test.pdf',
      originalName: 'test.pdf',
      fileUrl: 'https://test-bucket.s3.amazonaws.com/work-orders/test.pdf',
      fileType: 'application/pdf',
      fileSize: 1024000,
      uploadedBy: 'user-123',
      uploadedAt: new Date(),
      category: 'WORK_ORDER',
      isPublic: false,
      scanStatus: 'clean' as const,
    };

    // 3. PATCH work order with attachment (mimics frontend PATCH after upload)
    const WorkOrderModel = testConnection.models.WorkOrder;
    const updated = await WorkOrderModel.findByIdAndUpdate(
      workOrderId,
      { $set: { attachments: [attachment] } },
      { new: true }
    );

    // 4. Verify persistence
    expect(updated?.attachments).toHaveLength(1);
    expect(updated?.attachments[0]).toMatchObject({
      key: attachment.key,
      fileName: attachment.fileName,
      fileType: attachment.fileType,
      fileSize: attachment.fileSize,
      scanStatus: 'clean',
    });

    // 5. Verify retrieval from database
    const retrieved = await WorkOrderModel.findById(workOrderId);
    expect(retrieved?.attachments).toHaveLength(1);
    expect(retrieved?.attachments[0].scanStatus).toBe('clean');
  });

  it('should handle multiple attachments', async () => {
    const workOrder = await createTestWorkOrder({
      workOrderNumber: 'WO-2025-TEST002',
      title: 'Multi-Attachment Test',
      description: 'Testing multiple attachments',
      type: 'MAINTENANCE',
      priority: 'MEDIUM',
      category: 'GENERAL',
      status: 'SUBMITTED',
      location: { propertyId: new mongoose.Types.ObjectId() },
      requester: { type: 'TENANT', name: 'Test User' },
      sla: {
        responseTimeMinutes: 120,
        resolutionTimeMinutes: 1440,
        responseDeadline: new Date(Date.now() + 120 * 60 * 1000),
        resolutionDeadline: new Date(Date.now() + 1440 * 60 * 1000),
        status: 'ON_TIME',
      },
    });

    const attachments = [
      {
        key: 's3://bucket/file1.jpg',
        fileName: 'photo1.jpg',
        originalName: 'photo1.jpg',
        fileUrl: 'https://bucket.s3.amazonaws.com/file1.jpg',
        fileType: 'image/jpeg',
        fileSize: 500000,
        uploadedBy: 'user-123',
        uploadedAt: new Date(),
        category: 'WORK_ORDER',
        isPublic: false,
        scanStatus: 'clean' as const,
      },
      {
        key: 's3://bucket/file2.pdf',
        fileName: 'invoice.pdf',
        originalName: 'invoice.pdf',
        fileUrl: 'https://bucket.s3.amazonaws.com/file2.pdf',
        fileType: 'application/pdf',
        fileSize: 800000,
        uploadedBy: 'user-123',
        uploadedAt: new Date(),
        category: 'WORK_ORDER',
        isPublic: false,
        scanStatus: 'pending' as const,
      },
    ];

    const WorkOrderModel = testConnection.models.WorkOrder;
    const updated = await WorkOrderModel.findByIdAndUpdate(
      workOrder._id,
      { $set: { attachments } },
      { new: true }
    );

    expect(updated?.attachments).toHaveLength(2);
    expect(updated?.attachments[0].scanStatus).toBe('clean');
    expect(updated?.attachments[1].scanStatus).toBe('pending');
  });

  it('should remove attachments correctly', async () => {
    const workOrder = await createTestWorkOrder({
      workOrderNumber: 'WO-2025-TEST003',
      title: 'Attachment Removal Test',
      description: 'Testing attachment removal',
      type: 'MAINTENANCE',
      priority: 'MEDIUM',
      category: 'GENERAL',
      status: 'SUBMITTED',
      location: { propertyId: new mongoose.Types.ObjectId() },
      requester: { type: 'TENANT', name: 'Test User' },
      sla: {
        responseTimeMinutes: 120,
        resolutionTimeMinutes: 1440,
        responseDeadline: new Date(Date.now() + 120 * 60 * 1000),
        resolutionDeadline: new Date(Date.now() + 1440 * 60 * 1000),
        status: 'ON_TIME',
      },
      attachments: [
        {
          key: 's3://bucket/keep.pdf',
          fileName: 'keep.pdf',
          originalName: 'keep.pdf',
          fileUrl: 'https://bucket.s3.amazonaws.com/keep.pdf',
          fileType: 'application/pdf',
          fileSize: 100000,
          uploadedBy: 'user-123',
          uploadedAt: new Date(),
          category: 'WORK_ORDER',
          isPublic: false,
          scanStatus: 'clean',
        },
        {
          key: 's3://bucket/remove.pdf',
          fileName: 'remove.pdf',
          originalName: 'remove.pdf',
          fileUrl: 'https://bucket.s3.amazonaws.com/remove.pdf',
          fileType: 'application/pdf',
          fileSize: 200000,
          uploadedBy: 'user-123',
          uploadedAt: new Date(),
          category: 'WORK_ORDER',
          isPublic: false,
          scanStatus: 'clean',
        },
      ],
    });

    // Remove second attachment
    const remainingAttachments = workOrder.attachments.filter(
      (att) => att.key !== 's3://bucket/remove.pdf'
    );

    const WorkOrderModel = testConnection.models.WorkOrder;
    const updated = await WorkOrderModel.findByIdAndUpdate(
      workOrder._id,
      { $set: { attachments: remainingAttachments } },
      { new: true }
    );

    expect(updated?.attachments).toHaveLength(1);
    expect(updated?.attachments[0].key).toBe('s3://bucket/keep.pdf');
  });

  it('should handle infected files', async () => {
    const workOrder = await createTestWorkOrder({
      workOrderNumber: 'WO-2025-TEST004',
      title: 'Infected File Test',
      description: 'Testing AV scan infected status',
      type: 'MAINTENANCE',
      priority: 'MEDIUM',
      category: 'GENERAL',
      status: 'SUBMITTED',
      location: { propertyId: new mongoose.Types.ObjectId() },
      requester: { type: 'TENANT', name: 'Test User' },
      sla: {
        responseTimeMinutes: 120,
        resolutionTimeMinutes: 1440,
        responseDeadline: new Date(Date.now() + 120 * 60 * 1000),
        resolutionDeadline: new Date(Date.now() + 1440 * 60 * 1000),
        status: 'ON_TIME',
      },
    });

    const infectedAttachment = {
      key: 's3://bucket/virus.pdf',
      fileName: 'virus.pdf',
      originalName: 'virus.pdf',
      fileUrl: 'https://bucket.s3.amazonaws.com/virus.pdf',
      fileType: 'application/pdf',
      fileSize: 50000,
      uploadedBy: 'user-123',
      uploadedAt: new Date(),
      category: 'WORK_ORDER',
      description: 'Virus detected',
      isPublic: false,
      scanStatus: 'infected' as const,
    };

    const WorkOrderModel = testConnection.models.WorkOrder;
    const updated = await WorkOrderModel.findByIdAndUpdate(
      workOrder._id,
      { $set: { attachments: [infectedAttachment] } },
      { new: true }
    );

    expect(updated?.attachments).toHaveLength(1);
    expect(updated?.attachments[0].scanStatus).toBe('infected');
    expect(updated?.attachments[0].description).toBe('Virus detected');
  });

  it('should validate scanStatus enum', async () => {
    const workOrder = await createTestWorkOrder({
      workOrderNumber: 'WO-2025-TEST005',
      title: 'Enum Validation Test',
      description: 'Testing scanStatus enum enforcement',
      type: 'MAINTENANCE',
      priority: 'MEDIUM',
      category: 'GENERAL',
      status: 'SUBMITTED',
      location: { propertyId: new mongoose.Types.ObjectId() },
      requester: { type: 'TENANT', name: 'Test User' },
      sla: {
        responseTimeMinutes: 120,
        resolutionTimeMinutes: 1440,
        responseDeadline: new Date(Date.now() + 120 * 60 * 1000),
        resolutionDeadline: new Date(Date.now() + 1440 * 60 * 1000),
        status: 'ON_TIME',
      },
    });

    // Test all valid scanStatus values
    const validStatuses = ['pending', 'clean', 'infected', 'error'] as const;
    
    const WorkOrderModel = testConnection.models.WorkOrder;
    for (const status of validStatuses) {
      const attachment = {
        key: `s3://bucket/${status}.pdf`,
        fileName: `${status}.pdf`,
        originalName: `${status}.pdf`,
        fileUrl: `https://bucket.s3.amazonaws.com/${status}.pdf`,
        fileType: 'application/pdf',
        fileSize: 10000,
        uploadedBy: 'user-123',
        uploadedAt: new Date(),
        category: 'WORK_ORDER',
        isPublic: false,
        scanStatus: status,
      };

      const updated = await WorkOrderModel.findByIdAndUpdate(
        workOrder._id,
        { $set: { attachments: [attachment] } },
        { new: true, runValidators: true }
      );

      expect(updated?.attachments[0].scanStatus).toBe(status);
    }
  });
});
