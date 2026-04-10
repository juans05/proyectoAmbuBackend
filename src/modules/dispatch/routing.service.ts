import { Injectable, Logger } from '@nestjs/common';
import { GoogleMapsService } from '../../common/utils/google-maps.service';
import { OSRMService } from '../../common/utils/osrm.service';

export enum RoutingProvider {
  GOOGLE = 'google',
  OSRM = 'osrm',
}

@Injectable()
export class RoutingService {
  private readonly logger = new Logger(RoutingService.name);

  constructor(
    private readonly googleMapsService: GoogleMapsService,
    private readonly osrmService: OSRMService,
  ) {}

  /**
   * Obtiene direcciones utilizando el proveedor especificado o lógica automática.
   * @param origin Punto de origen
   * @param destination Punto de destino
   * @param forceProvider (Opcional) Forzar un proveedor específico
   * @param preference (Opcional) Preferencia de tráfico para Google
   */
  async getDirections(
    origin: { lat: number; lng: number },
    destination: { lat: number; lng: number },
    forceProvider?: RoutingProvider,
    preference: 'TRAFFIC_AWARE' | 'TRAFFIC_AWARE_OPTIMAL' = 'TRAFFIC_AWARE',
  ) {
    const provider = forceProvider || this.determineProvider(preference);

    this.logger.debug(`Utilizando proveedor de rutas: ${provider}`);

    if (provider === RoutingProvider.GOOGLE) {
      return this.googleMapsService.getDirections(origin, destination, preference);
    } else {
      return this.osrmService.getDirections(origin, destination);
    }
  }

  /**
   * Lógica interna para decidir qué proveedor usar.
   * Por defecto: OSRM para tráfico normal, Google para tráfico óptimo (emergencias críticas).
   */
  private determineProvider(preference: string): RoutingProvider {
    if (preference === 'TRAFFIC_AWARE_OPTIMAL') {
      return RoutingProvider.GOOGLE;
    }
    // Por defecto OSRM para ahorrar costos en cálculos masivos o rutinarios
    return RoutingProvider.OSRM;
  }
}
