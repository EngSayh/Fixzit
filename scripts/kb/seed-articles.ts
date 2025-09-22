// Seed initial knowledge base articles
// Run with: ts-node scripts/kb/seed-articles.ts
import { MongoClient } from 'mongodb';
import { embedText } from '@/src/ai/embeddings';

const uri = process.env.MONGODB_URI!;
const dbName = process.env.MONGODB_DB || 'fixzit';

const articles = [
  {
    orgId: 'demo-tenant',
    lang: 'en',
    roleScopes: ['ADMIN', 'TENANT_ADMIN', 'EMPLOYEE'],
    module: 'Work Orders',
    route: '/work-orders',
    title: 'How to Create a Work Order',
    slug: 'create-work-order',
    contentMDX: `# How to Create a Work Order

## Overview
Work orders are requests for maintenance, repairs, or services in your facility.

## Steps

1. **Navigate to Work Orders**
   - Go to Facility Management → Work Orders
   - Click "Create New Work Order"

2. **Fill Basic Information**
   - Property: Select the property
   - Unit: Choose specific unit (optional)
   - Priority: High, Medium, or Low
   - Description: Detailed description of the work needed

3. **Assign Technician** (Optional)
   - Select from available technicians
   - Or leave unassigned for automatic assignment

4. **Add Attachments**
   - Upload photos, documents, or specifications
   - Multiple files supported

5. **Submit**
   - Click "Create Work Order"
   - Order will be created with status "Open"

## Tips
- Use clear, detailed descriptions
- Include photos when possible
- Set appropriate priority levels
- Check existing work orders before creating new ones`,
    tags: ['work orders', 'maintenance', 'create', 'tutorial'],
    status: 'PUBLISHED',
    version: 1,
    sources: [{ type: 'admin', ref: 'initial-seed' }]
  },
  {
    orgId: 'demo-tenant',
    lang: 'ar',
    roleScopes: ['ADMIN', 'TENANT_ADMIN', 'EMPLOYEE'],
    module: 'Work Orders',
    route: '/work-orders',
    title: 'كيفية إنشاء أمر عمل',
    slug: 'create-work-order-ar',
    contentMDX: `# كيفية إنشاء أمر عمل

## نظرة عامة
أوامر العمل هي طلبات للصيانة أو الإصلاحات أو الخدمات في منشأتك.

## الخطوات

1. **انتقل إلى أوامر العمل**
   - اذهب إلى إدارة المرافق → أوامر العمل
   - انقر "إنشاء أمر عمل جديد"

2. **املأ المعلومات الأساسية**
   - العقار: اختر العقار
   - الوحدة: اختر الوحدة المحددة (اختياري)
   - الأولوية: عالية، متوسطة، أو منخفضة
   - الوصف: وصف مفصل للعمل المطلوب

3. **تعيين فني** (اختياري)
   - اختر من الفنيين المتاحين
   - أو اتركه غير معين للتعيين التلقائي

4. **إضافة مرفقات**
   - رفع الصور، المستندات، أو المواصفات
   - يدعم ملفات متعددة

5. **إرسال**
   - انقر "إنشاء أمر عمل"
   - سيتم إنشاء الأمر بحالة "مفتوح"

## نصائح
- استخدم أوصاف واضحة ومفصلة
- أدرج صور عند الإمكان
- حدد مستويات الأولوية المناسبة
- تحقق من أوامر العمل الموجودة قبل إنشاء أوامر جديدة`,
    tags: ['أوامر العمل', 'صيانة', 'إنشاء', 'دليل'],
    status: 'PUBLISHED',
    version: 1,
    sources: [{ type: 'admin', ref: 'initial-seed' }]
  },
  {
    orgId: 'demo-tenant',
    lang: 'en',
    roleScopes: ['TENANT'],
    module: 'Properties',
    route: '/properties',
    title: 'Tenant Portal Guide',
    slug: 'tenant-portal-guide',
    contentMDX: `# Tenant Portal Guide

## Overview
The Tenant Portal provides tenants with easy access to property information and services.

## Features Available

### Property Information
- View property details and amenities
- Access lease documents
- Check maintenance history

### Maintenance Requests
- Submit maintenance requests
- Track request status
- View scheduled appointments

### Payments
- View rent statements
- Make online payments
- Download payment receipts

### Communication
- Contact property management
- View announcements
- Submit feedback

## Getting Started
1. Log in to your tenant account
2. Navigate to the Properties section
3. Access your specific property dashboard

## Need Help?
Contact your property manager or use the support ticket system.`,
    tags: ['tenant', 'portal', 'guide', 'properties'],
    status: 'PUBLISHED',
    version: 1,
    sources: [{ type: 'admin', ref: 'initial-seed' }]
  }
];

async function run() {
  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db(dbName);

  for (const article of articles) {
    // Insert article
    const updateResult = await db.collection('knowledge_articles').updateOne(
      { orgId: article.orgId, lang: article.lang, slug: article.slug },
      { $setOnInsert: { ...article, createdAt: new Date().toISOString() } },
      { upsert: true }
    );

    // Get the article ID (either existing or newly inserted)
    const existingArticle = await db.collection('knowledge_articles').findOne(
      { orgId: article.orgId, lang: article.lang, slug: article.slug }
    );
    const articleId = existingArticle?._id?.toString();

    if (articleId) {
      // Create embeddings
      const text = article.contentMDX;
      const embedding = await embedText(text);

      await db.collection('kb_embeddings').updateOne(
        {
          articleId,
          chunkId: '0',
          lang: article.lang,
          orgId: article.orgId
        },
      {
        $set: {
          text,
          embedding,
          dims: embedding.length,
          provider: 'openai',
          roleScopes: article.roleScopes,
          route: article.route,
          updatedAt: new Date().toISOString()
        }
      },
      { upsert: true }
    );
  }

  console.log('Seeded knowledge base articles');
  await client.close();
}

}

run().catch(console.error);
