import { prisma } from '@/lib/prisma';
import { getCurrentGarage } from '@/lib/context';

export async function getGarageContext() {
  const ctx = await getCurrentGarage();
  if (!ctx) throw new Error('Unauthorized');
  return ctx;
}

export async function updateGarage(data: Record<string, unknown>) {
  const ctx = await getGarageContext();
  return prisma.garages.update({
    where: { id: ctx.garage.id },
    data,
  });
}
