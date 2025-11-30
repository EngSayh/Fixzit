import { getDatabase as getUnifiedDatabase } from "@/lib/mongodb-unified";

// Thin compatibility wrapper expected by legacy code/tests
export async function getDatabase() {
  return getUnifiedDatabase();
}
