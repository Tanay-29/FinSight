# FinSight: session handoff

Read this first. It exists so a new session can pick up without re-deriving
context. Last updated 26 August 2026.

---

## 0. Scope of this repository, read before anything else

**This repository is FinSight, the college group project. Work on nothing else
here.**

There is a separate product idea, a warm daily money companion, with its own
research and product plan. It lives entirely at:

```
C:\Users\balaj\Downloads\money-app
```

That folder is self-contained and has its own README with a start-here prompt.
**Do not open it, reference it, or do work on it from this repository.** It is a
different product with a different audience. Mixing them was making both worse,
which is why they were split.

If a request is about the companion app, the mascot, the daily check-in loop, or
anything not in this codebase, say so and point at that folder.

---

## 1. What FinSight is

A financial-literacy app for Indian college students. Monorepo:
`FinSight-Frontend/` is Expo (SDK 54) / React Native 0.81.5 + TypeScript +
Redux Toolkit + Firebase (Auth and Firestore); `FinSight-Backend/` is a small
Flask API that exists for two things a client cannot safely do itself, hold the
Gemini API key and scrape Yahoo Finance via `yfinance`. Everything else lives in
Firestore, per user.

Built by Balaji Thukuntala with a group. There is an accompanying research paper
at `../FinSight_Paper_v2.md`, worth reading: several of the fixes below came
directly from its analysis.

---

## 2. Working rules

- **Commit and push together.** When asked to commit, push in the same turn. Do
  not ask for the push separately. Do not commit unprompted.
- **Never add Claude or AI attribution anywhere.** No `Co-Authored-By`, no
  "Generated with" line, no mention in any commit message or file header. A
  previous project had this leak into GitHub contributors. Verify author and
  committer are Balaji before every push.
- **No emojis, no em dashes** anywhere in app code, UI strings, AI prompts or
  mock data. Lucide icons only. The ESLint config enforces the emoji half.
- Remote is `github.com/Tanay-29/FinSight`, branch `main`. Fetch and check
  divergence before pushing. Never force-push.

### The trap that will catch you

**Most files carry unrelated uncommitted work from earlier sessions.** Staging a
whole file usually drags in someone else's changes, and in one case would have
committed a navigator importing seven screens that do not exist in the
repository, breaking the build for anyone who cloned it.

The procedure used throughout:

1. Back up the working file.
2. `git checkout HEAD -- <file>`.
3. Re-apply only the intended change on top of HEAD.
4. Commit.
5. Restore the working file from the backup.

**And verify in an isolated `git worktree`, not the working tree.** The working
tree mixes committed and uncommitted state and will lie to you. It once reported
a type error that would not exist in the committed tree, and once hid a lint
failure that did.

---

## 3. State as of 26 August 2026

**Branch `main`, in sync with `origin/main`. 68 files uncommitted, including
the backend authentication work described in section 5.**

Committed and pushed, newest first:

```
0c3ebe0  fix(categoriser): word-boundary matching, longest match first, one shared table
27f703a  fix(vitals,iq): normalise 50/30/20 by income and bound the score terms
3b8b9f2  style(vitals): replace emoji with Lucide icons in BurnRateScreen
cab37f4  fix(brokerage): replace the price process with geometric Brownian motion
f74384f  feat(vitals): count no-spend days and treat them as wins
61e19cf  refactor(vitals): move burn rate, savings and 50/30/20 to the client
7e97226  feat(goals): add Squad Goals, a savings goal shared between users
3cbcdf8  feat(ui): add haptics, confetti, animated counters and shared formatters
8883132  feat(backend): cache Gemini and Yahoo responses, pin gunicorn to one worker
bbef245  chore(tooling): add ESLint flat config and typecheck/lint scripts
97a91f1  refactor(theme): make palette.js the single source of colour truth
862f2c1  chore(firebase): add Firestore security rules, indexes and project config
3c55507  chore: add root gitignore and stop tracking generated files
```

### Health

`npm run check` in `FinSight-Frontend/`: **0 errors, 134 warnings.**

There are **3 pre-existing type errors in the committed tree**, in
`FinSightIQCard.tsx` and `CuratedBasketScreen.tsx`. Their fixes are among the 68
uncommitted files. They predate all recent work, which was verified not to add
any.

---

## 4. All four defects from the paper are fixed

§8.1 listed three to fix before putting FinSight in front of learners, and §7.3
documented a fourth. All are done, each verified rather than asserted.

