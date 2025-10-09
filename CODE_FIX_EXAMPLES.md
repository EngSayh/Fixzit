# أمثلة الإصلاحات | Code Fix Examples

هذا الملف يحتوي على أمثلة محددة للكود قبل وبعد الإصلاح المقترح.

---

## 🔴 المثال 1: JWT Secret (حرج)

### ❌ قبل الإصلاح (خطأ)
```typescript
// lib/auth.ts

async function getJWTSecret(): Promise<string> {
  if (jwtSecret) {
    return jwtSecret;
  }

  const envSecret = process.env.JWT_SECRET?.trim();
  if (envSecret) {
    jwtSecret = envSecret;
    return jwtSecret;
  }

  // ⛔ خطأ كبير: سر ثابت في الكود
  if (process.env.NODE_ENV === 'production') {
    // SECRET REDACTED: do NOT store real secrets in source control
    jwtSecret = '<REDACTED_PROD_SECRET>';
    console.log('✅ Using production JWT secret (REDACTED)');
    return jwtSecret;
  }

  const fallbackSecret = randomBytes(32).toString('hex');
  console.warn('⚠️ JWT_SECRET not configured. Using ephemeral secret for development.');
  jwtSecret = fallbackSecret;
  return jwtSecret;
}

// ⛔ خطأ كبير: سر ثابت آخر
const JWT_SECRET = (() => {
  const envSecret = process.env.JWT_SECRET?.trim();
  if (envSecret) {
    return envSecret;
  }

    return 'REDACTED_PRODUCTION_SECRET_EXAMPLE_ONLY';
    // SECRET REDACTED: do NOT store real secrets in source control
    return '<REDACTED_PROD_SECRET>';
  }

  const fallbackSecret = randomBytes(32).toString('hex');
  console.warn('⚠️ JWT_SECRET not set. Using ephemeral secret for development.');
  return fallbackSecret;
})();
```

### ✅ بعد الإصلاح (صحيح)
```typescript
// lib/auth.ts

async function getJWTSecret(): Promise<string> {
  if (jwtSecret) {
    return jwtSecret;
  }

  const envSecret = process.env.JWT_SECRET?.trim();
  if (envSecret) {
    jwtSecret = envSecret;
    return jwtSecret;
  }

  // ✅ في الإنتاج، يجب أن يفشل إذا لم يكن السر موجوداً
  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      'CRITICAL: JWT_SECRET must be set in production environment. ' +
      'Set this in your .env.production file or environment variables.'
    );
  }

  // للتطوير فقط
  const fallbackSecret = randomBytes(32).toString('hex');
  console.warn('⚠️ JWT_SECRET not configured. Using ephemeral secret for development.');
  console.warn('⚠️ This is NOT suitable for production!');
  jwtSecret = fallbackSecret;
  return jwtSecret;
}

// ✅ نسخة متزامنة محسنة
const JWT_SECRET = (() => {
  const envSecret = process.env.JWT_SECRET?.trim();
  if (envSecret) {
    return envSecret;
  }

  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      'CRITICAL: JWT_SECRET must be set in production environment'
    );
  }

  // للتطوير فقط
  const fallbackSecret = randomBytes(32).toString('hex');
  console.warn('⚠️ JWT_SECRET not set. Using ephemeral secret for development.');
  return fallbackSecret;
})();
```

**الفوائد:**
- ✅ عدم وجود أسرار ثابتة في الكود
- ✅ فشل واضح في الإنتاج إذا لم يكن السر موجوداً
- ✅ رسائل خطأ واضحة تساعد في التشخيص
- ✅ فصل واضح بين بيئة التطوير والإنتاج

---

## ⚠️ المثال 2: توحيد getSessionUser

### ❌ قبل الإصلاح (تكرار)

