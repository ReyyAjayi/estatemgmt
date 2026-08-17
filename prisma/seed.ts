// Dev-only fixture data for local testing.
//
// This is NOT part of the product's real onboarding flow — per
// docs/phase-0-discovery.md §10 (decisions 14–15), the only real flows are
// estate self-registration (Admin) and Admin creating Landlord/Security
// in-app. This script exists purely so Landlord/Tenant/Security logins can
// be exercised locally before the Phase 2 Admin UI that creates them exists.
import "dotenv/config";
import bcrypt from "bcryptjs";
import { randomInt } from "node:crypto";
import { prisma } from "../src/lib/prisma";
import { Role } from "../src/generated/prisma/enums";

// Duplicated (not imported) from src/lib/password.ts and src/lib/codes.ts:
// those files start with `import "server-only"`, which throws outside
// Next.js's bundler — this plain Node/tsx script isn't one.
const hashPassword = (plain: string) => bcrypt.hash(plain, 12);
const CODE_ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";
const randomCode = (length: number) =>
  Array.from({ length }, () => CODE_ALPHABET[randomInt(CODE_ALPHABET.length)]).join("");
const generateHouseCode = () => randomCode(8);
const generateTenantCode = () => randomCode(8);

async function main() {
  const estate = await prisma.estate.findFirst();
  if (!estate) {
    console.error(
      "No estate found. Complete the /setup flow (creates the Estate + first Admin) before seeding."
    );
    process.exit(1);
  }

  const year = new Date().getFullYear();
  const spaceTypeDefs = [
    { name: "1 Bedroom", amountNaira: 20000 },
    { name: "2 Bedroom", amountNaira: 30000 },
    { name: "3 Bedroom", amountNaira: 40000 },
  ];

  const spaceTypes = [];
  for (const def of spaceTypeDefs) {
    const spaceType = await prisma.livingSpaceType.upsert({
      where: { estateId_name: { estateId: estate.id, name: def.name } },
      create: { estateId: estate.id, name: def.name },
      update: {},
    });
    await prisma.fee.upsert({
      where: { livingSpaceTypeId_year: { livingSpaceTypeId: spaceType.id, year } },
      create: { livingSpaceTypeId: spaceType.id, year, amount: def.amountNaira * 100 },
      update: {},
    });
    spaceTypes.push(spaceType);
  }

  const devPassword = "password123";
  const passwordHash = await hashPassword(devPassword);

  const landlordUser = await prisma.user.upsert({
    where: { email: "landlord@example.com" },
    create: {
      role: Role.LANDLORD,
      name: "Sample Landlord",
      email: "landlord@example.com",
      passwordHash,
    },
    update: {},
  });
  const landlord = await prisma.landlord.upsert({
    where: { userId: landlordUser.id },
    create: { userId: landlordUser.id, fullName: "Sample Landlord", phone: "+2348000000001" },
    update: {},
  });

  let house = await prisma.house.findFirst({
    where: { estateId: estate.id, houseNumber: "A01" },
  });
  if (!house) {
    house = await prisma.house.create({
      data: {
        estateId: estate.id,
        landlordId: landlord.id,
        houseNumber: "A01",
        houseCode: generateHouseCode(),
      },
    });
  }

  let tenant = await prisma.tenant.findFirst({ where: { houseId: house.id } });
  if (!tenant) {
    tenant = await prisma.tenant.create({
      data: {
        houseId: house.id,
        livingSpaceTypeId: spaceTypes[1].id, // 2 Bedroom
        fullName: "Sample Tenant",
        phone: "+2348000000002",
        tenantCode: generateTenantCode(),
        moveInDate: new Date(),
      },
    });
  }

  const securityUser = await prisma.user.upsert({
    where: { email: "security@example.com" },
    create: {
      role: Role.SECURITY,
      name: "Sample Security",
      email: "security@example.com",
      passwordHash,
    },
    update: {},
  });
  await prisma.security.upsert({
    where: { userId: securityUser.id },
    create: { userId: securityUser.id, fullName: "Sample Security" },
    update: {},
  });

  console.log("\nSeed complete. Dev credentials:\n");
  console.log(`  Landlord login:  landlord@example.com / ${devPassword}`);
  console.log(`  Security login:  security@example.com / ${devPassword}`);
  console.log(`  Tenant login:    House Code ${house.houseCode}  +  Tenant Code ${tenant.tenantCode}`);
  console.log("");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
