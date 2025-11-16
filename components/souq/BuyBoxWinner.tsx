'use client';

import { useState } from 'react';
import { Star, Truck, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface BuyBoxWinnerProps {
  winner: {
    sellerId: {
      tradeName: string;
      legalName: string;
      accountHealth: {
        status: string;
        metrics: {
          odr: number;
          lsr: number;
        };
      };
    };
    price: number;
    fulfillmentMethod: 'fbf' | 'fbm';
    shippingSpeed: string;
    estimatedDelivery: string;
    metrics: {
      customerRating: number;
      onTimeShipRate: number;
      orderCount: number;
    };
    availableQuantity: number;
  };
  onAddToCart: (_quantity: number) => void;
  currency?: string;
}

export default function BuyBoxWinner({ winner, onAddToCart, currency = 'SAR' }: BuyBoxWinnerProps) {
  const [quantity, setQuantity] = useState(1);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency
    }).format(value);
  };

  const getDeliveryBadge = () => {
    if (winner.fulfillmentMethod === 'fbf') {
      return (
        <Badge className="bg-primary/10 text-primary-dark">
          <Truck className="w-3 h-3 mr-1" />
          FBF - Fast Delivery
        </Badge>
      );
    }
    return null;
  };

  const getRatingStars = (rating: number) => {
    return (
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`w-4 h-4 ${
              star <= rating
                ? 'fill-yellow-400 text-yellow-400'
                : 'fill-gray-200 text-gray-200'
            }`}
          />
        ))}
        <span className="text-sm text-gray-600 ml-1">
          ({winner.metrics.orderCount.toLocaleString()} ratings)
        </span>
      </div>
    );
  };

  return (
    <div className="border border-gray-300 rounded-lg p-6 bg-white">
      {/* Price Section */}
      <div className="mb-4">
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-bold text-gray-900">
            {formatCurrency(winner.price)}
          </span>
          <span className="text-sm text-gray-600">& FREE Shipping</span>
        </div>
        <p className="text-sm text-gray-600 mt-1">
          Estimated delivery: <strong>{winner.estimatedDelivery}</strong>
        </p>
      </div>

      {/* Availability */}
      <div className="mb-4">
        {winner.availableQuantity > 0 ? (
          <div className="flex items-center gap-2 text-success-dark">
            <CheckCircle2 className="w-5 h-5" />
            <span className="font-semibold">In Stock</span>
          </div>
        ) : (
          <div className="text-destructive font-semibold">Out of Stock</div>
        )}
      </div>

      {/* Quantity Selector */}
      <div className="mb-4">
        <label className="text-sm font-medium text-gray-700 mb-2 block">
          Quantity
        </label>
        <select
          value={quantity}
          onChange={(e) => setQuantity(Number(e.target.value))}
          className="w-full px-3 py-2 border border-gray-300 rounded-md"
        >
          {[...Array(Math.min(10, winner.availableQuantity))].map((_, i) => (
            <option key={i + 1} value={i + 1}>
              {i + 1}
            </option>
          ))}
        </select>
      </div>

      {/* Add to Cart Button */}
      <Button
        onClick={() => onAddToCart(quantity)}
        disabled={winner.availableQuantity === 0}
        className="w-full mb-3"
        size="lg"
      >
        Add to Cart
      </Button>

      {/* Fulfillment Badge */}
      <div className="mb-4">
        {getDeliveryBadge()}
      </div>

      {/* Seller Info */}
      <div className="border-t border-gray-200 pt-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-gray-600">Sold by</span>
          <span className="font-semibold text-gray-900">
            {winner.sellerId.tradeName}
          </span>
        </div>

        {/* Seller Rating */}
        <div className="mb-2">
          {getRatingStars(winner.metrics.customerRating)}
        </div>

        {/* Seller Metrics */}
        <div className="space-y-1 text-sm text-gray-600">
          <div className="flex items-center justify-between">
            <span>On-time shipping</span>
            <span className="font-medium">
              {(winner.metrics.onTimeShipRate * 100).toFixed(0)}%
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span>Order defect rate</span>
            <span className="font-medium">
              {(winner.sellerId.accountHealth.metrics.odr * 100).toFixed(2)}%
            </span>
          </div>
        </div>

        {/* Trust Badges */}
        {winner.sellerId.accountHealth.status === 'excellent' && (
          <div className="mt-3 flex items-center gap-2 text-sm text-success-dark">
            <ShieldCheck className="w-4 h-4" />
            <span>Verified Excellent Seller</span>
          </div>
        )}
      </div>
    </div>
  );
}
