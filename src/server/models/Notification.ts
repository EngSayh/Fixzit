import { Schema, model, models, Document } from 'mongoose';

export interface INotification extends Document {
  orgId: string;
  userId: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

const NotificationSchema = new Schema<INotification>({
  orgId: { type: String, required: true, index: true },
  userId: { type: String, required: true, index: true },
  type: { type: String, default: 'system', index: true },
  title: { type: String, required: true },
  message: { type: String, required: true },
  read: { type: Boolean, default: false, index: true },
  metadata: { type: Map, of: Schema.Types.Mixed }
}, { timestamps: true, collection: 'notifications' });

NotificationSchema.index({ orgId: 1, userId: 1, read: 1, createdAt: -1 });

export const Notification = models.Notification || model<INotification>('Notification', NotificationSchema);


