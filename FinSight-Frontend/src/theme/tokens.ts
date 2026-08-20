// Colour values live in palette.js, which tailwind.config.js also reads, so
// class names and these JS tokens always resolve to the same hex.
import { PALETTE } from './palette';

export const COLORS = {
    brand: PALETTE.brand,
    semantic: {
        profit: PALETTE.profit.base,
        profitBg: PALETTE.profit.bg,
        loss: PALETTE.loss.base,
        lossBg: PALETTE.loss.bg,
        alertAmber: PALETTE.alert.amber,
        alertCritical: PALETTE.alert.critical,
        alertBg: PALETTE.alert.bg,
    },
    ai: {
        border: PALETTE.ai.border,
        background: PALETTE.ai.bg,
    },
    text: PALETTE.text,
    surface: PALETTE.surface,
    border: {
        default: PALETTE.border.base,
        focus: PALETTE.border.focus,
    },
    pii: {
        maskText: PALETTE.pii.mask,
        maskBg: PALETTE.pii.maskBg,
        highlight: PALETTE.pii.highlight,
    },
    category: PALETTE.category,
} as const;

export const TYPOGRAPHY = {
    fontFamily: {
        primary: 'Inter',
        mono: 'RobotoMono',
    },
    fontSize: {
        '2xs': 10,
        xs: 12,
        sm: 14,
        base: 16,
        lg: 18,
        xl: 20,
        '2xl': 24,
        '3xl': 30,
        '4xl': 36,
        amountLg: 28,
        amountMd: 20,
        amountSm: 16,
    },
    fontWeight: {
        regular: '400' as const,
        medium: '500' as const,
        semibold: '600' as const,
        bold: '700' as const,
    },
} as const;

export const SPACING = {
    1: 4,
    2: 8,
    3: 12,
    4: 16,
    6: 24,
    8: 32,
    12: 48,
} as const;

export const BORDER_RADIUS = {
    sm: 4,
    md: 8,
    lg: 12,
    xl: 16,
    full: 9999,
} as const;

export const SHADOWS = {
    sm: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
    },
    md: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.07,
        shadowRadius: 6,
        elevation: 3,
    },
    lg: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.1,
        shadowRadius: 15,
        elevation: 5,
    },
} as const;

export const Z_INDEX = {
    base: 1,
    sticky: 10,
    bottomSheet: 50,
    modal: 100,
    toast: 500,
    overlay: 1000,
} as const;
