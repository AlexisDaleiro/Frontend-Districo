import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
export interface EmailProvider {
    send(event: string, recipient?: string, payload?: Prisma.InputJsonValue): Promise<void>;
}
export declare class NotificationsService {
    private readonly prisma;
    private readonly provider;
    constructor(prisma: PrismaService);
    notify(event: string, recipient?: string, payload?: Prisma.InputJsonValue): Promise<{
        id: string;
        createdAt: Date;
        event: string;
        recipient: string | null;
        payload: Prisma.JsonValue | null;
        provider: string;
    }>;
}
