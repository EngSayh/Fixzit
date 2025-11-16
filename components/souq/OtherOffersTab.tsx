'use client';

import { useState } from 'react';
import { Star, Truck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface Offer {
  _id: string;
  sellerId: {
    _id: string;
    tradeName: string;
    legalName: string;
    accountHealth: {
      status: string;
      metrics: {
        odr: number;
      };
    };
  };
  price: number;
  fulfillmentMethod: 'fbf' | 'fbm';
  shippingSpeed: string;
  shippingCost: number;
  estimatedDelivery: string;
  condition: string;
  metrics: {
    customerRating: number;
    orderCount: number;
  };
  availableQuantity: number;
}

interface OtherOffersTabProps {
  offers: Offer[];
  currentWinnerId?: string;
  onAddToCart: (_offerId: string, _quantity: number) => void;
  currency?: string;
}

export default function OtherOffersTab({ 
  offers, 
  currentWinnerId,
  onAddToCart, 
  currency = 'SAR' 
}: OtherOffersTabProps) {
  const [quantities, setQuantities] = useState<Record<string, number>>({});

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency
    }).format(value);
  };

  const getRatingDisplay = (rating: number, count: number) => {
    return (
      <div className="flex items-center gap-1">
        <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
        <span className="text-sm font-medium">{rating.toFixed(1)}</span>
        <span className="text-xs text-gray-500">({count})</span>
      </div>
    );
  };

  const handleQuantityChange = (offerId: string, value: number) => {
    setQuantities(prev => ({ ...prev, [offerId]: value }));
  };

  if (offers.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">No other offers available for this product.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">
          {offers.length} seller{offers.length > 1 ? 's' : ''} offering this product
        </h3>
        <select className="px-3 py-2 border border-gray-300 rounded-md text-sm">
          <option value="price">Sort by: Price (Low to High)</option>
          <option value="rating">Sort by: Customer Rating</option>
          <option value="delivery">Sort by: Fastest Delivery</option>
        </select>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Price</TableHead>
            <TableHead>Condition</TableHead>
            <TableHead>Seller</TableHead>
            <TableHead>Rating</TableHead>
            <TableHead>Delivery</TableHead>
            <TableHead>Qty</TableHead>
            <TableHead></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {offers.map((offer) => {
            const isWinner = offer._id === currentWinnerId;
            const quantity = quantities[offer._id] || 1;

            return (
              <TableRow 
                key={offer._id}
                className={isWinner ? 'bg-blue-50' : ''}
              >
                {/* Price */}
                <TableCell>
                  <div>
                    <div className="font-bold text-gray-900">
                      {formatCurrency(offer.price)}
                    </div>
                    {offer.shippingCost > 0 ? (
                      <div className="text-xs text-gray-600">
                        + {formatCurrency(offer.shippingCost)} shipping
                      </div>
                    ) : (
                      <div className="text-xs text-green-600 font-medium">
                        FREE Shipping
                      </div>
                    )}
                  </div>
                </TableCell>

                {/* Condition */}
                <TableCell>
                  <span className="text-sm text-gray-700 capitalize">
                    {offer.condition}
                  </span>
                </TableCell>

                {/* Seller */}
                <TableCell>
                  <div>
                    <div className="font-medium text-gray-900">
                      {offer.sellerId.tradeName}
                    </div>
                    {offer.sellerId.accountHealth.status === 'excellent' && (
                      <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-300">
                        Top Seller
                      </Badge>
                    )}
                    {isWinner && (
                      <Badge className="text-xs bg-blue-100 text-blue-800 ml-1">
                        Buy Box Winner
                      </Badge>
                    )}
                  </div>
                </TableCell>

                {/* Rating */}
                <TableCell>
                  {getRatingDisplay(offer.metrics.customerRating, offer.metrics.orderCount)}
                </TableCell>

                {/* Delivery */}
                <TableCell>
                  <div className="space-y-1">
                    <div className="text-sm text-gray-700">
                      {offer.estimatedDelivery}
                    </div>
                    {offer.fulfillmentMethod === 'fbf' && (
                      <div className="flex items-center gap-1 text-xs text-blue-600">
                        <Truck className="w-3 h-3" />
                        <span>FBF</span>
                      </div>
                    )}
                  </div>
                </TableCell>

                {/* Quantity */}
                <TableCell>
                  <select
                    value={quantity}
                    onChange={(e) => handleQuantityChange(offer._id, Number(e.target.value))}
                    className="w-16 px-2 py-1 border border-gray-300 rounded text-sm"
                    disabled={offer.availableQuantity === 0}
                  >
                    {[...Array(Math.min(10, offer.availableQuantity))].map((_, i) => (
                      <option key={i + 1} value={i + 1}>
                        {i + 1}
                      </option>
                    ))}
                  </select>
                </TableCell>

                {/* Add to Cart */}
                <TableCell>
                  {offer.availableQuantity > 0 ? (
                    <Button
                      onClick={() => onAddToCart(offer._id, quantity)}
                      variant={isWinner ? 'default' : 'outline'}
                      size="sm"
                    >
                      Add to Cart
                    </Button>
                  ) : (
                    <span className="text-sm text-red-600">Out of Stock</span>
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>

      {/* Summary */}
      <div className="mt-4 p-4 bg-gray-50 rounded-lg">
        <h4 className="font-semibold text-gray-900 mb-2">About these offers</h4>
        <ul className="space-y-1 text-sm text-gray-600">
          <li>• Prices and availability may change without notice</li>
          <li>• Shipping costs are estimates and may vary based on your location</li>
          <li>• All sellers must meet our quality standards</li>
          <li>• FBF (Fulfillment by Fixzit) offers faster, more reliable delivery</li>
        </ul>
      </div>
    </div>
  );
}
