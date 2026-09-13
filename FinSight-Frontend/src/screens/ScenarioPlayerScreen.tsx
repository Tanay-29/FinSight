/**
 * ScenarioPlayerScreen
 *
 * Plays a life sim: one month per screen. The top strip is the running
 * position (cash, debt, invested, credit health, peace of mind); under it the
 * month's ledger, the situation, and two to four choices. Choosing reveals
 * the outcome and the exact effect, then Continue opens the next month.
 *
 * All arithmetic is utils/scenario.ts. This file only lays it out.
 */
import React, { useMemo, useState } from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import Animated, { FadeIn, FadeInDown, SlideInRight, useReducedMotion } from 'react-native-reanimated';
import { X, ChevronRight, Wallet, TrendingUp, CreditCard, Heart, Landmark, Lock } from 'lucide-react-native';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { completeModule } from '../store/slices/learningSlice';
import { findScenario, SCENARIOS } from '../data/scenarios';
import type { Option, Scene } from '../data/scenarios/schema';
import {
    initialState, openMonth, applyEffect, sceneVisible, visibleOptions, optionAvailable, scorecard,
    SimState, MonthLedger,
} from '../utils/scenario';
import { inr } from '../utils/moneyMath';
import { PressableScale } from '../components/PressableScale';
import { Confetti } from '../components/Confetti';
import * as haptics from '../utils/haptics';
import { COLORS, FONTS, TYPE, GUTTER } from '../theme/tokens';

const TAG_COLOR = {
    wise: () => COLORS.semantic.profit,
    ok: () => COLORS.semantic.alertAmber,
    costly: () => COLORS.semantic.alertCritical,
} as const;

const TAG_LABEL = { wise: 'Wise', ok: 'Fair', costly: 'Costly' } as const;

interface Played { scene: Scene; option: Option; ledger: MonthLedger }

