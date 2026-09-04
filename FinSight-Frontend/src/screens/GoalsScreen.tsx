// app/src/screens/GoalsScreen.tsx

import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    Modal,
    TextInput,
    Alert,
    ActivityIndicator,
    Platform,
    KeyboardAvoidingView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Plus, Trash2, PiggyBank, TrendingUp, CheckCircle, CalendarDays, Star, Zap, CloudOff } from 'lucide-react-native';
import { GOAL_ICONS, GOAL_ICON_KEYS, DEFAULT_GOAL_ICON_KEY, goalIcon } from '../theme/icons';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import {
    fetchGoals,
    createGoal,
    depositToGoal,
    removeGoal,
} from '../store/slices/goalsSlice';
import { FirestoreGoal } from '../services/firestoreService';
import Animated, { FadeIn, FadeInDown, useReducedMotion } from 'react-native-reanimated';
import { EmptyState } from '../components/EmptyState';
import { BarFill } from '../components/BarFill';
import { PressableScale } from '../components/PressableScale';
import * as haptics from '../utils/haptics';
import { addMonths, differenceInDays, format, parseISO } from 'date-fns';
import { useNavigation } from '@react-navigation/native';
import { COLORS, TYPE } from '../theme/tokens';

// ─── Goal Card ────────────────────────────────────────────────

// ─── Goal Card ────────────────────────────────────────────────

