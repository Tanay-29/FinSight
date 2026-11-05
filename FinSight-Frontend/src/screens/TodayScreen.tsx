/**
 * TodayScreen: the home tab, and the whole daily habit on one screen.
 *
 * The app used to open on a money dashboard, and every number on it depended
 * on the user having logged every spend. Miss a few and the dashboard was
 * confidently wrong; stop logging and the app had nothing to say. Today opens
 * on the habit instead, which works whether or not anything was logged:
 *
 *   Fini, the mascot, says one thing that fits the moment
 *   the week, as seven days of streak
 *   one three-minute lesson
 *   one question about money: spent anything today?
 *
 * That is the loop. Everything about money in detail lives on the Money tab.
 *
 * Fini's line is chosen in code from the state below, in priority order, and
 * the mood follows it. Tapping Fini shows a money tip, which is the small
 * reward for poking at a character, and every tip is a plain fact.
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, ScrollView, Pressable, AppState, RefreshControl } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeIn, FadeInDown, useReducedMotion } from 'react-native-reanimated';
import { useNavigation } from '@react-navigation/native';
import { Flame, Check, Play, Plus, Bell, ArrowRight, Sparkles, CalendarDays, ClipboardCheck, ArrowUp } from 'lucide-react-native';
import { ASK_SUGGESTIONS } from './AskScreen';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { fetchCardResults, selectSessionDoneToday } from '../store/slices/lessonsSlice';
import { fetchUserProgress } from '../store/slices/learningSlice';
import { fetchTransactions } from '../store/slices/transactionsSlice';
import { fetchBudgets } from '../store/slices/budgetsSlice';
import { fetchGoals } from '../store/slices/goalsSlice';
import { recordCheckIn, selectTodayCheckIn } from '../store/slices/checkInsSlice';
import { Mascot, MascotMood } from '../components/mascot/Mascot';
import { PressableScale } from '../components/PressableScale';
import { buildAutopsy } from '../utils/autopsy';
import { daysBetween, toDateKey } from '../utils/streak';
import { inr } from '../utils/moneyMath';
import { QUIZ_RETAKE_AFTER_DAYS } from '../data/moneyQuiz';
import {
    syncReminders, getReminderPreference, enableReminders, formatReminderTime, ReminderPreference, DEFAULT_REMINDER,
} from '../services/reminderService';
import * as haptics from '../utils/haptics';
import { COLORS, TYPE, RADIUS, GUTTER, FONTS } from '../theme/tokens';

const REMINDER_ASKED_KEY = 'finsight:reminder-asked';

/** Plain facts, one per tap. Nothing here is advice about a product. */
const TIPS = [
    'You never need your UPI PIN to receive money. If someone asks for it, it is a scam.',
    'A credit card\'s minimum due is not the bill. Pay the total and there is no interest.',
    'Your bank will never ask for an OTP on a call. Hang up.',
    '₹100 a day is ₹36,500 a year. Small spends are where the money goes.',
    'Money sitting idle loses value every year to inflation.',
    'An emergency fund is three months of expenses you never have to sell anything to reach.',
    '"No-cost EMI" often hides the interest in a discount you never got. Compare the price.',
];

/** What the onboarding answers point at next, if anything. Gone once done. */
const nextStep = (
    appGoals: string[] | undefined,
    hasBudgets: boolean,
    hasGoals: boolean,
): { label: string; route: string } | null => {
    const goals = appGoals ?? [];
    if (goals.includes('budgeting') && !hasBudgets) return { label: 'Set your first budget', route: 'Money' };
    if (goals.includes('goals') && !hasGoals) return { label: 'Name your first savings goal', route: 'Goals' };
    return null;
};