const ScenarioPlayerScreen: React.FC = () => {
    const navigation = useNavigation<any>();
    const { params } = useRoute<any>() as { params: { scenarioId: string } };
    const dispatch = useAppDispatch();
    const reduced = useReducedMotion();
    const user = useAppSelector((s) => s.auth.user);

    const scenario = useMemo(() => findScenario(params.scenarioId), [params.scenarioId]);

    // Engine state. `opened` is the state after this month's salary and
    // costs, before the decision; `state` is the committed state.
    const [state, setState] = useState<SimState>(() => (scenario ? initialState(scenario) : (null as unknown as SimState)));
    const [sceneIndex, setSceneIndex] = useState(() => (scenario ? firstVisible(scenario.scenes, 0, initialState(scenario)) : -1));
    const [opened, setOpened] = useState<{ state: SimState; ledger: MonthLedger } | null>(() => {
        if (!scenario) return null;
        return openMonth(scenario, initialState(scenario));
    });
    const [picked, setPicked] = useState<number | null>(null);
    const [played, setPlayed] = useState<Played[]>([]);
    const [done, setDone] = useState(false);
    const [celebrating, setCelebrating] = useState(false);

    if (!scenario || !opened) {
        return (
            <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.surface.secondary, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ ...TYPE.heading, color: COLORS.text.primary }}>That story is not here</Text>
            </SafeAreaView>
        );
    }

    const scene = sceneIndex >= 0 ? scenario.scenes[sceneIndex] : undefined;
    const current = opened.state;
    const options = scene ? visibleOptions(scene, current) : [];
    const afterPick = picked !== null && scene ? applyEffect(current, options[picked].effect) : null;

    const choose = (i: number) => {
        if (picked !== null) return;
        const o = options[i];
        if (o.tag === 'costly') haptics.warn(); else haptics.success();
        setPicked(i);
    };

    const next = () => {
        if (picked === null || !scene || !afterPick) return;
        haptics.tap();
        const record: Played = { scene, option: options[picked], ledger: opened.ledger };
        const newPlayed = [...played, record];
        setPlayed(newPlayed);
        setState(afterPick);
        const nextIndex = firstVisible(scenario.scenes, sceneIndex + 1, afterPick);
        if (nextIndex === -1) {
            setDone(true);
            haptics.celebrate();
            setCelebrating(true);
            if (user?.uid) {
                dispatch(completeModule({ userId: user.uid, pathId: 'lifeSims', moduleId: scenario.id, totalModules: SCENARIOS.length }));
            }
            return;
        }
        setSceneIndex(nextIndex);
        setOpened(openMonth(scenario, afterPick));
        setPicked(null);
    };

    const shown = afterPick ?? current;
    const monthsTotal = 12;

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.surface.secondary }} edges={['top', 'bottom']}>
            <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: GUTTER, paddingTop: 8, paddingBottom: 10 }}>
                <Pressable onPress={() => { haptics.tap(); navigation.goBack(); }} accessibilityRole="button" accessibilityLabel="Close" hitSlop={12}
                    style={{ width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.surface.primary, borderWidth: 1, borderColor: COLORS.border.default }}>
                    <X size={18} color={COLORS.text.secondary} />
                </Pressable>
                <View style={{ flex: 1, marginLeft: 14 }}>
                    <Text style={{ ...TYPE.caption, color: COLORS.text.primary }}>{scenario.title}</Text>
                    <Text style={{ fontFamily: FONTS.regular, fontSize: 11, color: COLORS.text.tertiary }}>
                        {done ? 'Year complete' : `Month ${shown.month} of ${monthsTotal}`}
                    </Text>
                </View>
            </View>

            {/* Position strip */}
            <View style={{ flexDirection: 'row', paddingHorizontal: GUTTER, gap: 8, marginBottom: 10 }}>
                <Stat icon={<Wallet size={13} color={shown.cash < 0 ? COLORS.semantic.alertCritical : COLORS.text.secondary} />} label="Cash" value={inr(shown.cash)} tone={shown.cash < 0 ? 'bad' : 'neutral'} />
                <Stat icon={<Landmark size={13} color={COLORS.text.secondary} />} label="Owed" value={inr(shown.debt)} tone={shown.debt > 0 ? 'bad' : 'neutral'} />
                <Stat icon={<TrendingUp size={13} color={COLORS.text.secondary} />} label="Invested" value={inr(shown.invested)} tone={shown.invested > 0 ? 'good' : 'neutral'} />
            </View>
            <View style={{ flexDirection: 'row', paddingHorizontal: GUTTER, gap: 8, marginBottom: 6 }}>
                <Meter icon={<CreditCard size={12} color={COLORS.text.tertiary} />} label="Credit health" value={shown.credit} />
                <Meter icon={<Heart size={12} color={COLORS.text.tertiary} />} label="Peace of mind" value={shown.peace} />
            </View>

            {!done && scene ? (
                <>
                    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: GUTTER, paddingTop: 8, paddingBottom: 24 }} showsVerticalScrollIndicator={false}>
                        <Animated.View key={scene.id} entering={reduced ? FadeIn.duration(160) : SlideInRight.duration(260)}>
                            {/* Ledger */}
                            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
                                <Chip text={`Salary +${inr(opened.ledger.income)}`} tone="good" />
                                <Chip text={`Living costs ${inr(-opened.ledger.fixed)}`} />
                                {opened.ledger.commitments !== 0 ? <Chip text={`Commitments ${inr(-opened.ledger.commitments)}`} tone={opened.ledger.commitments > 0 ? 'bad' : 'good'} /> : null}
                                {opened.ledger.invested > 0 ? <Chip text={`SIP ${inr(-opened.ledger.invested)}`} tone="good" /> : null}
                                {opened.ledger.interest > 0 ? <Chip text={`Interest ${inr(opened.ledger.interest)}`} tone="bad" /> : null}
                            </View>
                            {current.cash < 0 ? (
                                <View style={{ padding: 12, borderRadius: 12, backgroundColor: COLORS.semantic.lossBg, marginBottom: 14 }}>
                                    <Text style={{ ...TYPE.caption, color: COLORS.semantic.alertCritical }}>
                                        You are short by {inr(-current.cash)} this month. The costs went out anyway.
                                    </Text>
                                </View>
                            ) : null}

                            <Text style={{ ...TYPE.title, color: COLORS.text.primary, marginBottom: 10 }}>{scene.title}</Text>
                            <Text style={{ ...TYPE.body, fontSize: 17, lineHeight: 26, color: COLORS.text.primary, marginBottom: 18 }}>{scene.body}</Text>

                            {options.map((o, i) => {
                                const avail = optionAvailable(o, current);
                                const isPicked = picked === i;
                                const dim = picked !== null && !isPicked;
                                const tagColor = TAG_COLOR[o.tag]();
                                return (
                                    <PressableScale
                                        key={i}
                                        disabled={picked !== null || !avail.ok}
                                        onPress={() => choose(i)}
                                        activeScale={0.985}
                                        accessibilityRole="button"
                                        accessibilityState={{ disabled: !avail.ok }}
                                        style={{
                                            borderWidth: isPicked ? 2 : 1,
                                            borderColor: isPicked ? tagColor : COLORS.border.default,
                                            backgroundColor: !avail.ok ? COLORS.surface.tertiary : COLORS.surface.primary,
                                            borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14, marginBottom: 10,
                                            opacity: dim ? 0.5 : 1,
                                        }}
                                    >
                                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                            {!avail.ok ? <Lock size={14} color={COLORS.text.tertiary} style={{ marginRight: 8 }} /> : null}
                                            <Text style={{ ...TYPE.body, fontSize: 15, lineHeight: 21, color: avail.ok ? COLORS.text.primary : COLORS.text.tertiary, flex: 1 }}>{o.label}</Text>
                                        </View>
                                        {!avail.ok ? (
                                            <Text style={{ fontFamily: FONTS.medium, fontSize: 12, color: COLORS.text.tertiary, marginTop: 4 }}>{avail.reason}</Text>
                                        ) : null}
                                    </PressableScale>
                                );
                            })}

                            {picked !== null && afterPick ? (
                                <Animated.View entering={reduced ? FadeIn.duration(160) : FadeInDown.duration(240)}
                                    style={{ marginTop: 6, padding: 16, borderRadius: 14, backgroundColor: COLORS.surface.primary, borderWidth: 1, borderColor: TAG_COLOR[options[picked].tag]() }}>
                                    <Text style={{ ...TYPE.micro, color: TAG_COLOR[options[picked].tag](), marginBottom: 6 }}>{TAG_LABEL[options[picked].tag]}</Text>
                                    <Text style={{ ...TYPE.body, fontSize: 15, lineHeight: 22, color: COLORS.text.primary }}>{options[picked].outcome}</Text>
                                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 12 }}>
                                        {effectChips(current, afterPick, options[picked]).map((c) => <Chip key={c.text} text={c.text} tone={c.tone} />)}
                                    </View>
                                </Animated.View>
                            ) : null}
                        </Animated.View>
                    </ScrollView>

                    <View style={{ paddingHorizontal: GUTTER, paddingVertical: 8 }}>
                        <PressableScale onPress={next} disabled={picked === null} accessibilityRole="button"
                            style={{ height: 52, borderRadius: 26, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: picked !== null ? COLORS.brand.primaryDark : COLORS.surface.tertiary }}>
                            <Text style={{ ...TYPE.callout, fontFamily: FONTS.bold, color: picked !== null ? COLORS.brand.onAccent : COLORS.text.tertiary, marginRight: 6 }}>Next month</Text>
                            <ChevronRight size={18} color={picked !== null ? COLORS.brand.onAccent : COLORS.text.tertiary} />
                        </PressableScale>
                    </View>
                </>
            ) : (
                <ScrollView contentContainerStyle={{ paddingHorizontal: GUTTER, paddingTop: 12, paddingBottom: 32 }} showsVerticalScrollIndicator={false}>
                    <Animated.View entering={reduced ? FadeIn.duration(160) : FadeInDown.duration(300)}>
                        <Scorecard state={state} played={played} />
                        <PressableScale onPress={() => { haptics.tap(); navigation.goBack(); }} accessibilityRole="button"
                            style={{ height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.brand.primaryDark, marginTop: 20 }}>
                            <Text style={{ ...TYPE.callout, fontFamily: FONTS.bold, color: COLORS.brand.onAccent }}>Done</Text>
                        </PressableScale>
                    </Animated.View>
                </ScrollView>
            )}
            <Confetti active={celebrating} onDone={() => setCelebrating(false)} />
        </SafeAreaView>
    );
};

