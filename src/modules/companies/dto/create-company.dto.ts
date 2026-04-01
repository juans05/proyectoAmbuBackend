import { IsString, MaxLength, Matches, IsOptional } from 'class-validator'

export class CreateCompanyDto {
  @IsString()
  @MaxLength(150)
  name: string

  @IsString()
  @Matches(/^[0-9]{11}$/, { message: 'RUC debe tener 11 dígitos' })
  ruc: string

  @IsOptional()
  @IsString()
  @Matches(/^\+?[0-9]{9,15}$/, { message: 'Teléfono inválido' })
  phone?: string

  @IsOptional()
  @IsString()
  @MaxLength(255)
  address?: string
}