**Price process (§7.2).** Was `P * (1 + U(-0.02, 0.02))`, which drifts down by
Jensen's inequality and annualises to 837% volatility, so portfolios halved
weekly regardless of the learner's decisions. Replaced with geometric Brownian
motion, with per-asset-class drift and volatility, so a single stock now visibly
swings more than an index fund. Monte Carlo over 300 trials: the weekly price
ratio went from 0.481 to 1.005, against an analytic 1.002.

**50/30/20 (§5).** Divided by spending instead of income, so a learner who saved
by not spending was told at CRITICAL severity that they were not saving. Now
normalised by income, with the residual credited to savings. Where income is
unknown the rule is not evaluated at all. 10 assertions.

**Score terms (§4.3).** Budget and goal terms summed without limit, so ten roomy
budgets bought +100 and two finished goals contributed +400. Budget clamped to
+/-100, goals capped at +200. 11 assertions, including that the paper's worked
example still returns exactly 735.

**Categorisers (§7.3).** Two disagreeing keyword tables using substring matching
and first-match-wins ordering. Now one shared table in `utils/merchantRules.ts`
with word-boundary matching and longest match first. 24 assertions, one per
named defect. Bare `reliance` is deliberately left unmatched because it is
genuinely ambiguous: Digital is electronics, Fresh is a supermarket, Jio is a
telco.

**The paper is now out of date in its own tense.** §7.2, §7.3, §8.1 and the
conclusion describe defects that no longer exist. The analysis still stands as
the contribution, since finding and quantifying them was the work. If that draft
goes anywhere, it can legitimately say all four were corrected.

---

## 5. What to do next

Nothing is half-finished. These are options, roughly by value.

**1. The categoriser accuracy study (§7.4).** The paper says this gates every
behavioural signal the app depends on, and it now needs only a labelled corpus.
`category_corrections` in Firestore already collects user corrections and
**nothing consumes them yet.** That is the dataset.

**2. Backend authentication. DONE, uncommitted.** Every user-scoped route now
requires a verified Firebase ID token.

`FinSight-Backend/auth.py` holds a `require_auth` decorator that verifies the
`Authorization: Bearer` token with `google-auth`, which was already a
dependency, so `firebase-admin` was not needed. It checks signature, audience
and expiry through `verify_firebase_token`, then checks the issuer separately,
because a token minted by a different Firebase project carries a valid Google
signature and would otherwise be accepted.

The important half is not the token check. Every route now reads the account
from `g.uid` and the `user_id` field is gone from the wire entirely. Requiring
a token while still trusting a `user_id` in the body would have left any signed
in user able to credit or drain any other account by typing someone else's uid.
The frontend services no longer take a `user_id` argument for the same reason.

Gated: the 11 user-scoped SQLite routes, plus `/api/ai-advisor` and
`/api/generate-flashcards`, which cost Gemini quota per call and the first of
which receives a window of the user's transactions, plus `/api/cache-stats`.
Left public: `/api/prices`, `/api/market-pulse` and `/api/market-insight`,
which serve identical cached data to everyone and carry nothing personal.

CORS is now an allowlist from `ALLOWED_ORIGINS`, with `Authorization` in the
permitted headers so the web build's preflight passes. Note that CORS does
nothing for the native app, which is not subject to it. The token is what
protects native.

`FIREBASE_PROJECT_ID` and `ALLOWED_ORIGINS` are declared in `render.yaml` and
**must be set in the Render dashboard before this is deployed,** and the
deployed web origin added to the second one.

Verified with throwaway scripts, in the pattern used everywhere else here: 15
assertions on auth.py covering every rejection path, the cross-project token,
and an explicit impersonation test that credits one account while naming
another in the body and confirms the money lands on the caller. 4 assertions on
the CORS allowlist. `npm run check` is unchanged at 0 errors, 134 warnings.

**Not done: no server-side rate limiting.** A signed-in user can still call the
Gemini endpoints in a loop. The cache blunts repeat calls with identical
inputs, not a determined one.

**3. Commit the remaining 68 files.** Mostly Phase 3 Wave 1 and 2 features, the
rest of the em-dash sweep, the README rewrite, and this file. Read §2 first.

**4. Real-device testing. SET UP, not yet run.** Everything below is in place;
nobody has installed the APK yet.

`src/config/firebase.ts` now calls `initializeAuth` with AsyncStorage
persistence instead of `getAuth`. It was using in-memory persistence, so every
app restart signed the user out. That went unnoticed in Expo Go and would have
been constant in a standalone build, doubly so now that being signed out means
every backend call fails. Note the cast in that file: Metro resolves
`firebase/auth` to its React Native build, which exports
`getReactNativePersistence`, but the package lists one top-level `types` entry
ahead of its `react-native` condition, so TypeScript never sees it. The
try/catch fallback covers both the web build, where the symbol is genuinely
absent, and Fast Refresh re-running the module.

