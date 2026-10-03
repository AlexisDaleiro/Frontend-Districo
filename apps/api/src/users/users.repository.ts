import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UsersRepository {
  constructor(private readonly prisma: PrismaService) {}

  findByEmail(email: string) {
    return this.prisma.user.findUnique({
      where: { email },
      include: { permissions: true, customRole: { select: { id: true, name: true } }, customerAccount: { include: {
        addresses: { orderBy: [{ createdAt: 'asc' }, { id: 'asc' }] },
        salesperson: { select: { id: true, userId: true, name: true, phone: true, user: { select: { email: true } } } },
      } } },
    });
  }

  findById(id: string) {
    return this.prisma.user.findUnique({
      where: { id },
      include: { permissions: true, customRole: { select: { id: true, name: true } }, customerAccount: { include: {
        addresses: { orderBy: [{ createdAt: 'asc' }, { id: 'asc' }] },
        salesperson: { select: { id: true, userId: true, name: true, phone: true, user: { select: { email: true } } } },
      } } },
    });
  }
}
