import {
  IsNotEmpty,
  IsNumber,
  IsString,
  IsOptional,
  IsIn,
} from 'class-validator';

export class CreateEmergencyDto {
  @IsNumber()
  lat: number;

  @IsNumber()
  lng: number;

  @IsString()
  @IsNotEmpty()
  address: string;

  @IsString()
  @IsIn(['critical', 'urgent', 'transfer'])
  type: string;

  @IsString()
  @IsOptional()
  notes?: string;
}
