// ESLint flat config. Run with `npm run lint`.
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
    expoConfig,
    {
        ignores: ['node_modules/**', '.expo/**', 'dist/**', 'android/**', 'ios/**'],
    },
    {
        rules: {
            // Off because eslint-config-expo already reports unused code via
            // @typescript-eslint/no-unused-vars. Keeping both double-reports.
            'no-unused-vars': 'off',

            // An HTML rule. In React Native, text lives inside <Text>, where a
            // raw apostrophe or quote is correct and entities would render
            // literally.
            'react/no-unescaped-entities': 'off',

            // React Compiler rules. Worth reading, but this codebase predates
            // them, so they advise rather than block.
            'react-hooks/refs': 'warn',
            'react-hooks/set-state-in-effect': 'warn',
            'react-hooks/immutability': 'warn',
            // The app ships no emojis and no em dashes. Catch both here so they
            // cannot creep back in through a copy-paste.
            'no-irregular-whitespace': 'error',
            'no-restricted-syntax': ['error', {
                selector: 'Literal[value=/\\u2014/]',
                message: 'No em dashes. Use a comma, colon, semicolon, or hyphen.',
            }, {
                selector: 'Literal[value=/\\p{Extended_Pictographic}/u]',
                message: 'No emojis. Use a lucide-react-native icon instead.',
            }],
            // console.log left in a screen is noise; warn but do not block.
            'no-console': ['warn', { allow: ['warn', 'error'] }],
        },
    },
]);
