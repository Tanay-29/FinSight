/**
 * GoalsScreen: what you are saving for, and how close each one is.
 *
 * One summary at the top (everything saved, as a ring and as a bar split by
 * goal), then a card per active goal: its own ring with its icon, what it
 * takes a month to make the date, and one main action, Add money. "How
 * fast?" opens the time-to-goal calculator on Ask with this goal's numbers.
 * Goals already reached fold into a short list at the end.
 *
 * Adding money and creating a goal both happen in a bottom sheet with a
 * large amount field and a live preview, so the result of a choice is on
 * screen before it is confirmed.
 */
import React, { useEffect, useMemo, useState } from 'react';
import {
    View, Text, ScrollView, Modal, TextInput, Alert, Platform, KeyboardAvoidingView, Pressable,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import Animated, { FadeIn, FadeInDown, SlideInDown, useReducedMotion } from 'react-native-reanimated';
import { Plus, PiggyBank, CalendarDays, Zap, CloudOff, X, Check, MoreHorizontal, Trophy } from 'lucide-react-native';
import { addMonths, differenceInCalendarMonths, differenceInDays, format, parseISO } from 'date-fns';
import { useNavigation } from '@react-navigation/native';
import { GOAL_ICONS, GOAL_ICON_KEYS, DEFAULT_GOAL_ICON_KEY, goalIcon } from '../theme/icons';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { fetchGoals, createGoal, depositToGoal, removeGoal } from '../store/slices/goalsSlice';
import { FirestoreGoal } from '../services/firestoreService';
import { EmptyState } from '../components/EmptyState';
import { PressableScale } from '../components/PressableScale';
import { ProgressRing } from '../components/ProgressRing';
import { AmountInput } from '../components/AmountInput';
import { AnimatedNumber } from '../components/AnimatedNumber';
import { Confetti } from '../components/Confetti';
import { inr } from '../utils/moneyMath';
import * as haptics from '../utils/haptics';
import { COLORS, FONTS, TYPE, GUTTER, RADIUS } from '../theme/tokens';

const rs = (n: number) => `₹${inr(n)}`;
const toAmount = (raw: string): number => {
    const n = Number(raw.replace(/[₹,\s]/g, ''));
    return Number.isFinite(n) && n > 0 ? Math.round(n) : 0;
};

/** What a goal needs each month to make its date, or 0 if it is done or late. */
function monthlyNeed(goal: FirestoreGoal): number {
    const remaining = goal.targetAmount - goal.savedAmount;
    const months = Math.max(1, differenceInCalendarMonths(parseISO(goal.deadline), new Date()));
    return remaining > 0 && differenceInDays(parseISO(goal.deadline), new Date()) > 0 ? Math.ceil(remaining / months) : 0;
}

/** A goal's icon by its saved key. */
const GoalGlyph: React.FC<{ icon?: string; size: number; color: string }> = ({ icon, size, color }) =>
    React.createElement(goalIcon(icon), { size, color });

// ─── Summary ─────────────────────────────────────────────────

const Summary: React.FC<{ goals: FirestoreGoal[] }> = ({ goals }) => {
    const target = goals.reduce((s, g) => s + g.targetAmount, 0);
    const saved = goals.reduce((s, g) => s + Math.min(g.savedAmount, g.targetAmount), 0);
    const reached = goals.filter((g) => g.savedAmount >= g.targetAmount).length;
    const pct = target > 0 ? saved / target : 0;
    return (
        <View style={{ marginHorizontal: GUTTER, marginTop: 14, borderRadius: RADIUS.card, padding: 18, backgroundColor: COLORS.brand.primaryDark }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View style={{ flex: 1 }}>
                    <Text style={{ ...TYPE.micro, color: 'rgba(255,255,255,0.75)' }}>Saved so far</Text>
                    <AnimatedNumber value={saved} format={rs} style={{ ...TYPE.amountLg, fontSize: 32, lineHeight: 38, color: '#FFFFFF', marginTop: 4 }} />
                    <Text style={{ ...TYPE.caption, color: 'rgba(255,255,255,0.8)', marginTop: 2 }}>
                        of {rs(target)}{reached > 0 ? ` · ${reached} reached` : ''}
                    </Text>
                </View>
                <ProgressRing value={pct} size={76} stroke={8} color="#FFFFFF" trackColor="rgba(255,255,255,0.2)">
                    <Text style={{ ...TYPE.amountSm, color: '#FFFFFF' }}>{Math.round(pct * 100)}%</Text>
                </ProgressRing>
            </View>
            {/* One bar, split by goal: where the saved money sits. */}
            <View style={{ flexDirection: 'row', height: 8, borderRadius: 4, overflow: 'hidden', backgroundColor: 'rgba(255,255,255,0.18)', marginTop: 16 }}>
                {goals.map((g) => (
                    <View key={g.id} style={{ width: `${(Math.min(g.savedAmount, g.targetAmount) / Math.max(target, 1)) * 100}%`, backgroundColor: g.color, borderRightWidth: 2, borderRightColor: COLORS.brand.primaryDark }} />
                ))}
            </View>
        </View>
    );
};

// ─── Goal card ───────────────────────────────────────────────

const GoalCard: React.FC<{ goal: FirestoreGoal; onAdd: () => void; onMore: () => void }> = ({ goal, onAdd, onMore }) => {
    const navigation = useNavigation<any>();
    const pct = goal.targetAmount > 0 ? goal.savedAmount / goal.targetAmount : 0;
    const need = monthlyNeed(goal);
    const days = differenceInDays(parseISO(goal.deadline), new Date());
    const remaining = Math.max(0, goal.targetAmount - goal.savedAmount);
    const late = days < 0;

    return (
        <View style={{ marginHorizontal: GUTTER, marginBottom: 12, borderRadius: RADIUS.card, padding: 16, backgroundColor: COLORS.surface.primary, borderWidth: 1, borderColor: COLORS.border.default }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <ProgressRing value={pct} size={58} stroke={5} color={goal.color}>
                    <GoalGlyph icon={goal.icon} size={22} color={goal.color} />
                </ProgressRing>
                <View style={{ flex: 1, marginLeft: 14 }}>
                    <Text numberOfLines={1} style={{ ...TYPE.heading, fontSize: 17, color: COLORS.text.primary }}>{goal.title}</Text>
                    <Text style={{ ...TYPE.caption, color: COLORS.text.secondary, marginTop: 2 }}>
                        <Text style={{ fontFamily: FONTS.bold, color: COLORS.text.primary }}>{rs(goal.savedAmount)}</Text> of {rs(goal.targetAmount)}
                    </Text>
                </View>
                <Text style={{ ...TYPE.amountMd, color: goal.color }}>{Math.round(pct * 100)}%</Text>
                <Pressable onPress={onMore} hitSlop={10} accessibilityRole="button" accessibilityLabel={`More for ${goal.title}`} style={{ marginLeft: 8, padding: 2 }}>
                    <MoreHorizontal size={18} color={COLORS.text.tertiary} />
                </Pressable>
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 14 }}>
                <CalendarDays size={14} color={late ? COLORS.semantic.alertCritical : COLORS.text.tertiary} />
                <Text style={{ ...TYPE.caption, marginLeft: 6, flex: 1, color: late ? COLORS.semantic.alertCritical : COLORS.text.secondary }}>
                    {late
                        ? `Past ${format(parseISO(goal.deadline), 'd MMM')}, ${rs(remaining)} to go`
                        : `${rs(need)} a month to make it by ${format(parseISO(goal.deadline), 'd MMM yyyy')}`}
                </Text>
            </View>

            <View style={{ flexDirection: 'row', gap: 10, marginTop: 14 }}>
                <PressableScale
                    onPress={onAdd}
                    accessibilityRole="button"
                    accessibilityLabel={`Add money to ${goal.title}`}
                    containerStyle={{ flex: 1 }}
                    style={{ height: 44, borderRadius: 22, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: goal.color }}
                >
                    <Plus size={16} color="#FFFFFF" strokeWidth={2.6} />
                    <Text style={{ ...TYPE.callout, fontFamily: FONTS.semibold, color: '#FFFFFF', marginLeft: 6 }}>Add money</Text>
                </PressableScale>
                <PressableScale
                    onPress={() => navigation.navigate('Ask', {
                        question: `How fast can I reach ${goal.title}?`,
                        toolId: 'goal',
                        values: { target: Math.round(remaining), monthly: Math.max(500, need || Math.round(remaining / 12)), rate: 7 },
                    })}
                    accessibilityRole="button"
                    accessibilityLabel={`How fast can I reach ${goal.title}`}
                    style={{ height: 44, paddingHorizontal: 16, borderRadius: 22, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.surface.tertiary }}
                >
                    <Zap size={15} color={COLORS.text.primary} />
                    <Text style={{ ...TYPE.callout, fontFamily: FONTS.semibold, color: COLORS.text.primary, marginLeft: 6 }}>How fast?</Text>
                </PressableScale>
            </View>
        </View>
    );
};

const ReachedRow: React.FC<{ goal: FirestoreGoal; last: boolean; onMore: () => void }> = ({ goal, last, onMore }) => {
    return (
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: last ? 0 : 1, borderBottomColor: COLORS.border.default }}>
            <View style={{ width: 36, height: 36, borderRadius: RADIUS.tile, alignItems: 'center', justifyContent: 'center', backgroundColor: `${goal.color}22` }}>
                <GoalGlyph icon={goal.icon} size={18} color={goal.color} />
            </View>
            <Text numberOfLines={1} style={{ ...TYPE.callout, fontFamily: FONTS.semibold, color: COLORS.text.primary, marginLeft: 12, flex: 1 }}>{goal.title}</Text>
            <Text style={{ ...TYPE.amountSm, color: COLORS.text.secondary }}>{rs(goal.targetAmount)}</Text>
            <View style={{ width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.semantic.profit, marginLeft: 10 }}>
                <Check size={13} color="#FFFFFF" strokeWidth={3} />
            </View>
            <Pressable onPress={onMore} hitSlop={10} accessibilityRole="button" accessibilityLabel={`More for ${goal.title}`} style={{ marginLeft: 8 }}>
                <MoreHorizontal size={18} color={COLORS.text.tertiary} />
            </Pressable>
        </View>
    );
};

