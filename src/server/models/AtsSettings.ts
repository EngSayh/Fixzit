import { Schema, model, models, InferSchemaType } from "mongoose";

const AtsSettingsSchema = new Schema({
  orgId: { type: String, required: true, index: true },
  autoScoring: { type: Boolean, default: true },
  scoringCriteria: {
    experience: { type: Number, default: 30 },
    skills: { type: Number, default: 25 },
    education: { type: Number, default: 20 },
    keywords: { type: Number, default: 15 },
    location: { type: Number, default: 10 }
  },
  emailTemplates: {
    applicationReceived: String,
    interviewScheduled: String,
    rejection: String,
    offer: String
  },
  workflow: {
    stages: [{
      name: String,
      order: Number,
      required: Boolean
    }]
  },
  metadata: Schema.Types.Mixed
}, {
  timestamps: true
});

export type AtsSettingsDoc = InferSchemaType<typeof AtsSettingsSchema>;

// Add static methods to schema
AtsSettingsSchema.statics.findOrCreateForOrg = async function(orgId: string) {
  let settings = await this.findOne({ orgId });
  if (!settings) {
    settings = await this.create({
      orgId,
      autoScoring: true,
      scoringCriteria: {
        experience: 30,
        skills: 25,
        education: 20,
        keywords: 15,
        location: 10
      }
    });
  }
  return settings;
};

const AtsSettingsModel = models.AtsSettings || model("AtsSettings", AtsSettingsSchema);

export const AtsSettings = AtsSettingsModel;