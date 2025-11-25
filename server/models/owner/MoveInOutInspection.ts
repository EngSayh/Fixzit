import { Schema, model, models, InferSchemaType, Types } from "mongoose";
import { getModel, MModel } from "@/src/types/mongoose-compat";
import { tenantIsolationPlugin } from "../../plugins/tenantIsolation";
import { auditPlugin } from "../../plugins/auditPlugin";

const InspectionType = [
  "MOVE_IN",
  "MOVE_OUT",
  "PERIODIC",
  "PRE_HANDOVER",
  "POST_HANDOVER",
] as const;
const InspectionStatus = [
  "SCHEDULED",
  "IN_PROGRESS",
  "COMPLETED",
  "APPROVED",
  "REJECTED",
  "DISPUTED",
] as const;
const ItemCondition = [
  "EXCELLENT",
  "GOOD",
  "FAIR",
  "POOR",
  "DAMAGED",
  "MISSING",
  "NEW",
] as const;

const MoveInOutInspectionSchema = new Schema(
  {
    // Multi-tenancy - added by plugin
    // orgId: { type: Schema.Types.ObjectId, ref: "Organization", required: true, index: true },

    // Inspection Number (auto-generated)
    inspectionNumber: { type: String, required: true },

    // Type and Timing
    type: { type: String, enum: InspectionType, required: true, index: true },
    scheduledDate: { type: Date, required: true },
    actualDate: Date,
    duration: Number, // Minutes

    // Location
    propertyId: {
      type: Schema.Types.ObjectId,
      ref: "Property",
      required: true,
      index: true,
    },
    unitNumber: { type: String, required: true },

    // Parties Involved
    parties: {
      ownerId: {
        type: Schema.Types.ObjectId,
        ref: "Owner",
        required: true,
        index: true,
      },
      tenantId: { type: Schema.Types.ObjectId, ref: "Tenant", index: true },
      inspectorId: { type: Schema.Types.ObjectId, ref: "User", required: true },
      inspectorName: String,
      witnesses: [
        {
          name: String,
          role: String, // AGENT, MAINTENANCE_STAFF, etc.
          userId: { type: Schema.Types.ObjectId, ref: "User" },
          phone: String,
        },
      ],
    },

    // Related Contract/Lease
    leaseId: { type: Schema.Types.ObjectId, ref: "ServiceContract" },
    contractNumber: String,
    moveInDate: Date,
    moveOutDate: Date,

    // Overall Assessment
    overallCondition: { type: String, enum: ItemCondition },
    overallNotes: String,
    readyForOccupancy: Boolean, // For move-in inspections
    clearedForHandover: Boolean, // For move-out inspections

    // Room-by-Room Inspection
    rooms: [
      {
        name: { type: String, required: true }, // Living Room, Bedroom 1, Kitchen, etc.
        type: String, // LIVING, BEDROOM, BATHROOM, KITCHEN, UTILITY, etc.

        // General room condition
        walls: {
          condition: { type: String, enum: ItemCondition },
          notes: String,
          photos: [
            {
              url: String,
              uploadedAt: { type: Date, default: Date.now },
              caption: String,
              timestamp: String, // BEFORE or AFTER
            },
          ],
        },
        ceiling: {
          condition: { type: String, enum: ItemCondition },
          notes: String,
          photos: [
            {
              url: String,
              uploadedAt: Date,
              caption: String,
              timestamp: String,
            },
          ],
        },
        floor: {
          condition: { type: String, enum: ItemCondition },
          type: String, // Tile, Carpet, Hardwood, etc.
          notes: String,
          photos: [
            {
              url: String,
              uploadedAt: Date,
              caption: String,
              timestamp: String,
            },
          ],
        },
        doors: [
          {
            location: String, // Main door, Closet door, etc.
            condition: { type: String, enum: ItemCondition },
            lockWorking: Boolean,
            notes: String,
            photos: [
              {
                url: String,
                uploadedAt: Date,
                caption: String,
                timestamp: String,
              },
            ],
          },
        ],
        windows: [
          {
            location: String,
            condition: { type: String, enum: ItemCondition },
            glassIntact: Boolean,
            lockWorking: Boolean,
            screenCondition: String,
            notes: String,
            photos: [
              {
                url: String,
                uploadedAt: Date,
                caption: String,
                timestamp: String,
              },
            ],
          },
        ],

        // Room-specific items
        items: [
          {
            name: String, // AC Unit, Light Fixture, Sink, Cabinet, etc.
            category: String, // ELECTRICAL, PLUMBING, FURNITURE, FIXTURE, APPLIANCE
            quantity: { type: Number, default: 1 },
            condition: { type: String, enum: ItemCondition },
            working: Boolean,
            serialNumber: String,
            notes: String,
            photos: [
              {
                url: String,
                uploadedAt: Date,
                caption: String,
                timestamp: String,
              },
            ],
          },
        ],
      },
    ],

    // Electrical Items Inventory
    electrical: {
      sockets: {
        total: Number,
        working: Number,
        damaged: Number,
        notes: String,
        locations: [
          {
            room: String,
            count: Number,
            condition: String,
            photos: [
              {
                url: String,
                uploadedAt: Date,
                caption: String,
                timestamp: String,
              },
            ],
          },
        ],
      },
      lights: {
        total: Number,
        working: Number,
        bulbsMissing: Number,
        notes: String,
        locations: [
          {
            room: String,
            type: String, // Ceiling, Wall, Floor lamp
            count: Number,
            condition: String,
            photos: [
              {
                url: String,
                uploadedAt: Date,
                caption: String,
                timestamp: String,
              },
            ],
          },
        ],
      },
      switches: {
        total: Number,
        working: Number,
        damaged: Number,
        notes: String,
      },
      mainBreaker: {
        condition: String,
        working: Boolean,
        amperage: Number,
        photos: [
          { url: String, uploadedAt: Date, caption: String, timestamp: String },
        ],
      },
    },

    // Plumbing and Restroom Equipment
    plumbing: [
      {
        room: String, // Bathroom 1, Kitchen, etc.
        fixtures: [
          {
            type: String, // TOILET, SINK, SHOWER, BATHTUB, BIDET, FAUCET
            brand: String,
            condition: { type: String, enum: ItemCondition },
            working: Boolean,
            leaking: Boolean,
            waterPressure: String, // GOOD, LOW, HIGH
            drainageWorking: Boolean,
            notes: String,
            photos: [
              {
                url: String,
                uploadedAt: Date,
                caption: String,
                timestamp: String,
              },
            ],
          },
        ],
        accessories: [
          {
            type: String, // MIRROR, TOWEL_RACK, TOILET_PAPER_HOLDER, SOAP_DISPENSER
            condition: { type: String, enum: ItemCondition },
            notes: String,
          },
        ],
      },
    ],

    // Furniture Inventory
    furniture: [
      {
        item: String, // Sofa, Bed, Dining Table, etc.
        room: String,
        quantity: Number,
        brand: String,
        condition: { type: String, enum: ItemCondition },
        dimensions: String,
        color: String,
        material: String,
        serialNumber: String,
        notes: String,
        photos: [
          { url: String, uploadedAt: Date, caption: String, timestamp: String },
        ],
      },
    ],

    // Appliances
    appliances: [
      {
        type: String, // REFRIGERATOR, STOVE, OVEN, WASHER, DRYER, DISHWASHER, AC
        brand: String,
        model: String,
        serialNumber: String,
        room: String,
        condition: { type: String, enum: ItemCondition },
        working: Boolean,
        age: Number, // Years
        warrantyExpiry: Date,
        lastServiceDate: Date,
        notes: String,
        photos: [
          { url: String, uploadedAt: Date, caption: String, timestamp: String },
        ],
      },
    ],

    // Utility Meters
    meterReadings: [
      {
        type: String, // ELECTRICITY, WATER, GAS
        meterNumber: String,
        reading: Number,
        unit: String,
        readDate: Date,
        photo: String,
      },
    ],

    // Keys Inventory
    keys: [
      {
        type: String, // MAIN_DOOR, ROOM, MAILBOX, GATE, PARKING
        quantity: Number,
        handed: Boolean,
        received: Boolean,
        notes: String,
      },
    ],

    // Issues Found
    issues: [
      {
        severity: { type: String, enum: ["CRITICAL", "HIGH", "MEDIUM", "LOW"] },
        category: String, // STRUCTURAL, ELECTRICAL, PLUMBING, COSMETIC
        description: String,
        location: String,
        estimatedCost: Number,
        responsibleParty: {
          type: String,
          enum: ["OWNER", "TENANT", "UNKNOWN"],
        },
        requiresWorkOrder: Boolean,
        workOrderId: { type: Schema.Types.ObjectId, ref: "WorkOrder" },
        resolved: Boolean,
        resolvedDate: Date,
        photos: [
          { url: String, uploadedAt: Date, caption: String, timestamp: String },
        ],
      },
    ],

    // Digital Signatures
    signatures: {
      inspector: {
        signed: Boolean,
        signedBy: { type: Schema.Types.ObjectId, ref: "User" },
        signedAt: Date,
        signature: String, // Base64 signature image or signature service URL
        ipAddress: String,
      },
      owner: {
        signed: Boolean,
        signedBy: { type: Schema.Types.ObjectId, ref: "User" },
        signedAt: Date,
        signature: String,
        ipAddress: String,
      },
      tenant: {
        signed: Boolean,
        signedBy: { type: Schema.Types.ObjectId, ref: "User" },
        signedAt: Date,
        signature: String,
        ipAddress: String,
      },
    },

    // Comparison with Previous Inspection (for move-out)
    comparison: {
      previousInspectionId: {
        type: Schema.Types.ObjectId,
        ref: "MoveInOutInspection",
      },
      newDamages: [
        {
          item: String,
          location: String,
          description: String,
          estimatedCost: Number,
          photos: [
            {
              url: String,
              uploadedAt: Date,
              caption: String,
              timestamp: String,
            },
          ],
        },
      ],
      missingItems: [
        {
          item: String,
          quantity: Number,
          estimatedValue: Number,
        },
      ],
      totalDamageCost: Number,
      securityDepositDeduction: Number,
    },

    // Status
    status: {
      type: String,
      enum: InspectionStatus,
      default: "SCHEDULED",
      index: true,
    },
    statusHistory: [
      {
        status: { type: String, enum: InspectionStatus },
        changedAt: { type: Date, default: Date.now },
        changedBy: { type: Schema.Types.ObjectId, ref: "User" },
        reason: String,
        notes: String,
      },
    ],

    // Approval/Rejection
    approval: {
      approvedBy: { type: Schema.Types.ObjectId, ref: "User" },
      approvedAt: Date,
      rejectedBy: { type: Schema.Types.ObjectId, ref: "User" },
      rejectedAt: Date,
      rejectionReason: String,
      disputeReason: String,
      disputeResolution: String,
    },

    // Report Generation
    report: {
      generated: Boolean,
      generatedAt: Date,
      pdfUrl: String,
      format: String, // PDF, DOCX
      language: { type: String, enum: ["en", "ar"], default: "ar" },
    },

    // Metadata
    notes: String,
    tags: [String],
    customFields: Schema.Types.Mixed,

    // createdBy, updatedBy, createdAt, updatedAt added by auditPlugin
  },
  {
    timestamps: true,
  },
);

