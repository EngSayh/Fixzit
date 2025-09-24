// Run with: npx tsx scripts/kb/watch-change-streams.ts
import { MongoClient } from 'mongodb';
import { embedText, chunkText } from '@/src/ai/embeddings';

const uri = process.env.MONGODB_URI!;
const dbName = process.env.MONGODB_DB || 'fixzit';

if (!uri) {
  console.error('MONGODB_URI not set');
  process.exit(1);
}

/**
 * Starts a MongoDB client and attaches change stream watchers to create knowledge-base articles from relevant collection changes.
 *
 * Watches the collections: `work_orders`, `approvals`, `financial_transactions`, `properties`, `users`, and `support_tickets`. For change events that include an `org_id`/`orgId`, this function dispatches to article-generation handlers:
 * - `work_orders`: on `insert` → `createWorkOrderGuide`
 * - `approals`: when `decision === 'APPROVED'` → `createApprovalGuide`
 * - `support_tickets`: on `insert` → `createSupportGuide`
 *
 * This is a long-running process: it connects to the database, registers event listeners, and continues running until the process is stopped (e.g., via SIGINT).
 */
async function run() {
  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db(dbName);

  console.log('🔍 Starting Knowledge Center Change Streams Watcher...');

  const watchCollections = [
    'work_orders', 
    'approvals', 
    'financial_transactions', 
    'properties', 
    'users',
    'support_tickets'
  ];

  for (const name of watchCollections) {
    const coll = db.collection(name);
    const cs = coll.watch([], { fullDocument: 'updateLookup' });
    
    cs.on('change', async (event) => {
      try {
        const payload = event.fullDocument || event.updateDescription;
        const orgId = payload?.org_id || payload?.orgId;
        
        if (!orgId) return;

        console.log(`📝 Change detected in ${name}:`, event.operationType);

        // Simple rule examples based on operation type
        if (name === 'work_orders' && event.operationType === 'insert') {
          await createWorkOrderGuide(db, payload, orgId);
        }
        
        if (name === 'approvals' && payload?.decision === 'APPROVED') {
          await createApprovalGuide(db, payload, orgId);
        }
        
        if (name === 'support_tickets' && event.operationType === 'insert') {
          await createSupportGuide(db, payload, orgId);
        }
        
      } catch (e) {
        console.error(`❌ KB watcher error for ${name}:`, e);
      }
    });
    
    console.log(`✅ Watching ${name} collection`);
  }

  console.log('🚀 Knowledge Center Change Streams watchers running...');
  console.log('Press Ctrl+C to stop');
}

/**
 * Generate a bilingual (English/Arabic) knowledge-base article describing how to create a work order and persist it via createArticle.
 *
 * Builds MDX content using values from the change payload (falling back to user-friendly placeholders) and invokes createArticle to upsert English and Arabic articles (slug "how-to-create-work-order") under the "Work Orders" module and route "/work-orders".
 *
 * @param payload - Change-stream document payload; used fields:
 *   - property_id: referenced as the Property value in the article
 *   - description: used as the Description value
 *   - priority: used as the Priority value
 * @param orgId - Organization identifier under which the articles will be created
 */
async function createWorkOrderGuide(db: any, payload: any, orgId: string) {
  const title = 'How to Create a Work Order';
  const contentEN = `## ${title}\n\n1. Navigate to Work Orders → New\n2. Fill in the required details:\n   - Property: ${payload.property_id || 'Select property'}\n   - Description: ${payload.description || 'Enter description'}\n   - Priority: ${payload.priority || 'Set priority'}\n3. Assign to technician if needed\n4. Click **Create**\n\n> The work order will be automatically tracked and updated.\n\n**Related:** SLA timers, approval workflows, and vendor assignments.`;
  
  const contentAR = `## كيفية إنشاء أمر عمل\n\n1. انتقل إلى أوامر العمل → جديد\n2. املأ التفاصيل المطلوبة:\n   - العقار: ${payload.property_id || 'اختر العقار'}\n   - الوصف: ${payload.description || 'أدخل الوصف'}\n   - الأولوية: ${payload.priority || 'حدد الأولوية'}\n3. عيّن للفني إذا لزم الأمر\n4. انقر **إنشاء**\n\n> سيتم تتبع أمر العمل وتحديثه تلقائياً.\n\n**متعلق:** مؤقتات SLA، سير عمل الموافقة، وتعيينات الموردين.`;

  await createArticle(db, orgId, title, 'how-to-create-work-order', contentEN, contentAR, 'Work Orders', '/work-orders');
}