```typescript
// lib/auth-middleware.ts
export interface AuthenticatedUser {
  id: string;
  email: string;
  name?: string;
  role: string;
  orgId: string;
}

export async function getSessionUser(req: NextRequest): Promise<AuthenticatedUser> {
  let authToken = req.cookies.get('fixzit_auth')?.value;
  
  if (!authToken) {
    const authHeader = req.headers.get('Authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      authToken = authHeader.substring(7);
    }
  }
  
  if (!authToken) {
    throw new Error('No authentication token found');
  }

  const payload = verifyToken(authToken);
  if (!payload) {
    throw new Error('Invalid authentication token');
  }

  return {
    id: payload.id,
    email: payload.email,
    role: payload.role,
    orgId: payload.orgId
  };
}
```

```typescript
// server/middleware/withAuthRbac.ts
export type SessionUser = {
  id: string;
  role: Role;
  orgId: string;
  tenantId: string;
};

export async function getSessionUser(req: NextRequest): Promise<SessionUser> {
  const cookieToken = req.cookies.get('fixzit_auth')?.value;
  const headerToken = req.headers.get('Authorization')?.replace('Bearer ', '');
  const xUserHeader = req.headers.get("x-user");
  
  if (xUserHeader) {
    try {
      return JSON.parse(xUserHeader) as SessionUser;
    } catch (e) {
      console.error('Failed to parse x-user header:', e);
    }
  }
  
  const token = cookieToken || headerToken;
  
  if (!token) {
    throw new Error("Unauthenticated");
  }
  
  const payload = verifyToken(token);
  if (!payload) {
    throw new Error("Invalid or expired token");
  }
  
  return {
    id: payload.id,
    role: payload.role as Role,
    orgId: payload.orgId,
    tenantId: payload.tenantId || payload.orgId
  };
}
```

### ✅ بعد الإصلاح (موحد)

```typescript
// lib/auth/session.ts (ملف جديد موحد)

export interface SessionUser {
  id: string;
  email: string;
  name?: string;
  role: string;
  orgId: string;
  tenantId: string;
}

export async function getSessionUser(
  req: NextRequest,
  options?: { allowDevHeader?: boolean }
): Promise<SessionUser> {
  // Development: دعم x-user header للاختبار
  if (options?.allowDevHeader && process.env.NODE_ENV !== 'production') {
    const xUserHeader = req.headers.get("x-user");
    if (xUserHeader) {
      try {
        const user = JSON.parse(xUserHeader);
        console.debug('Using x-user header for development:', user.id);
        return user as SessionUser;
      } catch (e) {
        console.error('Failed to parse x-user header:', e);
        // استمر في المحاولة مع الطرق الأخرى
      }
    }
  }

  // الطريقة الأساسية: Cookie أو Authorization header
  const cookieToken = req.cookies.get('fixzit_auth')?.value;
  const authHeader = req.headers.get('Authorization');
  const headerToken = authHeader?.startsWith('Bearer ') 
    ? authHeader.substring(7) 
    : authHeader;
  
  const token = cookieToken || headerToken;
  
  if (!token) {
    throw new Error('No authentication token found');
  }

  const payload = verifyToken(token);
  if (!payload) {
    throw new Error('Invalid or expired token');
  }

  return {
    id: payload.id,
    email: payload.email,
    name: payload.name,
    role: payload.role,
    orgId: payload.orgId,
    tenantId: payload.tenantId || payload.orgId
  };
}

// دالة مساعدة للتحقق من الصلاحيات
export function requireRole(
  user: SessionUser, 
  allowedRoles: string[]
): void {
  if (!allowedRoles.includes(user.role)) {
    throw new Error('Insufficient permissions');
  }
}
```

**كيفية الاستخدام:**
```typescript
// في أي API route
import { getSessionUser, requireRole } from '@/lib/auth/session';

export async function POST(req: NextRequest) {
  const user = await getSessionUser(req);
  requireRole(user, ['ADMIN', 'MANAGER']);
  
  // ... باقي المنطق
}
```

**الفوائد:**
- ✅ دالة واحدة فقط
- ✅ نوع بيانات موحد
- ✅ دعم جميع السيناريوهات
- ✅ سهولة في الصيانة

