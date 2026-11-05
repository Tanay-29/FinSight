/**
 * Keeps the app open when a screen throws.
 *
 * In a release build an error during render closes the whole app. This
 * catches it, shows a short page with a way back, and keeps the message so
 * it can be reported. `installCrashRecorder` does the same for errors that
 * happen outside render (in a handler or a timer): it saves the message
 * before the app closes, and `showLastCrashOnce` shows it on the next launch,
 * once, so the person can send a screenshot of it.
 */
import React from 'react';
import { Alert, Pressable, Text, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { COLORS, FONTS, TYPE } from '../theme/tokens';

const LAST_CRASH_KEY = 'finsight:last-crash';

function describe(error: unknown): string {
    const e = error as { message?: string; stack?: string } | undefined;
    const msg = e?.message ?? String(error);
    const where = (e?.stack ?? '').split('\n').slice(1, 4).map((l) => l.trim()).join('\n');
    return where ? `${msg}\n${where}` : msg;
}

function save(error: unknown, kind: string) {
    const record = { at: new Date().toISOString(), kind, text: describe(error).slice(0, 1200) };
    AsyncStorage.setItem(LAST_CRASH_KEY, JSON.stringify(record)).catch(() => { });
}

/** Call once at start-up, before anything renders. */
export function installCrashRecorder() {
    const g = globalThis as unknown as { ErrorUtils?: { getGlobalHandler: () => (e: Error, fatal?: boolean) => void; setGlobalHandler: (h: (e: Error, fatal?: boolean) => void) => void } };
    const utils = g.ErrorUtils;
    if (!utils) return;
    const previous = utils.getGlobalHandler();
    utils.setGlobalHandler((error, isFatal) => {
        if (isFatal) save(error, 'fatal');
        previous(error, isFatal);
    });
}

/** On launch: if the last run ended in an error, say what it was, once. */
export async function showLastCrashOnce() {
    try {
        const raw = await AsyncStorage.getItem(LAST_CRASH_KEY);
        if (!raw) return;
        await AsyncStorage.removeItem(LAST_CRASH_KEY);
        const r = JSON.parse(raw) as { at: string; text: string };
        Alert.alert('FinSight closed last time', `Please send a screenshot of this to the team.\n\n${r.text}`);
    } catch { /* nothing to show */ }
}

interface State { error: unknown }

export class ErrorBoundary extends React.Component<{ children: React.ReactNode }, State> {
    state: State = { error: null };

    static getDerivedStateFromError(error: unknown): State {
        return { error };
    }

    componentDidCatch(error: unknown) {
        save(error, 'render');
    }

    render() {
        if (!this.state.error) return this.props.children;
        return (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, backgroundColor: COLORS.surface.secondary }}>
                <Text style={{ ...TYPE.heading, color: COLORS.text.primary, textAlign: 'center' }}>Something went wrong</Text>
                <Text style={{ ...TYPE.body, fontSize: 15, color: COLORS.text.secondary, textAlign: 'center', marginTop: 6 }}>
                    Your progress is saved. Tap below to carry on.
                </Text>
                <Text selectable style={{ fontFamily: FONTS.regular, fontSize: 11, color: COLORS.text.tertiary, textAlign: 'center', marginTop: 14 }} numberOfLines={4}>
                    {describe(this.state.error)}
                </Text>
                <Pressable
                    onPress={() => this.setState({ error: null })}
                    accessibilityRole="button"
                    style={{ marginTop: 22, height: 48, paddingHorizontal: 28, borderRadius: 24, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.brand.primaryDark }}
                >
                    <Text style={{ ...TYPE.callout, fontFamily: FONTS.semibold, color: COLORS.brand.onAccent }}>Try again</Text>
                </Pressable>
            </View>
        );
    }
}