export const TodayScreen: React.FC = () => {
    const navigation = useNavigation<any>();
    const dispatch = useAppDispatch();
    const reduced = useReducedMotion();

    const { user, profile } = useAppSelector((s) => s.auth);
    const transactions = useAppSelector((s) => s.transactions.items);
    const budgets = useAppSelector((s) => s.budgets.items);
    const goals = useAppSelector((s) => s.goals.items);
    const sessionDone = useAppSelector(selectSessionDoneToday);
    const checkIn = useAppSelector(selectTodayCheckIn);

    const [refreshing, setRefreshing] = useState(false);
    const [tip, setTip] = useState<string | null>(null);
    const [burst, setBurst] = useState(false);
    // Starts on a different tip each day of the month, then rotates per tap.
    const tipIndex = useRef(new Date().getDate());
    const burstTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    const [reminder, setReminder] = useState<ReminderPreference>(DEFAULT_REMINDER);
    const [reminderAsked, setReminderAsked] = useState(true);
    const [reminderNote, setReminderNote] = useState<string | null>(null);

    const uid = user?.uid;
    const load = useCallback(() => Promise.all([
        dispatch(fetchCardResults()),
        ...(uid ? [dispatch(fetchUserProgress(uid))] : []),
        dispatch(fetchTransactions()),
        dispatch(fetchBudgets()),
        dispatch(fetchGoals()),
    ]), [dispatch, uid]);

    useEffect(() => {
        load();
        getReminderPreference().then(setReminder);
        AsyncStorage.getItem(REMINDER_ASKED_KEY)
            .then((v) => setReminderAsked(v === '1'))
            .catch(() => setReminderAsked(true));
        return () => { if (burstTimer.current) clearTimeout(burstTimer.current); };
    }, [load]);

    // ── Streak ───────────────────────────────────────────────────
    const today = toDateKey();
    const last = profile?.lastStudiedDate ?? '';
    const freezes = profile?.streakFreezes ?? 0;
    const gap = last ? daysBetween(last, today) : Infinity;
    // A streak whose gap is longer than the freezes can cover is already gone,
    // and showing the old number would be the app lying about it.
    const streak = gap <= 1 + freezes ? (profile?.streak ?? 0) : 0;
    const atRisk = streak > 0 && gap >= 1 && !sessionDone;

    // The reminder schedule follows the habit: rebuilt when the session gets
    // done, and whenever the app comes back to the foreground.
    useEffect(() => {
        syncReminders(sessionDone, streak);
        const sub = AppState.addEventListener('change', (state) => {
            if (state === 'active') syncReminders(sessionDone, streak);
        });
        return () => sub.remove();
    }, [sessionDone, streak]);

    /** The last seven days, oldest first, marked studied from the streak. */
    const week = useMemo(() => Array.from({ length: 7 }, (_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - (6 - i));
        const key = toDateKey(d);
        const studied = Boolean(last) && streak > 0 && key <= last && daysBetween(key, last) < streak;
        return { key, label: d.toLocaleDateString('en-IN', { weekday: 'narrow' }), studied, isToday: key === today };
    }), [last, streak, today]);

    // ── Money today ──────────────────────────────────────────────
    const spentToday = useMemo(() => transactions.reduce((sum, t) => {
        if (t.type !== 'debit') return sum;
        const at = new Date(t.date);
        return Number.isFinite(at.getTime()) && toDateKey(at) === today ? sum + t.amount : sum;
    }, 0), [transactions, today]);

    const autopsy = useMemo(
        () => buildAutopsy(transactions, profile?.incomeRange),
        [transactions, profile?.incomeRange],
    );
    // The knowledge check: offered once to set a starting score, then again
    // three weeks after the last time, to show what changed.
    const quizBase = profile?.quizBaseline;
    const quizLast = profile?.quizLatest ?? quizBase;
    const quizDue = !quizBase
        || (quizLast && daysBetween(toDateKey(new Date(quizLast.date)), today) >= QUIZ_RETAKE_AFTER_DAYS);

    const step = nextStep(profile?.appGoals, budgets.length > 0, goals.length > 0);

    // ── Fini ────────────────────────────────────────────────────
    const name = (user?.displayName || profile?.name || '').trim().split(/\s+/)[0];
    const hour = new Date().getHours();
    const checkedIn = spentToday > 0 || checkIn !== undefined;

    const { line, mood } = useMemo((): { line: string; mood: MascotMood } => {
        if (tip) return { line: tip, mood: 'thinking' };
        if (sessionDone && checkedIn) {
            return { line: `That's today done${name ? `, ${name}` : ''}. See you tomorrow.`, mood: 'happy' };
        }
        if (hour >= 23 || hour < 5) return { line: 'Still up? One short lesson and then sleep.', mood: 'sleepy' };
        if (atRisk && hour >= 18) {
            return { line: `Your ${streak}-day streak is waiting. Three minutes keeps it going.`, mood: 'concerned' };
        }
        if (sessionDone) return { line: 'Lesson done. Quick one: spent anything today?', mood: 'happy' };
        if (streak === 0 && !last) {
            return { line: `Hi${name ? ` ${name}` : ''}, I'm Fini. One small lesson a day and money stops being confusing.`, mood: 'happy' };
        }
        const greeting = hour < 12 ? 'Morning' : hour < 17 ? 'Afternoon' : 'Evening';
        return { line: `${greeting}${name ? `, ${name}` : ''}! Ready for today's three minutes?`, mood: 'idle' };
    }, [tip, sessionDone, checkedIn, name, hour, atRisk, streak, last]);

    const celebrate = () => {
        setBurst(true);
        if (burstTimer.current) clearTimeout(burstTimer.current);
        burstTimer.current = setTimeout(() => setBurst(false), 1600);
    };

    const showTip = () => {
        setTip(TIPS[tipIndex.current % TIPS.length]);
        tipIndex.current += 1;
    };

    const noSpendToday = () => {
        haptics.success();
        dispatch(recordCheckIn({ kind: 'none' }));
        setTip(null);
        celebrate();
    };

    const pickReminder = async (hourOfDay: number) => {
        haptics.tap();
        const ok = await enableReminders(hourOfDay, 0, sessionDone, streak);
        AsyncStorage.setItem(REMINDER_ASKED_KEY, '1').catch(() => { });
        setReminderAsked(true);
        if (ok) {
            setReminder({ enabled: true, hour: hourOfDay, minute: 0 });
            setReminderNote(`Done. You will get a reminder at ${formatReminderTime(hourOfDay, 0)}.`);
            celebrate();
        } else {
            setReminderNote('Notifications are off for FinSight. You can turn them on in your phone settings.');
        }
    };

    const skipReminder = () => {
        AsyncStorage.setItem(REMINDER_ASKED_KEY, '1').catch(() => { });
        setReminderAsked(true);
    };

    const onRefresh = () => {
        setRefreshing(true);
        load().finally(() => setRefreshing(false));
    };

    const card = { borderRadius: RADIUS.card, borderWidth: 1, borderColor: COLORS.border.default, backgroundColor: COLORS.surface.primary };

    return (
        <SafeAreaView className="flex-1 bg-surface-secondary" edges={['top', 'left', 'right']}>
            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingHorizontal: GUTTER, paddingBottom: 32 }}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.brand.primary} colors={[COLORS.brand.primary]} />
                }
            >
                {/* Header: the date, the streak, the profile. */}
                <View className="flex-row items-center justify-between pt-3 pb-1">
                    <Text style={TYPE.micro} className="text-text-tertiary">
                        {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}
                    </Text>
                    <View className="flex-row items-center">
                        <View
                            className="flex-row items-center px-3 h-9 mr-2.5"
                            style={{ borderRadius: RADIUS.pill, backgroundColor: streak > 0 ? COLORS.semantic.alertBg : COLORS.surface.tertiary }}
                            accessibilityLabel={`${streak} day streak`}
                        >
                            <Flame size={17} color={streak > 0 ? COLORS.semantic.alertAmberFill : COLORS.text.muted} fill={streak > 0 ? COLORS.semantic.alertAmberFill : 'transparent'} strokeWidth={2} />
                            <Text style={[TYPE.amountSm, { marginLeft: 5 }]} className={streak > 0 ? 'text-alert-amber' : 'text-text-tertiary'}>
                                {streak}
                            </Text>
                        </View>
                        <PressableScale
                            onPress={() => navigation.navigate('Profile')}
                            activeScale={0.92}
                            accessibilityRole="button"
                            accessibilityLabel="Your profile"
                            className="w-9 h-9 rounded-full bg-brand-primary-dark items-center justify-center"
                        >
                            <Text style={[TYPE.callout, { fontFamily: FONTS.semibold, color: COLORS.brand.onAccent }]}>
                                {(name || 'Y').charAt(0).toUpperCase()}
                            </Text>
                        </PressableScale>
                    </View>
                </View>

                {/* Fini and what Fini has to say. */}
                <View className="flex-row items-center mt-3">
                    <Mascot mood={burst ? 'celebrate' : mood} size={118} onPress={showTip} />
                    <Animated.View
                        key={line}
                        entering={reduced ? FadeIn.duration(150) : FadeIn.duration(260)}
                        style={{ flex: 1, marginLeft: 10 }}
                    >
                        <View style={{ ...card, padding: 14, borderTopLeftRadius: 6 }}>
                            <Text style={TYPE.callout} className="text-text-primary">{line}</Text>
                            {tip && (
                                <Pressable onPress={showTip} hitSlop={8} className="mt-2" accessibilityRole="button">
                                    <Text style={[TYPE.caption, { fontFamily: FONTS.semibold }]} className="text-brand-link">Another one</Text>
                                </Pressable>
                            )}
                        </View>
                    </Animated.View>
                </View>

                {/* Ask anything: a question in, a working tool out. */}
                <View style={{ ...card, padding: 14, marginTop: 14 }}>
                    <PressableScale
                        onPress={() => { haptics.tap(); navigation.navigate('Ask'); }}
                        activeScale={0.98}
                        accessibilityRole="button"
                        accessibilityLabel="Ask any money question"
                        style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingLeft: 14, paddingRight: 6, borderRadius: 22, backgroundColor: COLORS.surface.secondary }}
                    >
                        <Sparkles size={16} color={COLORS.brand.link} />
                        <Text style={[TYPE.callout, { flex: 1, marginLeft: 10 }]} className="text-text-tertiary">Ask any money question</Text>
                        <View style={{ width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.brand.primaryDark }}>
                            <ArrowUp size={16} color={COLORS.brand.onAccent} strokeWidth={2.5} />
                        </View>
                    </PressableScale>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 10 }} contentContainerStyle={{ gap: 8 }}>
                        {ASK_SUGGESTIONS.slice(0, 4).map((q) => (
                            <PressableScale
                                key={q}
                                onPress={() => { haptics.tap(); navigation.navigate('Ask', { question: q }); }}
                                activeScale={0.96}
                                accessibilityRole="button"
                                style={{ paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, borderWidth: 1, borderColor: COLORS.border.default }}
                            >
                                <Text style={[TYPE.caption, { color: COLORS.text.secondary }]}>{q}</Text>
                            </PressableScale>
                        ))}
                    </ScrollView>
                </View>

                {/* The week, so a streak is something you can see. */}
                <View style={{ ...card, padding: 14, marginTop: 14 }} className="flex-row justify-between">
                    {week.map((d) => (
                        <View key={d.key} className="items-center" style={{ width: 36 }}>
                            <Text style={TYPE.caption} className={d.isToday ? 'text-text-primary' : 'text-text-tertiary'}>{d.label}</Text>
                            <View
                                className="items-center justify-center mt-1.5"
                                style={{
                                    width: 30, height: 30, borderRadius: 15,
                                    backgroundColor: d.studied ? COLORS.semantic.alertAmberFill : COLORS.surface.tertiary,
                                    borderWidth: d.isToday && !d.studied ? 2 : 0,
                                    borderColor: COLORS.brand.primary,
                                }}
                            >
                                {d.studied && <Flame size={15} color="#FFFFFF" fill="#FFFFFF" strokeWidth={2} />}
                            </View>
                        </View>
                    ))}
                </View>

                {/* Today's lesson: the one thing to do. */}
                <Animated.View entering={reduced ? undefined : FadeInDown.duration(240)}>
                    <PressableScale
                        onPress={() => { haptics.tap(); navigation.navigate('LessonPlayer', { mode: 'session' }); }}
                        accessibilityRole="button"
                        accessibilityLabel={sessionDone ? 'Practise again' : 'Start today\'s lesson'}
                        containerStyle={{ marginTop: 14 }}
                        style={{
                            borderRadius: RADIUS.card,
                            padding: 18,
                            backgroundColor: sessionDone ? COLORS.surface.primary : COLORS.brand.primaryDark,
                            borderWidth: sessionDone ? 1 : 0,
                            borderColor: COLORS.border.default,
                        }}
                    >
                        <View className="flex-row items-center">
                            <View
                                className="w-12 h-12 items-center justify-center mr-3.5"
                                style={{ borderRadius: RADIUS.tile, backgroundColor: sessionDone ? COLORS.semantic.profitBg : 'rgba(255,255,255,0.18)' }}
                            >
                                {sessionDone
                                    ? <Check size={22} color={COLORS.semantic.profit} strokeWidth={2.6} />
                                    : <Play size={20} color={COLORS.brand.onAccent} fill={COLORS.brand.onAccent} />}
                            </View>
                            <View className="flex-1">
                                <Text style={TYPE.micro} className={sessionDone ? 'text-text-tertiary' : 'text-brand-on-dark'}>
                                    Today's lesson
                                </Text>
                                <Text style={[TYPE.heading, { color: sessionDone ? COLORS.text.primary : COLORS.brand.onAccent, marginTop: 2 }]}>
                                    {sessionDone ? 'Done for today' : 'Three minutes on money'}
                                </Text>
                                {sessionDone ? (
                                    <Text style={TYPE.caption} className="text-text-secondary mt-0.5">Tap to practise again</Text>
                                ) : null}
                            </View>
                        </View>
                    </PressableScale>
                </Animated.View>

                {/* The money check-in: one question, one tap. */}
                <View style={{ ...card, padding: 18, marginTop: 14 }}>
                    <Text style={TYPE.micro} className="text-text-tertiary">Money check-in</Text>
                    {spentToday > 0 ? (
                        <View className="flex-row items-center justify-between mt-2">
                            <View className="flex-1 mr-3">
                                <Text style={TYPE.heading} className="text-text-primary">₹{inr(spentToday)} today</Text>
                                <Text style={TYPE.caption} className="text-text-secondary mt-0.5">Logged. Anything else?</Text>
                            </View>
                            <SmallButton icon={<Plus size={16} color={COLORS.brand.link} strokeWidth={2.4} />} label="Add" onPress={() => navigation.navigate('AddTransaction')} />
                        </View>
                    ) : checkIn === 'none' ? (
                        <View className="flex-row items-center justify-between mt-2">
                            <View className="flex-1 mr-3">
                                <Text style={TYPE.heading} className="text-text-primary">No-spend day</Text>
                                <Text style={TYPE.caption} className="text-text-secondary mt-0.5">That is a win. It counts on the Money tab.</Text>
                            </View>
                            <Pressable onPress={() => navigation.navigate('AddTransaction')} hitSlop={8} accessibilityRole="button">
                                <Text style={[TYPE.caption, { fontFamily: FONTS.semibold }]} className="text-brand-link">I did spend</Text>
                            </Pressable>
                        </View>
                    ) : (
                        <>
                            <Text style={TYPE.heading} className="text-text-primary mt-2">Spent anything today?</Text>
                            <View className="flex-row mt-4" style={{ gap: 10 }}>
                                <PressableScale
                                    onPress={noSpendToday}
                                    accessibilityRole="button"
                                    containerStyle={{ flex: 1 }}
                                    style={{ height: 48, borderRadius: RADIUS.pill, borderWidth: 1, borderColor: COLORS.border.strong, alignItems: 'center', justifyContent: 'center' }}
                                >
                                    <Text style={[TYPE.callout, { fontFamily: FONTS.semibold }]} className="text-text-primary">Nothing today</Text>
                                </PressableScale>
                                <PressableScale
                                    onPress={() => { haptics.tap(); navigation.navigate('AddTransaction'); }}
                                    accessibilityRole="button"
                                    containerStyle={{ flex: 1 }}
                                    style={{ height: 48, borderRadius: RADIUS.pill, backgroundColor: COLORS.brand.primaryDark, alignItems: 'center', justifyContent: 'center' }}
                                >
                                    <Text style={[TYPE.callout, { fontFamily: FONTS.semibold, color: COLORS.brand.onAccent }]}>Yes, add it</Text>
                                </PressableScale>
                            </View>
                        </>
                    )}
                </View>

                {/* A reminder, asked for once. Off by default, so without this card
                    almost nobody ever gets the reminder at all. */}
                {!reminder.enabled && !reminderAsked && (
                    <Animated.View entering={reduced ? undefined : FadeInDown.duration(240)} style={{ ...card, padding: 18, marginTop: 14 }}>
                        <View className="flex-row items-center">
                            <Bell size={18} color={COLORS.brand.link} strokeWidth={2} />
                            <Text style={TYPE.heading} className="text-text-primary ml-2">Want a daily reminder?</Text>
                        </View>
                        <Text style={TYPE.caption} className="text-text-secondary mt-1">
                            One a day, at a time you pick.
                        </Text>
                        <View className="flex-row mt-3.5" style={{ gap: 8 }}>
                            {[9, 13, 20].map((h) => (
                                <PressableScale
                                    key={h}
                                    onPress={() => pickReminder(h)}
                                    accessibilityRole="button"
                                    containerStyle={{ flex: 1 }}
                                    style={{ height: 42, borderRadius: RADIUS.pill, backgroundColor: COLORS.brand.soft, borderWidth: 1, borderColor: COLORS.brand.edge, alignItems: 'center', justifyContent: 'center' }}
                                >
                                    <Text style={[TYPE.callout, { fontFamily: FONTS.semibold, color: COLORS.brand.link }]}>{formatReminderTime(h, 0)}</Text>
                                </PressableScale>
                            ))}
                        </View>
                        <Pressable onPress={skipReminder} hitSlop={8} className="self-center mt-3" accessibilityRole="button">
                            <Text style={TYPE.caption} className="text-text-tertiary">Not now</Text>
                        </Pressable>
                    </Animated.View>
                )}
                {reminderNote && (
                    <Animated.View entering={FadeIn.duration(200)} style={{ marginTop: 10 }}>
                        <Text style={TYPE.caption} className="text-text-secondary text-center">{reminderNote}</Text>
                    </Animated.View>
                )}

                {/* Last month, explained, once there is enough of it. */}
                {autopsy && (
                    <PressableScale
                        onPress={() => { haptics.tap(); navigation.navigate('LessonPlayer', { mode: 'autopsy' }); }}
                        accessibilityRole="button"
                        containerStyle={{ marginTop: 14 }}
                        style={{ ...card, padding: 16, flexDirection: 'row', alignItems: 'center' }}
                    >
                        <View className="w-10 h-10 bg-brand-soft items-center justify-center mr-3" style={{ borderRadius: RADIUS.tile }}>
                            <CalendarDays size={19} color={COLORS.brand.link} strokeWidth={1.8} />
                        </View>
                        <View className="flex-1">
                            <Text style={[TYPE.callout, { fontFamily: FONTS.semibold }]} className="text-text-primary">Your month, in review</Text>
                        </View>
                        <ArrowRight size={18} color={COLORS.text.tertiary} />
                    </PressableScale>
                )}

                {quizDue && (
                    <PressableScale
                        onPress={() => { haptics.tap(); navigation.navigate('MoneyQuiz'); }}
                        accessibilityRole="button"
                        containerStyle={{ marginTop: 14 }}
                        style={{ ...card, padding: 16, flexDirection: 'row', alignItems: 'center' }}
                    >
                        <View className="w-10 h-10 bg-brand-soft items-center justify-center mr-3" style={{ borderRadius: RADIUS.tile }}>
                            <ClipboardCheck size={19} color={COLORS.brand.link} strokeWidth={1.8} />
                        </View>
                        <View className="flex-1">
                            <Text style={[TYPE.callout, { fontFamily: FONTS.semibold }]} className="text-text-primary">
                                {quizBase ? 'See how much you have learned' : 'How much do you know about money?'}
                            </Text>
                            <Text style={TYPE.caption} className="text-text-secondary mt-0.5">
                                {quizBase ? `You started at ${quizBase.score}/10` : 'Ten questions, two minutes'}
                            </Text>
                        </View>
                        <ArrowRight size={18} color={COLORS.text.tertiary} />
                    </PressableScale>
                )}

                {/* The one thing the onboarding answers say is still missing. */}
                {step && (
                    <PressableScale
                        onPress={() => { haptics.tap(); navigation.navigate(step.route); }}
                        accessibilityRole="button"
                        containerStyle={{ marginTop: 14 }}
                        style={{ borderRadius: RADIUS.card, padding: 16, flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.brand.soft, borderWidth: 1, borderColor: COLORS.brand.edge }}
                    >
                        <Sparkles size={18} color={COLORS.brand.link} strokeWidth={2} />
                        <View className="flex-1 ml-3">
                            <Text style={TYPE.micro} className="text-brand-link">Next step for you</Text>
                            <Text style={[TYPE.callout, { fontFamily: FONTS.semibold }]} className="text-text-primary mt-0.5">{step.label}</Text>
                        </View>
                        <ArrowRight size={18} color={COLORS.brand.link} />
                    </PressableScale>
                )}
            </ScrollView>
        </SafeAreaView>
    );
};

const SmallButton: React.FC<{ icon: React.ReactNode; label: string; onPress: () => void }> = ({ icon, label, onPress }) => (
    <PressableScale
        onPress={() => { haptics.tap(); onPress(); }}
        accessibilityRole="button"
        style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, height: 38, borderRadius: RADIUS.pill, backgroundColor: COLORS.brand.soft }}
    >
        {icon}
        <Text style={[TYPE.callout, { fontFamily: FONTS.semibold, color: COLORS.brand.link, marginLeft: 4 }]}>{label}</Text>
    </PressableScale>
);

export default TodayScreen;
