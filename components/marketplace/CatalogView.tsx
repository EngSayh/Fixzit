"use client";
import { logger } from "@/lib/logger";

import React, { useEffect, useMemo, useState } from "react";
import useSWR from "swr";
import {
  Search,
  ShoppingCart,
  Star,
  Store,
  PackageSearch,
  Loader2,
  ShieldCheck,
  BadgeCheck,
} from "@/components/ui/icons";
import { STORAGE_KEYS } from "@/config/constants";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import LoginPrompt from "@/components/LoginPrompt";
import { useAutoTranslator } from "@/i18n/useAutoTranslator";

type VendorInfo = {
  id: string;
  name: string;
  rating?: number;
  verified?: boolean;
  contactName?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
};

type CategoryInfo = {
  id: string;
  name: string;
  slug: string;
};

type Product = {
  id: string;
  title: string;
  description?: string;
  price: number;
  currency: string;
  unit: string;
  stock: number;
  rating?: number;
  reviewCount?: number;
  images?: string[];
  vendor?: VendorInfo | null;
  category?: CategoryInfo | null;
};

type CatalogResponse = {
  products: Product[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
    tenantId: string;
  };
};

type CategoryResponse = {
  categories: CategoryInfo[];
  tenantId: string;
};

const productFetcher = async (url: string): Promise<CatalogResponse> => {
  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) {
      throw new Error("Failed to load marketplace catalog");
    }
    const json = await res.json();
    return json.data;
  } catch (error) {
    logger.error("Product fetcher error", { error });
    throw new Error("Failed to load marketplace catalog");
  }
};

const categoryFetcher = async (url: string): Promise<CategoryResponse> => {
  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) {
      throw new Error("Failed to load marketplace categories");
    }
    const json = await res.json();
    return json.data;
  } catch (error) {
    logger.error("Category fetcher error", { error });
    throw new Error("Failed to load marketplace categories");
  }
};

