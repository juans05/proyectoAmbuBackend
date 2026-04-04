import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, Profile } from 'passport-facebook';
import { ConfigService } from '@nestjs/config';
import { AuthService } from '../auth.service';

@Injectable()
export class FacebookStrategy extends PassportStrategy(Strategy, 'facebook') {
  constructor(
    private readonly configService: ConfigService,
    private readonly authService: AuthService,
  ) {
    super({
      clientID: configService.get<string>('FACEBOOK_APP_ID') || 'placeholder',
      clientSecret:
        configService.get<string>('FACEBOOK_APP_SECRET') || 'placeholder',
      callbackURL: configService.get<string>('FACEBOOK_CALLBACK_URL') || '',
      scope: 'email',
      profileFields: ['id', 'emails', 'name', 'picture.type(large)'],
    });
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: Profile,
    done: (err: any, user: any) => void,
  ): Promise<any> {
    const { name, emails, photos } = profile;
    const user = await this.authService.findOrCreateSocialUser({
      email: emails?.[0]?.value || `fb_${profile.id}@ambugo.com`,
      name: `${name?.givenName} ${name?.familyName}`,
      avatarUrl: photos?.[0]?.value,
      provider: 'facebook',
    });
    done(null, user);
  }
}
