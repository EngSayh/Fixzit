"use client";

import { useState } from "react";
import {
  Search,
  Filter,
  ShoppingCart,
  Heart,
  Star,
  User,
  LogIn,
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useTranslation } from "@/contexts/TranslationContext";

interface Product {
  id: string;
  name: string;
  category: string;
  price: string;
  originalPrice?: string;
  rating: number;
  reviews: number;
  image: string;
  vendor: string;
  inStock: boolean;
  isNew?: boolean;
  discount?: number;
}

const SAMPLE_PRODUCTS: Product[] = [
  {
    id: "1",
    name: "Steel Rebar 12mm",
    category: "Construction Materials",
    price: "SAR 2,450",
    originalPrice: "SAR 2,650",
    rating: 4.5,
    reviews: 128,
    image: "/img/logo.jpg",
    vendor: "SteelCorp Ltd",
    inStock: true,
    discount: 8,
  },
  {
    id: "2",
    name: "LED Light Fixtures 60W",
    category: "Electrical",
    price: "SAR 185",
    originalPrice: "SAR 220",
    rating: 4.2,
    reviews: 89,
    image: "/img/logo.jpg",
    vendor: "LightTech Solutions",
    inStock: true,
    discount: 16,
    isNew: true,
  },
  {
    id: "3",
    name: "Safety Equipment Set",
    category: "Safety & PPE",
    price: "SAR 450",
    originalPrice: "SAR 520",
    rating: 4.8,
    reviews: 234,
    image: "/img/logo.jpg",
    vendor: "SafetyFirst Inc",
    inStock: true,
    discount: 13,
  },
  {
    id: "4",
    name: "HVAC System Complete",
    category: "Mechanical",
    price: "SAR 8,900",
    rating: 4.6,
    reviews: 67,
    image: "/img/logo.jpg",
    vendor: "ClimateTech Pro",
    inStock: true,
  },
  {
    id: "5",
    name: "Office Furniture Bundle",
    category: "Furniture",
    price: "SAR 3,200",
    originalPrice: "SAR 3,800",
    rating: 4.3,
    reviews: 156,
    image: "/img/logo.jpg",
    vendor: "Workspace Solutions",
    inStock: false,
    discount: 16,
  },
  {
    id: "6",
    name: "Security Camera System",
    category: "Security",
    price: "SAR 1,250",
    rating: 4.7,
    reviews: 203,
    image: "/img/logo.jpg",
    vendor: "SecureGuard Systems",
    inStock: true,
  },
];

