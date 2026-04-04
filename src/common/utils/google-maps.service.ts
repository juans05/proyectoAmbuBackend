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
   */
  async getDirections(
    origin: { lat: number; lng: number },
    destination: { lat: number; lng: number },
  ): Promise<{
    polyline: string;
    durationSeconds: number;
    distanceMeters: number;
  }> {
    if (!this.apiKey) {
      this.logger.warn('Google Maps API Key no configurada. Usando fallback.');
      const distance = this.calculateDistance(origin, destination);
      return {
        polyline: '', // No hay polilínea sin API
        durationSeconds: Math.ceil(distance / 8.33) * 60, // 8.33 m/s (~30km/h)
        distanceMeters: distance,
      };
    }

    try {
      const response = await lastValueFrom(
        this.httpService.get('https://maps.googleapis.com/maps/api/directions/json', {
          params: {
            origin: `${origin.lat},${origin.lng}`,
            destination: `${destination.lat},${destination.lng}`,
            key: this.apiKey,
            mode: 'driving',
            traffic_model: 'best_guess',
            departure_time: 'now',
          },
        }),
      );

      const data = response.data;
      if (data.status !== 'OK' || !data.routes.length) {
        throw new Error(`Google Directions Error: ${data.status}`);
      }

      const route = data.routes[0];
      const leg = route.legs[0];

      return {
        polyline: route.overview_polyline.points,
        durationSeconds: leg.duration_in_traffic?.value ?? leg.duration.value,
        distanceMeters: leg.distance.value,
      };
    } catch (error) {
      this.logger.error('Error al obtener direcciones de Google', error);
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
