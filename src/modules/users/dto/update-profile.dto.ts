import { IsString, IsOptional, MaxLength, Matches, IsUrl } from 'class-validator'

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string

  @IsOptional()
  @IsString()
  @Matches(/^\+?[0-9]{9,15}$/, { message: 'Teléfono inválido' })
  phone?: string

  @IsOptional()
  @IsUrl()
  avatarUrl?: string
}
