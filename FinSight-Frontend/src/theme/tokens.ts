// Colour values live in palette.js, which tailwind.config.js also reads, so
// class names and these JS tokens always resolve to the same hex.
//
// Colour is THEMED. COLORS and CATEGORY_COLORS read through getters
// backed by whichever palette is active, so the five hundred odd call sites
// across the app did not have to change and cannot go stale: they resolve at
// render time, not at import time.
//
// The one thing that DOES capture a value is a constant evaluated at module
// scope, because that runs once before any theme is chosen. Those are written
// as functions instead, and there is a note on each.
import type { TextStyle } from 'react-native';
import { PALETTE, PALETTE_DARK } from './palette';
import type { Category } from '../utils/categories';

export type Scheme = 'light' | 'dark';

type RawPalette = typeof PALETTE;

const shape = (p: RawPalette) => ({
    brand: {
        primary: p.brand.primary,
        primaryDark: p.brand.primaryDark,
        link: p.brand.link,
        soft: p.brand.soft,
        edge: p.brand.edge,
        onDark: p.brand.onDark,
    },
    semantic: {
        profit: p.profit.base,
        profitBg: p.profit.bg,
        profitOnBrand: p.profit.onBrand,
        loss: p.loss.base,
        lossBg: p.loss.bg,
        alertAmber: p.alert.amber,
        alertAmberFill: p.alert.amberFill,
        alertCritical: p.alert.critical,
        alertBg: p.alert.bg,
    },
    text: p.text,
    surface: p.surface,
    border: {
        default: p.border.base,
        strong: p.border.strong,
        focus: p.border.focus,
    },
    pii: {
        maskText: p.pii.mask,
        maskBg: p.pii.maskBg,
        highlight: p.pii.highlight,
    },
});

const LIGHT = shape(PALETTE);
const DARK = shape(PALETTE_DARK as RawPalette);

let rawActive: RawPalette = PALETTE;
let active = LIGHT;
let current: Scheme = 'light';

/**
 * Point the tokens at a theme. Called by the provider in App.tsx and nowhere
 * else: components read the scheme through useScheme().
 */
export function applyScheme(scheme: Scheme): void {
    current = scheme;
    rawActive = scheme === 'dark' ? (PALETTE_DARK as RawPalette) : PALETTE;
    active = scheme === 'dark' ? DARK : LIGHT;
}

export const getScheme = (): Scheme => current;

/** Every group is a getter, so a read during render gets the live theme. */
export const COLORS = {
    get brand() { return active.brand; },
    get semantic() { return active.semantic; },
    get text() { return active.text; },
    get surface() { return active.surface; },
    get border() { return active.border; },
    get pii() { return active.pii; },
};

/**
 * Category colour, and the only supported way to reach it.
 *
 * Typed against the exported union rather than `Record<string, string>`, so a
 * missing or invented key fails the typecheck instead of resolving to
 * undefined and rendering grey at runtime. That is exactly what the previous
 * map did for `housing` and `other`.
 */
export const CATEGORY_COLORS = Object.keys(PALETTE.category).reduce((out, key) => {
    Object.defineProperty(out, key, {
        get: () => rawActive.category[key as Category],
        enumerable: true,
    });
    return out;
}, {} as Record<Category, string>);

/** The same hue at 12 percent, for the icon tile behind a category glyph. */
export const categoryTint = (category: Category): string =>
    `${CATEGORY_COLORS[category]}1F`;

/**
 * The registered font family names, one per weight.
 *
 * Weight is carried by the FAMILY, never by `fontWeight`, and this is the
 * whole reason the group exists. Android does not synthesise weights for a
 * custom font: `fontFamily: 'Inter'` with `fontWeight: '700'` silently renders
 * regular. iOS would tolerate the other spelling, so naming the face on both
 * platforms is correct everywhere and needs no Platform.select.
 *
 * The corollary is that nothing in TYPE sets `fontWeight`. Adding one back
 * would reintroduce exactly the bug this avoids.
 */
export const FONTS = {
    regular: 'Inter_400Regular',
    medium: 'Inter_500Medium',
    semibold: 'Inter_600SemiBold',
    bold: 'Inter_700Bold',
    display: 'InstrumentSerif',
} as const;

export const TYPOGRAPHY = { fontFamily: FONTS } as const;

