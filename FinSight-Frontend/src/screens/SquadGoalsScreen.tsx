/**
 * SquadGoalsScreen
 *
 * A savings goal several people chase together.
 *
 * Two views in one screen: the squads you belong to, and one squad opened. A
 * squad is small and read whole, so a separate detail route would only add a
 * navigation hop and a second loading state for no gain.
 *
 * See utils/squad for the trust model. The short version: aliases and amounts
 * cross between members, nothing else, and amounts are self-reported.
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
    View, Text, ScrollView, TouchableOpacity, TextInput,
    StatusBar, Alert, ActivityIndicator, Share,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import {
    ArrowLeft, Plus, Users, Target, Share2, LogOut, Trash2,
    ChevronRight, Check, Crown, RefreshCw,
} from 'lucide-react-native';
import { useAppSelector } from '../store/hooks';
import {
    Squad, Contribution, computeProgress, rankContributions, validateSquad,
    formatCode, normaliseCode, isValidCode, hasRoom, MAX_MEMBERS,
} from '../utils/squad';
import {
    createSquad, joinSquad, loadMySquads, loadContributions,
    setContribution, leaveSquad, deleteSquad,
} from '../services/squadService';
import { formatCompactINR } from '../utils/projections';
import { AnimatedNumber, formatIndianCurrency } from '../components/AnimatedNumber';
import Confetti from '../components/Confetti';
import * as haptics from '../utils/haptics';

type Props = NativeStackScreenProps<any, 'SquadGoals'>;

/** Default deadline for a new squad: three months out, which suits a term. */
function defaultDeadline(): string {
    const d = new Date();
    d.setMonth(d.getMonth() + 3);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

const SquadGoalsScreen: React.FC<Props> = ({ navigation }) => {
    // Hoisted out of the selector: an optional-chained value in a dependency
    // array defeats the compiler's memoization check.
    const uid = useAppSelector((s) => s.auth.user?.uid);

    const [squads, setSquads] = useState<Squad[]>([]);
    const [open, setOpen] = useState<Squad | null>(null);
    const [contributions, setContributions] = useState<Contribution[]>([]);

    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState(false);
    const [celebrating, setCelebrating] = useState(false);

    const [creating, setCreating] = useState(false);
    const [name, setName] = useState('');
    const [target, setTarget] = useState('');
    const [deadline, setDeadline] = useState(defaultDeadline());
    const [joinCode, setJoinCode] = useState('');
    const [myAmount, setMyAmount] = useState('');

    const refreshSquads = useCallback(async () => {
        if (!uid) return;
        const mine = await loadMySquads(uid);
        setSquads(mine);
    }, [uid]);

    useEffect(() => {
        refreshSquads()
            .catch(() => { /* No squads yet is a valid starting state. */ })
            .finally(() => setLoading(false));
    }, [refreshSquads]);

    const openSquad = useCallback(async (squad: Squad) => {
        haptics.tap();
        setOpen(squad);
        setBusy(true);
        try {
            const rows = await loadContributions(squad.code);
            setContributions(rows);
            setMyAmount(String(rows.find((r) => r.uid === uid)?.amount ?? ''));
        } catch (e: any) {
            Alert.alert('Could not load the squad', e?.message ?? 'Please try again.');
        } finally {
            setBusy(false);
        }
    }, [uid]);

    const progress = useMemo(
        () => (open ? computeProgress(open, contributions) : null),
        [open, contributions]
    );
    const ranked = useMemo(
        () => rankContributions(contributions, uid),
        [contributions, uid]
    );

    // ── Actions ──────────────────────────────────────────────

    const handleCreate = async () => {
        if (!uid) return;
        const amount = parseFloat(target);
        const problem = validateSquad(name, amount, deadline);
        if (problem) {
            haptics.warn();
            Alert.alert('Check the details', problem);
            return;
        }

        haptics.commit();
        setBusy(true);
        try {
            const squad = await createSquad(uid, name, amount, deadline);
            setSquads((current) => [...current, squad]);
            setCreating(false);
            setName('');
            setTarget('');
            setDeadline(defaultDeadline());
            await openSquad(squad);
        } catch (e: any) {
            Alert.alert('Could not create the squad', e?.message ?? 'Please try again.');
        } finally {
            setBusy(false);
        }
    };

    const handleJoin = async () => {
        if (!uid) return;
        if (!isValidCode(joinCode)) {
            haptics.warn();
            Alert.alert('Check the code', 'An invite code is 8 characters, like ABCD-2346.');
            return;
        }

        haptics.commit();
        setBusy(true);
        try {
            const squad = await joinSquad(uid, joinCode);
            setSquads((current) => [...current.filter((s) => s.code !== squad.code), squad]);
            setJoinCode('');
            await openSquad(squad);
        } catch {
            // Every rejection arrives as the same permission error: a wrong
            // code, a full squad and an already-joined squad are
            // indistinguishable from here by design, so say all three.
            haptics.error();
            Alert.alert(
                'Could not join',
                'Check the code is right, and that the squad has room and you are not already in it.'
            );
        } finally {
            setBusy(false);
        }
    };

    const handleSaveContribution = async () => {
        if (!uid || !open) return;
        const amount = parseFloat(myAmount);
        if (!Number.isFinite(amount) || amount < 0) {
            haptics.warn();
            Alert.alert('Check the amount', 'Enter what you have saved so far, as a number.');
            return;
        }

        haptics.commit();
        setBusy(true);
        try {
            await setContribution(open.code, uid, amount);
            const rows = await loadContributions(open.code);
            setContributions(rows);

            // Celebrate only on the crossing, not on every save after it.
            const before = computeProgress(open, contributions);
            const after = computeProgress(open, rows);
            if (after.reached && !before.reached) {
                haptics.celebrate();
                setCelebrating(true);
            }
        } catch (e: any) {
            Alert.alert('Could not save', e?.message ?? 'Please try again.');
        } finally {
            setBusy(false);
        }
    };

    const handleShareCode = async () => {
        if (!open) return;
        haptics.tap();
        try {
            await Share.share({
                message: `Join my savings squad "${open.name}" on FinSight. Invite code: ${formatCode(open.code)}`,
            });
        } catch { /* Dismissing the share sheet is not an error. */ }
    };

    const handleLeave = () => {
        if (!uid || !open) return;
        Alert.alert(
            'Leave this squad?',
            'Your contribution will be removed from the total. You can rejoin later with the code.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Leave',
                    style: 'destructive',
                    onPress: async () => {
                        setBusy(true);
                        try {
                            await leaveSquad(open.code, uid);
                            setSquads((current) => current.filter((s) => s.code !== open.code));
                            setOpen(null);
                        } catch (e: any) {
                            Alert.alert('Could not leave', e?.message ?? 'Please try again.');
                        } finally {
                            setBusy(false);
                        }
                    },
                },
            ]
        );
    };

    const handleDelete = () => {
        if (!open) return;
        Alert.alert(
            'Delete this squad?',
            'This removes it for everyone in it, including their contributions. It cannot be undone.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        setBusy(true);
                        try {
                            await deleteSquad(open.code);
                            setSquads((current) => current.filter((s) => s.code !== open.code));
                            setOpen(null);
                        } catch (e: any) {
                            Alert.alert('Could not delete', e?.message ?? 'Please try again.');
                        } finally {
                            setBusy(false);
                        }
                    },
                },
            ]
        );
    };

    // ── Render ───────────────────────────────────────────────

    if (loading) {
        return (
            <SafeAreaView className="flex-1 bg-gray-50 items-center justify-center">
                <ActivityIndicator size="large" color="#6366F1" />
            </SafeAreaView>
        );
    }

    const isOwner = !!open && open.ownerUid === uid;

    return (
        <SafeAreaView className="flex-1 bg-gray-50" edges={['top', 'bottom']}>
            <StatusBar barStyle="dark-content" />

            <View className="px-5 py-3.5 bg-white border-b border-gray-100 flex-row items-center">
                <TouchableOpacity
                    onPress={() => {
                        haptics.tap();
                        if (open) { setOpen(null); refreshSquads().catch(() => { }); }
                        else navigation.goBack();
                    }}
                    accessibilityRole="button"
                    accessibilityLabel={open ? 'Back to squads' : 'Go back'}
                    className="w-9 h-9 rounded-full bg-gray-100 items-center justify-center mr-3"
                >
                    <ArrowLeft size={18} color="#374151" />
                </TouchableOpacity>
                <View className="flex-1">
                    <Text className="text-base font-extrabold text-gray-900" numberOfLines={1}>
                        {open ? open.name : 'Squad Goals'}
                    </Text>
                    <Text className="text-xs text-gray-400">
                        {busy
                            ? 'Working'
                            : open
                                ? `${open.memberUids.length} of ${MAX_MEMBERS} members`
                                : `${squads.length} squad${squads.length === 1 ? '' : 's'}`}
                    </Text>
                </View>
                {open && (
                    <TouchableOpacity
                        onPress={handleShareCode}
                        accessibilityRole="button"
                        accessibilityLabel="Share invite code"
                        className="w-9 h-9 rounded-full bg-indigo-50 items-center justify-center"
                    >
                        <Share2 size={16} color="#6366F1" />
                    </TouchableOpacity>
                )}
            </View>

            <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
                {open && progress ? (
                    <>
                        {/* ── Progress ──────────────────────────── */}
                        <View className="bg-white rounded-2xl border border-gray-100 p-5 mb-4">
                            <View className="flex-row items-end justify-between mb-1">
                                <AnimatedNumber
                                    value={progress.total}
                                    format={formatIndianCurrency}
                                    className="text-3xl font-extrabold text-gray-900"
                                />
                                <Text className="text-sm text-gray-400 mb-1">
                                    of {formatCompactINR(open.targetAmount)}
                                </Text>
                            </View>

                            <View className="h-2.5 bg-gray-100 rounded-full overflow-hidden mt-3">
                                <View
                                    className={`h-full rounded-full ${progress.reached ? 'bg-emerald-500' : 'bg-indigo-500'}`}
                                    style={{ width: `${progress.percentage}%` }}
                                />
                            </View>

                            <View className="flex-row items-center justify-between mt-3">
                                <Text className="text-xs font-semibold text-gray-500">
                                    {progress.percentage}% there
                                </Text>
                                <Text className="text-xs text-gray-400">
                                    {progress.daysLeft > 0
                                        ? `${progress.daysLeft} day${progress.daysLeft === 1 ? '' : 's'} left`
                                        : 'Deadline passed'}
                                </Text>
                            </View>

                            {progress.reached ? (
                                <View className="flex-row items-center bg-emerald-50 rounded-xl px-3.5 py-3 mt-4">
                                    <Check size={16} color="#10B981" />
                                    <Text className="text-sm font-bold text-emerald-900 ml-2">
                                        Target reached. Well done.
                                    </Text>
                                </View>
                            ) : progress.perDayNeeded !== null ? (
                                <View className="bg-indigo-50 rounded-xl px-3.5 py-3 mt-4">
                                    <Text className="text-xs text-indigo-700">
                                        {formatCompactINR(progress.perDayNeeded)} a day between you
                                        to land on time.
                                    </Text>
                                </View>
                            ) : (
                                <View className="bg-amber-50 rounded-xl px-3.5 py-3 mt-4">
                                    <Text className="text-xs text-amber-800">
                                        {formatCompactINR(progress.remaining)} short and the
                                        deadline has gone. Set a new squad when you are ready.
                                    </Text>
                                </View>
                            )}
                        </View>

                        {/* ── Your contribution ─────────────────── */}
                        <View className="bg-white rounded-2xl border border-gray-100 p-4 mb-4">
                            <Text className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">
                                What you have put in
                            </Text>
                            <View className="flex-row items-center">
                                <TextInput
                                    value={myAmount}
                                    onChangeText={setMyAmount}
                                    placeholder="0"
                                    placeholderTextColor="#D1D5DB"
                                    keyboardType="numeric"
                                    accessibilityLabel="Your contribution"
                                    className="flex-1 bg-gray-50 rounded-xl px-3.5 py-3 text-sm text-gray-900"
                                />
                                <TouchableOpacity
                                    onPress={handleSaveContribution}
                                    disabled={busy}
                                    accessibilityRole="button"
                                    accessibilityLabel="Save contribution"
                                    className={`ml-2 w-12 h-12 rounded-xl items-center justify-center ${busy ? 'bg-gray-200' : 'bg-indigo-600'}`}
                                >
                                    <Check size={18} color="white" />
                                </TouchableOpacity>
                            </View>
                            <Text className="text-xs text-gray-400 mt-2">
                                This is the running total you have saved, not an amount to add.
                                Nobody can see your balance, only this figure.
                            </Text>
                        </View>

                        {/* ── Members ───────────────────────────── */}
                        <View className="bg-white rounded-2xl border border-gray-100 overflow-hidden mb-4">
                            <View className="px-4 py-3 border-b border-gray-100 flex-row items-center">
                                <Users size={14} color="#6B7280" />
                                <Text className="text-sm font-bold text-gray-900 ml-2">Who is in</Text>
                            </View>

                            {ranked.length === 0 ? (
                                <View className="px-4 py-6 items-center">
                                    <Text className="text-xs text-gray-400 text-center">
                                        Nobody has logged anything yet. Be the first.
                                    </Text>
                                </View>
                            ) : (
                                ranked.map((row) => (
                                    <View
                                        key={row.uid}
                                        className={`flex-row items-center px-4 py-3 border-b border-gray-50 ${row.isYou ? 'bg-indigo-50' : ''}`}
                                    >
                                        <Text className="text-xs font-bold text-gray-400 w-6">
                                            {row.rank}
                                        </Text>
                                        <View className="flex-1">
                                            <View className="flex-row items-center">
                                                <Text className="text-sm font-semibold text-gray-800">
                                                    {row.isYou ? 'You' : row.alias}
                                                </Text>
                                                {row.uid === open.ownerUid && (
                                                    <Crown size={12} color="#F59E0B" style={{ marginLeft: 6 }} />
                                                )}
                                            </View>
                                            <Text className="text-xs text-gray-400 mt-0.5">
                                                {row.share}% of the pot
                                            </Text>
                                        </View>
                                        <Text className="text-sm font-extrabold text-gray-900">
                                            {formatCompactINR(row.amount)}
                                        </Text>
                                    </View>
                                ))
                            )}
                        </View>

                        {/* ── Invite ────────────────────────────── */}
                        <View className="bg-white rounded-2xl border border-gray-100 p-4 mb-4">
                            <Text className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">
                                Invite code
                            </Text>
                            <TouchableOpacity
                                onPress={handleShareCode}
                                accessibilityRole="button"
                                accessibilityLabel={`Invite code ${formatCode(open.code)}, tap to share`}
                                className="flex-row items-center justify-between bg-gray-50 rounded-xl px-4 py-3.5"
                            >
                                <Text className="text-lg font-extrabold text-gray-900 tracking-widest">
                                    {formatCode(open.code)}
                                </Text>
                                <Share2 size={16} color="#6366F1" />
                            </TouchableOpacity>
                            <Text className="text-xs text-gray-400 mt-2">
                                {hasRoom(open)
                                    ? `Room for ${MAX_MEMBERS - open.memberUids.length} more.`
                                    : 'This squad is full.'}
                            </Text>
                        </View>

                        {/* ── Leave or delete ───────────────────── */}
                        <TouchableOpacity
                            onPress={isOwner ? handleDelete : handleLeave}
                            disabled={busy}
                            accessibilityRole="button"
                            accessibilityLabel={isOwner ? 'Delete squad' : 'Leave squad'}
                            className="flex-row items-center justify-center bg-white border border-red-100 rounded-2xl py-3.5"
                        >
                            {isOwner
                                ? <Trash2 size={16} color="#EF4444" />
                                : <LogOut size={16} color="#EF4444" />}
                            <Text className="text-sm font-bold text-red-500 ml-2">
                                {isOwner ? 'Delete squad' : 'Leave squad'}
                            </Text>
                        </TouchableOpacity>
                        {isOwner && (
                            <Text className="text-xs text-gray-400 text-center mt-2">
                                You started this squad, so you cannot leave it. Deleting removes
                                it for everyone.
                            </Text>
                        )}
                    </>
                ) : (
                    <>
                        {/* ── My squads ─────────────────────────── */}
                        {squads.length > 0 && (
                            <View className="bg-white rounded-2xl border border-gray-100 overflow-hidden mb-4">
                                {squads.map((squad) => (
                                    <TouchableOpacity
                                        key={squad.code}
                                        onPress={() => openSquad(squad)}
                                        accessibilityRole="button"
                                        accessibilityLabel={`Open ${squad.name}`}
                                        className="flex-row items-center px-4 py-3.5 border-b border-gray-50"
                                    >
                                        <View className="w-9 h-9 rounded-full bg-indigo-50 items-center justify-center mr-3">
                                            <Target size={16} color="#6366F1" />
                                        </View>
                                        <View className="flex-1">
                                            <Text className="text-sm font-bold text-gray-900" numberOfLines={1}>
                                                {squad.name}
                                            </Text>
                                            <Text className="text-xs text-gray-400 mt-0.5">
                                                {formatCompactINR(squad.targetAmount)} target,{' '}
                                                {squad.memberUids.length} member
                                                {squad.memberUids.length === 1 ? '' : 's'}
                                            </Text>
                                        </View>
                                        <ChevronRight size={16} color="#D1D5DB" />
                                    </TouchableOpacity>
                                ))}
                            </View>
                        )}

                        {squads.length === 0 && !creating && (
                            <View className="bg-white rounded-2xl border border-gray-100 p-6 items-center mb-4">
                                <Users size={28} color="#D1D5DB" />
                                <Text className="text-base font-bold text-gray-900 mt-2">
                                    No squads yet
                                </Text>
                                <Text className="text-xs text-gray-400 mt-1 text-center">
                                    Save towards something with friends. Start one and share the
                                    code, or join with a code someone sent you.
                                </Text>
                            </View>
                        )}

                        {/* ── Create ────────────────────────────── */}
                        {creating ? (
                            <View className="bg-white rounded-2xl border border-indigo-200 p-4 mb-4">
                                <TextInput
                                    value={name}
                                    onChangeText={setName}
                                    placeholder="What are you saving for?"
                                    placeholderTextColor="#D1D5DB"
                                    accessibilityLabel="Squad name"
                                    className="bg-gray-50 rounded-xl px-3.5 py-3 text-sm text-gray-900 mb-2"
                                />
                                <TextInput
                                    value={target}
                                    onChangeText={setTarget}
                                    placeholder="Target amount"
                                    placeholderTextColor="#D1D5DB"
                                    keyboardType="numeric"
                                    accessibilityLabel="Target amount"
                                    className="bg-gray-50 rounded-xl px-3.5 py-3 text-sm text-gray-900 mb-2"
                                />
                                <TextInput
                                    value={deadline}
                                    onChangeText={setDeadline}
                                    placeholder="YYYY-MM-DD"
                                    placeholderTextColor="#D1D5DB"
                                    accessibilityLabel="Deadline"
                                    className="bg-gray-50 rounded-xl px-3.5 py-3 text-sm text-gray-900 mb-3"
                                />
                                <View className="flex-row gap-2">
                                    <TouchableOpacity
                                        onPress={() => { haptics.tap(); setCreating(false); }}
                                        accessibilityRole="button"
                                        accessibilityLabel="Cancel"
                                        className="flex-1 bg-gray-100 rounded-xl py-3 items-center"
                                    >
                                        <Text className="text-sm font-bold text-gray-600">Cancel</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        onPress={handleCreate}
                                        disabled={busy}
                                        accessibilityRole="button"
                                        accessibilityLabel="Create squad"
                                        className={`flex-1 rounded-xl py-3 items-center ${busy ? 'bg-gray-200' : 'bg-indigo-600'}`}
                                    >
                                        <Text className="text-sm font-bold text-white">Create</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        ) : (
                            <TouchableOpacity
                                onPress={() => { haptics.tap(); setCreating(true); }}
                                accessibilityRole="button"
                                accessibilityLabel="Start a squad"
                                className="flex-row items-center justify-center bg-indigo-600 rounded-2xl py-3.5 mb-4"
                            >
                                <Plus size={18} color="white" />
                                <Text className="text-sm font-bold text-white ml-2">Start a squad</Text>
                            </TouchableOpacity>
                        )}

                        {/* ── Join ──────────────────────────────── */}
                        <View className="bg-white rounded-2xl border border-gray-100 p-4">
                            <Text className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">
                                Join with a code
                            </Text>
                            <View className="flex-row items-center">
                                <TextInput
                                    value={joinCode}
                                    onChangeText={(text) => setJoinCode(normaliseCode(text))}
                                    placeholder="ABCD2346"
                                    placeholderTextColor="#D1D5DB"
                                    autoCapitalize="characters"
                                    autoCorrect={false}
                                    maxLength={8}
                                    accessibilityLabel="Invite code"
                                    className="flex-1 bg-gray-50 rounded-xl px-3.5 py-3 text-sm text-gray-900 tracking-widest"
                                />
                                <TouchableOpacity
                                    onPress={handleJoin}
                                    disabled={busy || !joinCode}
                                    accessibilityRole="button"
                                    accessibilityLabel="Join squad"
                                    className={`ml-2 w-12 h-12 rounded-xl items-center justify-center ${busy || !joinCode ? 'bg-gray-200' : 'bg-indigo-600'}`}
                                >
                                    <RefreshCw size={18} color="white" />
                                </TouchableOpacity>
                            </View>
                        </View>
                    </>
                )}
            </ScrollView>

            <Confetti active={celebrating} onDone={() => setCelebrating(false)} />
        </SafeAreaView>
    );
};

export default SquadGoalsScreen;
