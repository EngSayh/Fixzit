/**
 * Superadmin Index Page
 * Redirects to login or issues based on session
 * 
 * @module app/superadmin/page
 */

import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { SUPERADMIN_COOKIE_NAME } from "@/lib/superadmin/auth";

export default async function SuperadminIndexPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SUPERADMIN_COOKIE_NAME);
  
  if (token) {
    redirect("/superadmin/issues");
  } else {
    redirect("/superadmin/login");
  }
}
