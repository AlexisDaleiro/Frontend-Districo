import { Body, Controller, Delete, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { JwtUser } from '../common/types/jwt-user.type';
import { AccountService } from './account.service';
import { CreateAccountAddressDto, UpdateAccountAddressDto } from './dto/account-address.dto';
import { UpdateAccountDto } from './dto/update-account.dto';

@ApiTags('account')
@ApiBearerAuth()
@Controller('account/me')
@UseGuards(JwtAuthGuard)
export class AccountController {
  constructor(private readonly account: AccountService) {}

  @Patch()
  updateProfile(@CurrentUser() user: JwtUser, @Body() dto: UpdateAccountDto) {
    return this.account.updateProfile(user.sub, dto);
  }

  @Post('addresses')
  createAddress(@CurrentUser() user: JwtUser, @Body() dto: CreateAccountAddressDto) {
    return this.account.createAddress(user.sub, dto);
  }

  @Patch('addresses/:id')
  updateAddress(@CurrentUser() user: JwtUser, @Param('id') id: string, @Body() dto: UpdateAccountAddressDto) {
    return this.account.updateAddress(user.sub, id, dto);
  }

  @Delete('addresses/:id')
  deleteAddress(@CurrentUser() user: JwtUser, @Param('id') id: string) {
    return this.account.deleteAddress(user.sub, id);
  }
}
