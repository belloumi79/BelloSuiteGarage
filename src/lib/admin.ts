import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';

export async function requireSuperAdmin() {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const dbUser = await prisma.users.findUnique({
    where: { id: user.id },
    select: { is_super_admin: true },
  });

  if (!dbUser?.is_super_admin) {
    throw new Error('Forbidden: super admin only');
  }

  return user;
}

