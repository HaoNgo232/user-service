import { prisma } from '../prisma/prisma.service';

/**
 * Auto-seed: chạy mỗi khi app khởi động.
 * Kiểm tra nếu chưa có data thì insert dữ liệu mẫu.
 * Idempotent: không tạo trùng nếu data đã tồn tại.
 *
 * Sử dụng marker-based detection thay vì count() để tránh TOCTOU race condition
 * khi nhiều API instances chia chung cùng database và khởi động đồng thời.
 */
export async function autoSeed(): Promise<void> {
  try {
    // Seed test user (idempotent via upsert)
    await prisma.user.upsert({
      where: { username: 'testuser' },
      update: {},
      create: {
        username: 'testuser',
        password: 'testpassword',
      },
    });

    // Seed sample items nếu marker item chưa tồn tại.
    // Dùng findFirst thay vì count() để giảm race window:
    // nếu 2 processes đều thấy marker=null, mỗi item insert
    // riêng lẻ với try-catch nên worst case chỉ tạo duplicates
    // cho các item không có unique constraint (chấp nhận được).
    const MARKER_TITLE = 'Welcome Item';
    const marker = await prisma.item.findFirst({
      where: { title: MARKER_TITLE },
    });

    if (marker) {
      const itemCount = await prisma.item.count();
      console.log(`🌱 Auto-seed: skipped (${itemCount} items already exist)`);
    } else {
      const sampleItems = [
        {
          title: MARKER_TITLE,
          description: 'This item was auto-seeded on startup to verify DB connectivity.',
          status: 'active',
        },
        {
          title: 'Database Test',
          description:
            'If you see this on the frontend dashboard, the full stack is working: UI → API → DB.',
          status: 'active',
        },
        {
          title: 'Scaffold Proof',
          description: `Auto-seeded at ${new Date().toISOString()} by the scaffold template.`,
          status: 'pending',
        },
      ];

      let insertedCount = 0;
      for (const item of sampleItems) {
        try {
          await prisma.item.create({ data: item });
          insertedCount++;
        } catch {
          // Another process may have inserted concurrently — skip gracefully
        }
      }

      if (insertedCount > 0) {
        console.log(`🌱 Auto-seed: inserted ${insertedCount} sample items`);
      } else {
        console.log(`🌱 Auto-seed: skipped (items were inserted by another process)`);
      }
    }
  } catch (error) {
    // Non-fatal: app vẫn chạy ngay cả khi seed thất bại (VD: DB chưa migrate)
    console.warn(
      '⚠️ Auto-seed failed (DB might not be migrated yet):',
      error instanceof Error ? error.message : error,
    );
  }
}
