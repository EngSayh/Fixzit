#!/usr/bin/env ts-node
import { config } from 'dotenv';
import { connectDB } from '@/src/lib/db';
import { KnowledgeArticle } from '@/src/db/models/KnowledgeArticle';
import { KbEmbedding } from '@/src/db/models/KbEmbedding';
import { KbRule } from '@/src/db/models/KbRule';
import { embedText } from '@/src/ai/embeddings';

// Load environment variables
config();

const DEMO_ORG_ID = 'demo-tenant';

// Seed articles for different modules
const SEED_ARTICLES = [
  // Work Orders Module
  {
    module: 'Work Orders',
    articles: [
      {
        titleEn: 'Getting Started with Work Orders',
        titleAr: 'البدء مع أوامر العمل',
        contentEn: `# Getting Started with Work Orders

Work Orders are the heart of facility management. Here's how to get started:

## Creating a Work Order

1. Navigate to **Work Orders** in the sidebar
2. Click **Create New** 
3. Fill in the required details:
   - Title and description
   - Priority (P1/P2/P3)
   - Asset/Property
   - Assign to technician
4. Click **Submit**

## Work Order Lifecycle

- **Draft** → Initial creation
- **Submitted** → Awaiting approval
- **Approved** → Ready for work
- **In Progress** → Being worked on
- **Completed** → Work finished
- **Closed** → Verified and closed

## Tips
- Use templates for recurring work
- Set SLA timers for critical work
- Attach photos for better context`,
        contentAr: `# البدء مع أوامر العمل

أوامر العمل هي قلب إدارة المرافق. إليك كيفية البدء:

## إنشاء أمر عمل

1. انتقل إلى **أوامر العمل** في الشريط الجانبي
2. انقر على **إنشاء جديد**
3. املأ التفاصيل المطلوبة:
   - العنوان والوصف
   - الأولوية (P1/P2/P3)
   - الأصل/العقار
   - التعيين للفني
4. انقر على **إرسال**

## دورة حياة أمر العمل

- **مسودة** ← الإنشاء الأولي
- **مُرسل** ← في انتظار الموافقة
- **معتمد** ← جاهز للعمل
- **قيد التنفيذ** ← يتم العمل عليه
- **مكتمل** ← انتهى العمل
- **مغلق** ← تم التحقق والإغلاق

## نصائح
- استخدم القوالب للأعمال المتكررة
- حدد مؤقتات SLA للأعمال الحرجة
- أرفق الصور لسياق أفضل`,
        tags: ['getting-started', 'work-orders', 'tutorial'],
        roleScopes: ['ADMIN', 'TENANT_ADMIN', 'EMPLOYEE', 'TECHNICIAN', 'PROPERTY_MANAGER', 'TENANT']
      },
      {
        titleEn: 'Work Order Approvals',
        titleAr: 'موافقات أوامر العمل',
        contentEn: `# Work Order Approvals

Learn how to manage work order approvals efficiently.

## Approval Workflow

1. **Automatic Routing**: Based on cost and type
2. **Manual Approval**: For special cases
3. **Bulk Actions**: Approve multiple at once

## Approval Levels

| Cost Range | Approver Level |
|------------|----------------|
| < 1,000 SAR | Supervisor |
| 1,000-10,000 | Manager |
| > 10,000 | Director |

## Quick Actions
- **Approve**: Moves to execution
- **Reject**: Returns with comments
- **Delegate**: Assign to another approver`,
        contentAr: `# موافقات أوامر العمل

تعلم كيفية إدارة موافقات أوامر العمل بكفاءة.

## سير عمل الموافقة

1. **التوجيه التلقائي**: بناءً على التكلفة والنوع
2. **الموافقة اليدوية**: للحالات الخاصة
3. **الإجراءات الجماعية**: الموافقة على عدة طلبات مرة واحدة

## مستويات الموافقة

| نطاق التكلفة | مستوى الموافق |
|--------------|---------------|
| < 1,000 ريال | المشرف |
| 1,000-10,000 | المدير |
| > 10,000 | المدير العام |

## الإجراءات السريعة
- **موافقة**: ينتقل للتنفيذ
- **رفض**: يعود مع التعليقات
- **تفويض**: تعيين لموافق آخر`,
        tags: ['approvals', 'workflow', 'work-orders'],
        roleScopes: ['ADMIN', 'PROPERTY_MANAGER', 'TENANT_ADMIN']
      }
    ]
  },
  // Properties Module
  {
    module: 'Properties',
    articles: [
      {
        titleEn: 'Managing Properties',
        titleAr: 'إدارة العقارات',
        contentEn: `# Managing Properties

Complete guide to property management in Fixzit.

## Adding a Property

1. Go to **Properties** → **Add New**
2. Enter property details:
   - Name and address
   - Type (Residential/Commercial)
   - Number of units
   - Amenities
3. Upload documents and images
4. Set up maintenance schedules

## Property Dashboard

View key metrics:
- Occupancy rate
- Maintenance status
- Financial performance
- Upcoming inspections

## Best Practices
- Keep documents updated
- Schedule regular inspections
- Monitor tenant satisfaction`,
        contentAr: `# إدارة العقارات

دليل شامل لإدارة العقارات في فيكزت.

## إضافة عقار

1. اذهب إلى **العقارات** ← **إضافة جديد**
2. أدخل تفاصيل العقار:
   - الاسم والعنوان
   - النوع (سكني/تجاري)
   - عدد الوحدات
   - المرافق
3. ارفع المستندات والصور
4. قم بإعداد جداول الصيانة

## لوحة تحكم العقار

عرض المقاييس الرئيسية:
- معدل الإشغال
- حالة الصيانة
- الأداء المالي
- الفحوصات القادمة

## أفضل الممارسات
- حافظ على تحديث المستندات
- جدولة الفحوصات المنتظمة
- مراقبة رضا المستأجرين`,
        tags: ['properties', 'management', 'tutorial'],
        roleScopes: ['ADMIN', 'PROPERTY_MANAGER', 'TENANT_ADMIN']
      }
    ]
  },
  // Marketplace Module
  {
    module: 'Marketplace',
    articles: [
      {
        titleEn: 'Using the Marketplace',
        titleAr: 'استخدام السوق',
        contentEn: `# Using the Marketplace

Find and order maintenance supplies efficiently.

## Browsing Products

1. Use filters to narrow down:
   - Category
   - Brand
   - Price range
   - Availability
2. Compare products side-by-side
3. Check reviews and ratings

## Placing Orders

1. Add items to cart
2. Review quantities
3. Select delivery options
4. Submit for approval (if required)
5. Track order status

## For Vendors
- List your products
- Manage inventory
- Respond to RFQs
- Track performance`,
        contentAr: `# استخدام السوق

ابحث واطلب مستلزمات الصيانة بكفاءة.

## تصفح المنتجات

1. استخدم الفلاتر للتضييق:
   - الفئة
   - العلامة التجارية
   - نطاق السعر
   - التوفر
2. قارن المنتجات جنبًا إلى جنب
3. تحقق من المراجعات والتقييمات

## تقديم الطلبات

1. أضف العناصر إلى السلة
2. راجع الكميات
3. حدد خيارات التوصيل
4. أرسل للموافقة (إذا لزم الأمر)
5. تتبع حالة الطلب

## للبائعين
- اعرض منتجاتك
- إدارة المخزون
- الرد على طلبات عروض الأسعار
- تتبع الأداء`,
        tags: ['marketplace', 'ordering', 'vendors'],
        roleScopes: ['ADMIN', 'EMPLOYEE', 'TECHNICIAN', 'VENDOR', 'GUEST']
      }
    ]
  }
];

