import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { JwtUser } from '../common/types/jwt-user.type';
import { CreateRecommendationRuleDto } from './dto/create-recommendation-rule.dto';
import { RecommendationsService } from './recommendations.service';
import { IsBoolean } from 'class-validator';
import { RuleListQueryDto } from '../admin/dto/rule-list-query.dto';

class SetRecommendationActiveDto {
  @IsBoolean()
  active: boolean;
}

@ApiTags('recommendations')
@ApiBearerAuth()
@Controller('recommendations')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN, Role.CATALOG)
export class RecommendationsController {
  constructor(private readonly recommendationsService: RecommendationsService) {}

  @Get()
  findMany() {
    return this.recommendationsService.findMany();
  }

  @Get('page')
  findPage(@Query() query: RuleListQueryDto) {
    return this.recommendationsService.findPage(query);
  }

  @Post()
  create(@Body() dto: CreateRecommendationRuleDto, @CurrentUser() user: JwtUser) {
    return this.recommendationsService.create(dto, user.sub);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: CreateRecommendationRuleDto, @CurrentUser() user: JwtUser) {
    return this.recommendationsService.update(id, dto, user.sub);
  }

  @Patch(':id/active')
  setActive(@Param('id') id: string, @Body() dto: SetRecommendationActiveDto, @CurrentUser() user: JwtUser) {
    return this.recommendationsService.setActive(id, dto.active, user.sub);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() user: JwtUser) {
    return this.recommendationsService.remove(id, user.sub);
  }
}
