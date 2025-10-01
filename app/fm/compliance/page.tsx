export default function CompliancePage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Compliance</h1>
          <p className="text-gray-600">Regulatory compliance and legal management</p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-md border border-gray-200 p-8 text-center">
        <h2 className="text-lg font-semibold text-gray-900 mb-2">Compliance Dashboard</h2>
        <p className="text-gray-600 mb-4">Compliance interface loads here.</p>
        <p className="text-sm text-gray-500">Connected to Compliance API endpoints.</p>
      </div>
    </div>
  );
}
