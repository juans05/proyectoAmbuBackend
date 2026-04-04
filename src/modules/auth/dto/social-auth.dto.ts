import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class GoogleAuthDto {
  @ApiProperty({ description: 'ID token de Google OAuth2' })
  @IsString()
  @IsNotEmpty()
  idToken: string;
}

export class FacebookAuthDto {
  @ApiProperty({ description: 'Access token de Facebook OAuth' })
  @IsString()
  @IsNotEmpty()
  accessToken: string;
}