function firstVisible(scenes: Scene[], from: number, state: SimState): number {
    for (let i = from; i < scenes.length; i++) if (sceneVisible(scenes[i], state)) return i;
    return -1;
}

function effectChips(before: SimState, after: SimState, o: Option): { text: string; tone?: 'good' | 'bad' }[] {
    const out: { text: string; tone?: 'good' | 'bad' }[] = [];
    const dCash = after.cash - before.cash;
    const dDebt = after.debt - before.debt;
    const dInv = after.invested - before.invested;
    const dCr = after.credit - before.credit;
    const dPc = after.peace - before.peace;
    if (dCash !== 0) out.push({ text: `Cash ${dCash > 0 ? '+' : ''}${inr(dCash)}`, tone: dCash > 0 ? 'good' : 'bad' });
    if (dDebt !== 0) out.push({ text: `Owed ${dDebt > 0 ? '+' : ''}${inr(dDebt)}`, tone: dDebt > 0 ? 'bad' : 'good' });
    if (dInv !== 0) out.push({ text: `Invested +${inr(dInv)}`, tone: 'good' });
    if (o.effect.monthly) out.push({ text: `${o.effect.monthly.amount > 0 ? '-' : '+'}${inr(Math.abs(o.effect.monthly.amount))} a month`, tone: o.effect.monthly.amount > 0 ? 'bad' : 'good' });
    if (o.effect.invest) out.push({ text: `SIP +${inr(o.effect.invest)} a month`, tone: 'good' });
    if (dCr !== 0) out.push({ text: `Credit ${dCr > 0 ? '+' : ''}${dCr}`, tone: dCr > 0 ? 'good' : 'bad' });
    if (dPc !== 0) out.push({ text: `Peace ${dPc > 0 ? '+' : ''}${dPc}`, tone: dPc > 0 ? 'good' : 'bad' });
    return out;
}

