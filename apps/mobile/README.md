# @winelore/mobile

The iOS app. Shares all domain logic with the web app through `@winelore/core`.

## Status

Sign-in is implemented end to end; no product screens are ported yet. `app/index.tsx`
is a placeholder that exercises the auth flow and nothing more.

**Nothing here has run on a device or simulator.** It was developed on Linux, where
the JavaScript can be typechecked and bundled but not built or launched. What is
verified, and what is not, is spelled out under *Verification* below.

## Setup

```bash
npm install                 # from the repo root — this is a workspace
cp apps/mobile/.env.example apps/mobile/.env
# fill in EXPO_PUBLIC_AXUS_ID_CLIENT_ID
npm run ios -w @winelore/mobile
```

Requires macOS with Xcode. iOS 26 or newer for Liquid Glass; the app runs on
older versions, where `expo-glass-effect` falls back to a plain view.

### A separate AXUS ID client is required

The app cannot reuse the web client id. Native OAuth clients are **public** —
they ship no secret, which is why PKCE is mandatory — and their redirect URIs
are custom schemes rather than https URLs. Register a new client with:

- `winelore://callback` — release builds
- the Expo development proxy URL printed by `npx expo start` — development

`getRedirectUri()` in `src/auth/config.ts` resolves whichever applies.

## Architecture

The OAuth flow is **not** reimplemented here. `@winelore/core/auth` owns building
the authorize URL, validating the callback, exchanging the code, refreshing,
revoking and resolving the display name; both apps call it. This app supplies
only what differs by platform:

| Concern | Web | Native (`src/auth/`) |
|---|---|---|
| Cryptography | Web Crypto | `expo-crypto` (`config.ts`) |
| Token storage | httpOnly cookies | Keychain via `expo-secure-store` (`storage.ts`) |
| Browser handoff | redirect | `ASWebAuthenticationSession` (`session.ts`) |
| Refresh trigger | `proxy.ts` middleware | `getValidAccessToken()`, on demand |

`src/api/client.ts` drives the same generated GraphQL SDK the web app uses,
attaching a bearer token where the web goes through `/api/graphql`.

One deliberate improvement over web: concurrent refreshes are deduplicated
through a shared in-flight promise, so a screen firing several queries at once
performs one refresh. The web app cannot do this across separate requests and
guards the race after the fact instead.

## Verification

Verified here:

- `npm run typecheck -w @winelore/mobile` — clean against Expo SDK 57 types.
- `npx expo export --platform ios` — bundles (2.4MB Hermes). This is what proves
  the monorepo Metro config resolves `@winelore/core` from outside the app
  directory; it is the most common failure in an Expo monorepo.
- The shared OAuth strings are present in the built iOS bundle, so core really
  is compiled in rather than merely typechecking.

**Not verified — needs a Mac:**

1. The flow against real AXUS ID: sheet presentation, the redirect back through
   `winelore://callback`, code exchange, and what AXUS ID returns for a native
   client. Only the request shapes are shared with web; the redirect leg is new.
2. Keychain read/write, including behaviour on a locked device
   (`AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY`).
3. **SecureStore's ~2048-byte advisory limit per value.** Fields are stored
   separately partly for this reason, but if AXUS ID access tokens run large,
   this is where it will surface. Check an actual token's length early.
4. Liquid Glass rendering — requires an iOS 26 device or simulator.
5. Native builds (`expo prebuild` / `expo run:ios`) have never been executed.

## Dependency versions

Every version here comes from Expo SDK 57's own `bundledNativeModules.json`,
not from npm `latest`. Pinning `latest` installs React Native ahead of what the
SDK supports and Metro fails to bundle. Use `npx expo install <pkg>` to add
dependencies so this stays true.
