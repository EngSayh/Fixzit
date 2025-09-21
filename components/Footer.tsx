export function Footer({ locale }: { locale:"en"|"ar" }) {
  return (
    <footer className="mt-auto border-t bg-white/60 backdrop-blur">
      <div className="px-4 py-3 text-sm text-slate-500 flex justify-between">
        <span>{new Date().getFullYear()} © {process.env.NEXT_PUBLIC_BRAND_NAME}</span>
        <nav className="flex gap-4">
          <a href="/legal/terms" className="hover:underline">Terms</a>
          <a href="/legal/privacy" className="hover:underline">Privacy</a>
          <a href="/support" className="hover:underline">Support</a>
        </nav>
      </div>
    </footer>
  );
}
