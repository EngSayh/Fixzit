/**
 * @fileoverview Lease Contracts API Routes (Ejar Integration)
 * @description Lease contract wizard and management for Ejar integration.
 * 
 * @module api/aqar/contracts
 * @requires Authenticated user with tenantId
 * 
 * @endpoints
 * - GET /api/aqar/contracts - List contracts with filters
 * - POST /api/aqar/contracts - Create new contract (start wizard)
 * - PATCH /api/aqar/contracts - Update contract wizard step
 */
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { enforceRateLimit } from "@/lib/middleware/rate-limit";
import { 
  LeaseContract, 
  ContractType, 
  LessorType, 
  ContractStatus,
  PaymentFrequency,
  type ContractStatusValue,
} from "@/server/models/aqar/LeaseContract";
import { connectMongo as connectDB } from "@/lib/db/mongoose";
import { z } from "zod";
import { Types } from "mongoose";

// ============================================================================
// CONSTANTS
// ============================================================================

const CONTRACT_FEES = {
  residential: { price: 125, steps: 5, name: "Residential Lease", name_ar: "عقد إيجار سكني" },
  commercial: { price: 200, steps: 4, name: "Commercial Lease", name_ar: "عقد إيجار تجاري" },
} as const;

// ============================================================================
// VALIDATION
// ============================================================================

const CreateContractSchema = z.object({
  contract_type: z.enum(Object.values(ContractType) as [string, ...string[]]),
  lessor_type: z.enum(Object.values(LessorType) as [string, ...string[]]),
  property_id: z.string().optional(),
});

const UpdateContractSchema = z.object({
  id: z.string().min(1),
  step: z.number().int().min(1).max(5),
  data: z.record(z.string(), z.unknown()),
});

const PartySchema = z.object({
  name: z.string().min(2),
  name_ar: z.string().optional(),
  national_id: z.string().min(10).max(15),
  phone: z.string().regex(/^05\d{8}$/, "Phone must be Saudi format: 05xxxxxxxx"),
  email: z.string().email().optional(),
  address: z.string().optional(),
  nationality: z.string().optional(),
  iqama_number: z.string().optional(),
});

const PropertyDetailsSchema = z.object({
  type: z.string().min(1),
  type_ar: z.string().optional(),
  address: z.string().min(5),
  address_ar: z.string().optional(),
  city: z.string().min(2),
  district: z.string().optional(),
  neighborhood: z.string().optional(),
  area_sqm: z.number().positive(),
  rooms: z.number().int().min(0).optional(),
  bathrooms: z.number().int().min(0).optional(),
  floor_number: z.number().int().optional(),
  building_number: z.string().optional(),
  unit_number: z.string().optional(),
  postal_code: z.string().optional(),
  additional_info: z.string().optional(),
});

const RentalInfoSchema = z.object({
  annual_rent: z.number().positive(),
  payment_frequency: z.enum(Object.values(PaymentFrequency) as [string, ...string[]]),
  start_date: z.string().datetime(),
  end_date: z.string().datetime(),
  deposit_amount: z.number().min(0).optional(),
  utilities_included: z.boolean().default(false),
  furnished: z.boolean().default(false),
  parking_included: z.boolean().default(false),
  maintenance_terms: z.string().optional(),
  special_conditions: z.string().optional(),
});

// ============================================================================
// HANDLERS
// ============================================================================

/**
 * GET /api/aqar/contracts
 * List contracts with filters and pagination
 */
