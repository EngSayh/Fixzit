export default function HRPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Human Resources</h1>
          <p className="text-gray-600">Employee management and HR operations</p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-md border border-gray-200 p-8 text-center">
        <h2 className="text-lg font-semibold text-gray-900 mb-2">HR Management</h2>
        <p className="text-gray-600 mb-4">Human resources interface loads here.</p>
        <p className="text-sm text-gray-500">Connected to HR API endpoints.</p>
      </div>
    </div>
  );
}