const Chip: React.FC<{ text: string; tone?: 'good' | 'bad' }> = ({ text, tone }) => (
    <View style={{
        paddingHorizontal: 9, paddingVertical: 4, borderRadius: 6,
        backgroundColor: tone === 'good' ? COLORS.semantic.profitBg : tone === 'bad' ? COLORS.semantic.lossBg : COLORS.surface.tertiary,
    }}>
        <Text style={{ fontFamily: FONTS.semibold, fontSize: 12, fontVariant: ['tabular-nums'], color: tone === 'good' ? COLORS.semantic.profit : tone === 'bad' ? COLORS.semantic.alertCritical : COLORS.text.secondary }}>
            {text}
        </Text>
    </View>
);

const Stat: React.FC<{ icon: React.ReactNode; label: string; value: string; tone: 'neutral' | 'good' | 'bad' }> = ({ icon, label, value, tone }) => (
    <View style={{ flex: 1, padding: 10, borderRadius: 12, backgroundColor: COLORS.surface.primary, borderWidth: 1, borderColor: COLORS.border.default }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 2 }}>
            {icon}
            <Text style={{ fontFamily: FONTS.medium, fontSize: 11, color: COLORS.text.tertiary, marginLeft: 4 }}>{label}</Text>
        </View>
        <Text numberOfLines={1} style={{ ...TYPE.amountSm, color: tone === 'good' ? COLORS.semantic.profit : tone === 'bad' ? COLORS.semantic.alertCritical : COLORS.text.primary }}>{value}</Text>
    </View>
);

