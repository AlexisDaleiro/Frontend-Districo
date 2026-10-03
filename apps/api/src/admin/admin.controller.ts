import { Body, Controller, Get, Param, Patch, Post, Query, Res, StreamableFile, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
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
import { VoidOrderRecordDto } from '../orders/dto/void-order-record.dto';
import { CreatePromotionDto } from '../promotions/dto/create-promotion.dto';
import { PromotionsService } from '../promotions/promotions.service';
import { CreateRecommendationRuleDto } from '../recommendations/dto/create-recommendation-rule.dto';
import { RecommendationsService } from '../recommendations/recommendations.service';
import { AdminService } from './admin.service';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { CustomerListQueryDto, OrderListQueryDto } from './dto/admin-list-query.dto';
import { SalesQueryDto } from './dto/sales-query.dto';
import { UpdateStaffRoleDto } from './dto/update-staff-role.dto';
import { InviteStaffDto } from './dto/invite-staff.dto';
import { UpdateStaffActiveDto } from './dto/update-staff-active.dto';
import { RecordCreditNoteDto } from '../orders/dto/record-credit-note.dto';
import { RecordRefundDto } from '../orders/dto/record-refund.dto';
import { ApplicationListQueryDto } from './dto/application-list-query.dto';
import { UpdateStaffAccessDto } from './dto/update-staff-access.dto';
import { CreateStaffRoleDto } from './dto/create-staff-role.dto';

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
  @Roles(Role.ADMIN, Role.SALES, Role.CATALOG, Role.FINANCE)
  dashboard() {
    return this.admin.dashboard();
  }

  @Get('sales')
  @Roles(Role.ADMIN, Role.SALES, Role.FINANCE)
  sales(@Query() query: SalesQueryDto) {
    return this.admin.sales(query.period);
  }

  @Get('customers')
  @Roles(Role.ADMIN, Role.SALES, Role.FINANCE)
  customers(@CurrentUser() user: JwtUser) {
    return this.admin.customers(user);
  }

  @Get('customers/page')
  @Roles(Role.ADMIN, Role.SALES, Role.FINANCE)
  customersPage(@Query() query: CustomerListQueryDto, @CurrentUser() user: JwtUser) {
    return this.admin.customersPage(query, user);
  }

  @Get('customers/:id')
  @Roles(Role.ADMIN, Role.SALES, Role.FINANCE)
  customerDetail(@Param('id') id: string, @CurrentUser() user: JwtUser) {
    return this.admin.customerDetail(id, user);
  }

  @Get('customers/:id/documents/:documentId')
  @Roles(Role.ADMIN, Role.SALES, Role.FINANCE)
  async downloadCustomerDocument(@Param('id') id: string, @Param('documentId') documentId: string, @Query('preview') preview: string | undefined, @Res({ passthrough: true }) response: Response) {
    const document = await this.applications.customerDocument(id, documentId);
    response.set({
      'Content-Type': document.mimeType,
      'Content-Disposition': `${preview === '1' ? 'inline' : 'attachment'}; filename="permiso"; filename*=UTF-8''${encodeURIComponent(document.name)}`,
      'Content-Length': String(document.bytes.length),
      'Cache-Control': 'no-store, private',
      'X-Content-Type-Options': 'nosniff',
    });
    return new StreamableFile(document.bytes);
  }

  @Patch('customers/:id')
  updateCustomer(@Param('id') id: string, @Body() dto: UpdateCustomerDto, @CurrentUser() user: JwtUser) {
    return this.admin.updateCustomer(id, dto, user.sub);
  }

  @Get('applications')
  @Roles(Role.ADMIN, Role.SALES)
  applicationsList() {
    return this.admin.applicationsAdmin();
  }

  @Get('applications/page')
  @Roles(Role.ADMIN, Role.SALES)
  applicationsPage(@Query() query: ApplicationListQueryDto) {
    return this.applications.findPage(query);
  }

  @Get('applications/:id/documents/:documentId')
  @Roles(Role.ADMIN, Role.SALES)
  async downloadApplicationDocument(@Param('id') id: string, @Param('documentId') documentId: string, @Query('preview') preview: string | undefined, @Res({ passthrough: true }) response: Response) {
    const document = await this.applications.document(id, documentId);
    response.set({
      'Content-Type': document.mimeType,
      'Content-Disposition': `${preview === '1' ? 'inline' : 'attachment'}; filename="permiso"; filename*=UTF-8''${encodeURIComponent(document.name)}`,
      'Content-Length': String(document.bytes.length),
      'Cache-Control': 'no-store, private',
      'X-Content-Type-Options': 'nosniff',
    });
    return new StreamableFile(document.bytes);
  }

  @Post('applications/:id/documents')
  @Roles(Role.ADMIN, Role.SALES)
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 5_000_000, files: 1 } }))
  addApplicationDocument(@Param('id') id: string, @UploadedFile() file: { buffer: Buffer; size: number; originalname: string; mimetype: string } | undefined, @CurrentUser() user: JwtUser) {
    return this.applications.addDocument(id, file, user.sub);
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
  @Roles(Role.ADMIN, Role.SALES, Role.FINANCE)
  ordersList(@CurrentUser() user: JwtUser) {
    return this.admin.ordersAdmin(user);
  }

  @Get('orders/page')
  @Roles(Role.ADMIN, Role.SALES, Role.FINANCE)
  ordersPage(@Query() query: OrderListQueryDto, @CurrentUser() user: JwtUser) {
    return this.admin.ordersPage(query, user);
  }

  @Get('orders/export')
  @Roles(Role.ADMIN, Role.SALES, Role.FINANCE)
  async exportOrders(@Query() query: OrderListQueryDto, @CurrentUser() user: JwtUser, @Res({ passthrough: true }) response: Response) {
    const csv = await this.admin.ordersCsv(query, user);
    const date = new Intl.DateTimeFormat('sv-SE', { timeZone: 'America/Montevideo' }).format(new Date());
    response.set({ 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': `attachment; filename="pedidos-${date}.csv"`, 'Cache-Control': 'no-store, private' });
    return new StreamableFile(csv);
  }

  @Get('orders/:id')
  @Roles(Role.ADMIN, Role.SALES, Role.FINANCE)
  orderDetail(@Param('id') id: string, @CurrentUser() user: JwtUser) {
    return this.admin.orderDetail(id, user);
  }

  @Post('orders/:id/payments')
  @Roles(Role.ADMIN, Role.FINANCE)
  recordPayment(@Param('id') id: string, @Body() dto: RecordOrderPaymentDto, @CurrentUser() user: JwtUser) {
    return this.billing.recordPayment(id, dto, user.sub);
  }

  @Post('orders/:id/payments/:paymentId/void')
  @Roles(Role.ADMIN, Role.FINANCE)
  voidPayment(@Param('id') id: string, @Param('paymentId') paymentId: string, @Body() dto: VoidOrderRecordDto, @CurrentUser() user: JwtUser) {
    return this.billing.voidPayment(id, paymentId, dto, user.sub);
  }

  @Post('orders/:id/invoices')
  @Roles(Role.ADMIN, Role.FINANCE)
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: MAX_INVOICE_BYTES, files: 1 } }))
  attachInvoice(@Param('id') id: string, @UploadedFile() file: { buffer: Buffer; size: number; originalname: string } | undefined, @Body() dto: AttachOrderInvoiceDto, @CurrentUser() user: JwtUser) {
    return this.billing.attachInvoice(id, file, dto, user.sub);
  }

  @Post('orders/:id/invoices/:invoiceId/void')
  @Roles(Role.ADMIN, Role.FINANCE)
  voidInvoice(@Param('id') id: string, @Param('invoiceId') invoiceId: string, @Body() dto: VoidOrderRecordDto, @CurrentUser() user: JwtUser) {
    return this.billing.voidInvoice(id, invoiceId, dto, user.sub);
  }

  @Get('orders/:id/invoices/:invoiceId')
  @Roles(Role.ADMIN, Role.FINANCE)
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
  @Roles(Role.ADMIN, Role.SALES)
  updateOrderStatus(@Param('id') id: string, @Body() dto: UpdateOrderStatusDto, @CurrentUser() user: JwtUser) {
    return this.orders.updateStatus(id, dto.status, user.sub, dto.reviewReason);
  }

  @Post('orders/:id/approve')
  @Roles(Role.ADMIN, Role.SALES)
  approveOrder(@Param('id') id: string, @CurrentUser() user: JwtUser) {
    return this.orders.updateStatus(id, OrderStatus.APPROVED, user.sub);
  }

  @Post('orders/:id/reject')
  @Roles(Role.ADMIN, Role.SALES)
  rejectOrder(@Param('id') id: string, @CurrentUser() user: JwtUser) {
    return this.orders.updateStatus(id, OrderStatus.REJECTED, user.sub);
  }

  @Get('audit-logs')
  auditLogs() {
    return this.admin.auditLogs();
  }

  @Get('promotions')
  @Roles(Role.ADMIN, Role.CATALOG)
  promotionsList() {
    return this.promotions.findMany();
  }

  @Post('promotions')
  @Roles(Role.ADMIN, Role.CATALOG)
  createPromotion(@Body() dto: CreatePromotionDto, @CurrentUser() user: JwtUser) {
    return this.promotions.create(dto, user.sub);
  }

  @Get('recommendations')
  @Roles(Role.ADMIN, Role.CATALOG)
  recommendationsList() {
    return this.recommendations.findMany();
  }

  @Post('recommendations')
  @Roles(Role.ADMIN, Role.CATALOG)
  createRecommendation(@Body() dto: CreateRecommendationRuleDto, @CurrentUser() user: JwtUser) {
    return this.recommendations.create(dto, user.sub);
  }

  @Get('staff')
  staff() {
    return this.admin.staff();
  }

  @Get('staff/access')
  staffAccess() {
    return this.admin.staffRoleAccess();
  }

  @Patch('staff/access/:role')
  updateStaffAccess(@Param('role') role: Role, @Body() dto: UpdateStaffAccessDto, @CurrentUser() user: JwtUser) {
    return this.admin.updateStaffRoleAccess(role, dto.entries, user.sub);
  }

  @Post('staff/roles')
  createStaffRole(@Body() dto: CreateStaffRoleDto, @CurrentUser() user: JwtUser) {
    return this.admin.createCustomRole(dto.name, user.sub);
  }

  @Patch('staff/roles/:id/access')
  updateCustomRoleAccess(@Param('id') id: string, @Body() dto: UpdateStaffAccessDto, @CurrentUser() user: JwtUser) {
    return this.admin.updateCustomRoleAccess(id, dto.entries, user.sub);
  }

  @Post('staff/invitations')
  inviteStaff(@Body() dto: InviteStaffDto, @CurrentUser() user: JwtUser) {
    return this.admin.inviteStaff(dto.email, dto.role, user.sub, dto.customRoleId);
  }

  @Patch('staff/:id/active')
  updateStaffActive(@Param('id') id: string, @Body() dto: UpdateStaffActiveDto, @CurrentUser() user: JwtUser) {
    return this.admin.updateStaffActive(id, dto.active, user.sub);
  }

  @Patch('staff/:id/role')
  updateStaffRole(@Param('id') id: string, @Body() dto: UpdateStaffRoleDto, @CurrentUser() user: JwtUser) {
    return this.admin.updateStaffRole(id, dto.role, user.sub, dto.customRoleId);
  }

  @Post('orders/:id/credit-notes')
  @Roles(Role.ADMIN, Role.FINANCE)
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: MAX_INVOICE_BYTES, files: 1 } }))
  recordCreditNote(@Param('id') id: string, @UploadedFile() file: { buffer: Buffer; size: number; originalname: string } | undefined, @Body() dto: RecordCreditNoteDto, @CurrentUser() user: JwtUser) {
    return this.billing.recordCreditNote(id, file, dto, user.sub);
  }

  @Get('orders/:id/credit-notes/:noteId')
  @Roles(Role.ADMIN, Role.FINANCE)
  async downloadCreditNote(@Param('id') id: string, @Param('noteId') noteId: string, @Res({ passthrough: true }) response: Response) {
    const note = await this.billing.creditNote(id, noteId);
    response.set({
      'Content-Type': note.mimeType,
      'Content-Disposition': `attachment; filename="nota-credito"; filename*=UTF-8''${encodeURIComponent(note.name)}`,
      'Content-Length': String(note.bytes.length),
      'Cache-Control': 'no-store, private',
      'X-Content-Type-Options': 'nosniff',
    });
    return new StreamableFile(note.bytes);
  }

  @Post('orders/:id/refunds')
  @Roles(Role.ADMIN, Role.FINANCE)
  recordRefund(@Param('id') id: string, @Body() dto: RecordRefundDto, @CurrentUser() user: JwtUser) {
    return this.billing.recordRefund(id, dto, user.sub);
  }
}
