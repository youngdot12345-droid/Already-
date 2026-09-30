export type TradingUser = {
  id: string;
  email: string;
  name: string;
  createdAt: string;
};

export type DbStatus = {
  provider: "postgres";
  configured: boolean;
  persistence: "pending";
};

export function getDbStatus(): DbStatus {
  return {
    provider: "postgres",
    configured: Boolean(process.env.DATABASE_URL),
    persistence: "pending",
  };
}

export function requireDatabaseUrl() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not configured.");
  }
  return process.env.DATABASE_URL;
}
