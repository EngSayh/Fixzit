import Link from 'next/link';

export default function JobNotFound() {
  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-4">
      <div className="max-w-md text-center">
        <div className="mb-6">
          <svg
            className="mx-auto h-16 w-16 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
            />
          </svg>
        </div>
        
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Job Not Found
        </h1>
        
        <p className="text-gray-600 mb-6">
          This job posting may have been closed, removed, or the link may be invalid.
        </p>
        
        <div className="space-y-3">
          <Link
            href="/careers"
            className="inline-block w-full px-6 py-3 bg-brand-500 text-white rounded-lg 
                     hover:bg-brand-600 transition-colors font-semibold
                     focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2"
          >
            View All Open Positions
          </Link>
          
          <Link
            href="/"
            className="inline-block w-full px-6 py-3 border border-gray-300 text-gray-700 
                     rounded-lg hover:bg-gray-50 transition-colors font-semibold
                     focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2"
          >
            Go to Homepage
          </Link>
        </div>
        
        <p className="text-sm text-gray-500 mt-6">
          Looking for something specific?{' '}
          <Link href="/support" className="text-brand-500 hover:text-brand-600 underline">
            Contact our HR team
          </Link>
        </p>
      </div>
    </div>
  );
}
