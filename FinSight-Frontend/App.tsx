import React, { useCallback } from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Provider } from 'react-redux';
import { store } from './src/store/store';
import { RootNavigator } from './src/navigation/RootNavigator';
import { COLORS } from './src/theme/tokens';
import { ThemeProvider, useScheme } from './src/theme/theme';
import {
  useFonts,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter';
import { InstrumentSerif_400Regular } from '@expo-google-fonts/instrument-serif';
import * as SplashScreen from 'expo-splash-screen';
import './src/global.css';

// NOTE: SMS background listener is disabled (native permissions removed).
// The Smart Paste feature in AddTransactionScreen handles SMS parsing safely.

// Hold the native splash until the fonts are in.
//
// Without this the splash was handed off to a white screen with a spinner on
// it while Inter loaded and Firebase restored the session, so every launch had
// a visible seam in it. Fading it out rather than cutting also hides the last
// few milliseconds of layout.
SplashScreen.preventAutoHideAsync();
SplashScreen.setOptions({ duration: 300, fade: true });

/**
 * Sits inside ThemeProvider so it can see the resolved scheme.
 *
 * The key on RootNavigator is deliberate. Class-based colour follows the theme
 * on its own, but inline JS colour, every Lucide icon and SVG stroke in the
 * app, is read during render, so a screen that is mounted and idle would keep
 * the old palette until something else made it re-render. Remounting the stack
 * is the one line that makes the switch complete rather than gradual. The cost
 * is that switching theme returns you to the root of the stack, which is a
 * fair trade for something done once and then left alone.
 */
const Root: React.FC = () => {
  const { scheme } = useScheme();
  return (
    <NavigationContainer>
      <StatusBar
        style={scheme === 'dark' ? 'light' : 'dark'}
        backgroundColor={COLORS.surface.secondary}
        translucent={false}
      />
      <RootNavigator key={scheme} />
    </NavigationContainer>
  );
};

// ─── Root component ───────────────────────────────────────────

export default function App() {
  const [fontsLoaded] = useFonts({
    Inter: Inter_400Regular,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    // The display face, used by TYPE.display and TYPE.title. It ships one
    // weight, so those two steps carry their emphasis through size rather
    // than through boldness.
    InstrumentSerif: InstrumentSerif_400Regular,
  });

  const onLayoutRootView = useCallback(async () => {
    if (fontsLoaded) {
      await SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  // Nothing is drawn until the fonts are ready. The native splash is still up,
  // which is a better thing to look at than a spinner on a white screen.
  if (!fontsLoaded) return null;

  return (
    <Provider store={store}>
      <ThemeProvider>
        <SafeAreaProvider onLayout={onLayoutRootView}>
          <Root />
        </SafeAreaProvider>
      </ThemeProvider>
    </Provider>
  );
}
