/**
 * Theme state: what the user asked for, what that resolves to, and keeping the
 * two colour systems pointed at the same answer.
 *
 * There are two systems and they need different things:
 *
 *   className colours resolve through CSS variables in global.css, which
 *   NativeWind switches by putting `dark` on the root. That is what
 *   `setColorScheme` does, and it covers roughly nine hundred class names
 *   without one of them mentioning a theme.
 *
 *   Inline JS colours (`COLORS.text.secondary` on a Lucide icon, an SVG
 *   stroke) cannot read a CSS variable, so `applyScheme` repoints the getters
 *   in tokens.ts at the other palette.
 *
 * The preference is stored, not the resolved scheme, so someone who picked
 * "system" keeps following the phone when it changes at sunset.
 */
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useColorScheme as useSystemScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useColorScheme } from 'nativewind';
import { applyScheme, type Scheme } from './tokens';

export type ThemePref = 'system' | 'light' | 'dark';

const STORAGE_KEY = 'finsight:theme';

interface ThemeValue {
    /** What the user chose. */
    pref: ThemePref;
    /** What that actually resolves to right now. */
    scheme: Scheme;
    setPref: (pref: ThemePref) => void;
}

const ThemeContext = createContext<ThemeValue>({
    pref: 'system',
    scheme: 'light',
    setPref: () => { },
});

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    // The device setting comes from React Native, not from NativeWind.
    //
    // NativeWind is told a concrete scheme below, so asking it what the device
    // wants would just read back what we last set. Worse, handing it 'system'
    // under darkMode: 'class' makes it REMOVE the dark class rather than
    // resolve it, so on a dark phone the classes rendered light while the JS
    // colours went dark and the app came out half themed.
    const system = useSystemScheme();
    const { setColorScheme } = useColorScheme();
    const [pref, setPrefState] = useState<ThemePref>('system');

    useEffect(() => {
        AsyncStorage.getItem(STORAGE_KEY)
            .then((v) => {
                if (v === 'light' || v === 'dark' || v === 'system') setPrefState(v);
            })
            // A storage read that fails should leave the app on the system
            // setting, not trap it in one theme.
            .catch(() => { });
    }, []);

    const scheme: Scheme = pref === 'system'
        ? (system === 'dark' ? 'dark' : 'light')
        : pref;

    // Both systems get pointed at the same answer before anything paints.
    applyScheme(scheme);

    // Always the resolved scheme, never the preference. See the note above.
    useEffect(() => {
        setColorScheme(scheme);
    }, [scheme, setColorScheme]);

    const setPref = useCallback((next: ThemePref) => {
        setPrefState(next);
        AsyncStorage.setItem(STORAGE_KEY, next).catch(() => { });
    }, []);

    const value = useMemo(() => ({ pref, scheme, setPref }), [pref, scheme, setPref]);

    return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useScheme = (): ThemeValue => useContext(ThemeContext);
