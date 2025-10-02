// Bridge to canonical Product model to avoid conflicting schemas
import ProductModel from '@/server/models/marketplace/Product';
export const MarketplaceProduct = ProductModel as any;


