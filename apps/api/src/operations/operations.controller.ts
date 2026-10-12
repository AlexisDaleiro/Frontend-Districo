import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Patch,
  Post,
  Query,
  UnauthorizedException,
  UseGuards,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Role } from "@prisma/client";
import { createHash, timingSafeEqual } from "node:crypto";
import { Throttle } from "@nestjs/throttler";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { Roles } from "../common/decorators/roles.decorator";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { RolesGuard } from "../common/guards/roles.guard";
import { JwtUser } from "../common/types/jwt-user.type";
import {
  CandidateActivityDto,
  CustomerInquiryDto,
  CvRetentionDto,
  DeliveryDto,
  FollowupDto,
  FulfillmentDto,
  InquiryAssignmentDto,
  InquiryEntryDto,
  MovementDto,
  MovementImportDto,
  OperationsQueryDto,
  ReconcileDto,
  UsageEventDto,
  VoidMatchDto,
} from "./dto/operations.dto";
import { FinanceService } from "./finance.service";
import { LogisticsService } from "./logistics.service";
import { PortfolioService } from "./portfolio.service";
import { MetricsService } from "./metrics.service";
import { SupportService } from "./support.service";
import { RecruitmentService } from "./recruitment.service";
import { PrismaService } from "../prisma/prisma.service";
import { OperationsReadyGuard } from "./operations-ready.guard";
import { PerformanceService } from "./performance.service";

@Controller("admin/operations")
@UseGuards(JwtAuthGuard, RolesGuard, OperationsReadyGuard)
@Roles(Role.ADMIN)
export class OperationsController {
  constructor(
    private readonly finance: FinanceService,
    private readonly logistics: LogisticsService,
    private readonly portfolio: PortfolioService,
    private readonly metrics: MetricsService,
    private readonly support: SupportService,
    private readonly recruitment: RecruitmentService,
  ) {}
  @Get("finance/movements") movements(@Query() query: OperationsQueryDto) {
    return this.finance.movements(query);
  }
  @Post("finance/movements") movement(
    @Body() dto: MovementDto,
    @CurrentUser() user: JwtUser,
  ) {
    return this.finance.createMovement(dto, user);
  }
  @Post("finance/movements/import/preview") importPreview(
    @Body() dto: MovementImportDto,
  ) {
    return this.finance.importPreview(dto.csv);
  }
  @Post("finance/movements/import") importMovements(
    @Body() dto: MovementImportDto,
    @CurrentUser() user: JwtUser,
  ) {
    return this.finance.importMovements(dto, user);
  }
  @Get("finance/payments") payments(@Query() query: OperationsQueryDto) {
    return this.finance.payments(query);
  }
  @Post("finance/reconciliations") reconcile(
    @Body() dto: ReconcileDto,
    @CurrentUser() user: JwtUser,
  ) {
    return this.finance.reconcile(dto, user);
  }
  @Patch("finance/reconciliations/:id/void") voidMatch(
    @Param("id") id: string,
    @Body() dto: VoidMatchDto,
    @CurrentUser() user: JwtUser,
  ) {
    return this.finance.voidMatch(id, dto.reason, user);
  }
  @Get("finance/receivables") receivables(@Query() query: OperationsQueryDto) {
    return this.finance.receivables(query);
  }
  @Post("finance/orders/:id/followups") followup(
    @Param("id") id: string,
    @Body() dto: FollowupDto,
    @CurrentUser() user: JwtUser,
  ) {
    return this.finance.followup(id, dto, user);
  }
  @Get("logistics") picking(@Query() query: OperationsQueryDto) {
    return this.logistics.list(query);
  }
  @Post("logistics/orders/:id/fulfillments") prepare(
    @Param("id") id: string,
    @Body() dto: FulfillmentDto,
    @CurrentUser() user: JwtUser,
  ) {
    return this.logistics.prepare(id, dto, user);
  }
  @Patch("logistics/fulfillments/:id/delivery") deliver(
    @Param("id") id: string,
    @Body() dto: DeliveryDto,
    @CurrentUser() user: JwtUser,
  ) {
    return this.logistics.deliver(id, dto, user);
  }
  @Get("portfolio") priorities(
    @Query() query: OperationsQueryDto,
    @CurrentUser() user: JwtUser,
  ) {
    return this.portfolio.list(user, query);
  }
  @Get("metrics") report(@Query() query: OperationsQueryDto) {
    return this.metrics.report(query);
  }
  @Get("support/lookups") lookups(
    @Query() query: OperationsQueryDto,
    @CurrentUser() user: JwtUser,
  ) {
    return this.support.lookups(user, query.search);
  }
  @Get("support/:id") inquiry(
    @Param("id") id: string,
    @CurrentUser() user: JwtUser,
  ) {
    return this.support.detail(id, user);
  }
  @Patch("support/:id") assign(
    @Param("id") id: string,
    @Body() dto: InquiryAssignmentDto,
    @CurrentUser() user: JwtUser,
  ) {
    return this.support.assign(id, dto, user);
  }
  @Post("support/:id/entries") reply(
    @Param("id") id: string,
    @Body() dto: InquiryEntryDto,
    @CurrentUser() user: JwtUser,
  ) {
    return this.support.addEntry(id, dto, user);
  }
  @Get("recruitment/interviews") interviews(
    @Query() query: OperationsQueryDto,
  ) {
    return this.recruitment.interviews(query);
  }
  @Get("recruitment/:id") activities(@Param("id") id: string) {
    return this.recruitment.activities(id);
  }
  @Post("recruitment/:id") activity(
    @Param("id") id: string,
    @Body() dto: CandidateActivityDto,
    @CurrentUser() user: JwtUser,
  ) {
    return this.recruitment.add(id, dto, user);
  }
  @Patch("recruitment/:id/retention") retention(
    @Param("id") id: string,
    @Body() dto: CvRetentionDto,
    @CurrentUser() user: JwtUser,
  ) {
    return this.recruitment.retention(id, dto.months, user);
  }
  @Post("recruitment/maintenance/cleanup") cleanup(
    @CurrentUser() user: JwtUser,
  ) {
    return this.recruitment.cleanup(user);
  }
}

