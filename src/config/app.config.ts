import { registerAs } from '@nestjs/config';

export default registerAs('app', () => ({
  port: Number.parseInt(process.env.PORT || '3000', 10) || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',
  apiPrefix: process.env.API_PREFIX || 'api',
  corsEnabled: process.env.CORS_ENABLED === 'true' || true,
  corsOrigin: process.env.CORS_ORIGIN || '*',
  trustProxy: process.env.TRUST_PROXY === 'true',
}));
