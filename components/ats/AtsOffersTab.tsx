"use client";

import { useAutoTranslator } from "@/i18n/useAutoTranslator";

/**
 * Offer application row type
 */
export type OfferRow = {
  _id: string;
  stage?: string;
  candidateId?: {
    firstName?: string;
    lastName?: string;
    email?: string;
  };
  jobId?: { title?: string };
};

type AtsOffersTabProps = {
  offerRows: OfferRow[];
};

/**
 * ATS Offers Tab Content Component
 * Extracted from recruitment page for maintainability
 */
export function AtsOffersTab({ offerRows }: AtsOffersTabProps) {
  const auto = useAutoTranslator("ats");

  if (offerRows.length === 0) {
    return (
      <div className="bg-card border rounded-lg p-8 text-center">
        <div className="text-6xl mb-4">📄</div>
        <h2 className="text-xl font-semibold mb-2">
          {auto("No Offers Yet", "offers.emptyTitle")}
        </h2>
        <p className="text-muted-foreground">
          {auto(
            "Candidates moved to the offer stage will show up here.",
            "offers.emptySubtitle"
          )}
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="overflow-x-auto border rounded-xl">
        <table className="min-w-full divide-y divide-border">
          <thead className="bg-muted/60">
            <tr>
              <th className="px-4 py-3 text-start text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Candidate
              </th>
              <th className="px-4 py-3 text-start text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Role
              </th>
              <th className="px-4 py-3 text-start text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Stage
              </th>
              <th className="px-4 py-3 text-start text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                PDF
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border bg-background">
            {offerRows.map((app) => (
              <tr key={app._id}>
                <td className="px-4 py-3">
                  <div className="font-medium">
                    {`${app.candidateId?.firstName || ""} ${app.candidateId?.lastName || ""}`.trim()}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {app.candidateId?.email}
                  </div>
                </td>
                <td className="px-4 py-3 text-sm">{app.jobId?.title || "—"}</td>
                <td className="px-4 py-3 text-sm">
                  <span className="px-2 py-1 text-xs rounded-full bg-accent">
                    {app.stage}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm">
                  <a
                    className="px-3 py-1 border rounded-md text-xs hover:bg-muted transition-colors"
                    href={`/api/ats/offers/${app._id}/pdf`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Download
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-muted-foreground">
        Offer PDFs are generated on demand using our in-house pdfkit templating
        so Finance and HR stay aligned.
      </p>
    </>
  );
}