export default function CatalogPage() {
  const router = useRouter();
  const { t } = useTranslation();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [sortBy, setSortBy] = useState("relevance");

  const filteredProducts = SAMPLE_PRODUCTS.filter((product) => {
    const matchesSearch =
      product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.category.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory =
      selectedCategory === "all" || product.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const categories = [
    "all",
    ...Array.from(new Set(SAMPLE_PRODUCTS.map((p) => p.category))),
  ];

  const handleAddToCart = (_productId: string) => {
    // Redirect to login if not authenticated
    router.push("/login?redirect=/souq/catalog&action=add-to-cart");
  };

  const handleViewDetails = (productId: string) => {
    // Allow viewing details without login
    router.push(`/souq/catalog/${productId}`);
  };

  return (
    <div className="min-h-screen bg-muted flex flex-col">
      {/* Header */}
      <div className="bg-card shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Link href="/souq" className="text-2xl font-bold text-success">
                {t("souq.brand.title", "Fixzit Souq")}
              </Link>
              <div className="hidden md:flex items-center gap-6 text-sm">
                <Link
                  href="/souq/catalog"
                  className="text-muted-foreground hover:text-success"
                >
                  {t("souq.nav.catalog", "Catalog")}
                </Link>
                <Link
                  href="/souq/vendors"
                  className="text-muted-foreground hover:text-success"
                >
                  {t("souq.nav.vendors", "Vendors")}
                </Link>
                <Link
                  href="/souq/rfqs"
                  className="text-muted-foreground hover:text-success"
                >
                  {t("souq.nav.rfqs", "RFQs")}
                </Link>
                <Link
                  href="/souq/orders"
                  className="text-muted-foreground hover:text-success"
                >
                  {t("souq.nav.orders", "Orders")}
                </Link>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <Link
                href="/login"
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-foreground hover:text-success"
              >
                <User className="w-4 h-4" />
                {t("common.signIn", "Sign In")}
              </Link>
              <Link
                href="/login"
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-success text-white rounded-2xl hover:bg-success/90"
              >
                <LogIn className="w-4 h-4" />
                {t("common.signUp", "Sign Up")}
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Search and Filters */}
        <div className="mb-6">
          <div className="flex flex-col md:flex-row gap-4 mb-4">
            <div className="flex-1 relative">
              <Search
                className="absolute start-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5"
                aria-hidden="true"
              />
              <input
                type="text"
                placeholder={t(
                  "souq.catalog.searchPlaceholder",
                  "Search products, categories, or vendors...",
                )}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full ps-10 pe-4 py-3 border border-border rounded-2xl focus:ring-2 focus:ring-success focus:border-transparent"
                aria-label={t(
                  "souq.catalog.searchAriaLabel",
                  "Search products, categories, or vendors",
                )}
              />
            </div>

            <div className="flex gap-3">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="px-4 py-3 border border-border rounded-2xl focus:ring-2 focus:ring-success focus:border-transparent"
                aria-label={t(
                  "souq.catalog.filterByCategory",
                  "Filter by category",
                )}
              >
                {categories.map((category) => (
                  <option key={category} value={category}>
                    {category === "all"
                      ? t("souq.catalog.categoryAll", "All Categories")
                      : category}
                  </option>
                ))}
              </select>

              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-4 py-3 border border-border rounded-2xl focus:ring-2 focus:ring-success focus:border-transparent"
                aria-label={t("souq.catalog.sortBy", "Sort products by")}
              >
                <option value="relevance">
                  {t("souq.catalog.sort.relevance", "Relevance")}
                </option>
                <option value="price-low">
                  {t("souq.catalog.sort.priceLow", "Price: Low to High")}
                </option>
                <option value="price-high">
                  {t("souq.catalog.sort.priceHigh", "Price: High to Low")}
                </option>
                <option value="rating">
                  {t("souq.catalog.sort.rating", "Highest Rated")}
                </option>
                <option value="newest">
                  {t("souq.catalog.sort.newest", "Newest First")}
                </option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span>
              {filteredProducts.length}{" "}
              {t("souq.catalog.resultsFound", "results found")}
            </span>
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4" />
              <span>{t("souq.catalog.filtersApplied", "Filters applied")}</span>
            </div>
          </div>
        </div>

        {/* Product Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredProducts.map((product) => (
            <div
              key={product.id}
              className="bg-card rounded-2xl shadow-md border border-border overflow-hidden hover:shadow-lg transition-shadow"
            >
              <div className="relative w-full h-48">
                <Image
                  src={product.image}
                  alt={product.name}
                  fill
                  className="object-cover"
                />

                {/* Badges */}
                <div className="absolute top-2 start-2 flex flex-col gap-1">
                  {product.isNew && (
                    <span className="bg-primary/20 text-white text-xs px-2 py-1 rounded">
                      {t("souq.catalog.badge.new", "New")}
                    </span>
                  )}
                  {product.discount && (
                    <span className="bg-destructive/20 text-white text-xs px-2 py-1 rounded">
                      -{product.discount}%
                    </span>
                  )}
                </div>

                <button type="button" className="absolute top-2 end-2 p-2 bg-card rounded-full shadow-md hover:bg-muted">
                  <Heart className="w-4 h-4 text-muted-foreground hover:text-destructive" />
                </button>
              </div>

              <div className="p-4">
                <h3 className="font-semibold text-foreground mb-1 line-clamp-2">
                  {product.name}
                </h3>
                <p className="text-sm text-muted-foreground mb-2">
                  {product.category}
                </p>

                <div className="flex items-center gap-2 mb-2">
                  <div className="flex items-center gap-1">
                    <Star className="w-4 h-4 fill-warning text-accent" />
                    <span className="text-sm font-medium">
                      {product.rating}
                    </span>
                  </div>
                  <span className="text-sm text-muted-foreground">
                    ({product.reviews})
                  </span>
                </div>

                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-bold text-foreground">
                      {product.price}
                    </span>
                    {product.originalPrice && (
                      <span className="text-sm text-muted-foreground line-through">
                        {product.originalPrice}
                      </span>
                    )}
                  </div>
                  <span
                    className={`text-xs px-2 py-1 rounded-full ${
                      product.inStock
                        ? "bg-success/10 text-success-foreground"
                        : "bg-destructive/10 text-destructive-foreground"
                    }`}
                  >
                    {product.inStock
                      ? t("souq.catalog.stock.in", "In Stock")
                      : t("souq.catalog.stock.out", "Out of Stock")}
                  </span>
                </div>

                <div className="flex gap-2">
                  <button type="button"
                    onClick={() => handleViewDetails(product.id)}
                    className="flex-1 px-3 py-2 bg-muted text-foreground rounded-2xl hover:bg-muted transition-colors text-sm"
                  >
                    {t("souq.catalog.actions.viewDetails", "View Details")}
                  </button>
                  <button type="button"
                    onClick={() => handleAddToCart(product.id)}
                    disabled={!product.inStock}
                    className={`flex-1 px-3 py-2 rounded-2xl transition-colors text-sm ${
                      product.inStock
                        ? "bg-success text-white hover:bg-success/90"
                        : "bg-muted text-muted-foreground cursor-not-allowed"
                    }`}
                  >
                    <ShoppingCart className="w-4 h-4 inline me-1" />
                    {t("souq.catalog.actions.addToCart", "Add to Cart")}
                  </button>
                </div>

                <div className="mt-2 text-xs text-muted-foreground">
                  {t("souq.catalog.soldBy", "Sold by:")} {product.vendor}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* No Results */}
        {filteredProducts.length === 0 && (
          <div className="text-center py-12">
            <div className="text-muted-foreground mb-4">
              <Search className="w-12 h-12 mx-auto" />
            </div>
            <h3 className="text-lg font-medium text-foreground mb-2">
              {t("souq.catalog.noResults.title", "No products found")}
            </h3>
            <p className="text-muted-foreground">
              {t(
                "souq.catalog.noResults.description",
                "Try adjusting your search criteria or browse all categories",
              )}
            </p>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="bg-card border-t mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="text-center text-sm text-muted-foreground">
            <p>
              {t(
                "souq.catalog.footer.cta",
                "Browse our catalog freely. Sign in to add to cart, place orders, and access exclusive deals.",
              )}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
