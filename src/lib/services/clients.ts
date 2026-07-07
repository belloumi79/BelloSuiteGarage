import { prisma } from '@/lib/prisma';
import { getGarageContext } from './garage';

export async function listClients(page = 1, pageSize = 50) {
  const ctx = await getGarageContext();
  const skip = (page - 1) * pageSize;

  const [data, total] = await Promise.all([
    prisma.clients.findMany({
      where: { garage_id: ctx.garage.id },
      orderBy: { created_at: 'desc' },
      skip,
      take: pageSize,
    }),
    prisma.clients.count({ where: { garage_id: ctx.garage.id } }),
  ]);

  return { data, total, page, pageSize };
}

export async function getClient(id: string) {
  const ctx = await getGarageContext();
  return prisma.clients.findFirst({ where: { id, garage_id: ctx.garage.id } });
}

export async function createClient(data: Record<string, unknown>) {
  const ctx = await getGarageContext();
  return prisma.clients.create({ data: { ...data, garage_id: ctx.garage.id } as any });
}

export async function updateClient(id: string, data: Record<string, unknown>) {
  const ctx = await getGarageContext();
  return prisma.clients.update({ where: { id }, data: data as any });
}

export async function deleteClient(id: string) {
  const ctx = await getGarageContext();
  return prisma.clients.delete({ where: { id } });
}
