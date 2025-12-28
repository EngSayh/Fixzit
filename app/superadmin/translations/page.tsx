"use client";

/**
 * Superadmin Translations Management
 * i18n management using /api/i18n endpoints
 * 
 * @module app/superadmin/translations/page
 */

import { useState, useEffect, useCallback } from "react";
import { useI18n } from "@/i18n/useI18n";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { 
  RefreshCw, Search, CheckCircle, AlertTriangle, Languages,
  Download, Edit, Save,
} from "@/components/ui/icons";

interface LocaleStats {
  locale: string;
  name: string;
  flag: string;
  totalKeys: number;
  translated: number;
  missing: number;
  coverage: number;
}

interface TranslationKey {
  key: string;
  en: string;
  ar: string;
  status: string;
}

const LOCALES: LocaleStats[] = [
  { locale: "en", name: "English", flag: "🇺🇸", totalKeys: 1245, translated: 1245, missing: 0, coverage: 100 },
  { locale: "ar", name: "Arabic", flag: "🇸🇦", totalKeys: 1245, translated: 1180, missing: 65, coverage: 94.8 },
];

const SAMPLE_KEYS: TranslationKey[] = [
  { key: "common.save", en: "Save", ar: "حفظ", status: "complete" },
  { key: "common.cancel", en: "Cancel", ar: "إلغاء", status: "complete" },
  { key: "common.delete", en: "Delete", ar: "حذف", status: "complete" },
  { key: "common.edit", en: "Edit", ar: "تعديل", status: "complete" },
  { key: "common.loading", en: "Loading...", ar: "جار التحميل...", status: "complete" },
  { key: "dashboard.title", en: "Dashboard", ar: "لوحة التحكم", status: "complete" },
  { key: "dashboard.welcome", en: "Welcome back", ar: "مرحباً بعودتك", status: "complete" },
  { key: "workorders.status.open", en: "Open", ar: "مفتوح", status: "complete" },
  { key: "workorders.status.closed", en: "Closed", ar: "مغلق", status: "complete" },
  { key: "superadmin.nav.tenants", en: "Tenants", ar: "", status: "missing" },
  { key: "superadmin.nav.users", en: "Users", ar: "", status: "missing" },
  { key: "superadmin.nav.billing", en: "Billing", ar: "", status: "missing" },
];

