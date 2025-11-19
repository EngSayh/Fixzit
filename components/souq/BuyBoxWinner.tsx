'use client';

import { useState } from 'react';
import { Star, Truck, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAutoTranslator } from '@/i18n/useAutoTranslator';

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
  const auto = useAutoTranslator('souq.buyBoxWinner');

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
          <Truck className="w-3 h-3 me-1" />
          {auto('FBF - Fast Delivery', 'delivery.badge')}
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
        <span className="text-sm text-gray-600 ms-1">
          {auto('({{count}} ratings)', 'rating.total').replace('{{count}}', winner.metrics.orderCount.toLocaleString())}
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
          <span className="text-sm text-gray-600">{auto('& FREE Shipping', 'price.freeShipping')}</span>
        </div>
        <p className="text-sm text-gray-600 mt-1">
          {auto('Estimated delivery:', 'price.deliveryLabel')}{' '}
          <strong>{winner.estimatedDelivery}</strong>
        </p>
      </div>

      {/* Availability */}
      <div className="mb-4">
        {winner.availableQuantity > 0 ? (
          <div className="flex items-center gap-2 text-success-dark">
            <CheckCircle2 className="w-5 h-5" />
            <span className="font-semibold">{auto('In Stock', 'stock.available')}</span>
          </div>
        ) : (
          <div className="text-destructive font-semibold">{auto('Out of Stock', 'stock.unavailable')}</div>
        )}
      </div>

      {/* Quantity Selector */}
      <div className="mb-4">
        <label className="text-sm font-medium text-gray-700 mb-2 block">
          {auto('Quantity', 'quantity.label')}
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
        {auto('Add to Cart', 'actions.addToCart')}
      </Button>

      {/* Fulfillment Badge */}
      <div className="mb-4">
        {getDeliveryBadge()}
      </div>

      {/* Seller Info */}
      <div className="border-t border-gray-200 pt-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-gray-600">{auto('Sold by', 'seller.soldBy')}</span>
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
            <span>{auto('On-time shipping', 'metrics.onTimeShipping')}</span>
            <span className="font-medium">
              {(winner.metrics.onTimeShipRate * 100).toFixed(0)}%
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span>{auto('Order defect rate', 'metrics.odr')}</span>
            <span className="font-medium">
              {(winner.sellerId.accountHealth.metrics.odr * 100).toFixed(2)}%
            </span>
          </div>
        </div>

        {/* Trust Badges */}
        {winner.sellerId.accountHealth.status === 'excellent' && (
          <div className="mt-3 flex items-center gap-2 text-sm text-success-dark">
            <ShieldCheck className="w-4 h-4" />
            <span>{auto('Verified Excellent Seller', 'badge.verifiedSeller')}</span>
          </div>
        )}
      </div>
    </div>
  );
}