// ─── Sheet ───────────────────────────────────────────────────

const Sheet: React.FC<{ visible: boolean; onClose: () => void; title: string; children: React.ReactNode }> = ({ visible, onClose, title, children }) => {
    const insets = useSafeAreaInsets();
    const reduced = useReducedMotion();
    return (
        <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
            <KeyboardAvoidingView style={{ flex: 1, justifyContent: 'flex-end' }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
                <Pressable style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(10,8,6,0.45)' }} onPress={onClose} accessibilityLabel="Close" />
                <Animated.View
                    entering={reduced ? FadeIn.duration(150) : SlideInDown.duration(280)}
                    style={{ maxHeight: '90%', borderTopLeftRadius: 28, borderTopRightRadius: 28, backgroundColor: COLORS.surface.primary, paddingBottom: 16 + insets.bottom }}
                >
                    <View style={{ alignItems: 'center', paddingTop: 10 }}>
                        <View style={{ width: 38, height: 4, borderRadius: 2, backgroundColor: COLORS.border.strong }} />
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 22, paddingTop: 12, paddingBottom: 6 }}>
                        <Text style={{ ...TYPE.heading, color: COLORS.text.primary, flex: 1 }}>{title}</Text>
                        <Pressable onPress={onClose} hitSlop={10} accessibilityRole="button" accessibilityLabel="Close"
                            style={{ width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.surface.tertiary }}>
                            <X size={16} color={COLORS.text.secondary} />
                        </Pressable>
                    </View>
                    <ScrollView contentContainerStyle={{ paddingHorizontal: 22, paddingTop: 8 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
                        {children}
                    </ScrollView>
                </Animated.View>
            </KeyboardAvoidingView>
        </Modal>
    );
};

const Chip: React.FC<{ label: string; active: boolean; color: string; onPress: () => void }> = ({ label, active, color, onPress }) => (
    <PressableScale
        onPress={() => { haptics.select(); onPress(); }}
        activeScale={0.95}
        accessibilityRole="button"
        accessibilityState={{ selected: active }}
        style={{ paddingHorizontal: 14, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: active ? color : COLORS.border.default, backgroundColor: active ? `${color}1F` : COLORS.surface.primary }}
    >
        <Text style={{ ...TYPE.caption, fontFamily: FONTS.semibold, color: active ? color : COLORS.text.secondary }}>{label}</Text>
    </PressableScale>
);

const PrimaryButton: React.FC<{ label: string; color: string; disabled?: boolean; onPress: () => void }> = ({ label, color, disabled, onPress }) => (
    <PressableScale
        onPress={onPress}
        disabled={disabled}
        accessibilityRole="button"
        style={{ height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center', backgroundColor: disabled ? COLORS.surface.tertiary : color, marginTop: 18 }}
    >
        <Text style={{ ...TYPE.callout, fontFamily: FONTS.semibold, color: disabled ? COLORS.text.tertiary : '#FFFFFF' }}>{label}</Text>
    </PressableScale>
);

// ─── Add money ───────────────────────────────────────────────

const AddMoneySheet: React.FC<{
    goal: FirestoreGoal | null; error: string | null; onClose: () => void; onConfirm: (amount: number) => void;
}> = ({ goal, error, onClose, onConfirm }) => {
    const [amount, setAmount] = useState('');
    if (!goal) return null;
    const value = toAmount(amount);
    const remaining = Math.max(0, goal.targetAmount - goal.savedAmount);
    const after = goal.savedAmount + value;
    const chips = [500, 1000, 2000].filter((q) => q < remaining);
    return (
        <Sheet visible onClose={onClose} title={`Add to ${goal.title}`}>
            <View style={{ flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: RADIUS.card, backgroundColor: COLORS.surface.secondary }}>
                <ProgressRing value={goal.savedAmount / goal.targetAmount} preview={after / goal.targetAmount} size={52} stroke={5} color={goal.color}>
                    <GoalGlyph icon={goal.icon} size={20} color={goal.color} />
                </ProgressRing>
                <View style={{ marginLeft: 14, flex: 1 }}>
                    <Text style={{ ...TYPE.callout, fontFamily: FONTS.semibold, color: COLORS.text.primary }}>
                        {value > 0 ? (after >= goal.targetAmount ? 'This reaches the goal' : `${Math.round((after / goal.targetAmount) * 100)}% after this`) : `${Math.round((goal.savedAmount / goal.targetAmount) * 100)}% saved`}
                    </Text>
                    <Text style={{ ...TYPE.caption, color: COLORS.text.secondary, marginTop: 2 }}>
                        {value > 0 ? `${rs(Math.max(0, goal.targetAmount - after))} still to go` : `${rs(remaining)} to go`}
                    </Text>
                </View>
            </View>
            <View style={{ paddingTop: 14, paddingBottom: 10 }}>
                <AmountInput value={amount} onChange={setAmount} color={COLORS.text.primary} autoFocus label="Amount to add" />
            </View>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' }}>
                {chips.map((q) => <Chip key={q} label={rs(q)} active={value === q} color={goal.color} onPress={() => setAmount(String(q))} />)}
                {remaining > 0 ? <Chip label={`All ${rs(remaining)}`} active={value === remaining} color={goal.color} onPress={() => setAmount(String(remaining))} /> : null}
            </View>
            {error ? <Text style={{ ...TYPE.caption, color: COLORS.semantic.alertCritical, textAlign: 'center', marginTop: 12 }}>{error}</Text> : null}
            <PrimaryButton label={value > 0 ? `Add ${rs(value)}` : 'Enter an amount'} color={goal.color} disabled={value <= 0} onPress={() => { haptics.commit(); onConfirm(value); }} />
        </Sheet>
    );
};

// ─── New goal ────────────────────────────────────────────────

/** Literal on purpose: a goal's colour is saved and must mean the same in both themes. */
const GOAL_COLORS = ['#6366F1', '#0F766E', '#047857', '#B45309', '#C0392F', '#BE185D', '#6D28D9', '#1D4ED8'];

const WHEN: { label: string; months: number }[] = [
    { label: '3 months', months: 3 }, { label: '6 months', months: 6 }, { label: '1 year', months: 12 }, { label: '2 years', months: 24 },
];

const NewGoalSheet: React.FC<{
    visible: boolean; error: string | null; onClose: () => void; onSave: (g: Omit<FirestoreGoal, 'id'>) => void;
}> = ({ visible, error, onClose, onSave }) => {
    const [title, setTitle] = useState('');
    const [target, setTarget] = useState('');
    const [deadline, setDeadline] = useState(() => addMonths(new Date(), 6));
    const [preset, setPreset] = useState<number | null>(6);
    const [pickerOpen, setPickerOpen] = useState(false);
    const [icon, setIcon] = useState<string>(DEFAULT_GOAL_ICON_KEY);
    const [color, setColor] = useState(GOAL_COLORS[0]);

    const amount = toAmount(target);
    const months = Math.max(1, differenceInCalendarMonths(deadline, new Date()));
    const ready = title.trim().length > 0 && amount > 0;

    return (
        <Sheet visible={visible} onClose={onClose} title="New goal">
            {/* What it will look like, before it exists. */}
            <View style={{ flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: RADIUS.card, backgroundColor: COLORS.surface.secondary }}>
                <View style={{ width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', backgroundColor: `${color}22` }}>
                    <GoalGlyph icon={icon} size={22} color={color} />
                </View>
                <View style={{ marginLeft: 14, flex: 1 }}>
                    <Text numberOfLines={1} style={{ ...TYPE.callout, fontFamily: FONTS.semibold, color: title ? COLORS.text.primary : COLORS.text.tertiary }}>{title || 'Your goal'}</Text>
                    <Text style={{ ...TYPE.caption, color: COLORS.text.secondary, marginTop: 2 }}>
                        {amount > 0 ? `${rs(Math.ceil(amount / months))} a month, by ${format(deadline, 'MMM yyyy')}` : `By ${format(deadline, 'd MMM yyyy')}`}
                    </Text>
                </View>
            </View>

            <TextInput
                value={title}
                onChangeText={setTitle}
                placeholder="Name it, like Goa trip"
                placeholderTextColor={COLORS.text.tertiary}
                maxLength={40}
                accessibilityLabel="Goal name"
                style={{ ...TYPE.body, color: COLORS.text.primary, marginTop: 16, height: 50, paddingHorizontal: 16, borderRadius: RADIUS.control, borderWidth: 1, borderColor: COLORS.border.default, backgroundColor: COLORS.surface.primary }}
            />
            <View style={{ paddingTop: 12, paddingBottom: 4 }}>
                <AmountInput value={target} onChange={setTarget} color={COLORS.text.primary} label="Target amount" size={44} />
            </View>

            <Text style={{ ...TYPE.micro, color: COLORS.text.tertiary, marginTop: 6, marginBottom: 8 }}>By when</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {WHEN.map((w) => <Chip key={w.months} label={w.label} active={preset === w.months} color={color} onPress={() => { setPreset(w.months); setDeadline(addMonths(new Date(), w.months)); }} />)}
                <Chip label={preset === null ? format(deadline, 'd MMM yyyy') : 'Pick a date'} active={preset === null} color={color} onPress={() => setPickerOpen(true)} />
            </View>
            {pickerOpen ? (
                <DateTimePicker
                    value={deadline}
                    mode="date"
                    display={Platform.OS === 'ios' ? 'inline' : 'default'}
                    minimumDate={new Date()}
                    onChange={(event, picked) => {
                        if (Platform.OS === 'android') setPickerOpen(false);
                        if (event.type === 'dismissed') return;
                        if (picked) { setDeadline(picked); setPreset(null); }
                    }}
                />
            ) : null}

            <Text style={{ ...TYPE.micro, color: COLORS.text.tertiary, marginTop: 18, marginBottom: 8 }}>Icon</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {GOAL_ICON_KEYS.map((key) => {
                    const I = GOAL_ICONS[key];
                    const on = icon === key;
                    return (
                        <PressableScale key={key} onPress={() => { haptics.select(); setIcon(key); }} activeScale={0.92} accessibilityRole="button" accessibilityLabel={`${key} icon`} accessibilityState={{ selected: on }}
                            style={{ width: 46, height: 46, borderRadius: RADIUS.tile, alignItems: 'center', justifyContent: 'center', backgroundColor: on ? `${color}22` : COLORS.surface.secondary, borderWidth: 1.5, borderColor: on ? color : 'transparent' }}>
                            <I size={20} color={on ? color : COLORS.text.secondary} />
                        </PressableScale>
                    );
                })}
            </View>

            <Text style={{ ...TYPE.micro, color: COLORS.text.tertiary, marginTop: 18, marginBottom: 8 }}>Colour</Text>
            <View style={{ flexDirection: 'row', gap: 10 }}>
                {GOAL_COLORS.map((c) => (
                    <Pressable key={c} onPress={() => { haptics.select(); setColor(c); }} accessibilityRole="button" accessibilityLabel={`Colour ${c}`} accessibilityState={{ selected: color === c }}
                        style={{ width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: c }}>
                        {color === c ? <Check size={16} color="#FFFFFF" strokeWidth={3} /> : null}
                    </Pressable>
                ))}
            </View>

            {error ? <Text style={{ ...TYPE.caption, color: COLORS.semantic.alertCritical, marginTop: 12 }}>{error}</Text> : null}
            <PrimaryButton
                label={ready ? 'Create goal' : !title.trim() ? 'Name your goal' : 'Enter a target'}
                color={color}
                disabled={!ready}
                onPress={() => {
                    haptics.commit();
                    onSave({
                        title: title.trim(), icon, targetAmount: amount, savedAmount: 0,
                        deadline: format(deadline, 'yyyy-MM-dd'), color, createdAt: new Date().toISOString(),
                    });
                }}
            />
        </Sheet>
    );
};

// ─── Screen ──────────────────────────────────────────────────

export const GoalsScreen: React.FC = () => {
    const dispatch = useAppDispatch();
    const navigation = useNavigation<any>();
    const reduced = useReducedMotion();
    const { items: goals, error } = useAppSelector((state) => state.goals);
    const { user, profile } = useAppSelector((state) => state.auth);
    const userInitial = (user?.displayName || profile?.name)?.charAt(0).toUpperCase() || 'U';

    const [newOpen, setNewOpen] = useState(false);
    const [depositGoal, setDepositGoal] = useState<FirestoreGoal | null>(null);
    const [celebrate, setCelebrate] = useState(false);

    useEffect(() => { dispatch(fetchGoals()); }, [dispatch]);

    const active = useMemo(() => goals.filter((g) => g.savedAmount < g.targetAmount), [goals]);
    const reached = useMemo(() => goals.filter((g) => g.savedAmount >= g.targetAmount), [goals]);

    const create = async (goal: Omit<FirestoreGoal, 'id'>) => {
        const result = await dispatch(createGoal(goal));
        if (createGoal.fulfilled.match(result)) setNewOpen(false);
    };

    const deposit = async (amount: number) => {
        const goal = depositGoal;
        if (!goal?.id) return;
        const result = await dispatch(depositToGoal({ goalId: goal.id, amount }));
        if (depositToGoal.fulfilled.match(result)) {
            setDepositGoal(null);
            if (goal.savedAmount + amount >= goal.targetAmount) { haptics.celebrate(); setCelebrate(true); }
        }
    };

    const more = (goal: FirestoreGoal) => {
        haptics.tap();
        Alert.alert(goal.title, undefined, [
            { text: 'Delete goal', style: 'destructive', onPress: () => goal.id && dispatch(removeGoal(goal.id)) },
            { text: 'Cancel', style: 'cancel' },
        ]);
    };

    const totalSaved = goals.reduce((s, g) => s + g.savedAmount, 0);

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.surface.secondary }} edges={['top']}>
            <NewGoalSheet key={newOpen ? 'open' : 'closed'} visible={newOpen} error={newOpen ? error : null} onClose={() => setNewOpen(false)} onSave={create} />
            <AddMoneySheet key={depositGoal?.id ?? 'none'} goal={depositGoal} error={depositGoal ? error : null} onClose={() => setDepositGoal(null)} onConfirm={deposit} />

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 140 }}>
                <View style={{ paddingHorizontal: GUTTER, paddingTop: 12, flexDirection: 'row', alignItems: 'center' }}>
                    <View style={{ flex: 1 }}>
                        <Text style={{ ...TYPE.title, color: COLORS.text.primary }}>Goals</Text>
                        <Text style={{ ...TYPE.caption, color: COLORS.text.secondary, marginTop: 2 }}>
                            {goals.length === 0 ? 'Save towards something' : `${rs(totalSaved)} saved across ${goals.length} goal${goals.length === 1 ? '' : 's'}`}
                        </Text>
                    </View>
                    <PressableScale onPress={() => navigation.navigate('Profile')} activeScale={0.92} accessibilityRole="button" accessibilityLabel="Your profile"
                        style={{ width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.brand.primaryDark }}>
                        <Text style={{ fontFamily: FONTS.bold, fontSize: 16, color: COLORS.brand.onAccent }}>{userInitial}</Text>
                    </PressableScale>
                </View>

                {error && !newOpen && !depositGoal ? (
                    <Animated.View entering={FadeIn.duration(200)} style={{ marginHorizontal: GUTTER, marginTop: 10, padding: 12, flexDirection: 'row', alignItems: 'center', borderRadius: RADIUS.control, backgroundColor: COLORS.surface.primary, borderWidth: 1, borderColor: COLORS.border.default }}>
                        <CloudOff size={14} color={COLORS.text.secondary} />
                        <Text style={{ ...TYPE.caption, color: COLORS.text.secondary, marginLeft: 8, flex: 1 }}>{error}</Text>
                    </Animated.View>
                ) : null}

                {goals.length > 0 ? <Summary goals={goals} /> : null}

                {goals.length === 0 ? (
                    <EmptyState
                        icon={<PiggyBank color={COLORS.brand.primary} size={36} />}
                        title="No goals yet"
                        body="A trip, a phone, a cushion for bad months. Set one and see what it takes each month."
                        actionLabel="Create your first goal"
                        onAction={() => setNewOpen(true)}
                    />
                ) : (
                    <>
                        {active.length > 0 ? (
                            <Text style={{ ...TYPE.micro, color: COLORS.text.tertiary, marginHorizontal: GUTTER, marginTop: 22, marginBottom: 10 }}>In progress</Text>
                        ) : null}
                        {active.map((goal, i) => (
                            <Animated.View key={goal.id} entering={reduced ? FadeIn.duration(150) : FadeInDown.delay(i * 60).duration(260)}>
                                <GoalCard goal={goal} onAdd={() => { haptics.tap(); setDepositGoal(goal); }} onMore={() => more(goal)} />
                            </Animated.View>
                        ))}
                        {reached.length > 0 ? (
                            <View style={{ marginHorizontal: GUTTER, marginTop: 14 }}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                                    <Trophy size={13} color={COLORS.text.tertiary} />
                                    <Text style={{ ...TYPE.micro, color: COLORS.text.tertiary, marginLeft: 6 }}>Reached</Text>
                                </View>
                                <View style={{ paddingHorizontal: 14, borderRadius: RADIUS.card, backgroundColor: COLORS.surface.primary, borderWidth: 1, borderColor: COLORS.border.default }}>
                                    {reached.map((g, i) => <ReachedRow key={g.id} goal={g} last={i === reached.length - 1} onMore={() => more(g)} />)}
                                </View>
                            </View>
                        ) : null}
                    </>
                )}
            </ScrollView>

            {goals.length > 0 ? (
                <PressableScale
                    onPress={() => { haptics.tap(); setNewOpen(true); }}
                    activeScale={0.92}
                    accessibilityRole="button"
                    accessibilityLabel="New goal"
                    containerStyle={{ position: 'absolute', right: GUTTER, bottom: 24 }}
                    style={{ height: 52, paddingHorizontal: 20, borderRadius: 26, flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.brand.primaryDark, shadowColor: '#000', shadowOpacity: 0.18, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 6 }}
                >
                    <Plus size={18} color={COLORS.brand.onAccent} strokeWidth={2.6} />
                    <Text style={{ ...TYPE.callout, fontFamily: FONTS.semibold, color: COLORS.brand.onAccent, marginLeft: 6 }}>New goal</Text>
                </PressableScale>
            ) : null}

            <Confetti active={celebrate} onDone={() => setCelebrate(false)} />
        </SafeAreaView>
    );
};
