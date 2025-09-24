'use client';

import { useState } from 'react';
import { Calendar, DollarSign, Package } from 'lucide-react';

/**
 * RFQ management page component.
 *
 * Renders a Request for Quotes (RFQ) UI: header, conditional "Create RFQ" form, and a list of RFQs.
 * Maintains internal state for the RFQ list, the create-form visibility, and the new-RFQ form fields.
 * The `createRFQ` handler builds a new RFQ (generates an `id`, sets `status` to "Open", initializes `bids` to 0,
 * and parses `budget`), prepends it to the RFQ list, hides the form, and resets the form fields.
 *
 * @returns The RFQ page JSX element.
 */
export default function RFQPage() {
  const [rfqs, setRfqs] = useState([
    {
      id: 'RFQ-001',
      title: 'Annual HVAC Maintenance Contract',
      category: 'HVAC',
      budget: 50000,
      deadline: '2025-10-15',
      status: 'Open',
      bids: 3
    },
    {
      id: 'RFQ-002',
      title: 'Bulk Purchase - Electrical Supplies',
      category: 'Electrical',
      budget: 25000,
      deadline: '2025-10-01',
      status: 'Open',
      bids: 5
    }
  ]);
  
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newRfq, setNewRfq] = useState({
    title: '',
    description: '',
    category: '',
    quantity: '',
    budget: '',
    deadline: ''
  });
  
  const createRFQ = async () => {
    const rfq = {
      ...newRfq,
      id: `RFQ-${Date.now()}`,
      status: 'Open',
      bids: 0,
      budget: parseFloat(newRfq.budget) || 0
    };
    
    setRfqs([rfq, ...rfqs]);
    setShowCreateForm(false);
    setNewRfq({
      title: '',
      description: '',
      category: '',
      quantity: '',
      budget: '',
      deadline: ''
    });
  };
  
  return (
    <div className="bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Request for Quotes (RFQ)</h1>
          <button
            onClick={() => setShowCreateForm(!showCreateForm)}
            className="px-4 py-2 bg-[#0061A8] text-white rounded-lg hover:bg-[#0061A8]/90"
          >
            Create RFQ
          </button>
        </div>
        
        {/* Create RFQ Form */}
        {showCreateForm && (
          <div className="bg-white rounded-lg shadow p-6 mb-8">
            <h2 className="text-lg font-semibold mb-4">Create New RFQ</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input
                type="text"
                placeholder="Title"
                className="px-4 py-2 border rounded-lg"
                value={newRfq.title}
                onChange={(e) => setNewRfq({...newRfq, title: e.target.value})}
              />
              <select
                className="px-4 py-2 border rounded-lg"
                value={newRfq.category}
                onChange={(e) => setNewRfq({...newRfq, category: e.target.value})}
              >
                <option value="">Select Category</option>
                <option value="HVAC">HVAC</option>
                <option value="Plumbing">Plumbing</option>
                <option value="Electrical">Electrical</option>
                <option value="Building Materials">Building Materials</option>
              </select>
              <textarea
                placeholder="Description"
                className="px-4 py-2 border rounded-lg col-span-2"
                rows={3}
                value={newRfq.description}
                onChange={(e) => setNewRfq({...newRfq, description: e.target.value})}
              />
              <input
                type="number"
                placeholder="Quantity"
                className="px-4 py-2 border rounded-lg"
                value={newRfq.quantity}
                onChange={(e) => setNewRfq({...newRfq, quantity: e.target.value})}
              />
              <input
                type="number"
                placeholder="Budget (SAR)"
                className="px-4 py-2 border rounded-lg"
                value={newRfq.budget}
                onChange={(e) => setNewRfq({...newRfq, budget: e.target.value})}
              />
              <input
                type="date"
                placeholder="Deadline"
                className="px-4 py-2 border rounded-lg"
                value={newRfq.deadline}
                onChange={(e) => setNewRfq({...newRfq, deadline: e.target.value})}
              />
              <div className="flex gap-2">
                <button
                  onClick={createRFQ}
                  className="px-4 py-2 bg-[#00A859] text-white rounded-lg hover:bg-[#00A859]/90"
                >
                  Submit RFQ
                </button>
                <button
                  onClick={() => setShowCreateForm(false)}
                  className="px-4 py-2 border rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
        
        {/* RFQ List */}
        <div className="grid gap-4">
          {rfqs.map((rfq) => (
            <div key={rfq.id} className="bg-white rounded-lg shadow p-6">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-lg font-semibold">{rfq.title}</h3>
                  <div className="flex gap-4 mt-2 text-sm text-gray-600">
                    <span className="flex items-center gap-1">
                      <Package className="h-4 w-4" />
                      {rfq.category}
                    </span>
                    <span className="flex items-center gap-1">
                      <DollarSign className="h-4 w-4" />
                      SAR {rfq.budget?.toLocaleString()}
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      {rfq.deadline}
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <span className={`px-3 py-1 text-sm font-medium rounded-full ${
                    rfq.status === 'Open' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                  }`}>
                    {rfq.status}
                  </span>
                  <p className="mt-2 text-sm text-gray-600">{rfq.bids} bids</p>
                </div>
              </div>
              <div className="mt-4 flex gap-2">
                <button className="px-4 py-2 bg-[#0061A8] text-white rounded-lg hover:bg-[#0061A8]/90">
                  View Details
                </button>
                {rfq.status === 'Open' && (
                  <button className="px-4 py-2 border rounded-lg hover:bg-gray-50">
                    Submit Bid
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
