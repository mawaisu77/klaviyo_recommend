import { PrismaClient } from "@prisma/client";
import { DEFAULT_REASON_MAPPINGS } from "@returnsense/shared";

const prisma = new PrismaClient();

async function main(): Promise<void> {
  const organizations = await prisma.organization.findMany();
  if (organizations.length === 0) {
    console.log("No organizations found. Register a user first, then re-run the seed.");
    return;
  }

  for (const org of organizations) {
    for (const [sourceReason, marketingCategory] of Object.entries(
      DEFAULT_REASON_MAPPINGS,
    )) {
      await prisma.returnReasonMapping.upsert({
        where: {
          organizationId_sourceReason: { organizationId: org.id, sourceReason },
        },
        create: { organizationId: org.id, sourceReason, marketingCategory },
        update: {},
      });
    }
    console.log(`Seeded default mappings for organization ${org.name} (${org.id})`);
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
