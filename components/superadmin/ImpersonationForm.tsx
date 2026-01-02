/**
 * Superadmin Impersonation Form Component
 * Allows superadmin to select organization and set impersonation cookie
 */

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Search } from "@/components/ui/icons";

interface ImpersonationFormProps {
  nextUrl: string;
}

export function ImpersonationForm({ nextUrl }: ImpersonationFormProps) {
  const router = useRouter();
  const [orgId, setOrgId] = useState("");
  const [orgName, setOrgName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<Array<{ id: string; name: string }>>([]);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async () => {
    if (!orgName.trim()) {
      setError("Please enter an organization name to search");
      return;
    }

    setIsSearching(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/superadmin/organizations/search?q=${encodeURIComponent(orgName)}`
      );

      if (!response.ok) {
        throw new Error("Failed to search organizations");
      }

      const data = await response.json();
      setSearchResults(data.organizations || []);

      if (data.organizations?.length === 0) {
        setError("No organizations found matching your search");
      }
    } catch (_err) {
      setError("Failed to search organizations. Please try again.");
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectOrg = (selectedOrgId: string, selectedOrgName: string) => {
    setOrgId(selectedOrgId);
    setOrgName(selectedOrgName);
    setSearchResults([]);
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!orgId.trim()) {
      setError("Please select or enter an organization ID");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Set impersonation cookie via API
      const response = await fetch("/api/superadmin/impersonate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orgId: orgId.trim() }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to set impersonation context");
      }

      // Cookie is set, redirect to next URL
      router.push(nextUrl);
      router.refresh();
    } catch (_err) {
      setError(_err instanceof Error ? _err.message : "Failed to impersonate organization");
      setIsLoading(false);
    }
  };

  const handleClearImpersonation = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/superadmin/impersonate", {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to clear impersonation context");
      }

      setOrgId("");
      setOrgName("");
      setSearchResults([]);
      router.push("/superadmin/issues");
      router.refresh();
    } catch (_err) {
      setError("Failed to clear impersonation. Please try again.");
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Search by Organization Name */}
      <div>
        <Label htmlFor="orgName" className="text-sm font-medium text-gray-700 dark:text-gray-300">
          Search Organization
        </Label>
        <div className="mt-2 flex gap-2">
          <Input
            id="orgName"
            type="text"
            placeholder="Enter organization name..."
            value={orgName}
            onChange={(e) => setOrgName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleSearch())}
            disabled={isLoading || isSearching}
            className="flex-1"
          />
          <Button
            type="button"
            variant="outline"
            onClick={handleSearch}
            disabled={isLoading || isSearching || !orgName.trim()}
            aria-label="Search organizations"
          >
            {isSearching ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Search className="w-4 h-4" />
            )}
          </Button>
        </div>
      </div>

      {/* Search Results */}
      {searchResults.length > 0 && (
        <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 max-h-60 overflow-y-auto">
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
            Search Results ({searchResults.length})
          </p>
          <div className="space-y-2">
            {searchResults.map((org) => (
              <button
                key={org.id}
                type="button"
                onClick={() => handleSelectOrg(org.id, org.name)}
                aria-label={`Select organization ${org.name}`}
                className="w-full text-start px-3 py-2 rounded-lg bg-white dark:bg-gray-800 hover:bg-blue-50 dark:hover:bg-blue-900/20 border border-gray-200 dark:border-gray-700 transition-colors"
              >
                <div className="font-medium text-gray-900 dark:text-white">{org.name}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">ID: {org.id}</div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Manual Organization ID Entry */}
      <div>
        <Label htmlFor="orgId" className="text-sm font-medium text-gray-700 dark:text-gray-300">
          Organization ID
        </Label>
        <Input
          id="orgId"
          type="text"
          placeholder="org_abc123... (or select from search results)"
          value={orgId}
          onChange={(e) => setOrgId(e.target.value)}
          disabled={isLoading}
          required
          className="mt-2"
        />
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
          Enter the organization ID directly or search above
        </p>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
          <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-3 pt-4">
        <Button
          type="submit"
          disabled={isLoading || !orgId.trim()}
          className="flex-1"
          aria-label="Set impersonation context for selected organization"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 me-2 animate-spin" />
              Setting Context...
            </>
          ) : (
            "Set Impersonation Context"
          )}
        </Button>

        <Button
          type="button"
          variant="outline"
          onClick={handleClearImpersonation}
          disabled={isLoading}
          aria-label="Clear impersonation context"
        >
          Clear Context
        </Button>
      </div>

      <p className="text-xs text-center text-gray-500 dark:text-gray-400">
        Your impersonation actions will be logged for security audit purposes
      </p>
    </form>
  );
}
