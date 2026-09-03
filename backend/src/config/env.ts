import "dotenv/config";

function required(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const env = {
  port: Number(process.env.PORT ?? 4000),
  nodeEnv: process.env.NODE_ENV ?? "development",
  // .trim() guards against stray whitespace/newlines from pasting into a host's env var UI —
  // an invalid character here breaks every response, since cors() sets this on every request.
  corsOrigin: (process.env.CORS_ORIGIN ?? "http://localhost:3000").trim().replace(/\/+$/, ""),

  jwtSecret: required("JWT_SECRET"),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? "8h",

  zoho: {
    clientId: process.env.ZOHO_CLIENT_ID ?? "",
    clientSecret: process.env.ZOHO_CLIENT_SECRET ?? "",
    redirectUri: process.env.ZOHO_REDIRECT_URI ?? "",
    accountsBaseUrl: process.env.ZOHO_ACCOUNTS_BASE_URL ?? "https://accounts.zoho.com",
  },
};
