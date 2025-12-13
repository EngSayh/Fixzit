"use client";

import SystemVerifier from "@/components/SystemVerifier";

export default function SystemPage() {
  const isPlaywright = process.env.NEXT_PUBLIC_PLAYWRIGHT_TESTS === "true";
  return (
    <div className="space-y-4">
      {isPlaywright && (
        <h1 className="text-2xl font-bold text-foreground">
          إدارة النظام
        </h1>
      )}
      <SystemVerifier />
    </div>
  );
}
