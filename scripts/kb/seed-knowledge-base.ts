// Run with: npx tsx scripts/kb/seed-knowledge-base.ts
import { getDb } from '@/src/lib/mongo';
import { embedText, chunkText } from '@/src/ai/embeddings';

const initialArticles = [
  {
    title: 'Getting Started with Fixzit Enterprise',
    slug: 'getting-started',
    category: 'General',
    contentEN: `# Getting Started with Fixzit Enterprise

Welcome to Fixzit Enterprise, the comprehensive facility management platform designed to streamline your property operations.

## Key Features

### 1. Work Order Management
- Create, assign, and track maintenance requests
- SLA monitoring and escalation
- Vendor coordination
- Mobile access for technicians

### 2. Property Management
- Multi-property portfolio management
- Unit and tenant tracking
- Lease management
- Document storage

### 3. Financial Management
- Automated invoicing
- Payment processing
- Budget tracking
- Financial reporting

### 4. Vendor Management
- Vendor database
- Performance tracking
- Contract management
- Procurement workflows

## Getting Started

1. **Set up your organization** - Configure your company details and settings
2. **Add properties** - Import or manually add your properties
3. **Create user accounts** - Set up accounts for your team members
4. **Configure workflows** - Customize approval processes and notifications
5. **Start using** - Begin creating work orders and managing your properties

## Support

Need help? Contact our support team or use the AI assistant for instant answers to common questions.`,
    contentAR: `# البدء مع Fixzit Enterprise

مرحباً بك في Fixzit Enterprise، منصة إدارة المرافق الشاملة المصممة لتبسيط عمليات العقارات الخاصة بك.

## الميزات الرئيسية

### 1. إدارة أوامر العمل
- إنشاء وتخصيص وتتبع طلبات الصيانة
- مراقبة SLA والتصعيد
- تنسيق الموردين
- الوصول المحمول للفنيين

### 2. إدارة العقارات
- إدارة محفظة العقارات المتعددة
- تتبع الوحدات والمستأجرين
- إدارة الإيجار
- تخزين المستندات

### 3. الإدارة المالية
- الفواتير الآلية
- معالجة المدفوعات
- تتبع الميزانية
- التقارير المالية

### 4. إدارة الموردين
- قاعدة بيانات الموردين
- تتبع الأداء
- إدارة العقود
- سير عمل المشتريات

## البدء

1. **إعداد مؤسستك** - تكوين تفاصيل وإعدادات شركتك
2. **إضافة العقارات** - استيراد أو إضافة عقاراتك يدوياً
3. **إنشاء حسابات المستخدمين** - إعداد حسابات لأعضاء فريقك
4. **تكوين سير العمل** - تخصيص عمليات الموافقة والإشعارات
5. **البدء في الاستخدام** - ابدأ في إنشاء أوامر العمل وإدارة عقاراتك

## الدعم

تحتاج مساعدة؟ اتصل بفريق الدعم أو استخدم المساعد الذكي للحصول على إجابات فورية للأسئلة الشائعة.`,
    module: 'General',
    route: '/help',
    tags: ['getting-started', 'tutorial', 'basics']
  },
  {
    title: 'How to Create a Work Order',
    slug: 'create-work-order',
    category: 'Work Orders',
    contentEN: `# How to Create a Work Order

Creating work orders in Fixzit is simple and efficient. Follow these steps to get started.

## Step-by-Step Guide

### 1. Navigate to Work Orders
- Click on "Work Orders" in the main navigation
- Select "New Work Order" from the dropdown

### 2. Fill in Basic Information
- **Property**: Select the property where work is needed
- **Unit**: Choose the specific unit (if applicable)
- **Priority**: Set the urgency level (Low, Medium, High, Critical)
- **Category**: Select the type of work (Maintenance, Repair, Inspection, etc.)

### 3. Describe the Issue
- **Title**: Brief description of the problem
- **Description**: Detailed explanation of what needs to be done
- **Attachments**: Upload photos or documents if needed

### 4. Assign and Schedule
- **Assigned To**: Select a technician or vendor
- **Due Date**: Set when the work should be completed
- **Estimated Cost**: Enter expected cost (optional)

### 5. Submit
- Review all information
- Click "Create Work Order"
- The work order will be automatically tracked

## Best Practices

- Be specific in your descriptions
- Include photos when possible
- Set realistic due dates
- Assign to appropriate personnel
- Use proper categories for better organization

## Tracking Progress

Once created, you can track the work order through its lifecycle:
- **New** → **Assigned** → **In Progress** → **Completed** → **Closed`

## Related Topics

- Work Order Lifecycle
- Vendor Management
- SLA Monitoring
- Mobile Access`,
    contentAR: `# كيفية إنشاء أمر عمل

إنشاء أوامر العمل في Fixzit بسيط وفعال. اتبع هذه الخطوات للبدء.

## دليل خطوة بخطوة

### 1. الانتقال إلى أوامر العمل
- انقر على "أوامر العمل" في التنقل الرئيسي
- اختر "أمر عمل جديد" من القائمة المنسدلة

### 2. ملء المعلومات الأساسية
- **العقار**: اختر العقار الذي يحتاج العمل
- **الوحدة**: اختر الوحدة المحددة (إن أمكن)
- **الأولوية**: حدد مستوى الاستعجال (منخفض، متوسط، عالي، حرج)
- **الفئة**: اختر نوع العمل (صيانة، إصلاح، فحص، إلخ)

### 3. وصف المشكلة
- **العنوان**: وصف مختصر للمشكلة
- **الوصف**: شرح مفصل لما يجب عمله
- **المرفقات**: ارفق الصور أو المستندات إذا لزم الأمر

### 4. التخصيص والجدولة
- **مخصص لـ**: اختر فني أو مورد
- **تاريخ الاستحقاق**: حدد متى يجب إكمال العمل
- **التكلفة المقدرة**: أدخل التكلفة المتوقعة (اختياري)

### 5. الإرسال
- راجع جميع المعلومات
- انقر "إنشاء أمر عمل"
- سيتم تتبع أمر العمل تلقائياً

## أفضل الممارسات

- كن محدداً في أوصافك
- أدرج الصور عند الإمكان
- حدد تواريخ استحقاق واقعية
- خصص للموظفين المناسبين
- استخدم الفئات المناسبة لتنظيم أفضل

## تتبع التقدم

بمجرد الإنشاء، يمكنك تتبع أمر العمل خلال دورة حياته:
- **جديد** → **مخصص** → **قيد التنفيذ** → **مكتمل** → **مغلق**

## مواضيع ذات صلة

- دورة حياة أمر العمل
- إدارة الموردين
- مراقبة SLA
- الوصول المحمول`,
    module: 'Work Orders',
    route: '/work-orders',
    tags: ['work-orders', 'tutorial', 'how-to']
  }
];

async function seedKnowledgeBase() {
  try {
    console.log('🌱 Starting Knowledge Base seeding...');
    
    const db = await getDb();
    const articles = db.collection('knowledge_articles');
    const embeddings = db.collection('kb_embeddings');

    for (const articleData of initialArticles) {
      console.log(`📝 Creating article: ${articleData.title}`);
      
      // Create English article
      const enArticle = {
        orgId: 'default-org',
        lang: 'en',
        roleScopes: ['ADMIN', 'PROPERTY_MANAGER', 'TENANT', 'EMPLOYEE'],
        module: articleData.module,
        route: articleData.route,
        title: articleData.title,
        slug: `${articleData.slug}-en`,
        contentMDX: articleData.contentEN,
        tags: articleData.tags,
        status: 'PUBLISHED',
        version: 1,
        sources: [{ type: 'admin', ref: 'seed-script' }],
        updatedAt: new Date().toISOString()
      };

      const enResult = await articles.updateOne(
        { orgId: 'default-org', lang: 'en', slug: `${articleData.slug}-en` },
        { $set: enArticle },
        { upsert: true }
      );

      // Create Arabic article
      const arArticle = {
        orgId: 'default-org',
        lang: 'ar',
        roleScopes: ['ADMIN', 'PROPERTY_MANAGER', 'TENANT', 'EMPLOYEE'],
        module: articleData.module,
        route: articleData.route,
        title: articleData.title,
        slug: `${articleData.slug}-ar`,
        contentMDX: articleData.contentAR,
        tags: articleData.tags,
        status: 'PUBLISHED',
        version: 1,
        sources: [{ type: 'admin', ref: 'seed-script' }],
        updatedAt: new Date().toISOString()
      };

      const arResult = await articles.updateOne(
        { orgId: 'default-org', lang: 'ar', slug: `${articleData.slug}-ar` },
        { $set: arArticle },
        { upsert: true }
      );

      // Create embeddings for both articles
      await createEmbeddings(embeddings, enResult.upsertedId || (await articles.findOne({ orgId: 'default-org', lang: 'en', slug: `${articleData.slug}-en` }))?._id, articleData.contentEN, 'en', articleData.module, articleData.route);
      await createEmbeddings(embeddings, arResult.upsertedId || (await articles.findOne({ orgId: 'default-org', lang: 'ar', slug: `${articleData.slug}-ar` }))?._id, articleData.contentAR, 'ar', articleData.module, articleData.route);

      console.log(`✅ Created article: ${articleData.title}`);
    }

    console.log('🎉 Knowledge Base seeding completed successfully!');
  } catch (error) {
    console.error('❌ Error seeding Knowledge Base:', error);
  }
}

async function createEmbeddings(embeddings: any, articleId: any, content: string, lang: 'ar' | 'en', module: string, route: string) {
  if (!articleId) return;
  
  try {
    const chunks = chunkText(content);
    
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      const embedding = await embedText(chunk);
      
      await embeddings.updateOne(
        { 
          articleId: articleId.toString(), 
          chunkId: i.toString(), 
          lang, 
          orgId: 'default-org'
        },
        { 
          $set: {
            articleId: articleId.toString(),
            chunkId: i.toString(),
            lang,
            orgId: 'default-org',
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

seedKnowledgeBase().catch(console.error);