import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { JwtUser } from '../common/types/jwt-user.type';
import { CustomerListQueryDto } from './dto/admin-list-query.dto';
import { AssignSalespersonDto } from './dto/assign-salesperson.dto';
import { SaveSalespersonDto } from './dto/save-salesperson.dto';
import { SalespeopleService } from './salespeople.service';

@ApiTags('admin')
@ApiBearerAuth()
@Controller('admin/salespeople')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class SalespeopleController {
  constructor(private readonly salespeople: SalespeopleService) {}

  @Get()
  list(@Query() query: CustomerListQueryDto) { return this.salespeople.list(query); }

  @Get(':userId')
  detail(@Param('userId') userId: string) { return this.salespeople.detail(userId); }

  @Patch(':userId')
  save(@Param('userId') userId: string, @Body() dto: SaveSalespersonDto, @CurrentUser() actor: JwtUser) {
    return this.salespeople.save(userId, dto, actor.sub);
  }

  @Post(':userId/customers')
  assign(@Param('userId') userId: string, @Body() dto: AssignSalespersonDto, @CurrentUser() actor: JwtUser) {
    return this.salespeople.assign(userId, dto.customerId, actor.sub);
  }

  @Delete(':userId/customers/:customerId')
  unassign(@Param('userId') userId: string, @Param('customerId') customerId: string, @CurrentUser() actor: JwtUser) {
    return this.salespeople.unassign(userId, customerId, actor.sub);
  }
}
