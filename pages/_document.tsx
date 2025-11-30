/**
 * Custom _document.tsx - Required for Next.js 15 build compatibility
 *
 * This file is required to prevent the "Cannot find module for page: /_document"
 * error during production builds in Next.js 15, even when using pure App Router.
 *
 * @see https://github.com/vercel/next.js/issues/58684
 * @module pages/_document
 */
import { Html, Head, Main, NextScript } from "next/document";

export default function Document() {
  return (
    <Html>
      <Head />
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
