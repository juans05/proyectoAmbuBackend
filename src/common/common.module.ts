import { Module, Global } from '@nestjs/common';
import { GoogleMapsService } from './utils/google-maps.service';

@Global()
@Module({
  providers: [GoogleMapsService],
  exports: [GoogleMapsService],
})
export class CommonModule {}
