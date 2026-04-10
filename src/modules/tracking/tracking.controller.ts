import { Controller, Get, Post, Body } from '@nestjs/common';
import { WazeIntegrationService } from './waze-integration.service';

@Controller('tracking')
export class TrackingController {
  constructor(private readonly wazeService: WazeIntegrationService) {}

  @Get('integrations/waze/feed')
  async getWazeFeed() {
    return this.wazeService.getWazeFeed();
  }
}
