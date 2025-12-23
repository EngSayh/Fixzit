"use client";

/**
 * Superadmin SSOT Viewer
 * Read-only view of the canonical SSOT file (docs/PENDING_MASTER.md)
 *
 * @module app/superadmin/ssot/page
 * @security Superadmin-only (protected by layout)
 */

import { useState, useEffect, useCallback } from "react";
import { useI18n } from "@/i18n/useI18n";
import {
  FileText,
  RefreshCw,
  Download,
  Search,
  Clock,
  HardDrive,
  ChevronUp,
} from "@/components/ui/icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

interface SSOTData {
  content: string;
  lastModified: string;
  sizeBytes: number;
  fileName: string;
  path: string;
}

export default function SSOTViewerPage() {
  const { t } = useI18n();
  const [ssotData, setSsotData] = useState<SSOTData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [showScrollTop, setShowScrollTop] = useState(false);

  const fetchSSOT = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/superadmin/ssot");
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to fetch SSOT");
      }
      const data = await res.json();
      setSsotData(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      setError(message);
      toast.error("Failed to load SSOT", { description: message });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSSOT();
  }, [fetchSSOT]);

  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 500);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDownload = () => {
    if (!ssotData) return;
    const blob = new Blob([ssotData.content], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = ssotData.fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("Downloaded SSOT file");
  };

  const formatBytes = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const formatDate = (isoDate: string): string => {
    return new Date(isoDate).toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    });
  };

  // Filter content by search term (highlight matches)
  const getFilteredContent = (): string => {
    if (!ssotData?.content) return "";
    if (!searchTerm.trim()) return ssotData.content;
    
    // For display, just return the content
    // Highlighting is done via CSS
    return ssotData.content;
  };

  // Count search matches
  const getMatchCount = (): number => {
    if (!ssotData?.content || !searchTerm.trim()) return 0;
    const regex = new RegExp(searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
    const matches = ssotData.content.match(regex);
    return matches?.length ?? 0;
  };

  // Get line count
  const getLineCount = (): number => {
    if (!ssotData?.content) return 0;
    return ssotData.content.split('\n').length;
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <FileText className="h-6 w-6 text-blue-500" />
            {t("superadmin.ssot.title") || "SSOT Viewer"}
          </h1>
          <p className="text-slate-400 mt-1">
            {t("superadmin.ssot.description") || "Read-only view of the canonical PENDING_MASTER.md file"}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchSSOT}
            disabled={loading}
            className="bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700"
          >
            <RefreshCw className={`h-4 w-4 me-2 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleDownload}
            disabled={!ssotData}
            className="bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700"
          >
            <Download className="h-4 w-4 me-2" />
            Download
          </Button>
        </div>
      </div>

      {/* Metadata Cards */}
      {ssotData && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="bg-slate-800/50 border-slate-700">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-slate-400 text-sm">
                <FileText className="h-4 w-4" />
                File
              </div>
              <p className="text-white font-mono text-sm mt-1">{ssotData.path}</p>
            </CardContent>
          </Card>
          <Card className="bg-slate-800/50 border-slate-700">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-slate-400 text-sm">
                <Clock className="h-4 w-4" />
                Last Modified
              </div>
              <p className="text-white text-sm mt-1">{formatDate(ssotData.lastModified)}</p>
            </CardContent>
          </Card>
          <Card className="bg-slate-800/50 border-slate-700">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-slate-400 text-sm">
                <HardDrive className="h-4 w-4" />
                Size
              </div>
              <p className="text-white text-sm mt-1">{formatBytes(ssotData.sizeBytes)}</p>
            </CardContent>
          </Card>
          <Card className="bg-slate-800/50 border-slate-700">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-slate-400 text-sm">
                <FileText className="h-4 w-4" />
                Lines
              </div>
              <p className="text-white text-sm mt-1">{getLineCount().toLocaleString()}</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Search */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            type="text"
            placeholder="Search in SSOT..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="ps-10 bg-slate-800 border-slate-700 text-white placeholder:text-slate-500"
          />
        </div>
        {searchTerm && (
          <Badge variant="secondary" className="bg-blue-500/20 text-blue-400">
            {getMatchCount()} matches
          </Badge>
        )}
      </div>

      {/* Content */}
      <Card className="bg-slate-800/50 border-slate-700">
        <CardHeader className="border-b border-slate-700">
          <CardTitle className="text-white text-lg">PENDING_MASTER.md</CardTitle>
          <CardDescription className="text-slate-400">
            Canonical Single Source of Truth for Fixzit backlog and session logs
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center p-12">
              <RefreshCw className="h-8 w-8 text-blue-500 animate-spin" />
            </div>
          ) : error ? (
            <div className="p-6 text-center">
              <p className="text-red-400">{error}</p>
              <Button
                variant="outline"
                size="sm"
                onClick={fetchSSOT}
                className="mt-4 bg-slate-800 border-slate-700 text-slate-200"
              >
                Retry
              </Button>
            </div>
          ) : (
            <pre className="p-6 overflow-x-auto text-sm text-slate-300 font-mono whitespace-pre-wrap break-words max-h-[70vh] overflow-y-auto">
              {getFilteredContent()}
            </pre>
          )}
        </CardContent>
      </Card>

      {/* Scroll to Top Button */}
      {showScrollTop && (
        <Button
          onClick={scrollToTop}
          className="fixed bottom-6 end-6 rounded-full p-3 bg-blue-600 hover:bg-blue-700 shadow-lg"
          size="icon"
        >
          <ChevronUp className="h-5 w-5" />
        </Button>
      )}
    </div>
  );
}
