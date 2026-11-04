/**
 * BubbleRoomScreen: a three-minute market for everyone in the room.
 *
 * The presenter opens this and mirrors the phone to the projector. Everyone
 * else scans the QR code and plays in their browser, no install. They trade
 * one token, HYPE, that pays out 100 at the end; headlines push the crowd,
 * the price climbs far past the value, then falls. At the end every token is
 * cashed out at 100 and the room sees who was left holding.
 *
 * This phone is the exchange: it fills the orders players send and writes
 * the market once a second (see services/bubbleService.ts). The rules are in
 * utils/bubble.ts. No AI anywhere in it; the people are the content.
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeIn, FadeInDown, useReducedMotion } from 'react-native-reanimated';
import { useNavigation } from '@react-navigation/native';
import Svg, { Polyline, Line, Circle } from 'react-native-svg';
import QRCode from 'react-native-qrcode-svg';
import { ArrowLeft, Users, Megaphone, TrendingUp, RotateCcw, Play } from 'lucide-react-native';
import { useAppSelector } from '../store/hooks';
import {
    createRoom, joinUrl, listenRoom, listenPlayers, listenOrders, startRoom, writeTick, RoomDoc, PlayerDoc, OrderDoc,
} from '../services/bubbleService';
import {
    GAME_SECONDS, TOKEN_VALUE, START_WORTH, PlayerState, MarketState, fill, tick, eventAt, finalWorth, summarise,
} from '../utils/bubble';
import { PressableScale } from '../components/PressableScale';
import { inr } from '../utils/moneyMath';
import * as haptics from '../utils/haptics';
import { COLORS, FONTS, TYPE, GUTTER, RADIUS } from '../theme/tokens';

const rs = (n: number) => `₹${inr(n)}`;
const clock = (s: number) => `${Math.floor(Math.max(0, s) / 60)}:${String(Math.max(0, s) % 60).padStart(2, '0')}`;

/** Price over the game, with the token's value drawn as a dashed line. */
const MarketChart: React.FC<{ history: number[]; height?: number }> = ({ history, height = 220 }) => {
    const [width, setWidth] = useState(0);
    const max = Math.max(TOKEN_VALUE * 2, ...history) * 1.1;
    const PAD = 8;
    const x = (i: number) => PAD + (i / GAME_SECONDS) * (width - PAD * 2);
    const y = (v: number) => height - PAD - (v / max) * (height - PAD * 2);
    const pts = history.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
    const last = history[history.length - 1] ?? TOKEN_VALUE;
    const above = last > TOKEN_VALUE * 1.5;
    return (
        <View style={{ height }} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
            {width > 0 ? (
                <Svg width={width} height={height}>
                    <Line x1={PAD} y1={y(TOKEN_VALUE)} x2={width - PAD} y2={y(TOKEN_VALUE)} stroke={COLORS.semantic.profit} strokeWidth={1.5} strokeDasharray={[6, 6]} />
                    {history.length > 1 ? (
                        <Polyline points={pts} fill="none" stroke={above ? COLORS.semantic.loss : COLORS.brand.primary} strokeWidth={3} strokeLinejoin="round" strokeLinecap="round" />
                    ) : null}
                    <Circle cx={x(history.length - 1)} cy={y(last)} r={5} fill={COLORS.surface.primary} stroke={above ? COLORS.semantic.loss : COLORS.brand.primary} strokeWidth={2.5} />
                </Svg>
            ) : null}
            {width > 0 ? (
                <Text style={{ position: 'absolute', right: PAD, top: y(TOKEN_VALUE) + 4, fontFamily: FONTS.bold, fontSize: 11, color: COLORS.semantic.profit }}>
                    Real value {rs(TOKEN_VALUE)}
                </Text>
            ) : null}
        </View>
    );
};

