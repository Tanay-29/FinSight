/** @type {import('tailwindcss').Config} */

/**
 * Colour is resolved through CSS variables defined in src/global.css, which is
 * generated from src/theme/palette.js. That indirection is what lets one class
 * name serve both themes: `bg-surface-primary` is white on light and #1F1B16 on
 * dark without a single `dark:` variant anywhere in the app.
 *
 * Channels are space separated so Tailwind's <alpha-value> still applies, which
 * keeps things like `bg-brand-primary/10` and `bg-black/50` working.
 */
const c = (name) => `rgb(var(--c-${name}) / <alpha-value>)`;

module.exports = {
    content: ['./App.{js,jsx,ts,tsx}', './src/**/*.{js,jsx,ts,tsx}'],
    presets: [require('nativewind/preset')],
    theme: {
        extend: {
            colors: {
                brand: {
                    primary: c('brand-primary'),
                    'primary-dark': c('brand-primary-dark'),
                    link: c('brand-link'),
                    soft: c('brand-soft'),
                    edge: c('brand-edge'),
                    'on-dark': c('brand-on-dark'),
                },
                profit: {
                    DEFAULT: c('profit-base'),
                    bg: c('profit-bg'),
                    'on-brand': c('profit-on-brand'),
                },
                loss: {
                    DEFAULT: c('loss-base'),
                    bg: c('loss-bg'),
                },
                alert: {
                    amber: c('alert-amber'),
                    'amber-fill': c('alert-amber-fill'),
                    critical: c('alert-critical'),
                    bg: c('alert-bg'),
                },
                text: {
                    primary: c('text-primary'),
                    secondary: c('text-secondary'),
                    tertiary: c('text-tertiary'),
                    muted: c('text-muted'),
                    inverse: c('text-inverse'),
                },
                surface: {
                    primary: c('surface-primary'),
                    secondary: c('surface-secondary'),
                    tertiary: c('surface-tertiary'),
                },
                border: {
                    DEFAULT: c('border-base'),
                    strong: c('border-strong'),
                    focus: c('border-focus'),
                },
                pii: {
                    mask: c('pii-mask'),
                    'mask-bg': c('pii-mask-bg'),
                    highlight: c('pii-highlight'),
                },
                category: {
                    dining: c('category-dining'),
                    groceries: c('category-groceries'),
                    transport: c('category-transport'),
                    shopping: c('category-shopping'),
                    utilities: c('category-utilities'),
                    housing: c('category-housing'),
                    healthcare: c('category-healthcare'),
                    education: c('category-education'),
                    entertainment: c('category-entertainment'),
                    investments: c('category-investments'),
                    other: c('category-other'),
                },
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
    // Tailwind defaults this to 'media', and NativeWind's web runtime then
    // throws on load: its own MutationObserver calls colorScheme.set(), which
    // refuses to run under 'media'. The app crashed to a blank page on web
    // because of it.
    darkMode: 'class',
    plugins: [],
};
