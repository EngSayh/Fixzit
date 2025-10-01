import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb-unified";
import { Job } from "@/server/models/Job";
import { generateSlug } from "@/lib/utils";
import { rateLimit } from "@/server/security/rateLimit";
import { z } from "zod";

const publicJobSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters").max(200),
  department: z.string().optional(),
  jobType: z.enum(["full-time", "part-time", "contract", "temporary", "internship"]).optional(),
  location: z.object({
    city: z.string().optional(),
    country: z.string().optional(),
    mode: z.enum(["onsite", "remote", "hybrid"]).optional()
  }).optional(),
  salaryRange: z.object({
    min: z.number().min(0),
    max: z.number().min(0),
    currency: z.string().default("SAR")
  }).optional(),
  description: z.string().optional(),
  requirements: z.array(z.string()).optional(),
  benefits: z.array(z.string()).optional(),
  skills: z.array(z.string()).optional(),
  tags: z.array(z.string()).optional()
});

export async function POST(req: NextRequest) {
  try {
    await connectToDatabase();
    const body = await req.json();
    
    const validation = publicJobSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json({ 
        success: false, 
        error: "Validation failed", 
        details: validation.error.format() 
      }, { status: 400 });
    }
    
    const validatedBody = validation.data;

    if (process.env.ATS_ENABLED !== "true") {
      return NextResponse.json({ success: false, error: "Feature not available" }, { status: 501 });
    }
    
    const clientIp = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || '0.0.0.0';
    const rl = await rateLimit(`ats:public:${clientIp}`, 10, 60_000);
    if (!rl.allowed) return NextResponse.json({ success:false, error:"Rate limit" }, { status: 429 });
    const platformOrg = process.env.PLATFORM_ORG_ID || "fixzit-platform";
    
    const baseSlug = generateSlug(validatedBody.title || "job");
    let slug = baseSlug;
    let counter = 1;
    while (await Job.findOne({ orgId: platformOrg, slug })) slug = `${baseSlug}-${counter++}`;
    const job = await Job.create({
      orgId: platformOrg,
      title: validatedBody.title,
      department: validatedBody.department || "General",
      jobType: validatedBody.jobType || "full-time",
      location: validatedBody.location || { city: "", country: "", mode: "onsite" },
      salaryRange: validatedBody.salaryRange || { min: 0, max: 0, currency: "SAR" },
      description: validatedBody.description || "",
      requirements: validatedBody.requirements || [],
      benefits: validatedBody.benefits || [],
      skills: validatedBody.skills || [],
      tags: validatedBody.tags || [],
      status: "pending",
      visibility: "public",
      slug,
      postedBy: "public"
    });
    return NextResponse.json({ success: true, data: job }, { status: 201 });
  } catch (error) {
    console.error("Public post error:", error);
    return NextResponse.json({ success: false, error: "Failed to submit job" }, { status: 500 });
  }
}
