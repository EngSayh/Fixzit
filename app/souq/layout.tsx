import { ReactNode } from 'react';

/**
 * Minimal layout that renders its children directly.
 *
 * This layout intentionally does not include header or sidebar UI — those are mounted once in app/layout.tsx to avoid duplication.
 *
 * @param children - The page or component content to render inside this layout.
 */
export default function SouqLayout({ children }: { children: React.ReactNode }) {
	// تجنب أي تكرار للترويسة/الشريط الجانبي — يتم تركيبهما مرة واحدة عبر app/layout.tsx
	return <>{children}</>;
}

