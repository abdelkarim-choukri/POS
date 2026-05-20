import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { OssService } from './oss.service';
import { Public } from '../../common/decorators';

@ApiTags('OSS (Public)')
@Controller()
export class OssController {
  constructor(private readonly ossService: OssService) {}

  // Public OSS endpoint — no auth required (customers read this on a TV screen)
  @Public()
  @Get('public/oss')
  getOss(@Query('location_id') locationId: string) {
    return this.ossService.getOssData(locationId);
  }
}
