import { Module } from "@nestjs/common";
import { NotificationsModule } from "../notifications/notifications.module";
import { JobsModule } from "../jobs/jobs.module";
import {
  OperationsController,
  OperationsMaintenanceController,
  CustomerQueriesController,
  UsageEventsController,
} from "./operations.controller";
import { FinanceService } from "./finance.service";
import { LogisticsService } from "./logistics.service";
import { MetricsService } from "./metrics.service";
import { PortfolioService } from "./portfolio.service";
import { RecruitmentService } from "./recruitment.service";
import { SupportService } from "./support.service";
import { OperationsReadyGuard } from "./operations-ready.guard";
@Module({
  imports: [NotificationsModule, JobsModule],
  controllers: [
    OperationsController,
    OperationsMaintenanceController,
    CustomerQueriesController,
    UsageEventsController,
  ],
  providers: [
    OperationsReadyGuard,
    FinanceService,
    LogisticsService,
    MetricsService,
    PortfolioService,
    RecruitmentService,
    SupportService,
  ],
})
export class OperationsModule {}
