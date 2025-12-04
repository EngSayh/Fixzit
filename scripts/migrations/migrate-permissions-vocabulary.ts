/**
 * Migration: normalize permission vocabulary to canonical "module:action" format.
 *
 * - Converts legacy dot-separated permissions (e.g., "workorders.read") to "workorders:read".
 * - Preserves module wildcards ("module:*") and global wildcard ("*").
 * - Updates Permission documents (key/module/action), Role.permissions arrays,
 *   and User.security.permissions arrays where present.
 *
 * Usage:
 *   MONGODB_URI="mongodb+srv://..." pnpm tsx scripts/migrations/migrate-permissions-vocabulary.ts
 */

import dotenv from "dotenv";
import { getDatabase, disconnectFromDatabase } from "../../lib/mongodb-unified";
import { COLLECTIONS } from "../../lib/db/collections";

dotenv.config({ path: ".env.local" });
dotenv.config();

// Generic helper to normalize a permission string
const normalizePermission = (perm: string): string => {
  if (!perm) return perm;
  if (perm === "*") return "*";
  // Already canonical
  if (perm.includes(":")) return perm;
  // Convert "module.*" → "module:*" and "module.action" → "module:action"
  const parts = perm.split(".");
  if (parts.length >= 2) {
    const [module, ...rest] = parts;
    const action = rest.join(".");
    return `${module}:${action}`;
  }
  return perm;
};

// Update array fields in-place
const normalizePermissionArray = (arr: unknown): string[] | undefined => {
  if (!Array.isArray(arr)) return undefined;
  return arr.map((p) => normalizePermission(String(p)));
};

async function main() {
  console.log("🔌 Connecting to MongoDB (unified connector)...");
  const db = await getDatabase();
  console.log("✅ Connected");

  // 1) Update Permission documents (key/module/action)
  const permissionColl = db.collection(COLLECTIONS.PERMISSIONS);
  const perms = await permissionColl.find({}).toArray();
  for (const perm of perms) {
    const normalizedKey = normalizePermission(String(perm.key));
    if (normalizedKey !== perm.key) {
      const [module, action] = normalizedKey.split(":");
      await permissionColl.updateOne(
        { _id: perm._id },
        {
          $set: {
            key: normalizedKey,
            module,
            action,
          },
        },
      );
      console.log(`▶️ Permission key updated: ${perm.key} -> ${normalizedKey}`);
    }
  }

  // 2) Update Role.permissions arrays
  const roleColl = db.collection(COLLECTIONS.ROLES);
  const roles = await roleColl.find({ permissions: { $exists: true } }).toArray();
  for (const role of roles) {
    const updated = normalizePermissionArray(role.permissions);
    if (updated && JSON.stringify(updated) !== JSON.stringify(role.permissions)) {
      await roleColl.updateOne(
        { _id: role._id },
        { $set: { permissions: updated } },
      );
      console.log(`▶️ Role permissions updated: ${role.slug || role._id}`);
    }
  }

  // 3) Update User.security.permissions arrays
  const userColl = db.collection(COLLECTIONS.USERS);
  const cursor = userColl.find({ "security.permissions": { $exists: true } });
  // Iterate in batches to avoid loading all docs at once
  while (await cursor.hasNext()) {
    const user = await cursor.next();
    if (!user) break;
    const updated = normalizePermissionArray(user.security?.permissions);
    if (updated && JSON.stringify(updated) !== JSON.stringify(user.security.permissions)) {
      await userColl.updateOne(
        { _id: user._id },
        { $set: { "security.permissions": updated } },
      );
      console.log(`▶️ User permissions updated: ${user.email || user._id}`);
    }
  }

  console.log("✅ Migration complete");
  await disconnectFromDatabase();
  process.exit(0);
}

main().catch((err) => {
  console.error("❌ Migration failed:", err);
  void disconnectFromDatabase();
  process.exit(1);
});
