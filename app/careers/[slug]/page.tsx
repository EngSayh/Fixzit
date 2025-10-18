import { connectToDatabase } from '@/lib/mongodb-unified';
import { Job } from '@/server/models/Job';

export default async function JobDetailPage(props: { params: Promise<{ slug: string }> }) {
  const params = await props.params;
  await connectToDatabase();
  const orgId = process.env.NEXT_PUBLIC_ORG_ID || 'fixzit-platform';
  const job = await Job.findOne({ orgId, slug: params.slug, status: 'published' }).lean();
  if (!job) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-10">
        <h1 className="text-2xl font-bold">Job not found</h1>
        <p className="text-gray-600 mt-2">This job may have been closed or the link is invalid.</p>
      </div>
    );
  }
  return (
    <div className="min-h-screen bg-white flex flex-col">
      <div className="max-w-4xl mx-auto px-4 py-12 flex-1">
        <a href="/careers" className="text-[#0061A8]">&larr; Back to Careers</a>
        <h1 className="text-3xl font-bold mt-3">{job.title}</h1>
        <div className="text-gray-600 mt-1">{job.department}</div>
        <div className="mt-6 space-y-4">
          <div>
            <h3 className="font-semibold">Description</h3>
            <p className="text-gray-700 whitespace-pre-line">{job.description}</p>
          </div>
          {Array.isArray(job.requirements) && job.requirements.length > 0 && (
            <div>
              <h3 className="font-semibold">Requirements</h3>
              <ul className="list-disc ml-6 text-gray-700">
                {job.requirements.map((r: string, i: number) => <li key={i}>{r}</li>)}
              </ul>
            </div>
          )}
          {Array.isArray(job.benefits) && job.benefits.length > 0 && (
            <div>
              <h3 className="font-semibold">Benefits</h3>
              <ul className="list-disc ml-6 text-gray-700">
                {job.benefits.map((b: string, i: number) => <li key={i}>{b}</li>)}
              </ul>
            </div>
          )}
        </div>
        <form className="mt-8 bg-gray-50 p-6 rounded-md" method="post" action={`/api/ats/jobs/${job._id}/apply`} encType="multipart/form-data">
          <h3 className="text-xl font-semibold mb-4">Apply Now</h3>
          <div className="grid md:grid-cols-2 gap-4">
            <input name="fullName" placeholder="Full name" required className="border p-2 rounded" />
            <input name="email" placeholder="Email" type="email" required className="border p-2 rounded" />
            <input name="phone" placeholder="Phone" className="border p-2 rounded" />
            <input name="location" placeholder="City, Country" className="border p-2 rounded" />
            <input name="experience" type="number" placeholder="Years of experience" className="border p-2 rounded" />
            <input name="linkedin" placeholder="LinkedIn URL" className="border p-2 rounded" />
            <input name="skills" placeholder="Skills (comma separated)" className="border p-2 rounded md:col-span-2" />
          </div>
          <textarea name="coverLetter" placeholder="Cover letter" className="border p-2 rounded w-full mt-3" rows={5} />
          <div className="mt-3">
            <label className="block text-sm font-semibold">CV / Résumé (PDF)</label>
            <input name="resume" type="file" accept="application/pdf" className="mt-1" />
          </div>
          <button className="mt-4 px-4 py-2 bg-[#0061A8] text-white rounded">Submit Application</button>
        </form>
      </div>
    </div>
  );
}


