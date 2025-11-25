#!/usr/bin/env tsx
import fs from "fs";

const snap = "configs/sidebar.snapshot.json";
if (!fs.existsSync(snap)) {
  const baseline = [
    "dashboard",
    "work-orders",
    "properties",
    "finance",
    "hr",
    "administration",
    "crm",
    "marketplace",
    "support",
    "compliance-legal",
    "reports-analytics",
    "system-management",
  ];
  fs.writeFileSync(snap, JSON.stringify(baseline, null, 2));
  console.log("✓ Created sidebar snapshot");
} else {
  console.log("✓ Sidebar snapshot exists");
}
