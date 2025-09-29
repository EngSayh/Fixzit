// Bridge to canonical Product model to avoid conflicting schemas
import ProductModel from '@/src/models/marketplace/Product';
export const MarketplaceProduct = ProductModel as any;

