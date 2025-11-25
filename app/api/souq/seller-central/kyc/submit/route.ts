import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { logger } from "@/lib/logger";
import { sellerKYCService } from "@/services/souq/seller-kyc-service";

/**
 * POST /api/souq/seller-central/kyc/submit
 * Submit KYC information (multi-step)
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { step, data } = body;

    // Validation
    if (!step || !data) {
      return NextResponse.json(
        {
          error: "Missing required fields: step, data",
        },
        { status: 400 },
      );
    }

    const validSteps = ["company_info", "documents", "bank_details"];
    if (!validSteps.includes(step)) {
      return NextResponse.json(
        {
          error: `Invalid step. Must be one of: ${validSteps.join(", ")}`,
        },
        { status: 400 },
      );
    }

    // Submit KYC
    await sellerKYCService.submitKYC({
      sellerId: session.user.id,
      step,
      data,
    });

    return NextResponse.json({
      success: true,
      message: `KYC ${step} submitted successfully`,
      nextStep:
        step === "company_info"
          ? "documents"
          : step === "documents"
            ? "bank_details"
            : "verification",
    });
  } catch (error) {
    logger.error("Submit KYC error", { error });
    return NextResponse.json(
      {
        error: "Failed to submit KYC",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
