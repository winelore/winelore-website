# @winelore/mobile

The iOS app. Shares all domain logic with the web app through `@winelore/core`.

## Status

Sign-in is implemented end to end. The evaluation scorecard is ported and
renders real data: `app/evaluation/[candidateId].tsx`.

Panel sequencing follows the chair: `usePanelSequencing` polls and navigates
when the active candidate changes, `useWaitForNextCandidate` picks a waiting
judge back up. The decision itself is `resolveEvaluationDestination` in
`@winelore/core/evaluation`, shared with the web poll, so a judge on a phone
and a judge on the web are never sent to different places by the same server
state.

Localisation runs off the same en/uk/hu tables as the web. `LocaleProvider`
detects the device language through `Intl` (Hermes ships it, so no extra
native module) and persists a choice in SecureStore. `npm run check-i18n`
now scans `apps/mobile` too, so a mistyped key fails there.

Results (`src/results/`) are the web's /competition/[id]/results, feature for
feature: the four figures, the five tabs with their counts, the commission
filter, search, the expert breakdown under each candidate with out-of-delta
judges flagged, voice comments, the Excel and CSV downloads, and printing. It
refreshes every three seconds until the competition completes, as the web
does, only while on screen. Who may see which commissions, the loading, the
narrowing, the breakdown and the files' cells are all `@winelore/core/results`
(`resolveCompetitionResultsScope`, `loadCompetitionResults`, `expertBreakdown`,
`competitionResultSheets`), and the web page now calls the same functions — the
numbers cannot differ because there is one implementation of them. What
differs is the layout: the web's wide tables become one card per row, and a
candidate's card opens onto its judges as a table row does. Search is the
system's field in the bar; the commission filter is a native menu; a download
goes to the share sheet, and printing to the system print sheet. A session's
end (`/results/[commissionId]`) shows the same screen narrowed to that
commission, which is what the web's commission results page redirects to.

The home screen is the web's dashboard, section for section: the welcome
banner, then active commissions, templates, competitions and beverages, each
with its cards, empty state and "View all". It is laid out as the web lays it
out on a phone — one column, no panel around the cards, "View all" beside each
title. The cards are the web's `EntityCard` anatomy in the web's colours;
`src/theme.ts` carries Tailwind's slate and indigo, converted from Tailwind
v4's OKLCH values so they match rather than approximate.

What is not the web's is the chrome. The web draws an iOS-style nav bar, tab
bar and sheet in CSS; here they are the real ones. The four header tabs (Home,
Competitions, Beverages, Map) are a native tab bar — Liquid Glass on iOS 26, a
Material 3 navigation bar on Android. It stays on screen as in the App Store
rather than Music: no minimising on scroll, and the lobby, commissions list,
panel summary and results are pushed inside the Home tab. It hides only on the
waiting room and the scorecard, as the web's phone tab bar does while scoring.
The session screens hand off with `router.replace`, which cannot cross
navigators without rebuilding the tab bar, so they all share the Home stack. The account is an avatar in the Home
header, as in the App Store and Gmail, opening a system form sheet with the
personal lists, AXUS ID, sign-out, and a language control that is a real
UISegmentedControl (SwiftUI via `@expo/ui`) on iOS and a Material segmented
button row (Compose) on Android. Icons are SF Symbols and Material Symbols via
`expo-symbols`, mapped by meaning to the lucide icons the web uses in
`src/ui/Icon.tsx`. Signed out, the root is the web's landing page.

Everything the cards show is computed by `@winelore/core/dashboard`, and the
web's home page now calls the same functions: competition and beverage
shaping, template edition selection, status tones, and the live commission
timer. `selectCommissionsForUser` does the membership filtering for the home
screen, the full commissions list, and both of the web's equivalents.

Where a card or link goes is one table, `src/navigation/destinations.ts`.
Commissions, competitions, beverages, the Competitions and Beverages tabs and
the personal commission, competition and beverage lists are native; anything
not ported yet — templates, outcome policies, the map, create forms — opens
the same page of the website in the in-app browser. Porting a
screen is flipping its entry from `web` to `app`. The Map tab says so plainly
and offers the website, rather than showing an empty page.

The competition page (`src/competition/`) is the web's /competition/[id]
stacked as its phone layout stacks it: the competition's card with its live
timer and holders, the status steps, series, timeline, a holder's controls and
the commissions. A holder renames it, edits the planned dates with the
system's own date pickers, submits a draft for review, starts it and adds
commissions, through the same mutations and input builders
(`@winelore/core/competition`) the web's server actions use. Starting and
submitting ask first, which the web does not: they cannot be undone, and a
phone is easier to tap by accident than a desk. Like the web, the page polls
every three seconds until the competition completes — here only while it is
on screen. A commission the user sits on opens its lobby; any other opens the
web's organiser page.