`expo-build-properties` was added with `android.usesCleartextTraffic: true`,
because a release APK otherwise refuses plain HTTP and cannot reach a Flask
backend on the LAN. `eas.json` preview gained `distribution: internal` so EAS
returns an install link.

**`EXPO_PUBLIC_*` values are inlined at build time,** so whatever backend URL is
in `.env` is frozen into the APK and changing it means a full rebuild. That one
fact drives everything below. The stale `EXPO_PUBLIC_GEMINI_API_KEY` was
removed; it was referenced nowhere, so it was never in the bundle.

`tunnel.ps1` in the repo root exposes the local Flask backend over HTTPS, which
avoids the cleartext problem entirely and works off Wi-Fi. It has two modes and
rewrites `EXPO_PUBLIC_BACKEND_URL` itself, then says whether the URL changed,
because a changed URL means a rebuild.

- `.\tunnel.ps1` uses a cloudflared quick tunnel. No account, but **the URL is
  regenerated every run,** so every restart costs a 10 to 20 minute rebuild.
  Fine for one sitting, painful as a habit.
- `.\tunnel.ps1 -Domain <name>.ngrok-free.app` uses a reserved ngrok domain and
  the URL never changes, so one build lasts indefinitely. This is the mode worth
  using. It needs an ngrok authtoken, which is per account and therefore cannot
  be set up for you: `ngrok config add-authtoken <token>` once, and claim the
  one free static domain from the ngrok dashboard.

ngrok 3.3.1 and cloudflared are installed via winget. Note that the npm `ngrok`
package on this machine is a broken shim that shadows the real binary in PATH;
`tunnel.ps1` skips anything under the npm directory for that reason.

`usesCleartextTraffic` stays set even though a tunnel makes it unnecessary. It
costs nothing and is what makes a direct LAN IP work if the tunnel is skipped.

The Render service is **suspended by its owner** and, more importantly, runs
pre-auth code. Frontend and backend are now a matched pair: the app sends no
`user_id` and the old backend requires one, so resuming Render without
deploying the new backend returns 400 on every wallet, brokerage and round-up
call. Test against the local backend until both ship together.

**Still untested on a phone:** haptics, confetti, share cards, streak freeze and
Squad Goals. Only typechecked, linted and unit-tested.

**5. Longer-term.** SQLite on Render's ephemeral disk still loses brokerage,
wallet and round-up data on every redeploy. No push notifications
(`expo-notifications` is not installed). No test runner: all verification so far
has used throwaway scripts.

---

## 5b. Real versus demo audit, 26 August 2026

Done in response to a faculty instruction that nothing in the app should be a
demo. The useful distinction is not simulated versus real, it is **honest
versus misleading**. A learning app for students must simulate a brokerage,
nobody is handing undergraduates real trades, and that is a teaching decision
rather than a shortcut. What cannot stand is invented data presented as if it
were the user's own or the market's.

**Fixed in this pass.**

- `BurnRateScreen` hardcoded `useState(50000)` for monthly income and printed
  "Based on Rs 50,000 monthly income" to every user. Onboarding already
  collects an income band and stores it on the profile, and nothing read it.
  Now seeded from that band, with "prefer not to say" and a missing profile
  both yielding 0, which `utils/vitals.ts` already treats as unknown and skips
  the rule for. The whole 50/30/20 correction was running against a fabricated
  denominator until now.
- `feedSlice` seeded `MOCK_MARKET_DATA` on pending and kept it on rejection, so
  a stale hardcoded NIFTY 22145 and SENSEX 73298 could sit on screen looking
  live. Removed. It turned out to be unreachable anyway, see below.
- `LoginScreen` gained a show/hide password toggle, plus `autoCapitalize="none"`
  which was missing and actively broke password entry on mobile keyboards.

**`CuratedBasketScreen` was rewritten.** It now teaches how a diversified
portfolio is structured, using three asset classes with their roles and their
trade-offs, over a compounding calculator whose monthly amount, horizon and
assumed rate the learner sets. No named securities, no claim to be
personalised, and an explicit note that a projection is not a promise. The
"Start Auto-Invest (SIP)" button used to call `navigation.replace('MainTabs')`
and nothing else, so it promised to open a recurring investment and silently
did not; it now goes to the simulator, labelled as simulated money.

For the record, what it used to be:

It defines a literal `mockReduxState` with `riskTolerance: 'moderate'` and
`yearsToFI: 15`, then tells the user "Based on your moderate profile and your
15-year runway to Financial Independence, here is your mathematically optimized
portfolio." All three claims are false: neither value is ever collected
anywhere in the app, and the "optimisation" is a switch statement with a single
default branch. It is the only screen in the codebase with no Redux selector at
all. Separately it names specific real securities with allocation percentages,
which is the personalised investment advice that section 8.4 of the paper says
FinSight does not give. That is all gone.

**Dead code, now removed.**

- `store/slices/feedSlice.ts`, a second market implementation nothing read.
  No selector touched `state.feed`, nothing dispatched its actions, and its
  `fetchMarketPulse` was shadowed by the live thunk in `marketSlice`. Same
  duplication pattern as the two categorisers. Unregistered from `store.ts`.
- `services/marketService.ts`, which only `feedSlice` imported. `marketSlice`
  calls the backend directly, so this died with it.
- `components/LearningPathCard.tsx`, never rendered, only named in a comment
  that has been corrected. It read the hardcoded `{ completed: 3, total: 8 }`,
  so wiring it up would have shown a new user three finished modules.
- The `@maniac-tech/react-native-expo-read-sms` dependency, never imported. It
  was also the only thing that would have forced a dev build over Expo Go.

All three files are backed up in the session scratchpad, and git recorded the
removals rather than losing them.

**Forgot password added.** `sendPasswordReset` in `services/authService.ts`
wraps `sendPasswordResetEmail`, and **deliberately swallows
`auth/user-not-found` and `auth/invalid-email`** so the screen resolves the
same way for a registered and an unregistered address. Reporting the real
error would have turned the login screen into a way of testing which emails
have accounts. The UI wording matches: "if an account exists for that email".
The link shows in sign-in mode only.

**Twelve Tailwind classes were silently doing nothing.** `bg-bg-primary`,
`bg-bg-secondary` and `border-border-default` appear across `LoginScreen` and
`CuratedBasketScreen`, but `tailwind.config.js` defines no `bg` colour
namespace at all, and `border` carries `DEFAULT`/`focus` rather than a
`default` key. NativeWind drops classes it cannot resolve, so those inputs had
been rendering with no background or border colour. Corrected to
`bg-surface-primary`, `bg-surface-secondary` and `border-border`. Worth
knowing that this class of bug is invisible to both typecheck and lint.

**Naming, done.** `data/mockData.ts` is now `data/courseContent.ts`, with
`MOCK_LEARNING_PATHS` as `COURSE_CONTENT` and `MOCK_GLOSSARY` as `GLOSSARY`.
That file holds roughly 700 lines of genuinely written course material, 19
modules on NSE, BSE, SIPs and the rest, and the prefix was the only thing about
it that was a demo. Nine importers updated, and git recorded it as a rename.

The genuinely fake datasets in that file, `MOCK_MARKET_DATA`,
`MOCK_EITM_CARDS`, `MOCK_TRANSACTIONS`, `MOCK_CATEGORY_SPENDING`,
`MOCK_BUDGETS` and `MOCK_WEEKLY_TREND`, all had zero readers and were deleted,
taking the file from 976 lines to 811. `utils/insights.ts` was importing three
symbols it never used, which is why the lint baseline dropped from 134 warnings
to 131.

---

## 5c. The leak projection, and what it exposed

`SubscriptionTrackerScreen` now shows what the detected leak is worth if it is
redirected rather than spent, over 5, 10 or 20 years. Once anything is marked
for cancelling it projects that figure instead of the whole committed total,
because that is the amount the user can act on today.

It calls `futureValueOfSeries` from `utils/projections.ts`, the same function
the Time Machine uses, rather than growing a second copy. Verified against an
independently computed closed form: 5 assertions covering the reference case,
the zero-rate branch that would otherwise divide by zero, zero years, zero
amount, and growth exceeding contributions. Rs 1,200 a month at 10% is
Rs 2.48 L over ten years and Rs 9.19 L over twenty.

**The two future-value implementations are now one.** `utils/projections.ts`
used an ordinary annuity, contributions at the end of each period, while
`CuratedBasketScreen` carried its own local copy using an annuity due,
contributions at the start. They disagreed by a factor of (1 + monthly rate),
about 0.8% a year, which is the same duplication pattern as the two
categorisers.

Annuity due won, and `projections.ts` was corrected to it. A SIP invests on a
chosen date and the money starts earning immediately, which is the formula AMFI
and the fund houses publish, and it is equally right for the question this file
exists to answer: money you did not spend becomes available when you would have
spent it, not a month later. The screen-local copy is deleted and all three
callers, Time Machine, Curated Basket and the leak projection, share one
function.

Figures moved up by that factor. Rs 1,200 a month at 10% over ten years went
from Rs 2.46 L to Rs 2.48 L, and over twenty from Rs 9.11 L to Rs 9.19 L.

Verified with 18 assertions across two runs: the shared function now equals the
screen-local one it replaced to within 1e-6 across four amount, rate and
horizon combinations; the ratio to the old ordinary annuity is exactly
(1 + monthly rate); the zero-rate, zero-year and zero-amount guards still hold;
daily, weekly and monthly all follow the same convention; and `projectionSeries`,
which draws the Time Machine chart, agrees with a direct call rather than
carrying a stale copy of the maths.

Not unified, deliberately: `formatCompactINR` in `projections.ts` and
`formatCurrency` in `CuratedBasketScreen` look like duplicates but differ for
figures between a thousand and a lakh. The shared one renders Rs 24,000 as
"Rs 24.0K", which is right for a projected total and wrong for a monthly amount
the user just typed.

**Merchant grouping, fixed.** The detector keyed on the first word of the
merchant name, so "Amazon Prime" and "Amazon" collapsed into a single group, as
did "Google One" and "Google Pay". On ninety days of realistic data that
reported one Rs 923 a month "subscription" covering both a real Rs 299 Prime
renewal and three unrelated shopping trips, inflating the leak and calling a
shopping habit a subscription.

`utils/merchantRules.ts` now exports `merchantKey`, which returns the matched
rule keyword when one applies and the whole normalised name otherwise. The
tracker uses it, so merchant identity lives in one file rather than three.
`'amazon prime': 'entertainment'` was added to the table, following the same
longest-match pattern as `'swiggy instamart'`, because Amazon Prime is a
subscription rather than a shopping trip.

Verified with 19 assertions, since the original categoriser assertions were
throwaway scripts and no longer exist. They cover the defects the shared table
was built for, the new rule, and the grouping identities: Netflix and Netflix
India together, Swiggy and Swiggy Instamart apart, Amazon Prime and Amazon
apart. Note that bare `reliance` is deliberately unmatched while
`reliance digital`, `reliance fresh` and `reliance smart` all resolve.

**Variance check, the other half.** Grouping alone did not stop false
subscriptions, because the detector classified on interval only: three Amazon
purchases thirty days apart still read as a monthly plan even at Rs 1,450,
Rs 890 and Rs 2,300. Steadiness of amount is now checked first, since it is the
stronger signal.

`utils/recurring.ts` holds `amountVariation`, a coefficient of variation, and
`classifyRecurring`. A near-constant amount is a subscription, or weekly under
ten days. Above 0.15 variation it is a bill that varies, labelled "Varies" in
the UI. Above 0.60 the amounts have nothing in common and the group is dropped
as a frequently visited merchant rather than a commitment. The interval bounds,
3 to 50 days, are unchanged.

That also revives the `recurring` type, which previously covered only the 41 to
50 day band and so almost never appeared despite being a top-level tab. It now
means "regular but variable", which is what electricity and phone bills
actually are.

The logic sits in `utils/` rather than in the screen so it can be checked
directly, matching `vitals.ts`, `projections.ts` and `merchantRules.ts`.
Verified with 26 assertions across two runs: the variation helper including its
divide-by-zero guard, the Amazon case in both directions, a Netflix price rise
that must stay a subscription, the interval boundaries at 3, 10, 11 and 50
days, and both thresholds probed either side and exactly on.

Thresholds worth knowing when reading results: Amazon shopping at
1450/890/2300 is 0.375, a Netflix rise from 199 to 249 is 0.109, electricity at
800/1200/950 is 0.168.

The `recurring` classification is nearly unreachable. Intervals above 50 days
are rejected outright and anything up to 40 days is `subscription`, leaving
`recurring` to cover only 41 to 50 days, while the tab filter offers it as a
top-level choice. The header comment described the opposite of what the code
does and has been corrected.

---

## 5d. The Vitals restructure

`VitalsScreen` had become a directory rather than a screen: 734 lines, roughly
fourteen sections and **twelve exits**, under headings its own source called
"Feature Quick-Access Row" and "Intelligence Quick-Access Row". Feed rendered
`<FinancialVitals />` while Vitals rendered its own spending pulse, budget
summary and category chart, so two screens answered "how am I doing" and a
reader could not tell which to open.

The rule applied: **a feature hangs off the number it explains, or moves to the
tab whose question it answers.** Nothing was deleted.

Vitals keeps no-spend days, the spending pulse, the budget summary, the
category chart, top goal progress and the budget breakdown. Three tools became
drill-downs rather than tiles: the spending pulse opens Burn Rate, which is the
same question over a longer window; the budget summary opens the 50/30/20 view
of the same money; the category chart opens the recurring charge detector,
which finds what is hiding inside those categories. **Twelve exits down to
five**, 734 lines down to 523.

Moved out: Guess Your Spend, Tidy Up and Time Machine to Learn, under a
labelled Practise group, because they teach by doing and Vitals is where you go
to see how the month is going. Round-Up and Split to Goals, since both are ways
money moves towards or between people's savings. Wrapped to Profile, because a
look back at the account belongs beside the account.

The simulated brokerage was left two hops from any tab once its Vitals tile
went, reachable only through the Curated Basket lesson, so it was added to the
Practise group as well.

**Learn is now the screen with the most exits, nine.** That is worth watching.
The difference from what Vitals was is that they are grouped under a visible
heading and every one of them answers the same question, rather than sitting in
an unlabelled grid of unrelated tiles. If it starts to feel heavy, the Practise
group is the natural thing to split out.

Also corrected: Feed's investing entry still read "Get Your Curated Basket,
based on your risk profile", the same false personalisation removed from the
destination screen itself, and a raw arrow glyph where a Lucide icon belongs.

Verified by auditing every stack destination for reachability, not just the
ones that moved: all 23 reach a tab, and Login and Onboarding are auth-gated in
the navigator rather than navigated to. `npm run check` went from 131 warnings
to 127, because removing the tiles orphaned imports that were already warning.
The two warnings left in `VitalsScreen` were there at HEAD; it had five.

---

## 5e. category_corrections, and what wiring it up uncovered

**The categoriser fix had never reached users.** Commit `0c3ebe0` built
`utils/merchantRules.ts` with word-boundary matching and longest match first,
and gave it to `utils/smartCategorizer.ts` and `services/notificationParser.ts`.
Both of those are imported nowhere. The only categorisation path anyone
actually reached, `AddTransactionScreen`, carried a **third** table of its own
and matched it with `lowerText.includes(keyword)`, breaking at the first
category in declaration order.

That is both documented defects, still live: `gas` matched Vegas, `sip` matched
gossip, `prime` matched Amazon Prime and `vi` shadowed prime video. The fix was
right and simply never connected to the screen.

`AddTransactionScreen` now imports the shared parser and its local table is
gone. The merge went both ways: that copy's amount handling was better than the
shared one's, understanding "debited by", "payment of" and "paid" and falling
back to a bare decimal like 103.00, and it treated "deposited" as a credit.
All of that is kept in `smartCategorizer` rather than thrown away with the
substring matching.

**The correction loop is now closed.** `matchMerchant` takes an optional
`learned` table, merged with the built-in rules and matched in the same single
longest-first pass. Merging rather than checking corrections first is
deliberate: someone who corrected `swiggy` has not thereby overruled the more
specific `swiggy instamart`, while a correction on the same keyword as a rule
does win, because they told us and the table only guessed.

`getCategoryCorrections` reads the subcollection and collapses it to a merchant
to category map, most recent correction winning. One document is written per
correction event, so a merchant corrected twice appears twice. The transactions
slice holds the map, loads it when Add Transaction mounts, and updates it
optimistically on the correcting action so a merchant just fixed is already
right for the next paste in the same session.

This makes the Tidy Up card's promise true. It says "sort miscategorised
transactions and teach the app as you go", which until now it did not.

Verified with 24 assertions across two runs: every documented substring and
shadowing defect, the amount phrasings and credit wording kept from the screen
copy, an unknown merchant before and after correction, and that a correction
cannot disturb longest-match ordering.

**Still dead:** `services/notificationParser.ts` is imported nowhere. Unlike the
feed slice, that is not an accident. It is the Android notification listener,
which needs a development build and is disabled in Expo Go, so it is waiting
rather than abandoned. Worth a decision either way.

**For the accuracy study.** The corpus is now both collected and consumed, so
corrections are worth something to the user rather than only to the paper. The
labelled data is `users/{uid}/category_corrections`, each document a merchant,
a category and a timestamp, which is exactly the before-and-after error rate
the study needs.

---

## 5f. Error messages, and cutting the app down to its spine

**Every error the app showed was written for a developer.** All 25 thunks
rejected with `error.message`, which for Firebase is literally
`Firebase: Error (auth/invalid-credential).` That is what appeared on the login
screen. There was no error mapping anywhere in the codebase.

