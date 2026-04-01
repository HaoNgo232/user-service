import { prisma } from '../../prisma/prisma.service';

export interface CreateItemDto {
  title: string;
  description: string;
  status: string;
}

export interface UpdateItemDto {
  title?: string;
  description?: string;
  status?: string;
}

export class ItemsService {
  async create(data: CreateItemDto) {
    return await prisma.item.create({
      data,
    });
  }

  async findAll(page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      prisma.item.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.item.count(),
    ]);

    return {
      items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findById(id: number) {
    return await prisma.item.findUnique({
      where: { id },
    });
  }

  async update(id: number, data: UpdateItemDto) {
    return await prisma.item.update({
      where: { id },
      data,
    });
  }

  async delete(id: number) {
    return await prisma.item.delete({
      where: { id },
    });
  }
}

export const itemsService = new ItemsService();
