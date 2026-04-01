import { registerAs } from '@nestjs/config';

export default registerAs('jwt', () => ({
  accessSecret: process.env.JWT_ACCESS_SECRET || 'ambugo_access_secret_placeholder',
  refreshSecret: process.env.JWT_REFRESH_SECRET || 'ambugo_refresh_secret_placeholder',
  accessExpires: process.env.JWT_ACCESS_EXPIRES || '15m',
  refreshExpires: process.env.JWT_REFRESH_EXPIRES || '7d',
}));
