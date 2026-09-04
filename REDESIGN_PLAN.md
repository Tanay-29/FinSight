# FinSight redesign plan

Read this after `HANDOFF.md`. HANDOFF.md is the general project state; this file
is one initiative: making the app feel like a real, premium, personalised
product instead of a form that happens to also be an app. Written 3 September
2026, from a research-only session. Phase 0 was built on 3 September 2026 in a
second session and its findings are folded in below. **Nothing in the FinSight
source has been changed to produce any of this.** Three fuller documents exist
as published artifacts and are linked inline below; this file is written to be
actionable without opening them, they're for sourcing and depth, not
prerequisites.

- Full evidence and file-level findings: [FinSight Redesign Audit](https://claude.ai/code/artifact/05ea2782-30d4-4981-b022-a920460fa403)
- Full reference research, 7 apps, sourced: [FinSight Design References](https://claude.ai/code/artifact/cbef8a64-0842-4822-a452-bf2a9f3c5d3f)
- **The Phase 0 boards, 7 artboards, the actual spec:** [FinSight Design Foundations](https://claude.ai/code/artifact/826baa16-fc25-417a-9da0-2f2364a44a8b)

---

## 0. Scope

Frontend UI/UX only. **Do not change the backend, the Firebase/Firestore
schema, the API contracts, EAS/build config, or any dependency versions as
part of this initiative.** Everything below is achievable inside
`FinSight-Frontend/src/` with the stack that's already there (NativeWind,
Reanimated, the existing token system). If a phase below turns out to need a
new library, stop and ask rather than adding one silently, per the standing
project rules in `HANDOFF.md` and the user's own instructions on dependencies.

iOS is a real target now (a teammate has an iPhone, the intent is an actual
App Store build eventually), but it is Phase 5 here, not a blocker for
starting. The codebase already has some platform-awareness worth preserving
(`BottomTabs.tsx` sizes by `Platform.OS`, `KeyboardAvoidingView` already
branches on it).

---

## 1. The diagnosis, in one paragraph

It isn't a "too many features" problem, that was mostly fixed already before
this initiative started (Vitals went from 734 lines / 12 exits to 523 / 5,
see HANDOFF.md §5d). **It's a broken promise.** Onboarding asks five
questions and tells the user why each matters. Grepped the whole tree for
where each field is read again after being written:

| Field | Onboarding's promise | Actually read where | Verdict |
|---|---|---|---|
| Age | "We personalise your experience and learning paths based on where you are in life." | Nowhere | Orphaned |
| Experience level | "We'll tailor your content and suggestions accordingly." | Nowhere | Orphaned |
| App goals | "Pick as many as you like." | `LearnScreen.tsx`, reorders the 3 learning paths | Used, narrowly |
| Income range | "Used only to suggest realistic budget templates." | `utils/income.ts`, feeds Burn Rate and 50/30/20 | Used, for real |
| Risk profile | "This helps us tailor investment suggestions." | Nowhere, there is no investing feature left | Orphaned |

The clearest single symptom: onboarding Step 5 asks a brand-new user "your
investments drop 20% in a month, what do you do", with answers like "Buy
more, great discount!", for a simulated brokerage that was deleted from the
app in commit `edb288f`, for good reasons (both pedagogical and regulatory,
see the paper and `HANDOFF.md` §7.2/§5). It's a leftover question from a
different version of the app.

### 1b. What Phase 0 found, which is worse than the above

**The token system is barely connected to the app.** `theme/tokens.ts` is
imported by **four files, sixteen references, and only ever for `COLORS`**.
`TYPOGRAPHY`, `SPACING`, `BORDER_RADIUS`, `SHADOWS` and `Z_INDEX` are declared
and have **never been imported once**. Against those sixteen references, `src/`
carries **696 hex literals (64 distinct values) and 330 stock Tailwind colour
classes** such as `text-gray-400` (45 uses) and `bg-indigo-600` (20). The system
is bypassed roughly sixty times for every time it is used. The original claim
in this file that `tokens.ts` "is already the source of truth elsewhere in the
app" was wrong, and Phase 1 is correspondingly larger than it looked.

**Onboarding is not the offender.** `OnboardingScreen.tsx` does hardcode hex
throughout `SelectCard` and every step, but at 35 literals it is the **ninth**
worst file. The real ones are `SubscriptionTrackerScreen` (77),
`FlashcardScreen` (74), `BurnRateScreen` (66), then `MoneyManagerScreen`,
`ModuleReaderScreen` and `GoalAccelerationScreen` (57 each). Dark mode is on
the roadmap and cannot be reached from here.

**Three colour values in live use fail WCAG AA as text.** Computed from the
shipped values, not estimated:

| Value | Where it is used | Ratio | AA needs |
|---|---|---|---|
| `#9CA3AF` | 89 uses. Carries the category and time line under every merchant name | 2.5:1 | 4.5:1 |
| `#F59E0B` | The `BudgetBar` status label, the one word warning a student they are close to overspending | 2.1:1 | 4.5:1 |
| `#6366F1` | 96 uses. Correct as a fill, short of AA the moment it is a word | 4.1:1 | 4.5:1 |

The fix keeps the brand hue and splits it by role: `accent` (`#6366F1`) for
fills and tints only, `accentInk` (`#4F46E5`) for anything that carries a label
or is one. White on `accentInk` reads 6.3:1, where white on today's primary
button reads 4.5:1 and passes only because the label happens to be bold.

**`TYPOGRAPHY.fontFamily.mono` names `RobotoMono`, which is never loaded and
never referenced.** Dead either way: delete it or load it.

And there's a second, smaller seam, unchanged from the original finding:
`App.tsx` holds the native splash until fonts load (good, deliberate, see its
own comment), but `RootNavigator.tsx` then shows a bare `ActivityIndicator` on
a flat background while auth/profile resolves, a second, uncovered loading
moment right after the first one was closed.

---

## 2. Design direction, taste stated plainly

Researched seven reference apps in depth (full sourcing in the Design
References artifact). The point isn't to copy all seven, that's how you get
generic. Specific things to take, and specific things to reject, because
FinSight already has a stated identity: warm, behaviour-grounded, no real
money, built for someone anxious about finances, not someone confident.

**Take:**
- **Wise's restraint**: one confident accent (FinSight's existing indigo)
  against a tinted, not flat-white, canvas. Quiet everywhere else.
- **Headspace's staged, narrative onboarding**: the questionnaire *is* the
  onboarding, not a form with a progress bar bolted in front of it.
- **Groww's positioning**: simplicity as the whole strategy for a first-time
  investor, not a stripped-down version of a complex app. Same audience,
  same country, same fear-of-complexity problem FinSight has.
- **INDmoney's behavioural reordering**: dashboards that reorder by what the
  user actually does, not a fixed layout for everyone. This is the direct
  mechanism to close the personalisation gap in §1, FinSight already
  collects `appGoals`, it just doesn't act on it outside Learn.
- **Revolut's category-colour system** (the mechanism, not the aesthetic).
  **Corrected by Phase 0: a map does exist, and that is worse than it being
  absent.** `PALETTE.category` has 11 entries, re-exported as
  `COLORS.category`. It is imported by nothing. It is keyed `rent` and
  `miscellaneous` where `normaliseCategory` produces `housing` and `other`, so
  two of eleven lookups return `undefined` the moment anything reads it. And
  `groceries`/`investments` share one hex while `transport`/`education` share
  another, so four of the eleven cannot be told apart in a chart. Fix and
  wire, not add.
- **Duolingo's measured honesty**: they track "Time Spent Learning Well"
  specifically so gamification doesn't drift into empty grinding. FinSight's
  own research paper already names confidence-without-competence as a risk
  of the 0-1000 IQ score. Worth an equivalent check, not just the streak
  flame.

**Reject:**
- Revolut's dark, sleek, precision-fintech look. That's a confidence flex
  for people already comfortable with money, the opposite of who FinSight is
  for.
- Decorative motion for its own sake (coin-roll, card-rotate flourishes) on
  screens with real numbers on them, directly against the paper's own
  architecture ("every number is computed, the model only writes").
- Duolingo's league/social-comparison layer, unless deliberately re-added
  with care: comparing spending or IQ scores against friends is a shame
  vector specific to money, different from a wrong verb conjugation. Squad
  Goals/League were already tried and cut once, see HANDOFF.md §5f.

---

## 3. The plan, in order

Each phase is independently shippable. Do them in order, later phases assume
earlier ones landed.

### Phase 0 — Design system, visual, before any code — **DONE, 3 September 2026**

Seven artboards on two pages, at
[FinSight Design Foundations](https://claude.ai/code/artifact/826baa16-fc25-417a-9da0-2f2364a44a8b).
Every value on them was lifted from or measured against the shipped code, so
Phase 1 is a token swap rather than a rewrite.

- [x] **Foundations** (4 boards): colour, typography, space/shape/motion, the
      category colour map.
- [x] **Components** (3 boards): controls, cards and rows, hero/empty/loading.

**What was decided:**

- **Ground: warm neutral, replacing Tailwind's blue-tinted greys.** This is the
  central move. The app claims warmth and ships a cool greyscale. Paper
  `#F7F3ED`, card `#FFFFFF`, sunken `#F0EBE3`, hairline `#E6E0D8`, then
  `#A79E92` (decorative only), `#756C62`, `#5C544B`, `#1A1613`.
- **One accent, split by role.** `accent` `#6366F1` for fills and tints,
  `accentInk` `#4F46E5` for anything carrying a label. The separate AI purple
  (`#8B5CF6` and the whole `PALETTE.ai` group) retires into the accent.
- **Semantic warmed off the Tailwind defaults:** positive `#0E7C5A`, negative
  `#C0392F`, caution `#9A6300` for labels with `#F59E0B` surviving as a bar
  fill only. All three clear AA.
- **Type: seven steps, replacing thirteen declared plus eight arbitrary
  `text-[Npx]` escapes.** Hierarchy carried by weight and colour before size.
  Caption moves 12px to 13px and picks up a passing colour.
- **Display face: Direction B, Instrument Serif on headlines and the IQ score,
  Inter everywhere else.** Chosen 3 September 2026. **This needs one package,
  `@expo-google-fonts/instrument-serif`, which has NOT been added.** It is the
  first gate of Phase 1 and needs an explicit go-ahead per §0.
- **Spacing:** 4pt base, keys matching the Tailwind class numbers, filling the
  missing 20 and 40 steps. Screen gutter moves to 20.
- **Radius:** 6 / 10 / 14 / 18 / 26 / full, deliberately two points off the
  4/8/12/16/28 ladder so nothing reads as a framework default. Note that the
  current names lie: `BORDER_RADIUS.xl` is 16 while the class the app reaches
  for 72 times is `rounded-2xl`, also 16.
- **Elevation: two levels, no ladder.** `flat` (hairline, no shadow) is the
  default for everything; `lifted` (two layers, warm `#3A2E22` shadow, never
  black) is only for things that genuinely float.
- **Motion: four durations,** two of them already the exact values in the code.
  press 120ms, quick 200ms, enter 300ms, reveal 520ms. Springs for
  gesture-driven values only. `useReducedMotion` becomes mandatory rather than
  a habit four components happen to have.
- **Eleven category colours,** keyed to the canonical `utils/categories.ts`
  keys, every hue distinct, every one clearing 4.5:1 on paper.

**Two behaviour changes are proposed on the boards, not assumed:**

1. `SelectCard` drops its per-step `accent` argument and the
   `` `${accent}10` `` string-concatenation tint, in favour of one
   `accentSoft` token.
2. **The IQ gauge drops its six-band green-to-red grade colour** for a single
   accent arc, with the grade word in ink and colour reserved for the change
   since last week. `getGrade` currently returns six colours across six bands,
   three of which fail AA, and renders a behavioural score as a red verdict on
   the first thing a student sees. The paper already names
   confidence-without-competence as a risk of this score, and §2 already
   rejects social comparison as a money-specific shame vector; a green-to-red
   ring is the same instinct pointed inward. **This one is a real product
   decision, not a token swap.**

**Tooling, what actually happened:** at the time the boards were built, neither
Figma nor Penpot could be set up. Figma's connector needed an OAuth flow a
non-interactive session can't complete; Penpot needs an account created and an
MCP server installed. So the boards were built with the `design` skill instead,
the third option this file already listed, which needs no auth.

**Figma became reachable later in the same session**, authenticated as
`balajithukuntala@gmail.com`. One caveat before planning around it: the seat on
"Balaji Thukuntala's team" is **View** on the starter tier, which is read-only,
so writing a component library into that team needs a Full seat. Personal
drafts are a separate matter and may work. **The Phase 0 decisions are
tool-portable either way** and porting an approved palette and scale is short
work, so this is a convenience question, not a blocker. Mobbin, Sketch and
Flowstate stay ruled out for the reasons previously recorded.

### Phase 1 — Foundation — **LANDED, 3 September 2026, uncommitted**

Verified with `npm run check`: **0 errors, 60 warnings, exactly the baseline
taken before any of it.** Note that HANDOFF.md §3's "134 warnings" is stale;
the tree was at 60 before this work started.

- [x] **0. `@expo-google-fonts/instrument-serif`** added at `^0.4.1` and
      registered in `App.tsx` as `InstrumentSerif`. It exports one face,
      `InstrumentSerif_400Regular`, which confirms the single-weight
      constraint recorded in Phase 0: `TYPE.display` and `TYPE.title` carry
      emphasis through size, not weight. **This is the only dependency added.**
- [x] **1. `palette.js`, `tokens.ts` and `tailwind.config.js` rewritten** to
      the Phase 0 system. The key names were deliberately kept, so roughly two
      hundred existing classes like `text-text-primary` keep working and just
      resolve to the warm ramp: that is what made this a value swap rather
      than a rewrite. `tokens.ts` gained the groups it never had in usable
      form, `TYPE`, `SPACING`, `RADIUS`, `ELEVATION` and `MOTION`, plus
      `GUTTER`, `HIT_TARGET` and `ROW_HEIGHT`. The dangling `RobotoMono`
      reference and the `PALETTE.ai` group are gone. `BORDER_RADIUS` was
      replaced by `RADIUS` outright rather than aliased, because nothing had
      ever imported it.
- [x] **2. Category colour map fixed and wired.** `CATEGORY_COLORS` is typed
      `Record<Category, string>`, so a missing or invented key now fails the
      typecheck. `categoryTint()` gives the 12 percent tint for icon tiles.
      **A third copy of the map turned up during the work**, `getCategoryColor`
      in `VitalsScreen.tsx`, keyed on `health` and `rent` with no entry for
      `other`; it is gone. `TransactionRow` and `BudgetBar` now colour their
      icon tiles by category, which is the first time any of this reached the
      screen.
- [x] **3. The sweep.** 331 stock Tailwind colour classes are now **zero**.
      Hex literals went from 696 to 189, and 53 of those remaining are
      `#FFFFFF`, deliberately skipped because it is `text.inverse` in some
      places and `surface.primary` in others and only a human can tell which.
      Token references went from 16 to 526, across 28 files instead of 4.
      Done in two scripted passes, values first and then literals to
      references, so the diff is auditable.
- [x] **4. The three AA failures are fixed.** `#9CA3AF` to `#756C62`
      (2.5:1 to 4.7:1), the `BudgetBar` status label off `#F59E0B` to
      `#9A6300` (2.1:1 to 4.6:1) while the bar keeps the bright amber as a
      fill, and indigo split so `text-indigo-600` became
      `text-brand-primary-dark` (4.1:1 to 5.7:1).
- [x] **5. The splash-to-spinner seam is closed.** `RootNavigator`'s interim
      screen carries the splash mark and colour instead of a bare spinner on
      flat white.

**What Phase 1 deliberately did not do, and why:**

- **`#6366F1` is still a literal in 94 places** rather than a token reference,
  because it is a fill in most of them and a label colour in a few, and the
  difference is not decidable by script. The three text uses that were
  reachable by class (`text-indigo-600` and friends) were fixed. The rest
  needs eyes on each site.
- **`#F59E0B` was left alone** outside `BudgetBar`. Its remaining 15 uses are
  icons and fills, where there is no contrast requirement, and darkening them
  by script would have dulled genuine bar fills.
- **The IQ gauge still has its six-band green to red grade colour.** That is
  the open product decision from Phase 0, not a token swap, so it was not
  taken unilaterally.
- **Radius and spacing are additive, not enforced.** `RADIUS` and the semantic
  Tailwind names (`rounded-card`, `rounded-tile`, ...) exist and are used in
  the components that were rewritten, but Tailwind's numeric scale was left
  untouched, so the 72 existing `rounded-2xl` uses still render at 16 rather
  than the specified 18. Migrating those is cosmetic and belongs with Phase 4.

### Phase 4a — System-wide styling pass — **LANDED, 3 September 2026, uncommitted**

Phase 1 built the token layer but barely used it: `TYPE` was in 4 files, `SPACING`
in 1, `ELEVATION` and `MOTION` in none. This pass applies it across the tree.
Screen-level work (Phase 4b) is still to come. Verified at **0 errors, 60
warnings**, unchanged from baseline.

- [x] **Inter is actually applied now**, and correctly on both platforms.
      **Weight moved from `fontWeight` onto the family name**, because Android
      does not synthesise weights for a custom font: `fontFamily: 'Inter'` with
      `fontWeight: '700'` silently renders regular there. Naming the face works
      on iOS too, so there is no `Platform.select` and no divergence. 207 weight
      classes became `font-inter-*`, 106 inline `fontWeight` became
      `fontFamily: FONTS.*`, and 128 unweighted text nodes gained regular Inter.
      **Zero `fontWeight` declarations remain outside the theme.** Inter 800 and
      900 collapse onto bold, since only 400/500/600/700 are registered; they
      were never rendering as anything else.
- [x] **The type scale is live** without rewriting 338 sites: the Tailwind
      `fontSize` scale was remapped onto the Phase 0 steps, so the existing
      class names resolve to the new sizes and gain real line heights. `xs`
      moves 12 to 13, which is the legibility fix for the app's most-used size.
- [x] **The radius ladder is live**, the same way: `lg`/`xl`/`2xl`/`3xl`
      remapped to 10/14/18/26. 146 sites moved onto the scale with no edits and
      relative order preserved.
- [x] **Elevation.** The flat-card shadows are gone; the hairline draws the
      edge, as the boards specify. 8 shadows remain and are deliberate: the
      segmented control, and accent glows still to be reviewed in Phase 4b.
- [x] **Motion tokens wired** into `PressableScale`, `BarFill` and
      `SwipeCategoriseScreen`, replacing the literal 120, 520 and 220.

**A trap worth recording: Metro's transform cache will lie to you.** After the
font pass the served bundle still had the old `font-bold` classes in the DOM
while the source on disk said `font-inter-bold`. A plain server restart does not
clear it. Verify with `npx expo start --web --clear`, and do not trust a visual
check taken without it.

### Phase 4b — Screen-level styling — **IN PROGRESS**

What the system-wide pass cannot do. Each screen gets its own pass against the
Components board: the 20 gutter, section rhythm, card padding, and the button,
input, chip and empty-state anatomy. Worked in flow order, the order a new user
meets them.

- [x] **IntroScreen.** Warm canvas instead of flat white, so the preview cards
      read against something. Headlines take Instrument Serif, which is the
      first place the display face actually shows. The three per-panel icon
      tints collapse to one accent, and the previews now carry the real
      category colours instead of decorative ones. Every arbitrary
      `text-[Npx]` replaced by a scale step.
- [x] **LoginScreen.** Header field moves to `primaryDark`: the subhead was
      `brand.edge` on `brand.primary` at **3.0:1** and failed AA. Added
      `brand.onDark` (#DDE3FF, 4.9:1) for text sitting on the accent, which the
      launch screen and the Time Machine card need too. Fields follow the
      Controls board, white with one hairline; focus changes the border colour
      but deliberately not its width, because thickening it nudges the text by
      a pixel every time the caret lands. The mark is now the same TrendingUp
      as the launch screen rather than a sparkle.
- [x] **OnboardingScreen.** `SelectCard` loses its per-step `accent` argument
      and the `` `${accent}10` `` concatenated tint, which is Phase 0 behaviour
      change 1. Selected state insets its padding by one so the 2px border does
      not shunt the list. Step questions take the display face. Copy on the
      goals step is plainer, and "Learn to invest" became "Understand
      investing" so it stops implying a simulator the app does not have.
- [x] **FeedScreen.** Greeting takes the display face, since it is this
      screen's title and the one personalised line on it. The sync notice sat
      on `bg-surface-secondary`, which is now the canvas itself, so it was an
      invisible panel: it is a caution surface now. The floating button drops
      `shadow-lg` for `ELEVATION.lifted`, the one place a warm shadow belongs.
      Copy fix: the empty row said "Nothing logged yet this month" while the
      window is thirty days rolling, which the file's own header comment
      explains at length.
- [x] **VitalsScreen.** Same header treatment as the Feed, so the two tabs
      read as one app. Section headings on the scale, budget modal on the card
      radius, and its amount field follows the Controls board instead of being
      a grey well.
- [x] **Two app-wide passes** landed with them: 74 `bg-white` became
      `bg-surface-primary` (same hex today, but a literal cannot follow a theme
      and a token can, which is what dark mode needs), and 6 more buttons moved
      off `brand.primary` onto `primaryDark`, including EmptyState's action and
      the Goals floating button. White on `primary` reads 4.5:1, on
      `primaryDark` 6.3:1.
- [x] **The remaining fifteen screens**, done as one pass because they repeat
      the same four patterns rather than needing individual designs: Learn,
      LearnPathDetail, ModuleReader, AddTransaction, Goals, Profile, Paywall,
      BurnRate, MoneyManager, SubscriptionTracker, Flashcard, GuessSpend,
      SwipeCategorise, TimeMachine, GoalAcceleration.
      - 8 primary and secondary buttons moved to the pill and a 52 height.
      - 42 gutters moved from 16 to 20, the screen edge the boards specify.
      - 8 uppercase labels moved from the 13px caption step to the 11px micro
        step, which is what that step exists for.
      - 5 screen titles took the display face. Deliberately not all twelve
        matches: `text-2xl font-inter-bold` is used for stat numbers as well as
        titles, so a blanket swap would have set the Learn tab's three counters
        and the Time Machine's amount field in a serif. Profile takes `heading`
        rather than `title`, because its header sits next to a back chevron and
        30px reads as shouting there.

**Adoption after five screens:** `TYPE` 72 uses, `GUTTER` 23, `RADIUS` 21,
`bg-white` down to 3, hex literals 172, and zero stray `fontWeight`.

**Two traps, both cost real time, both worth knowing:**

1. **`PressableScale` dropped `className` entirely, and it was not only mine.
   FIXED at the source.** It forwarded `className` to a Reanimated
   `Animated.View`, where NativeWind's class styles never arrived: no
   background, no radius, no `flex-row`, so a white label sat invisible on the
   canvas. The animated node now carries only the transform and the caller's
   `className` and `style` go on a plain `View` inside it, which NativeWind
   does handle. Nesting costs nothing, because the parent still scales the
   whole thing.

   **This affected most primary buttons in the app**, not just the three
   screens in this pass: EmptyState's action, the Feed and Vitals floating
   buttons, ModuleReader's continue button, GuessSpend, SwipeCategorise and
   more all style a `PressableScale` through `className`. It went unnoticed
   because, per HANDOFF.md §5, nobody has actually installed the APK yet.
   **Confirmed on web only.** Whether Android and iOS were equally affected is
   untested, so this is the first thing to look at on a real device.
2. **Metro does not reliably pick up edits made after it starts, on this
   machine.** A restart is not enough either. The bundle kept serving the old
   class names while the source on disk had the new ones, so a screenshot
   showed a bug that was already fixed. Restart with `--clear` AND confirm the
   served bundle contains the change before trusting what you see:
   `curl -s "http://localhost:8081/index.bundle?platform=web&dev=true" | grep -c "<the new string>"`.

### Phase 2 — Onboarding rebuild (the core personalisation fix)
1. Replace or repurpose Step 5 (risk profile). It currently asks about a
   feature that doesn't exist. Options: cut it entirely, or turn it into
   something the app can act on today (e.g. how direct/gentle the coach's
   tone should be).
2. Wire `experienceLevel` into `/api/ai-advisor`'s prompt so the coach's
   vocabulary and framing actually shift for a self-declared beginner vs.
   someone experienced, this is the one-line fix that makes Step 2's promise
   true.
3. Reconsider `age`: either feed it into something real (module ordering,
   copy tone) or drop the step. Don't leave it written-and-unread a third
   time.
4. Reword the "Learn to invest" app-goal option to match what Learn Hub
   actually teaches (concepts, not a live simulator).
5. Restyle the flow toward Headspace's staged-narrative feel per §2, using
   the tokens now available from Phase 1.
6. Add a first-Feed-visit moment that visibly reflects the onboarding
   answers back (e.g. names what the app set up based on their goals). This
   is what closes the loop, users need to see their answers came back, not
   just have them used silently.

### Phase 3 — Feed personalisation
1. Reorder or emphasise Feed sections based on the user's `appGoals` from
   onboarding (INDmoney pattern from §2). The data already exists in the
   profile; this is a rendering-order change, not a new data pipeline.

### Phase 4 — Visual and motion polish
1. Apply the Phase 1 category colours across `TransactionRow`, `BudgetBar`,
   and the Vitals category chart.
2. Run an animation/interaction pass using emil-design-eng's framework
   (already applied once in the audit, worth a dedicated pass across every
   screen, not just onboarding). Consider invoking the `improve-animations`
   skill here specifically, it's built for exactly this: read-only audit,
   produces a prioritised, implementable plan, which is a good bridge into
   actually writing the animation code.
3. Apply Notion's typographic restraint (warm greys over harsh black,
   capped reading width, generous line-height) to Module Reader and other
   dense-content screens.

### Phase 4c — Dark mode — **LANDED, uncommitted**

Deferring it was the right call: because every colour already resolved through
a token, this needed almost no per-screen work. Two mechanisms, because the app
has two kinds of colour and they need different answers.

**Class colour goes through CSS variables.** `global.css` declares every value
as `--c-*` channels under `:root` and `.dark:root`, and `tailwind.config.js`
points each colour at `rgb(var(--c-...) / <alpha-value>)`. NativeWind puts the
`dark` class on the document element and the whole app follows. **Not one of
the roughly nine hundred class names in the tree had to change, and there is
not a single `dark:` variant anywhere.** The alpha placeholder is what keeps
`bg-brand-primary/10` and `bg-black/50` working.

`global.css` is generated from `palette.js` so the two cannot drift, which is
the exact failure the palette was created to end.

**Inline JS colour goes through getters.** A Lucide icon's `color` prop and an
SVG stroke cannot read a CSS variable, and there are 537 of those. `COLORS` and
`CATEGORY_COLORS` are now getter-backed objects reading from whichever palette
is active, so all 537 call sites were left untouched and resolve at render time
instead of import time.

**The exception is a constant evaluated at module scope**, which runs once
before any theme exists. Four were found and rewritten as functions:
`Confetti`'s piece colours, the IQ card's quest icons, SwipeCategorise's
category list, and SubscriptionTracker's icon and tint maps. The last of those
was also keyed on `health`, a spelling the canonical list does not use, so
anything filed as healthcare had been falling through to the default icon.

**One token had to split.** `brand.primaryDark` was doing two jobs that want
opposite treatment in dark: a button fill, where white sits on it and it must
stay mid, and link text, where a mid indigo on near-black reads 2.9:1. Text
sites moved to a new `brand.link`, which inverts to `#A5B4FC` at 9.3:1. The
fill does not move.

**The dark ramp is warm**, hue 32 like the light one rather than the usual
slate. A blue-black ground under a warm accent is what makes most dark modes
feel like a different app with the lights off. Every text value carries its
measured ratio against the dark canvas: primary 15.9:1, secondary 9.5:1,
tertiary 6.2:1, the semantics between 6.2 and 8.2.

**Preference, not scheme, is what gets stored**, so someone on "system" keeps
following the phone at sunset. The control is the first row of Profile's
Settings, since it changes the whole app where the rows under it change one
feature each.

**One deliberate cost.** `RootNavigator` is keyed on the scheme, so switching
theme remounts the stack and returns you to its root. Without it, a mounted and
idle screen would keep the old palette for its JS colours until something else
made it re-render, and the switch would look half-applied. Remounting is the
one line that makes it complete rather than gradual.

### Phase 5 — iOS pass
Once the teammate's iPhone build is actually underway: gesture conventions
(swipe-back), modal presentation review (Paywall and Add Transaction already
use `presentation: 'modal'`, a correct instinct, worth confirming it holds up
under real iOS use), typography and spacing against Apple's HIG, which reads
differently from the NativeWind defaults currently in place. Use the
`ios-hig-design` skill for this pass specifically.

---

## 4. Skills, by phase

| Phase | Skill |
|---|---|
| 0 | Done. Used the `design` skill for a Claude Design canvas, because neither Figma nor Penpot could be set up from a non-interactive session. See Phase 0 above |
| 1, 4 | `react-native-design` for the token/styling mechanics |
| 2, 4 | `emil-design-eng` for motion, interaction feel, the Before/After review format |
| 4 | `improve-animations` for a dedicated, read-only motion audit before implementing it |
| 5 | `ios-hig-design` |
| Any point, before committing to the final shape | `the-fool`, to pressure-test the plan rather than just mine |

---

## 5. State as of 3 September 2026

- [x] **Phase 0, design system.** Seven boards published, see the link at the
      top of this file. Direction B (Instrument Serif display) chosen.
- [x] **Phase 1, foundation.** Landed and verified, **uncommitted**. See the
      Phase 1 section for what it did and what it deliberately left.
- [ ] **Phase 2, onboarding rebuild.** Not started. Unblocked: the tokens
      Phase 2 item 5 needs now exist.
- [ ] **Phase 3, Feed personalisation.** Not started.
- [x] **Phase 4a, system-wide styling.** Landed. Typography, the scales,
      elevation and motion applied across the tree.
- [x] **Phase 4b, screen-level styling.** All twenty screens passed, in flow
      order. Five got individual attention (Intro, Login, Onboarding, Feed,
      Vitals); the remaining fifteen shared one recipe.
- [ ] **Phase 4c, dark mode.** Deliberately last. See its own section for why
      waiting costs nothing and starting early costs double.
- [ ] **Phase 5, iOS pass.** Not started.

**33 files are modified and nothing is committed.** `FinSight-Backend/`,
`firestore.rules`, `app.json` and `eas.json` are untouched, as §0 requires.
The only dependency change is the one approved font package. `README.md` also
shows as modified, but that predates this initiative and is not ours.

**Nothing here has been seen on a device.** Every claim above is from
`npm run check` and from grep counts. The colour work was done by two scripted
passes over 24 files, so the highest-value next step is not more code, it is
running the app and looking at it, particularly the screens the sweep touched
hardest: SubscriptionTracker, Flashcard and BurnRate.

One decision is still open rather than blocked: whether the IQ gauge loses its
green-to-red grade colour (Phase 0, behaviour change 2).

Three artifacts hold the full detail, all linked at the top. Keep updating the
checkboxes above as work lands, matching the pattern `HANDOFF.md` already uses
for session continuity in this repo.
