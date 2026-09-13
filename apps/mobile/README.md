# @winelore/mobile

The iOS app. Shares all domain logic with the web app through `@winelore/core`.

## Status

Sign-in is implemented end to end. The evaluation scorecard is ported and
renders real data: `app/evaluation/[candidateId].tsx`.

Not yet ported, and needed before a judge can use this in a session:

- **Panel sequencing.** The web sends a judge to the right candidate and to the
  waiting room when the panel moves on — guard clauses in the route plus a
  3-second poll. `useCandidateEvaluation` fetches and submits only.
- **Comments** — per-property and general, including voice notes. Voice needs
  `expo-audio`, replacing the web's `MediaRecorder`.
- **The AI tasting draft**, which posts to a Next API route the native app has
  no equivalent of yet.
- **Localisation.** Strings are hardcoded English placeholders in the route;
  the real en/uk/hu tables are already in `@winelore/core/i18n`.

**Nothing here has run on a device or simulator.** It was developed on Linux, where
the JavaScript can be typechecked and bundled but not built or launched. What is
verified, and what is not, is spelled out under *Verification* below.

## Running on a device

Requires macOS with Xcode. Expo Go will not work — expo-secure-store,
expo-glass-effect, expo-crypto, expo-haptics and expo-web-browser are native
modules, so this needs a development build.

```bash
npm install                       # from the repo root — this is a workspace
cd apps/mobile
npx expo run:ios --device         # prebuilds ios/, then builds and installs
```

`expo run:ios` generates the `ios/` directory on first run; it is gitignored
and safe to delete and regenerate. Pick your iPhone when prompted, and set a
signing team in Xcode if the build stops on provisioning (a free Apple ID
works for on-device development).

No configuration step: `app.config.ts` reads the repo-root `.env` the web app
already uses, so the client id and endpoints come across automatically.

Tap *Open sample scorecard* for the preview route — the real evaluator on
sample data, no sign-in and no backend. That is the fastest way to judge the
two things that cannot be checked anywhere else: haptics, which a simulator
cannot produce, and Liquid Glass, which needs iOS 26 hardware.

The sign-in screen prints the client id, redirect URI and issuer it will
actually use. A failed sign-in is nearly always a redirect URI outside the
allowlist, and that value is derived at runtime rather than configured, so it
is shown rather than left to guess at.

### One AXUS ID client, shared with the web

AXUS ID issues no client secrets — every client is public and authenticates
with PKCE — so the web app and this one use the same client id. It needs
`winelore://callback` in its allowed redirect URIs alongside the web's https
callback.

Expo Go would need an `exp://` proxy URL allowed too, but Expo Go cannot run
this app (native modules), so the scheme form is the only one that matters.

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

The scorecard follows the same pattern. Every rule about what a judge may
submit and what a score is worth lives in `@winelore/core/evaluation`;
`useEvaluationForm` only holds React state around it. Nothing about scoring is
reimplemented here, so the two platforms cannot disagree.

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
4. Liquid Glass rendering — requires an iOS 26 device or simulator. The
   scorecard's submit bar is the first surface using it (`SubmitBar.tsx`),
   falling back to an opaque bar below iOS 26.
5. Native builds (`expo prebuild` / `expo run:ios`) have never been executed.
6. Haptics. Every score selection fires `Haptics.selectionAsync()` and submit
   fires a notification tap. These cannot be felt in a simulator — check them
   on a device, since getting the weight wrong is worse than having none.
7. The evaluation screen has never rendered against a real commission. Its
   queries typecheck against the schema and bundle, but the shape of a live
   template — especially a SmartProperty formula tree — has not been seen.

## Typed routes are off, deliberately

`app.config.ts` does not set `experiments.typedRoutes`. Turning it on makes the
Expo CLI load `@expo/router-server`, which lives at
`node_modules/expo/node_modules/@expo/cli/node_modules/` and resolves
`expo-router` by walking up from there. npm nests `expo-router` under
`apps/mobile/node_modules` (it pulls a Metro version that conflicts with the
hoisted one), so that lookup fails and `expo run:ios` dies **after** building,
signing and installing the app:

```
Error: Cannot find module 'expo-router/_ctx-shared'
```

Because it happens post-install, it reads like a runtime fault when it is the
CLI's type generation. The gate is one condition in
`startTypescriptTypeGeneration.js` — with the flag unset, `setupTypedRoutes` is
never called and the module is never required. No other part of a native build
touches it; the remaining references are web, HTML and RSC paths.

Forcing the hoist by declaring `expo-router` at the repo root also works
locally but depends on npm's hoisting staying stable across lockfile states and
npm versions, which it did not. The flag is the deterministic fix.

The cost is that `href` values are plain strings rather than a generated union.

## After any dependency change, regenerate the native project

`ios/` is generated and gitignored. It hardcodes absolute paths to every
native module, so when npm moves a package between the root and
`apps/mobile/node_modules`, the Pods project still points at the old location
and the build fails with:

```
error: Build input file cannot be found: '.../apps/mobile/node_modules/react-native-reanimated/...'
```

That is stale generated state, not a missing package. Fix:

```bash
rm -rf apps/mobile/ios
npx expo run:ios --device        # prebuilds and re-runs pod install
```

If the tree itself looks wrong, reset it fully from the repo root:

```bash
rm -rf node_modules apps/mobile/node_modules apps/mobile/ios
npm install
cd apps/mobile && npx expo run:ios --device
```

## One copy of every native module

The root `package.json` carries an `overrides` block pinning React, React
Native and every native module to the versions Expo SDK 57 pairs with. **Do
not remove it.**

Every `expo-*` package declares `react-native` as a loose peer dependency, and
npm auto-installs peers. Without the overrides npm satisfies those loose ranges
with the newest release at the repo root (React Native 0.87.1, screens 4.27.0,
reanimated 4.6.0) while `apps/mobile`'s SDK-pinned ranges get their own nested
copies — two builds of every native module in one tree. CocoaPods then emits
duplicate targets and the build fails in ways that look unrelated to
dependencies.

This is also why the web app sits on React 19.2.3 rather than 19.2.4: npm
refuses an override that conflicts with a direct dependency, and one React
across the monorepo is worth more than a patch version on the web.

`babel-preset-expo` is an explicit devDependency for the same family of
reasons — without it npm leaves it under `node_modules/expo/`, where Metro's
transformer cannot resolve it.

## iOS only

`app.config.ts` sets `platforms: ["ios"]`. The dev server otherwise also
serves a web bundle, which needs `react-native-web`:

```
Unable to resolve "react-native-web/dist/index" from "expo-router/build/ExpoRoot.js"
```

A browser tab left open on the Metro port is enough to trigger it. There is no
reason to install `react-native-web` here — the web product is the Next.js app
in this same repo. Add `"android"` to the list when an Android build is wanted.

## Verifying a change: use the dev bundle, not `expo export`

```bash
npm run check:bundle -w @winelore/mobile
```

`expo export` produces a **production** bundle, which omits dev-only modules —
React Native pulls in `react-devtools-core` (and with it `@babel/runtime/regenerator`)
only when `dev` is true. A broken dev bundle therefore passes `expo export`
cleanly and then fails on the device with a blank screen.

`check:bundle` runs `expo export:embed --dev true`, the same command Xcode
invokes, so it exercises the module graph the device actually loads.

## Dependency versions

Every version here comes from Expo SDK 57's own `bundledNativeModules.json`,
not from npm `latest`. Pinning `latest` installs React Native ahead of what the
SDK supports and Metro fails to bundle. Use `npx expo install <pkg>` to add
dependencies so this stays true.
