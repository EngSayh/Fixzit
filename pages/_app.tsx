/**
 * Minimal _app.tsx - Required companion for _document.tsx
 *
 * This file ensures proper Next.js pages directory initialization.
 * The actual application uses App Router (/app directory).
 *
 * @module pages/_app
 */
import type { AppProps } from "next/app";

export default function App({ Component, pageProps }: AppProps) {
  return <Component {...pageProps} />;
}
