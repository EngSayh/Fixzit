import React from &apos;react&apos;;

export default function NewInvoicePage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--fixzit-text)]">New Invoice</h1>
          <p className="text-[var(--fixzit-text-secondary)]">Create a new invoice for services or products</p>
        </div>
        <div className="flex gap-2">
          <button className="btn-secondary">Save Draft</button>
          <button className="btn-primary">Create Invoice</button>
        </div>
      </div>

      {/* Form */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Form */}
        <div className="lg:col-span-2 space-y-6">
          <div className="card">
            <h3 className="text-lg font-semibold mb-4">Invoice Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Invoice Number *
                </label>
                <input
                  type="text"
                  placeholder="INV-001"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--fixzit-blue)] focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Issue Date *
                </label>
                <input
                  type="date"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--fixzit-blue)] focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Due Date *
                </label>
                <input
                  type="date"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--fixzit-blue)] focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Currency
                </label>
                <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--fixzit-blue)] focus:border-transparent">
                  <option>SAR - Saudi Riyal</option>
                  <option>USD - US Dollar</option>
                  <option>EUR - Euro</option>
                  <option>GBP - British Pound</option>
                </select>
              </div>
            </div>
          </div>

          <div className="card">
            <h3 className="text-lg font-semibold mb-4">Bill To</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Customer *
                </label>
                <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--fixzit-blue)] focus:border-transparent">
                  <option>Select Customer</option>
                  <option>John Smith - Tower A</option>
                  <option>Sarah Johnson - Tower B</option>
                  <option>Ahmed Al-Rashid - Villa 9</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Billing Address
                </label>
                <textarea
                  rows={3}
                  placeholder="Enter billing address..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--fixzit-blue)] focus:border-transparent"
                />
              </div>
            </div>
          </div>

          <div className="card">
            <h3 className="text-lg font-semibold mb-4">Items & Services</h3>
            <div className="space-y-4">
              <div className="grid grid-cols-12 gap-2 text-sm font-medium text-gray-700 border-b pb-2">
                <div className="col-span-5">Description</div>
                <div className="col-span-2">Qty</div>
                <div className="col-span-2">Rate</div>
                <div className="col-span-2">Amount</div>
                <div className="col-span-1">Actions</div>
              </div>

              <div className="grid grid-cols-12 gap-2 items-center">
                <div className="col-span-5">
                  <input
                    type="text"
                    placeholder="Item description..."
                    className="w-full px-2 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-[var(--fixzit-blue)] focus:border-transparent"
                  />
                </div>
                <div className="col-span-2">
                  <input
                    type="number"
                    placeholder="1"
                    className="w-full px-2 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-[var(--fixzit-blue)] focus:border-transparent"
                  />
                </div>
                <div className="col-span-2">
                  <input
                    type="number"
                    placeholder="0.00"
                    className="w-full px-2 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-[var(--fixzit-blue)] focus:border-transparent"
                  />
                </div>
                <div className="col-span-2">
                  <input
                    type="text"
                    value="SAR 0.00"
                    readOnly
                    className="w-full px-2 py-2 bg-gray-50 border border-gray-300 rounded"
                  />
                </div>
                <div className="col-span-1">
                  <button className="text-red-600 hover:text-red-900">🗑️</button>
                </div>
              </div>

              <button className="w-full py-2 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:text-gray-700 hover:border-gray-400">
                + Add Item
              </button>
            </div>
          </div>

          <div className="card">
            <h3 className="text-lg font-semibold mb-4">Notes & Terms</h3>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Invoice Notes
              </label>
              <textarea
                rows={3}
                placeholder="Add notes or payment instructions..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--fixzit-blue)] focus:border-transparent"
              />
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <div className="card">
            <h3 className="text-lg font-semibold mb-4">Invoice Summary</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Subtotal</span>
                <span className="font-medium">SAR 0.00</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">VAT (15%)</span>
                <span className="font-medium">SAR 0.00</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Discount</span>
                <span className="font-medium">SAR 0.00</span>
              </div>
              <hr className="my-2" />
              <div className="flex justify-between text-lg font-semibold">
                <span>Total</span>
                <span>SAR 0.00</span>
              </div>
            </div>
          </div>

          <div className="card">
            <h3 className="text-lg font-semibold mb-4">Payment Terms</h3>
            <div className="space-y-2">
              <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--fixzit-blue)] focus:border-transparent">
                <option>Net 30 days</option>
                <option>Net 15 days</option>
                <option>Net 7 days</option>
                <option>Due on receipt</option>
                <option>Cash on delivery</option>
              </select>
            </div>
          </div>

          <div className="card">
            <h3 className="text-lg font-semibold mb-4">Quick Actions</h3>
            <div className="space-y-2">
              <button className="w-full btn-ghost text-left">
                📋 Create from Template
              </button>
              <button className="w-full btn-ghost text-left">
                📊 View Cost Calculator
              </button>
              <button className="w-full btn-ghost text-left">
                💰 Payment Schedule
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
                <span className="text-gray-600">Customer selected</span>
                <span className="text-gray-400 ml-auto">5m ago</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

