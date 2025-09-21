import "./globals.css";
import { Noto_Sans } from "next/font/google";
import { ThemeProvider } from "next-themes";
import { SUPPORTED_LOCALES, isRTL, messages } from "@/lib/i18n";
import { Sidebar } from "@/components/Sidebar";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";

const noto = Noto_Sans({ subsets: ["latin"], variable: "--font-sans" });

export const metadata = { title: process.env.NEXT_PUBLIC_BRAND_NAME || "Fixzit" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  // Simple cookie-less locale detect (default env); you can wire real i18n routing later
  const locale = (process.env.NEXT_PUBLIC_DEFAULT_LOCALE as "en"|"ar") || "en";
  const dir = isRTL(locale) ? "rtl" : "ltr";

  return (
    <html lang={locale} dir={dir} className={noto.variable}>
      <body className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 text-slate-900">
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
          <div className="grid grid-cols-[280px_1fr] min-h-screen">
            <Sidebar locale={locale} />
            <div className="flex flex-col">
              <Header locale={locale} />
              <main className="p-4 md:p-6">{children}</main>
              <Footer locale={locale} />
            </div>
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}
