/** @type {import('tailwindcss').Config} */
module.exports = {
    content: ['./App.{js,jsx,ts,tsx}', './src/**/*.{js,jsx,ts,tsx}'],
    presets: [require('nativewind/preset')],
    theme: {
        extend: {
            colors: {
                brand: {
                    primary: '#6366F1',
                    'primary-dark': '#4F46E5',
                    'primary-light': '#818CF8',
                },
                profit: {
                    DEFAULT: '#10B981',
                    bg: '#D1FAE5',
                },
                loss: {
                    DEFAULT: '#EF4444',
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
                },
                surface: {
                    primary: '#FFFFFF',
                    secondary: '#F9FAFB',
                    tertiary: '#F3F4F6',
                },
                border: {
                    DEFAULT: '#E5E7EB',
                    focus: '#6366F1',
                },
                pii: {
                    mask: '#9CA3AF',
                    'mask-bg': '#F3F4F6',
                },
                category: {
                    dining: '#F97316',
                    shopping: '#EC4899',
                    transport: '#3B82F6',
                    groceries: '#10B981',
                    utilities: '#EAB308',
                },
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
