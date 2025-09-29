import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

async function main() {
  const tenant = await db.tenant.upsert({
    where:{ slug:"demo-tenant" },
    create:{ slug:"demo-tenant", name:"Demo Tenant" },
    update:{}
  });
  
  const user = await db.user.upsert({
    where:{ email:"admin@demo.local" },
    create:{ email:"admin@demo.local", name:"Admin", role:"SUPER_ADMIN", tenantId:tenant.id },
    update:{}
  });
  
  console.log({ tenant, user });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });

