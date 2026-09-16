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
Commissions, competitions, beverages, all four tabs and the personal
commission, competition, beverage, template and outcome policy lists, a
judge's tasting summary, a template's own page and its editor, the outcome
policy editor and the create forms are native: every page the app links to
is its own. The in-app browser remains for what is the website's by nature,
such as the AXUS ID account.

The create forms — competition, beverage, batch, sample — are the web's
create pages as page sheets at the web's paths (`/competition/create`,
`/beverage/create`, `/batch/create?beverageId=`, `/sample/create?batchId=&beverageId=`),
each with the web's sections and its live summary beneath, as a phone stacks
it: a competition's series (your own, filed for you, or a new one named
there) and schedule presets; a beverage's type, your role as its producer,
the characteristics its type asks for and its origin picked on a map; a
batch's lot and volume with the web's presets, a vintage starting at this
year; a sample's volume against what its batch has left. The bar holds
Close and the action, and a sheet with changes asks before it closes. A new
competition or beverage opens once made, as on the web; a batch or sample
made from the beverage page reloads that page. What each asks for and sends
is `@winelore/core` (`competition/create.ts`, `beverage/create.ts`) — which
series a competition lands in, the type's characteristics parsed out of the
backend's Kotlin `toString()`, the attributes' formatting, the retry without
an attribute the backend refuses, the sample's volume check — and the web's
actions call it. That fixed three things on the web: planned dates were
read in the server's time zone rather than the browser's; a new beverage's
producer was sent without an AUID, and the batch form never found your own
beverages and always offered the whole catalogue, both from reading the
actor from a header key that does not exist.

The Map tab (`src/map/`) is the web's /map on the system's map — Apple Maps
through `expo-maps` on iOS, Google Maps on Android — where the web draws
OpenStreetMap tiles. It opens where the web's does, over Ukraine. Every
beverage with an origin is a pin, searched around the view each time it
settles, as the web does; mapped wine regions are outlined, and a capsule
says how many are in view. A pin opens the beverage in a sheet at half
height that leaves the map usable behind it, as Apple Maps opens a place —
the web's panel: name, type and status, producers, when it was entered, the
origin's region and country, and the wine regions it lies in, which the map
outlines in indigo while the sheet is open.

The regions are the website's own GeoJSON files (`public/data/`, 1,183
regions, about 128,000 points), downloaded once and kept in the cache
directory for a week. Finding regions in them — a point's, the view's —
moved to `@winelore/core` (`wineRegions.ts`), which the web's server now
calls. A phone does not outline a whole country's worth: regions are drawn
once the view spans six degrees of latitude or less and holds 150 or fewer,
their outlines thinned to the zoom (`wineRegionOutlines`), and without holes,
which a native map polygon does not have. The origin's region and country
go through the same paced Nominatim queue as My Beverages. The map asks for
no location permission, so `expo-maps`' config plugin is not needed — and
its my-location button is turned off, since tapping it would ask for location
with no reason declared, which iOS does not allow. On
Android, Google Maps needs an API key in the manifest, which is not set up;
Android has not been launched yet in any case.

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
batches and samples opens their create sheets, and the page reloads when one
is made. The page lives in `app/(tabs)/(home,beverages)/`; the
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

Tapping a commission opens its page (`src/commission/CommissionScreen.tsx`),
the web's /commission/[id] as its phone layout stacks it, on the judge's own
replica: the banners to the results and a judge's own ranking, the session's
card with its live timer, the timeline, the replica selector, the steps, the
tasting panel with each judge's readiness, a holder's evaluation and replica
settings (the system's switches), and the actions — submit for review, mark
ready, the chair's start, enter the session, view results. A holder renames
the commission and replicas, edits the dates, adds replicas and adds and
removes experts (found by username, as on the beverage page). It polls every
three seconds, and when the selected replica starts, a judge on it is taken
into the session, as the web does. The data is `loadCommissionPage` in
`@winelore/core/commission`, which the web's action now calls, with the rules
for what the page shows (`commissionPageView`) and the start sequence
(`startCommissionReplica`): the web started a replica by moving the series,
competition and commission forward, binding templates and setting the first
candidate, and the app now does the same rather than only starting the
replica. Starting and submitting ask first, as they do on the competition page.

Below the tasting panel are the web's panels and templates. Each panel lists
its samples in tasting order with their blind codes (the real beverage and
producer only for holders, or once the commission is over), with the
selected replica's progress laid over them once it runs. A holder of a draft
adds, renames and deletes panels, adds samples through the web's four-step
wizard (beverage, batch, sample, code — each list loading more as it
scrolls), edits codes and deletes samples; the web drags to reorder, and a
phone moves a sample up or down from its long-press menu. The templates card
shows one template per beverage type with its coverage, version and
structure; a holder assigns, changes or removes one from the catalog sheet
until the commission starts. What a sample row says, search, progress,
reordering, the catalog and coverage are `@winelore/core/commission`
(`panels.ts`, `templates.ts`), which the web's panels section, templates
block and My Templates catalog now call; adding a sample binds a template to
a new beverage type, as the web's action always has.

A judge whose session has ended opens their tasting summary from the
commission page's banner (`src/commission/TastingSummaryScreen.tsx`, at the
web's `/commission/[id]/replica/[replicaId]/summary`): one card per sample
they completed, in tasting order, with their result scores, each opening
onto the whole assessment in the web's slate style. The download and
printing sit in the bar, as on results — core's sheets to the share sheet,
the page to the print sheet — and the origins in the file are looked up
through the same paced Nominatim queue My Beverages uses. The data is
`loadMyTastingSummary` in `@winelore/core/commission`, which the web's summary
action and waiting room now call, along with tasting order
(`replicaCandidatesInTastingOrder`, which the web's candidate page uses too),
the rule for finding a judge's own evaluation when the backend's own lookup
comes back empty, and the download's sheets. Moving them fixed two things on
the web: every property was a column twice in the download (the property
map holds each under its code and again under its id), and a vintage stored
in the backend's `{vintage=2019}` form was dropped.

A template on the commission page opens its own page (`src/templates/`, the
web's `/templates/[id]`, on the edition the commission uses via `?version=`):
the template's card, its editions to switch between when there are several,
and the edition's categories, each opening onto its properties with their
type, range, options and default. Its owner has Edit in the bar, which
opens the editor sheet; the page reloads onto the newest edition once it is
saved.
The data is `loadTemplateDetail` in core, which the web's action calls, with
the same fallbacks through the catalog for backends without the by-template
query.

My Templates (`src/templates/MyTemplatesScreen.tsx`, the web's /myTemplates)
is a list screen like the others: the templates this user owns, each card
the web's row as a phone stacks it — created, type, category and score
counts, version and status, and the edit button. The backend cannot filter
templates by owner, so it fetches the catalog whole and filters it, as the
web does (`toTemplateCatalog`), in one page. The web expands a row onto its
structure; a phone opens the template's page instead, and Home's template
cards now go there too rather than to the web's list with the row expanded.
Creating and editing open the editor sheet, and the list reloads once it
saves. (The web's My Templates opens its editor at once for `?create=1`, and
a template's page for `?edit=1`; the app used those while the editor was the
web's.)

The template editor (`src/templates/TemplateEditorSheet.tsx`, at
`/templates/new` and `/templates/[id]/edit` — the web has no page for it, only
a dialog) is the web's as a page sheet: the name and beverage type (fixed
once created), then the categories and their properties — each a name whose
code follows it, a type and what the type needs (a range, options, a
formula), and the star that makes it a result. The web drags to reorder; a
phone moves a category or property up or down from its long-press or ⋯
menu, where it is also deleted. A code renamed follows into the formulas
that use it. The checks before saving — in the web's order, stopping at the
first and marking what is at fault — the formula parser, and saving, which
changes the name and adds and activates the next edition, are core's
(`commission/templateEditor.ts`), which the web's dialog now calls. Two web
fixes came with the move: the editor loaded templates without their Smart
properties' formulas, so a template with one could not be saved again
unedited; and saving an existing template went out as the action's default
actor rather than the signed-in owner.

My Outcome Policies (`src/outcomePolicies/`, the web's /myOutcomePolicies)
lists the policies this user owns — name, created date, latest version and
its status — paging by the backend's cursor as the list scrolls. A card
opens the policy's editor and the create button a blank one, both the web's
dialog as a page sheet at the web's paths (`/outcome-policy/[id]`,
`/outcome-policy/new`): the name, fixed once created, and the script. The
script is plain monospace text with the keyboard's corrections off, since a
smart quote or an automatic capital breaks JavaScript; the web draws a code
editor. Saving adds and activates the next edition, as on the web, and the
list reloads when the sheet closes; a sheet with unsaved changes asks
before it is closed and cannot be swiped away. Loading, the duplicate-name
check, the trace id in a failure, and creating and saving are
`@winelore/core` (`outcomePolicy/policies.ts`), which the web's actions and
dialog now call. The web's own policy page saved as the action's default
actor rather than the signed-in owner; it passes the owner now.

The **waiting room** (`(home)/wait/[commissionId]/[replicaId]`) is the web's
wait page, both of its views. A judge sees that their scorecard is in, what
they submitted and how much of the panel is left; the chair sees every
member's progress with their scores as they land, out-of-delta judges
flagged, a draft confirmable in place, and the control to move the panel
on — held until every member is in. The room's state, the chair's advance
and where a waiting judge belongs are `@winelore/core`
(`commission/waitRoom.ts` and `evaluation/routing.ts`'s
`resolveWaitDestination`), which the web's page and actions now call: the
web built the members list, the progress and the advance sequence inline,
and mapped the backend's refusal messages twice.

The **Wine Jumper mini-game** a commission can switch on rides along in both
views. Its rules — speed, jump, collision, score — are `@winelore/core`'s
`wineJumper.ts`, so the same play scores the same on either platform; only
the control differs, the space bar on the web and the whole field on a
phone. The web's copy had its strings hardcoded in Ukrainian and is now
translated like everything else.

**Scorecard comments** are per-property and general, each with text, a voice
note, or both, shown only where the commission allows them. Recording is
`expo-audio` (which the results screens already play notes with), and the
recording is uploaded on submit rather than while it is made, so a judge
who re-records or abandons the card costs nothing. What counts as a comment
and the order they arrive in is core's `evaluation/comments.ts`, which the
web form now calls too; a failed upload costs the note, never the
scorecard. The microphone needs a usage string, so `expo-audio`'s config
plugin is in `app.config.ts` — a build after pulling this needs a
`prebuild`.

Not yet ported:

- **The AI tasting draft**, which posts to a Next API route the native app has
  no equivalent of yet.

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
- The commission page for a holder who judges on it, on a draft commission:
  every section from the session card to the actions, panels with their
  samples and codes, templates with their coverage, the add-sample wizard,
  the template catalog and the edit-code dialog; and a finished commission.
- A judge's tasting summary on a finished dev commission: both samples in
  tasting order with their total scores, one opened onto its submitted
  scores and results, and the export and print buttons in the bar.
- Template pages: an owner's (Edit in the bar, opened on `?version=1` of
  two) and someone else's (no Edit, opened on the latest of fourteen), with
  a category opened onto its properties.
- My Templates for a user with three templates: their counts, versions and
  edit buttons, the count chip and the create button.
- My Outcome Policies with a user's one policy, its editor sheet (the name
  read-only, the script, Save held until the script changes) and a blank
  create sheet.
- The Map over Ukraine with dev's pins and its region count, and a
  Zakarpattia beverage's sheet — producers, date, region and country.
- The four create forms opened as they are reached: competition (the user's
  own series chosen), beverage (types, roles), batch for a beverage and
  sample for a batch (its total, used and remaining volume).
- The template editor on an owner's template, its formula loaded — which
  the web's editor lost before — and on a new one.
- The scorecard against a live dev candidate (`WINE-3`, ten properties over
  Color and Aroma), with the per-property comment fields and their record
  buttons switched on by that commission's own flags — and on sample data,
  where a computed subtotal correctly has no comment field.
- Both waiting rooms, on a dev competition seeded for the purpose
  (`MOBILE VERIFY 979278`, two replicas over one three-sample panel). The
  chair's: the panel and current candidate, their own confirmed card with
  its result score and general comment, the other judge's draft with its
  Confirm control, and an enabled Next Beverage once both were in. A
  judge's: their own submitted scores and comment, the candidates-left
  count, and no redirect — `resolveWaitDestination` agreeing with the
  server. Names resolve through AXUS on both.
- The Wine Jumper card in a judge's room, on a commission with the game
  enabled. It was not played on the phone — that needs a tap — but the same
  core rules were played through in the browser: standing still ends the
  game where the tests say it does, and jumping in the window they pin
  clears glasses and scores.
- **The web's own wait page**, both views, against the same seeded
  competition on a dev server with an `auid` cookie: the chair's dashboard
  with both judges' cards and the mini-game, and a judge's own scores,
  comment and count. This is the first time the refactored web page, its
  core-backed action and the translated game have actually run.
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
4. Anything on Android.
5. The beverage page's mutations (rename, origin, producers, submit) from the
   phone, kept off shared dev data; they send the same documents the web's
   actions do.
6. Voice-comment playback. Dev commissions do have voice comments enabled,
   but no judge has left a recording on one, so `expo-audio` playback has
   still not been heard.
7. The commission page's changes from the phone — readiness, the chair's
   start, settings, replicas, experts, panels, samples, codes, templates —
   kept off shared dev data; they send core's documents and sequences.
8. Anything that needs typing or tapping on the phone: the tasting
   summary's download and print sheet; typing in the outcome policy script
   (that no smart quotes creep in) and saving it; the create forms and the
   template editor filled in and saved, a map pin tapped; the files are
   core's sheets, which the tests cover.
9. **Voice recording.** No recording has been made or uploaded from the
   phone, because starting one needs a tap: whether the microphone prompt
   appears, whether `expo-audio` captures, and whether an `audio/mp4` PUT to
   the presigned URL is accepted are all still open. The same goes for
   playing the mini-game, whose rules the core tests cover but whose motion
   has not been watched.
10. The rest of the web signed in — results, tasting summary, template and
    outcome-policy pages. The wait page was exercised with an `auid`
    cookie against a dev server (above); the others still need a real
    AXUS session.

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
