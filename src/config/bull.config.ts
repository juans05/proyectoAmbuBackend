import { registerAs } from '@nestjs/config';

export default registerAs('bull', () => ({
  redis: process.env.REDIS_URL ? process.env.REDIS_URL : {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD || 'redis123',
    maxRetriesPerRequest: null,
  },
}));
