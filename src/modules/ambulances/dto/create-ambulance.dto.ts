import { IsString, IsUUID, IsEnum, IsOptional, Length } from 'class-validator';
import { AmbulanceType } from '../../../common/enums/ambulance-type.enum';

export class CreateAmbulanceDto {
  @IsString()
  @Length(6, 10)
  plate: string;

  @IsEnum(AmbulanceType, {
    message: 'Tipo debe ser TYPE_I, TYPE_II o TYPE_III',
  })
  type: AmbulanceType;

  @IsUUID()
  companyId: string;

  @IsOptional()
  @IsUUID()
  conductorId?: string;
}
