/**
 * LeagueScreen
 *
 * Weekly leaderboard ranked on IQ points gained, not IQ held. A learner who
 * started this week at zero can top the board; someone coasting on a high
 * score cannot. Ranking students by how much money they have would be both
 * useless as a teaching signal and unkind, which is why this ranks movement.
 *
 * Everyone appears under a generated alias. See utils/league for what is
 * published and what is not.
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
    View, Text, ScrollView, TouchableOpacity, RefreshControl, StatusBar, Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ArrowLeft, Trophy, Info, Users, Timer } from 'lucide-react-native';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { patchProfile } from '../store/slices/authSlice';
import { fetchLeague, publishGain } from '../services/leagueService';
import {
    aliasForUid, rankEntries, weekKey, weekStart, daysUntilReset,
    LeagueEntry, RankedEntry,
} from '../utils/league';
import { Skeleton } from '../components/Skeleton';
import * as haptics from '../utils/haptics';

type Props = NativeStackScreenProps<any, 'League'>;

const LeagueScreen: React.FC<Props> = ({ navigation }) => {
    const dispatch = useAppDispatch();
    const { user, profile } = useAppSelector((s) => s.auth);
    const score = useAppSelector((s) => s.iq.score);

    const [entries, setEntries] = useState<LeagueEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const week = weekKey();
    const optedIn = profile?.leagueOptIn === true;

    /**
     * Gain since Monday. The baseline is stamped once a week; until it is,
     * treat the current score as the baseline so nobody starts with a
     * fabricated lead.
     */
    const gain = useMemo(() => {
        const baseline = profile?.leagueBaselineWeek === week
            ? profile?.leagueBaselineScore ?? score
            : score;
        return Math.max(0, score - baseline);
    }, [profile?.leagueBaselineWeek, profile?.leagueBaselineScore, score, week]);

    const load = useCallback(async () => {
        setError(null);
        try {
            setEntries(await fetchLeague(week));
        } catch (e: any) {
            setError(e?.message ?? 'Could not load the league.');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [week]);

    // Stamp this week's baseline the first time the screen opens in a new week.
    useEffect(() => {
        if (!user?.uid || !optedIn) return;
        if (profile?.leagueBaselineWeek === week) return;
        dispatch(patchProfile({
            uid: user.uid,
            patch: { leagueBaselineWeek: week, leagueBaselineScore: score },
        }));
    }, [dispatch, user?.uid, optedIn, profile?.leagueBaselineWeek, week, score]);

    // Publish only while opted in.
    useEffect(() => {
        if (!user?.uid || !optedIn) return;
        publishGain(user.uid, gain, week).catch(() => {
            // A failed publish only costs this user their row; the board still
            // renders, so there is nothing useful to show them here.
        });
    }, [user?.uid, optedIn, gain, week]);

    useEffect(() => { load(); }, [load]);

    const ranked: RankedEntry[] = useMemo(
        () => rankEntries(entries, user?.uid),
        [entries, user?.uid]
    );
    const you = ranked.find((e) => e.isYou);

    const toggleOptIn = (value: boolean) => {
        if (!user?.uid) return;
        haptics.select();
        dispatch(patchProfile({
            uid: user.uid,
            patch: {
                leagueOptIn: value,
                ...(value ? { leagueBaselineWeek: week, leagueBaselineScore: score } : {}),
            },
        }));
    };

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
                    <Text className="text-base font-extrabold text-gray-900">Improvement League</Text>
                    <Text className="text-xs text-gray-400">Week of {weekStart()}</Text>
                </View>
            </View>

            <ScrollView
                contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />
                }
            >
                {/* Opt-in gate. Nothing is published until this is on. */}
                <View className="bg-white rounded-2xl border border-gray-100 p-4 mb-4">
                    <View className="flex-row items-center">
                        <View className="w-11 h-11 rounded-2xl bg-indigo-50 items-center justify-center mr-3">
                            <Users size={20} color="#6366F1" />
                        </View>
                        <View className="flex-1">
                            <Text className="text-base font-bold text-gray-900">Join the league</Text>
                            <Text className="text-xs text-gray-500 mt-0.5">
                                Publishes an alias and your weekly points gained
                            </Text>
                        </View>
                        <Switch
                            value={optedIn}
                            onValueChange={toggleOptIn}
                            trackColor={{ false: '#E5E7EB', true: '#818CF8' }}
                            thumbColor={optedIn ? '#6366F1' : '#9CA3AF'}
                        />
                    </View>
                    {optedIn && (
                        <Text className="text-xs text-gray-400 mt-3">
                            You appear as {aliasForUid(user?.uid ?? '')}. Your name, email, balances
                            and transactions are never published.
                        </Text>
                    )}
                </View>

                {!optedIn ? (
                    <View className="bg-white rounded-2xl border border-gray-100 p-6 items-center">
                        <Trophy size={32} color="#D1D5DB" />
                        <Text className="text-base font-bold text-gray-900 mt-3 text-center">
                            You are not in this week's league
                        </Text>
                        <Text className="text-sm text-gray-500 mt-2 text-center leading-5">
                            Turn it on above to compete. Rankings are by points gained this week,
                            so starting today costs you nothing.
                        </Text>
                    </View>
                ) : (
                    <>
                        {/* Your standing */}
                        <View className="bg-indigo-600 rounded-2xl p-4 mb-4">
                            <View className="flex-row items-center justify-between">
                                <View>
                                    <Text className="text-xs text-indigo-200">Your position</Text>
                                    <Text className="text-3xl font-extrabold text-white mt-0.5">
                                        {you ? `#${you.rank}` : 'Unranked'}
                                    </Text>
                                </View>
                                <View className="items-end">
                                    <Text className="text-xs text-indigo-200">Gained this week</Text>
                                    <Text className="text-3xl font-extrabold text-white mt-0.5">+{gain}</Text>
                                </View>
                            </View>
                            <View className="flex-row items-center mt-3 pt-3 border-t border-indigo-500">
                                <Timer size={13} color="#C7D2FE" />
                                <Text className="text-xs text-indigo-200 ml-1.5">
                                    Resets in {daysUntilReset()} day{daysUntilReset() === 1 ? '' : 's'}
                                </Text>
                            </View>
                        </View>

                        {/* Board */}
                        {loading ? (
                            <View className="bg-white rounded-2xl border border-gray-100 p-4">
                                {[0, 1, 2, 3, 4].map((i) => (
                                    <View key={i} className="flex-row items-center py-2.5">
                                        <Skeleton width={28} height={28} radius={14} />
                                        <View style={{ flex: 1, marginLeft: 12 }}>
                                            <Skeleton width="50%" height={13} />
                                        </View>
                                        <Skeleton width={40} height={14} />
                                    </View>
                                ))}
                            </View>
                        ) : error ? (
                            <View className="bg-white rounded-2xl border border-gray-100 p-6 items-center">
                                <Text className="text-sm text-gray-500 text-center">{error}</Text>
                                <TouchableOpacity
                                    onPress={load}
                                    accessibilityRole="button"
                                    className="mt-3 bg-gray-100 rounded-xl px-5 py-2.5"
                                >
                                    <Text className="text-sm font-semibold text-gray-700">Try again</Text>
                                </TouchableOpacity>
                            </View>
                        ) : ranked.length === 0 ? (
                            <View className="bg-white rounded-2xl border border-gray-100 p-6 items-center">
                                <Trophy size={30} color="#D1D5DB" />
                                <Text className="text-sm text-gray-500 mt-3 text-center leading-5">
                                    Nobody has scored yet this week. Finish a module and you will be
                                    first on the board.
                                </Text>
                            </View>
                        ) : (
                            <View className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                                {ranked.map((entry, i) => (
                                    <View
                                        key={entry.uid}
                                        className={`flex-row items-center px-4 py-3 ${i < ranked.length - 1 ? 'border-b border-gray-50' : ''} ${entry.isYou ? 'bg-indigo-50' : ''}`}
                                    >
                                        <View
                                            className="w-8 h-8 rounded-full items-center justify-center"
                                            style={{
                                                backgroundColor:
                                                    entry.rank === 1 ? '#FEF3C7'
                                                        : entry.rank === 2 ? '#F3F4F6'
                                                            : entry.rank === 3 ? '#FFEDD5'
                                                                : 'transparent',
                                            }}
                                        >
                                            <Text
                                                className="text-xs font-extrabold"
                                                style={{
                                                    color:
                                                        entry.rank === 1 ? '#B45309'
                                                            : entry.rank === 2 ? '#6B7280'
                                                                : entry.rank === 3 ? '#C2410C'
                                                                    : '#9CA3AF',
                                                }}
                                            >
                                                {entry.rank}
                                            </Text>
                                        </View>
                                        <Text
                                            className={`flex-1 text-sm ml-3 ${entry.isYou ? 'font-extrabold text-indigo-700' : 'font-medium text-gray-700'}`}
                                        >
                                            {entry.alias}{entry.isYou ? ' (you)' : ''}
                                        </Text>
                                        <Text className="text-sm font-bold text-gray-900">+{entry.gain}</Text>
                                    </View>
                                ))}
                            </View>
                        )}

                        <View className="flex-row bg-gray-100 rounded-2xl p-3.5 mt-4">
                            <Info size={14} color="#9CA3AF" style={{ marginTop: 2 }} />
                            <Text className="text-xs text-gray-500 leading-5 ml-2 flex-1">
                                Scores are reported by each person's own app, so the board is a
                                friendly comparison rather than a verified ranking. Making it
                                tamper-proof would need a server recomputing every score.
                            </Text>
                        </View>
                    </>
                )}
            </ScrollView>
        </SafeAreaView>
    );
};

export default LeagueScreen;