const GoalCard: React.FC<{
    goal: FirestoreGoal;
    onDeposit: (goal: FirestoreGoal) => void;
    onDelete: (goalId: string) => void;
}> = ({ goal, onDeposit, onDelete }) => {

    // NEW: We need navigation inside the card to route to Accelerate
    const navigation = useNavigation();

    const progress = Math.min((goal.savedAmount / goal.targetAmount) * 100, 100);
    const remaining = goal.targetAmount - goal.savedAmount;
    const isComplete = progress >= 100;
    const daysLeft = differenceInDays(parseISO(goal.deadline), new Date());
    const deadlineLabel =
        daysLeft < 0
            ? 'Overdue'
            : daysLeft === 0
                ? 'Due today'
                : `${daysLeft}d left`;
    const monthlySuggestion =
        daysLeft > 0 && remaining > 0
            ? Math.ceil(remaining / Math.max(Math.ceil(daysLeft / 30), 1))
            : 0;

    return (
        <View className="bg-surface-primary border border-border rounded-xl p-4 mx-5 mb-3">
            {/* Header */}
            <View className="flex-row items-center justify-between mb-3">
                <View className="flex-row items-center flex-1">
                    <View
                        className="w-10 h-10 rounded-xl items-center justify-center mr-3"
                        style={{ backgroundColor: `${goal.color}20` }}
                    >
                        {React.createElement(goalIcon(goal.icon), { size: 20, color: goal.color })}
                    </View>
                    <View className="flex-1">
                        <Text className="text-base font-inter-bold text-text-primary" numberOfLines={1}>
                            {goal.title}
                        </Text>
                        <View className="flex-row items-center">
                            {isComplete ? (
                                <Star size={11} color={COLORS.semantic.profit} />
                            ) : (
                                <CalendarDays size={11} color={daysLeft < 7 ? COLORS.semantic.alertCritical : COLORS.text.tertiary} />
                            )}
                            <Text
                                className="text-xs font-inter-medium ml-0.5"
                                style={{ color: daysLeft < 7 && !isComplete ? COLORS.semantic.alertCritical : COLORS.text.tertiary }}
                            >
                                {isComplete ? 'Goal reached!' : deadlineLabel}
                            </Text>
                        </View>
                    </View>
                </View>

                <TouchableOpacity
                    onPress={() =>
                        Alert.alert('Delete goal', `Remove "${goal.title}"?`, [
                            { text: 'Cancel', style: 'cancel' },
                            {
                                text: 'Delete',
                                style: 'destructive',
                                onPress: () => onDelete(goal.id!),
                            },
                        ])
                    }
                    className="p-2"
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    accessibilityRole="button"
                    accessibilityLabel={`Delete the goal ${goal.title}`}
                >
                    <Trash2 color={COLORS.text.tertiary} size={16} />
                </TouchableOpacity>
            </View>

            {/* Amount row */}
            <View className="flex-row items-baseline mb-3">
                <Text
                    className="text-2xl font-inter-bold"
                    style={{ color: isComplete ? COLORS.semantic.profit : goal.color }}
                >
                    ₹{goal.savedAmount.toLocaleString('en-IN')}
                </Text>
                <Text className="text-sm text-text-tertiary ml-1 font-inter">
                    {' '}/ ₹{goal.targetAmount.toLocaleString('en-IN')}
                </Text>
            </View>

            <BarFill
                percent={progress}
                height={12}
                color={isComplete ? COLORS.semantic.profit : goal.color}
                style={{ marginBottom: 8 }}
            />

            {/* The bar already says what percentage is saved, so the only line
                worth spending here is the one it cannot show. */}
            <View className="flex-row justify-end items-center mb-4">
                {!isComplete && remaining > 0 && (
                    <Text className="text-xs text-text-tertiary font-inter">
                        ₹{remaining.toLocaleString('en-IN')} to go
                    </Text>
                )}
            </View>

            {/* Suggestion chip */}
            {!isComplete && monthlySuggestion > 0 && (
                <View className="bg-surface-secondary rounded-xl p-3 mb-3 flex-row items-center">
                    <TrendingUp color={COLORS.brand.primary} size={14} />
                    <Text className="text-xs text-text-secondary ml-2 font-inter">
                        Save{' '}
                        <Text className="font-inter-semibold text-brand-primary">
                            ₹{monthlySuggestion.toLocaleString('en-IN')}/mo
                        </Text>{' '}
                        to hit your goal on time
                    </Text>
                </View>
            )}

            {/* Action buttons */}
            {!isComplete ? (
                <View className="flex-row gap-3">
                    <PressableScale
                        containerStyle={{ flex: 1 }}
                        className="py-2.5 rounded-xl border flex-row items-center justify-center"
                        style={{ borderColor: goal.color, backgroundColor: `${goal.color}10` }}
                        onPress={() => onDeposit(goal)}
                        accessibilityRole="button"
                    >
                        {/* Short enough that it cannot wrap at any font scale.
                            "Add money" was being clipped to "Add" on narrower
                            phones, which left the button reading as half a
                            word beside a plus sign. */}
                        <Plus size={15} color={goal.color} />
                        <Text
                            numberOfLines={1}
                            style={{ color: goal.color }}
                            className="font-inter-bold text-sm ml-1.5"
                        >
                            Add
                        </Text>
                    </PressableScale>

                    <PressableScale
                        containerStyle={{ flex: 1 }}
                        onPress={() => (navigation as any).navigate('GoalAcceleration', { goalId: goal.id })}
                        accessibilityRole="button"
                        className="py-2.5 rounded-xl flex-row justify-center items-center"
                        style={{ backgroundColor: goal.color }}
                    >
                        <Zap size={15} color="white" />
                        <Text numberOfLines={1} className="text-white font-inter-bold text-sm ml-1.5">
                            Speed up
                        </Text>
                    </PressableScale>
                </View>
            ) : (
                <View className="bg-profit-bg rounded-xl py-2.5 items-center flex-row justify-center">
                    <CheckCircle color={COLORS.semantic.profit} size={16} />
                    <Text className="text-profit font-inter-semibold text-sm ml-2">Completed</Text>
                </View>
            )}
        </View>
    );
};

// ─── Deposit Modal ────────────────────────────────────────────

