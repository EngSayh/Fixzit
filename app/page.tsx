'use client';

export default function LandingPage() {
  return (
    <div className="flex flex-col min-h-[calc(100vh-4rem)]">
      <section className="fxz-hero">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 lg:py-14 flex flex-col lg:flex-row items-center gap-10">
          <div className="flex-1 space-y-6">
            <p className="text-xs font-semibold tracking-[0.2em] text-muted-foreground uppercase">
              Facility Management · Marketplaces · Saudi-first
            </p>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-semibold leading-tight text-foreground">
              Operate properties with calm. <br />
              Move money with confidence.
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground max-w-xl">
              A brown, calm Fixzit shell: unified Work Orders, Properties, Finance,
              HR and Souq in a single, Apple-inspired interface built for Saudi FM teams.
            </p>
            <div className="flex flex-wrap gap-3">
              <button className="fxz-btn-primary px-4 py-2 text-sm font-medium">
                Get started with Fixzit
              </button>
              <button className="fxz-btn-outline px-4 py-2 text-sm font-medium">
                Book a live demo
              </button>
            </div>
          </div>

          <div className="flex-1 w-full">
            <div className="fxz-card p-4 sm:p-5">
              <div className="flex justify-between items-center mb-4">
                <div className="space-y-1">
                  <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                    Today · Portfolio overview
                  </p>
                  <p className="font-semibold text-sm">
                    124 active work orders · 18 overdue
                  </p>
                </div>
                <span className="px-2 py-1 rounded-full text-[11px] bg-secondary text-secondary-foreground">
                  FM Command
                </span>
              </div>
              <div className="grid grid-cols-3 gap-3 mb-4">
                <div className="p-3 rounded-xl border border-border bg-card">
                  <p className="text-[11px] text-muted-foreground">Work Orders</p>
                  <p className="text-lg font-semibold">124</p>
                  <p className="text-[11px] text-muted-foreground">18 overdue</p>
                </div>
                <div className="p-3 rounded-xl border border-border bg-card">
                  <p className="text-[11px] text-muted-foreground">Properties</p>
                  <p className="text-lg font-semibold">32</p>
                  <p className="text-[11px] text-muted-foreground">91% occupied</p>
                </div>
                <div className="p-3 rounded-xl border border-border bg-card">
                  <p className="text-[11px] text-muted-foreground">Invoices</p>
                  <p className="text-lg font-semibold">SAR 1.4M</p>
                  <p className="text-[11px] text-muted-foreground">this month</p>
                </div>
              </div>
              <div className="mt-2 grid grid-cols-3 gap-2 text-[11px] text-muted-foreground">
                <div className="h-16 rounded-xl bg-muted" />
                <div className="h-16 rounded-xl bg-muted" />
                <div className="h-16 rounded-xl bg-muted" />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="modules" className="py-10 bg-[hsl(var(--section-alt))] flex-1">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
          <div>
            <h2 className="text-xl sm:text-2xl font-semibold mb-1">
              Everything your FM operation needs — connected
            </h2>
            <p className="text-sm text-muted-foreground">
              Brown, calm and structured: one shell for Work Orders, Properties, Finance, HR and Souq.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="fxz-card p-4">
              <h3 className="font-semibold mb-1">Work Orders</h3>
              <p className="text-sm text-muted-foreground">
                Blue logic, brown theme: new, in progress, completed, overdue with SLA timers and photos.
              </p>
            </div>
            <div className="fxz-card p-4">
              <h3 className="font-semibold mb-1">Properties</h3>
              <p className="text-sm text-muted-foreground">
                Units, assets, leases, owners and tenants with health status per property.
              </p>
            </div>
            <div className="fxz-card p-4">
              <h3 className="font-semibold mb-1">Finance</h3>
              <p className="text-sm text-muted-foreground">
                Invoices, receipts, expenses and ZATCA-ready billing aligned with Fixzit finance flows.
              </p>
            </div>
            <div className="fxz-card p-4">
              <h3 className="font-semibold mb-1">HR</h3>
              <p className="text-sm text-muted-foreground">
                Technicians, supervisors, shifts and skills matrix with clean status chips.
              </p>
            </div>
            <div className="fxz-card p-4">
              <h3 className="font-semibold mb-1">CRM &amp; Support</h3>
              <p className="text-sm text-muted-foreground">
                Tickets, SLAs and CSAT in a unified shell, ready for channels and bots.
              </p>
            </div>
            <div className="fxz-card p-4">
              <h3 className="font-semibold mb-1">Fixzit Souq</h3>
              <p className="text-sm text-muted-foreground">
                Vendor onboarding, catalogs and orders using your existing Souq logic in a calmer UI.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
