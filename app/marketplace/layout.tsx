import { ReactNode } from "react";
import { cookies } from "next/headers";

export default async function MarketplaceLayout({
  children,
}: {
  children: ReactNode;
}) {
  const cookieStore = await cookies();
  const lang = (cookieStore.get("lang")?.value || "en").toLowerCase();
  const isRTL = lang === "ar";
  return <div dir={isRTL ? "rtl" : "ltr"}>{children}</div>;
}
