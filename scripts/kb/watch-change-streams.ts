// MongoDB Change Streams watcher for auto-drafting KB articles
// Run with: ts-node scripts/kb/watch-change-streams.ts
import { MongoClient } from 'mongodb';
import { embedText } from '@/src/ai/embeddings';

const uri = process.env.MONGODB_URI!;
const dbName = process.env.MONGODB_DB || 'fixzit';

async function run() {
  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db(dbName);

  const watchCollections = [
    'work_orders', 'approvals', 'financial_transactions', 'properties', 'users'
  ];

  for (const name of watchCollections) {
    const coll = db.collection(name);
    const cs = coll.watch([], { fullDocument: 'updateLookup' });
    cs.on('change', async (event: any) => {
      try {
        const payload = event.fullDocument || event.updateDescription;
        const orgId = payload?.org_id || payload?.orgId;
        if (!orgId) return;

        // Simple rule example: on quotation approval, draft a "How to approve a quotation" guide
        if (name === 'approvals' && payload?.decision === 'APPROVED') {
          const title = 'How to approve a quotation';
          const contentEN = `## ${title}\n\n1. Open Approvals → Pending\n2. Review quotation & attachments\n3. Click **Approve**\n4. System advances to **In Progress** and posts to Finance.\n\n> Related: SLA timers and escalation rules.`;
          const contentAR = `## كيف توافق على عرض السعر\n\n1. افتح الموافقات → المعلقة\n2. راجع عرض السعر والمرفقات\n3. انقر **موافقة**\n4. يتحول النظام إلى **قيد التنفيذ** ويقيد العملية في المالية.\n\n> متعلق: مؤقتات SLA وقواعد التصعيد.`;

          // Upsert article (en and ar)
          for (const [lang, content] of [['en', contentEN], ['ar', contentAR]] as const) {
            const articles = db.collection('knowledge_articles');

            // First try to update existing article
            const updateResult = await articles.updateOne(
              { orgId, lang, slug: 'how-to-approve-quotation' },
              {
                $set: { contentMDX: content, updatedAt: new Date().toISOString() },
                $setOnInsert: {
                  orgId, lang, roleScopes: ['ADMIN','PROPERTY_MANAGER','TENANT','EMPLOYEE'],
                  module: 'Work Orders', route: '/work-orders',
                  title, slug: 'how-to-approve-quotation', status: 'REVIEW', version: 1,
                  sources: [{ type: 'db', ref: `${name}:${event.documentKey?._id}` }]
                }
              },
              { upsert: true }
            );

            // Get the article ID (either existing or newly inserted)
            const existingArticle = await articles.findOne(
              { orgId, lang, slug: 'how-to-approve-quotation' }
            );
            const articleId = existingArticle?._id?.toString();

            if (articleId) {
              // Create embeddings for chunks (simple chunking here for brevity)
              const text = content;
              const embedding = await embedText(text);
              await db.collection('kb_embeddings').updateOne(
                { articleId, chunkId: '0', lang, orgId },
                { $set: {
                    text, embedding, dims: embedding.length, provider: 'openai',
                    roleScopes: ['ADMIN','PROPERTY_MANAGER','TENANT','EMPLOYEE'],
                    route: '/work-orders',
                    updatedAt: new Date().toISOString()
                  }
                },
                { upsert: true }
              );
            }
          }
        }
      } catch (e) {
        console.error('KB watcher error', e);
      }
    });
  }

  console.log('KB Change Streams watchers running…');
}
run().catch(console.error);
