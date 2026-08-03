import { prisma } from '../src/lib/prisma';

async function main() {
  const user = await prisma.users.findUnique({ 
    where: { email: 'amiromrane82@gmail.com' }, 
    include: { garage_members: { include: { garages: true } } } 
  });
  console.log(JSON.stringify(user, null, 2));
} 

main().finally(() => prisma.$disconnect());