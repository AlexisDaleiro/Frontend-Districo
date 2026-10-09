import { Controller, Delete, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtUser } from '../common/types/jwt-user.type';
import { SearchListQueryDto } from '../admin/dto/admin-list-query.dto';
import { FavoritesService } from './favorites.service';

@ApiTags('favorites')
@ApiBearerAuth()
@Controller('account/me/favorites')
@UseGuards(JwtAuthGuard)
export class FavoritesController {
  constructor(private readonly favorites: FavoritesService) {}

  @Get()
  list(@CurrentUser() user: JwtUser, @Query() query: SearchListQueryDto) { return this.favorites.list(user, query); }

  @Get('ids')
  ids(@CurrentUser() user: JwtUser) { return this.favorites.ids(user); }

  @Post(':productId')
  add(@CurrentUser() user: JwtUser, @Param('productId') productId: string) { return this.favorites.add(user, productId); }

  @Delete(':productId')
  remove(@CurrentUser() user: JwtUser, @Param('productId') productId: string) { return this.favorites.remove(user, productId); }
}
