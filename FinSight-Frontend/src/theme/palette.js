/**
 * Single source of truth for FinSight's colours, light and dark.
 *
 * Consumed by two places, which previously each kept their own copy and had
 * drifted apart:
 *   - tailwind.config.js, for NativeWind class names (bg-brand-primary, ...)
 *   - src/theme/tokens.ts, for inline JS styles (COLORS.brand.primary, ...)
 *
 * CommonJS so the Tailwind config can require() it. Add a colour here and it
 * becomes available to both.
 *
 * PALETTE and PALETTE_DARK carry THE SAME KEYS. That is the contract: a token
 * names a role, not a value, so nothing downstream has to know which theme is
 * running. `text.primary` is the darkest ink on a light ground and the
 * lightest on a dark one, and both are simply "the colour headings are".
 *
 * Ratios are measured against that theme's canvas (`surface.secondary`).
 * WCAG AA wants 4.5:1 for normal text.
 */

/** Light. The warm ground, replacing Tailwind's blue-tinted greys. */
const PALETTE = {
    /**
     * One accent, split three ways by job, because one value cannot do all
     * three jobs in both themes.
     *
     *   primary      a fill. Never a label, never behind one.
     *   primaryDark  a button fill. White sits on it, so it must stay mid.
     *   link         accent TEXT on the canvas. This is the one that has to
     *                invert in dark, where a mid indigo on near-black reads
     *                2.9:1.
     */
    brand: {
        primary: '#6366F1', //  4.1:1  fills, tints and borders only
        primaryDark: '#4F46E5', //  5.7:1  button fills, white on it reads 6.3:1
        link: '#4F46E5', //  5.7:1  accent text
        soft: '#EEF2FF', //         tinted panel ground
        edge: '#C7D2FE', //         border on a tinted panel
        onDark: '#DDE3FF', //  4.9:1  text sitting ON the accent
    },
    profit: {
        base: '#0E7C5A', //  4.7:1  was #10B981, which reads 2.0:1
        bg: '#E3F2EA',
        onBrand: '#B6EDD4', //  4.8:1 on primaryDark
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

/**
 * Dark. A warm dark, not a blue-black one.
 *
 * The light ramp is hue 32 at low chroma, so the dark ramp is the same hue
 * rather than the usual slate. A blue-black ground under a warm accent is the
 * thing that makes most dark modes feel like a different app with the lights
 * off, and FinSight's whole identity here is warmth.
 *
 * Two values deliberately do NOT invert:
 *   primary and primaryDark stay put, because they are fills. A button is
 *   measured against its own label, not against the page, and white on
 *   #4F46E5 reads 6.3:1 in either theme.
 * Everything that carries text against the canvas does invert, `link` most
 * of all: a mid indigo on near-black reads 2.9:1 and is unusable.
 */
const PALETTE_DARK = {
    brand: {
        primary: '#6366F1', //         a fill in both themes, so unchanged
        primaryDark: '#4F46E5', //         button fill, white on it still 6.3:1
        link: '#A5B4FC', //  9.3:1  accent text, inverted from the light value
        soft: '#232135', //         tinted panel ground
        edge: '#3A3663',
        onDark: '#DDE3FF', //         text on the accent, unchanged
    },
    profit: {
        base: '#3FBF8F', //  8.0:1
        bg: '#16302A',
        onBrand: '#B6EDD4',
    },
    loss: {
        base: '#F2705F', //  6.2:1
        bg: '#33201D',
    },
    alert: {
        amber: '#D9A441', //  8.2:1
        amberFill: '#F59E0B', //         a fill, so unchanged
        critical: '#F2705F',
        bg: '#33291A',
    },
    text: {
        primary: '#F2EDE5', // 15.9:1
        secondary: '#C3B8AA', //  9.5:1
        tertiary: '#9E9488', //  6.2:1
        muted: '#6E6459', //  3.2:1  decorative and disabled only, as in light
        inverse: '#16130F', //         text on a light surface
    },
    surface: {
        primary: '#1F1B16', //  cards, one step up from the canvas
        secondary: '#16130F', //  the app canvas
        tertiary: '#2A2520', //  sunken: bar tracks, input rests, icon tiles
    },
    border: {
        base: '#332D26',
        strong: '#453D34',
        focus: '#818CF8',
    },
    pii: {
        mask: '#9E9488',
        maskBg: '#2A2520',
        highlight: '#232135',
    },
    /**
     * The same eleven hues, lifted into the light half of the range. The light
     * set sits at roughly 5:1 on paper by being dark; on a near-black canvas
     * those same values fall to about 3.6:1, which is a fill and not a label.
     */
    category: {
        dining: '#F0793F',
        groceries: '#8FBF3F',
        transport: '#6E9BFF',
        shopping: '#F06A9E',
        utilities: '#D9A441',
        housing: '#A98BFF',
        healthcare: '#3FBFB0',
        education: '#45AFD1',
        entertainment: '#E06AD1',
        investments: '#3FBF8F',
        other: '#A79E92',
    },
};

module.exports = { PALETTE, PALETTE_DARK };
