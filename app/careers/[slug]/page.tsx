import { connectToDatabase } from "@/lib/mongodb-unified";
import { Job, JobDoc } from "@/server/models/Job";
import { notFound } from "next/navigation";
import Link from "next/link";
import { JobApplicationForm } from "@/components/careers/JobApplicationForm";
import { sanitizeHtml } from "@/lib/sanitize-html";
import { getServerI18n } from "@/lib/i18n/server";
import { logger } from "@/lib/logger";
import { isMongoUnavailableError } from "@/lib/mongo-build-guards";
import { getStaticJob } from "@/data/static-content";

type CareerPageDoc = Pick<
  JobDoc,
  | "slug"
  | "title"
  | "department"
  | "status"
  | "requirements"
  | "benefits"
  | "description"
> & {
  descriptionHtml?: string | null;
  id?: string;
  _id?: string;
};

type LeanCareerPageDoc = Omit<CareerPageDoc, "_id"> & {
  _id?: string | { toString(): string };
};

async function fetchCareerJob(
  slug: string,
  orgId: string,
): Promise<CareerPageDoc | null> {
  try {
    await connectToDatabase();
    const doc = await Job.findOne({ orgId, slug, status: "published" })
      .select(
        "slug title department status requirements benefits description id _id",
      )
      .lean<LeanCareerPageDoc>()
      .exec();
    if (doc) {
      const normalized: CareerPageDoc = {
        slug: doc.slug,
        title: doc.title,
        department: doc.department ?? null,
        status: doc.status,
        requirements: doc.requirements ?? [],
        benefits: doc.benefits ?? [],
        description: doc.description ?? null,
        _id:
          typeof doc._id === "object" &&
          doc._id !== null &&
          "toString" in doc._id
            ? doc._id.toString()
            : doc._id,
        id: doc.id,
      };
      return normalized;
    }
  } catch (error) {
    if (!isMongoUnavailableError(error)) {
      throw error;
    }
    logger.warn("[Careers] Falling back to static job posting", { slug });
  }

  const fallback = getStaticJob(slug);
  if (!fallback) {
    return null;
  }

  return {
    slug: fallback.slug,
    title: fallback.title,
    department: fallback.department,
    status: fallback.status as JobDoc["status"],
    requirements: fallback.requirements,
    benefits: fallback.benefits,
    description: sanitizeHtml(fallback.descriptionHtml),
    descriptionHtml: fallback.descriptionHtml,
    id: fallback.id,
  };
}

export default async function JobDetailPage({
  params,
}: {
  params: { slug: string };
}) {
  const { t } = await getServerI18n();
  const orgId =
    process.env.ORG_ID || process.env.NEXT_PUBLIC_ORG_ID || "fixzit-platform";
  const job = await fetchCareerJob(params.slug, orgId);

  // Use Next.js notFound() for proper 404 handling
  if (!job) {
    notFound();
  }

  const jobId = job.id ?? job._id ?? job.slug;
  const descriptionHtml = (job.descriptionHtml ??
    job.description ??
    "") as string;

  return (
    <div className="min-h-screen bg-card flex flex-col">
      <div className="max-w-4xl mx-auto px-4 py-12 flex-1">
        <Link
          href="/careers"
          className="text-primary hover:text-primary transition-colors inline-flex items-center gap-1"
        >
          <span aria-hidden="true">&larr;</span>
          <span>{t("careers.detail.back", "Back to Careers")}</span>
        </Link>
        <h1 className="text-3xl font-bold mt-3">{job.title}</h1>
        <div className="text-muted-foreground mt-1">{job.department}</div>
        <div className="mt-6 space-y-4">
          <div>
            <h3 className="font-semibold">
              {t("careers.detail.description", "Description")}
            </h3>
            <div
              className="prose dark:prose-invert"
              dangerouslySetInnerHTML={{
                __html: sanitizeHtml(descriptionHtml),
              }}
            />
          </div>
          {Array.isArray(job.requirements) && job.requirements.length > 0 && (
            <div>
              <h3 className="font-semibold">
                {t("careers.detail.requirements", "Requirements")}
              </h3>
              <ul className="list-disc ms-6 text-foreground">
                {job.requirements.map((r: string) => (
                  <li key={r}>{r}</li>
                ))}
              </ul>
            </div>
          )}
          {Array.isArray(job.benefits) && job.benefits.length > 0 && (
            <div>
              <h3 className="font-semibold">
                {t("careers.detail.benefits", "Benefits")}
              </h3>
              <ul className="list-disc ms-6 text-foreground">
                {job.benefits.map((b: string) => (
                  <li key={b}>{b}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Client-side form with proper UX and accessibility */}
        <JobApplicationForm jobId={jobId} />
      </div>
    </div>
  );
}
