import {
  CanActivate,
  Injectable,
  ServiceUnavailableException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class OperationsReadyGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}
  async canActivate() {
    if (!(await this.prisma.operationalSchemaReady()))
      throw new ServiceUnavailableException(
        "Este módulo necesita activar la migración de operaciones. El resto de la tienda sigue disponible.",
      );
    return true;
  }
}