`utils/errors.ts` maps Firebase Auth and Firestore codes to sentences, and
every call site passes a fallback written for the thing being attempted rather
than a generic apology. An unmapped code, a missing code, or a stack blob all
resolve to that fallback, so a raw SDK string can no longer reach a user.
Errors the app raises itself carry no code and are already written for a
person, so those pass through.

Note that wrong password, unknown email and `invalid-credential` all give the
same sentence on purpose. Distinguishing them tells an attacker which addresses
have accounts, the same reasoning as the password reset.

Verified with 16 assertions, including that the three enumeration cases are
byte-identical and that nothing raw escapes.

**The app was cut to its spine.** 26 files deleted: the whole simulated
brokerage (Invest, Portfolio, Curated Basket, Round-Up, plus the brokerage and
wallet slices and services), Squad Goals, League, Split, Wrapped, Money
Personality, the streak wager and the daily question.

The reasoning, from the session that preceded it: every feature worked in
isolation and the plumbing between them was never finished, which is why the
app felt broken while most things technically functioned. Twenty-five features
at eighty percent is worse than eight at a hundred, and only one of those is
finishable by a student team.

What is left is the spine: log an expense, see where the money went, find the
leak and what it costs, learn, save towards a goal. Guess Your Spend and Tidy
Up were kept, Tidy Up because it now feeds the categoriser and so earns its
place.

18 screens down from 27, nine navigator destinations removed, lint warnings
127 to 94. Verified with a real Android bundle rather than a typecheck, and by
auditing every `navigate()` target against the navigator, since
`navigate('X' as never)` is invisible to TypeScript and five cards were still
pointing at deleted screens after the imports were clean.

**The eleven SQLite backend routes are now dead.** `/api/orders`,
`/api/portfolio`, `/api/ledger`, `/api/wallet*` and `/api/roundup/*` exist only
for the brokerage the app no longer has. `/api/prices` too. Nothing calls them.
Deleting them, and the SQLite layer with them, would remove most of the backend
and all of its state, leaving Flask holding the Gemini key and the Yahoo
scraper, which is what section 1 says it is for. Not done here because it is a
backend decision of its own.

**Known open, from the same session.** Squad Goals was cut rather than fixed,
but the cause is recorded for whoever revisits it: `createSquad` did a `getDoc`
collision check first, and the read rule requires membership, so a
non-existent document denies the read and Firestore reports "Missing or
insufficient permissions". `joinSquad` ten lines below carries a comment
explaining exactly this hazard, which the create path did not apply.

The categoriser does not know railways: `irctc` is in the table, `railway` and
`indian railway` are not, and squashed bank codes like `IRCTCWEB` fail the word
boundary that stops `gas` matching Vegas. The manual category picker offers
`health`, `housing` and `other` while the categoriser produces `healthcare` and
has neither of the others, so hand-picked and parsed transactions land in
different buckets. There are no empty states in Feed or Vitals. And a render
error about a missing navigation context, reported around the income toggle,
could not be reproduced from the source: the container is wired correctly and
all twelve `useNavigation` calls are inside it, so it needs the full red screen
to chase.

---

## 5g. Empty states

Feed and Vitals rendered their full layout against no data: a score of 400
computed from nothing, zeroed vitals, an empty insight carousel and a bare
"No recent transactions". A first-time user saw a dashboard of noughts with
nothing telling them what to do about it.

`components/EmptyState.tsx` follows the shape the goals list already used
properly: one icon, one sentence naming what is missing, one on why it is worth
doing, one button. Feed and Vitals now swap their data-dependent sections for it
when nothing has been logged, and both point at Add Transaction and mention the
SMS paste, which is the fastest way in.

The market pulse stays visible on Feed either way. It is real data that works on
day one, so it is the one panel a brand new account still gets.

**The gate is `loaded && !error && count === 0`, and both extra conditions were
found by working through the states rather than by reasoning about the happy
path.** `loading` alone cannot answer "is this account empty", because it starts
false: between mount and the first pending action an existing user looks exactly
like a new one, which would have flashed the first-run screen at everybody on
every launch. Hence the new `loaded` flag on the transactions slice, set when a
fetch settles either way. The `!error` condition came second: with only
`loaded`, a failed fetch told an offline user with a full ledger that they had
never spent anything.

Verified over the six states a user actually passes through, including a failed
fetch with an empty cache and a failed fetch with a populated one, and with a
real Android bundle.

Learn needs no empty state, its content is static. Goals already had one.

---

## 5h. One category vocabulary, and merchants the parser could not see

**There were five category vocabularies.** The add-transaction picker offered
`health`, `housing` and `other`; the merchant rules produced `healthcare` and
neither of the other two; the budget picker offered `health` but no `housing`;
the sorting game assigned `rent` and `miscellaneous`, which no picker offered
and no icon map knew; and the three icon maps keyed on `healthcare` alone.

