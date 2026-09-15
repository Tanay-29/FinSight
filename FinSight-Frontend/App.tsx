import React, { useCallback, useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer, createNavigationContainerRef } from '@react-navigation/native';
import * as Notifications from 'expo-notifications';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import { store, persistor } from './src/store/store';
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
import { configureNotificationHandling } from './src/services/reminderService';
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

// How a session reminder shows if it lands while the app is open.
configureNotificationHandling();

// Untyped on purpose: the app's stacks are declared without a param list.
const navigationRef = createNavigationContainerRef<any>();

/**
 * A tapped reminder opens the daily session. Only when the stack actually
 * has the route, which it does not before sign-in; a cold start from a
 * notification on a signed-out phone just opens the app.
 */
function openSessionFromNotification(response: Notifications.NotificationResponse | null) {
  if (!response || response.notification.request.content.data?.target !== 'session') return;
  if (!navigationRef.isReady()) return;
  const routes = navigationRef.getRootState()?.routeNames ?? [];
  if (!routes.includes('LessonPlayer')) return;
  navigationRef.navigate('MainTabs', { screen: 'Learn' });
  navigationRef.navigate('LessonPlayer', { mode: 'session' });
}

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

  useEffect(() => {
    // A tap while the app is running, and the tap that launched it.
    const sub = Notifications.addNotificationResponseReceivedListener(openSessionFromNotification);
    Notifications.getLastNotificationResponseAsync()
      .then((r) => {
        // The navigator may still be mounting on a cold start; give it a beat.
        if (r) setTimeout(() => openSessionFromNotification(r), 800);
      })
      .catch(() => { });
    return () => sub.remove();
  }, []);

  return (
    <NavigationContainer ref={navigationRef}>
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
      {/* null rather than a loading component: rehydrating from AsyncStorage
          is near-instant, and the native splash is already covering this
          moment, the same reasoning App.tsx already applies to font loading
          above. A second loading screen here would be the seam that keeping
          the splash up was written to avoid. */}
      <PersistGate loading={null} persistor={persistor}>
        <ThemeProvider>
          <SafeAreaProvider onLayout={onLayoutRootView}>
            <Root />
          </SafeAreaProvider>
        </ThemeProvider>
      </PersistGate>
    </Provider>
  );
}
