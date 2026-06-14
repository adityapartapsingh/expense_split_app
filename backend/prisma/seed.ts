// Seed script: creates the initial users and group with correct membership dates.
// Run with: npx prisma db seed
//
// Users:
//   Aisha, Rohan, Priya — original flatmates (Feb 1)
//   Meera — original flatmate, moved out March 31
//   Dev — trip guest, March 8–14
//   Sam — moved in April 10
//
// Group: "Flat 4B"

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Default password for all seeded users (they should change it)
  const defaultPasswordHash = await bcrypt.hash('password123', 10);

  // ─── Create Users ─────────────────────────────────────────────
  const users = await Promise.all([
    prisma.user.upsert({
      where: { username: 'aisha' },
      update: {},
      create: {
        email: 'aisha@example.com',
        username: 'aisha',
        displayName: 'Aisha',
        passwordHash: defaultPasswordHash,
      },
    }),
    prisma.user.upsert({
      where: { username: 'rohan' },
      update: {},
      create: {
        email: 'rohan@example.com',
        username: 'rohan',
        displayName: 'Rohan',
        passwordHash: defaultPasswordHash,
      },
    }),
    prisma.user.upsert({
      where: { username: 'priya' },
      update: {},
      create: {
        email: 'priya@example.com',
        username: 'priya',
        displayName: 'Priya',
        passwordHash: defaultPasswordHash,
      },
    }),
    prisma.user.upsert({
      where: { username: 'meera' },
      update: {},
      create: {
        email: 'meera@example.com',
        username: 'meera',
        displayName: 'Meera',
        passwordHash: defaultPasswordHash,
      },
    }),
    prisma.user.upsert({
      where: { username: 'sam' },
      update: {},
      create: {
        email: 'sam@example.com',
        username: 'sam',
        displayName: 'Sam',
        passwordHash: defaultPasswordHash,
      },
    }),
    prisma.user.upsert({
      where: { username: 'dev' },
      update: {},
      create: {
        email: 'dev@example.com',
        username: 'dev',
        displayName: 'Dev',
        passwordHash: defaultPasswordHash,
      },
    }),
  ]);

  const [aisha, rohan, priya, meera, sam, dev] = users;

  console.log(`✅ Created ${users.length} users`);

  // ─── Create Group ─────────────────────────────────────────────
  const group = await prisma.group.upsert({
    where: { id: 1 },
    update: {},
    create: {
      name: 'Flat 4B',
      description: 'Shared flat expenses for our apartment',
      defaultCurrency: 'INR',
      createdById: aisha.id,
    },
  });

  console.log(`✅ Created group: ${group.name}`);

  // ─── Add Members with Correct Dates ───────────────────────────
  // Clear existing memberships to avoid duplicates on re-seed
  await prisma.groupMember.deleteMany({ where: { groupId: group.id } });

  const memberships = await Promise.all([
    // Aisha — original flatmate, still active
    prisma.groupMember.create({
      data: {
        groupId: group.id,
        userId: aisha.id,
        joinedAt: new Date('2026-02-01'),
        leftAt: null,
        role: 'admin',
      },
    }),
    // Rohan — original flatmate, still active
    prisma.groupMember.create({
      data: {
        groupId: group.id,
        userId: rohan.id,
        joinedAt: new Date('2026-02-01'),
        leftAt: null,
        role: 'member',
      },
    }),
    // Priya — original flatmate, still active
    prisma.groupMember.create({
      data: {
        groupId: group.id,
        userId: priya.id,
        joinedAt: new Date('2026-02-01'),
        leftAt: null,
        role: 'member',
      },
    }),
    // Meera — moved out end of March
    prisma.groupMember.create({
      data: {
        groupId: group.id,
        userId: meera.id,
        joinedAt: new Date('2026-02-01'),
        leftAt: new Date('2026-03-31'),
        role: 'member',
      },
    }),
    // Dev — trip guest, March 8–14
    prisma.groupMember.create({
      data: {
        groupId: group.id,
        userId: dev.id,
        joinedAt: new Date('2026-03-08'),
        leftAt: new Date('2026-03-14'),
        role: 'member',
      },
    }),
    // Sam — moved in mid-April
    prisma.groupMember.create({
      data: {
        groupId: group.id,
        userId: sam.id,
        joinedAt: new Date('2026-04-10'),
        leftAt: null,
        role: 'member',
      },
    }),
  ]);

  console.log(`✅ Added ${memberships.length} group memberships`);

  console.log('\n🎉 Seed completed successfully!');
  console.log('\nSeeded users (all passwords: "password123"):');
  users.forEach((u) => {
    console.log(`  - ${u.displayName} (${u.username})`);
  });
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
