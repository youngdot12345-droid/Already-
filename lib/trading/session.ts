export type TradingSession = {
  userId: string;
  email: string;
  authenticated: boolean;
};

export function getServerSession(): TradingSession | null {
  return null;
}

// Authentication will be wired to the production identity provider.
// Trading APIs must not treat client-provided user IDs as authentication.
export function assertAuthenticated(session: TradingSession | null) {
  if (!session?.authenticated) throw new Error("Authentication required.");
  return session;
}
