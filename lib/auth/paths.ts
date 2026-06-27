export function authRefreshPath(returnTo = "/"): string {
  return `/auth/refresh?returnTo=${encodeURIComponent(returnTo)}`;
}
