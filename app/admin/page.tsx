"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Admin route canonical redirect
 * Redirects /admin to /administration for consistency
 * See: Stabilization audit - canonicalize admin routes
 */
export default function Page() {
  const router = useRouter();
  
  useEffect(() => {
    router.replace('/administration');
  }, [router]);
  
  return (
    <div className="flex items-center justify-center min-h-screen">
      <p className="text-muted-foreground">Redirecting to administration...</p>
    </div>
  );
}
