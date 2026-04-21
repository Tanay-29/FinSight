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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Plus, Trash2, PiggyBank, Target, TrendingUp, CheckCircle, CalendarDays, Star, Zap } from 'lucide-react-native';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import {
    fetchGoals,
    createGoal,
    depositToGoal,
    removeGoal,
} from '../store/slices/goalsSlice';
import { FirestoreGoal } from '../services/firestoreService';
import { differenceInDays, format, parseISO } from 'date-fns';
import { useNavigation } from '@react-navigation/native';

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
        <View className="bg-white border border-border rounded-xl p-4 mx-4 mb-3">
            {/* Header */}
            <View className="flex-row items-center justify-between mb-3">
                <View className="flex-row items-center flex-1">
                    <View
                        className="w-10 h-10 rounded-xl items-center justify-center mr-3"
                        style={{ backgroundColor: `${goal.color}20` }}
                    >
                        <Text className="text-xl">{goal.emoji}</Text>
                    </View>
                    <View className="flex-1">
                        <Text className="text-base font-bold text-text-primary" numberOfLines={1}>
                            {goal.title}
                        </Text>
                        <View className="flex-row items-center">
                            {isComplete ? (
                                <Star size={11} color="#10B981" />
                            ) : (
                                <CalendarDays size={11} color={daysLeft < 7 ? '#DC2626' : '#9CA3AF'} />
                            )}
                            <Text
                                className="text-xs font-medium ml-0.5"
                                style={{ color: daysLeft < 7 && !isComplete ? '#DC2626' : '#9CA3AF' }}
                            >
                                {isComplete ? 'Goal reached!' : deadlineLabel}
                            </Text>
                        </View>
                    </View>
                </View>

                <TouchableOpacity
                    onPress={() =>
                        Alert.alert('Delete Goal', `Remove "${goal.title}"?`, [
                            { text: 'Cancel', style: 'cancel' },
                            {
                                text: 'Delete',
                                style: 'destructive',
                                onPress: () => onDelete(goal.id!),
                            },
                        ])
                    }
                    className="p-2"
                >
                    <Trash2 color="#9CA3AF" size={16} />
                </TouchableOpacity>
            </View>

            {/* Amount row */}
            <View className="flex-row items-baseline mb-3">
                <Text
                    className="text-2xl font-bold"
                    style={{ color: isComplete ? '#10B981' : goal.color }}
                >
                    ₹{goal.savedAmount.toLocaleString('en-IN')}
                </Text>
                <Text className="text-sm text-text-tertiary ml-1">
                    {' '}/ ₹{goal.targetAmount.toLocaleString('en-IN')}
                </Text>
            </View>

            {/* Progress Bar */}
            <View className="h-3 bg-surface-tertiary rounded-full overflow-hidden mb-2">
                <View
                    className="h-full rounded-full"
                    style={{
                        width: `${progress}%`,
                        backgroundColor: isComplete ? '#10B981' : goal.color,
                    }}
                />
            </View>

            {/* Stats row */}
            <View className="flex-row justify-between items-center mb-4">
                <Text className="text-xs text-text-tertiary">
                    {Math.round(progress)}% saved
                </Text>
                {!isComplete && remaining > 0 && (
                    <Text className="text-xs text-text-tertiary">
                        ₹{remaining.toLocaleString('en-IN')} to go
                    </Text>
                )}
            </View>

            {/* Suggestion chip */}
            {!isComplete && monthlySuggestion > 0 && (
                <View className="bg-surface-secondary rounded-xl p-3 mb-3 flex-row items-center">
                    <TrendingUp color="#6366F1" size={14} />
                    <Text className="text-xs text-text-secondary ml-2">
                        Save{' '}
                        <Text className="font-semibold text-brand-primary">
                            ₹{monthlySuggestion.toLocaleString('en-IN')}/mo
                        </Text>{' '}
                        to hit your goal on time
                    </Text>
                </View>
            )}

            {/* Action buttons */}
            {!isComplete ? (
                <View className="flex-row gap-3">
                    {/* Standard Add Money Button */}
                    <TouchableOpacity
                        className="flex-1 py-2.5 rounded-xl border items-center justify-center"
                        style={{ borderColor: goal.color, backgroundColor: `${goal.color}10` }}
                        onPress={() => onDeposit(goal)}
                        activeOpacity={0.8}
                    >
                        <Text style={{ color: goal.color }} className="font-bold text-sm">+ Add Money</Text>
                    </TouchableOpacity>

                    {/* NEW: Accelerate Goal Button */}
                    <TouchableOpacity
                        onPress={() => (navigation as any).navigate('GoalAcceleration', { goalId: goal.id })}
                        className="flex-1 py-2.5 rounded-xl flex-row justify-center items-center shadow-sm"
                        style={{ backgroundColor: goal.color }}
                    >
                        <Text className="text-white font-bold text-sm mr-1">Accelerate</Text>
                        <Zap size={14} color="white" />
                    </TouchableOpacity>
                </View>
            ) : (
                <View className="bg-profit-bg rounded-xl py-2.5 items-center flex-row justify-center">
                    <CheckCircle color="#10B981" size={16} />
                    <Text className="text-profit font-semibold text-sm ml-2">Completed!</Text>
                    <Star size={14} color="#10B981" style={{ marginLeft: 4 }} />
                </View>
            )}
        </View>
    );
};

