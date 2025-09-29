import SouqNav from "@/src/components/SouqNav";
export default function SouqLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-7xl px-4 lg:px-6 py-6 flex gap-6">
      <aside className="w-64 shrink-0"><SouqNav /></aside>
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  );
}

