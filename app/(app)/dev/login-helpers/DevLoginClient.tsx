"use client";

import { useEffect, useState } from "react";
import { logger } from "@/lib/logger";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowRight,
  Shield,
  User,
  Building2,
  Users,
  Copy,
  Check,
} from "lucide-react";
import { useTranslation } from "@/contexts/TranslationContext";

type ListedCred = {
  role: string;
  description?: string;
  color?: string;
  icon?: "User" | "Shield" | "Building2" | "Users";
  loginType: "personal" | "corporate";
  email?: string;
  employeeNumber?: string;
};

const IconMap = { User, Shield, Building2, Users } as const;

/**
 * Client component for dev login helpers
 * Fetches sanitized credential list (NO PASSWORDS) from server API
 * Auto-login happens server-side via /api/dev/demo-login
 */
export default function DevLoginClient() {
  const router = useRouter();
  const { t } = useTranslation();
  const [demo, setDemo] = useState<ListedCred[]>([]);
  const [corp, setCorp] = useState<ListedCred[]>([]);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [loading, setLoading] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/dev/demo-accounts", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        setDemo(d.demo ?? []);
        setCorp(d.corporate ?? []);
        if (d.warning) {
          logger.warn(`[Dev Login Helpers] ${d.warning}`);
        }
      })
      .catch((err) => {
        logger.error("[Dev Login Helpers] Failed to load accounts:", err);
      });
  }, []);

  const copy = (text: string, key: string) => {
    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(text);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 2000);
    }
  };

  const autoLogin = async (role: string) => {
    setLoading(role);
    try {
      const res = await fetch("/api/dev/demo-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ role }),
      });

      const data = await res.json().catch(() => ({}));

      if (res.ok && (data.ok ?? true)) {
        router.push("/dashboard");
      } else {
        alert(
          t("devLogin.alert.failure", "Login failed: ") +
            (data.error || res.statusText),
        );
      }
    } catch (error) {
      alert(
        t("devLogin.alert.failure", "Login failed: ") +
          (error instanceof Error
            ? error.message
            : t("devLogin.alert.unknownError", "Unknown error")),
      );
    } finally {
      setLoading(null);
    }
  };

  const Card = (cred: ListedCred, idx: number, offset = 0) => {
    const key = `${cred.role}-${idx + offset}`;
    const Icon = IconMap[cred.icon ?? "User"];
    const id = cred.loginType === "personal" ? cred.email : cred.employeeNumber;
    const label =
      cred.loginType === "personal"
        ? t("devLogin.fields.emailLabel", "Email")
        : t("devLogin.fields.employeeLabel", "Employee #");
    const copyText = `${label}: ${id ?? ""}`;
    const isLoading = loading === cred.role;

    return (
      <div
        key={key}
        className={`${cred.color ?? "border-border"} border rounded-2xl p-6 hover:shadow-xl transition-all`}
        data-testid={`dev-card-${cred.role}`}
      >
        <div className="flex items-start gap-4 mb-4">
          <div className="p-3 bg-white/10 rounded-2xl">
            <Icon size={24} />
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-lg">{cred.role}</h3>
            {cred.description && (
              <p className="text-sm opacity-80">{cred.description}</p>
            )}
          </div>
        </div>

        <div className="bg-black/20 rounded p-3 mb-3 font-mono text-sm">
          <div className="mb-1">
            <span className="opacity-60">{label}:</span> {id ?? "—"}
          </div>
          <div>
            <span className="opacity-60">
              {t("devLogin.fields.passwordLabel", "Password")}:
            </span>{" "}
            <span className="opacity-60">
              {t("devLogin.fields.passwordHidden", "[hidden]")}
            </span>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => autoLogin(cred.role)}
            disabled={isLoading}
            className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-2xl hover:bg-primary/90 transition-colors font-medium flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            data-testid={`dev-autologin-${cred.role}`}
          >
            {isLoading ? (
              <>
                <span className="animate-spin">⏳</span>
                {t("devLogin.buttons.loggingIn", "Logging in...")}
              </>
            ) : (
              <>
                <ArrowRight size={16} />
                {t("devLogin.buttons.autoLogin", "Auto Login")}
              </>
            )}
          </button>
          <button
            onClick={() => copy(copyText, key)}
            className="px-4 py-2 bg-white/10 rounded-2xl hover:bg-white/20 transition-colors"
            title={t("devLogin.buttons.copyIdentifier", "Copy identifier")}
            data-testid={`dev-copy-${cred.role}`}
          >
            {copiedKey === key ? (
              <Check size={16} className="text-success" />
            ) : (
              <Copy size={16} />
            )}
          </button>
        </div>
      </div>
    );
  };

  const isEmpty = demo.length === 0 && corp.length === 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black text-white">
      {/* Header */}
      <div className="border-b border-border bg-black/50 backdrop-blur">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">
              🔧 {t("devLogin.title", "Developer Login Helpers")}
            </h1>
            <p className="text-sm text-muted-foreground">
              {t(
                "devLogin.subtitle",
                "Quick access demo credentials (server-safe)",
              )}
            </p>
          </div>
          <Link
            href="/login"
            className="px-4 py-2 bg-primary text-white rounded-2xl hover:bg-primary/90 transition-colors text-sm font-medium"
            data-testid="back-to-login"
          >
            ← {t("devLogin.buttons.backToLogin", "Back to Login")}
          </Link>
        </div>
      </div>

      {/* Warning Banner */}
      <div className="bg-warning/20 border-y border-warning/50 py-3">
        <div className="max-w-6xl mx-auto px-4">
          <p className="text-warning text-sm flex items-center gap-2">
            <span className="text-xl">⚠️</span>
            <span>
              <strong>
                {t("devLogin.warning.title", "Development Only:")}
              </strong>{" "}
              {t(
                "devLogin.warning.description",
                "Credentials are never sent to the browser. Auto-login happens on the server.",
              )}
            </span>
          </p>
        </div>
      </div>

      {/* Main */}
      <div className="max-w-6xl mx-auto px-4 py-8">
        {isEmpty ? (
          <div className="bg-card/50 border border-border rounded-2xl p-8 text-center">
            <p className="text-muted-foreground mb-4">
              {t("devLogin.empty.noCreds", "No demo credentials found.")}
            </p>
            <p className="text-sm text-muted-foreground">
              {t("devLogin.empty.copyPrefix", "Copy")}{" "}
              <code className="bg-black/30 px-2 py-1 rounded">
                dev/credentials.example.ts
              </code>{" "}
              {t("devLogin.empty.copyMiddle", "to")}{" "}
              <code className="bg-black/30 px-2 py-1 rounded">
                dev/credentials.server.ts
              </code>{" "}
              {t(
                "devLogin.empty.copySuffix",
                "and fill in your test credentials.",
              )}
            </p>
          </div>
        ) : (
          <>
            {/* Personal */}
            {demo.length > 0 && (
              <section className="mb-12">
                <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                  <span className="text-3xl">📧</span>{" "}
                  {t("devLogin.sections.personal", "Personal Email Accounts")}
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {demo.map((c, i) => Card(c, i))}
                </div>
              </section>
            )}

            {/* Corporate */}
            {corp.length > 0 && (
              <section className="mb-12">
                <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                  <span className="text-3xl">🏢</span>{" "}
                  {t("devLogin.sections.corporate", "Corporate Accounts")}
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {corp.map((c, i) => Card(c, i, demo.length))}
                </div>
              </section>
            )}
          </>
        )}

        {/* Instructions */}
        <section className="mt-12 bg-card/50 border border-border rounded-2xl p-6">
          <h3 className="text-xl font-bold mb-4">
            📖 {t("devLogin.instructions.title", "Usage Instructions")}
          </h3>
          <ul className="space-y-2 text-muted-foreground">
            <li className="flex gap-2">
              <span>•</span>
              <span>
                <strong>
                  {t("devLogin.instructions.autoLoginTitle", "Auto Login:")}
                </strong>{" "}
                {t(
                  "devLogin.instructions.autoLoginDesc",
                  "Happens server-side; browser never sees passwords.",
                )}
              </span>
            </li>
            <li className="flex gap-2">
              <span>•</span>
              <span>
                <strong>{t("devLogin.instructions.copyTitle", "Copy:")}</strong>{" "}
                {t(
                  "devLogin.instructions.copyDesc",
                  "Copies identifier (email / employee #) only.",
                )}
              </span>
            </li>
            <li className="flex gap-2">
              <span>•</span>
              <span>
                <strong>
                  {t("devLogin.instructions.accessTitle", "Access:")}
                </strong>{" "}
                {t(
                  "devLogin.instructions.accessDesc",
                  "This page is only visible in non-production environments.",
                )}
              </span>
            </li>
            <li className="flex gap-2">
              <span>•</span>
              <span>
                <strong>
                  {t("devLogin.instructions.securityTitle", "Security:")}
                </strong>{" "}
                {t(
                  "devLogin.instructions.securityDesc",
                  "Passwords never reach the client bundle. Login endpoint validates credentials server-side.",
                )}
              </span>
            </li>
          </ul>
        </section>
      </div>
    </div>
  );
}
