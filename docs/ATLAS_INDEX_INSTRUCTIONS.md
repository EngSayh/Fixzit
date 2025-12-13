# MongoDB Atlas Manual Index Creation

If automatic index sync fails, create these indexes manually in MongoDB Atlas.

## Required Indexes

### Collection: `issues`

| Index Name | Fields | Options |
|------------|--------|---------|
| `orgId_1_key_1` | `{ orgId: 1, key: 1 }` | **unique: true** |
| `orgId_1_status_1` | `{ orgId: 1, status: 1 }` | |
| `orgId_1_priority_1` | `{ orgId: 1, priority: 1 }` | |
| `orgId_1_module_1` | `{ orgId: 1, module: 1 }` | |
| `orgId_1_assignedTo_1` | `{ orgId: 1, assignedTo: 1 }` | |
| `orgId_1_sprintReady_1` | `{ orgId: 1, sprintReady: 1 }` | |
| `key_1` | `{ key: 1 }` | |
| `externalId_1` | `{ externalId: 1 }` | **sparse: true** |
| `sourceHash_1` | `{ sourceHash: 1 }` | |

### Collection: `issueevents`

| Index Name | Fields | Options |
|------------|--------|---------|
| `orgId_1_key_1_createdAt_-1` | `{ orgId: 1, key: 1, createdAt: -1 }` | |
| `issueId_1` | `{ issueId: 1 }` | |
| `type_1` | `{ type: 1 }` | |
| `createdAt_-1` | `{ createdAt: -1 }` | |

---

## Step-by-Step Instructions (Atlas UI)

1. **Log in to MongoDB Atlas**: https://cloud.mongodb.com
2. **Select your cluster** → Click "Browse Collections"
3. **Navigate to the collection** (e.g., `issues`)
4. **Click the "Indexes" tab**
5. **Click "Create Index"**
6. **Enter the index definition**:
   ```json
   { "orgId": 1, "key": 1 }
   ```
7. **Set options** (if unique, check "Create unique index")
8. **Click "Create"**
9. **Repeat for all required indexes**

---

## Using MongoDB Shell (mongosh)

```javascript
// Connect to your cluster
// mongosh "mongodb+srv://cluster.mongodb.net/fixzit" --apiVersion 1 --username admin

// Issues collection indexes
db.issues.createIndex({ orgId: 1, key: 1 }, { unique: true, name: "orgId_1_key_1" });
db.issues.createIndex({ orgId: 1, status: 1 }, { name: "orgId_1_status_1" });
db.issues.createIndex({ orgId: 1, priority: 1 }, { name: "orgId_1_priority_1" });
db.issues.createIndex({ orgId: 1, module: 1 }, { name: "orgId_1_module_1" });
db.issues.createIndex({ key: 1 }, { name: "key_1" });
db.issues.createIndex({ externalId: 1 }, { sparse: true, name: "externalId_1" });
db.issues.createIndex({ sourceHash: 1 }, { name: "sourceHash_1" });

// IssueEvents collection indexes
db.issueevents.createIndex({ orgId: 1, key: 1, createdAt: -1 }, { name: "orgId_1_key_1_createdAt_-1" });
db.issueevents.createIndex({ issueId: 1 }, { name: "issueId_1" });
db.issueevents.createIndex({ type: 1 }, { name: "type_1" });
db.issueevents.createIndex({ createdAt: -1 }, { name: "createdAt_-1" });

// Verify
db.issues.getIndexes();
db.issueevents.getIndexes();
```

---

## Automated Sync (Recommended)

Run the sync script with your MongoDB URI:

```bash
MONGODB_URI="mongodb+srv://user:pass@cluster.mongodb.net/fixzit" pnpm tsx scripts/sync-indexes.ts
```

Or add to your CI/CD pipeline as a post-deploy step.
