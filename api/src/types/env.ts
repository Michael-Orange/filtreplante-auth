// Environment variables types for Cloudflare Workers
export interface Env {
  DATABASE_URL: string;
  JWT_SECRET: string;
  CRYPTO_SECRET: string;
  NODE_ENV?: string;
}