// ─── Deposit Modal ────────────────────────────────────────────

const DepositModal: React.FC<{
    visible: boolean;
    goal: FirestoreGoal | null;
    onClose: () => void;
    onConfirm: (amount: number) => void;
}> = ({ visible, goal, onClose, onConfirm }) => {
    const [amount, setAmount] = useState('');
    const quickAmounts = [500, 1000, 2000, 5000];

    useEffect(() => {
        if (visible) setAmount('');
    }, [visible]);

    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
            <View className="flex-1 justify-end bg-black/40">
                <View className="bg-white rounded-t-3xl p-6">
                    <Text className="text-xl font-bold text-text-primary mb-1">
                        Add to {goal?.emoji} {goal?.title}
                    </Text>
                    <Text className="text-sm text-text-secondary mb-5">
                        ₹{goal?.savedAmount.toLocaleString('en-IN')} saved of ₹
                        {goal?.targetAmount.toLocaleString('en-IN')}
                    </Text>

                    {/* Quick amounts */}
                    <View className="flex-row gap-2 mb-4">
                        {quickAmounts.map((q) => (
                            <TouchableOpacity
                                key={q}
                                className="flex-1 border border-border rounded-xl py-2 items-center"
                                onPress={() => setAmount(String(q))}
                                style={
                                    amount === String(q)
                                        ? { borderColor: goal?.color, backgroundColor: `${goal?.color}15` }
                                        : {}
                                }
                            >
                                <Text
                                    className="text-xs font-semibold"
                                    style={{ color: amount === String(q) ? goal?.color : '#6B7280' }}
                                >
                                    ₹{q.toLocaleString('en-IN')}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    {/* Custom amount */}
                    <View className="bg-surface-secondary rounded-xl px-4 py-3 mb-6 flex-row items-center">
                        <Text className="text-lg font-bold text-text-primary mr-2">₹</Text>
                        <TextInput
                            className="flex-1 text-lg font-bold text-text-primary"
                            placeholder="Enter amount"
                            placeholderTextColor="#9CA3AF"
                            keyboardType="numeric"
                            value={amount}
                            onChangeText={setAmount}
                        />
                    </View>

                    <View className="flex-row gap-3">
                        <TouchableOpacity
                            className="flex-1 border border-border rounded-xl py-3 items-center"
                            onPress={onClose}
                        >
                            <Text className="text-text-secondary font-semibold">Cancel</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            className="flex-1 rounded-xl py-3 items-center"
                            style={{
                                backgroundColor:
                                    !amount || parseFloat(amount) <= 0
                                        ? '#E5E7EB'
                                        : goal?.color ?? '#6366F1',
                            }}
                            onPress={() => {
                                const val = parseFloat(amount);
                                if (val > 0) onConfirm(val);
                            }}
                            disabled={!amount || parseFloat(amount) <= 0}
                        >
                            <Text className="text-white font-bold">Confirm</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
};

// ─── Add Goal Modal ───────────────────────────────────────────

const GOAL_EMOJIS = ['🏠', '✈️', '🎓', '💍', '🚗', '💻', '🏖️', '🏋️', '📱', '🐶', '🛍️', '🎸'];
const GOAL_COLORS = [
    '#6366F1', '#10B981', '#F59E0B', '#EF4444',
    '#8B5CF6', '#EC4899', '#3B82F6', '#14B8A6',
];

const AddGoalModal: React.FC<{
    visible: boolean;
    onClose: () => void;
    onSave: (goal: Omit<FirestoreGoal, 'id'>) => void;
}> = ({ visible, onClose, onSave }) => {
    const [title, setTitle] = useState('');
    const [target, setTarget] = useState('');
    const [deadline, setDeadline] = useState('');
    const [selectedEmoji, setSelectedEmoji] = useState('🏠');
    const [selectedColor, setSelectedColor] = useState('#6366F1');

    useEffect(() => {
        if (visible) {
            setTitle('');
            setTarget('');
            setDeadline('');
            setSelectedEmoji('🏠');
            setSelectedColor('#6366F1');
        }
    }, [visible]);

    const handleSave = () => {
        const amount = parseFloat(target);
        if (!title.trim() || isNaN(amount) || amount <= 0 || !deadline) {
            Alert.alert('Missing info', 'Please fill in all fields.');
            return;
        }
        // Basic date validation
        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
        if (!dateRegex.test(deadline)) {
            Alert.alert('Invalid date', 'Use format YYYY-MM-DD (e.g. 2026-12-31)');
            return;
        }
        onSave({
            title: title.trim(),
            emoji: selectedEmoji,
            targetAmount: amount,
            savedAmount: 0,
            deadline,
            color: selectedColor,
            createdAt: new Date().toISOString(),
        });
    };

    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
            <View className="flex-1 justify-end bg-black/40">
                <View className="bg-white rounded-t-3xl p-6">
                    <Text className="text-xl font-bold text-text-primary mb-5">
                        New Savings Goal 🎯
                    </Text>

                    {/* Emoji picker */}
                    <Text className="text-xs font-semibold text-text-secondary mb-2 uppercase tracking-wide">
                        Pick an icon
                    </Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-4">
                        <View className="flex-row gap-2">
                            {GOAL_EMOJIS.map((e) => (
                                <TouchableOpacity
                                    key={e}
                                    className={`w-10 h-10 rounded-xl items-center justify-center border-2 ${selectedEmoji === e ? 'border-brand-primary' : 'border-transparent bg-surface-secondary'
                                        }`}
                                    onPress={() => setSelectedEmoji(e)}
                                >
                                    <Text className="text-xl">{e}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </ScrollView>

                    {/* Color picker */}
                    <Text className="text-xs font-semibold text-text-secondary mb-2 uppercase tracking-wide">
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
                        <Text className="text-xs text-text-tertiary mb-1">Goal name</Text>
                        <TextInput
                            className="text-base text-text-primary font-medium"
                            placeholder="e.g. Emergency Fund, Goa Trip"
                            placeholderTextColor="#9CA3AF"
                            value={title}
                            onChangeText={setTitle}
                        />
                    </View>

                    {/* Target amount */}
                    <View className="bg-surface-secondary rounded-xl px-4 py-3 mb-3 flex-row items-center">
                        <Text className="text-text-secondary mr-2">₹</Text>
                        <View className="flex-1">
                            <Text className="text-xs text-text-tertiary mb-1">Target amount</Text>
                            <TextInput
                                className="text-base text-text-primary font-medium"
                                placeholder="50000"
                                placeholderTextColor="#9CA3AF"
                                keyboardType="numeric"
                                value={target}
                                onChangeText={setTarget}
                            />
                        </View>
                    </View>

                    {/* Deadline */}
                    <View className="bg-surface-secondary rounded-xl px-4 py-3 mb-6">
                        <Text className="text-xs text-text-tertiary mb-1">Target date (YYYY-MM-DD)</Text>
                        <TextInput
                            className="text-base text-text-primary font-medium"
                            placeholder="2026-12-31"
                            placeholderTextColor="#9CA3AF"
                            value={deadline}
                            onChangeText={setDeadline}
                            keyboardType="numbers-and-punctuation"
                        />
                    </View>

                    <View className="flex-row gap-3">
                        <TouchableOpacity
                            className="flex-1 border border-border rounded-xl py-3 items-center"
                            onPress={onClose}
                        >
                            <Text className="text-text-secondary font-semibold">Cancel</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            className="flex-1 rounded-xl py-3 items-center"
                            style={{ backgroundColor: selectedColor }}
                            onPress={handleSave}
                            activeOpacity={0.85}
                        >
                            <Text className="text-white font-bold">Create Goal</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
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
        <View className="mx-4 mt-3 bg-brand-primary rounded-2xl p-4">
            <View className="flex-row justify-between items-center mb-3">
                <View>
                    <Text className="text-white/70 text-xs mb-0.5">Total Saved</Text>
                    <Text className="text-white text-2xl font-bold">
                        ₹{totalSaved.toLocaleString('en-IN')}
                    </Text>
                    <Text className="text-white/70 text-xs">
                        of ₹{totalTarget.toLocaleString('en-IN')} across {goals.length} goal
                        {goals.length !== 1 ? 's' : ''}
                    </Text>
                </View>
                <View className="items-center">
                    <View className="w-14 h-14 rounded-full border-4 border-white/30 items-center justify-center">
                        <Text className="text-white font-bold text-lg">{overallPct}%</Text>
                    </View>
                    {completed > 0 && (
                        <View className="flex-row items-center mt-1">
                            <Star size={11} color="rgba(255,255,255,0.8)" />
                            <Text className="text-white/80 text-xs ml-1">
                                {completed} done
                            </Text>
                        </View>
                    )}
                </View>
            </View>

            {/* Overall progress bar */}
            <View className="h-2 bg-white/20 rounded-full overflow-hidden">
                <View
                    className="h-full bg-white rounded-full"
                    style={{ width: `${overallPct}%` }}
                />
            </View>
        </View>
    );
};

// ─── Main Screen ──────────────────────────────────────────────

export const GoalsScreen: React.FC = () => {
    const dispatch = useAppDispatch();
    const navigation = useNavigation();
    const { items: goals, loading, error } = useAppSelector((state) => state.goals);
    const { user } = useAppSelector((state) => state.auth);
    const userInitial = user?.displayName?.charAt(0).toUpperCase() || 'U';

    const [addModalVisible, setAddModalVisible] = useState(false);
    const [depositModalVisible, setDepositModalVisible] = useState(false);
    const [selectedGoal, setSelectedGoal] = useState<FirestoreGoal | null>(null);

    useEffect(() => {
        dispatch(fetchGoals());
    }, [dispatch]);

    useEffect(() => {
        if (error) {
            Alert.alert('Database Error', error + '\n\nPlease check your Firebase Security Rules.');
        }
    }, [error]);

    const handleCreateGoal = async (goal: Omit<FirestoreGoal, 'id'>) => {
        await dispatch(createGoal(goal));
        setAddModalVisible(false);
    };

    const handleDeposit = (goal: FirestoreGoal) => {
        setSelectedGoal(goal);
        setDepositModalVisible(true);
    };

    const handleConfirmDeposit = async (amount: number) => {
        if (!selectedGoal?.id) return;
        await dispatch(depositToGoal({ goalId: selectedGoal.id, amount }));
        setDepositModalVisible(false);
        setSelectedGoal(null);
    };

    const handleDelete = async (goalId: string) => {
        await dispatch(removeGoal(goalId));
    };

    return (
        <SafeAreaView className="flex-1 bg-surface-secondary" edges={['top']}>
            {/* Modals */}
            <AddGoalModal
                visible={addModalVisible}
                onClose={() => setAddModalVisible(false)}
                onSave={handleCreateGoal}
            />
            <DepositModal
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
                <View className="px-4 pt-4 pb-2 flex-row justify-between items-center">
                    <View>
                        <Text className="text-2xl font-bold text-text-primary">
                            Savings Goals
                        </Text>
                        <Text className="text-sm text-text-secondary">
                            Track and grow your financial dreams
                        </Text>
                    </View>
                    <View className="flex-row items-center gap-3">
                        {loading && <ActivityIndicator size="small" color="#6366F1" />}
                        <TouchableOpacity
                            onPress={() => navigation.navigate('Profile' as never)}
                            activeOpacity={0.8}
                            className="w-10 h-10 rounded-full bg-indigo-600 items-center justify-center"
                        >
                            <Text className="text-white font-bold text-base">{userInitial}</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Summary Banner (only if goals exist) */}
                {goals.length > 0 && <SummaryBanner goals={goals} />}

                {/* Goals list */}
                <View className="mt-4">
                    {goals.length > 0 ? (
                        goals.map((goal) => (
                            <GoalCard
                                key={goal.id}
                                goal={goal}
                                onDeposit={handleDeposit}
                                onDelete={handleDelete}
                            />
                        ))
                    ) : (
                        // Empty state
                        <View className="items-center py-16 px-8">
                            <View className="w-20 h-20 rounded-full bg-brand-primary/10 items-center justify-center mb-4">
                                <PiggyBank color="#6366F1" size={36} />
                            </View>
                            <Text className="text-xl font-bold text-text-primary mb-2 text-center">
                                No goals yet
                            </Text>
                            <Text className="text-sm text-text-secondary text-center leading-5 mb-6">
                                Set a savings goal — whether it's a vacation, emergency fund, or
                                new gadget — and track your progress here.
                            </Text>
                            <TouchableOpacity
                                className="bg-brand-primary px-8 py-3 rounded-2xl flex-row items-center"
                                onPress={() => setAddModalVisible(true)}
                                activeOpacity={0.85}
                            >
                                <Plus color="white" size={18} />
                                <Text className="text-white font-bold ml-2">
                                    Create First Goal
                                </Text>
                            </TouchableOpacity>
                        </View>
                    )}
                </View>
            </ScrollView>

            {/* FAB */}
            {goals.length > 0 && (
                <TouchableOpacity
                    className="absolute bottom-6 right-6 bg-brand-primary w-14 h-14 rounded-full items-center justify-center shadow-lg"
                    onPress={() => setAddModalVisible(true)}
                    activeOpacity={0.85}
                >
                    <Plus color="white" size={24} />
                </TouchableOpacity>
            )}
        </SafeAreaView>
    );
};