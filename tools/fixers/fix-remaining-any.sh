#!/bin/bash
# Fix remaining 'any' types in server files

# db/mongoose.ts - Mongoose connection types (3 any)
sed -i 's/MongooseCache = {\s*conn: any/MongooseCache = { conn: mongoose.Connection | null/g' db/mongoose.ts
sed -i 's/promise: any/promise: Promise<typeof mongoose> | null/g' db/mongoose.ts
sed -i 's/(global as any)/((global as unknown) as Record<string, unknown>)/g' db/mongoose.ts

# kb/ingest.ts - Embedding type
sed -i 's/embed: any/embed: number[]/g' kb/ingest.ts

# modules/organizations/service.ts - MongoDB find result types
sed -i 's/findOne(filter: any)/findOne(filter: Record<string, unknown>)/g' modules/organizations/service.ts
sed -i 's/find(filter: any)/find(filter: Record<string, unknown>)/g' modules/organizations/service.ts

# modules/users/service.ts - MongoDB find result types  
sed -i 's/findOne(filter: any)/findOne(filter: Record<string, unknown>)/g' modules/users/service.ts
sed -i 's/find(filter: any)/find(filter: Record<string, unknown>)/g' modules/users/service.ts
sed -i 's/deleteMany(filter: any)/deleteMany(filter: Record<string, unknown>)/g' modules/users/service.ts

# server/finance/invoice.service.ts - Invoice types
sed -i 's/const updates: any/const updates: Record<string, unknown>/g' server/finance/invoice.service.ts
sed -i 's/const lineItems: any/const lineItems: Array<Record<string, unknown>>/g' server/finance/invoice.service.ts  
sed -i 's/const where: any/const where: Record<string, unknown>/g' server/finance/invoice.service.ts
sed -i 's/const filter: any/const filter: Record<string, unknown>/g' server/finance/invoice.service.ts

# server/models/Application.ts - Mongoose schema any types
sed -i 's/default: (): any => ({})/default: (): Record<string, unknown> => ({})/g' server/models/Application.ts

# server/models/marketplace/Product.ts - Product schema 
sed -i 's/default: (): any => \[\]/default: (): Array<unknown> => []/g' server/models/marketplace/Product.ts

# server/models/WorkOrder.ts - WorkOrder schema
sed -i 's/meta: any/meta: Record<string, unknown>/g' server/models/WorkOrder.ts

# server/security/headers.ts - Response data
sed -i 's/data: any/data: unknown/g' server/security/headers.ts

# server/utils/errorResponses.ts - Error details  
sed -i 's/details\?: any/details?: unknown/g' server/utils/errorResponses.ts

# server/work-orders/wo.service.ts - Service params
sed -i 's/params: any/params: Record<string, unknown>/g' server/work-orders/wo.service.ts

# services/paytabs.ts - PayTabs types
sed -i 's/payload: any/payload: Record<string, unknown>/g' services/paytabs.ts
sed -i 's/body: any/body: Record<string, unknown>/g' services/paytabs.ts

echo "Fixed remaining 'any' types in server files"
