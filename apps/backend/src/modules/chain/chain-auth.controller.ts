import { Controller, Get, Post, Body, Request, UseGuards } from '@nestjs/common';
import { RolesGuard } from '../../common/guards/roles.guard';
import { ChainService } from './chain.service';
import { SwitchBusinessDto } from './dto/chain.dto';

@Controller('auth')
@UseGuards(RolesGuard)
export class ChainAuthController {
  constructor(private chainService: ChainService) {}

  @Get('me/accessible-businesses')
  getAccessibleBusinesses(@Request() req: any) {
    return this.chainService.getAccessibleBusinesses(req.user.sub);
  }

  @Post('switch-business')
  switchBusiness(@Request() req: any, @Body() dto: SwitchBusinessDto) {
    return this.chainService.switchBusiness(req.user.sub, dto.business_id, req.user.role);
  }
}
