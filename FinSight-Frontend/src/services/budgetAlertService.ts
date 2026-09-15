/**
 * Budget alerts.
 *
 * The "Budget alerts" switch in Profile existed before anything could
 * deliver one. This is the delivery: when a category's spend crosses 80
 * percent, and again at 100 percent, of its monthly limit, one local
 * notification fires, once per category per threshold per month. The
 * thresholds are the same ones the Vitals tab colours by.
 *
 * Checked whenever budgets change in Redux, which happens after every
 * logged transaction. Nothing is scheduled ahead of time and nothing is
 * sent anywhere; the phone notifies itself. Delivered keys are kept in
 * AsyncStorage so a restart does not repeat an alert.
 */
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { categoryLabel } from '../utils/categories';

interface BudgetLike { category: string; monthlyLimit: number; currentSpend: number; month: string }

const KEY = 'finsight:budget-alerts-sent';
const CHANNEL = 'budget-alerts';
const THRESHOLDS = [0.8, 1.0] as const;

const supported = Platform.OS === 'ios' || Platform.OS === 'android';

async function readSent(): Promise<Set<string>> {
    try {
        const raw = await AsyncStorage.getItem(KEY);
        return new Set(raw ? (JSON.parse(raw) as string[]) : []);
    } catch {
        return new Set();
    }
}

async function writeSent(sent: Set<string>, currentMonth: string): Promise<void> {
    // Keep only this month's keys so the list cannot grow forever.
    const kept = [...sent].filter((k) => k.startsWith(currentMonth));
    await AsyncStorage.setItem(KEY, JSON.stringify(kept)).catch(() => { });
}

async function ensureChannel(): Promise<void> {
    if (Platform.OS !== 'android') return;
    await Notifications.setNotificationChannelAsync(CHANNEL, {
        name: 'Budget alerts',
        importance: Notifications.AndroidImportance.DEFAULT,
    });
}

function inr(n: number): string {
    return Math.round(n).toLocaleString('en-IN');
}

/**
 * Fire any alert that is newly due. Safe to call often: it does nothing
 * when alerts are off, permission is missing, or nothing has crossed.
 */
export async function checkBudgetAlerts(budgets: BudgetLike[], enabled: boolean, now: Date = new Date()): Promise<void> {
    if (!supported || !enabled || budgets.length === 0) return;
    const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const due: { key: string; budget: BudgetLike; threshold: number }[] = [];
    const sent = await readSent();

    for (const b of budgets) {
        if (b.month !== month || b.monthlyLimit <= 0) continue;
        const share = b.currentSpend / b.monthlyLimit;
        for (const t of THRESHOLDS) {
            const key = `${month}:${b.category}:${t}`;
            if (share >= t && !sent.has(key)) due.push({ key, budget: b, threshold: t });
        }
    }
    if (due.length === 0) return;

    const perms = await Notifications.getPermissionsAsync();
    if (!perms.granted) return;
    await ensureChannel();

    for (const d of due) {
        const label = categoryLabel(d.budget.category);
        const over = d.threshold >= 1;
        await Notifications.scheduleNotificationAsync({
            content: {
                title: over ? `${label} is over budget` : `${label} is at ${Math.round((d.budget.currentSpend / d.budget.monthlyLimit) * 100)}%`,
                body: over
                    ? `${inr(d.budget.currentSpend)} spent against a ${inr(d.budget.monthlyLimit)} limit this month.`
                    : `${inr(d.budget.monthlyLimit - d.budget.currentSpend)} left of ${inr(d.budget.monthlyLimit)} for the rest of the month.`,
                data: { target: 'vitals' },
            },
            // A one-second interval rather than an immediate trigger, so the
            // Android channel can be named; immediate triggers take none.
            trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: 1, channelId: CHANNEL },
        }).catch(() => { });
        sent.add(d.key);
    }
    await writeSent(sent, month);
}
