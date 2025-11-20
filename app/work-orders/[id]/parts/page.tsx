'use client';

import { useCallback, useEffect, useState } from 'react';
import { Search, Plus, ShoppingCart } from 'lucide-react';
import { useParams } from 'next/navigation';
import { toast } from 'sonner';

import { logger } from '@/lib/logger';
import { useAutoTranslator } from '@/i18n/useAutoTranslator';
import { useTranslation } from '@/contexts/TranslationContext';

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

type MarketplaceProductPayload = {
  _id?: string;
  id?: string;
  sku?: string;
  slug?: string;
  title?: Record<string, unknown> | string | null;
  name?: string;
  summary?: string;
  buy?: { price?: number };
  stock?: { onHand?: number };
  category?: { name?: string } | string | null;
  categoryName?: string;
};

type MarketplaceProductsResponse = {
  ok?: boolean;
  data?: { items?: MarketplaceProductPayload[] };
  error?: string;
  message?: string;
};

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === 'string' && value.trim().length > 0;

const pickLocalizedString = (value: unknown, preferredKey?: string): string | undefined => {
  if (!value || typeof value !== 'object') {
    return undefined;
  }
  const record = value as Record<string, unknown>;
  if (preferredKey) {
    const candidate = record[preferredKey];
    if (isNonEmptyString(candidate)) {
      return candidate;
    }
  }
  for (const candidate of Object.values(record)) {
    if (isNonEmptyString(candidate)) {
      return candidate;
    }
  }
  return undefined;
};

const resolveProductId = (product: MarketplaceProductPayload): string | undefined => {
  const candidates = [product._id, product.id, product.sku, product.slug];
  return candidates.find(isNonEmptyString);
};

const resolveProductTitle = (product: MarketplaceProductPayload, preferredLanguage?: string): string | undefined => {
  const localized = pickLocalizedString(product.title, preferredLanguage);
  if (localized) {
    return localized;
  }
  if (isNonEmptyString(product.name)) {
    return product.name;
  }
  if (isNonEmptyString(product.summary)) {
    return product.summary;
  }
  if (isNonEmptyString(product.slug)) {
    return product.slug;
  }
  if (isNonEmptyString(product.sku)) {
    return product.sku;
  }
  return undefined;
};

const resolveCategoryLabel = (product: MarketplaceProductPayload): string | undefined => {
  if (isNonEmptyString(product.categoryName)) {
    return product.categoryName;
  }
  if (isNonEmptyString(product.category as string)) {
    return product.category as string;
  }
  if (product.category && typeof product.category === 'object') {
    const candidate = (product.category as Record<string, unknown>).name;
    if (isNonEmptyString(candidate)) {
      return candidate;
    }
  }
  return undefined;
};

const resolveStock = (product: MarketplaceProductPayload): number =>
  typeof product.stock?.onHand === 'number' ? product.stock.onHand : 0;

const resolvePrice = (product: MarketplaceProductPayload): number =>
  typeof product.buy?.price === 'number' ? product.buy.price : 0;

