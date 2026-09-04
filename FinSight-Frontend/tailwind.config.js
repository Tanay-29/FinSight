/** @type {import('tailwindcss').Config} */
const { PALETTE } = require('./src/theme/palette');

module.exports = {
    content: ['./App.{js,jsx,ts,tsx}', './src/**/*.{js,jsx,ts,tsx}'],
    presets: [require('nativewind/preset')],
    // Tailwind defaults this to 'media', and NativeWind's web runtime then
    // throws on load: its own MutationObserver calls colorScheme.set(), which
    // refuses to run under 'media'. The app crashed to a blank page on web
    // because of it. Nobody had noticed, because it has only ever been run on
    // Android and in Expo Go, where this code path does not execute.
    //
    // Inert on native and today on web too: there is not a single `dark:`
    // class in the tree yet. It is also what dark mode will need when the
    // roadmap gets to it.
    darkMode: 'class',
    theme: {
        extend: {
            // Colours come from src/theme/palette.js so class names and the JS
            // tokens in src/theme/tokens.ts can never drift apart again.
            colors: {
                brand: {
                    primary: PALETTE.brand.primary,
                    'primary-dark': PALETTE.brand.primaryDark,
                    soft: PALETTE.brand.soft,
                    edge: PALETTE.brand.edge,
                    'on-dark': PALETTE.brand.onDark,
                },
                profit: {
                    DEFAULT: PALETTE.profit.base,
                    bg: PALETTE.profit.bg,
                    'on-brand': PALETTE.profit.onBrand,
                },
                loss: {
                    DEFAULT: PALETTE.loss.base,
                    bg: PALETTE.loss.bg,
                },
                alert: {
                    amber: PALETTE.alert.amber,
                    'amber-fill': PALETTE.alert.amberFill,
                    critical: PALETTE.alert.critical,
                    bg: PALETTE.alert.bg,
                },
                text: PALETTE.text,
                surface: PALETTE.surface,
                border: {
                    DEFAULT: PALETTE.border.base,
                    strong: PALETTE.border.strong,
                    focus: PALETTE.border.focus,
                },
                pii: {
                    mask: PALETTE.pii.mask,
                    'mask-bg': PALETTE.pii.maskBg,
                    highlight: PALETTE.pii.highlight,
                },
                category: PALETTE.category,
            },
            // Weight is carried by the family name, never by `font-weight`.
            // Android does not synthesise weights for a custom font, so
            // `font-inter` plus `font-bold` renders regular there. Every
            // weighted text uses one of these instead. See FONTS in tokens.ts.
            fontFamily: {
                inter: ['Inter_400Regular'],
                'inter-medium': ['Inter_500Medium'],
                'inter-semibold': ['Inter_600SemiBold'],
                'inter-bold': ['Inter_700Bold'],
                // Display face, one weight only. Headlines and the IQ score.
                display: ['InstrumentSerif'],
            },
            // The Phase 0 scale, mapped onto the class names already in use so
            // 338 existing sites pick it up without being rewritten. Relative
            // order is preserved; the steps just move onto the scale and gain
            // real line heights. `xs` 12 to 13 is the legibility fix, it was
            // the app's most-used size at 119 occurrences.
            fontSize: {
                '2xs': ['11px', '14px'],
                xs: ['13px', '18px'],
                sm: ['15px', '21px'],
                base: ['16px', '24px'],
                lg: ['19px', '25px'],
                xl: ['20px', '26px'],
                '2xl': ['24px', '30px'],
                '3xl': ['30px', '36px'],
                '4xl': ['36px', '40px'],
                '5xl': ['42px', '44px'],
            },
            // Deliberately two points off the 4/8/12/16/28 ladder, so nothing
            // reads as a framework default.
            //
            // The numeric names are remapped onto the same ladder rather than
            // left at Tailwind's values, so the 146 existing `rounded-*` sites
            // move onto the scale without being rewritten. Relative order is
            // preserved throughout: lg < xl < 2xl < 3xl, just shifted up.
            borderRadius: {
                chip: '6px',
                control: '10px',
                tile: '14px',
                card: '18px',
                pill: '26px',
                lg: '10px', //  was 8,  matches control
                xl: '14px', //  was 12, matches tile
                '2xl': '18px', //  was 16, matches card
                '3xl': '26px', //  was 24, matches pill
            },
        },
    },
    plugins: [],
};
