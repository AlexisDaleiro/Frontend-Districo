import { Permission } from '@prisma/client';
export declare const PERMISSIONS_KEY = "permissions";
export declare const Permissions: (...permissions: Permission[]) => import("@nestjs/common").CustomDecorator<string>;