So a transaction filed by hand under `health` and one the parser filed under
`healthcare` were different categories. Separate rows in the chart, a generic
dollar icon instead of a heart, and a budget set on one that never saw spending
on the other. `utils/vitals.ts` had already noticed and worked around it,
listing every spelling in its needs-and-wants map rather than fixing the cause,
which is the usual sign that the cause is somewhere else.

`utils/categories.ts` is now the single list: eleven categories, used by both
pickers and the sorting game. `normaliseCategory` maps the spellings already
sitting in Firestore, `health`, `rent`, `miscellaneous`, `misc`, `medical`,
`food`, onto canonical ones, so nothing has to be migrated and older data keeps
resolving. Icon lookups and the bucket map go through it, and `ExpenseCategory`
in the merchant rules is now an alias of the shared type, so the rules cannot
invent a category no picker offers.

**Railway merchants.** `irctc` was in the table but `railway` was not, and
squashed bank codes like `IRCTCWEB` failed the word boundary that stops `gas`
matching Vegas. Both are fixed, the second by a deliberately narrow mechanism: a
keyword may also match at the start of a longer word, but only when what follows
is one of a short list of noise suffixes, `web`, `uts`, `in`, `pay` and the
like. "irctcweb" splits into a keyword and noise; "gasoline" does not, because
"oline" is not on the list.

That second pass runs only after the clean-boundary pass has failed across every
keyword, never interleaved, so `swiggy instamart` cannot lose to a stray
squashed `swiggy`.

Verified with 29 assertions across two runs: the railway formats that failed,
every substring defect the boundary exists to stop, the squashed forms
`NETFLIXIN` and `AMAZONPAY`, longest-match ordering under the new pass, the
legacy category spellings, and the 50/30/20 bucketing with legacy spellings
still landing in the right bucket.

---

## 5i. The backend is four routes now

Cutting the brokerage from the app left eleven backend routes with no callers:
`/api/prices`, `/api/orders` twice over, `/api/portfolio`, `/api/ledger`, the
three wallet routes and the four round-up ones. They are gone, and the SQLite
layer under them with them.

Deleted: `blueprints/` entire, `database.py`, and the background thread that
ticked mock prices every sixty seconds. `APScheduler` came out of
`requirements.txt`, having existed only for that thread. A stray empty
`package-lock.json`, left by an `npm install` in the wrong directory, went too.

What is left is `main.py`, `auth.py` and `cache.py`, serving four routes the app
calls plus a cache readout. That is the service section 1 describes: the two
things a client cannot do safely itself, hold the Gemini key and scrape Yahoo.

**The ephemeral-disk problem is gone rather than mitigated.** SQLite on Render
lost brokerage, wallet and round-up state on every redeploy, and that was listed
as a longer-term worry needing PostgreSQL. Nothing is persisted here any more,
so a redeploy costs a cold cache and nothing else. The one-worker note in
`render.yaml` was rewritten, since half its reasoning was about the price engine
that no longer exists.

Verified by booting the stripped service and calling everything: the four live
routes answer, the two gated ones still return 401 without a token,
`/api/market-pulse` and `/api/market-insight` still return 200, all eleven
removed routes return 404, and no `.db` file is created on startup any more.

---

## 6. Things that are true and easy to get wrong

- **The Firebase project is `finsight-f423d` and belongs to
  `balajithukuntala@gmail.com`**, not the other Google account. `.firebaserc`
  pins it. Use `firebase login:use` if the CLI picks the wrong one.
- **Firestore rules are deployed** and match `firestore.rules` on disk.
- **Course content is not in Firestore.** `learning_paths` and `glossary` were
  removed and `mockData.ts` is the single source, so content changes need an app
  or OTA update.
- **The vitals maths runs on the client**, in `utils/vitals.ts`. The backend is
  five routes: market pulse, market insight, AI advisor, flashcards and a cache
  readout. It was 17 before the brokerage was cut.
- **Month boundaries in `utils/vitals.ts` are UTC**, carried over faithfully from
  the Python. A late-night IST transaction can land in the next UTC month.
  Changing it would shift which transactions count, so it deserves its own change
  with its own reasoning.
- **One deliberate behaviour change during that port:** rupee figures in alert
  text now use Indian digit grouping (3,18,223) where the Python used Western
  (318,223). Everything else in the app already grouped this way.
- **Verification has used throwaway scripts**, not a committed test suite.
  Whether tests should become permanent is a decision nobody has made.
