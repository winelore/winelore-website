import { refreshAccessToken, sessionFromTokenResponse } from "@winelore/core/auth";
import type { AxusSession } from "@winelore/core/auth";
import { getAxusConfig } from "./axusConfig";

/** @deprecated Use `AxusSession` from @winelore/core/auth. */
export type RefreshResult = AxusSession;

/**
 * Trade a refresh token for a new session.
 *
 * The OAuth call and display-name resolution are shared with the Expo app; only
 * where the result gets stored differs by platform.
 */
export async function refreshTokens(refreshToken: string): Promise<AxusSession> {
  const config = getAxusConfig();
  const tokens = await refreshAccessToken(config, refreshToken);
  return sessionFromTokenResponse(config, tokens, refreshToken);
}
