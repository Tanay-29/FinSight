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
 */
const PALETTE = {
    brand: {
        primary: '#6366F1',
        primaryDark: '#4F46E5',
        primaryLight: '#818CF8',
    },
    profit: {
        base: '#10B981',
        bg: '#D1FAE5',
    },
    loss: {
        base: '#EF4444',
        bg: '#FEE2E2',
    },
    alert: {
        amber: '#F59E0B',
        critical: '#DC2626',
        bg: '#FEF3C7',
    },
    ai: {
        border: '#A78BFA',
        bg: '#F5F3FF',
    },
    text: {
        primary: '#1F2937',
        secondary: '#6B7280',
        tertiary: '#9CA3AF',
        inverse: '#FFFFFF',
    },
    surface: {
        primary: '#FFFFFF',
        secondary: '#F9FAFB',
        tertiary: '#F3F4F6',
    },
    border: {
        base: '#E5E7EB',
        focus: '#6366F1',
    },
    pii: {
        mask: '#9CA3AF',
        maskBg: '#F3F4F6',
        highlight: '#DBEAFE',
    },
    /** One entry per spending category. Keys match Firestore category values. */
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
};

module.exports = { PALETTE };
