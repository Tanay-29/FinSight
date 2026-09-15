/**
 * Reminder Service
 *
 * The daily-session reminder, as a local notification. Nothing here talks
 * to a server: no push token, no backend, no Expo push service. The phone
 * schedules its own reminders and that is the whole mechanism.
 *
 * Scheduling policy: the next seven days are scheduled individually, and
 * today is skipped once the session is done. The list is rebuilt whenever
 * the app comes to the foreground or a session finishes. Seven days rather
 * than a repeating daily trigger, for two reasons: a repeating trigger
 * cannot skip today after the session is done, so it would nag someone who
 * has already finished; and if the app is not opened for a week the
 * reminders simply stop, which is what a respectful reminder does.
 *
 * The preference lives in AsyncStorage: it is a device setting, not an
 * account setting, because a reminder on a phone that is off makes no sense
 * on the laptop that is on.
 */
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';

export interface ReminderPreference {
    enabled: boolean;
    /** Local time. */
    hour: number;
    minute: number;
}

const KEY = 'finsight:session-reminder';
const CHANNEL = 'daily-session';
const DAYS_AHEAD = 7;

export const DEFAULT_REMINDER: ReminderPreference = { enabled: false, hour: 20, minute: 0 };

/** Copy rotates so seven days of the same line do not read as spam. */
const LINES = [
    { title: 'Three minutes on your money', body: 'One thing you got wrong, two new, one about your own spending.' },
    { title: 'Your session is ready', body: 'Short enough for the queue at the chai stall.' },
    { title: 'Keep the streak', body: 'Today counts once you finish the deck.' },
    { title: 'A card about your own spending', body: 'Built from your last 30 days. Guess before you look.' },
    { title: 'Three minutes', body: 'That is the whole session. The rest of the app can wait.' },
    { title: 'Something you missed is due', body: 'Cards you got wrong come back until they stick.' },
    { title: 'Session time', body: 'A small habit, kept, beats a big plan, abandoned.' },
];

const supported = Platform.OS === 'ios' || Platform.OS === 'android';

export async function getReminderPreference(): Promise<ReminderPreference> {
    try {
        const raw = await AsyncStorage.getItem(KEY);
        if (!raw) return DEFAULT_REMINDER;
        const parsed = JSON.parse(raw) as Partial<ReminderPreference>;
        return {
            enabled: Boolean(parsed.enabled),
            hour: typeof parsed.hour === 'number' ? parsed.hour : DEFAULT_REMINDER.hour,
            minute: typeof parsed.minute === 'number' ? parsed.minute : DEFAULT_REMINDER.minute,
        };
    } catch {
        return DEFAULT_REMINDER;
    }
}

export async function setReminderPreference(pref: ReminderPreference): Promise<void> {
    await AsyncStorage.setItem(KEY, JSON.stringify(pref)).catch(() => { });
}

/** Ask once. Returns whether the reminder can be delivered. */
export async function ensurePermission(): Promise<boolean> {
    if (!supported) return false;
    const current = await Notifications.getPermissionsAsync();
    if (current.granted) return true;
    if (!current.canAskAgain) return false;
    const asked = await Notifications.requestPermissionsAsync();
    return asked.granted;
}

/** Android needs a channel before anything can be delivered on it. Idempotent. */
async function ensureChannel(): Promise<void> {
    if (Platform.OS !== 'android') return;
    await Notifications.setNotificationChannelAsync(CHANNEL, {
        name: 'Daily session',
        importance: Notifications.AndroidImportance.DEFAULT,
        sound: 'default',
    });
}

/** Configure how a reminder shows while the app is open. Call once at startup. */
export function configureNotificationHandling(): void {
    if (!supported) return;
    Notifications.setNotificationHandler({
        handleNotification: async () => ({
            shouldShowBanner: true,
            shouldShowList: true,
            shouldPlaySound: false,
            shouldSetBadge: false,
        }),
    });
}

/**
 * Rebuild the schedule from the preference. Cancels everything this app
 * has scheduled first, so calling it repeatedly never stacks reminders.
 *
 * @param sessionDoneToday skip today's slot when the session is already done
 */
export async function syncReminders(sessionDoneToday: boolean): Promise<void> {
    if (!supported) return;
    const pref = await getReminderPreference();
    await Notifications.cancelAllScheduledNotificationsAsync().catch(() => { });
    if (!pref.enabled) return;
    const perms = await Notifications.getPermissionsAsync();
    if (!perms.granted) return;
    await ensureChannel();

    const now = new Date();
    for (let d = 0; d < DAYS_AHEAD; d++) {
        const at = new Date(now.getFullYear(), now.getMonth(), now.getDate() + d, pref.hour, pref.minute, 0, 0);
        if (at.getTime() <= now.getTime()) continue;
        if (d === 0 && sessionDoneToday) continue;
        const line = LINES[at.getDay() % LINES.length];
        await Notifications.scheduleNotificationAsync({
            content: { title: line.title, body: line.body, data: { target: 'session' } },
            trigger: {
                type: Notifications.SchedulableTriggerInputTypes.DATE,
                date: at,
                channelId: CHANNEL,
            },
        }).catch(() => { });
    }
}

export async function disableReminders(): Promise<void> {
    const pref = await getReminderPreference();
    await setReminderPreference({ ...pref, enabled: false });
    if (supported) await Notifications.cancelAllScheduledNotificationsAsync().catch(() => { });
}

/**
 * Turn the reminder on at a time. Asks for permission if needed; returns
 * false, with the preference left off, when the user declined.
 */
export async function enableReminders(hour: number, minute: number, sessionDoneToday: boolean): Promise<boolean> {
    const ok = await ensurePermission();
    if (!ok) {
        await setReminderPreference({ enabled: false, hour, minute });
        return false;
    }
    await setReminderPreference({ enabled: true, hour, minute });
    await syncReminders(sessionDoneToday);
    return true;
}

export function formatReminderTime(hour: number, minute: number): string {
    const h12 = hour % 12 === 0 ? 12 : hour % 12;
    const ampm = hour < 12 ? 'am' : 'pm';
    return `${h12}:${String(minute).padStart(2, '0')} ${ampm}`;
}