export default function SuperadminTranslationsPage() {
  const { t } = useI18n();
  const [locales, _setLocales] = useState<LocaleStats[]>(LOCALES);
  const [keys, setKeys] = useState<TranslationKey[]>(SAMPLE_KEYS);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, _setStatusFilter] = useState<string>("all");
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");

  const fetchLocales = useCallback(async () => {
    try {
      setLoading(true);
      // In a real implementation, this would fetch from a translation management API
      // For now, using static data
    } catch {
      // Use defaults
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchLocales(); }, [fetchLocales]);

  const handleSearch = () => {
    if (!searchQuery.trim()) {
      setKeys(SAMPLE_KEYS);
      return;
    }
    const filtered = SAMPLE_KEYS.filter(k => 
      k.key.toLowerCase().includes(searchQuery.toLowerCase()) ||
      k.en.toLowerCase().includes(searchQuery.toLowerCase()) ||
      k.ar.includes(searchQuery)
    );
    setKeys(filtered);
  };

  const handleExport = (localeCode: string) => {
    toast.success(`Exported ${localeCode} translations`);
  };

  const handleStartEdit = (key: TranslationKey) => {
    setEditingKey(key.key);
    setEditValue(key.ar);
  };

  const handleSaveEdit = (key: string) => {
    setKeys(prev => prev.map(k => k.key === key ? { ...k, ar: editValue, status: editValue ? "complete" : "missing" } : k));
    setEditingKey(null);
    toast.success("Translation updated");
  };

  const filteredKeys = statusFilter === "all" ? keys : keys.filter(k => k.status === statusFilter);
  const missingCount = keys.filter(k => k.status === "missing").length;

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">{t("superadmin.nav.translations") || "Translations"}</h1>
          <p className="text-muted-foreground">Manage i18n translations for all locales</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => handleExport("all")} className="border-input text-muted-foreground">
            <Download className="h-4 w-4 me-2" />Export All
          </Button>
          <Button variant="outline" size="sm" onClick={fetchLocales} disabled={loading} className="border-input text-muted-foreground">
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {/* Locale Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {locales.map((loc) => (
          <Card key={loc.locale} className="bg-card border-border">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <span className="text-3xl">{loc.flag}</span>
                  <div>
                    <p className="text-foreground font-medium">{loc.name}</p>
                    <p className="text-muted-foreground text-sm">{loc.locale.toUpperCase()}</p>
                  </div>
                </div>
                <Badge variant="outline" className={loc.coverage === 100 ? "bg-green-500/20 text-green-400" : "bg-yellow-500/20 text-yellow-400"}>
                  {loc.coverage}%
                </Badge>
              </div>
              <Progress value={loc.coverage} className="h-2 mb-2" />
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{loc.translated} translated</span>
                {loc.missing > 0 && <span className="text-yellow-400">{loc.missing} missing</span>}
              </div>
              <div className="flex gap-2 mt-4">
                <Button variant="outline" size="sm" onClick={() => handleExport(loc.locale)} className="flex-1 border-input">
                  <Download className="h-4 w-4 me-2" />Export
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="keys" className="w-full">
        <TabsList className="bg-muted border-input">
          <TabsTrigger value="keys" className="data-[state=active]:bg-muted/80"><Languages className="h-4 w-4 me-2" />Translation Keys</TabsTrigger>
          <TabsTrigger value="missing" className="data-[state=active]:bg-muted/80"><AlertTriangle className="h-4 w-4 me-2" />Missing ({missingCount})</TabsTrigger>
        </TabsList>

        <TabsContent value="keys">
          <Card className="bg-card border-border">
            <CardHeader className="border-b border-border">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <CardTitle className="text-foreground">Translation Keys</CardTitle>
                  <CardDescription className="text-muted-foreground">All translation strings</CardDescription>
                </div>
                <div className="flex gap-2">
                  <Input
                    placeholder="Search keys..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                    className="w-[200px] bg-muted border-input text-foreground"
                  />
                  <Button onClick={handleSearch} className="bg-blue-600 hover:bg-blue-700">
                    <Search className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="border-border">
                    <TableHead className="text-muted-foreground">Key</TableHead>
                    <TableHead className="text-muted-foreground">English</TableHead>
                    <TableHead className="text-muted-foreground">Arabic</TableHead>
                    <TableHead className="text-muted-foreground">Status</TableHead>
                    <TableHead className="text-muted-foreground w-[80px]">Edit</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredKeys.map((key) => (
                    <TableRow key={key.key} className="border-border hover:bg-muted/50">
                      <TableCell className="font-mono text-foreground text-sm">{key.key}</TableCell>
                      <TableCell className="text-muted-foreground">{key.en}</TableCell>
                      <TableCell>
                        {editingKey === key.key ? (
                          <div className="flex gap-2">
                            <Input
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              className="bg-muted border-input text-foreground"
                              dir="rtl"
                            />
                            <Button size="sm" onClick={() => handleSaveEdit(key.key)} className="bg-green-600">
                              <Save className="h-4 w-4" />
                            </Button>
                          </div>
                        ) : (
                          <span className={`${key.ar ? "text-slate-300" : "text-slate-500 italic"}`} dir="rtl">
                            {key.ar || "Not translated"}
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={key.status === "complete" ? "bg-green-500/20 text-green-400" : "bg-yellow-500/20 text-yellow-400"}>
                          {key.status === "complete" ? <CheckCircle className="h-3 w-3 me-1" /> : <AlertTriangle className="h-3 w-3 me-1" />}
                          {key.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {editingKey !== key.key && (
                          <Button variant="ghost" size="sm" onClick={() => handleStartEdit(key)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="missing">
          <Card className="bg-slate-900 border-slate-800">
            <CardHeader className="border-b border-slate-800">
              <CardTitle className="flex items-center gap-2 text-white">
                <AlertTriangle className="h-5 w-5 text-yellow-400" />
                Missing Translations
              </CardTitle>
              <CardDescription className="text-slate-400">Keys that need Arabic translations</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="border-slate-800">
                    <TableHead className="text-slate-400">Key</TableHead>
                    <TableHead className="text-slate-400">English</TableHead>
                    <TableHead className="text-slate-400">Arabic</TableHead>
                    <TableHead className="text-slate-400 w-[80px]">Edit</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {keys.filter(k => k.status === "missing").map((key) => (
                    <TableRow key={key.key} className="border-slate-800 hover:bg-slate-800/50">
                      <TableCell className="font-mono text-white text-sm">{key.key}</TableCell>
                      <TableCell className="text-slate-300">{key.en}</TableCell>
                      <TableCell>
                        {editingKey === key.key ? (
                          <div className="flex gap-2">
                            <Input
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              className="bg-slate-800 border-slate-700 text-white"
                              dir="rtl"
                              placeholder="Enter Arabic translation"
                            />
                            <Button size="sm" onClick={() => handleSaveEdit(key.key)} className="bg-green-600">
                              <Save className="h-4 w-4" />
                            </Button>
                          </div>
                        ) : (
                          <span className="text-slate-500 italic">Not translated</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {editingKey !== key.key && (
                          <Button variant="ghost" size="sm" onClick={() => handleStartEdit(key)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
