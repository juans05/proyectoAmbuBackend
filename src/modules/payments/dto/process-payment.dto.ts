import { IsString, IsUUID, IsOptional } from 'class-validator';

export class ProcessPaymentDto {
  @IsString()
  culqiToken: string; // token generado por Culqi.js en el frontend

  @IsOptional()
  @IsUUID()
  emergencyId?: string;

  @IsOptional()
  @IsUUID()
  subscriptionId?: string;
}
