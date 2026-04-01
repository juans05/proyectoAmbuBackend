import { Type } from 'class-transformer'
import { IsNumber, IsOptional, Min, Max } from 'class-validator'

export class GeoQueryDto {
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
  @Min(0.1)
  @Max(50)
  radius?: number = 5  // km
}
