import React from &apos;react&apos;;

export default function NewExpensePage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--fixzit-text)]">New Expense</h1>
          <p className="text-[var(--fixzit-text-secondary)]">Record a new business expense or cost</p>
        </div>
        <div className="flex gap-2">
          <button className="btn-secondary">Save Draft</button>
          <button className="btn-primary">Record Expense</button>
        </div>
      </div>

      {/* Form */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Form */}
        <div className="lg:col-span-2 space-y-6">
          <div className="card">
            <h3 className="text-lg font-semibold mb-4">Expense Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Expense Reference *
                </label>
                <input
                  type="text"
                  placeholder="EXP-001"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--fixzit-blue)] focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Expense Date *
                </label>
                <input
                  type="date"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--fixzit-blue)] focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Expense Category *
                </label>
                <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--fixzit-blue)] focus:border-transparent">
                  <option>Select Category</option>
                  <option>Maintenance & Repairs</option>
                  <option>Utilities</option>
                  <option>Office Supplies</option>
                  <option>Equipment</option>
                  <option>Insurance</option>
                  <option>Professional Services</option>
                  <option>Marketing</option>
                  <option>Travel & Transportation</option>
                  <option>Other</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Property
                </label>
                <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--fixzit-blue)] focus:border-transparent">
                  <option>All Properties</option>
                  <option>Tower A</option>
                  <option>Tower B</option>
                  <option>Villa Complex</option>
                </select>
              </div>
            </div>
          </div>

          <div className="card">
            <h3 className="text-lg font-semibold mb-4">Expense Information</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description *
                </label>
                <input
                  type="text"
                  placeholder="Brief description of the expense..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--fixzit-blue)] focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Vendor/Supplier
                </label>
                <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--fixzit-blue)] focus:border-transparent">
                  <option>Select Vendor</option>
                  <option>ABC Maintenance LLC</option>
                  <option>Electrical Solutions Co.</option>
                  <option>Plumbing Services Ltd</option>
                  <option>Office Supplies Direct</option>
                </select>
              </div>
            </div>
          </div>

          <div className="card">
            <h3 className="text-lg font-semibold mb-4">Amount & Payment</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Amount *
                </label>
                <div className="relative">
                  <input
                    type="number"
                    placeholder="0.00"
                    className="w-full px-3 py-2 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--fixzit-blue)] focus:border-transparent"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">SAR</span>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Payment Method
                </label>
                <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--fixzit-blue)] focus:border-transparent">
                  <option>Cash</option>
                  <option>Bank Transfer</option>
                  <option>Cheque</option>
                  <option>Credit Card</option>
                  <option>Online Payment</option>
                </select>
              </div>
            </div>

            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Notes
              </label>
              <textarea
                rows={3}
                placeholder="Additional notes about this expense..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--fixzit-blue)] focus:border-transparent"
              />
            </div>
          </div>

          <div className="card">
            <h3 className="text-lg font-semibold mb-4">Receipt & Documentation</h3>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
              <div className="text-gray-400 mb-2">📎</div>
              <p className="text-sm text-gray-600">Upload receipt or invoice</p>
              <button className="mt-2 text-sm text-[var(--fixzit-blue)] hover:underline">
                Choose File
              </button>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <div className="card">
            <h3 className="text-lg font-semibold mb-4">Expense Summary</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Amount</span>
                <span className="font-medium">SAR 0.00</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">VAT (15%)</span>
                <span className="font-medium">SAR 0.00</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Total</span>
                <span className="font-medium">SAR 0.00</span>
              </div>
            </div>
          </div>

          <div className="card">
            <h3 className="text-lg font-semibold mb-4">Budget Status</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Maintenance Budget</span>
                <div className="flex items-center gap-2">
                  <div className="w-16 h-2 bg-gray-200 rounded">
                    <div className="w-3/4 h-full bg-green-500 rounded"></div>
                  </div>
                  <span className="text-xs text-gray-500">75%</span>
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Utilities Budget</span>
                <div className="flex items-center gap-2">
                  <div className="w-16 h-2 bg-gray-200 rounded">
                    <div className="w-1/2 h-full bg-yellow-500 rounded"></div>
                  </div>
                  <span className="text-xs text-gray-500">50%</span>
                </div>
              </div>
            </div>
          </div>

          <div className="card">
            <h3 className="text-lg font-semibold mb-4">Recent Expenses</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center p-2 bg-gray-50 rounded">
                <div>
                  <p className="text-sm font-medium">EXP-247</p>
                  <p className="text-xs text-gray-600">AC Maintenance</p>
                </div>
                <span className="text-sm font-medium text-red-600">-SAR 150</span>
              </div>
              <div className="flex justify-between items-center p-2 bg-gray-50 rounded">
                <div>
                  <p className="text-sm font-medium">EXP-246</p>
                  <p className="text-xs text-gray-600">Office Supplies</p>
                </div>
                <span className="text-sm font-medium text-red-600">-SAR 85</span>
              </div>
              <div className="flex justify-between items-center p-2 bg-gray-50 rounded">
                <div>
                  <p className="text-sm font-medium">EXP-245</p>
                  <p className="text-xs text-gray-600">Electrical Repair</p>
                </div>
                <span className="text-sm font-medium text-red-600">-SAR 320</span>
              </div>
            </div>
          </div>

          <div className="card">
            <h3 className="text-lg font-semibold mb-4">Quick Actions</h3>
            <div className="space-y-2">
              <button className="w-full btn-ghost text-left">
                📊 View Budget
              </button>
              <button className="w-full btn-ghost text-left">
                📋 Bulk Expense Entry
              </button>
              <button className="w-full btn-ghost text-left">
                📄 Expense Templates
              </button>
            </div>
          </div>

          <div className="card">
            <h3 className="text-lg font-semibold mb-4">Recent Activity</h3>
            <div className="space-y-3 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-gray-600">Form auto-saved</span>
                <span className="text-gray-400 ml-auto">2m ago</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <span className="text-gray-600">Category selected</span>
                <span className="text-gray-400 ml-auto">4m ago</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

