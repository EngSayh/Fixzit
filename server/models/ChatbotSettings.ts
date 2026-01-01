import { Schema, InferSchemaType } from "mongoose";
import { getModel } from "@/types/mongoose-compat";
import { auditPlugin } from "../plugins/auditPlugin";
import { encryptionPlugin } from "../plugins/encryptionPlugin";

/**
 * @module server/models/ChatbotSettings
 * @description Chatbot Settings model for AI assistant configuration.
 * Singleton pattern - one record per platform.
 * Super Admin only access for configuration.
 *
 * @features
 * - Multiple AI provider support (internal, OpenAI, Anthropic, custom)
 * - Encrypted API key storage
 * - Customizable welcome messages (bilingual)
 * - Position and styling options
 * - Token and temperature controls
 *
 * @security
 * - API keys are encrypted at rest via encryptionPlugin
 * - Never return raw API keys in responses (use hasApiKey boolean)
 *
 * @audit
 * - createdAt/updatedAt: Settings lifecycle (from timestamps)
 * - createdBy/updatedBy: Admin actions (from auditPlugin)
 */

const ChatbotSettingsSchema = new Schema(
  {
    enabled: {
      type: Boolean,
      default: true,
      comment: "Whether chatbot is active",
    },
    provider: {
      type: String,
      enum: ["internal", "openai", "anthropic", "custom"],
      default: "internal",
      comment: "AI provider selection",
    },
    apiKey: {
      type: String,
      comment: "Encrypted API key for external providers",
    },
    model: {
      type: String,
      comment: "Model name (e.g., gpt-4, claude-3)",
    },
    welcomeMessage: {
      type: String,
      default: "Hello! How can I help you today?",
      maxlength: 500,
      comment: "Initial greeting in English",
    },
    welcomeMessageAr: {
      type: String,
      default: "مرحباً! كيف يمكنني مساعدتك اليوم؟",
      maxlength: 500,
      comment: "Initial greeting in Arabic",
    },
    position: {
      type: String,
      enum: ["bottom-right", "bottom-left"],
      default: "bottom-right",
      comment: "Chat widget position on screen",
    },
    primaryColor: {
      type: String,
      default: "var(--color-primary)",
      match: [/^(#[0-9A-F]{6}|var\(--[\w-]+\))$/, "Must be valid hex color or CSS variable"],
      comment: "Brand color for chat widget",
    },
    avatarUrl: {
      type: String,
      comment: "Custom avatar image URL for chatbot",
    },
    offlineMessage: {
      type: String,
      default: "We're currently offline. Please leave a message.",
      maxlength: 500,
      comment: "Message shown when service unavailable",
    },
    maxTokens: {
      type: Number,
      min: 100,
      max: 4000,
      default: 1000,
      comment: "Max response tokens",
    },
    temperature: {
      type: Number,
      min: 0,
      max: 2,
      default: 0.7,
      comment: "Response creativity (0=focused, 2=creative)",
    },
    systemPrompt: {
      type: String,
      maxlength: 2000,
      default: "You are a helpful customer support assistant for Fixzit.",
      comment: "System prompt to configure AI behavior",
    },
    // createdBy, updatedBy, createdAt, updatedAt handled by auditPlugin
  },
  {
    timestamps: true,
    collection: "chatbot_settings",
    comment: "AI chatbot configuration (singleton)",
  }
);

// Apply encryption for API key
ChatbotSettingsSchema.plugin(encryptionPlugin, { fields: { apiKey: "API Key" } });

// Apply audit plugin for tracking changes
ChatbotSettingsSchema.plugin(auditPlugin);

export type ChatbotSettingsDoc = InferSchemaType<typeof ChatbotSettingsSchema>;

export const ChatbotSettings = getModel<ChatbotSettingsDoc>(
  "ChatbotSettings",
  ChatbotSettingsSchema
);
