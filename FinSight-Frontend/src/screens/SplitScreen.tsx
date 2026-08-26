/**
 * SplitScreen
 *
 * Who owes whom after group spends. A private ledger: friends are names the
 * owner typed, not other accounts, and everything lives under the owner's own
 * documents. See utils/split for why it is scoped that way.
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
    View, Text, ScrollView, TouchableOpacity, TextInput,
    StatusBar, Alert, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import {
    ArrowLeft, Plus, UserPlus, Check, Trash2, ArrowRight, Users,
} from 'lucide-react-native';
import { useAppSelector } from '../store/hooks';
import {
    SplitExpense, SplitParticipant, computeBalances, summarise,
    suggestSettlements, ME,
} from '../utils/split';
import {
    loadSplitLedger, saveSplitLedger,
} from '../services/splitService';
import { formatCompactINR } from '../utils/projections';
import Confetti from '../components/Confetti';
import * as haptics from '../utils/haptics';

type Props = NativeStackScreenProps<any, 'Split'>;

const SplitScreen: React.FC<Props> = ({ navigation }) => {
    // Hoisted out of the selector: an optional-chained value in a dependency
    // array defeats the compiler's memoization check.
    const uid = useAppSelector((s) => s.auth.user?.uid);

    const [participants, setParticipants] = useState<SplitParticipant[]>([{ id: ME, name: 'You' }]);
    const [expenses, setExpenses] = useState<SplitExpense[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [celebrating, setCelebrating] = useState(false);

    const [adding, setAdding] = useState(false);
    const [friendName, setFriendName] = useState('');
    const [description, setDescription] = useState('');
    const [amount, setAmount] = useState('');
    const [paidBy, setPaidBy] = useState<string>(ME);
    const [sharedWith, setSharedWith] = useState<string[]>([ME]);

    useEffect(() => {
        if (!uid) return;
        loadSplitLedger(uid)
            .then((ledger) => {
                if (ledger) {
                    setParticipants(ledger.participants);
                    setExpenses(ledger.expenses);
                }
            })
            .catch(() => { /* An empty ledger is a valid starting state. */ })
            .finally(() => setLoading(false));
    }, [uid]);

    const persist = useCallback(
        async (nextParticipants: SplitParticipant[], nextExpenses: SplitExpense[]) => {
            if (!uid) return;
            setSaving(true);
            try {
                await saveSplitLedger(uid, {
                    participants: nextParticipants,
                    expenses: nextExpenses,
                });
            } catch (e: any) {
                Alert.alert('Could not save', e?.message ?? 'Please try again.');
            } finally {
                setSaving(false);
            }
        },
        [uid]
    );

    const balances = useMemo(
        () => computeBalances(expenses, participants),
        [expenses, participants]
    );
    const summary = useMemo(() => summarise(balances), [balances]);
    const settlements = useMemo(() => suggestSettlements(balances), [balances]);

    const addFriend = () => {
        const name = friendName.trim();
        if (!name) return;
        haptics.commit();
        const next = [...participants, { id: `p${Date.now()}`, name }];
        setParticipants(next);
        setFriendName('');
        persist(next, expenses);
    };

    const toggleShared = (id: string) => {
        haptics.select();
        setSharedWith((current) =>
            current.includes(id) ? current.filter((x) => x !== id) : [...current, id]
        );
    };

    const addExpense = () => {
        const value = parseFloat(amount);
        if (!description.trim() || !Number.isFinite(value) || value <= 0 || sharedWith.length === 0) {
            Alert.alert('Incomplete', 'Add a description, an amount above zero, and at least one person sharing it.');
            return;
        }
        haptics.commit();
        const next = [...expenses, {
            id: `e${Date.now()}`,
            description: description.trim(),
            amount: value,
            paidBy,
            sharedWith,
            date: new Date().toISOString(),
        }];
        setExpenses(next);
        setDescription('');
        setAmount('');
        setPaidBy(ME);
        setSharedWith([ME]);
        setAdding(false);
        persist(participants, next);
    };

    const removeExpense = (id: string) => {
        haptics.tap();
        const next = expenses.filter((e) => e.id !== id);
        setExpenses(next);
        persist(participants, next);
        if (computeBalances(next, participants).length === 0 && next.length > 0) {
            haptics.celebrate();
            setCelebrating(true);
        }
    };

    const nameFor = (id: string) =>
        participants.find((p) => p.id === id)?.name ?? 'Someone';

    if (loading) {
        return (
            <SafeAreaView className="flex-1 bg-gray-50 items-center justify-center">
                <ActivityIndicator size="large" color="#6366F1" />
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView className="flex-1 bg-gray-50" edges={['top', 'bottom']}>
            <StatusBar barStyle="dark-content" />

            <View className="px-5 py-3.5 bg-white border-b border-gray-100 flex-row items-center">
                <TouchableOpacity
                    onPress={() => navigation.goBack()}
                    accessibilityRole="button"
                    accessibilityLabel="Go back"
                    className="w-9 h-9 rounded-full bg-gray-100 items-center justify-center mr-3"
                >
                    <ArrowLeft size={18} color="#374151" />
                </TouchableOpacity>
                <View className="flex-1">
                    <Text className="text-base font-extrabold text-gray-900">Split and Settle</Text>
                    <Text className="text-xs text-gray-400">
                        {saving ? 'Saving' : `${participants.length - 1} friend${participants.length === 2 ? '' : 's'}`}
                    </Text>
                </View>
            </View>

            <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
                {/* Summary */}
                <View className="flex-row gap-3 mb-4">
                    <View className="flex-1 bg-emerald-50 rounded-2xl border border-emerald-100 p-4">
                        <Text className="text-xs text-emerald-700">Owed to you</Text>
                        <Text className="text-2xl font-extrabold text-emerald-900 mt-1">
                            {formatCompactINR(summary.owedToYou)}
                        </Text>
                    </View>
                    <View className="flex-1 bg-red-50 rounded-2xl border border-red-100 p-4">
                        <Text className="text-xs text-red-700">You owe</Text>
                        <Text className="text-2xl font-extrabold text-red-900 mt-1">
                            {formatCompactINR(summary.youOwe)}
                        </Text>
                    </View>
                </View>

                {/* Balances */}
                {balances.length > 0 ? (
                    <View className="bg-white rounded-2xl border border-gray-100 overflow-hidden mb-4">
                        <View className="px-4 py-3 border-b border-gray-100">
                            <Text className="text-sm font-bold text-gray-900">Settle up</Text>
                        </View>
                        {settlements.map((s, i) => (
                            <View key={i} className="flex-row items-center px-4 py-3 border-b border-gray-50">
                                <Text className="text-sm font-semibold text-gray-700">{s.from}</Text>
                                <ArrowRight size={14} color="#9CA3AF" style={{ marginHorizontal: 8 }} />
                                <Text className="text-sm font-semibold text-gray-700 flex-1">{s.to}</Text>
                                <Text className="text-sm font-extrabold text-gray-900">
                                    {formatCompactINR(s.amount)}
                                </Text>
                            </View>
                        ))}
                    </View>
                ) : expenses.length > 0 ? (
                    <View className="bg-emerald-50 rounded-2xl border border-emerald-100 p-5 items-center mb-4">
                        <Check size={26} color="#10B981" />
                        <Text className="text-base font-bold text-emerald-900 mt-2">All settled up</Text>
                        <Text className="text-xs text-emerald-700 mt-1 text-center">
                            Nobody owes anybody anything.
                        </Text>
                    </View>
                ) : null}

                {/* Add friend */}
                <View className="bg-white rounded-2xl border border-gray-100 p-4 mb-4">
                    <Text className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">
                        Add a friend
                    </Text>
                    <View className="flex-row items-center">
                        <TextInput
                            value={friendName}
                            onChangeText={setFriendName}
                            placeholder="Their name"
                            placeholderTextColor="#D1D5DB"
                            accessibilityLabel="Friend name"
                            className="flex-1 bg-gray-50 rounded-xl px-3.5 py-3 text-sm text-gray-900"
                        />
                        <TouchableOpacity
                            onPress={addFriend}
                            disabled={!friendName.trim()}
                            accessibilityRole="button"
                            accessibilityLabel="Add friend"
                            className={`ml-2 w-12 h-12 rounded-xl items-center justify-center ${friendName.trim() ? 'bg-indigo-600' : 'bg-gray-200'}`}
                        >
                            <UserPlus size={18} color="white" />
                        </TouchableOpacity>
                    </View>
                    {participants.length > 1 && (
                        <View className="flex-row flex-wrap gap-1.5 mt-3">
                            {participants.filter((p) => p.id !== ME).map((p) => (
                                <View key={p.id} className="bg-gray-100 rounded-full px-3 py-1.5">
                                    <Text className="text-xs font-semibold text-gray-600">{p.name}</Text>
                                </View>
                            ))}
                        </View>
                    )}
                </View>

                {/* Add expense */}
                {adding ? (
                    <View className="bg-white rounded-2xl border border-indigo-200 p-4 mb-4">
                        <TextInput
                            value={description}
                            onChangeText={setDescription}
                            placeholder="What was it for?"
                            placeholderTextColor="#D1D5DB"
                            accessibilityLabel="Description"
                            className="bg-gray-50 rounded-xl px-3.5 py-3 text-sm text-gray-900 mb-2"
                        />
                        <TextInput
                            value={amount}
                            onChangeText={setAmount}
                            placeholder="Total amount"
                            keyboardType="numeric"
                            placeholderTextColor="#D1D5DB"
                            accessibilityLabel="Amount"
                            className="bg-gray-50 rounded-xl px-3.5 py-3 text-sm text-gray-900 mb-3"
                        />

                        <Text className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-1.5">
                            Who paid
                        </Text>
                        <View className="flex-row flex-wrap gap-1.5 mb-3">
                            {participants.map((p) => (
                                <TouchableOpacity
                                    key={p.id}
                                    onPress={() => { haptics.select(); setPaidBy(p.id); }}
                                    accessibilityRole="button"
                                    className={`px-3 py-2 rounded-xl ${paidBy === p.id ? 'bg-indigo-600' : 'bg-gray-100'}`}
                                >
                                    <Text className={`text-xs font-semibold ${paidBy === p.id ? 'text-white' : 'text-gray-600'}`}>
                                        {p.name}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        <Text className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-1.5">
                            Split between
                        </Text>
                        <View className="flex-row flex-wrap gap-1.5 mb-4">
                            {participants.map((p) => {
                                const on = sharedWith.includes(p.id);
                                return (
                                    <TouchableOpacity
                                        key={p.id}
                                        onPress={() => toggleShared(p.id)}
                                        accessibilityRole="button"
                                        className={`px-3 py-2 rounded-xl flex-row items-center ${on ? 'bg-emerald-100' : 'bg-gray-100'}`}
                                    >
                                        {on && <Check size={12} color="#059669" style={{ marginRight: 4 }} />}
                                        <Text className={`text-xs font-semibold ${on ? 'text-emerald-700' : 'text-gray-600'}`}>
                                            {p.name}
                                        </Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>

                        <View className="flex-row gap-2">
                            <TouchableOpacity
                                onPress={() => { haptics.tap(); setAdding(false); }}
                                accessibilityRole="button"
                                className="flex-1 bg-gray-100 rounded-xl py-3 items-center"
                            >
                                <Text className="text-sm font-semibold text-gray-600">Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                onPress={addExpense}
                                accessibilityRole="button"
                                className="flex-1 bg-indigo-600 rounded-xl py-3 items-center"
                            >
                                <Text className="text-sm font-bold text-white">Add</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                ) : (
                    <TouchableOpacity
                        onPress={() => {
                            if (participants.length < 2) {
                                Alert.alert('Add a friend first', 'A split needs at least one other person.');
                                return;
                            }
                            haptics.tap();
                            setAdding(true);
                        }}
                        activeOpacity={0.85}
                        accessibilityRole="button"
                        className="bg-indigo-600 rounded-2xl py-4 flex-row items-center justify-center mb-4"
                    >
                        <Plus size={18} color="white" />
                        <Text className="text-white font-bold text-base ml-2">Add an expense</Text>
                    </TouchableOpacity>
                )}

                {/* History */}
                {expenses.length > 0 ? (
                    <View className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                        <View className="px-4 py-3 border-b border-gray-100">
                            <Text className="text-sm font-bold text-gray-900">Expenses</Text>
                        </View>
                        {[...expenses].reverse().map((e) => (
                            <View key={e.id} className="flex-row items-center px-4 py-3 border-b border-gray-50">
                                <View className="flex-1">
                                    <Text className="text-sm font-semibold text-gray-900">{e.description}</Text>
                                    <Text className="text-xs text-gray-400 mt-0.5">
                                        {nameFor(e.paidBy)} paid, split {e.sharedWith.length} ways
                                    </Text>
                                </View>
                                <Text className="text-sm font-bold text-gray-900 mr-3">
                                    {formatCompactINR(e.amount)}
                                </Text>
                                <TouchableOpacity
                                    onPress={() => removeExpense(e.id)}
                                    accessibilityRole="button"
                                    accessibilityLabel={`Delete ${e.description}`}
                                >
                                    <Trash2 size={15} color="#D1D5DB" />
                                </TouchableOpacity>
                            </View>
                        ))}
                    </View>
                ) : (
                    <View className="bg-white rounded-2xl border border-gray-100 p-6 items-center">
                        <Users size={30} color="#D1D5DB" />
                        <Text className="text-sm text-gray-500 mt-3 text-center leading-5">
                            Add a friend and your first shared expense. FinSight works out who owes
                            what.
                        </Text>
                    </View>
                )}
            </ScrollView>

            <Confetti active={celebrating} onDone={() => setCelebrating(false)} />
        </SafeAreaView>
    );
};

export default SplitScreen;
