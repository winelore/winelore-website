import { parseJwt } from "./pkce";

/**
 * Fallback refresh-token cookie lifetime, in seconds, for when the provider
 * exposes no TTL of its own.
 *
 * AXUS ID's official refresh-token lifetime is ~100 years (effectively
 * non-expiring); it is communicated out of band, not via the API. Note most
 * browsers clamp cookie `maxAge` to ~400 days (RFC 6265bis / Chrome), so the
 * stored cookie is refreshed well before this nominal value is ever reached.
 */
export const DEFAULT_REFRESH_TOKEN_TTL_SECONDS = 60 * 60 * 24 * 365 * 100; // ~100 years

/** Token-response keys various OAuth servers use to advertise refresh-token lifetime. */
const ADVERTISED_TTL_KEYS = ["refresh_token_expires_in", "refresh_expires_in"] as const;

/**
 * Best-effort refresh-token lifetime, in seconds, suitable for a cookie `maxAge`.
 *
 * AXUS ID currently advertises no refresh-token TTL: its `/oauth/token` response
 * carries no `refresh_token_expires_in` / `refresh_expires_in`, the refresh token
 * is opaque (a single-segment string, not a JWT, so there is no `exp` to read),
 * and there is no introspection endpoint. This helper still probes both standard
 * signals, so it starts deriving the real lifetime automatically if the provider
 * ever begins sending them; otherwise it falls back to a fixed window (override
 * with the `AXUS_REFRESH_TOKEN_TTL` env var, in seconds).
 */
export function deriveRefreshTokenTtl(
  tokenResponse: Record<string, unknown> | null | undefined,
  refreshToken: string | undefined | null,
): number {
  // 1. Provider-supplied lifetime (Okta / Keycloak / GitHub-App style extension).
  for (const key of ADVERTISED_TTL_KEYS) {
    const advertised = tokenResponse?.[key];
    if (typeof advertised === "number" && advertised > 0) {
      return Math.floor(advertised);
    }
  }

  // 2. Refresh token is itself a JWT carrying an `exp` claim.
  if (refreshToken) {
    const payload = parseJwt(refreshToken);
    const exp = payload?.exp;
    if (typeof exp === "number") {
      const ttl = Math.floor(exp - Date.now() / 1000);
      if (ttl > 0) return ttl;
    }
  }

  // 3. Fixed fallback (env override, else the known official lifetime).
  const override = Number(process.env.AXUS_REFRESH_TOKEN_TTL);
  return Number.isFinite(override) && override > 0
    ? Math.floor(override)
    : DEFAULT_REFRESH_TOKEN_TTL_SECONDS;
}
