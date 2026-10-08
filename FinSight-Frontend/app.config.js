/**
 * app.json holds the config. This adds the one piece that has to come from
 * the environment.
 *
 * The Google sign-in plugin's only job is iOS: registering the URL scheme
 * Google returns to after the account picker, which is the reversed iOS
 * client ID. The plugin throws without one, and Android needs nothing from
 * it, so it is added once EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID is set (locally in
 * .env, or as an EAS environment variable for cloud builds).
 */
module.exports = ({ config }) => {
    const iosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;
    if (!iosClientId || !iosClientId.endsWith('.apps.googleusercontent.com')) return config;

    const iosUrlScheme = `com.googleusercontent.apps.${iosClientId.replace('.apps.googleusercontent.com', '')}`;
    return {
        ...config,
        plugins: [
            ...(config.plugins ?? []),
            ['@react-native-google-signin/google-signin', { iosUrlScheme }],
        ],
    };
};
