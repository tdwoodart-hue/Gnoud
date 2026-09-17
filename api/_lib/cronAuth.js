import { createPublicKey, verify as verifySignature } from 'node:crypto';

const GITHUB_OIDC_ISSUER = 'https://token.actions.githubusercontent.com';
const GITHUB_JWKS_URL = `${GITHUB_OIDC_ISSUER}/.well-known/jwks`;
const GITHUB_OIDC_AUDIENCE = 'gnoud-notification-cron';
const ALLOWED_REPOSITORY = 'tdwoodart-hue/Gnoud';
const ALLOWED_REF = 'refs/heads/main';
const ALLOWED_EVENTS = new Set(['schedule', 'workflow_dispatch']);
const CLOCK_SKEW_SECONDS = 60;
const JWKS_CACHE_MS = 6 * 60 * 60 * 1000;

let cachedKeys = null;
let cachedKeysAt = 0;

function decodeBase64Url(value) {
  return Buffer.from(value, 'base64url');
}

function parseJsonPart(value) {
  return JSON.parse(decodeBase64Url(value).toString('utf8'));
}

function audienceMatches(audience) {
  if (typeof audience === 'string') return audience === GITHUB_OIDC_AUDIENCE;
  return Array.isArray(audience) && audience.includes(GITHUB_OIDC_AUDIENCE);
}

export function githubCronClaimsAllowed(claims, nowSeconds = Math.floor(Date.now() / 1000)) {
  if (!claims || claims.iss !== GITHUB_OIDC_ISSUER) return false;
  if (!audienceMatches(claims.aud)) return false;
  if (claims.repository !== ALLOWED_REPOSITORY) return false;
  if (claims.ref !== ALLOWED_REF) return false;
  if (!ALLOWED_EVENTS.has(claims.event_name)) return false;

  const expiresAt = Number(claims.exp || 0);
  const notBefore = Number(claims.nbf || 0);
  if (!expiresAt || expiresAt < nowSeconds - CLOCK_SKEW_SECONDS) return false;
  if (notBefore && notBefore > nowSeconds + CLOCK_SKEW_SECONDS) return false;
  return true;
}

async function githubJwks() {
  if (cachedKeys && Date.now() - cachedKeysAt < JWKS_CACHE_MS) return cachedKeys;
  const response = await fetch(GITHUB_JWKS_URL, { headers: { Accept: 'application/json' } });
  if (!response.ok) throw new Error(`GitHub OIDC JWKS returned ${response.status}`);
  const body = await response.json();
  if (!Array.isArray(body?.keys)) throw new Error('GitHub OIDC JWKS is invalid');
  cachedKeys = body.keys;
  cachedKeysAt = Date.now();
  return cachedKeys;
}

export async function verifyGitHubCronToken(token) {
  try {
    const parts = String(token || '').split('.');
    if (parts.length !== 3) return false;
    const [encodedHeader, encodedPayload, encodedSignature] = parts;
    const header = parseJsonPart(encodedHeader);
    const claims = parseJsonPart(encodedPayload);
    if (header.alg !== 'RS256' || !header.kid) return false;
    if (!githubCronClaimsAllowed(claims)) return false;

    const keys = await githubJwks();
    const jwk = keys.find((candidate) => candidate.kid === header.kid && candidate.kty === 'RSA');
    if (!jwk) return false;

    const publicKey = createPublicKey({ key: jwk, format: 'jwk' });
    return verifySignature(
      'RSA-SHA256',
      Buffer.from(`${encodedHeader}.${encodedPayload}`),
      publicKey,
      decodeBase64Url(encodedSignature),
    );
  } catch (error) {
    console.warn('GitHub cron authorization failed:', error instanceof Error ? error.message : error);
    return false;
  }
}

export async function authorizeCronRequest(req) {
  const authorization = String(req?.headers?.authorization || '');
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authorization === `Bearer ${cronSecret}`) return true;
  if (!authorization.startsWith('Bearer ')) return false;
  return verifyGitHubCronToken(authorization.slice('Bearer '.length));
}