@Controller("usage-events")
@UseGuards(OperationsReadyGuard)
export class UsageEventsController {
  constructor(private readonly metrics: MetricsService) {}
  @Post() @Throttle({ default: { limit: 20, ttl: 60000 } }) record(
    @Body() dto: UsageEventDto,
  ) {
    return this.metrics.record(dto);
  }
}

@Controller("account/queries")
@UseGuards(JwtAuthGuard, OperationsReadyGuard)
export class CustomerQueriesController {
  constructor(private readonly support: SupportService) {}
  @Get() threads(@CurrentUser() user: JwtUser) {
    return this.support.myThreads(user);
  }
  @Post() @Throttle({ default: { limit: 5, ttl: 60000 } }) create(
    @Body() dto: CustomerInquiryDto,
    @CurrentUser() user: JwtUser,
  ) {
    return this.support.createMine(dto, user);
  }
}

@Controller("internal/operations")
export class OperationsMaintenanceController {
  constructor(
    private readonly config: ConfigService,
    private readonly recruitment: RecruitmentService,
    private readonly prisma: PrismaService,
    private readonly performance: PerformanceService,
  ) {}
  @Post("maintenance") async maintenance(
    @Headers("authorization") authorization?: string,
  ) {
    const secret = this.config.get<string>("OPERATIONS_CRON_SECRET") ?? "";
    if (
      secret.length < 32 ||
      !timingSafeEqual(
        createHash("sha256")
          .update(authorization ?? "")
          .digest(),
        createHash("sha256").update(`Bearer ${secret}`).digest(),
      )
    )
      throw new UnauthorizedException();
    const expiredPerformanceRemoved = await this.performance.removeExpired();
    if (!(await this.prisma.operationalSchemaReady())) return { active: false, expiredPerformanceRemoved };
    const result = await this.recruitment.cleanup({
      role: Role.ADMIN,
      sub: "scheduled-maintenance",
      email: "",
      permissions: [],
    });
    const events = await this.prisma.usageEvent.deleteMany({
      where: { createdAt: { lt: new Date(Date.now() - 90 * 86400000) } },
    });
    return { ...result, expiredMetricsRemoved: events.count, expiredPerformanceRemoved };
  }
}
