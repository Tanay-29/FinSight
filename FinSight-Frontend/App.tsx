import React, { useCallback } from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Provider } from 'react-redux';
import { store } from './src/store/store';
import { RootNavigator } from './src/navigation/RootNavigator';

import {
  useFonts,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter';
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

// ─── Root component ───────────────────────────────────────────

export default function App() {
  const [fontsLoaded] = useFonts({
    Inter: Inter_400Regular,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
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
      <SafeAreaProvider onLayout={onLayoutRootView}>
        <NavigationContainer>
          <StatusBar style="dark" backgroundColor="#FFFFFF" translucent={false} />
          <RootNavigator />
        </NavigationContainer>
      </SafeAreaProvider>
    </Provider>
  );
}
