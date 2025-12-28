/**
 * Superadmin Index Page
 * Redirects to login or issues based on VALIDATED session (not just cookie existence)
 * 
 * FIX: Previously only checked if cookie existed, now validates token is valid and not expired
 * 
 * @module app/superadmin/page
 */

import { redirect } from "next/navigation";
import { getSuperadminSessionFromCookies } from "@/lib/superadmin/auth";

export default async function SuperadminIndexPage() {
  // Validate the session token, not just check cookie existence
  const session = await getSuperadminSessionFromCookies();
  
  if (session && session.expiresAt > Date.now()) {
    redirect("/superadmin/issues");
  } else {
    redirect("/superadmin/login");
  }
}
