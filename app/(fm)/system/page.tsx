"use client";

import SystemVerifier from "@/components/SystemVerifier";
import { Config } from "@/lib/config/constants";

export default function SystemPage() {
  const isPlaywright = Config.client.isPlaywrightTest;
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
