type Env = Record<string, string | undefined>;

export function publicKeyResult(env: Env): { status: number; body: Record<string, string> } {
  if (!env.VAPID_PUBLIC_KEY || !env.VAPID_PRIVATE_KEY) return { status: 503, body: { error: 'VAPID is not configured' } };
  if (env.VERCEL && !env.FIREBASE_SERVICE_ACCOUNT_JSON) return { status: 503, body: { error: 'Firebase Admin is not configured' } };
  return { status: 200, body: { publicKey: env.VAPID_PUBLIC_KEY } };
}