const Meter: React.FC<{ icon: React.ReactNode; label: string; value: number }> = ({ icon, label, value }) => {
    const color = value >= 70 ? COLORS.semantic.profit : value >= 45 ? COLORS.semantic.alertAmber : COLORS.semantic.alertCritical;
    return (
        <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 3 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    {icon}
                    <Text style={{ fontFamily: FONTS.medium, fontSize: 11, color: COLORS.text.tertiary, marginLeft: 4 }}>{label}</Text>
                </View>
                <Text style={{ fontFamily: FONTS.semibold, fontSize: 11, color }}>{value}</Text>
            </View>
            <View style={{ height: 5, borderRadius: 3, backgroundColor: COLORS.surface.tertiary, overflow: 'hidden' }}>
                <View style={{ width: `${value}%`, height: 5, backgroundColor: color }} />
            </View>
        </View>
    );
};

const Scorecard: React.FC<{ state: SimState; played: Played[] }> = ({ state, played }) => {
    const card = scorecard(state, played.map((p) => p.option.tag));
    return (
        <View>
            <Text style={{ ...TYPE.micro, color: COLORS.text.tertiary, marginBottom: 6 }}>After twelve months</Text>
            <Text style={{ ...TYPE.display, fontSize: 36, lineHeight: 40, color: card.netWorth >= 0 ? COLORS.text.primary : COLORS.semantic.alertCritical }}>
                {card.netWorth < 0 ? '-' : ''}{inr(Math.abs(card.netWorth))}
            </Text>
            <Text style={{ ...TYPE.caption, color: COLORS.text.secondary, marginBottom: 12 }}>cash and investments, minus what is owed</Text>
            <Text style={{ ...TYPE.body, color: COLORS.text.primary, marginBottom: 16 }}>{card.verdict}</Text>

            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
                <Tile label="Credit health" value={card.creditLabel} />
                <Tile label="Peace of mind" value={card.peaceLabel} />
            </View>
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 20 }}>
                <Tile label="Wise" value={String(card.wise)} color={COLORS.semantic.profit} />
                <Tile label="Fair" value={String(card.ok)} color={COLORS.semantic.alertAmber} />
                <Tile label="Costly" value={String(card.costly)} color={COLORS.semantic.alertCritical} />
            </View>

            <Text style={{ ...TYPE.caption, color: COLORS.text.secondary, marginBottom: 8 }}>Your year</Text>
            <View style={{ borderRadius: 14, borderWidth: 1, borderColor: COLORS.border.default, backgroundColor: COLORS.surface.primary, overflow: 'hidden' }}>
                {played.map((p, i) => (
                    <View key={p.scene.id} style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: i < played.length - 1 ? 1 : 0, borderBottomColor: COLORS.border.default }}>
                        <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: TAG_COLOR[p.option.tag](), marginRight: 10 }} />
                        <View style={{ flex: 1 }}>
                            <Text style={{ ...TYPE.caption, color: COLORS.text.primary }}>{p.scene.title}</Text>
                            <Text numberOfLines={1} style={{ fontFamily: FONTS.regular, fontSize: 12, color: COLORS.text.tertiary }}>{p.option.label}</Text>
                        </View>
                    </View>
                ))}
            </View>
        </View>
    );
};

const Tile: React.FC<{ label: string; value: string; color?: string }> = ({ label, value, color }) => (
    <View style={{ flex: 1, padding: 12, borderRadius: 12, backgroundColor: COLORS.surface.primary, borderWidth: 1, borderColor: COLORS.border.default }}>
        <Text style={{ fontFamily: FONTS.medium, fontSize: 11, color: COLORS.text.tertiary }}>{label}</Text>
        <Text style={{ ...TYPE.callout, fontFamily: FONTS.bold, color: color ?? COLORS.text.primary, marginTop: 2 }}>{value}</Text>
    </View>
);

export default ScenarioPlayerScreen;
