import mongoose, { Schema, Document } from 'mongoose';

export interface IKbRule {
  name: string;
  description: string;
  trigger: {
    collection: string;
    operation: 'insert' | 'update' | 'delete' | 'any';
    conditions?: Record<string, any>;
  };
  action: {
    type: 'create_article' | 'update_article' | 'notify';
    template?: {
      title: string;
      content: string;
      module: string;
      tags: string[];
      roleScopes: string[];
    };
  };
  enabled: boolean;
  priority: number;
  metadata?: Record<string, any>;
}

export interface KbRuleDoc extends IKbRule, Document {}

const triggerSchema = new Schema({
  collection: {
    type: String,
    required: true
  },
  operation: {
    type: String,
    enum: ['insert', 'update', 'delete', 'any'],
    required: true
  },
  conditions: Schema.Types.Mixed
}, { _id: false });

const templateSchema = new Schema({
  title: {
    type: String,
    required: true
  },
  content: {
    type: String,
    required: true
  },
  module: {
    type: String,
    required: true
  },
  tags: [String],
  roleScopes: [String]
}, { _id: false });

const actionSchema = new Schema({
  type: {
    type: String,
    enum: ['create_article', 'update_article', 'notify'],
    required: true
  },
  template: templateSchema
}, { _id: false });

const kbRuleSchema = new Schema<KbRuleDoc>({
  name: {
    type: String,
    required: true,
    unique: true
  },
  description: String,
  trigger: {
    type: triggerSchema,
    required: true
  },
  action: {
    type: actionSchema,
    required: true
  },
  enabled: {
    type: Boolean,
    default: true,
    index: true
  },
  priority: {
    type: Number,
    default: 0,
    index: true
  },
  metadata: Schema.Types.Mixed
}, {
  timestamps: true,
  collection: 'kb_rules'
});

// Index for rule matching
kbRuleSchema.index({ 'trigger.collection': 1, 'trigger.operation': 1, enabled: 1, priority: -1 });

export const KbRule = mongoose.models.KbRule || 
  mongoose.model<KbRuleDoc>('KbRule', kbRuleSchema);
