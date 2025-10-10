'use client';

import { useCallback, useEffect, useState } from 'react';
import { Search, Plus, ShoppingCart } from 'lucide-react';
import { useParams } from 'next/navigation';

export default function WorkOrderPartsPage() {
  const params = useParams();
  const workOrderId = params.id;
  
  const [search, setSearch] = useState('');
  const [parts, setParts] = useState<Array<{
    _id: string;
    name: string;
    price: number;
    stock: number;
    category: string;
  }>>([]);
  const [selectedParts, setSelectedParts] = useState<Array<{
    _id: string;
    name: string;
    title: string;
    price: number;
    quantity: number;
  }>>([]);
  const [loading, setLoading] = useState(false);
  
  const searchParts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/marketplace/products?q=${search}&limit=10`);
      const data = await res.json();
      if (data.ok) {
        setParts(data.data.products);
      }
    } catch (error) {
      console.error('Failed to search parts:', error);
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    searchParts();
  }, [searchParts]);
  
  const addPart = (part: Record<string, unknown>) => {
    const existing = selectedParts.find(p => p._id === part._id);
    if (existing) {
      setSelectedParts(selectedParts.map(p => 
        p._id === part._id 
          ? { ...p, quantity: p.quantity + 1 }
          : p
      ));
    } else {
      setSelectedParts([...selectedParts, { 
        _id: part._id,
        name: part.name,
        title: part.name, // Map name to title
        price: part.price,
        quantity: 1 
      }]);
    }
  };
  
  const removePart = (partId: string) => {
    setSelectedParts(selectedParts.filter(p => p._id !== partId));
  };
  
  const updateQuantity = (partId: string, quantity: number) => {
    if (quantity <= 0) {
      removePart(partId);
    } else {
      setSelectedParts(selectedParts.map(p => 
        p._id === partId ? { ...p, quantity } : p
      ));
    }
  };
  
  const createPurchaseOrder = async () => {
    // Create PO from selected parts
    const po = {
      workOrderId,
      items: selectedParts.map(p => ({
        productId: p._id,
        title: p.title,
        quantity: p.quantity,
        unitPrice: p.price,
        total: p.price * p.quantity
      })),
      total: selectedParts.reduce((sum, p) => sum + (p.price * p.quantity), 0)
    };
    
    console.log('Creating PO:', po);
    // In production, send to API
    alert('Purchase Order created successfully!');
  };
  
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">
          Add Parts to Work Order #{workOrderId}
        </h1>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Parts Search */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex gap-2 mb-6">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search parts from marketplace..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-fixzit-blue/30"
                  />
                </div>
              </div>
              
              {loading ? (
                <div className="text-center py-8">Loading...</div>
              ) : (
                <div className="grid gap-4">
                  {parts.map((part: Record<string, unknown>) => (
                    <div key={part._id} className="border rounded-lg p-4 flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold">{part.title}</h3>
                        <p className="text-sm text-gray-600">{part.category} • Stock: {part.stock}</p>
                        <p className="text-lg font-bold text-fixzit-green">SAR {part.price}</p>
                      </div>
                      <button
                        onClick={() => addPart(part)}
                        className="px-4 py-2 bg-fixzit-blue text-white rounded-lg hover:bg-fixzit-blue/90 flex items-center gap-2"
                      >
                        <Plus className="h-4 w-4" />
                        Add
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          
          {/* Selected Parts */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow p-6 sticky top-4">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <ShoppingCart className="h-5 w-5" />
                Selected Parts
              </h2>
              
              {selectedParts.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No parts selected</p>
              ) : (
                <>
                  <div className="space-y-3 mb-4">
                    {selectedParts.map((part) => (
                      <div key={part._id} className="border rounded-lg p-3">
                        <div className="flex justify-between items-start mb-2">
                          <h4 className="font-medium text-sm">{part.title}</h4>
                          <button
                            onClick={() => removePart(part._id)}
                            className="text-red-500 hover:text-red-700"
                          >
                            ×
                          </button>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => updateQuantity(part._id, part.quantity - 1)}
                              className="w-6 h-6 border rounded hover:bg-gray-100"
                            >
                              -
                            </button>
                            <span className="w-8 text-center">{part.quantity}</span>
                            <button
                              onClick={() => updateQuantity(part._id, part.quantity + 1)}
                              className="w-6 h-6 border rounded hover:bg-gray-100"
                            >
                              +
                            </button>
                          </div>
                          <span className="font-semibold">
                            SAR {(part.price * part.quantity).toFixed(2)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  <div className="border-t pt-4">
                    <div className="flex justify-between mb-4">
                      <span className="font-semibold">Total</span>
                      <span className="font-bold text-xl text-fixzit-green">
                        SAR {selectedParts.reduce((sum, p) => sum + (p.price * p.quantity), 0).toFixed(2)}
                      </span>
                    </div>
                    <button
                      onClick={createPurchaseOrder}
                      className="w-full py-3 bg-fixzit-green text-white rounded-lg hover:bg-fixzit-green/90"
                    >
                      Create Purchase Order
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
