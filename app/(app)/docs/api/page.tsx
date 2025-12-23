"use client";

import dynamic from "next/dynamic";
import { Config } from "@/lib/config/constants";

const SwaggerUI = dynamic(() => import("swagger-ui-react"), { ssr: false });
import "swagger-ui-react/swagger-ui.css";

const swaggerEnabled = Config.client.swaggerUiEnabled;

export default function ApiDocsPage() {
  if (!swaggerEnabled) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center px-6">
        <div className="max-w-xl space-y-4 text-center">
          <p className="text-xs uppercase tracking-[0.25em] text-emerald-300">
            API Docs
          </p>
          <h1 className="text-3xl font-semibold">Swagger UI is disabled</h1>
          <p className="text-slate-300">
            Set <code className="text-emerald-200">NEXT_PUBLIC_SWAGGER_UI_ENABLED=true</code>{" "}
            (or <code className="text-emerald-200">SWAGGER_UI_ENABLED=true</code> on the server)
            to enable the interactive OpenAPI explorer.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50">
      <div className="max-w-6xl mx-auto py-10 px-4 space-y-6">
        <div className="space-y-2">
          <p className="text-xs uppercase tracking-[0.25em] text-emerald-300">
            API Docs
          </p>
          <h1 className="text-3xl font-semibold">Fixzit Interactive API</h1>
          <p className="text-sm text-slate-300">
            OpenAPI-driven documentation with Try It Now requests against the{" "}
            <code className="text-emerald-200">/api/docs/openapi</code> schema.
          </p>
        </div>

        <div className="rounded-2xl bg-white shadow-2xl overflow-hidden border border-slate-200">
          <SwaggerUI
            url="/api/docs/openapi"
            docExpansion="list"
            defaultModelsExpandDepth={-1}
            layout="BaseLayout"
          />
        </div>
      </div>
    </div>
  );
}
