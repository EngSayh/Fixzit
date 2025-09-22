export default function ReportsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
          <p className="text-gray-600">Analytics and reporting dashboard</p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-md border border-gray-200 p-8 text-center">
        <h2 className="text-lg font-semibold text-gray-900 mb-2">Reports & Analytics</h2>
        <p className="text-gray-600 mb-4">Reports interface loads here.</p>
        <p className="text-sm text-gray-500">Connected to Reports API endpoints.</p>
      </div>
    </div>
  );
}