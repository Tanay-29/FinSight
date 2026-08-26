/**
 * StreakWagerCard
 *
 * Stake IQ points that you will study seven days running. Win and the stake
 * doubles; break the streak and it is gone.
 *
 * The points are internal to the app and cannot be bought, so nothing of value
 * is at risk. The commitment is the mechanism: a stake you set yourself is a
 * stronger reason to come back than a notification.
 *
 * Rules live in utils/wager. This component only renders and dispatches.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Coins, Trophy, TrendingDown, Timer } from 'lucide-react-native';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { patchProfile } from '../store/slices/authSlice';
import {
    createWager, resolveWager, daysRemaining, wagerProgress,
    WAGER_STAKES, WAGER_DAYS,
} from '../utils/wager';
import * as haptics from '../utils/haptics';

export const StreakWagerCard: React.FC = () => {
    const dispatch = useAppDispatch();
    const { user, profile } = useAppSelector((s) => s.auth);
    const [opening, setOpening] = useState(false);

    const streak = profile?.streak ?? 0;
    const wager = profile?.streakWager;

    /** Where the stored wager stands as of right now. */
    const resolved = useMemo(
        () => (wager ? resolveWager(wager, streak) : undefined),
        [wager, streak]
    );

    // Persist a settlement the moment it happens, so the outcome is not
    // recomputed differently on a later render.
    useEffect(() => {
        if (!user?.uid || !wager || !resolved) return;
        if (resolved.status === wager.status) return;

        resolved.status === 'won' ? haptics.celebrate() : haptics.warn();
        dispatch(patchProfile({ uid: user.uid, patch: { streakWager: resolved } }));
    }, [dispatch, user?.uid, wager, resolved]);

    const place = (stake: number) => {
        if (!user?.uid) return;
        haptics.commit();
        setOpening(false);
        dispatch(patchProfile({
            uid: user.uid,
            patch: { streakWager: createWager(stake, streak) },
        }));
    };

    const clear = () => {
        if (!user?.uid) return;
        haptics.tap();
        dispatch(patchProfile({ uid: user.uid, patch: { streakWager: undefined } }));
    };

    // ── Settled: show the outcome, offer another go ──────────────
    if (resolved && resolved.status !== 'active') {
        const won = resolved.status === 'won';
        return (
            <View className={`mx-4 mt-4 rounded-2xl border p-4 ${won ? 'bg-emerald-50 border-emerald-100' : 'bg-gray-50 border-gray-200'}`}>
                <View className="flex-row items-center">
                    <View className="w-11 h-11 rounded-2xl bg-white items-center justify-center mr-3">
                        {won ? <Trophy size={20} color="#10B981" /> : <TrendingDown size={20} color="#9CA3AF" />}
                    </View>
                    <View className="flex-1">
                        <Text className={`text-base font-bold ${won ? 'text-emerald-900' : 'text-gray-700'}`}>
                            {won ? `Wager won, +${resolved.stake} IQ` : `Wager lost, -${resolved.stake} IQ`}
                        </Text>
                        <Text className={`text-xs mt-0.5 ${won ? 'text-emerald-700' : 'text-gray-500'}`}>
                            {won
                                ? `You held a ${WAGER_DAYS}-day streak. Doubled.`
                                : 'The streak broke before the seventh day.'}
                        </Text>
                    </View>
                </View>
                <TouchableOpacity
                    onPress={clear}
                    activeOpacity={0.85}
                    accessibilityRole="button"
                    className="mt-3 bg-white border border-gray-200 rounded-xl py-2.5 items-center"
                >
                    <Text className="text-sm font-semibold text-gray-600">Place another</Text>
                </TouchableOpacity>
            </View>
        );
    }

    // ── Active: progress toward the target ───────────────────────
    if (resolved?.status === 'active') {
        const left = daysRemaining(resolved, streak);
        const pct = wagerProgress(resolved, streak);
        return (
            <View className="mx-4 mt-4 bg-white rounded-2xl border border-amber-200 p-4">
                <View className="flex-row items-center mb-3">
                    <View className="w-11 h-11 rounded-2xl bg-amber-50 items-center justify-center mr-3">
                        <Timer size={20} color="#F59E0B" />
                    </View>
                    <View className="flex-1">
                        <Text className="text-base font-bold text-gray-900">
                            {resolved.stake} IQ on the line
                        </Text>
                        <Text className="text-xs text-gray-500 mt-0.5">
                            {left === 0
                                ? 'Finish a module today to collect'
                                : `${left} more day${left === 1 ? '' : 's'} to double it`}
                        </Text>
                    </View>
                </View>
                <View className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <View className="h-full bg-amber-400 rounded-full" style={{ width: `${pct}%` }} />
                </View>
                <Text className="text-xs text-gray-400 mt-1.5">
                    Day {Math.min(streak - resolved.startStreak, WAGER_DAYS)} of {WAGER_DAYS}
                </Text>
            </View>
        );
    }

    // ── Nothing in flight: the pitch ─────────────────────────────
    return (
        <View className="mx-4 mt-4 bg-white rounded-2xl border border-gray-100 p-4">
            <View className="flex-row items-center">
                <View className="w-11 h-11 rounded-2xl bg-amber-50 items-center justify-center mr-3">
                    <Coins size={20} color="#F59E0B" />
                </View>
                <View className="flex-1">
                    <Text className="text-base font-bold text-gray-900">Back yourself</Text>
                    <Text className="text-xs text-gray-500 mt-0.5">
                        Stake IQ points on a {WAGER_DAYS}-day streak. Win and they double.
                    </Text>
                </View>
            </View>

            {opening ? (
                <View className="mt-4">
                    <Text className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">
                        Choose your stake
                    </Text>
                    <View className="flex-row gap-2">
                        {WAGER_STAKES.map((stake) => (
                            <TouchableOpacity
                                key={stake}
                                onPress={() => place(stake)}
                                activeOpacity={0.85}
                                accessibilityRole="button"
                                accessibilityLabel={`Stake ${stake} points`}
                                className="flex-1 bg-amber-50 border border-amber-200 rounded-xl py-3 items-center"
                            >
                                <Text className="text-base font-extrabold text-amber-700">{stake}</Text>
                                <Text className="text-xs text-amber-600 mt-0.5">IQ</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                    <TouchableOpacity
                        onPress={() => { haptics.tap(); setOpening(false); }}
                        accessibilityRole="button"
                        className="mt-3 items-center py-1.5"
                    >
                        <Text className="text-xs text-gray-400">Not now</Text>
                    </TouchableOpacity>
                </View>
            ) : (
                <TouchableOpacity
                    onPress={() => { haptics.tap(); setOpening(true); }}
                    activeOpacity={0.85}
                    accessibilityRole="button"
                    className="mt-3 bg-amber-500 rounded-xl py-2.5 items-center"
                >
                    <Text className="text-sm font-bold text-white">Place a wager</Text>
                </TouchableOpacity>
            )}
        </View>
    );
};

export default StreakWagerCard;
