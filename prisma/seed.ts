import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Create test user
  const user = await prisma.user.upsert({
    where: { username: 'testuser' },
    update: {},
    create: {
      username: 'testuser',
      password: 'testpassword',
    },
  });

  console.log('✅ Created test user:', user);

  // Create sample items
  const items = await Promise.all([
    prisma.item.create({
      data: {
        title: 'Sample Item 1',
        description: 'This is a sample item',
        status: 'active',
      },
    }),
    prisma.item.create({
      data: {
        title: 'Sample Item 2',
        description: 'Another sample item',
        status: 'pending',
      },
    }),
  ]);

  console.log('✅ Created sample items:', items.length);
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
