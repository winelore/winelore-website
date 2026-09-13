# @winelore/core

Domain logic shared by the Next.js web app and the Expo/React Native app.

## The rule

Nothing in this package may import the DOM, `node:*`, or Next.js. If logic needs
networking, storage, crypto, or the filesystem, it takes that capability as a
parameter and the consuming app supplies the platform's implementation.

`npm run check:core` enforces this and exits non-zero on a violation. Wire it
into CI — the value of this package decays the moment a platform import sneaks in.

## What lives here

| Area | Modules |
|---|---|
| Evaluation scoring | `evaluationScores`, `evaluationExpression`, `evaluationTotals`, `evaluationNumericInput`, `formatPropertyScore`, `deltaOutliers` |
| Commission shape | `auidUtils`, `propertyMap`, `commissionTemplatesQuery`, `templateEditionMap` |
| Outcome policies | `outcomePolicy/*` — mirrors the GraalVM engine on the backend |
| Reference data | `wineRegionTypes`, `competitionTiming`, `dateFormat` |
| GraphQL | `gql/*` — generated, do not hand-edit (`npm run codegen`) |
| Translations | `i18n/*` — message tables and lookup |

Entry points: `@winelore/core`, `@winelore/core/gql`, `@winelore/core/i18n`.

## What deliberately stayed behind

These are platform-bound and each needs a native counterpart when the Expo app
is built:

- **`lib/apiClient.ts`, `lib/axusClient.ts`** — use `fetch` and Next's
  `next: { revalidate }`. Native needs its own transport; the generated SDK in
  `gql/` is transport-agnostic and can be driven by either.
- **`lib/pkce.ts`, `lib/authRefresh.ts`, `proxy.ts`** — `crypto.subtle` plus
  httpOnly cookies. Native replaces this with `ASWebAuthenticationSession` and
  Keychain storage.
- **`lib/wineRegions.ts`** — reads GeoJSON from disk via `process.cwd()`.
  Native must bundle or fetch the dataset instead. `wineRegionTypes` (the pure
  half) is already here.
- **`lib/i18n/context.tsx`** — React context, portable in shape, but persists
  the locale via `js-cookie` and detects it via `navigator.language`. The
  message tables and lookup it wraps are already here; native writes a thin
  context of its own around them.

## Note on outcome policies

`outcomePolicy/evaluateOutcomePolicy.ts` executes **user-authored JavaScript**
via `new Function`, mirroring the GraalVM engine on the backend. Any platform
that previews policies locally needs a JS engine. On iOS that is
JavaScriptCore, which ships with the OS — this module is the one place where
embedding a JS runtime in native code is the right call.
