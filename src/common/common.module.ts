import { Module, Global } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { GoogleMapsService } from './utils/google-maps.service';

@Global()
@Module({
  imports: [HttpModule],
  providers: [GoogleMapsService],
  exports: [GoogleMapsService],
})
export class CommonModule {}
