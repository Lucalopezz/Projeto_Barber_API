import { execFileSync } from 'node:child_process';
import { PrismaClient } from '@prisma/client';

export function setupPrismaTests() {
  const databaseUrl = new URL(process.env.DATABASE_URL ?? '');
  if (
    process.env.NODE_ENV !== 'test' ||
    databaseUrl.searchParams.get('schema') !== 'barber_api_test'
  ) {
    throw new Error(
      'Database tests require NODE_ENV=test and DATABASE_URL schema=barber_api_test',
    );
  }

  execFileSync('pnpm', ['exec', 'prisma', 'migrate', 'deploy'], {
    stdio: 'pipe',
  });
}

export async function clearDatabase(prismaService: PrismaClient) {
  await prismaService.appointment.deleteMany();
  await prismaService.barberTimeOff.deleteMany();
  await prismaService.barberSchedule.deleteMany();
  await prismaService.service.deleteMany();
  await prismaService.barberShop.deleteMany();
  await prismaService.user.deleteMany();
}