// Seed rules for auto-generation
const SEED_RULES = [
  {
    name: 'work_order_approval_guide',
    description: 'Create guide when new approval workflow is detected',
    trigger: {
      collection: 'approvals',
      operation: 'insert',
      conditions: { status: 'APPROVED' }
    },
    action: {
      type: 'create_article' as const,
      template: {
        title: 'How to handle {type} approvals',
        content: 'Auto-generated guide for {type} approval process...',
        module: 'Work Orders',
        tags: ['auto-generated', 'approvals'],
        roleScopes: ['ADMIN', 'PROPERTY_MANAGER']
      }
    },
    enabled: true,
    priority: 1
  },
  {
    name: 'new_property_setup',
    description: 'Create setup guide when new property type is added',
    trigger: {
      collection: 'properties',
      operation: 'insert',
      conditions: {}
    },
    action: {
      type: 'create_article' as const,
      template: {
        title: 'Setting up {propertyType} properties',
        content: 'Guide for configuring {propertyType} property...',
        module: 'Properties',
        tags: ['auto-generated', 'setup'],
        roleScopes: ['ADMIN', 'PROPERTY_MANAGER']
      }
    },
    enabled: true,
    priority: 2
  }
];

async function seedDatabase() {
  try {
    console.log('🌱 Starting Knowledge Base seed...');
    
    // Connect to database
    await connectDB();
    
    // Clear existing data (for demo purposes)
    console.log('🧹 Clearing existing KB data...');
    await KnowledgeArticle.deleteMany({ orgId: DEMO_ORG_ID });
    await KbEmbedding.deleteMany({ orgId: DEMO_ORG_ID });
    await KbRule.deleteMany({});
    
    // Seed articles
    console.log('📝 Creating articles...');
    for (const moduleData of SEED_ARTICLES) {
      for (const articleData of moduleData.articles) {
        // Create English version
        const enArticle = await KnowledgeArticle.create({
          orgId: DEMO_ORG_ID,
          lang: 'en',
          module: moduleData.module,
          title: articleData.titleEn,
          slug: articleData.titleEn.toLowerCase().replace(/\s+/g, '-'),
          contentMDX: articleData.contentEn,
          tags: articleData.tags,
          roleScopes: articleData.roleScopes,
          status: 'PUBLISHED',
          version: 1,
          sources: [{ type: 'admin', ref: 'seed-script' }],
          createdBy: 'system',
          updatedBy: 'system'
        });
        
        // Create Arabic version
        const arArticle = await KnowledgeArticle.create({
          orgId: DEMO_ORG_ID,
          lang: 'ar',
          module: moduleData.module,
          title: articleData.titleAr,
          slug: articleData.titleEn.toLowerCase().replace(/\s+/g, '-'), // Use same slug
          contentMDX: articleData.contentAr,
          tags: articleData.tags,
          roleScopes: articleData.roleScopes,
          status: 'PUBLISHED',
          version: 1,
          sources: [{ type: 'admin', ref: 'seed-script' }],
          createdBy: 'system',
          updatedBy: 'system'
        });
        
        console.log(`✅ Created article: ${articleData.titleEn}`);
        
        // Create embeddings
        try {
          // English embedding
          const enEmbedding = await embedText(articleData.contentEn, 'text-embedding-3-small');
          await KbEmbedding.create({
            articleId: enArticle._id.toString(),
            chunkId: '0',
            lang: 'en',
            orgId: DEMO_ORG_ID,
            roleScopes: articleData.roleScopes,
            text: articleData.contentEn,
            embedding: enEmbedding,
            dims: 1536,
            provider: 'openai'
          });
          
          // Arabic embedding
          const arEmbedding = await embedText(articleData.contentAr, 'text-embedding-3-small');
          await KbEmbedding.create({
            articleId: arArticle._id.toString(),
            chunkId: '0',
            lang: 'ar',
            orgId: DEMO_ORG_ID,
            roleScopes: articleData.roleScopes,
            text: articleData.contentAr,
            embedding: arEmbedding,
            dims: 1536,
            provider: 'openai'
          });
          
          console.log(`🔤 Created embeddings for: ${articleData.titleEn}`);
        } catch (embError: any) {
          console.error(`⚠️  Failed to create embeddings: ${embError?.message || embError}`);
          console.log('   (This is normal if OpenAI API key is not configured)');
        }
      }
    }
    
    // Seed rules
    console.log('\n📏 Creating auto-generation rules...');
    for (const rule of SEED_RULES) {
      await KbRule.create(rule);
      console.log(`✅ Created rule: ${rule.name}`);
    }
    
    // Summary
    const articleCount = await KnowledgeArticle.countDocuments({ orgId: DEMO_ORG_ID });
    const embeddingCount = await KbEmbedding.countDocuments({ orgId: DEMO_ORG_ID });
    const ruleCount = await KbRule.countDocuments();
    
    console.log('\n🎉 Seed completed successfully!');
    console.log(`   - Articles: ${articleCount}`);
    console.log(`   - Embeddings: ${embeddingCount}`);
    console.log(`   - Rules: ${ruleCount}`);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Seed failed:', error);
    process.exit(1);
  }
}

// Run the seed
seedDatabase();