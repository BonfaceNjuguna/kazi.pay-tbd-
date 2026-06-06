import 'dotenv/config';

import { PrismaClient, SubscriptionPlan } from '@prisma/client';
import bcrypt from 'bcryptjs';

/**
 * Seed script — mirrors the two demo users from the MSW handlers so the
 * frontend's testing scenarios work identically against the real backend.
 *
 *   DEMO_USER   rowlex@demo.perxli.com / Demo1234!   verified + onboarded
 *   TEST_USER   test@demo.perxli.com   / Test1234!   verified, NOT onboarded
 *
 * Idempotent — `upsert` so re-running doesn't error or duplicate.
 */

const prisma = new PrismaClient();
const COST = 12;

async function main() {
  const demoPasswordHash = await bcrypt.hash('Demo1234!', COST);
  const testPasswordHash = await bcrypt.hash('Test1234!', COST);

  await prisma.user.upsert({
    where: { email: 'rowlex@demo.perxli.com' },
    update: {},
    create: {
      email: 'rowlex@demo.perxli.com',
      passwordHash: demoPasswordHash,
      fullName: 'Rowlex Karimi',
      emailVerified: true,
      profession: 'Graphic Designer',
      city: 'Nairobi',
      businessName: 'Rowlex Karimi',
      country: 'Kenya',
      currency: 'KES',
      plan: SubscriptionPlan.FREE,
      onboardingComplete: true,
    },
  });

  await prisma.user.upsert({
    where: { email: 'test@demo.perxli.com' },
    update: {},
    create: {
      email: 'test@demo.perxli.com',
      passwordHash: testPasswordHash,
      fullName: 'Amina Otieno',
      emailVerified: true,
      profession: '',
      city: '',
      businessName: '',
      country: 'Kenya',
      currency: 'KES',
      plan: SubscriptionPlan.FREE,
      onboardingComplete: false,
    },
  });

  console.log('✅ Seeded: rowlex@demo.perxli.com (Demo1234!) — onboarded');
  console.log('✅ Seeded: test@demo.perxli.com   (Test1234!) — NOT onboarded');
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
