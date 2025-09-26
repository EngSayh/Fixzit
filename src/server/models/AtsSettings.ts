import { Schema, model, models, InferSchemaType } from "mongoose";

const AtsSettingsSchema = new Schema({
  orgId: { type: String, required: true, index: true, unique: true },
  autoScoring: { type: Boolean, default: true },
  scoringCriteria: {
    experience: { type: Number, default: 30 },
    skills: { type: Number, default: 25 },
    education: { type: Number, default: 20 },
    keywords: { type: Number, default: 15 },
    location: { type: Number, default: 10 }
  },
  screeningRules: {
    autoReject: { type: Boolean, default: false },
    minExperience: { type: Number, default: 0 },
    requiredSkills: [String],
    minScore: { type: Number, default: 0 },
    customRules: [Schema.Types.Mixed]
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

// Add instance methods
AtsSettingsSchema.methods.shouldAutoReject = function(candidateData: { experience: number; skills: string[]; score?: number }) {
  if (!this.screeningRules?.autoReject) {
    return { shouldReject: false, reason: '' };
  }

  const { experience, skills, score } = candidateData;

  // Check minimum experience
  if (this.screeningRules.minExperience && experience < this.screeningRules.minExperience) {
    return {
      shouldReject: true,
      reason: `Minimum experience requirement not met (${this.screeningRules.minExperience} years required)`
    };
  }

  // Check required skills
  if (this.screeningRules.requiredSkills?.length > 0) {
    const candidateSkills = skills.map(s => s.toLowerCase());
    const missingSkills = this.screeningRules.requiredSkills.filter((reqSkill: string) => 
      !candidateSkills.some(candidateSkill => 
        candidateSkill.includes(reqSkill.toLowerCase()) || 
        reqSkill.toLowerCase().includes(candidateSkill)
      )
    );
    
    if (missingSkills.length > 0) {
      return {
        shouldReject: true,
        reason: `Missing required skills: ${missingSkills.join(', ')}`
      };
    }
  }

  // Check minimum score (if provided)
  if (score !== undefined && this.screeningRules.minScore && score < this.screeningRules.minScore) {
    return {
      shouldReject: true,
      reason: `Minimum score requirement not met (${this.screeningRules.minScore} required)`
    };
  }

  return { shouldReject: false, reason: '' };
};

// Add static methods to schema
AtsSettingsSchema.statics.findOrCreateForOrg = async function (orgId: string) {
  return this.findOneAndUpdate(
    { orgId },
    {
      $setOnInsert: {
        orgId,
        autoScoring: true,
        scoringCriteria: {
          experience: 30,
          skills: 25,
          education: 20,
          keywords: 15,
          location: 10,
        },
        screeningRules: {
          autoReject: false,
          minExperience: 0,
          requiredSkills: [],
          minScore: 0,
          customRules: []
        },
      },
    },
    { new: true, upsert: true }
  );
};

const AtsSettingsModel = models.AtsSettings || model("AtsSettings", AtsSettingsSchema);

export const AtsSettings = AtsSettingsModel;