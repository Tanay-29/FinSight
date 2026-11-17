# Device testing status

Testing paused on 17 Nov 2026. Phone: Android 15, release APK 1.1.0 (versionCode 2), the EAS build that was already installed.
Branch: `claude/busy-heisenberg-6wcnu9`. Nothing pushed.

## Important: none of the fixes below are on the phone yet

Every fix is in code only. The phone still runs the old APK, so each item marked "fixed" has been checked with
`npx tsc --noEmit` and `npx eslint src` (0 errors) but has **not** been seen running on a device.

A local build cannot be installed over the current app: the installed APK is signed with the EAS cloud key, this PC
only has the debug key, so installing locally means uninstalling first (signs you out). Google sign-in would also
need the debug SHA registered in Firebase. The next build should be an EAS build (`eas build -p android --profile preview`).
Before running it, check the Firebase variables: `eas env:list --environment preview` returned nothing on 12 Nov,
so confirm where the previous build got `EXPO_PUBLIC_FIREBASE_*` from, or the new APK will not reach Firebase.

## Tested on the phone

| Area | Light | Dark | Result |
|---|---|---|---|
| Today, Fini, Ask box | yes | yes | works |
| Theme switch on Profile | yes | yes | stays on Profile, repaints |
| Money: 30-day chart scrub, budgets, Where it went, Latest | yes | yes | works, issues fixed below |
| Spending pace: chart scrub, budget rows | yes | yes | works |
| Can I afford it | yes | yes | works, keyboard issue fixed |
| 50/30/20 | yes | yes | numbers correct |
| Add transaction: 12,000 formatting, Spent/Received, categories, paste SMS, Save | yes | yes | works, issues fixed |
| Goals: chip, typed amount, create, delete, confetti | yes | yes | works |
| Learn: full unit lesson answered correctly to the end | yes | yes | no crash |
| Today's session lesson | yes | | works |
| Reading library module, quiz, flashcards | yes | yes | quiz score bug fixed |
| Card statement, Payslip | yes | yes | work |
| Life sim (First Salary, all 12 months), Side Hustle | yes | yes | work, issues fixed |
| Bubble Room full round | yes | yes | works |
| Money knowledge quiz (10/10) | | yes | scores correctly |
| Ask: suggested questions, sliders, chart, Ask another | yes | yes | works, issues fixed |
| Back key on every pushed screen | yes | yes | works |

## Fixed in code (not yet verified on device)

Crash and blocking issues (commit eff7d7a):
- App closed with "Property 'DOMException' doesn't exist" about 3 minutes after any Gemini call (Ask, How fast?, flashcards), in the foreground or on return from the background. Polyfill in `src/polyfills.ts`.
- Keyboard covered Save, the paste box, Can I afford it, budget dialogs and the Goals sheets.
- Android navigation bar stayed light in dark mode and dark in light mode.
- Sliders moved when a vertical scroll started on them.
- Pasted bank message lost its date.

Wrong numbers or wording (eff7d7a, dcf4a07):
- Reading quiz counted the last answer twice (4/3, or 3/3 with one wrong).
- Profile streak disagreed with Today.
- "Came in" used for an estimated income.
- AUTO badge overlapped the amount; older transactions showed only a time.
- Life sim: raise shown as "Commitments 4,500"; year verdict praised a bruised credit file; last button said Next month.
- Bubble Room "0 of 0" with no players; late-join line pointed at a hidden QR code.
- Clipped labels on Ask and Learn tiles, lowercase budget title, blank delete-goal dialog, robotic flashcard copy.

Dark mode contrast (dcf4a07): invisible back arrows, status bar icons, decoder placeholders, flashcard hint, icon colours.

Goals (e48c931): goal card redesigned, full name shown, dots open Edit and Delete, goals can now be edited.

Consistency sweep, one commit per screen (938894b to 1b96388): Today chips, Learn alignment, Money budget status and Add button,
one shared header on every pushed screen, Profile card corners, Add close button, rupee sign on Payslip.

## Not done

- **Build and device check of all the above.** Not started.
- **Recurring charges**: could not be exercised (needs weeks of repeat charges). Code reviewed only.
- **Sign-in flow**: the phone was already signed in; passwords are not entered by the tester.
- **Life sim "pay the minimum"** never deducts a payment, so debt only grows. Engine design decision, left as is.
- **Back during a life sim or lesson** leaves at once and drops progress, no confirmation. Design decision, left as is.
- **Fini looks worried for the whole of every lesson.** Left as is.
- **Keyboard stays light in dark mode.** Android keyboards follow the phone's theme; not fixable from the app.
- Screenshots and logs are in `test-run/` (not committed).
