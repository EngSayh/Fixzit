import { connectToDatabase } from '@/lib/mongodb-unified';
import { Job } from '@/server/models/Job';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { JobApplicationForm } from '@/components/careers/JobApplicationForm';

export default async function JobDetailPage({ params }: { params: { slug: string } }) {
  await connectToDatabase();
  
  // Use server-only environment variable (not NEXT_PUBLIC_)
  const orgId = process.env.ORG_ID || process.env.NEXT_PUBLIC_ORG_ID || 'fixzit-platform';
  
  const job = await (Job as any).findOne({ orgId, slug: params.slug, status: 'published' }).lean();
  
  // Use Next.js notFound() for proper 404 handling
  if (!job) {
    notFound();
  }
  
  return (
    <div className="min-h-screen bg-card flex flex-col">
      <div className="max-w-4xl mx-auto px-4 py-12 flex-1">
        <Link 
          href="/careers" 
          className="text-primary hover:text-primary transition-colors inline-flex items-center gap-1"
        >
          <span aria-hidden="true">&larr;</span>
          <span>Back to Careers</span>
        </Link>
        <h1 className="text-3xl font-bold mt-3">{job.title}</h1>
        <div className="text-muted-foreground mt-1">{job.department}</div>
        <div className="mt-6 space-y-4">
          <div>
            <h3 className="font-semibold">Description</h3>
            <p className="text-foreground whitespace-pre-line">{job.description}</p>
          </div>
          {Array.isArray(job.requirements) && job.requirements.length > 0 && (
            <div>
              <h3 className="font-semibold">Requirements</h3>
              <ul className="list-disc ms-6 text-foreground">
                {job.requirements.map((r: string) => <li key={r}>{r}</li>)}
>>>>>>> feat/souq-marketplace-advanced
              </ul>
            </div>
          )}
          {Array.isArray(job.benefits) && job.benefits.length > 0 && (
            <div>
              <h3 className="font-semibold">Benefits</h3>
              <ul className="list-disc ms-6 text-foreground">
                {job.benefits.map((b: string) => <li key={b}>{b}</li>)}
>>>>>>> feat/souq-marketplace-advanced
              </ul>
            </div>
          )}
        </div>
        
        {/* Client-side form with proper UX and accessibility */}
        <JobApplicationForm jobId={job.id} />
      </div>
    </div>
  );
}


