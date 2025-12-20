"use client";

import { useAutoTranslator } from "@/i18n/useAutoTranslator";

/**
 * Candidate row type for the table view
 */
export type CandidateRow = {
  id: string;
  name?: string;
  email?: string;
  jobTitle?: string;
  stage?: string;
  experience?: number;
};

type AtsCandidatesTabProps = {
  candidateRows: CandidateRow[];
};

/**
 * ATS Candidates Tab Content Component
 * Extracted from recruitment page for maintainability
 */
export function AtsCandidatesTab({ candidateRows }: AtsCandidatesTabProps) {
  const auto = useAutoTranslator("ats");

  if (candidateRows.length === 0) {
    return (
      <div className="bg-card border rounded-lg p-8 text-center">
        <div className="text-6xl mb-4">👥</div>
        <h2 className="text-xl font-semibold mb-2">
          {auto("No Candidates Yet", "candidates.emptyTitle")}
        </h2>
        <p className="text-muted-foreground">
          {auto(
            "New applicants will appear here for quick review.",
            "candidates.emptySubtitle"
          )}
        </p>
      </div>
    );
  }

  return (
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
              Experience
            </th>
            <th className="px-4 py-3 text-start text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border bg-background">
          {candidateRows.map((candidate) => (
            <tr key={candidate.id}>
              <td className="px-4 py-3">
                <div className="font-medium">{candidate.name || "Candidate"}</div>
                <div className="text-sm text-muted-foreground">
                  {candidate.email}
                </div>
              </td>
              <td className="px-4 py-3 text-sm">{candidate.jobTitle || "—"}</td>
              <td className="px-4 py-3">
                <span className="px-2 py-1 text-xs rounded-full bg-accent">
                  {candidate.stage}
                </span>
              </td>
              <td className="px-4 py-3 text-sm">
                {candidate.experience ? `${candidate.experience} yrs` : "—"}
              </td>
              <td className="px-4 py-3 text-sm">
                <div className="flex gap-2">
                  <button className="px-3 py-1 border rounded-md text-xs">
                    {auto("Profile", "candidates.actions.profile")}
                  </button>
                  <button className="px-3 py-1 border rounded-md text-xs">
                    {auto("Notes", "candidates.actions.notes")}
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
