import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { JwtUser } from '../common/types/jwt-user.type';
import { ContactInquiriesService } from './contact-inquiries.service';
import { ContactInquiryQueryDto } from './dto/contact-inquiry-query.dto';
import { CreateContactInquiryDto } from './dto/create-contact-inquiry.dto';
import { UpdateContactInquiryDto } from './dto/update-contact-inquiry.dto';

@ApiTags('contact-inquiries')
@Controller('contact-inquiries')
export class ContactInquiriesController {
  constructor(private readonly inquiries: ContactInquiriesService) {}

  @Post()
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  create(@Body() dto: CreateContactInquiryDto) {
    return this.inquiries.create(dto);
  }
}

@ApiTags('admin')
@ApiBearerAuth()
@Controller('admin/contact-inquiries')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class AdminContactInquiriesController {
  constructor(private readonly inquiries: ContactInquiriesService) {}

  @Get()
  findMany(@Query() query: ContactInquiryQueryDto) {
    return this.inquiries.findMany(query);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateContactInquiryDto, @CurrentUser() user: JwtUser) {
    return this.inquiries.update(id, dto, user.sub);
  }
}