// Apply plugins
MoveInOutInspectionSchema.plugin(tenantIsolationPlugin);
MoveInOutInspectionSchema.plugin(auditPlugin);

// Indexes
MoveInOutInspectionSchema.index(
  { orgId: 1, inspectionNumber: 1 },
  { unique: true },
);
MoveInOutInspectionSchema.index({ orgId: 1, propertyId: 1, type: 1 });
MoveInOutInspectionSchema.index({ orgId: 1, "parties.ownerId": 1, status: 1 });
MoveInOutInspectionSchema.index({ orgId: 1, "parties.tenantId": 1 });
MoveInOutInspectionSchema.index({ orgId: 1, scheduledDate: 1 });
MoveInOutInspectionSchema.index({ orgId: 1, leaseId: 1 });

// Virtual for completion percentage
MoveInOutInspectionSchema.virtual("completionPercentage").get(function () {
  const totalSections = 4; // rooms, electrical, plumbing, signatures
  let completedSections = 0;

  if (this.rooms && this.rooms.length > 0) completedSections++;
  if (this.electrical && this.electrical.sockets) completedSections++;
  if (this.plumbing && this.plumbing.length > 0) completedSections++;
  if (this.signatures?.inspector?.signed && this.signatures?.owner?.signed)
    completedSections++;

  return Math.round((completedSections / totalSections) * 100);
});

// Method to check if all signatures are collected
MoveInOutInspectionSchema.methods.allSignaturesCollected = function () {
  const requiredSignatures = ["inspector", "owner"];
  if (this.type === "MOVE_IN" || this.type === "MOVE_OUT") {
    requiredSignatures.push("tenant");
  }

  return requiredSignatures.every((party) => this.signatures[party]?.signed);
};

// Export type and model
export type MoveInOutInspection = InferSchemaType<
  typeof MoveInOutInspectionSchema
>;
export const MoveInOutInspectionModel = getModel<MoveInOutInspection>(
  "MoveInOutInspection",
  MoveInOutInspectionSchema,
);