export default function WorkOrderPartsPage() {
  const params = useParams<{ id?: string | string[] }>();
  const rawWorkOrderId = params?.id;
  const workOrderId = Array.isArray(rawWorkOrderId) ? rawWorkOrderId[0] : rawWorkOrderId;
  const auto = useAutoTranslator('workOrders.parts');
  const { language: activeLanguage } = useTranslation();
  
  const [search, setSearch] = useState('');
  const [parts, setParts] = useState<PartItem[]>([]);
  const [selectedParts, setSelectedParts] = useState<SelectedPartItem[]>([]);
  const [loading, setLoading] = useState(false);

  const emptyStateTitle = auto('No marketplace parts published yet', 'list.emptyStateTitle');
  const emptyStateSubtitle = auto('Adjust your search or onboard vendors to see products here.', 'list.emptyStateSubtitle');
  const fallbackProductName = auto('Unnamed marketplace item', 'list.fallbackProductName');
  const fallbackCategoryLabel = auto('Uncategorized', 'list.fallbackCategory');
  const fetchErrorMessage = auto('Unable to load marketplace parts. Please try again.', 'errors.fetchFailed');
  const noSelectionMessage = auto('Add at least one part before creating a purchase order.', 'toast.noSelection');
  
  const searchParts = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: '10' });
      const trimmed = search.trim();
      if (trimmed) {
        params.set('q', trimmed);
      }
      const response = await fetch(`/api/marketplace/products?${params.toString()}`, {
        signal,
        credentials: 'include',
      });
      let payload: MarketplaceProductsResponse | null = null;
      try {
        payload = await response.json();
      } catch {
        payload = null;
      }
      if (!response.ok) {
        const message = (payload && (payload.error || payload.message)) || `Request failed (${response.status})`;
        throw new Error(message);
      }
      const rawItems = Array.isArray(payload?.data?.items) ? payload.data.items : [];
      const normalized = rawItems
        .map((item) => {
          const id = resolveProductId(item);
          if (!id) {
            return null;
          }
          const title = resolveProductTitle(item, activeLanguage) ?? fallbackProductName;
          const category = resolveCategoryLabel(item) ?? fallbackCategoryLabel;
          return {
            id,
            name: title,
            title,
            price: resolvePrice(item),
            stock: resolveStock(item),
            category,
          } as PartItem;
        })
        .filter((item): item is PartItem => Boolean(item));
      if (!signal?.aborted) {
        setParts(normalized);
      }
    } catch (error) {
      if (signal?.aborted) {
        return;
      }
      logger.error('Failed to search parts:', error);
      toast.error(fetchErrorMessage);
      setParts([]);
    } finally {
      if (!signal?.aborted) {
        setLoading(false);
      }
    }
  }, [activeLanguage, fallbackCategoryLabel, fallbackProductName, fetchErrorMessage, search]);

  useEffect(() => {
    const controller = new AbortController();
    const delay = search.trim().length > 0 ? 300 : 0;
    const timeout = window.setTimeout(() => {
      searchParts(controller.signal);
    }, delay);
    return () => {
      controller.abort();
      window.clearTimeout(timeout);
    };
  }, [search, searchParts]);
  
  const addPart = (part: PartItem) => {
    setSelectedParts((prev) => {
      const existing = prev.find(p => p.id === part.id);
      if (existing) {
        return prev.map(p => 
          p.id === part.id 
            ? { ...p, quantity: p.quantity + 1 }
            : p
        );
      }
      return [
        ...prev,
        {
          id: part.id,
          name: part.name,
          title: part.title,
          price: part.price,
          quantity: 1,
        },
      ];
    });
  };
  
  const removePart = (partId: string) => {
    setSelectedParts((prev) => prev.filter(p => p.id !== partId));
  };
  
  const updateQuantity = (partId: string, quantity: number) => {
    setSelectedParts((prev) => {
      if (quantity <= 0) {
        return prev.filter(p => p.id !== partId);
      }
      return prev.map(p => 
        p.id === partId ? { ...p, quantity } : p
      );
    });
  };
  
  const createPurchaseOrder = async () => {
    if (selectedParts.length === 0) {
      toast.error(noSelectionMessage);
      return;
    }
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
    toast.success(auto('Purchase Order created successfully!', 'toast.success'));
  };
  
  return (
    <div className="min-h-screen bg-muted">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-foreground mb-6">
          {auto('Add Parts to Work Order #{{id}}', 'header.title').replace(
            '{{id}}',
            String(workOrderId ?? '')
          )}
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
                    placeholder={auto('Search parts from marketplace...', 'search.placeholder')}
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full ps-10 pe-4 py-2 border rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
              </div>
              
              {loading ? (
                <div className="text-center py-8">
                  {auto('Loading...', 'state.loading')}
                </div>
              ) : parts.length === 0 ? (
                <div className="border border-dashed border-border rounded-2xl text-center py-12 text-muted-foreground">
                  <p className="font-medium text-foreground">{emptyStateTitle}</p>
                  <p className="text-sm">{emptyStateSubtitle}</p>
                </div>
              ) : (
                <div className="grid gap-4">
                  {parts.map((part) => (
                    <div key={part.id} className="border rounded-2xl p-4 flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold">{part.title}</h3>
                        <p className="text-sm text-muted-foreground">
                          {auto('{{category}} • Stock: {{stock}}', 'list.categoryStock')
                            .replace('{{category}}', part.category)
                            .replace('{{stock}}', String(part.stock))}
                        </p>
                        <p className="text-lg font-bold text-success">
                          {auto('SAR {{price}}', 'list.price').replace(
                            '{{price}}',
                            part.price.toString()
                          )}
                        </p>
                      </div>
                      <button
                        onClick={() => addPart(part)}
                        className="px-4 py-2 bg-primary text-white rounded-2xl hover:bg-primary/90 flex items-center gap-2"
                      >
                        <Plus className="h-4 w-4" />
                        {auto('Add', 'actions.add')}
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
                {auto('Selected Parts', 'selected.title')}
              </h2>
              
              {selectedParts.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  {auto('No parts selected', 'selected.empty')}
                </p>
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
                            {auto('SAR {{total}}', 'selected.lineTotal').replace(
                              '{{total}}',
                              (part.price * part.quantity).toFixed(2)
                            )}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  <div className="border-t pt-4">
                    <div className="flex justify-between mb-4">
                      <span className="font-semibold">
                        {auto('Total', 'selected.total')}
                      </span>
                      <span className="font-bold text-xl text-success">
                        {auto('SAR {{total}}', 'selected.grandTotal').replace(
                          '{{total}}',
                          selectedParts
                            .reduce((sum, p) => sum + (p.price * p.quantity), 0)
                            .toFixed(2)
                        )}
                      </span>
                    </div>
                    <button
                      onClick={createPurchaseOrder}
                      className="w-full py-3 bg-success text-white rounded-2xl hover:bg-success/90"
                    >
                      {auto('Create Purchase Order', 'actions.createPO')}
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
