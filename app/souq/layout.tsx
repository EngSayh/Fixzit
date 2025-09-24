import { ReactNode } from 'react';

export default function SouqLayout({ children }: { children: React.ReactNode }) {
	// تجنب أي تكرار للترويسة/الشريط الجانبي — يتم تركيبهما مرة واحدة عبر app/layout.tsx
	return <>{children}</>;
}