const formatCurrency = (value: number, currency: string) => {
  return new Intl.NumberFormat("en-SA", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(value);
};

const DEFAULT_TENANT =
  process.env.NEXT_PUBLIC_MARKETPLACE_TENANT || "demo-tenant";

interface CatalogViewProps {
  title?: string;
  subtitle?: string;
  tenantId?: string;
  context?: "public" | "fm";
}

export default function CatalogView({
  title,
  subtitle,
  tenantId = DEFAULT_TENANT,
  context = "public",
}: CatalogViewProps) {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  const auto = useAutoTranslator("marketplace.catalog");
  const resolvedTitle = title ?? auto("Fixzit Marketplace", "header.title");
  const resolvedSubtitle =
    subtitle ??
    auto(
      "Browse verified materials and service vendors ready for procurement",
      "header.subtitle",
    );

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    params.set("tenantId", tenantId);
    params.set("limit", "24");
    if (search.trim()) params.set("q", search.trim());
    if (category) params.set("category", category);
    if (minPrice) params.set("minPrice", minPrice);
    if (maxPrice) params.set("maxPrice", maxPrice);
    return params.toString();
  }, [tenantId, search, category, minPrice, maxPrice]);

  const {
    data: productData,
    error,
    isLoading,
    mutate,
  } = useSWR<CatalogResponse>(
    `/api/marketplace/products?${queryString}`,
    productFetcher,
    { keepPreviousData: true },
  );

  const { data: categoryData } = useSWR<CategoryResponse>(
    `/api/marketplace/categories?tenantId=${tenantId}`,
    categoryFetcher,
    { revalidateOnFocus: false },
  );

  useEffect(() => {
    if (!feedbackMessage) return;
    const timer = setTimeout(() => setFeedbackMessage(null), 4000);
    return () => clearTimeout(timer);
  }, [feedbackMessage]);

  const products = productData?.products ?? [];
  const categories = categoryData?.categories ?? [];
  const fmHint = auto(
    "Inventory synced with tenant procurement guardrails and 3-bid policy.",
    "header.fmHint",
  );
  const searchPlaceholder = auto(
    "Search products, vendors, or SKUs",
    "filters.search",
  );
  const allCategoriesLabel = auto("All categories", "filters.allCategories");
  const minPlaceholder = auto("Min SAR", "filters.minPrice");
  const maxPlaceholder = auto("Max SAR", "filters.maxPrice");
  const resetFiltersLabel = auto("Reset filters", "actions.resetFilters");
  const inviteVendorLabel = auto("Invite vendor", "actions.inviteVendor");
  const emptyTitle = auto("No products match your filters", "empty.title");
  const emptySubtitleError = auto(
    "We could not reach the marketplace catalog right now.",
    "empty.error",
  );
  const emptySubtitleDefault = auto(
    "Adjust your filters or check back later for new inventory.",
    "empty.subtitle",
  );
  const vendorPending = auto(
    "Vendor pending onboarding",
    "cards.vendorPending",
  );
  const imageFallback = auto("Image not provided", "cards.imageFallback");
  const noDescriptionCopy = auto(
    "Vendor has not provided a detailed description yet.",
    "cards.noDescription",
  );
  const ratingTemplate = auto("{{rating}} · {{count}} reviews", "cards.rating");
  const verifiedVendorLabel = auto("Verified vendor", "cards.verifiedVendor");
  const addToCartLabel = auto("Add to cart", "actions.addToCart");
  const requestQuoteLabel = auto("Request quote", "actions.requestQuote");
  const loginTitle = auto("Sign in to continue", "loginPrompt.title");
  const loginDescription = auto(
    "Sign in to request quotes, chat with vendors, or place orders.",
    "loginPrompt.description",
  );

  const isAuthenticated = () => {
    if (typeof window === "undefined") return false;
    return (
      document.cookie.includes("fixzit_auth=") ||
      Boolean(localStorage.getItem(STORAGE_KEYS.userSession))
    );
  };

  const handleAddToCart = async (product: Product) => {
    if (!isAuthenticated()) {
      setShowLoginPrompt(true);
      return;
    }

    try {
      const res = await fetch("/api/marketplace/cart", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ productId: product.id, quantity: 1 }),
      });

      if (!res.ok) {
        throw new Error("ADD_TO_CART_FAILED");
      }

      setFeedbackMessage(
        auto("{{product}} added to cart.", "feedback.added").replace(
          "{{product}}",
          product.title,
        ),
      );
      await mutate();
    } catch (err) {
      import("../../lib/logger")
        .then(({ logError }) => {
          logError("Failed to add product to cart", err as Error, {
            component: "CatalogView",
            action: "addToCart",
            productId: product.id,
          });
        })
        .catch((loggerError) => {
          logger.error("Failed to load logger:", { error: loggerError });
        });
      setFeedbackMessage(
        auto(
          "We could not add this item to your cart. Please try again.",
          "feedback.failed",
        ),
      );
    }
  };

  const emptyStateSubtitle = error ? emptySubtitleError : emptySubtitleDefault;

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold text-foreground">{resolvedTitle}</h1>
        <p className="text-muted-foreground">{resolvedSubtitle}</p>
        {context === "fm" && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <ShieldCheck className="w-4 h-4 text-success" />
            <span>{fmHint}</span>
          </div>
        )}
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute start-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder={searchPlaceholder}
                className="ps-9"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 lg:w-[540px]">
              <Select
                value={category}
                onValueChange={(value) => setCategory(value)}
                className="w-full sm:w-40 bg-muted border-input text-foreground"
              >
                <SelectContent>
                  <SelectItem value="">{allCategoriesLabel}</SelectItem>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.slug || cat.id}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                type="number"
                inputMode="decimal"
                min="0"
                placeholder={minPlaceholder}
                value={minPrice}
                onChange={(event) => setMinPrice(event.target.value)}
              />
              <Input
                type="number"
                inputMode="decimal"
                min="0"
                placeholder={maxPlaceholder}
                value={maxPrice}
                onChange={(event) => setMaxPrice(event.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {feedbackMessage && (
        <div className="rounded-2xl border border-success/20 bg-success/10 px-4 py-3 text-sm text-success">
          {feedbackMessage}
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      ) : products.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-16 flex flex-col items-center text-center gap-4">
            <PackageSearch className="w-12 h-12 text-muted-foreground" />
            <div>
              <h2 className="text-lg font-semibold text-foreground">
                {emptyTitle}
              </h2>
              <p className="text-muted-foreground text-sm">
                {emptyStateSubtitle}
              </p>
            </div>
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  setSearch("");
                  setCategory("");
                  setMinPrice("");
                  setMaxPrice("");
                }}
                aria-label={resetFiltersLabel}
                title={resetFiltersLabel}
              >
                {resetFiltersLabel}
              </Button>
              {context === "fm" && (
                <Button
                  onClick={() => setShowLoginPrompt(true)}
                  className="bg-primary hover:bg-primary-dark"
                  aria-label={inviteVendorLabel}
                  title={inviteVendorLabel}
                >
                  {inviteVendorLabel}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {products.map((product) => (
            <Card key={product.id} className="flex flex-col">
              <CardHeader className="space-y-1">
                <CardTitle className="text-lg text-foreground">
                  {product.title}
                </CardTitle>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Store className="w-4 h-4" />
                  <span>{product.vendor?.name ?? vendorPending}</span>
                  {product.vendor?.verified && (
                    <BadgeCheck className="w-4 h-4 text-success" />
                  )}
                </div>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col gap-4">
                <div className="flex items-start gap-4">
                  <div className="h-20 w-20 rounded-2xl border border-border flex items-center justify-center bg-muted overflow-hidden">
                    {product.images?.[0] ? (
                      <img
                        src={product.images[0]}
                        alt={product.title}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <span className="text-xs text-muted-foreground text-center px-2">
                        {imageFallback}
                      </span>
                    )}
                  </div>
                  <div className="space-y-2 flex-1">
                    <div className="text-2xl font-semibold text-foreground">
                      {formatCurrency(product.price, product.currency)}
                      <span className="text-sm text-muted-foreground ms-1">
                        / {product.unit}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                      <Badge
                        variant="outline"
                        className="border-success text-success"
                      >
                        {auto("Stock: {{count}}", "cards.stock").replace(
                          "{{count}}",
                          String(product.stock),
                        )}
                      </Badge>
                      {product.category?.name && (
                        <Badge variant="outline">{product.category.name}</Badge>
                      )}
                    </div>
                  </div>
                </div>

                <p className="text-sm text-muted-foreground line-clamp-3">
                  {product.description || noDescriptionCopy}
                </p>

                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Star className="w-4 h-4 text-warning" />
                    <span>
                      {ratingTemplate
                        .replace("{{rating}}", (product.rating ?? 0).toFixed(1))
                        .replace("{{count}}", String(product.reviewCount ?? 0))}
                    </span>
                  </div>
                  {product.vendor?.verified && (
                    <div className="flex items-center gap-1 text-success">
                      <ShieldCheck className="w-4 h-4" />
                      <span className="font-medium">{verifiedVendorLabel}</span>
                    </div>
                  )}
                </div>

                <div className="flex gap-2 pt-2">
                  <Button
                    className="flex-1 bg-primary hover:bg-primary-dark"
                    onClick={() => handleAddToCart(product)}
                    aria-label={`${addToCartLabel}: ${product.title}`}
                    title={`${addToCartLabel}: ${product.title}`}
                  >
                    <ShoppingCart className="w-4 h-4 me-2" />
                    {addToCartLabel}
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => setShowLoginPrompt(true)}
                    aria-label={`${requestQuoteLabel}: ${product.title}`}
                    title={`${requestQuoteLabel}: ${product.title}`}
                  >
                    {requestQuoteLabel}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <LoginPrompt
        isOpen={showLoginPrompt}
        onClose={() => setShowLoginPrompt(false)}
        title={loginTitle}
        description={loginDescription}
        action="marketplace"
        redirectTo="/marketplace"
      />
    </div>
  );
}
