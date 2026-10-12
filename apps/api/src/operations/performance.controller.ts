import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import { Role } from "@prisma/client";
import { Roles } from "../common/decorators/roles.decorator";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { RolesGuard } from "../common/guards/roles.guard";
import {
  PerformanceBatchDto,
  PerformanceQueryDto,
} from "./dto/performance.dto";
import { PerformanceService } from "./performance.service";
@Controller("performance-samples")
export class PerformanceSamplesController {
  constructor(private readonly service: PerformanceService) {}
  @Post()
  @HttpCode(202)
  @Throttle({ default: { limit: 12, ttl: 60000 } })
  record(@Body() dto: PerformanceBatchDto) {
    return this.service.record(dto);
  }
}
@Controller("admin/operations/performance")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class PerformanceReportController {
  constructor(private readonly service: PerformanceService) {}
  @Get() report(@Query() query: PerformanceQueryDto) {
    return this.service.report(query);
  }
}