const DepositModal: React.FC<{
    visible: boolean;
    goal: FirestoreGoal | null;
    error: string | null;
    onClose: () => void;
    onConfirm: (amount: number) => void;
}> = ({ visible, goal, error, onClose, onConfirm }) => {
    const [amount, setAmount] = useState('');
    const quickAmounts = [500, 1000, 2000, 5000];

    useEffect(() => {
        if (visible) setAmount('');
    }, [visible]);

    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
            <KeyboardAvoidingView
                className="flex-1 justify-end bg-black/40"
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            >
                <View className="bg-surface-primary rounded-t-3xl p-6">
                    <View className="flex-row items-center mb-1">
                        {React.createElement(goalIcon(goal?.icon), { size: 20, color: goal?.color ?? COLORS.brand.primary })}
                        <Text className="text-xl font-inter-bold text-text-primary ml-2">
                            Add to {goal?.title}
                        </Text>
                    </View>
                    <Text className="text-sm text-text-secondary mb-5 font-inter">
                        ₹{goal?.savedAmount.toLocaleString('en-IN')} saved of ₹
                        {goal?.targetAmount.toLocaleString('en-IN')}
                    </Text>

                    {/* Quick amounts */}
                    <View className="flex-row gap-2 mb-4">
                        {quickAmounts.map((q) => (
                            <PressableScale
                                key={q}
                                containerStyle={{ flex: 1 }}
                                activeScale={0.94}
                                accessibilityRole="button"
                                className="border border-border rounded-xl py-2 items-center"
                                onPress={() => { haptics.select(); setAmount(String(q)); }}
                                style={
                                    amount === String(q)
                                        ? { borderColor: goal?.color, backgroundColor: `${goal?.color}15` }
                                        : {}
                                }
                            >
                                <Text
                                    className="text-xs font-inter-semibold"
                                    style={{ color: amount === String(q) ? goal?.color : COLORS.text.secondary }}
                                >
                                    ₹{q.toLocaleString('en-IN')}
                                </Text>
                            </PressableScale>
                        ))}
                    </View>

                    {/* Custom amount */}
                    <View className="bg-surface-secondary rounded-xl px-4 py-3 mb-6 flex-row items-center">
                        <Text className="text-lg font-inter-bold text-text-primary mr-2">₹</Text>
                        <TextInput
                            className="flex-1 text-lg font-inter-bold text-text-primary"
                            placeholder="Enter amount"
                            placeholderTextColor={COLORS.text.tertiary}
                            keyboardType="numeric"
                            value={amount}
                            onChangeText={setAmount}
                        />
                    </View>

                    {error && (
                        <Text className="text-loss text-sm mb-4 leading-5 font-inter">{error}</Text>
                    )}

                    <View className="flex-row gap-3">
                        <TouchableOpacity
                            className="flex-1 border border-border rounded-xl py-3 items-center"
                            onPress={onClose}
                        >
                            <Text className="text-text-secondary font-inter-semibold">Cancel</Text>
                        </TouchableOpacity>
                        <PressableScale
                            containerStyle={{ flex: 1 }}
                            className="rounded-xl py-3 items-center"
                            style={{
                                backgroundColor:
                                    !amount || parseFloat(amount) <= 0
                                        ? COLORS.border.default
                                        : goal?.color ?? COLORS.brand.primary,
                            }}
                            accessibilityRole="button"
                            onPress={() => {
                                const val = parseFloat(amount);
                                if (val > 0) { haptics.commit(); onConfirm(val); }
                            }}
                            disabled={!amount || parseFloat(amount) <= 0}
                        >
                            <Text className="text-white font-inter-bold">Confirm</Text>
                        </PressableScale>
                    </View>
                </View>
            </KeyboardAvoidingView>
        </Modal>
    );
};

// ─── Add Goal Modal ───────────────────────────────────────────

const GOAL_COLORS = [
    COLORS.brand.primary, COLORS.semantic.profit, COLORS.semantic.alertAmberFill, COLORS.semantic.loss,
    COLORS.brand.primaryDark, '#BE185D', '#1D4ED8', '#0F766E',
];

