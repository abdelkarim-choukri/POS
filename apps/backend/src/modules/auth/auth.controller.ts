import { Controller, Post, Get, Put, Body, Request } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto, PinLoginDto, ChangePasswordDto, SuperAdminLoginDto } from './dto';
import { Public } from '../../common/decorators';
import { CurrentUser } from '../../common/decorators';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Public()
  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto.email, dto.password);
  }

  @Public()
  @Post('super-admin/login')
  superAdminLogin(@Body() dto: SuperAdminLoginDto) {
    return this.authService.superAdminLogin(dto.email, dto.password);
  }

  @Public()
  @Post('pin-login')
  pinLogin(@Body() dto: PinLoginDto) {
    return this.authService.pinLogin(dto.pin, dto.terminal_code);
  }

  @Public()
  @Post('refresh')
  refresh(@Body('refresh_token') token: string) {
    return this.authService.refreshToken(token);
  }

  @Get('me')
  getProfile(@CurrentUser() user: any) {
    return this.authService.getProfile(user.id, user.type);
  }

  @Put('change-password')
  changePassword(@CurrentUser('id') userId: string, @Body() dto: ChangePasswordDto) {
    return this.authService.changePassword(userId, dto.current_password, dto.new_password);
  }

  @Post('logout')
  logout() {
    return { message: 'Logged out successfully' };
  }
}
