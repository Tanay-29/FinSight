/**
 * Single source of truth for FinSight's colours.
 *
 * Consumed by two places, which previously each kept their own copy and had
 * drifted apart:
 *   - tailwind.config.js, for NativeWind class names (bg-brand-primary, ...)
 *   - src/theme/tokens.ts, for inline JS styles (COLORS.brand.primary, ...)
 *
 * CommonJS so the Tailwind config can require() it. Add a colour here and it
 * becomes available to both.
 *
 * Values come from the Phase 0 Foundations board, see REDESIGN_PLAN.md.
 * The KEY NAMES are deliberately unchanged: roughly two hundred existing class
 * names like `text-text-primary` and `bg-surface-secondary` keep working and
 * simply resolve to the warm ramp instead of Tailwind's blue-tinted greys.
 * That is what makes this a value swap rather than a rewrite.
 *
 * Ratios below are measured against `surface.secondary` (#F7F3ED), the app
 * canvas. WCAG AA wants 4.5:1 for normal text. Three values in the previous
 * palette did not reach it and are marked.
 */
const PALETTE = {
    /**
     * One accent, split by job.
     *
     * `primary` is a fill. At 4.1:1 it is short of AA the moment it becomes a
     * word, and it was being used as a text colour in 96 places.
     * `primaryDark` is the one to reach for whenever a label is involved,
     * either as the label or as the thing behind it: white on it reads 6.3:1,
     * where white on `primary` reads 4.5:1 and passed only because the button
     * labels happen to be bold.
     */
    brand: {
        primary: '#6366F1', //  4.1:1  fills, tints and borders only
        primaryDark: '#4F46E5', //  5.7:1  anything carrying a label, or that is one
        soft: '#EEF2FF', //         tinted panel ground
        edge: '#C7D2FE', //         border on a tinted panel, and nothing else
        // Text sitting ON the accent, for the Login header, the launch screen
        // and the Time Machine card. `edge` was being used for this and reads
        // 3.0:1 on primary, 4.2:1 on primaryDark, so it failed either way. This
        // clears 4.9:1 on primaryDark, which is the only accent a label may
        // sit on.
        onDark: '#DDE3FF',
    },
    profit: {
        base: '#0E7C5A', //  4.7:1  was #10B981, which reads 2.0:1
        bg: '#E3F2EA',
        // For the dark indigo surfaces, the Time Machine growth card and the
        // Login header. `base` is a light-ground colour and disappears there,
        // so a semantic set without this entry is incomplete rather than
        // restrained. 4.8:1 on brand.primaryDark.
        onBrand: '#B6EDD4',
    },
    loss: {
        base: '#C0392F', //  4.9:1  was #EF4444, which reads 3.6:1
        bg: '#FBE9E6',
    },
    alert: {
        amber: '#9A6300', //  4.6:1  the LABEL colour, was #F59E0B at 2.1:1
        amberFill: '#F59E0B', //     bars and other non-text signals only
        critical: '#B0332A', //  5.6:1
        bg: '#FBF0DC',
    },
    text: {
        primary: '#1A1613', // 16.3:1  warm near black, not #111827
        secondary: '#5C544B', //  6.7:1
        tertiary: '#756C62', //  4.7:1  was #9CA3AF, which reads 2.5:1
        muted: '#A79E92', //  2.4:1  DECORATIVE AND DISABLED ONLY, never text
        inverse: '#FFFFFF',
    },
    surface: {
        primary: '#FFFFFF', //  cards and raised surfaces
        secondary: '#F7F3ED', //  the app canvas, every screen sits on this
        tertiary: '#F0EBE3', //  sunken: bar tracks, input rests, icon tiles
    },
    border: {
        base: '#E6E0D8', //  the default hairline, does most of the structural work
        strong: '#D3CBC0', //  dividers that must read, and control outlines
        focus: '#6366F1',
    },
    pii: {
        mask: '#756C62',
        maskBg: '#F0EBE3',
        highlight: '#EEF2FF',
    },
    /**
     * One entry per spending category. Keys match the canonical union in
     * utils/categories.ts, which is the whole point: the previous map was
     * keyed `rent` and `miscellaneous`, spellings `normaliseCategory` maps
     * away, so two of the eleven lookups would have returned undefined. It
     * also gave groceries and investments the same hex, and transport and
     * education another, so four categories could not be told apart.
     *
     * Hues are spread around the wheel and every one clears 4.5:1 on the
     * canvas, so the label may be set in the category's own colour. The brand
     * indigo is deliberately absent: it sits between transport and housing,
     * and a chart is not the place for it.
     */
    category: {
        dining: '#C2410C',
        groceries: '#41690C',
        transport: '#1D4ED8',
        shopping: '#BE185D',
        utilities: '#8A5406',
        housing: '#6D28D9',
        healthcare: '#0F766E',
        education: '#0E7490',
        entertainment: '#A21CAF',
        investments: '#047857',
        other: '#6B645F',
    },
};

module.exports = { PALETTE };