/**
 * Create a bilingual (English/Arabic) knowledge-base article explaining how to approve requests.
 *
 * Builds static MDX content (English and Arabic) for the "How to Approve Requests" guide and upserts it by delegating to `createArticle`.
 *
 * @param payload - Change-stream payload associated with the approval event; not used by the current guide generation but kept for parity with other handlers.
 * @param orgId - Organization identifier used to scope the created articles and embeddings.
 */
async function createApprovalGuide(db: any, payload: any, orgId: string) {
  const title = 'How to Approve Requests';
  const contentEN = `## ${title}\n\n1. Go to Approvals → Pending\n2. Review the request details\n3. Check all required documentation\n4. Click **Approve** or **Reject**\n5. Add comments if needed\n\n> Approved requests will automatically proceed to the next stage.\n\n**Note:** All approvals are logged and auditable.`;
  
  const contentAR = `## كيفية الموافقة على الطلبات\n\n1. انتقل إلى الموافقات → المعلقة\n2. راجع تفاصيل الطلب\n3. تحقق من جميع الوثائق المطلوبة\n4. انقر **موافقة** أو **رفض**\n5. أضف تعليقات إذا لزم الأمر\n\n> ستتقدم الطلبات المعتمدة تلقائياً إلى المرحلة التالية.\n\n**ملاحظة:** جميع الموافقات مسجلة وقابلة للتدقيق.`;

  await createArticle(db, orgId, title, 'how-to-approve-requests', contentEN, contentAR, 'Approvals', '/work-orders/approvals');
}

/**
 * Create a bilingual (English and Arabic) knowledge-base article describing how to create a support ticket for a given organization.
 *
 * This function builds predefined English and Arabic MDX content and delegates article upsert and embedding creation to the shared article pipeline.
 *
 * @param payload - Optional change-event payload (not used by this guide; present for consistency with other handlers).
 * @param orgId - Organization identifier for which the article will be created.
 * @returns A promise that resolves when the article creation and related processing complete.
 */
async function createSupportGuide(db: any, payload: any, orgId: string) {
  const title = 'How to Create a Support Ticket';
  const contentEN = `## ${title}\n\n1. Go to Support → Create Ticket\n2. Select the appropriate category\n3. Provide detailed description\n4. Attach relevant files if needed\n5. Submit the ticket\n\n> You'll receive updates via email and in-app notifications.\n\n**Tip:** Include screenshots and step-by-step reproduction steps for faster resolution.`;
  
  const contentAR = `## كيفية إنشاء تذكرة دعم\n\n1. انتقل إلى الدعم → إنشاء تذكرة\n2. اختر الفئة المناسبة\n3. قدم وصفاً مفصلاً\n4. أرفق الملفات ذات الصلة إذا لزم الأمر\n5. أرسل التذكرة\n\n> ستتلقى تحديثات عبر البريد الإلكتروني والإشعارات داخل التطبيق.\n\n**نصيحة:** أدرج لقطات الشاشة وخطوات إعادة الإنتاج خطوة بخطوة للحصول على حل أسرع.`;

  await createArticle(db, orgId, title, 'how-to-create-support-ticket', contentEN, contentAR, 'Support', '/support');
}

/**
 * Upserts bilingual (English and Arabic) knowledge-base articles and generates their embeddings.
 *
 * Creates or updates English and Arabic articles in the `knowledge_articles` collection (status set to `REVIEW`, tags `auto-generated` and `tutorial`), then invokes embedding creation for each article so their content is chunked and stored in `kb_embeddings`.
 *
 * @param orgId - Organization identifier used to scope the articles
 * @param title - Human-readable article title
 * @param slug - Base slug used to generate language-specific slugs (`<slug>-en`, `<slug>-ar`)
 * @param contentEN - Article content in English (MDX)
 * @param contentAR - Article content in Arabic (MDX)
 * @param module - Knowledge center module/category (e.g., "Work Orders")
 * @param route - Frontend route associated with the article (used in metadata)
 */
