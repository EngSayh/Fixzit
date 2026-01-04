"use client";

import { useState, useMemo, useCallback } from "react";
import { Star, Truck } from "@/components/ui/icons";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAutoTranslator } from "@/i18n/useAutoTranslator";
import { useTranslation } from "@/contexts/TranslationContext";

type SortOption = "price" | "rating" | "delivery";

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
  fulfillmentMethod: "fbf" | "fbm";
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
  locale?: string;
}

export default function OtherOffersTab({
  offers,
  currentWinnerId,
  onAddToCart,
  currency = "SAR",
  locale: localeProp,
}: OtherOffersTabProps) {
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [sortBy, setSortBy] = useState<SortOption>("price");
  const auto = useAutoTranslator("souq.otherOffers");
  const { isRTL } = useTranslation();

  // Locale-aware currency formatting
  const locale = localeProp ?? (isRTL ? "ar-SA" : "en-US");
  const formatCurrency = useCallback(
    (value: number) =>
      new Intl.NumberFormat(locale, {
        style: "currency",
        currency,
      }).format(value),
    [locale, currency],
  );

  const getRatingDisplay = (rating: number, count: number) => {
    return (
      <div className="flex items-center gap-1">
        <Star className="w-4 h-4 fill-yellow-400 text-warning" />
        <span className="text-sm font-medium">{rating.toFixed(1)}</span>
        <span className="text-xs text-muted-foreground">({count})</span>
      </div>
    );
  };

  const handleQuantityChange = (offerId: string, value: number) => {
    setQuantities((prev) => ({ ...prev, [offerId]: value }));
  };

  // Sort offers based on selected option
  const sortedOffers = useMemo(() => {
    const sorted = [...offers];
    switch (sortBy) {
      case "price":
        return sorted.sort((a, b) => (a.price + a.shippingCost) - (b.price + b.shippingCost));
      case "rating":
        return sorted.sort((a, b) => b.metrics.customerRating - a.metrics.customerRating);
      case "delivery":
        // FBF (Fulfillment by Fixzit) first, then by estimated delivery
        return sorted.sort((a, b) => {
          if (a.fulfillmentMethod === "fbf" && b.fulfillmentMethod !== "fbf") return -1;
          if (b.fulfillmentMethod === "fbf" && a.fulfillmentMethod !== "fbf") return 1;
          return a.estimatedDelivery.localeCompare(b.estimatedDelivery);
        });
      default:
        return sorted;
    }
  }, [offers, sortBy]);

  if (offers.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">
          {auto(
            "No other offers available for this product.",
            "emptyState.message",
          )}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-foreground">
          {offers.length}{" "}
          {offers.length > 1
            ? auto("sellers offering this product", "heading.multiple")
            : auto("seller offering this product", "heading.single")}
        </h3>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as SortOption)}
          className="h-8 px-3 py-1.5 border border-border rounded-md text-sm bg-background text-foreground"
        >
          <option value="price">
            {auto("Sort by: Price (Low to High)", "sort.price")}
          </option>
          <option value="rating">
            {auto("Sort by: Customer Rating", "sort.rating")}
          </option>
          <option value="delivery">
            {auto("Sort by: Fastest Delivery", "sort.delivery")}
          </option>
        </select>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{auto("Price", "table.price")}</TableHead>
            <TableHead>{auto("Condition", "table.condition")}</TableHead>
            <TableHead>{auto("Seller", "table.seller")}</TableHead>
            <TableHead>{auto("Rating", "table.rating")}</TableHead>
            <TableHead>{auto("Delivery", "table.delivery")}</TableHead>
            <TableHead>{auto("Qty", "table.quantity")}</TableHead>
            <TableHead></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedOffers.map((offer) => {
            const isWinner = offer._id === currentWinnerId;
            const quantity = quantities[offer._id] || 1;

            return (
              <TableRow
                key={offer._id}
                className={isWinner ? "bg-primary/10" : ""}
              >
                {/* Price */}
                <TableCell>
                  <div>
                    <div className="font-bold text-foreground">
                      {formatCurrency(offer.price)}
                    </div>
                    {offer.shippingCost > 0 ? (
                      <div className="text-xs text-muted-foreground">
                        {auto(
                          "+ {{amount}} shipping",
                          "price.shipping",
                        ).replace(
                          "{{amount}}",
                          formatCurrency(offer.shippingCost),
                        )}
                      </div>
                    ) : (
                      <div className="text-xs text-success font-medium">
                        {auto("FREE Shipping", "price.freeShipping")}
                      </div>
                    )}
                  </div>
                </TableCell>

                {/* Condition */}
                <TableCell>
                  <span className="text-sm text-muted-foreground capitalize">
                    {offer.condition}
                  </span>
                </TableCell>

                {/* Seller */}
                <TableCell>
                  <div>
                    <div className="font-medium text-foreground">
                      {offer.sellerId.tradeName}
                    </div>
                    {offer.sellerId.accountHealth.status === "excellent" && (
                      <Badge
                        variant="outline"
                        className="text-xs bg-success/5 text-success-dark border-success/30"
                      >
                        {auto("Top Seller", "badge.topSeller")}
                      </Badge>
                    )}
                    {isWinner && (
                      <Badge className="text-xs bg-primary/10 text-primary-dark ms-1">
                        {auto("Buy Box Winner", "badge.buyBoxWinner")}
                      </Badge>
                    )}
                  </div>
                </TableCell>

                {/* Rating */}
                <TableCell>
                  {getRatingDisplay(
                    offer.metrics.customerRating,
                    offer.metrics.orderCount,
                  )}
                </TableCell>

                {/* Delivery */}
                <TableCell>
                  <div className="space-y-1">
                    <div className="text-sm text-muted-foreground">
                      {offer.estimatedDelivery}
                    </div>
                    {offer.fulfillmentMethod === "fbf" && (
                      <div className="flex items-center gap-1 text-xs text-primary">
                        <Truck className="w-3 h-3" />
                        <span>{auto("FBF", "delivery.fbf")}</span>
                      </div>
                    )}
                  </div>
                </TableCell>

                {/* Quantity */}
                <TableCell>
                  <select
                    value={quantity}
                    onChange={(e) =>
                      handleQuantityChange(offer._id, Number(e.target.value))
                    }
                    className="w-16 h-8 px-2 py-1.5 border border-border rounded-md text-sm bg-background text-foreground"
                    disabled={offer.availableQuantity === 0}
                  >
                    {[...Array(Math.min(10, offer.availableQuantity))].map(
                      (_, i) => (
                        <option key={i + 1} value={i + 1}>
                          {i + 1}
                        </option>
                      ),
                    )}
                  </select>
                </TableCell>

                <TableCell>
                  {offer.availableQuantity > 0 ? (
                    <Button
                      onClick={() => onAddToCart(offer._id, quantity)}
                      variant={isWinner ? "default" : "outline"}
                      size="sm"
                      aria-label={auto("Add this item to your shopping cart", "actions.addToCart.ariaLabel")}
                      title={auto("Add to Cart", "actions.addToCart")}
                    >
                      {auto("Add to Cart", "actions.addToCart")}
                    </Button>
                  ) : (
                    <span className="text-sm text-destructive">
                      {auto("Out of Stock", "status.outOfStock")}
                    </span>
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>

      {/* Summary */}
      <div className="mt-4 p-4 bg-muted rounded-lg">
        <h4 className="font-semibold text-foreground mb-2">
          {auto("About these offers", "summary.title")}
        </h4>
        <ul className="space-y-1 text-sm text-muted-foreground">
          <li>
            •{" "}
            {auto(
              "Prices and availability may change without notice",
              "summary.pricesChange",
            )}
          </li>
          <li>
            •{" "}
            {auto(
              "Shipping costs are estimates and may vary based on your location",
              "summary.shipping",
            )}
          </li>
          <li>
            •{" "}
            {auto(
              "All sellers must meet our quality standards",
              "summary.quality",
            )}
          </li>
          <li>
            •{" "}
            {auto(
              "FBF (Fulfillment by Fixzit) offers faster, more reliable delivery",
              "summary.fbf",
            )}
          </li>
        </ul>
      </div>
    </div>
  );
}