---

## ⚠️ المثال 3: Optional Chaining غير ضروري

### ❌ قبل الإصلاح
```typescript
// server/plugins/auditPlugin.ts

export function createAuditContextFromRequest(req: any, userId?: string): AuditInfo {
  return {
    userId: userId || req.user?.id || req.user?._id?.toString(),
    userEmail: req.user?.email,
    ipAddress: req.ip || req.connection?.remoteAddress || req.headers['x-forwarded-for']?.split(',')[0],
    userAgent: req.headers['user-agent'],
    timestamp: new Date()
  };
}
```

```typescript
// app/api/support/tickets/route.ts

const user = await getSessionUser(req);
const ticket = await SupportTicket.create({
  orgId: user?.orgId,  // ⚠️ غير ضروري، user موجود دائماً هنا
  createdByUserId: user?.id,  // ⚠️ غير ضروري
  messages: [{ 
    byUserId: user?.id,  // ⚠️ غير ضروري
    byRole: user ? "USER" : "GUEST",  // ⚠️ مربك
    text: body.text,
    at: new Date()
  }]
});
```

### ✅ بعد الإصلاح
```typescript
// server/plugins/auditPlugin.ts

export function createAuditContextFromRequest(
  req: any, 
  userId?: string
): AuditInfo {
  // فحص صريح لوجود المستخدم
  const user = req.user;
  
  // استخراج IP بطريقة آمنة
  const ip = req.ip 
    || req.connection?.remoteAddress 
    || req.headers['x-forwarded-for']?.split(',')[0]
    || 'unknown';
  
  return {
    userId: userId || user?.id || user?._id?.toString() || 'anonymous',
    userEmail: user?.email || undefined,
    ipAddress: ip,
    userAgent: req.headers['user-agent'] || undefined,
    timestamp: new Date()
  };
}
```

```typescript
// app/api/support/tickets/route.ts

// فحص صريح في البداية
const user = await getSessionUser(req);
if (!user) {
  return NextResponse.json(
    { error: 'Authentication required' },
    { status: 401 }
  );
}

// الآن نحن متأكدون أن user موجود
const ticket = await SupportTicket.create({
  orgId: user.orgId,  // ✅ واضح وآمن
  createdByUserId: user.id,  // ✅ واضح وآمن
  messages: [{ 
    byUserId: user.id,  // ✅ واضح وآمن
    byRole: "USER",  // ✅ واضح، نحن نعرف أنه مستخدم
    text: body.text,
    at: new Date()
  }]
});
```

**الفوائد:**
- ✅ منطق أوضح
- ✅ أخطاء أسهل في الاكتشاف
- ✅ كود أسهل في القراءة
- ✅ TypeScript يساعد أكثر

---

## 🟡 المثال 4: نظام Logging موحد

### ❌ قبل الإصلاح
```typescript
// مختلف في كل ملف

// lib/auth.ts
console.warn('⚠️ JWT_SECRET not configured.');
console.log('✅ Using production JWT secret');

// lib/database.ts
console.error('ERROR: mongoose.connect() failed:', err?.message || err);

// components/ErrorBoundary.tsx
console.log('🔧 Auto-fixing JSON error...');
console.log('⚠️ JSON fix fallback triggered');
```

### ✅ بعد الإصلاح
```typescript
// lib/logger.ts (ملف جديد)

import winston from 'winston';

// تكوين الـ logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { 
    service: 'fixzit-app',
    environment: process.env.NODE_ENV 
  },
  transports: [
    // خطأ في ملف منفصل
    new winston.transports.File({ 
      filename: 'logs/error.log', 
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5
    }),
    // كل شيء في ملف آخر
    new winston.transports.File({ 
      filename: 'logs/combined.log',
      maxsize: 5242880,
      maxFiles: 10
    })
  ]
});

// في التطوير، أضف console مع ألوان
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    )
  }));
}

export default logger;
```

