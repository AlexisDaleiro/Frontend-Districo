import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UsersRepository {
  constructor(private readonly prisma: PrismaService) {}

  findByEmail(email: string) {
    return this.prisma.user.findUnique({
      where: { email },
      include: { permissions: true, customerAccount: { include: { addresses: { orderBy: [{ createdAt: 'asc' }, { id: 'asc' }] } } } },
    });
  }

  findById(id: string) {
    return this.prisma.user.findUnique({
      where: { id },
      include: { permissions: true, customerAccount: { include: { addresses: { orderBy: [{ createdAt: 'asc' }, { id: 'asc' }] } } } },
    });
  }
}
