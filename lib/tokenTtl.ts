/**
 * Kept as a re-export so existing imports keep working; the implementation is
 * shared with the Expo app in @winelore/core/auth. The `AXUS_REFRESH_TOKEN_TTL`
 * env override is applied by `getAxusConfig()`.
 */
export {
    deriveRefreshTokenTtl,
    DEFAULT_REFRESH_TOKEN_TTL_SECONDS,
} from "@winelore/core/auth"
