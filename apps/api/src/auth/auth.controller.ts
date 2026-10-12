import { Body, Controller, Delete, Get, Headers, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { JwtUser } from '../common/types/jwt-user.type';
import { AuthService } from './auth.service';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { AcceptStaffInvitationDto } from './dto/accept-staff-invitation.dto';
import { AuthSessionsService } from './auth-sessions.service';
import { MfaService } from './mfa.service';
import { MfaChangeDto, MfaCodeDto, MfaVerifyDto, SecurityPasswordDto } from './dto/security.dto';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService, private readonly sessions: AuthSessionsService, private readonly mfa: MfaService) {}

  @Post('login')
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  login(@Body() dto: LoginDto, @Headers('user-agent') agent?: string) {
    return this.authService.login(dto, agent);
  }

  @Post('mfa/verify')
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  verify(@Body() dto: MfaVerifyDto, @Headers('user-agent') agent?: string) { return this.authService.verifyMfa(dto.challengeToken, dto.code, agent); }

  @Get('security') @UseGuards(JwtAuthGuard)
  security(@CurrentUser() user: JwtUser) { return this.mfa.status(user.sub); }

  @Get('sessions') @UseGuards(JwtAuthGuard)
  listSessions(@CurrentUser() user: JwtUser) { return this.sessions.list(user.sub, user.sid!); }

  @Delete('sessions/:id') @UseGuards(JwtAuthGuard)
  revoke(@CurrentUser() user: JwtUser, @Param('id') id: string) { return this.sessions.revoke(user.sub, id, user.sid); }

  @Post('mfa/setup') @UseGuards(JwtAuthGuard) @Throttle({ default: { limit: 5, ttl: 60000 } })
  setup(@CurrentUser() user: JwtUser, @Body() dto: SecurityPasswordDto) { return this.mfa.setup(user.sub, user.sid!, dto.password); }

  @Post('mfa/enable') @UseGuards(JwtAuthGuard) @Throttle({ default: { limit: 5, ttl: 60000 } })
  enable(@CurrentUser() user: JwtUser, @Body() dto: MfaCodeDto) { return this.mfa.enable(user.sub, user.sid!, dto.code); }

  @Post('mfa/disable') @UseGuards(JwtAuthGuard) @Throttle({ default: { limit: 5, ttl: 60000 } })
  disable(@CurrentUser() user: JwtUser, @Body() dto: MfaChangeDto) { return this.mfa.change(user.sub, user.sid!, dto.password, dto.code, true); }

  @Post('mfa/recovery-codes') @UseGuards(JwtAuthGuard) @Throttle({ default: { limit: 5, ttl: 60000 } })
  recovery(@CurrentUser() user: JwtUser, @Body() dto: MfaChangeDto) { return this.mfa.change(user.sub, user.sid!, dto.password, dto.code, false); }

  @Post('refresh')
  refresh(@Body() dto: RefreshTokenDto) {
    return this.authService.refresh(dto.refreshToken);
  }

  @Post('logout')
  logout(@Body() dto: RefreshTokenDto) {
    return this.authService.logout(dto.refreshToken);
  }

  @Post('forgot-password')
  @Throttle({ default: { limit: 3, ttl: 60000 } })
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto);
  }

  @Post('reset-password')
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto);
  }

  @Post('staff-invitations/accept')
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  acceptStaffInvitation(@Body() dto: AcceptStaffInvitationDto) {
    return this.authService.acceptStaffInvitation(dto);
  }

  @Get('me')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  me(@CurrentUser() user: JwtUser) {
    return this.authService.me(user);
  }
}
