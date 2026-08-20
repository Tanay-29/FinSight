/** @type {import('tailwindcss').Config} */
const { PALETTE } = require('./src/theme/palette');

module.exports = {
    content: ['./App.{js,jsx,ts,tsx}', './src/**/*.{js,jsx,ts,tsx}'],
    presets: [require('nativewind/preset')],
    theme: {
        extend: {
            // Colours come from src/theme/palette.js so class names and the JS
            // tokens in src/theme/tokens.ts can never drift apart again.
            colors: {
                brand: {
                    primary: PALETTE.brand.primary,
                    'primary-dark': PALETTE.brand.primaryDark,
                    'primary-light': PALETTE.brand.primaryLight,
                },
                profit: {
                    DEFAULT: PALETTE.profit.base,
                    bg: PALETTE.profit.bg,
                },
                loss: {
                    DEFAULT: PALETTE.loss.base,
                    bg: PALETTE.loss.bg,
                },
                alert: {
                    amber: PALETTE.alert.amber,
                    critical: PALETTE.alert.critical,
                    bg: PALETTE.alert.bg,
                },
                ai: {
                    border: PALETTE.ai.border,
                    bg: PALETTE.ai.bg,
                },
                text: PALETTE.text,
                surface: PALETTE.surface,
                border: {
                    DEFAULT: PALETTE.border.base,
                    focus: PALETTE.border.focus,
                },
                pii: {
                    mask: PALETTE.pii.mask,
                    'mask-bg': PALETTE.pii.maskBg,
                    highlight: PALETTE.pii.highlight,
                },
                category: PALETTE.category,
            },
            fontFamily: {
                inter: ['Inter'],
                'inter-medium': ['Inter_500Medium'],
                'inter-semibold': ['Inter_600SemiBold'],
                'inter-bold': ['Inter_700Bold'],
            },
        },
    },
    plugins: [],
};