async function createArticle(db: any, orgId: string, title: string, slug: string, contentEN: string, contentAR: string, module: string, route: string) {
  const articles = db.collection('knowledge_articles');
  
  // Create English article
  const enArticle = {
    orgId,
    lang: 'en',
    roleScopes: ['ADMIN', 'PROPERTY_MANAGER', 'TENANT', 'EMPLOYEE'],
    module,
    route,
    title,
    slug: `${slug}-en`,
    contentMDX: contentEN,
    tags: ['auto-generated', 'tutorial'],
    status: 'REVIEW',
    version: 1,
    sources: [{ type: 'db', ref: 'change-stream' }],
    updatedAt: new Date().toISOString()
  };
  
  const enResult = await articles.updateOne(
    { orgId, lang: 'en', slug: `${slug}-en` },
    { $set: enArticle },
    { upsert: true }
  );
  
  // Create Arabic article
  const arArticle = {
    orgId,
    lang: 'ar',
    roleScopes: ['ADMIN', 'PROPERTY_MANAGER', 'TENANT', 'EMPLOYEE'],
    module,
    route,
    title,
    slug: `${slug}-ar`,
    contentMDX: contentAR,
    tags: ['auto-generated', 'tutorial'],
    status: 'REVIEW',
    version: 1,
    sources: [{ type: 'db', ref: 'change-stream' }],
    updatedAt: new Date().toISOString()
  };
  
  const arResult = await articles.updateOne(
    { orgId, lang: 'ar', slug: `${slug}-ar` },
    { $set: arArticle },
    { upsert: true }
  );
  
  // Create embeddings for both articles
  await createEmbeddings(db, enResult.upsertedId || (await articles.findOne({ orgId, lang: 'en', slug: `${slug}-en` }))?._id, contentEN, 'en', orgId, module, route);
  await createEmbeddings(db, arResult.upsertedId || (await articles.findOne({ orgId, lang: 'ar', slug: `${slug}-ar` }))?._id, contentAR, 'ar', orgId, module, route);
  
  console.log(`✅ Created article: ${title} (${module})`);
}

/**
 * Generate and upsert vector embeddings for an article's text chunks into the `kb_embeddings` collection.
 *
 * If `articleId` is falsy the function returns immediately. The `content` is split with `chunkText`; for each chunk
 * it computes an embedding with `embedText` and upserts a record keyed by `articleId`, `chunkId`, `lang`, and `orgId`.
 * Each embedding document includes `roleScopes`, `route`, `text`, `embedding`, `dims` (embedding length), `provider: 'openai'`,
 * and `updatedAt`. Logs a success message with the number of created embeddings or an error on failure.
 *
 * @param articleId - Article identifier (will be stringified for storage).
 * @param content - Full article content to split into chunks and embed.
 * @param lang - Language of the content: `'en'` or `'ar'`.
 * @param orgId - Organization identifier used as part of the embedding record key.
 * @param module - Knowledge module name stored with each embedding.
 * @param route - Frontend route associated with the article stored with each embedding.
 */
async function createEmbeddings(db: any, articleId: any, content: string, lang: 'ar' | 'en', orgId: string, module: string, route: string) {
  if (!articleId) return;
  
  try {
    const chunks = chunkText(content);
    const embeddings = db.collection('kb_embeddings');
    
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      const embedding = await embedText(chunk);
      
      await embeddings.updateOne(
        { 
          articleId: articleId.toString(), 
          chunkId: i.toString(), 
          lang, 
          orgId 
        },
        { 
          $set: {
            articleId: articleId.toString(),
            chunkId: i.toString(),
            lang,
            orgId,
            roleScopes: ['ADMIN', 'PROPERTY_MANAGER', 'TENANT', 'EMPLOYEE'],
            route,
            text: chunk,
            embedding,
            dims: embedding.length,
            provider: 'openai',
            updatedAt: new Date().toISOString()
          }
        },
        { upsert: true }
      );
    }
    
    console.log(`✅ Created ${chunks.length} embeddings for ${lang} article`);
  } catch (error) {
    console.error(`❌ Embedding creation failed:`, error);
  }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down Knowledge Center watcher...');
  process.exit(0);
});

run().catch(console.error);