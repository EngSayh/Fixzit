import { Schema, Model, InferSchemaType } from "mongoose";
import { getModel } from "@/types/mongoose-compat";
import { tenantIsolationPlugin } from "../plugins/tenantIsolation";
import { auditPlugin } from "../plugins/auditPlugin";
import { encryptionPlugin } from "../plugins/encryptionPlugin";

/**
 * ChatbotSettings Model
 * Manages AI chatbot configuration for customer support
 * Super Admin only access for editing
 * 
 * @module server/models/ChatbotSettings
 * @security API keys are encrypted at rest
 */
const ChatbotSettingsSchema = new Schema(
  {
    // orgId will be added by tenantIsolationPlugin
    enabled: {
      type: Boolean,
      default: true,
      comment: "Whether chatbot is enabled",
    },
    provider: {
      type: String,
      enum: ["internal", "openai", "anthropic", "custom"],
      default: "internal",
      comment: "AI provider for chatbot responses",
    },
    apiKey: {
      type: String,
      required: false,
      comment: "Encrypted API key for external provider",
    },
    model: {
      type: String,
      required: false,
      comment: "Model name (e.g., gpt-4, claude-3)",
    },
    welcomeMessage: {
      type: String,
      default: "Hello! How can I help you today?",
      comment: "Initial greeting message in English",
    },
    welcomeMessageAr: {
      type: String,
      default: "مرحباً! كيف يمكنني مساعدتك اليوم؟",
      comment: "Initial greeting message in Arabic",
    },
    position: {
      type: String,
      enum: ["bottom-right", "bottom-left"],
      default: "bottom-right",
      comment: "Chatbot widget position on screen",
    },
    primaryColor: {
      type: String,
      default: "#0061A8",
      comment: "Primary brand color for chatbot UI",
    },
    avatarUrl: {
      type: String,
      required: false,
      comment: "Custom avatar image URL",
    },
    offlineMessage: {
      type: String,
      default: "We're currently offline. Please leave a message and we'll get back to you.",
      comment: "Message shown when chatbot is unavailable",
    },
    maxTokens: {
      type: Number,
      default: 1000,
      min: 100,
      max: 4000,
      comment: "Maximum tokens per response",
    },
    temperature: {
      type: Number,
      default: 0.7,
      min: 0,
      max: 2,
      comment: "Response randomness (0=deterministic, 2=creative)",
    },
    systemPrompt: {
      type: String,
      default: "You are a helpful customer support assistant for Fixzit, a facility management platform. Be concise and helpful.",
      comment: "System prompt for AI context",
    },
    // updatedBy, updatedAt, createdBy, createdAt will be added by auditPlugin
  },
  {
    timestamps: true,
    comment: "AI chatbot configuration with encrypted API keys",
  },
);

// Apply plugins BEFORE indexes
ChatbotSettingsSchema.plugin(tenantIsolationPlugin);
ChatbotSettingsSchema.plugin(auditPlugin);
// SEC-PII-006: Encrypt chatbot API keys
ChatbotSettingsSchema.plugin(encryptionPlugin, {
  fields: {
    apiKey: "Chatbot API Key",
  },
});

// Ensure only one settings document per tenant (singleton pattern)
ChatbotSettingsSchema.index(
  { orgId: 1 },
  { unique: true, partialFilterExpression: { orgId: { $exists: true } } },
);

export type ChatbotSettingsDoc = InferSchemaType<typeof ChatbotSettingsSchema>;

export const ChatbotSettings: Model<ChatbotSettingsDoc> = getModel<ChatbotSettingsDoc>(
  "ChatbotSettings",
  ChatbotSettingsSchema,
);
