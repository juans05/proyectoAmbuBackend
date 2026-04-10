import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { lastValueFrom } from 'rxjs';

@Injectable()
export class OSRMService {
  private readonly logger = new Logger(OSRMService.name);
  private readonly baseUrl = 'http://router.project-osrm.org/route/v1';

  constructor(private readonly httpService: HttpService) {}

  /**
   * Obtiene la polilínea y metadata de la ruta rápida usando OSRM.
   */
  async getDirections(
    origin: { lat: number; lng: number },
    destination: { lat: number; lng: number },
  ): Promise<{
    polyline: string;
    durationSeconds: number;
    distanceMeters: number;
  }> {
    try {
      // OSRM usa formato {lng},{lat}
      const url = `${this.baseUrl}/driving/${origin.lng},${origin.lat};${destination.lng},${destination.lat}`;
      
      const response = await lastValueFrom(
        this.httpService.get(url, {
          params: {
            overview: 'full',
            geometries: 'polyline', // El frontend espera formato polyline estándar
            steps: false,
          },
        }),
      );

      const data = response.data;
      if (data.code !== 'Ok' || !data.routes.length) {
        throw new Error(`OSRM Error: ${data.code}`);
      }

      const route = data.routes[0];

      return {
        polyline: route.geometry,
        durationSeconds: route.duration,
        distanceMeters: route.distance,
      };
    } catch (error) {
      this.logger.error('Error al obtener direcciones de OSRM', error);
      // Fallback básico si OSRM falla
      const distance = this.calculateDistance(origin, destination);
      return {
        polyline: '',
        durationSeconds: Math.ceil(distance / 8) * 60,
        distanceMeters: distance,
      };
    }
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
