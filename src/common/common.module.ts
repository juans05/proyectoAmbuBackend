import { Module, Global } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { GoogleMapsService } from './utils/google-maps.service';
import { OSRMService } from './utils/osrm.service';

@Global()
@Module({
  imports: [HttpModule],
  providers: [GoogleMapsService, OSRMService],
  exports: [GoogleMapsService, OSRMService],
})
export class CommonModule {}