const AddGoalModal: React.FC<{
    visible: boolean;
    error: string | null;
    onClose: () => void;
    onSave: (goal: Omit<FirestoreGoal, 'id'>) => void;
}> = ({ visible, error, onClose, onSave }) => {
    const [title, setTitle] = useState('');
    const [target, setTarget] = useState('');
    // Defaults to three months out: far enough to be a goal, near enough to
    // matter, and it means the field is never empty.
    const [deadlineDate, setDeadlineDate] = useState(() => addMonths(new Date(), 3));
    const [pickerOpen, setPickerOpen] = useState(false);
    const [selectedIcon, setSelectedIcon] = useState<string>(DEFAULT_GOAL_ICON_KEY);
    const [selectedColor, setSelectedColor] = useState(COLORS.brand.primary);

    useEffect(() => {
        if (visible) {
            setTitle('');
            setTarget('');
            setDeadlineDate(addMonths(new Date(), 3));
            setSelectedIcon(DEFAULT_GOAL_ICON_KEY);
            setSelectedColor(COLORS.brand.primary);
        }
    }, [visible]);

    const handleSave = () => {
        const amount = parseFloat(target);
        if (!title.trim() || isNaN(amount) || amount <= 0) {
            Alert.alert('Missing info', 'Give the goal a name and an amount.');
            return;
        }
        onSave({
            title: title.trim(),
            icon: selectedIcon,
            targetAmount: amount,
            savedAmount: 0,
            deadline: format(deadlineDate, 'yyyy-MM-dd'),
            color: selectedColor,
            createdAt: new Date().toISOString(),
        });
    };

    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
            <KeyboardAvoidingView
                className="flex-1 justify-end bg-black/40"
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            >
                <View className="bg-surface-primary rounded-t-3xl p-6">
                    <Text className="text-xl font-inter-bold text-text-primary mb-5">
                        New Savings Goal
                    </Text>

                    {/* Emoji picker */}
                    <Text className="text-xs font-inter-semibold text-text-secondary mb-2 uppercase tracking-wide">
                        Pick an icon
                    </Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-4">
                        <View className="flex-row gap-2">
                            {GOAL_ICON_KEYS.map((key) => {
                                const Icon = GOAL_ICONS[key];
                                const isSelected = selectedIcon === key;
                                return (
                                    <TouchableOpacity
                                        key={key}
                                        accessibilityRole="button"
                                        accessibilityLabel={`${key} icon`}
                                        accessibilityState={{ selected: isSelected }}
                                        className={`w-10 h-10 rounded-xl items-center justify-center border-2 ${isSelected ? 'border-brand-primary' : 'border-transparent bg-surface-secondary'
                                            }`}
                                        onPress={() => setSelectedIcon(key)}
                                    >
                                        <Icon size={20} color={isSelected ? selectedColor : COLORS.text.secondary} />
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                    </ScrollView>

                    {/* Color picker */}
                    <Text className="text-xs font-inter-semibold text-text-secondary mb-2 uppercase tracking-wide">
                        Accent color
                    </Text>
                    <View className="flex-row gap-2 mb-4">
                        {GOAL_COLORS.map((c) => (
                            <TouchableOpacity
                                key={c}
                                className="w-8 h-8 rounded-full"
                                style={{
                                    backgroundColor: c,
                                    borderWidth: selectedColor === c ? 3 : 0,
                                    borderColor: '#fff',
                                    shadowColor: c,
                                    shadowOpacity: selectedColor === c ? 0.6 : 0,
                                    shadowRadius: 4,
                                    elevation: selectedColor === c ? 4 : 0,
                                }}
                                onPress={() => setSelectedColor(c)}
                            />
                        ))}
                    </View>

                    {/* Goal title */}
                    <View className="bg-surface-secondary rounded-xl px-4 py-3 mb-3">
                        <Text className="text-xs text-text-tertiary mb-1 font-inter">Goal name</Text>
                        <TextInput
                            className="text-base text-text-primary font-inter-medium"
                            placeholder="e.g. Emergency Fund, Goa Trip"
                            placeholderTextColor={COLORS.text.tertiary}
                            value={title}
                            onChangeText={setTitle}
                        />
                    </View>

                    {/* Target amount */}
                    <View className="bg-surface-secondary rounded-xl px-4 py-3 mb-3 flex-row items-center">
                        <Text className="text-text-secondary mr-2">₹</Text>
                        <View className="flex-1">
                            <Text className="text-xs text-text-tertiary mb-1 font-inter">Target amount</Text>
                            <TextInput
                                className="text-base text-text-primary font-inter-medium"
                                placeholder="50000"
                                placeholderTextColor={COLORS.text.tertiary}
                                keyboardType="numeric"
                                value={target}
                                onChangeText={setTarget}
                            />
                        </View>
                    </View>

                    {/* Deadline. Typed dates meant learning a format and getting
                        it wrong; this opens the platform picker instead. */}
                    <TouchableOpacity
                        className="bg-surface-secondary rounded-xl px-4 py-3 mb-6 flex-row items-center justify-between"
                        onPress={() => setPickerOpen(true)}
                        activeOpacity={0.7}
                        accessibilityRole="button"
                        accessibilityLabel={`Target date, ${format(deadlineDate, 'd MMMM yyyy')}. Tap to change.`}
                    >
                        <View>
                            <Text className="text-xs text-text-tertiary mb-1 font-inter">Target date</Text>
                            <Text className="text-base text-text-primary font-inter-medium">
                                {format(deadlineDate, 'd MMM yyyy')}
                            </Text>
                        </View>
                        <CalendarDays size={18} color={COLORS.text.tertiary} />
                    </TouchableOpacity>

                    {pickerOpen && (
                        <DateTimePicker
                            value={deadlineDate}
                            mode="date"
                            display={Platform.OS === 'ios' ? 'inline' : 'default'}
                            minimumDate={new Date()}
                            onChange={(event, picked) => {
                                // Android fires once and dismisses itself; iOS
                                // keeps the inline picker up until dismissed.
                                if (Platform.OS === 'android') setPickerOpen(false);
                                if (event.type === 'dismissed') return;
                                if (picked) setDeadlineDate(picked);
                            }}
                        />
                    )}

                    {error && (
                        <Text className="text-loss text-sm mb-4 leading-5 font-inter">{error}</Text>
                    )}

                    <View className="flex-row gap-3">
                        <TouchableOpacity
                            className="flex-1 border border-border rounded-xl py-3 items-center"
                            onPress={onClose}
                        >
                            <Text className="text-text-secondary font-inter-semibold">Cancel</Text>
                        </TouchableOpacity>
                        <PressableScale
                            containerStyle={{ flex: 1 }}
                            className="rounded-xl py-3 items-center"
                            style={{ backgroundColor: selectedColor }}
                            onPress={handleSave}
                            accessibilityRole="button"
                        >
                            <Text className="text-white font-inter-bold">Create goal</Text>
                        </PressableScale>
                    </View>
                </View>
            </KeyboardAvoidingView>
        </Modal>
    );
};

// ─── Summary Banner ───────────────────────────────────────────

const SummaryBanner: React.FC<{ goals: FirestoreGoal[] }> = ({ goals }) => {
    const totalTarget = goals.reduce((s, g) => s + g.targetAmount, 0);
    const totalSaved = goals.reduce((s, g) => s + g.savedAmount, 0);
    const completed = goals.filter((g) => g.savedAmount >= g.targetAmount).length;
    const overallPct = totalTarget > 0 ? Math.round((totalSaved / totalTarget) * 100) : 0;

    return (
        <View className="mx-5 mt-3 bg-brand-primary-dark rounded-card p-4">
            <View className="flex-row justify-between items-center mb-3">
                <View>
                    <Text className="text-white/70 text-xs mb-0.5 font-inter">Total saved</Text>
                    <Text className="text-white text-2xl font-inter-bold">
                        ₹{totalSaved.toLocaleString('en-IN')}
                    </Text>
                    <Text className="text-white/70 text-xs font-inter">
                        of ₹{totalTarget.toLocaleString('en-IN')} across {goals.length} goal
                        {goals.length !== 1 ? 's' : ''}
                    </Text>
                </View>
                <View className="items-center">
                    <View className="w-14 h-14 rounded-full border-4 border-white/30 items-center justify-center">
                        <Text className="text-white font-inter-bold text-lg">{overallPct}%</Text>
                    </View>
                    {completed > 0 && (
                        <View className="flex-row items-center mt-1">
                            <Star size={11} color="rgba(255,255,255,0.8)" />
                            <Text className="text-white/80 text-xs ml-1 font-inter">
                                {completed} done
                            </Text>
                        </View>
                    )}
                </View>
            </View>

            <BarFill percent={overallPct} trackClassName="bg-white/20" fillClassName="bg-surface-primary" />
        </View>
    );
};

// ─── Main Screen ──────────────────────────────────────────────

export const GoalsScreen: React.FC = () => {
    const dispatch = useAppDispatch();
    const navigation = useNavigation();
    const reduced = useReducedMotion();
    const { items: goals, loading, error } = useAppSelector((state) => state.goals);
    const { user } = useAppSelector((state) => state.auth);
    const userInitial = user?.displayName?.charAt(0).toUpperCase() || 'U';

    const [addModalVisible, setAddModalVisible] = useState(false);
    const [depositModalVisible, setDepositModalVisible] = useState(false);
    const [selectedGoal, setSelectedGoal] = useState<FirestoreGoal | null>(null);

    useEffect(() => {
        dispatch(fetchGoals());
    }, [dispatch]);

    const handleCreateGoal = async (goal: Omit<FirestoreGoal, 'id'>) => {
        // Closing regardless is what made a failed save look like a button
        // that did nothing at all.
        const result = await dispatch(createGoal(goal));
        if (createGoal.fulfilled.match(result)) {
            haptics.commit();
            setAddModalVisible(false);
        }
    };

    const handleDeposit = (goal: FirestoreGoal) => {
        setSelectedGoal(goal);
        setDepositModalVisible(true);
    };

    const handleConfirmDeposit = async (amount: number) => {
        if (!selectedGoal?.id) return;
        const result = await dispatch(depositToGoal({ goalId: selectedGoal.id, amount }));
        if (depositToGoal.fulfilled.match(result)) {
            setDepositModalVisible(false);
            setSelectedGoal(null);
        }
    };

    const handleDelete = async (goalId: string) => {
        await dispatch(removeGoal(goalId));
    };

    return (
        <SafeAreaView className="flex-1 bg-surface-secondary" edges={['top']}>
            {/* Modals */}
            <AddGoalModal
                error={addModalVisible ? error : null}
                visible={addModalVisible}
                onClose={() => setAddModalVisible(false)}
                onSave={handleCreateGoal}
            />
            <DepositModal
                error={depositModalVisible ? error : null}
                visible={depositModalVisible}
                goal={selectedGoal}
                onClose={() => setDepositModalVisible(false)}
                onConfirm={handleConfirmDeposit}
            />

            <ScrollView
                className="flex-1"
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 100 }}
            >
                {/* Header */}
                <View className="px-5 pt-4 pb-2 flex-row justify-between items-center">
                    <View>
                        <Text style={TYPE.title} className="text-text-primary">
                            Savings goals
                        </Text>
                        <Text className="text-sm text-text-secondary font-inter">
                            {goals.length === 0
                                ? 'Nothing set yet'
                                : `${goals.length} goal${goals.length === 1 ? '' : 's'} on the go`}
                        </Text>
                    </View>
                    <View className="flex-row items-center gap-3">
                        {loading && <ActivityIndicator size="small" color={COLORS.brand.primary} />}
                        <PressableScale
                            onPress={() => navigation.navigate('Profile' as never)}
                            activeScale={0.92}
                            accessibilityRole="button"
                            accessibilityLabel="Your profile"
                            className="w-10 h-10 rounded-full bg-brand-primary-dark items-center justify-center"
                        >
                            <Text className="text-white font-inter-bold text-base">{userInitial}</Text>
                        </PressableScale>
                    </View>
                </View>

                {/* A save that did not reach Firestore is worth saying once,
                    quietly. It used to be an Alert telling the user to go and
                    check their Firebase security rules. */}
                {error && (
                    <Animated.View
                        entering={FadeIn.duration(200)}
                        className="mx-5 mt-2 flex-row items-center bg-surface-primary border border-border rounded-xl px-3 py-2.5"
                    >
                        <CloudOff size={14} color={COLORS.text.secondary} />
                        <Text className="text-xs text-text-secondary ml-2 flex-1 leading-4 font-inter">
                            {error}
                        </Text>
                    </Animated.View>
                )}

                {goals.length > 0 && <SummaryBanner goals={goals} />}

                {/* Goals list */}
                <View className="mt-4">
                    {goals.length > 0 ? (
                        goals.map((goal, i) => (
                            <Animated.View
                                key={goal.id}
                                entering={
                                    reduced
                                        ? FadeIn.duration(160)
                                        : FadeInDown.duration(260).delay(i * 55)
                                }
                            >
                                <GoalCard
                                    goal={goal}
                                    onDeposit={handleDeposit}
                                    onDelete={handleDelete}
                                />
                            </Animated.View>
                        ))
                    ) : (
                        <EmptyState
                            icon={<PiggyBank color={COLORS.brand.primary} size={36} />}
                            title="No goals yet"
                            body="Set one savings goal, a trip, an emergency fund, a new phone, and this screen tracks how close you are and what it takes each month."
                            actionLabel="Create your first goal"
                            onAction={() => setAddModalVisible(true)}
                        />
                    )}
                </View>
            </ScrollView>

            {goals.length > 0 && (
                <PressableScale
                    className="absolute bottom-6 right-6 bg-brand-primary-dark w-14 h-14 rounded-full items-center justify-center shadow-lg"
                    onPress={() => setAddModalVisible(true)}
                    activeScale={0.92}
                    accessibilityRole="button"
                    accessibilityLabel="Add a goal"
                >
                    <Plus color="white" size={24} />
                </PressableScale>
            )}
        </SafeAreaView>
    );
};