export const TYPE = {
    display: {
        fontFamily: FONTS.display,
        fontSize: 42,
        lineHeight: 44,
        letterSpacing: -0.42,
    },
    title: {
        fontFamily: FONTS.display,
        fontSize: 30,
        lineHeight: 34,
        letterSpacing: -0.15,
    },
    heading: {
        fontFamily: FONTS.semibold,
        fontSize: 19,
        lineHeight: 25,
        letterSpacing: -0.19,
    },
    body: { fontFamily: FONTS.regular, fontSize: 16, lineHeight: 24 },
    callout: { fontFamily: FONTS.medium, fontSize: 15, lineHeight: 21 },
    caption: { fontFamily: FONTS.medium, fontSize: 13, lineHeight: 18 },
    micro: {
        fontFamily: FONTS.semibold,
        fontSize: 11,
        lineHeight: 14,
        letterSpacing: 0.66,
        textTransform: 'uppercase',
    },
    /** Money. Tabular figures so columns of amounts line up and do not jitter. */
    amountLg: {
        fontFamily: FONTS.bold,
        fontSize: 28,
        lineHeight: 32,
        fontVariant: ['tabular-nums'],
    },
    amountMd: {
        fontFamily: FONTS.bold,
        fontSize: 20,
        lineHeight: 26,
        fontVariant: ['tabular-nums'],
    },
    amountSm: {
        fontFamily: FONTS.semibold,
        fontSize: 15,
        lineHeight: 20,
        fontVariant: ['tabular-nums'],
    },
} satisfies Record<string, TextStyle>;

/**
 * Four point base. Keys match the Tailwind class numbers so `p-5` and
 * `SPACING[5]` cannot disagree. 5 and 10 are new: the old scale jumped 16 to
 * 24 and 32 to 48, which is why screens reached for arbitrary padding.
 */
export const SPACING = {
    0.5: 2,
    1: 4,
    1.5: 6,
    2: 8,
    3: 12,
    4: 16,
    5: 20,
    6: 24,
    8: 32,
    10: 40,
    12: 48,
    16: 64,
} as const;

/** The screen edge. 20 rather than 16, which is the stock default. */
export const GUTTER = 20;

/** Minimum tappable size, and the floor for a list row. */
export const HIT_TARGET = 44;
export const ROW_HEIGHT = 64;

/**
 * Every step sits two points off the 4 / 8 / 12 / 16 / 28 ladder, so nothing
 * reads as a framework default.
 *
 * Replaces BORDER_RADIUS, whose names disagreed with the classes actually in
 * use: it called 16 `xl` while the class the app reaches for 72 times is
 * `rounded-2xl`, also 16. Nothing imported it, so there was nothing to migrate.
 * The matching Tailwind names are `rounded-chip`, `-control`, `-tile`, `-card`
 * and `-pill`; the numeric Tailwind scale is left alone on purpose.
 */
export const RADIUS = {
    chip: 6,
    control: 10,
    tile: 14,
    card: 18,
    pill: 26,
    full: 9999,
} as const;

/**
 * Two levels, and no ladder. A five step elevation scale is the clearest tell
 * that a design is Material underneath.
 *
 * `flat` is the default for everything: cards, rows, inputs. Separation comes
 * from a white surface on the warm canvas plus the hairline. `lifted` is only
 * for things that genuinely float, and its shadow is warm rather than black,
 * because a black shadow on warm paper turns the paper grey.
 */
export const ELEVATION = {
    flat: {
        borderWidth: 1,
        borderColor: PALETTE.border.base,
    },
    lifted: {
        shadowColor: '#3A2E22',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.07,
        shadowRadius: 18,
        elevation: 3,
    },
} as const;

/**
 * Four durations. `press` and `reveal` are the values already in
 * PressableScale and BarFill; naming them is what stops the next screen
 * inventing a fifth.
 *
 * Springs are for gesture-driven values only. A spring on something nobody
 * touched is decoration. And every animated component calls useReducedMotion:
 * the fallback keeps the confirmation and drops the movement.
 */
export const MOTION = {
    press: 120,
    quick: 200,
    enter: 300,
    reveal: 520,
    easing: {
        /** Standard ease-out, for anything the finger just caused. */
        out: [0.2, 0, 0, 1] as const,
        /** Covers most of the distance early, then settles. Bars and gauges. */
        reveal: [0.23, 1, 0.32, 1] as const,
    },
    spring: { damping: 20, stiffness: 240, mass: 1 },
} as const;

export const Z_INDEX = {
    base: 1,
    sticky: 10,
    bottomSheet: 50,
    modal: 100,
    toast: 500,
    overlay: 1000,
} as const;
