export const COLORS = {
    brand: {
        primary: '#6366F1',
        primaryDark: '#4F46E5',
        primaryLight: '#818CF8',
    },
    semantic: {
        profit: '#10B981',
        profitBg: '#D1FAE5',
        loss: '#EF4444',
        lossBg: '#FEE2E2',
        alertAmber: '#F59E0B',
        alertCritical: '#DC2626',
        alertBg: '#FEF3C7',
    },
    ai: {
        border: '#A78BFA',
        background: '#F5F3FF',
    },
    text: {
        primary: '#1F2937',
        secondary: '#6B7280',
        tertiary: '#9CA3AF',
        inverse: '#FFFFFF',
    },
    background: {
        primary: '#FFFFFF',
        secondary: '#F9FAFB',
        tertiary: '#F3F4F6',
    },
    border: {
        default: '#E5E7EB',
        focus: '#6366F1',
    },
    pii: {
        maskText: '#9CA3AF',
        maskBg: '#F3F4F6',
        highlight: '#DBEAFE',
    },
    category: {
        dining: '#F97316',
        shopping: '#EC4899',
        transport: '#3B82F6',
        groceries: '#10B981',
        utilities: '#EAB308',
        entertainment: '#8B5CF6',
        healthcare: '#14B8A6',
        rent: '#6366F1',
        investments: '#10B981',
        education: '#3B82F6',
        miscellaneous: '#9CA3AF',
    },
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

export const CATEGORY_ICONS: Record<string, string> = {
    dining: '🍽️',
    shopping: '🛍️',
    transport: '🚗',
    groceries: '🛒',
    utilities: '⚡',
    entertainment: '🎬',
    healthcare: '🏥',
    rent: '🏠',
    investments: '📈',
    education: '📚',
    miscellaneous: '📦',
};
