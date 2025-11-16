'use client';

import { useCallback, useEffect, useState } from 'react';
import { Search, Plus, ShoppingCart } from 'lucide-react';
import { useParams } from 'next/navigation';
import { toast } from 'sonner';

import { logger } from '@/lib/logger';
interface PartItem {
  id: string;
  name: string;
  title: string;
  price: number;
  stock: number;
  category: string;
}

interface SelectedPartItem {
  id: string;
  name: string;
  title: string;
  price: number;
  quantity: number;
}

export default function WorkOrderPartsPage() {
  const params = useParams();
  const workOrderId = params.id;
  
  const [search, setSearch] = useState('');
  const [parts, setParts] = useState<PartItem[]>([]);
  const [selectedParts, setSelectedParts] = useState<SelectedPartItem[]>([]);
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
      logger.error('Failed to search parts:', error);
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    searchParts();
  }, [searchParts]);
  
  const addPart = (part: PartItem) => {
    const existing = selectedParts.find(p => p.id === part.id);
    if (existing) {
      setSelectedParts(selectedParts.map(p => 
        p.id === part.id 
          ? { ...p, quantity: p.quantity + 1 }
          : p
      ));
    } else {
      setSelectedParts([...selectedParts, { 
        id: part.id,
        name: part.name,
        title: part.name, // Map name to title
        price: part.price,
        quantity: 1 
      }]);
    }
  };
  
  const removePart = (partId: string) => {
    setSelectedParts(selectedParts.filter(p => p.id !== partId));
  };
  
  const updateQuantity = (partId: string, quantity: number) => {
    if (quantity <= 0) {
      removePart(partId);
    } else {
      setSelectedParts(selectedParts.map(p => 
        p.id === partId ? { ...p, quantity } : p
      ));
    }
  };
  
  const createPurchaseOrder = async () => {
    // Create PO from selected parts
    const po = {
      workOrderId,
      items: selectedParts.map(p => ({
        productId: p.id,
        title: p.title,
        quantity: p.quantity,
        unitPrice: p.price,
        total: p.price * p.quantity
      })),
      total: selectedParts.reduce((sum, p) => sum + (p.price * p.quantity), 0)
    };
    
    logger.info('Creating PO:', { po });
    // In production, send to API
    toast.success('Purchase Order created successfully!');
  };
  
  return (
    <div className="min-h-screen bg-muted">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-foreground mb-6">
          Add Parts to Work Order #{workOrderId}
        </h1>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Parts Search */}
          <div className="lg:col-span-2">
            <div className="bg-card rounded-2xl shadow p-6">
              <div className="flex gap-2 mb-6">
                <div className="flex-1 relative">
                  <Search className="absolute start-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Search parts from marketplace..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full ps-10 pe-4 py-2 border rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
              </div>
              
              {loading ? (
                <div className="text-center py-8">Loading...</div>
              ) : (
                <div className="grid gap-4">
                  {parts.map((part) => (
                    <div key={part.id} className="border rounded-2xl p-4 flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold">{part.title}</h3>
                        <p className="text-sm text-muted-foreground">{part.category} • Stock: {part.stock}</p>
                        <p className="text-lg font-bold text-success">SAR {part.price}</p>
                      </div>
                      <button
                        onClick={() => addPart(part)}
                        className="px-4 py-2 bg-primary text-white rounded-2xl hover:bg-primary/90 flex items-center gap-2"
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
            <div className="bg-card rounded-2xl shadow p-6 sticky top-4">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <ShoppingCart className="h-5 w-5" />
                Selected Parts
              </h2>
              
              {selectedParts.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">No parts selected</p>
              ) : (
                <>
                  <div className="space-y-3 mb-4">
                    {selectedParts.map((part) => (
                      <div key={part.id} className="border rounded-2xl p-3">
                        <div className="flex justify-between items-start mb-2">
                          <h4 className="font-medium text-sm">{part.title}</h4>
                          <button
                            onClick={() => removePart(part.id)}
                            className="text-destructive/80 hover:text-destructive/90"
                          >
                            ×
                          </button>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => updateQuantity(part.id, part.quantity - 1)}
                              className="w-6 h-6 border rounded hover:bg-muted"
                            >
                              -
                            </button>
                            <span className="w-8 text-center">{part.quantity}</span>
                            <button
                              onClick={() => updateQuantity(part.id, part.quantity + 1)}
                              className="w-6 h-6 border rounded hover:bg-muted"
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
                      <span className="font-bold text-xl text-success">
                        SAR {selectedParts.reduce((sum, p) => sum + (p.price * p.quantity), 0).toFixed(2)}
                      </span>
                    </div>
                    <button
                      onClick={createPurchaseOrder}
                      className="w-full py-3 bg-success text-white rounded-2xl hover:bg-success/90"
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