```typescript
// lib/auth.ts (بعد التحديث)

import logger from '@/lib/logger';

async function getJWTSecret(): Promise<string> {
  // ...
  
  if (!envSecret && process.env.NODE_ENV !== 'production') {
    const fallbackSecret = randomBytes(32).toString('hex');
    logger.warn('JWT_SECRET not configured, using ephemeral secret', {
      component: 'auth',
      action: 'getJWTSecret'
    });
    return fallbackSecret;
  }
  
  // ...
}
```

```typescript
// lib/database.ts (بعد التحديث)

import logger from '@/lib/logger';

try {
  conn = await mongoose.connect(uri, options);
  logger.info('Database connected successfully', {
    component: 'database',
    database: conn.connection.name
  });
} catch (err) {
  logger.error('Database connection failed', {
    component: 'database',
    error: err instanceof Error ? err.message : String(err),
    stack: err instanceof Error ? err.stack : undefined
  });
  throw err;
}
```

**الفوائد:**
- ✅ logs منظمة في ملفات
- ✅ log levels (debug, info, warn, error)
- ✅ معلومات سياقية (metadata)
- ✅ rotation تلقائي للملفات
- ✅ سهولة في البحث والتحليل

---

## 🟡 المثال 5: Middleware موحد للمصادقة

### ❌ قبل الإصلاح (متكرر في كل route)
```typescript
// app/api/properties/route.ts
export async function GET(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  if (!['ADMIN', 'MANAGER'].includes(user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  
  // ... منطق الـ route
}

export async function POST(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  if (!['ADMIN', 'MANAGER'].includes(user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  
  // ... منطق الـ route
}
```

### ✅ بعد الإصلاح (باستخدام middleware)
```typescript
// lib/middleware/withAuth.ts (ملف جديد)

import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser, SessionUser } from '@/lib/auth/session';

export type AuthenticatedHandler = (
  req: NextRequest,
  user: SessionUser,
  ...args: any[]
) => Promise<Response>;

export function withAuth(
  handler: AuthenticatedHandler,
  options?: {
    roles?: string[];
    allowDevHeader?: boolean;
  }
) {
  return async (req: NextRequest, ...args: any[]) => {
    try {
      // الحصول على المستخدم
      const user = await getSessionUser(req, {
        allowDevHeader: options?.allowDevHeader
      });
      
      // فحص الصلاحيات إن وجدت
      if (options?.roles && !options.roles.includes(user.role)) {
        return NextResponse.json(
          { 
            error: 'Insufficient permissions',
            required: options.roles,
            current: user.role
          },
          { status: 403 }
        );
      }
      
      // تنفيذ الـ handler مع المستخدم
      return await handler(req, user, ...args);
      
    } catch (error) {
      const errorMessage = error instanceof Error 
        ? error.message 
        : 'Authentication failed';
      
      return NextResponse.json(
        { error: errorMessage },
        { status: 401 }
      );
    }
  };
}
```

```typescript
// app/api/properties/route.ts (بعد التحديث)

import { withAuth } from '@/lib/middleware/withAuth';

export const GET = withAuth(
  async (req, user) => {
    // المستخدم متحقق منه تلقائياً ✅
    // الصلاحيات محققة تلقائياً ✅
    
    const properties = await Property.find({ orgId: user.orgId });
    return NextResponse.json({ properties });
  },
  { roles: ['ADMIN', 'MANAGER'] }  // تحديد الأدوار المسموحة
);

export const POST = withAuth(
  async (req, user) => {
    const body = await req.json();
    const property = await Property.create({
      ...body,
      orgId: user.orgId,
      createdBy: user.id
    });
    
    return NextResponse.json({ property }, { status: 201 });
  },
  { roles: ['ADMIN', 'MANAGER'] }
);
```

**الفوائد:**
- ✅ لا تكرار للكود
- ✅ أخطاء موحدة
- ✅ سهولة في إضافة features (مثل rate limiting)
- ✅ كود أقصر وأوضح

