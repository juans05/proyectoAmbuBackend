import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { lastValueFrom } from 'rxjs';

@Injectable()
export class GoogleMapsService {
  private readonly logger = new Logger(GoogleMapsService.name);
  private readonly apiKey: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
  ) {
    this.apiKey = this.configService.get<string>('GOOGLE_MAPS_API_KEY') || '';
  }

  /**
   * Obtiene la polilínea y metadata de la ruta más rápida entre dos puntos.
   * Utiliza la moderna Routes API v2 con preferencia de tráfico óptima.
   */
  async getDirections(
    origin: { lat: number; lng: number },
    destination: { lat: number; lng: number },
    preference: 'TRAFFIC_AWARE' | 'TRAFFIC_AWARE_OPTIMAL' = 'TRAFFIC_AWARE',
  ): Promise<{
    polyline: string;
    durationSeconds: number;
    distanceMeters: number;
  }> {
    if (!this.apiKey) {
      this.logger.warn('Google Maps API Key no configurada. Usando fallback.');
      const distance = this.calculateDistance(origin, destination);
      return {
        polyline: '', 
        durationSeconds: Math.ceil(distance / 8.33) * 60,
        distanceMeters: distance,
      };
    }

    try {
      const response = await lastValueFrom(
        this.httpService.post(
          'https://routes.googleapis.com/directions/v2:computeRoutes',
          {
            origin: {
              location: { latLng: { latitude: origin.lat, longitude: origin.lng } },
            },
            destination: {
              location: { latLng: { latitude: destination.lat, longitude: destination.lng } },
            },
            travelMode: 'DRIVE',
            routingPreference: preference,
            computeAlternativeRoutes: false,
            routeModifiers: {
              avoidTolls: false,
              avoidHighways: false,
              avoidFerries: false,
            },
            languageCode: 'es-PE',
            units: 'METRIC',
          },
          {
            headers: {
              'Content-Type': 'application/json',
              'X-Goog-Api-Key': this.apiKey,
              'X-Goog-FieldMask': 'routes.duration,routes.distanceMeters,routes.polyline.encodedPolyline',
            },
          },
        ),
      );

      const data = response.data;
      if (!data.routes || !data.routes.length) {
        throw new Error(`Google Routes v2 Error: No routes found`);
      }

      const route = data.routes[0];

      return {
        polyline: route.polyline.encodedPolyline,
        durationSeconds: parseInt(route.duration.replace('s', ''), 10),
        distanceMeters: route.distanceMeters,
      };
    } catch (error) {
      this.logger.error(
        'Error al obtener direcciones de Google Routes v2',
        error.response?.data || error.message,
      );
      const distance = this.calculateDistance(origin, destination);
      return {
        polyline: '',
        durationSeconds: Math.ceil(distance / 500) * 60,
        distanceMeters: distance,
      };
    }
  }

  /**
   * Obtiene el tiempo estimado de llegada (ETA) en minutos.
   */
  async getETA(
    origin: { lat: number; lng: number },
    destination: { lat: number; lng: number },
  ): Promise<number> {
    const { durationSeconds } = await this.getDirections(origin, destination);
    return Math.ceil(durationSeconds / 60);
  }

  private calculateDistance(
    p1: { lat: number; lng: number },
    p2: { lat: number; lng: number },
  ): number {
    const R = 6371e3; // metros
    const φ1 = (p1.lat * Math.PI) / 180;
    const φ2 = (p2.lat * Math.PI) / 180;
    const Δφ = ((p2.lat - p1.lat) * Math.PI) / 180;
    const Δλ = ((p2.lng - p1.lng) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  }
}
