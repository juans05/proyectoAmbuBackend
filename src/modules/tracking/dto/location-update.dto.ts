import { IsNumber, IsOptional, Min, Max } from 'class-validator'
import { Type } from 'class-transformer'

export class LocationUpdateDto {
  @Type(() => Number)
  @IsNumber()
  @Min(-90)
  @Max(90)
  lat: number

  @Type(() => Number)
  @IsNumber()
  @Min(-180)
  @Max(180)
  lng: number

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  heading?: number  // 0-360 grados

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  speed?: number    // km/h
}