---

## 🟡 المثال 6: Validation للمتغيرات البيئية

### ❌ قبل الإصلاح
```typescript
// استخدام مباشر بدون validation

// components/GoogleMap.tsx
script.src = `https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&libraries=places`;

// server/copilot/llm.ts
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
// لاحقاً في الكود
if (!OPENAI_API_KEY) {
  throw new Error('OPENAI_API_KEY not configured');
}
```

### ✅ بعد الإصلاح
```typescript
// config/env.ts (ملف جديد)

import { z } from 'zod';

// تعريف schema للمتغيرات المطلوبة
const envSchema = z.object({
  // Database
  MONGODB_URI: z.string().url('MONGODB_URI must be a valid URL'),
  
  // Auth
  JWT_SECRET: z.string()
    .min(32, 'JWT_SECRET must be at least 32 characters'),
  
  // APIs
  OPENAI_API_KEY: z.string().optional(),
  NEXT_PUBLIC_GOOGLE_MAPS_API_KEY: z.string().optional(),
  
  // AWS (optional)
  AWS_ACCESS_KEY_ID: z.string().optional(),
  AWS_SECRET_ACCESS_KEY: z.string().optional(),
  AWS_REGION: z.string().default('me-south-1'),
  
  // Environment
  NODE_ENV: z.enum(['development', 'production', 'test'])
    .default('development'),
  
  // Redis (optional)
  REDIS_URL: z.string().url().optional(),
});

// Validation عند بدء التطبيق
function validateEnv() {
  try {
    const env = envSchema.parse(process.env);
    return env;
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('❌ Environment validation failed:');
      error.issues.forEach(issue => {
        console.error(`  - ${issue.path.join('.')}: ${issue.message}`);
      });
      throw new Error('Invalid environment configuration');
    }
    throw error;
  }
}

// تصدير env المحقق منه
export const env = validateEnv();

// دوال مساعدة
export function requireEnv(key: keyof typeof env): string {
  const value = env[key];
  if (!value) {
    throw new Error(`${key} is required but not configured`);
  }
  return value as string;
}
```

```typescript
// استخدام في الملفات الأخرى

// server/copilot/llm.ts
import { env, requireEnv } from '@/config/env';

// سيفشل عند البداية إن لم يكن موجوداً
const OPENAI_API_KEY = requireEnv('OPENAI_API_KEY');

// أو استخدام مع optional
const apiKey = env.OPENAI_API_KEY;
if (!apiKey) {
  throw new Error('OpenAI API key is required for this feature');
}
```

```typescript
// components/GoogleMap.tsx
import { env } from '@/config/env';

// استخدام آمن
const mapsKey = env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
if (!mapsKey) {
  return <div>Google Maps is not configured</div>;
}

script.src = `https://maps.googleapis.com/maps/api/js?key=${mapsKey}&libraries=places`;
```

**الفوائد:**
- ✅ فشل سريع عند البداية
- ✅ رسائل خطأ واضحة
- ✅ type safety كامل
- ✅ validation مركزي
- ✅ documentation مدمج

---

## 📊 ملخص الفوائد | Benefits Summary

| الإصلاح | قبل | بعد | الفائدة |
|---------|-----|-----|---------|
| JWT Secret | ⚠️ مكشوف | ✅ آمن | أمان حرج |
| getSessionUser | 2 دالة | 1 دالة | -50% تكرار |
| Optional Chaining | غير واضح | صريح | +وضوح، -أخطاء |
| Logging | console | winston | +قابلية التتبع |
| Auth Middleware | متكرر 44× | مركزي | -95% تكرار |
| Env Validation | لا يوجد | zod | +موثوقية |

---

**ملاحظة:** جميع الأمثلة أعلاه جاهزة للتطبيق المباشر. ينصح بتطبيقها بالترتيب حسب الأولوية.

**آخر تحديث:** 2025-10-09