const BubbleRoomScreen: React.FC = () => {
    const navigation = useNavigation<any>();
    const reduced = useReducedMotion();
    const uid = useAppSelector((s) => s.auth.user?.uid);

    const [code, setCode] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [room, setRoom] = useState<RoomDoc | null>(null);
    const [players, setPlayers] = useState<Record<string, PlayerDoc>>({});
    const [trades, setTrades] = useState(0);
    const [now, setNow] = useState(0);

    // The exchange's own state. Refs, because the tick reads and writes them
    // every second and must not wait for a render.
    const market = useRef<MarketState>({ demand: 0, price: TOKEN_VALUE });
    const holdings = useRef<Record<string, PlayerState>>({});
    const history = useRef<number[]>([TOKEN_VALUE]);
    const queue = useRef<{ id: string; order: OrderDoc }[]>([]);
    const seen = useRef<Set<string>>(new Set());
    const tradeCount = useRef(0);
    const ended = useRef(false);

    const open = async () => {
        if (!uid) { setError('Sign in to host a room.'); return; }
        setError(null);
        setCode(null);
        setRoom(null);
        setPlayers({});
        market.current = { demand: 0, price: TOKEN_VALUE };
        holdings.current = {};
        history.current = [TOKEN_VALUE];
        queue.current = [];
        seen.current = new Set();
        tradeCount.current = 0;
        setTrades(0);
        ended.current = false;
        try {
            setCode(await createRoom(uid));
        } catch {
            setError('Could not open a room. Check the connection and that the Firestore rules are deployed.');
        }
    };

    // Open a room on arrival, after the first paint.
    useEffect(() => {
        const t = setTimeout(open, 0);
        return () => clearTimeout(t);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Listen to the room, the players and the orders.
    useEffect(() => {
        if (!code) return;
        const offRoom = listenRoom(code, setRoom);
        const offPlayers = listenPlayers(code, (ps) => {
            for (const [pid, p] of Object.entries(ps)) {
                if (!holdings.current[pid]) {
                    holdings.current[pid] = { cash: p.cash, tokens: p.tokens, buys: p.buys, sells: p.sells, spent: p.spent, earned: p.earned, topBuy: p.topBuy };
                }
            }
            setPlayers(ps);
        });
        const offOrders = listenOrders(code, (fresh) => {
            for (const o of fresh) if (!seen.current.has(o.id)) { seen.current.add(o.id); queue.current.push(o); }
        });
        return () => { offRoom(); offPlayers(); offOrders(); };
    }, [code]);

    // The exchange: once a second while live.
    const live = room?.status === 'live';
    const startedAt = room?.startedAt ?? null;
    useEffect(() => {
        if (!code || !live || !startedAt) return;
        const id = setInterval(() => {
            const t = Math.floor((Date.now() - startedAt) / 1000);
            setNow(t);
            if (ended.current) return;
            market.current = tick(market.current, t);
            const changed: Record<string, PlayerState> = {};
            const orders = queue.current.splice(0);
            for (const { order } of orders) {
                const p = holdings.current[order.pid];
                if (!p) continue;
                const r = fill(market.current, p, order.side);
                if (!r) continue;
                market.current = r.market;
                holdings.current[order.pid] = r.player;
                changed[order.pid] = r.player;
                tradeCount.current += 1;
            }
            setTrades(tradeCount.current);
            history.current = [...history.current, market.current.price].slice(0, GAME_SECONDS + 1);
            const done = t >= GAME_SECONDS;
            if (done) ended.current = true;
            writeTick(code, {
                price: market.current.price,
                demand: market.current.demand,
                history: history.current,
                headline: done ? null : eventAt(t)?.headline ?? null,
                ...(done ? { status: 'ended' as const } : {}),
            }, changed).catch(() => { /* the next tick writes the latest state anyway */ });
            if (done) haptics.celebrate();
        }, 1000);
        return () => clearInterval(id);
    }, [code, live, startedAt]);

    const count = Object.keys(players).length;
    const start = () => {
        if (!code) return;
        haptics.commit();
        startRoom(code, Date.now()).catch(() => setError('Could not start. Check the connection.'));
    };

    // Results read the player documents, which this phone keeps up to date.
    const summary = useMemo(
        () => (room && room.status === 'ended' ? summarise(players, room.history ?? []) : null),
        [room, players],
    );
    const ranked = useMemo(() => Object.entries(players)
        .map(([pid, p]) => ({ pid, name: p.name, worth: finalWorth(p) }))
        .sort((a, b) => b.worth - a.worth), [players]);

    const price = room?.price ?? TOKEN_VALUE;
    const multiple = price / TOKEN_VALUE;

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.surface.secondary }} edges={['top', 'bottom']}>
            <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: GUTTER, paddingTop: 8, paddingBottom: 10 }}>
                <Pressable onPress={() => { haptics.tap(); navigation.goBack(); }} hitSlop={12} accessibilityRole="button" accessibilityLabel="Back"
                    style={{ width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.surface.primary, borderWidth: 1, borderColor: COLORS.border.default }}>
                    <ArrowLeft size={18} color={COLORS.text.primary} />
                </Pressable>
                <Text style={{ ...TYPE.heading, color: COLORS.text.primary, marginLeft: 12, flex: 1 }}>Bubble Room</Text>
                {code ? (
                    <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999, backgroundColor: COLORS.surface.primary, borderWidth: 1, borderColor: COLORS.border.default }}>
                        <Users size={14} color={COLORS.text.secondary} />
                        <Text style={{ ...TYPE.amountSm, fontSize: 13, marginLeft: 5, color: COLORS.text.primary }}>{count}</Text>
                    </View>
                ) : null}
            </View>

            <ScrollView contentContainerStyle={{ paddingHorizontal: GUTTER, paddingBottom: 32 }} showsVerticalScrollIndicator={false}>
                {error ? (
                    <View style={{ padding: 16, borderRadius: RADIUS.card, backgroundColor: COLORS.semantic.lossBg, marginBottom: 12 }}>
                        <Text style={{ ...TYPE.callout, color: COLORS.semantic.alertCritical }}>{error}</Text>
                        <PressableScale onPress={open} accessibilityRole="button" style={{ marginTop: 10 }}>
                            <Text style={{ ...TYPE.callout, fontFamily: FONTS.semibold, color: COLORS.brand.link }}>Try again</Text>
                        </PressableScale>
                    </View>
                ) : null}

                {!code && !error ? (
                    <View style={{ paddingTop: 80, alignItems: 'center' }}>
                        <ActivityIndicator color={COLORS.brand.primary} />
                        <Text style={{ ...TYPE.callout, color: COLORS.text.secondary, marginTop: 12 }}>Opening a room</Text>
                    </View>
                ) : null}

                {/* Lobby: scan to join */}
                {code && room?.status === 'lobby' ? (
                    <Animated.View entering={reduced ? FadeIn.duration(150) : FadeInDown.duration(280)}>
                        <Text style={{ ...TYPE.title, color: COLORS.text.primary }}>Scan to join</Text>
                        <Text style={{ ...TYPE.body, fontSize: 15, lineHeight: 22, color: COLORS.text.secondary, marginTop: 4 }}>
                            Three minutes, one token, play money. Everyone starts with {rs(START_WORTH)}: {rs(800)} in cash and 2 HYPE tokens.
                        </Text>
                        <View style={{ alignItems: 'center', padding: 22, marginTop: 16, borderRadius: RADIUS.card, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: COLORS.border.default }}>
                            <QRCode value={joinUrl(code)} size={220} color="#1A1613" backgroundColor="#FFFFFF" />
                            <Text style={{ fontFamily: FONTS.bold, fontSize: 40, letterSpacing: 8, color: '#1A1613', marginTop: 16 }}>{code}</Text>
                            <Text style={{ fontFamily: FONTS.medium, fontSize: 12, color: '#756C62', marginTop: 2 }}>Room code</Text>
                        </View>
                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 14, minHeight: 32 }}>
                            {count === 0 ? (
                                <Text style={{ ...TYPE.caption, color: COLORS.text.tertiary }}>Waiting for the first player</Text>
                            ) : Object.entries(players).map(([pid, p]) => (
                                <Animated.View key={pid} entering={reduced ? FadeIn.duration(120) : FadeInDown.duration(220)}
                                    style={{ paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, backgroundColor: COLORS.brand.soft }}>
                                    <Text style={{ fontFamily: FONTS.semibold, fontSize: 13, color: COLORS.brand.link }}>{p.name}</Text>
                                </Animated.View>
                            ))}
                        </View>
                        <PressableScale onPress={start} accessibilityRole="button" containerStyle={{ marginTop: 18 }}
                            style={{ height: 56, borderRadius: RADIUS.pill, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.brand.primaryDark }}>
                            <Play size={18} color={COLORS.brand.onAccent} fill={COLORS.brand.onAccent} />
                            <Text style={{ ...TYPE.callout, fontFamily: FONTS.semibold, color: COLORS.brand.onAccent, marginLeft: 8 }}>
                                {count === 0 ? 'Start anyway' : `Open the market for ${count}`}
                            </Text>
                        </PressableScale>
                    </Animated.View>
                ) : null}

                {/* Live: the market, for the projector */}
                {room?.status === 'live' ? (
                    <View>
                        <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' }}>
                            <View>
                                <Text style={{ ...TYPE.micro, color: COLORS.text.tertiary }}>HYPE price</Text>
                                <Text style={{ ...TYPE.display, fontSize: 64, lineHeight: 68, color: multiple >= 1.5 ? COLORS.semantic.alertCritical : COLORS.text.primary }}>{rs(price)}</Text>
                            </View>
                            <View style={{ alignItems: 'flex-end', marginBottom: 8 }}>
                                <Text style={{ ...TYPE.amountMd, color: COLORS.text.primary }}>{clock(GAME_SECONDS - now)}</Text>
                                <Text style={{ ...TYPE.caption, color: COLORS.text.tertiary }}>left</Text>
                            </View>
                        </View>
                        <Text style={{ ...TYPE.callout, color: multiple >= 1.5 ? COLORS.semantic.alertCritical : COLORS.text.secondary, marginTop: 2 }}>
                            {multiple >= 1.05 ? `${multiple.toFixed(1)} times what it is really worth` : multiple <= 0.95 ? 'Below what it is really worth' : 'About what it is really worth'}
                        </Text>

                        <View style={{ marginTop: 14, padding: 12, borderRadius: RADIUS.card, backgroundColor: COLORS.surface.primary, borderWidth: 1, borderColor: COLORS.border.default }}>
                            <MarketChart history={room.history ?? []} />
                        </View>

                        {room.headline ? (
                            <Animated.View key={room.headline} entering={reduced ? FadeIn.duration(150) : FadeInDown.duration(300)}
                                style={{ flexDirection: 'row', alignItems: 'center', marginTop: 12, padding: 14, borderRadius: RADIUS.card, backgroundColor: COLORS.semantic.alertBg }}>
                                <Megaphone size={18} color={COLORS.semantic.alertAmber} />
                                <Text style={{ ...TYPE.callout, color: COLORS.text.primary, marginLeft: 10, flex: 1 }}>{room.headline}</Text>
                            </Animated.View>
                        ) : null}

                        <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
                            {[
                                { label: 'Players', value: String(count) },
                                { label: 'Trades', value: String(trades) },
                                { label: 'Peak so far', value: rs(Math.max(...(room.history ?? [TOKEN_VALUE]))) },
                            ].map((s) => (
                                <View key={s.label} style={{ flex: 1, padding: 12, borderRadius: RADIUS.tile, backgroundColor: COLORS.surface.primary, borderWidth: 1, borderColor: COLORS.border.default }}>
                                    <Text style={{ fontFamily: FONTS.medium, fontSize: 11, color: COLORS.text.tertiary }}>{s.label}</Text>
                                    <Text style={{ ...TYPE.amountMd, color: COLORS.text.primary, marginTop: 2 }}>{s.value}</Text>
                                </View>
                            ))}
                        </View>
                        <Text style={{ ...TYPE.caption, color: COLORS.text.tertiary, marginTop: 10 }}>
                            Traders outside the room follow the headlines too. Join late? Scan the code at {code}.
                        </Text>
                    </View>
                ) : null}

                {/* Ended: the reveal */}
                {room?.status === 'ended' && summary ? (
                    <Animated.View entering={reduced ? FadeIn.duration(150) : FadeInDown.duration(320)}>
                        <Text style={{ ...TYPE.micro, color: COLORS.text.tertiary }}>Market closed</Text>
                        <Text style={{ ...TYPE.title, color: COLORS.text.primary, marginTop: 4 }}>Every token pays out {rs(TOKEN_VALUE)}</Text>
                        <Text style={{ ...TYPE.body, fontSize: 15, lineHeight: 22, color: COLORS.text.secondary, marginTop: 6 }}>
                            It always did. The price peaked at {rs(summary.peak)}, {(summary.peak / TOKEN_VALUE).toFixed(1)} times its value, at {clock(summary.peakAt)}.
                        </Text>

                        <View style={{ marginTop: 14, padding: 12, borderRadius: RADIUS.card, backgroundColor: COLORS.surface.primary, borderWidth: 1, borderColor: COLORS.border.default }}>
                            <MarketChart history={room.history ?? []} height={170} />
                        </View>

                        <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
                            <View style={{ flex: 1, padding: 14, borderRadius: RADIUS.tile, backgroundColor: COLORS.semantic.lossBg }}>
                                <Text style={{ ...TYPE.amountLg, color: COLORS.semantic.alertCritical }}>{summary.belowStart} of {summary.players}</Text>
                                <Text style={{ ...TYPE.caption, color: COLORS.text.secondary, marginTop: 2 }}>ended below {rs(START_WORTH)}. Doing nothing would have beaten them.</Text>
                            </View>
                            <View style={{ flex: 1, padding: 14, borderRadius: RADIUS.tile, backgroundColor: COLORS.semantic.alertBg }}>
                                <Text style={{ ...TYPE.amountLg, color: COLORS.semantic.alertAmber }}>{summary.boughtHigh}</Text>
                                <Text style={{ ...TYPE.caption, color: COLORS.text.secondary, marginTop: 2 }}>paid twice the real value or more</Text>
                            </View>
                        </View>

                        <View style={{ marginTop: 12, borderRadius: RADIUS.card, backgroundColor: COLORS.surface.primary, borderWidth: 1, borderColor: COLORS.border.default, overflow: 'hidden' }}>
                            {ranked.slice(0, 6).map((r, i) => (
                                <View key={r.pid} style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: i < Math.min(6, ranked.length) - 1 ? 1 : 0, borderBottomColor: COLORS.border.default }}>
                                    <Text style={{ ...TYPE.amountSm, width: 26, color: COLORS.text.tertiary }}>{i + 1}</Text>
                                    <Text style={{ ...TYPE.callout, color: COLORS.text.primary, flex: 1 }}>{r.name}</Text>
                                    <Text style={{ ...TYPE.amountSm, color: r.worth >= START_WORTH ? COLORS.semantic.profit : COLORS.semantic.alertCritical }}>{rs(r.worth)}</Text>
                                </View>
                            ))}
                            {ranked.length === 0 ? (
                                <Text style={{ ...TYPE.caption, color: COLORS.text.tertiary, padding: 14 }}>No players this round.</Text>
                            ) : null}
                        </View>

                        <View style={{ marginTop: 12, padding: 16, borderRadius: RADIUS.card, backgroundColor: COLORS.brand.soft, borderWidth: 1, borderColor: COLORS.brand.edge }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                                <TrendingUp size={16} color={COLORS.brand.link} />
                                <Text style={{ ...TYPE.micro, color: COLORS.brand.link, marginLeft: 6 }}>The lesson</Text>
                            </View>
                            <Text style={{ ...TYPE.heading, fontSize: 18, lineHeight: 25, color: COLORS.text.primary }}>
                                Price is what people pay. Value is what it is worth.
                            </Text>
                            <Text style={{ ...TYPE.body, fontSize: 14, lineHeight: 21, color: COLORS.text.secondary, marginTop: 4 }}>
                                Headlines moved the price, not the value. The winners sold to people who bought because the price was rising.
                            </Text>
                        </View>

                        <PressableScale onPress={() => { haptics.tap(); open(); }} accessibilityRole="button" containerStyle={{ marginTop: 16 }}
                            style={{ height: 52, borderRadius: RADIUS.pill, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.brand.primaryDark }}>
                            <RotateCcw size={16} color={COLORS.brand.onAccent} />
                            <Text style={{ ...TYPE.callout, fontFamily: FONTS.semibold, color: COLORS.brand.onAccent, marginLeft: 8 }}>Play again</Text>
                        </PressableScale>
                    </Animated.View>
                ) : null}
            </ScrollView>
        </SafeAreaView>
    );
};

export default BubbleRoomScreen;