It opens inside whichever tab it was tapped in: the route lives in
`app/(tabs)/(home,competitions)/`, an expo-router shared group, which is why
the Competitions and Beverages tabs are route groups rather than plain
folders. Their URLs are unchanged.

The beverage page (`src/beverage/`) is the web's /beverage/[id] as its phone
layout stacks it: the beverage's card — type, colour and id chips, the name,
the status, origin, producers and who entered it — then its tabs, Technical
Specs, Vintages & Batches and Awards, in the web's order and with its default.
The data is `loadBeveragePage` in `@winelore/core/beverage`, which the web page
now calls too, along with the attribute parsing, specs, batch figures, award
grouping and producer check. A producer edits it in a page sheet, as the web
edits it in a modal: name and origin are saved from the bar, and producers are
added (found by AXUS ID username through `findUserByUsername` in core, which
the web's search now uses) and removed at once. Submitting for review and
removing a producer ask first — the web does neither — since one cannot be
undone and the other can take away your own right to edit. A batch's samples
open in a sheet with the system's search field and tap-to-copy codes. Creating
batches and samples is still the web's, in the in-app browser, and the page
reloads when it closes. The page lives in `app/(tabs)/(home,beverages)/`; the
sheets are in the root stack so they sit over the tab bar, and read the
beverage the page loaded (`useBeveragePage.ts`), writing each mutation's
result back so the page behind is current when a sheet closes.

The list screens (`src/lists/`) are the web's list pages as a phone draws them:
title and subtitle, the count chip and the gradient create button, one column
of the roomier list cards, and the web's empty and error state cards. The
web's numbered pages become scrolling — `usePagedList` fetches the web's
16-item pages by offset as the end comes into view, with the same queries and
the same `@winelore/core` mappers. My Beverages reverse-geocodes each origin
through Nominatim like the web does, but through a paced queue: Nominatim
allows one request a second per client, and each phone is one.

Tapping a commission enters through the waiting room rather than guessing a
candidate: panel sequencing then routes to whatever the chair currently has
open, which is the same path a judge takes mid-session.

"View all" opens `/commissions`: every commission the judge is on, whatever its
status. It is handed to the list whole — the web pages it, but it already
fetches all of it and slices client-side, so paging is a desktop affordance
rather than a data constraint.

Tapping any commission opens the lobby, which routes on by status: a running
session to the waiting room, a finished one to its results, and otherwise the
lobby itself — who is here, who is ready, and the chair's control to begin.
`resolveLobbyState` in `@winelore/core/commission` decides all of that and is
shared with the web commission page.

The web's commission screen does much more than the lobby: panel and candidate
management, template assignment, replica setup and session settings. Those are
organiser desk work and are not ported; the lobby is the judge-facing half.

Not yet ported:

- **Comments** on the scorecard — per-property and general, including voice
  notes. `expo-audio` is installed (results play voice comments with it);
  recording would replace the web's `MediaRecorder`.
- **The AI tasting draft**, which posts to a Next API route the native app has
  no equivalent of yet.
- **Templates, outcome policies, the map and the create forms.** Their links
  exist and open the website for now; see `destinations.ts`. The web session
  is separate from the app's, so the first visit asks for an AXUS ID sign-in
  in the in-app browser.

The app was first written on Linux, where it could only be typechecked and
bundled; it has since run on an iPhone 15 Pro on iOS 26.6 and iOS 27. What is
verified, and what is not, is spelled out under *Verification* below. Android
has still never been launched.

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

In a development build, the landing page has a *Sample scorecard* link to the
preview route — the real evaluator on sample data, no sign-in and no backend. That is the fastest way to judge the
two things that cannot be checked anywhere else: haptics, which a simulator
cannot produce, and Liquid Glass, which needs iOS 26 hardware.

Below it, a development build prints the client id, redirect URI and issuer
the sign-in will actually use. Release builds show neither. A failed sign-in is nearly always a redirect URI outside the
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

Verified on an iPhone 15 Pro, iOS 26.6, against the dev backend:

- Release builds through `xcodebuild`, installed with `devicectl`.
- A signed-in session in the Keychain surviving relaunches.
- Liquid Glass: the tab bar, the headers and the profile sheet.
- Home, the four list screens (paging to the end of a 136-item list, a
  resolved origin), the lobby, results and the scorecard's routing.

On iOS 27, built with Xcode 27:

- The app launches (the build before the scene plugin crashed at launch).
- Links: one that cold-starts the app, and one sent to the running app, both
  land on the page they name.
- The beverage page for a producer's own draft and review, and someone else's
  published beverage; batches with their samples and allocation; the samples
  sheet with its search field; the edit sheet with a username found; the
  awards and specs empty states (no beverage on dev has awards or specs).
- The in-app browser under the scene life cycle, opening the web's create
  batch page.
- Competition results for a holder, on two dev competitions: the figures,
  tabs and filter; a candidate opened onto its judges, with out-of-delta
  judges flagged; the outcome column; the comments tab; a session's end
  (`/results/[commissionId]`) narrowed to its commission; the Excel file in
  the share sheet; and the print sheet's preview.

**Not verified yet:**

1. Keychain behaviour on a locked device (`AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY`).
2. **SecureStore's ~2048-byte advisory limit per value.** Fields are stored
   separately partly for this reason; the tokens seen so far fit.
3. Haptics. Every score selection fires `Haptics.selectionAsync()` and submit
   fires a notification tap — check the weight by hand, since getting it wrong
   is worse than having none.
4. The scorecard against a live candidate. Its queries typecheck against the
   schema and bundle, but the shape of a live template — especially a
   SmartProperty formula tree — has not been seen.
5. Anything on Android.
6. The beverage page's mutations (rename, origin, producers, submit) from the
   phone, kept off shared dev data; they send the same documents the web's
   actions do.
7. Voice comments on the results page: no commission on dev has voice
   comments enabled, so `expo-audio` playback has not been heard.
8. The web results page signed in. Its server part renders the access-denied
   and load-error states; the table itself needs a signed-in browser.

## iOS 27 requires the scene life cycle

iOS 27 stops an app at launch unless it has adopted UIScene — a SIGTRAP in
`_UIApplicationEvaluateRuntimeIssueForNoSceneLifecycleAdoption` before any
JavaScript runs, whichever SDK built it. Expo SDK 58's template adopts scenes
(`ExpoAppSceneDelegate`); SDK 57's does not, so `plugins/withSceneLifecycle.js`
backports the same arrangement at prebuild: a scene manifest in Info.plist, a
`SceneDelegate.swift` that makes the window from its scene and starts React
Native in it, and an `AppDelegate` that no longer makes a window of its own.
The scene delegate rebuilds the launch options from the scene's connection
options, so `Linking.getInitialURL()` still sees a link that cold-starts the
app, and hands URLs, user activities and foreground/background events on to
`AppDelegate`, which UIKit no longer calls for them.

The plugin fails prebuild if the template's window setup is not where it
expects, rather than producing an app that dies at launch. Remove it on moving
to SDK 58.

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

## iOS and Android, one codebase

`app.config.ts` sets `platforms: ["ios", "android"]`. Web is deliberately
absent: the dev server would otherwise serve a web bundle needing
`react-native-web`, and a browser tab left open on the Metro port is enough to
trigger and fail it. The web product is the Next.js app in this same repo.

```bash
npx expo run:ios --device
npx expo run:android
```

Almost nothing forks. Of ~2,250 lines in this app, three are platform-specific:
the Liquid Glass availability check, keyboard-avoidance behaviour, and the
submit bar's non-glass background. Everything below that — `@winelore/core` —
is shared with the web app too.

### What is genuinely per-platform

- **Liquid Glass is iOS 26 only.** Android has no equivalent material; its
  language is Material 3 elevation and tonal surfaces. `SubmitBar` uses
  `GlassView` where available and a raised opaque surface otherwise, so the bar
  reads as deliberately Android rather than as a glass effect that failed.
- **Header options are split in `_layout.tsx`.** The iOS ones are not merely
  ignored on Android: `headerTransparent` there puts content under an unblurred
  header and makes it unreadable.
- **Fonts.** iOS ships Menlo; Android has no such family and silently falls
  back to sans, which looks broken rather than obviously wrong. Use the
  `MONOSPACE` token in `theme.ts`.
- **Haptics land differently.** Android's vibration API is coarser than the
  Taptic Engine, so weights tuned on iOS will not transfer directly — retune on
  a device.
- **`keychainAccessible` in `storage.ts` is iOS-only** and harmlessly ignored on
  Android, which stores through the Keystore instead.

Write-once does not mean test-once: Android needs its own device pass, and the
non-glass surfaces need an Android design review before shipping.

## Verifying a change: use the dev bundle, not `expo export`

```bash
npm run check:bundle -w @winelore/mobile          # iOS
npm run check:bundle:android -w @winelore/mobile  # Android
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

### Reanimated is installed but not imported

The first import of `react-native-reanimated` breaks the dev bundle:

```
Unable to resolve module semver/functions/satisfies
```

Its dev-only version check needs semver 7, npm hoists semver 6 to the root,
and `disableHierarchicalLookup` in `metro.config.js` stops Metro from finding
the copy nested under reanimated. Animations use React Native's `Animated`
(with the native driver) until that is resolved — pinning `semver` with
`pinPackage` would do it, but moves every other semver consumer too.
