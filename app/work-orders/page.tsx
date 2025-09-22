'use client';

export default function WorkOrdersPage() {
  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Work Orders</h1>
          <p className="text-gray-600">Manage and track work orders across all properties</p>
        </div>
        <button className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors">
          New Work Order
        </button>
      </div>

      <div className="bg-white p-4 rounded-lg shadow-md border border-gray-200">
        <h3 className="font-semibold text-gray-900 mb-2">AC not cooling in Tower A</h3>
        <p className="text-sm text-gray-600 mb-2">Air conditioning system in Tower A unit 1204 is not working properly</p>
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-500">Code: WO-2025-001</span>
          <span className="px-2 py-1 text-xs bg-yellow-100 text-yellow-800 border border-yellow-200 rounded-full">
            SUBMITTED
          </span>
        </div>
      </div>

      <div className="bg-white p-4 rounded-lg shadow-md border border-gray-200 mt-4">
        <h3 className="font-semibold text-gray-900 mb-2">Water leak in ceiling</h3>
        <p className="text-sm text-gray-600 mb-2">Water leak from ceiling in Villa 9 main bathroom</p>
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-500">Code: WO-2025-002</span>
          <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 border border-blue-200 rounded-full">
            DISPATCHED
          </span>
        </div>
      </div>
    </div>
  );
}