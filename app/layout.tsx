import type { Metadata } from 'next';
import './globals.css';
import ConditionalProviders from '@/providers/ConditionalProviders';
import { Toaster } from 'sonner';
import { Inter, Noto_Sans_Arabic } from 'next/font/google';

export const metadata: Metadata = {
  title: 'Fixzit – Brown Theme Shell',
  description: 'Fixzit FM + Marketplaces using a brown Apple-inspired theme.',
};

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

const notoSansArabic = Noto_Sans_Arabic({
  subsets: ['arabic'],
  weight: ['400', '500', '700'],
  display: 'swap',
  variable: '--font-noto-sans-arabic',
});

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`min-h-screen bg-background text-foreground ${inter.variable} ${notoSansArabic.variable}`}>
        <div className="min-h-screen flex flex-col">
          <Topbar />
          <div className="flex flex-1 min-h-[calc(100vh-4rem)]">
            <Sidebar />
            <main className="flex-1 bg-[hsl(var(--section-bg))]">
              <ConditionalProviders>
                <>
                  {children}
                  <Toaster
                    position="top-right"
                    richColors
                    closeButton
                    duration={4000}
                  />
                </>
              </ConditionalProviders>
            </main>
          </div>
          <Footer />
        </div>
      </body>
    </html>
  );
}

/* For simplicity, define shell components inline. */

function Topbar() {
  return (
    <header className="fxz-topbar">
      <div className="max-w-7xl mx-auto h-16 px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="fxz-topbar-logo h-9 w-9 rounded-2xl flex items-center justify-center text-xs font-semibold">
            Fx
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-semibold tracking-tight">Fixzit Enterprise</span>
            <span className="text-[11px] text-muted-foreground">FM &amp; Marketplaces · Brown shell</span>
          </div>
        </div>

        <nav className="hidden md:flex items-center gap-4 text-xs text-muted-foreground">
          <a href="#modules" className="hover:text-foreground">Dashboard</a>
          <a href="#modules" className="hover:text-foreground">Work Orders</a>
          <a href="#modules" className="hover:text-foreground">Properties</a>
          <a href="#modules" className="hover:text-foreground">Finance</a>
          <a href="#modules" className="hover:text-foreground">Souq</a>
        </nav>

        <div className="flex items-center gap-3">
          <button className="fxz-topbar-pill px-3 py-1 flex items-center gap-2 text-xs">
            <span>🇸🇦</span>
            <span>AR</span>
            <span className="text-[9px] text-muted-foreground">▼</span>
          </button>
          <div className="w-px h-6 bg-border" />
          <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-[11px] text-muted-foreground">
            SA
          </div>
        </div>
      </div>
    </header>
  );
}

function Sidebar() {
  return (
    <aside className="fxz-sidebar hidden md:flex w-64 flex-col">
      <div className="px-4 pt-4 pb-2">
        <div className="fxz-sidebar-title">Core</div>
      </div>
      <nav className="px-2 space-y-1">
        <a href="#dashboard" className="fxz-sidebar-item fxz-sidebar-item-active">
          <span>🏠</span>
          <span>Dashboard</span>
        </a>
        <a href="#workorders" className="fxz-sidebar-item">
          <span>🛠️</span>
          <span>Work Orders</span>
        </a>
        <a href="#properties" className="fxz-sidebar-item">
          <span>🏢</span>
          <span>Properties</span>
        </a>
        <a href="#finance" className="fxz-sidebar-item">
          <span>💰</span>
          <span>Finance</span>
        </a>
        <a href="#hr" className="fxz-sidebar-item">
          <span>👥</span>
          <span>HR</span>
        </a>
      </nav>

      <div className="px-4 pt-6 pb-2">
        <div className="fxz-sidebar-title">Business</div>
      </div>
      <nav className="px-2 space-y-1">
        <a href="#crm" className="fxz-sidebar-item">
          <span>📞</span>
          <span>CRM</span>
        </a>
        <a href="#souq" className="fxz-sidebar-item">
          <span>🛒</span>
          <span>Fixzit Souq</span>
        </a>
        <a href="#support" className="fxz-sidebar-item">
          <span>🎧</span>
          <span>Support</span>
        </a>
        <a href="#reports" className="fxz-sidebar-item">
          <span>📊</span>
          <span>Reports</span>
        </a>
      </nav>

      <div className="px-4 pt-6 pb-2">
        <div className="fxz-sidebar-title">System</div>
      </div>
      <nav className="px-2 space-y-1 mb-4">
        <a href="#system" className="fxz-sidebar-item">
          <span>⚙️</span>
          <span>System Mgmt.</span>
        </a>
      </nav>
    </aside>
  );
}

function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="fxz-footer">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 text-xs flex flex-col sm:flex-row items-center justify-between gap-2">
        <span>© {year} Fixzit Enterprise — Brown Theme</span>
        <div className="flex items-center gap-4">
          <button className="hover:text-foreground">Privacy</button>
          <button className="hover:text-foreground">Terms</button>
          <button className="hover:text-foreground">Support</button>
        </div>
      </div>
    </footer>
  );
}
