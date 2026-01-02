"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import ClaimReviewPanel from "@/components/admin/claims/ClaimReviewPanel";
import { Shield, ShieldAlert, Loader2 } from "@/components/ui/icons";
import { useI18n } from "@/i18n/useI18n";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useEffect } from "react";

// Roles allowed to access admin claims
const ADMIN_ROLES = ["SUPER_ADMIN", "CORPORATE_ADMIN", "ADMIN", "SUPPORT"];

export default function AdminClaimsPage() {
  const { t, isRTL } = useI18n();
  const { data: session, status } = useSession();
  const router = useRouter();

  // RBAC Check: Only allow admin roles
  const userRole = session?.user?.role as string | undefined;
  const hasAccess = userRole && ADMIN_ROLES.includes(userRole);

  // Redirect if not authenticated
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login?callbackUrl=/admin/claims");
    }
  }, [status, router]);

  // Show loading while checking session
  if (status === "loading") {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Show access denied if no permission
  if (status === "authenticated" && !hasAccess) {
    return (
      <div className="container max-w-2xl py-16 px-4">
        <Card className="border-destructive/50">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
              <ShieldAlert className="h-6 w-6 text-destructive" />
            </div>
            <CardTitle className="text-xl">
              {isRTL ? "الوصول مرفوض" : "Access Denied"}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center text-muted-foreground">
            <p className="mb-4">
              {isRTL
                ? "ليس لديك صلاحية للوصول إلى مراجعة المطالبات. هذه الصفحة مخصصة للمسؤولين فقط."
                : "You do not have permission to access Claim Reviews. This page is restricted to Admin users only."}
            </p>
            <Button variant="outline" onClick={() => router.push("/dashboard")} aria-label={isRTL ? "العودة للوحة التحكم" : "Navigate back to dashboard"}>
              {isRTL ? "العودة للوحة التحكم" : "Back to Dashboard"}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Shield className="w-8 h-8" />
        <div>
          <h1 className="text-3xl font-bold">
            {t("marketplace.claims.admin.title")}
          </h1>
          <p className="text-muted-foreground">
            {t("marketplace.claims.admin.subtitle")}
          </p>
        </div>
      </div>

      {/* Review Panel */}
      <ClaimReviewPanel />
    </div>
  );
}
