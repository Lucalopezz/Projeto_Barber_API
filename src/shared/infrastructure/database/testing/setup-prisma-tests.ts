import { execSync } from 'node:child_process';
import { PrismaClient } from '@prisma/client';

export function setupPrismaTests() {
  execSync('npx dotenv-cli -e .env.test -- npx prisma migrate deploy');
}

export async function clearDatabase(prismaService: PrismaClient) {
  await prismaService.appointment.deleteMany();
  await prismaService.barberTimeOff.deleteMany();
  await prismaService.barberSchedule.deleteMany();
  await prismaService.service.deleteMany();
  await prismaService.barberShop.deleteMany();
  await prismaService.user.deleteMany();
}
