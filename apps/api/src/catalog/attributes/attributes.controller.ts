import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { AttributesService } from './attributes.service';
import { CreateAttributeDefinitionDto } from './dto/create-attribute-definition.dto';
import { CreateAttributeValueDto } from './dto/create-attribute-value.dto';

@ApiTags('attributes')
@Controller('attributes')
export class AttributesController {
  constructor(private readonly attributesService: AttributesService) {}

  @Get()
  findAll() {
    return this.attributesService.findAll();
  }

  @Post()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  createDefinition(@Body() dto: CreateAttributeDefinitionDto) {
    return this.attributesService.createDefinition(dto);
  }

  @Post(':attributeId/values')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  createValue(@Param('attributeId') attributeId: string, @Body() dto: CreateAttributeValueDto) {
    return this.attributesService.createValue(attributeId, dto);
  }
}
