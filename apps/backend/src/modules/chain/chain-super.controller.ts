import { Controller, Get, Post, Param, Body, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { ChainService } from './chain.service';
import { LinkParentDto } from './dto/chain.dto';

@ApiTags('Chain (Super Admin)')
@Controller('super')
@UseGuards(RolesGuard)
export class ChainSuperController {
  constructor(private chainService: ChainService) {}

  @Get('businesses/chain-tree')
  @Roles('super_admin')
  getChainTree() {
    return this.chainService.getChainTree();
  }

  @Post('businesses/:id/promote-to-parent')
  @Roles('super_admin')
  promoteToParent(@Param('id') id: string) {
    return this.chainService.promoteToParent(id);
  }

  @Post('businesses/:child_id/link-parent')
  @Roles('super_admin')
  linkChild(@Param('child_id') childId: string, @Body() dto: LinkParentDto) {
    return this.chainService.linkChild(childId, dto.parent_business_id);
  }

  @Post('businesses/:child_id/unlink-parent')
  @Roles('super_admin')
  unlinkChild(@Param('child_id') childId: string) {
    return this.chainService.unlinkChild(childId);
  }
}