export async function GET(request: NextRequest) {
  enforceRateLimit(request, { requests: 60, windowMs: 60_000, keyPrefix: "contracts:list" });

  try {
    const session = await auth();
    const userId = session?.user?.id;
    const tenantId = session?.user?.tenantId || (session?.user as { orgId?: string })?.orgId;

    if (!userId || !tenantId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    // Parse query params
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "20")));
    const status = searchParams.get("status") as ContractStatusValue | null;
    const contractType = searchParams.get("type");

    // Build filter with tenant isolation
    const filter: Record<string, unknown> = { org_id: new Types.ObjectId(tenantId) };
    if (status && Object.values(ContractStatus).includes(status)) {
      filter.status = status;
    }
    if (contractType && Object.values(ContractType).includes(contractType as "residential" | "commercial")) {
      filter.contract_type = contractType;
    }

    // Execute query
    const [contracts, total] = await Promise.all([
      LeaseContract.find(filter)
        .sort({ updated_at: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      LeaseContract.countDocuments(filter),
    ]);

    // Format response
    const formattedContracts = contracts.map((c) => ({
      id: c._id,
      contract_type: c.contract_type,
      status: c.status,
      lessor_type: c.lessor_type,
      current_step: c.current_step,
      wizard_completed: (c.completed_steps?.length ?? 0) >= CONTRACT_FEES[c.contract_type as keyof typeof CONTRACT_FEES].steps,
      property: c.property_details ? {
        address: c.property_details.address,
        city: c.property_details.city,
        type: c.property_details.type,
      } : null,
      rental: c.rental_info ? {
        annual_rent: c.rental_info.annual_rent,
        start_date: c.rental_info.start_date,
        end_date: c.rental_info.end_date,
      } : null,
      ejar_reference: c.ejar_reference,
      created_at: c.created_at,
      updated_at: c.updated_at,
    }));

    return NextResponse.json({
      data: formattedContracts,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    // eslint-disable-next-line no-console -- Server-side error logging
    console.error("[Contracts GET] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch contracts" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/aqar/contracts
 * Create new contract (start wizard)
 */
export async function POST(request: NextRequest) {
  enforceRateLimit(request, { requests: 20, windowMs: 60_000, keyPrefix: "contracts:create" });

  try {
    const session = await auth();
    const userId = session?.user?.id;
    const tenantId = session?.user?.tenantId || (session?.user as { orgId?: string })?.orgId;

    if (!userId || !tenantId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const body = await request.json();
    const validation = CreateContractSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validation.error.format() },
        { status: 400 }
      );
    }

    const { contract_type, lessor_type, property_id } = validation.data;
    const feeInfo = CONTRACT_FEES[contract_type as keyof typeof CONTRACT_FEES];

    // Create contract in draft status
    const contract = await LeaseContract.create({
      org_id: new Types.ObjectId(tenantId),
      created_by: new Types.ObjectId(userId),
      contract_type,
      lessor_type,
      status: ContractStatus.DRAFT,
      current_step: 1,
      completed_steps: [],
      property_id: property_id ? new Types.ObjectId(property_id) : undefined,
      service_fee: feeInfo.price * 100, // Store in halalas
      payment_status: "pending",
    });

    return NextResponse.json(
      {
        message: "Contract created",
        data: {
          id: contract._id,
          contract_type,
          lessor_type,
          status: contract.status,
          current_step: 1,
          total_steps: feeInfo.steps,
          fee: {
            amount: feeInfo.price,
            currency: "SAR",
          },
        },
      },
      { status: 201 }
    );
  } catch (error) {
    // eslint-disable-next-line no-console -- Server-side error logging
    console.error("[Contracts POST] Error:", error);
    return NextResponse.json(
      { error: "Failed to create contract" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/aqar/contracts
 * Update contract wizard step
 */
export async function PATCH(request: NextRequest) {
  enforceRateLimit(request, { requests: 30, windowMs: 60_000, keyPrefix: "contracts:update" });

  try {
    const session = await auth();
    const userId = session?.user?.id;
    const tenantId = session?.user?.tenantId || (session?.user as { orgId?: string })?.orgId;

    if (!userId || !tenantId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const body = await request.json();
    const validation = UpdateContractSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validation.error.format() },
        { status: 400 }
      );
    }

    const { id, step, data } = validation.data;

    // Find contract with tenant isolation
    const contract = await LeaseContract.findOne({
      _id: new Types.ObjectId(id),
      org_id: new Types.ObjectId(tenantId),
    }).lean();

    if (!contract) {
      return NextResponse.json({ error: "Contract not found" }, { status: 404 });
    }

    // Validate step data based on step number
    const updateData: Record<string, unknown> = {
      current_step: step,
      updated_at: new Date(),
    };

    switch (step) {
      case 1: {
        // Ownership documents
        updateData.ownership_document = data;
        break;
      }
      case 2: {
        // Lessor info
        const lessorValidation = PartySchema.safeParse(data);
        if (!lessorValidation.success) {
          return NextResponse.json(
            { error: "Invalid lessor data", details: lessorValidation.error.format() },
            { status: 400 }
          );
        }
        updateData.lessor = lessorValidation.data;
        break;
      }
      case 3: {
        // Tenant/Lessee info
        const lesseeValidation = PartySchema.safeParse(data);
        if (!lesseeValidation.success) {
          return NextResponse.json(
            { error: "Invalid lessee data", details: lesseeValidation.error.format() },
            { status: 400 }
          );
        }
        updateData.lessee = lesseeValidation.data;
        break;
      }
      case 4: {
        // Property details
        const propertyValidation = PropertyDetailsSchema.safeParse(data);
        if (!propertyValidation.success) {
          return NextResponse.json(
            { error: "Invalid property data", details: propertyValidation.error.format() },
            { status: 400 }
          );
        }
        updateData.property_details = propertyValidation.data;
        break;
      }
      case 5: {
        // Rental info (final step)
        const rentalValidation = RentalInfoSchema.safeParse(data);
        if (!rentalValidation.success) {
          return NextResponse.json(
            { error: "Invalid rental data", details: rentalValidation.error.format() },
            { status: 400 }
          );
        }
        updateData.rental_info = {
          ...rentalValidation.data,
          start_date: new Date(rentalValidation.data.start_date),
          end_date: new Date(rentalValidation.data.end_date),
        };
        updateData.status = ContractStatus.PENDING_PAYMENT;
        break;
      }
    }

    // NO_LEAN: Need to access document methods
    const updatedContract = await LeaseContract.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true }
    ).lean();

    // Add step to completed_steps if not already there
    // eslint-disable-next-line local/require-tenant-scope -- Update by _id only, tenant auth done at session check
    await LeaseContract.updateOne(
      { _id: new Types.ObjectId(id) },
      { $addToSet: { completed_steps: step } }
    );

    return NextResponse.json({
      message: `Step ${step} saved`,
      data: {
        id: updatedContract?._id,
        status: updatedContract?.status,
        current_step: updatedContract?.current_step,
        completed_steps: updatedContract?.completed_steps,
      },
    });
  } catch (error) {
    // eslint-disable-next-line no-console -- Server-side error logging
    console.error("[Contracts PATCH] Error:", error);
    return NextResponse.json(
      { error: "Failed to update contract" },
      { status: 500 }
    );
  }
}
