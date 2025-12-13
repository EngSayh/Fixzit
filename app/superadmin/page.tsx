/**
 * Superadmin Index Page
 * Redirects to login or issues based on session
 * 
 * @module app/superadmin/page
 */

import { redirect } from "next/navigation";
import { cookies } from "next/headers";

export default async function SuperadminIndexPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get("superadmin_token");
  
  if (token) {
    redirect("/superadmin/issues");
  } else {
    redirect("/superadmin/login");
  }
}
