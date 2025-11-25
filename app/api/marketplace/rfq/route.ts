import { NextRequest } from "next/server";
import { z } from "zod";
import { resolveMarketplaceContext } from "@/lib/marketplace/context";
import { connectToDatabase } from "@/lib/mongodb-unified";
import RFQ from "@/server/models/marketplace/RFQ";
import { serializeRFQ } from "@/lib/marketplace/serializers";
import { objectIdFrom } from "@/lib/marketplace/objectIds";
import { rateLimit } from "@/server/security/rateLimit";
import {
  unauthorizedError,
  zodValidationError,
  rateLimitError,
  handleApiError,
} from "@/server/utils/errorResponses";
import { createSecureResponse } from "@/server/security/headers";

const CreateRFQSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().optional(),
  categoryId: z.string().optional(),
  quantity: z.number().int().positive().optional(),
  budget: z.number().positive().optional(),
  currency: z.string().default("SAR"),
  deadline: z.string().datetime().optional(),
});

/**
 * @openapi
 * /api/marketplace/rfq:
 *   get:
 *     summary: List RFQs (Request for Quotations)
 *     description: Retrieves paginated list of RFQs for the authenticated organization
 *     tags: [Marketplace, RFQ]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *           maximum: 100
 *         description: Maximum number of RFQs to return
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [OPEN, CLOSED, AWARDED]
 *         description: Filter by RFQ status
 *     responses:
 *       200:
 *         description: List of RFQs retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 ok:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/RFQ'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       429:
 *         $ref: '#/components/responses/RateLimitExceeded'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
export async function GET(request: NextRequest) {
  try {
    // Authentication via marketplace context
    const context = await resolveMarketplaceContext(request);
    if (!context.userId) {
      return unauthorizedError();
    }

    // Rate limiting - read operations: 60 req/min
    const key = `marketplace:rfq:list:${context.orgId}`;
    const rl = rateLimit(key, 60, 60_000);
    if (!rl.allowed) return rateLimitError();

    // Database connection
    await connectToDatabase();

    // Query with tenant isolation
    const rfqs = await RFQ.find({ orgId: context.orgId })
      .sort({ createdAt: -1 })
      .limit(50);

    // Secure response
    return createSecureResponse(
      { ok: true, data: rfqs.map((rfq) => serializeRFQ(rfq)) },
      200,
      request,
    );
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * @openapi
 * /api/marketplace/rfq:
 *   post:
 *     summary: Create new RFQ
 *     description: Creates a new Request for Quotation for the authenticated user's organization
 *     tags: [Marketplace, RFQ]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [title]
 *             properties:
 *               title:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 200
 *                 example: "Office Furniture for 50-person workspace"
 *               description:
 *                 type: string
 *                 example: "Need ergonomic chairs, desks, and storage"
 *               categoryId:
 *                 type: string
 *                 format: objectId
 *               quantity:
 *                 type: integer
 *                 minimum: 1
 *                 example: 50
 *               budget:
 *                 type: number
 *                 minimum: 0
 *                 example: 50000
 *               currency:
 *                 type: string
 *                 default: SAR
 *                 enum: [SAR, USD, EUR, AED]
 *               deadline:
 *                 type: string
 *                 format: date-time
 *                 example: "2025-12-31T23:59:59Z"
 *           example:
 *             title: "Office Furniture for 50-person workspace"
 *             description: "Need ergonomic chairs, desks, and storage units"
 *             categoryId: "507f1f77bcf86cd799439011"
 *             quantity: 50
 *             budget: 50000
 *             currency: "SAR"
 *             deadline: "2025-12-31T23:59:59Z"
 *     responses:
 *       201:
 *         description: RFQ created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 ok:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/RFQ'
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       429:
 *         $ref: '#/components/responses/RateLimitExceeded'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
export async function POST(request: NextRequest) {
  try {
    // Authentication
    const context = await resolveMarketplaceContext(request);
    if (!context.userId) {
      return unauthorizedError();
    }

    // Rate limiting - write operations: 20 req/min
    const key = `marketplace:rfq:create:${context.orgId}`;
    const rl = rateLimit(key, 20, 60_000);
    if (!rl.allowed) return rateLimitError();

    // Input validation
    const body = await request.json();
    const payload = CreateRFQSchema.parse(body);

    // Database connection
    await connectToDatabase();

    // Create RFQ with tenant isolation
    const rfq = await RFQ.create({
      orgId: context.orgId,
      requesterId: context.userId,
      title: payload.title,
      description: payload.description,
      categoryId: payload.categoryId
        ? objectIdFrom(payload.categoryId)
        : undefined,
      quantity: payload.quantity,
      budget: payload.budget,
      currency: payload.currency,
      deadline: payload.deadline ? new Date(payload.deadline) : undefined,
      status: "OPEN",
    });

    // Secure response
    return createSecureResponse(
      { ok: true, data: serializeRFQ(rfq) },
      201,
      request,
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return zodValidationError(error, request);
    }
    return handleApiError(error);
  }
}
