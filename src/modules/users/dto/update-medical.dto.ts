import { IsString, IsOptional, IsIn } from 'class-validator'

const BLOOD_TYPES = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']

export class UpdateMedicalDto {
  @IsOptional()
  @IsIn(BLOOD_TYPES, { message: 'Tipo de sangre inválido' })
  bloodType?: string

  @IsOptional()
  @IsString()
  allergies?: string

  @IsOptional()
  @IsString()
  chronicConditions?: string
}
