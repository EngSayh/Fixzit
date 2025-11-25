export interface OfflineCategory {
  id: string;
  slug: string;
  name: { en: string };
}

export interface OfflineProduct {
  id: string;
  slug: string;
  title: { en: string };
  media?: Array<{ url: string; alt?: string }>;
  buy: {
    price: number;
    currency: string;
    uom: string;
  };
  stock?: {
    onHand: number;
    reserved: number;
  };
}

const categories: OfflineCategory[] = [
  { id: "cat-hvac", slug: "hvac", name: { en: "HVAC & Air Quality" } },
  {
    id: "cat-electrical",
    slug: "electrical",
    name: { en: "Electrical Systems" },
  },
  {
    id: "cat-finishes",
    slug: "finishes",
    name: { en: "Finishes & Interiors" },
  },
  { id: "cat-safety", slug: "safety", name: { en: "Safety & Compliance" } },
];

const baseProducts: OfflineProduct[] = [
  {
    id: "prod-hvac-001",
    slug: "variable-air-volume-box",
    title: { en: "Variable Air Volume Box" },
    buy: { price: 1850, currency: "SAR", uom: "unit" },
    stock: { onHand: 18, reserved: 3 },
  },
  {
    id: "prod-hvac-002",
    slug: "uv-air-sterilizer",
    title: { en: "UV Air Sterilizer Module" },
    buy: { price: 2600, currency: "SAR", uom: "unit" },
    stock: { onHand: 11, reserved: 2 },
  },
  {
    id: "prod-electrical-001",
    slug: "smart-panel-250a",
    title: { en: "Smart Distribution Panel 250A" },
    buy: { price: 7800, currency: "SAR", uom: "panel" },
    stock: { onHand: 6, reserved: 1 },
  },
  {
    id: "prod-electrical-002",
    slug: "evac-lighting-pack",
    title: { en: "Emergency Lighting Pack" },
    buy: { price: 1450, currency: "SAR", uom: "kit" },
    stock: { onHand: 24, reserved: 5 },
  },
  {
    id: "prod-finishes-001",
    slug: "acoustic-panel-kit",
    title: { en: "Acoustic Panel Kit" },
    buy: { price: 980, currency: "SAR", uom: "pack" },
    stock: { onHand: 30, reserved: 4 },
  },
  {
    id: "prod-safety-001",
    slug: "fire-hose-cabinet",
    title: { en: "Stainless Fire Hose Cabinet" },
    buy: { price: 2150, currency: "SAR", uom: "unit" },
    stock: { onHand: 14, reserved: 2 },
  },
];

const featured = baseProducts.slice(0, 4);

const carousels = [
  { category: categories[0], items: baseProducts.slice(0, 3) },
  { category: categories[1], items: baseProducts.slice(2, 4) },
  {
    category: categories[2],
    items: baseProducts.slice(4, 5).concat(baseProducts.slice(0, 1)),
  },
  {
    category: categories[3],
    items: baseProducts.slice(5).concat(baseProducts.slice(3, 4)),
  },
];

export const MARKETPLACE_OFFLINE_DATA = {
  categories,
  featured,
  carousels,
};
