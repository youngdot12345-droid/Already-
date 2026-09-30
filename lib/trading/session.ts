import { auth, currentUser } from "@clerk/nextjs/server";

export type TradingSession = {
  userId: string;
  email: string;
  authenticated: boolean;
};

/**
 * Server-only identity lookup.
 * Client-provided userId/accountId values must never be treated as authentication.
 */
export async function getServerSession(): Promise<TradingSession | null> {
  const { userId } = await auth();
  if (!userId) return null;

  const user = await currentUser();
  const email = user?.emailAddresses?.[0]?.emailAddress;
  if (!email) return null;

  return { userId, email, authenticated: true };
}

export function assertAuthenticated(session: TradingSession | null) {
  if (!session?.authenticated) throw new Error("Authentication required.");
  return session;
}
