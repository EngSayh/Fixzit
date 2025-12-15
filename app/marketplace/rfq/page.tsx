import React from "react";
import { logger } from "@/lib/logger";
import RFQBoard from "@/components/marketplace/RFQBoard";
import { serverFetchJsonWithTenant } from "@/lib/marketplace/serverFetch";
import { getServerI18n } from "@/lib/i18n/server";

export const dynamic = 'force-dynamic';

interface Category {
  slug: string;
  name?: { en?: string };
}

interface RFQ {
  id: string;
  title: string;
  currency: string;
  status: string;
  createdAt: string;
  [key: string]: unknown;
}

export default async function RFQPage() {
  const { t } = await getServerI18n();

  try {
    const [_categoriesResponse, rfqResponse] = await Promise.all([
      serverFetchJsonWithTenant<{ data: Category[] }>(
        "/api/marketplace/categories",
      ),
      serverFetchJsonWithTenant<{ data: RFQ[] }>("/api/marketplace/rfq"),
    ]);

    const _categories = _categoriesResponse.data.map((category) => ({
      slug: category.slug,
      name: category.name?.en ?? category.slug,
    }));

    const rfqs = rfqResponse.data;

    return (
      <div className="min-h-screen bg-muted flex flex-col">
        <main className="mx-auto max-w-7xl px-4 py-8">
          <RFQBoard categories={_categories} initialRfqs={rfqs} />
        </main>
      </div>
    );
  } catch (error) {
    logger.error("Failed to load RFQ page data", { error });
    return (
      <div className="min-h-screen bg-muted flex items-center justify-center">
        <div className="text-center">
          <p className="text-destructive">
            {t(
              "marketplace.rfq.error",
              "Failed to load RFQ data. Please try again later.",
            )}
          </p>
        </div>
      </div>
    );
  }
}
