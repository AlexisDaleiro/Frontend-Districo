import { Body, Controller, Get, Param, Patch, Post, Res, StreamableFile, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { OrderStatus, Role } from '@prisma/client';
import { ApplicationsService } from '../applications/applications.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { JwtUser } from '../common/types/jwt-user.type';
import { ReviewApplicationDto } from '../applications/dto/review-application.dto';
import { UpdateOrderStatusDto } from '../orders/dto/update-order-status.dto';
import { OrdersService } from '../orders/orders.service';
import { OrderBillingService, MAX_INVOICE_BYTES } from '../orders/order-billing.service';
import { RecordOrderPaymentDto } from '../orders/dto/record-order-payment.dto';
import { AttachOrderInvoiceDto } from '../orders/dto/attach-order-invoice.dto';
import { CreatePromotionDto } from '../promotions/dto/create-promotion.dto';
import { PromotionsService } from '../promotions/promotions.service';
import { CreateRecommendationRuleDto } from '../recommendations/dto/create-recommendation-rule.dto';
import { RecommendationsService } from '../recommendations/recommendations.service';
import { AdminService } from './admin.service';
import { UpdateCustomerDto } from './dto/update-customer.dto';

@ApiTags('admin')
@ApiBearerAuth()
@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class AdminController {
  constructor(
    private readonly admin: AdminService,
    private readonly applications: ApplicationsService,
    private readonly orders: OrdersService,
    private readonly billing: OrderBillingService,
    private readonly promotions: PromotionsService,
    private readonly recommendations: RecommendationsService,
  ) {}

  @Get('dashboard')
  dashboard() {
    return this.admin.dashboard();
  }

  @Get('customers')
  customers() {
    return this.admin.customers();
  }

  @Patch('customers/:id')
  updateCustomer(@Param('id') id: string, @Body() dto: UpdateCustomerDto, @CurrentUser() user: JwtUser) {
    return this.admin.updateCustomer(id, dto, user.sub);
  }

  @Get('applications')
  applicationsList() {
    return this.admin.applicationsAdmin();
  }

  @Post('applications/:id/approve')
  approveApplication(@Param('id') id: string, @Body() dto: ReviewApplicationDto, @CurrentUser() user: JwtUser) {
    return this.applications.approve(id, user.sub, dto.medicationPermission ?? false);
  }

  @Post('applications/:id/reject')
  rejectApplication(@Param('id') id: string, @Body() dto: ReviewApplicationDto, @CurrentUser() user: JwtUser) {
    return this.applications.reject(id, user.sub, dto.rejectionReason);
  }

  @Get('orders')
  ordersList() {
    return this.admin.ordersAdmin();
  }

  @Post('orders/:id/payments')
  recordPayment(@Param('id') id: string, @Body() dto: RecordOrderPaymentDto, @CurrentUser() user: JwtUser) {
    return this.billing.recordPayment(id, dto, user.sub);
  }

  @Post('orders/:id/invoices')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: MAX_INVOICE_BYTES, files: 1 } }))
  attachInvoice(@Param('id') id: string, @UploadedFile() file: { buffer: Buffer; size: number; originalname: string }, @Body() dto: AttachOrderInvoiceDto, @CurrentUser() user: JwtUser) {
    return this.billing.attachInvoice(id, file, dto, user.sub);
  }

  @Get('orders/:id/invoices/:invoiceId')
  async downloadInvoice(@Param('id') id: string, @Param('invoiceId') invoiceId: string, @Res({ passthrough: true }) response: Response) {
    const invoice = await this.billing.invoice(id, invoiceId);
    response.set({
      'Content-Type': invoice.mimeType,
      'Content-Disposition': `attachment; filename="factura"; filename*=UTF-8''${encodeURIComponent(invoice.name)}`,
      'Content-Length': String(invoice.bytes.length),
      'Cache-Control': 'no-store, private',
      'X-Content-Type-Options': 'nosniff',
    });
    return new StreamableFile(invoice.bytes);
  }

  @Patch('orders/:id/status')
  updateOrderStatus(@Param('id') id: string, @Body() dto: UpdateOrderStatusDto, @CurrentUser() user: JwtUser) {
    return this.orders.updateStatus(id, dto.status, user.sub, dto.reviewReason);
  }

  @Post('orders/:id/approve')
  approveOrder(@Param('id') id: string, @CurrentUser() user: JwtUser) {
    return this.orders.updateStatus(id, OrderStatus.APPROVED, user.sub);
  }

  @Post('orders/:id/reject')
  rejectOrder(@Param('id') id: string, @CurrentUser() user: JwtUser) {
    return this.orders.updateStatus(id, OrderStatus.REJECTED, user.sub);
  }

  @Get('audit-logs')
  auditLogs() {
    return this.admin.auditLogs();
  }

  @Get('promotions')
  promotionsList() {
    return this.promotions.findMany();
  }

  @Post('promotions')
  createPromotion(@Body() dto: CreatePromotionDto, @CurrentUser() user: JwtUser) {
    return this.promotions.create(dto, user.sub);
  }

  @Get('recommendations')
  recommendationsList() {
    return this.recommendations.findMany();
  }

  @Post('recommendations')
  createRecommendation(@Body() dto: CreateRecommendationRuleDto, @CurrentUser() user: JwtUser) {
    return this.recommendations.create(dto, user.sub);
  }
}
