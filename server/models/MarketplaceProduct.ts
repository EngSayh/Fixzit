// Bridge to canonical Product model to avoid conflicting schemas
// TYPESCRIPT FIX: Export properly typed model instead of 'unknown'
import ProductModel from "@/server/models/marketplace/Product";
import type { Model } from "mongoose";
import type { MarketplaceProduct as MarketplaceProductType } from "@/server/models/marketplace/Product";

export const MarketplaceProduct = ProductModel as Model<MarketplaceProductType>;
