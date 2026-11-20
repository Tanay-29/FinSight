/**
 * IntroScreen: the first thing a new person sees, before signing in.
 *
 * A short story in four scenes, with Fini as the guide, where each scene asks
 * for one tap and answers it on screen:
 *
 *   1. The street. Allowance day; the coins drift off to the chai stall, the
 *      food scooter and the metro. "Find where it went" brings them back as
 *      labelled amounts. That is tracking.
 *   2. The classroom. One real question on the chalkboard. Answering writes
 *      the result in chalk. That is learning.
 *   3. The shop window. A phone on "no-cost" EMI; "Look closer" flips the
 *      price tag to what it really costs. That is the calculators.
 *   4. Fini waves, and Get started opens sign-in.
 *
 * The art is drawn as layers (IntroArt) that slide at different speeds; the
 * pieces that move are laid over it and animate on the UI thread. The art
 * fills whatever height is left above the text panel and crops from the top
 * on short phones, so the buttons are always on screen. With Reduce Motion
 * the scenes crossfade and the moving pieces go straight to where they end.
 */
import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, LayoutChangeEvent, useWindowDimensions } from 'react-native';
import Animated, {
    Easing,
    FadeIn,
    interpolate,
    useAnimatedStyle,
    useReducedMotion,
    useSharedValue,
    withDelay,
    withSequence,
    withSpring,
    withTiming,
    type SharedValue,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { PressableScale } from '../components/PressableScale';
import { Pressable } from '../components/Pressable';
import { ART_H, ART_W, CoinArt, FiniArt, SceneLayer, type Layer } from '../components/intro/IntroArt';
import { COLORS, FACE, FONTS, GUTTER, TYPE } from '../theme/tokens';
import * as haptics from '../utils/haptics';

interface IntroScreenProps {
    onDone: () => void;
}

const SLIDE = { duration: 650, easing: Easing.bezier(0.32, 0.72, 0, 1) };
const MOVE = { duration: 900, easing: Easing.bezier(0.45, 0, 0.2, 1) };
const POP = { damping: 12, stiffness: 180, mass: 0.7 };

/** Where the art sits inside its box: the scale and the offset of the crop. */
interface Frame { s: number; ox: number; oy: number; w: number }

const frameFor = (w: number, h: number): Frame => {
    const s = Math.max(w / ART_W, h / ART_H);
    return { s, ox: (w - ART_W * s) / 2, oy: h - ART_H * s, w };
};

/** A box placed in art coordinates. */
const at = (f: Frame, x: number, y: number, w?: number, h?: number) => ({
    position: 'absolute' as const,
    left: f.ox + x * f.s,
    top: f.oy + y * f.s,
    ...(w !== undefined ? { width: w * f.s } : null),
    ...(h !== undefined ? { height: h * f.s } : null),
});

// ─── Copy ────────────────────────────────────────────────────

const COPY = [
    {
        before: { kicker: 'DAY 1 OF THE MONTH', title: 'Your allowance lands.', body: "By day 20 it's gone, and you can't say where.", action: 'Find where it went' },
        after: { kicker: 'DAY 20', title: 'Now you can see it.', body: 'Paste a bank SMS and each spend sorts itself.', action: 'Continue' },
    },
    {
        before: { kicker: '3 MINUTES A DAY', title: 'Learn the money basics.', body: 'One question at a time. Fini explains the rest.', action: '' },
        after: { kicker: 'NICE', title: 'Interest earns interest.', body: 'That extra ₹10 is how savings grow.', action: 'Continue' },
    },
    {
        before: { kicker: 'BEFORE YOU BUY', title: 'See the real price.', body: '"No-cost" EMI often isn\'t. Take a closer look.', action: 'Look closer' },
        after: { kicker: 'NOW YOU KNOW', title: '₹2,921 more than it says.', body: 'Fini checks the maths on any purchase or loan.', action: 'Continue' },
    },
    {
        before: { kicker: 'WELCOME TO FINSIGHT', title: 'Learn it. Track it. Check it.', body: 'Fini will be with you every day.', action: 'Get started' },
        after: { kicker: 'WELCOME TO FINSIGHT', title: 'Learn it. Track it. Check it.', body: 'Fini will be with you every day.', action: 'Get started' },
    },
];

// ─── Scene frame and parallax ────────────────────────────────

/**
 * One scene, sliding with the page. The background moves with the page; the
 * middle and front layers travel a little further, so they arrive just after
 * it and leave just before it.
 */
const Scene: React.FC<{
    index: number;
    page: SharedValue<number>;
    width: number;
    height: number;
    reduced: boolean;
    children?: React.ReactNode;
}> = ({ index, page, width, height, reduced, children }) => {
    const box = useAnimatedStyle(() => {
        const d = index - page.get();
        return reduced
            ? { opacity: Math.max(0, 1 - Math.abs(d)) }
            : { transform: [{ translateX: d * width }] };
    });
    const depth = (k: number) => () => {
        'worklet';
        return { transform: [{ translateX: reduced ? 0 : (index - page.get()) * width * k }] };
    };
    const mid = useAnimatedStyle(depth(0.25));
    const near = useAnimatedStyle(depth(0.5));
    const layers: [Layer, object | null][] = [['far', null], ['mid', mid], ['near', near]];

    return (
        <Animated.View pointerEvents="none" style={[{ position: 'absolute', left: 0, top: 0, width, height, overflow: 'hidden' }, box]}>
            {layers.map(([layer, style]) => (
                <Animated.View key={layer} style={[{ position: 'absolute', left: 0, top: 0, width, height }, style]}>
                    <SceneLayer scene={index} layer={layer} width={width} height={height} />
                </Animated.View>
            ))}
            <Animated.View style={[{ position: 'absolute', left: 0, top: 0, width, height }, near]}>{children}</Animated.View>
        </Animated.View>
    );
};

// ─── Scene 1: the street ─────────────────────────────────────

const PLACES = [[50, 206], [141, 214], [233, 206]];

const Coin: React.FC<{ i: number; f: Frame; found: SharedValue<number>; reduced: boolean }> = ({ i, f, found, reduced }) => {
    const t = useSharedValue(0);
    useEffect(() => {
        // The coins leave the wallet once, when the story opens.
        t.set(reduced ? 1 : withDelay(300 + i * 140, withTiming(1, MOVE)));
    }, [i, reduced, t]);
    const [px, py] = PLACES[i % 3];
    const dx = px - 142 + (i % 2 ? 6 : -6);
    const dy = py - 300 + (i > 5 ? -12 : 0);
    const style = useAnimatedStyle(() => ({
        opacity: (1 - found.get()) * interpolate(t.get(), [0, 0.15], [0, 1], 'clamp'),
        transform: [{ translateX: dx * f.s * t.get() }, { translateY: dy * f.s * t.get() }],
    }));
    return (
        <Animated.View style={[at(f, 134, 300), style]}>
            <CoinArt size={16 * f.s} />
        </Animated.View>
    );
};

/** Width of a street label, in art units. */
const LABEL_W = 84;

const Label: React.FC<{ text: string; x: number; y: number; i: number; f: Frame; found: SharedValue<number> }> = ({ text, x, y, i, f, found }) => {
    // On a tall phone the art is cropped at the sides, so a label is kept
    // inside the part that is actually on screen.
    const left = Math.max(0, -f.ox / f.s) + 6;
    const right = Math.min(ART_W, (f.w - f.ox) / f.s) - 6;
    const cx = Math.min(Math.max(x, left + LABEL_W / 2), right - LABEL_W / 2);
    const style = useAnimatedStyle(() => {
        const p = interpolate(found.get(), [0.2 + i * 0.15, 0.6 + i * 0.15], [0, 1], 'clamp');
        return { opacity: p, transform: [{ scale: 0.6 + 0.4 * p }] };
    });
    return (
        <Animated.View style={[at(f, cx - LABEL_W / 2, y - 12, LABEL_W, 22), { borderRadius: 11 * f.s, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' }, style]}>
            <Text allowFontScaling={false} numberOfLines={1} adjustsFontSizeToFit style={{ ...FACE.semibold, fontSize: 11 * f.s, color: '#1A1613' }}>{text}</Text>
        </Animated.View>
    );
};

const StreetActors: React.FC<{ f: Frame; found: SharedValue<number>; reduced: boolean }> = ({ f, found, reduced }) => {
    const fini = useAnimatedStyle(() => ({
        transform: [
            { translateX: interpolate(found.get(), [0, 1], [-80, 0]) * f.s },
            { translateY: interpolate(found.get(), [0, 1], [-10, 0]) * f.s },
        ],
    }));
    return (
        <>
            {Array.from({ length: 9 }, (_, i) => <Coin key={i} i={i} f={f} found={found} reduced={reduced} />)}
            <Label text="Chai ₹600" x={50} y={160} i={0} f={f} found={found} />
            <Label text="Food ₹2,400" x={141} y={180} i={1} f={f} found={found} />
            <Label text="Travel ₹1,100" x={233} y={160} i={2} f={f} found={found} />
            <Animated.View style={[at(f, 20, 50), fini]}><FiniArt size={54 * f.s} /></Animated.View>
        </>
    );
};

// ─── Scene 2: the classroom ──────────────────────────────────

const ClassroomActors: React.FC<{ f: Frame; answered: SharedValue<number>; cheer: SharedValue<number> }> = ({ f, answered, cheer }) => {
    const chalk = useAnimatedStyle(() => ({ opacity: answered.get() }));
    const underline = useAnimatedStyle(() => ({ transform: [{ scaleX: interpolate(answered.get(), [0.3, 1], [0, 1], 'clamp') }] }));
    const teacher = useAnimatedStyle(() => ({
        transform: [{ translateY: -16 * f.s * cheer.get() }, { rotate: `${-6 * cheer.get()}deg` }],
    }));
    return (
        <>
            <Animated.View style={[at(f, 48, 140), chalk]}>
                <Text allowFontScaling={false} style={{ fontFamily: FONTS.display, fontSize: 28 * f.s, color: '#F5B82E' }}>₹1,210</Text>
            </Animated.View>
            <Animated.View style={[at(f, 48, 176, 100, 3), { backgroundColor: '#F5B82E', borderRadius: 2, transformOrigin: 'left' }, underline]} />
            <Animated.View style={[at(f, 150, 176, 110, 94), teacher]}>
                <View style={{ position: 'absolute', width: 50 * f.s, height: 4 * f.s, backgroundColor: '#5E3B1F', borderRadius: 2, transform: [{ rotate: '52deg' }], transformOrigin: 'right', top: 24 * f.s, left: -6 * f.s }} />
                <View style={{ position: 'absolute', left: 26 * f.s, top: 10 * f.s }}><FiniArt size={84 * f.s} /></View>
            </Animated.View>
        </>
    );
};

// ─── Scene 3: the shop window ────────────────────────────────

const ShopActors: React.FC<{ f: Frame; looked: SharedValue<number>; flip: SharedValue<number> }> = ({ f, looked, flip }) => {
    const mag = useAnimatedStyle(() => ({
        transform: [{ translateX: 92 * f.s * looked.get() }, { translateY: -90 * f.s * looked.get() }],
    }));
    const tag = useAnimatedStyle(() => ({ transform: [{ scaleX: Math.max(0.02, Math.abs(1 - 2 * flip.get())) }] }));
    const front = useAnimatedStyle(() => ({ opacity: flip.get() < 0.5 ? 1 : 0 }));
    const back = useAnimatedStyle(() => ({ opacity: flip.get() >= 0.5 ? 1 : 0 }));
    const extras = useAnimatedStyle(() => ({ opacity: interpolate(looked.get(), [0.5, 1], [0, 1], 'clamp') }));
    const chip = (text: string, x: number, y: number) => (
        <View style={[at(f, x, y), { height: 20 * f.s, paddingHorizontal: 9 * f.s, borderRadius: 10 * f.s, backgroundColor: '#F5B82E', justifyContent: 'center' }]}>
            <Text allowFontScaling={false} style={{ ...FACE.semibold, fontSize: 9 * f.s, color: '#3A2A14' }}>{text}</Text>
        </View>
    );
    const priceText = (price: string, note: string) => (
        <>
            <Text allowFontScaling={false} style={{ fontFamily: FONTS.display, fontSize: 13 * f.s, color: '#1A1613' }}>{price}</Text>
            <Text allowFontScaling={false} style={{ ...FACE.medium, fontSize: 7.5 * f.s, color: '#756C62' }}>{note}</Text>
        </>
    );
    return (
        <>
            <Animated.View style={[at(f, 176, 126, 64, 42), { borderRadius: 6 * f.s, backgroundColor: '#F4E3C8' }, tag]}>
                <View style={{ position: 'absolute', left: 17 * f.s, top: 4 * f.s, width: 6 * f.s, height: 6 * f.s, borderRadius: 3 * f.s, backgroundColor: '#36316A' }} />
                <Animated.View style={[{ position: 'absolute', left: 0, right: 0, top: 13 * f.s, alignItems: 'center' }, front]}>{priceText('₹60,000', 'No-cost EMI')}</Animated.View>
                <Animated.View style={[{ position: 'absolute', left: 0, right: 0, top: 13 * f.s, alignItems: 'center' }, back]}>{priceText('₹62,921', 'real price')}</Animated.View>
            </Animated.View>
            <Animated.View style={[{ position: 'absolute', left: 0, top: 0, right: 0, bottom: 0 }, extras]}>
                {chip('+₹1,421 fees', 36, 74)}
                {chip('+₹1,500 discount lost', 36, 100)}
            </Animated.View>
            <Animated.View style={[at(f, 20, 210, 110, 90), mag]}>
                <View style={{ position: 'absolute', left: 0, top: 4 * f.s }}><FiniArt size={78 * f.s} /></View>
                <View style={{ position: 'absolute', left: 68 * f.s, top: 0, width: 32 * f.s, height: 32 * f.s, borderRadius: 16 * f.s, borderWidth: 4 * f.s, borderColor: '#C9C3EA', backgroundColor: 'rgba(191,227,245,0.35)' }} />
                <View style={{ position: 'absolute', left: 58 * f.s, top: 30 * f.s, width: 18 * f.s, height: 5 * f.s, borderRadius: 3, backgroundColor: '#8A5A33', transform: [{ rotate: '-50deg' }] }} />
            </Animated.View>
        </>
    );
};

// ─── Scene 4: welcome ────────────────────────────────────────

const WelcomeActors: React.FC<{ f: Frame; wave: SharedValue<number> }> = ({ f, wave }) => {
    const style = useAnimatedStyle(() => ({ transform: [{ rotate: `${8 * wave.get()}deg` }] }));
    return (
        <>
            {[[40, 80, 18], [226, 110, 14], [60, 236, 12], [212, 226, 20]].map(([x, y, size]) => (
                <View key={`${x}`} style={at(f, x, y)}><CoinArt size={size * f.s} /></View>
            ))}
            <Animated.View style={[at(f, 82, 90, 120, 120), { transformOrigin: 'bottom' }, style]}>
                <FiniArt size={120 * f.s} />
            </Animated.View>
        </>
    );
};

// ─── Progress ────────────────────────────────────────────────

const Segment: React.FC<{ fill: number; reduced: boolean }> = ({ fill, reduced }) => {
    const style = useAnimatedStyle(() => ({
        transform: [{ scaleX: reduced ? fill : withTiming(fill, { duration: 500, easing: Easing.bezier(0.23, 1, 0.32, 1) }) }],
    }));
    return (
        <View style={{ flex: 1, height: 3, borderRadius: 2, overflow: 'hidden', backgroundColor: COLORS.border.default }}>
            <Animated.View style={[{ height: 3, backgroundColor: COLORS.brand.primaryDark, transformOrigin: 'left' }, style]} />
        </View>
    );
};

// ─── Screen ──────────────────────────────────────────────────

/** The panel under the art. Fixed, so the art never jumps when the words change. */
const SHEET_HEIGHT = 268;

export const IntroScreen: React.FC<IntroScreenProps> = ({ onDone }) => {
    const insets = useSafeAreaInsets();
    const { width: windowWidth, height: windowHeight } = useWindowDimensions();
    const reduced = useReducedMotion();

    const [step, setStep] = useState(0);
    const [done, setDone] = useState([false, false, false, false]);
    const [answer, setAnswer] = useState<null | 0 | 1>(null);
    const [art, setArt] = useState({ w: windowWidth, h: Math.max(220, windowHeight - SHEET_HEIGHT - insets.bottom) });

    const page = useSharedValue(0);
    const found = useSharedValue(0);
    const answered = useSharedValue(0);
    const cheer = useSharedValue(0);
    const looked = useSharedValue(0);
    const flip = useSharedValue(0);
    const wave = useSharedValue(0);

    const f = frameFor(art.w, art.h);
    const copy = done[step] ? COPY[step].after : COPY[step].before;
    const kicker = step === 1 && done[1] && answer === 0 ? 'ALMOST' : copy.kicker;

    const onArtLayout = useCallback((e: LayoutChangeEvent) => {
        const { width, height } = e.nativeEvent.layout;
        setArt((a) => (a.w === width && a.h === height ? a : { w: width, h: height }));
    }, []);

    const markDone = (i: number) => setDone((d) => d.map((v, j) => (j === i ? true : v)));

    const goTo = (next: number) => {
        haptics.tap();
        page.set(reduced ? withTiming(next, { duration: 220 }) : withTiming(next, SLIDE));
        setStep(next);
        if (next === 3) {
            wave.set(reduced ? 0 : withDelay(500, withSequence(
                withTiming(-1, { duration: 220 }), withTiming(1, { duration: 220 }),
                withTiming(-1, { duration: 220 }), withTiming(0, { duration: 220 }),
            )));
        }
    };

    const findIt = () => {
        haptics.tap();
        found.set(reduced ? 1 : withTiming(1, { duration: 900, easing: Easing.bezier(0.23, 1, 0.32, 1) }));
        markDone(0);
    };

    const answerWith = (choice: 0 | 1) => {
        if (answer !== null) return;
        if (choice === 1) haptics.success(); else haptics.warn();
        setAnswer(choice);
        answered.set(reduced ? 1 : withTiming(1, { duration: 900 }));
        if (!reduced) cheer.set(withSequence(withSpring(1, POP), withSpring(0, POP)));
        markDone(1);
    };

    const lookCloser = () => {
        haptics.tap();
        looked.set(reduced ? 1 : withTiming(1, MOVE));
        flip.set(reduced ? 1 : withDelay(800, withTiming(1, { duration: 520 })));
        markDone(2);
    };

    const skip = () => { haptics.tap(); onDone(); };

    const primary = () => {
        if (step === 0) return done[0] ? goTo(1) : findIt();
        if (step === 1) return goTo(2);
        if (step === 2) return done[2] ? goTo(3) : lookCloser();
        haptics.commit();
        onDone();
    };

    const fills = [0, 1, 2].map((i) => (step === 3 || i < step ? 1 : i === step ? (done[i] ? 0.75 : 0.35) : 0));
    const answerStyle = (i: 0 | 1) => {
        if (answer === null) return { backgroundColor: COLORS.surface.primary, borderColor: COLORS.border.default, color: COLORS.text.primary };
        if (i === 1) return { backgroundColor: COLORS.semantic.profit, borderColor: COLORS.semantic.profit, color: COLORS.brand.onAccent };
        if (answer === 0) return { backgroundColor: COLORS.semantic.lossBg, borderColor: COLORS.semantic.loss, color: COLORS.text.primary };
        return { backgroundColor: COLORS.surface.primary, borderColor: COLORS.border.default, color: COLORS.text.tertiary };
    };

    return (
        <View style={{ flex: 1, backgroundColor: COLORS.surface.secondary }}>
            <StatusBar style={step >= 2 ? 'light' : 'dark'} />

            <View style={{ flex: 1, overflow: 'hidden' }} onLayout={onArtLayout}>
                <Scene index={0} page={page} width={art.w} height={art.h} reduced={reduced}>
                    <StreetActors f={f} found={found} reduced={reduced} />
                </Scene>
                <Scene index={1} page={page} width={art.w} height={art.h} reduced={reduced}>
                    <ClassroomActors f={f} answered={answered} cheer={cheer} />
                </Scene>
                <Scene index={2} page={page} width={art.w} height={art.h} reduced={reduced}>
                    <ShopActors f={f} looked={looked} flip={flip} />
                </Scene>
                <Scene index={3} page={page} width={art.w} height={art.h} reduced={reduced}>
                    <WelcomeActors f={f} wave={wave} />
                </Scene>

                {step < 3 ? (
                    <Pressable
                        onPress={skip}
                        accessibilityRole="button"
                        accessibilityLabel="Skip the introduction"
                        hitSlop={10}
                        style={({ pressed }) => ({
                            position: 'absolute', right: GUTTER, top: insets.top + 8,
                            paddingHorizontal: 14, height: 32, borderRadius: 16, justifyContent: 'center',
                            backgroundColor: pressed ? 'rgba(0,0,0,0.35)' : 'rgba(0,0,0,0.22)',
                        })}
                    >
                        <Text style={{ ...TYPE.caption, ...FACE.semibold, color: '#FFFFFF' }}>Skip</Text>
                    </Pressable>
                ) : null}
            </View>

            <View
                style={{
                    height: SHEET_HEIGHT + insets.bottom,
                    marginTop: -24,
                    borderTopLeftRadius: 26,
                    borderTopRightRadius: 26,
                    backgroundColor: COLORS.surface.secondary,
                    paddingHorizontal: GUTTER + 2,
                    paddingTop: 20,
                    paddingBottom: insets.bottom + 16,
                }}
            >
                <View style={{ flexDirection: 'row', gap: 6, marginBottom: 14 }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
                    {fills.map((fill, i) => <Segment key={i} fill={fill} reduced={reduced} />)}
                </View>

                <Animated.View key={`${step}-${done[step]}`} entering={FadeIn.duration(reduced ? 120 : 260)} style={{ flex: 1 }}>
                    <Text style={{ ...TYPE.micro, color: COLORS.text.tertiary }}>{kicker}</Text>
                    <Text
                        accessibilityRole="header"
                        numberOfLines={2}
                        adjustsFontSizeToFit
                        minimumFontScale={0.8}
                        style={{ fontFamily: FONTS.display, fontSize: 31, lineHeight: 33, color: COLORS.text.primary, marginTop: 6 }}
                    >
                        {copy.title}
                    </Text>
                    <Text numberOfLines={3} style={{ ...TYPE.callout, ...FACE.regular, color: COLORS.text.secondary, marginTop: 6 }}>
                        {copy.body}
                    </Text>
                </Animated.View>

                {step === 1 && !done[1] ? (
                    <View style={{ flexDirection: 'row', gap: 10 }}>
                        {([0, 1] as const).map((i) => {
                            const st = answerStyle(i);
                            return (
                                <PressableScale
                                    key={i}
                                    onPress={() => answerWith(i)}
                                    accessibilityRole="button"
                                    accessibilityLabel={i === 0 ? '1,200 rupees' : '1,210 rupees'}
                                    containerStyle={{ flex: 1 }}
                                    style={{ height: 52, borderRadius: 26, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center', backgroundColor: st.backgroundColor, borderColor: st.borderColor }}
                                >
                                    <Text style={{ ...TYPE.amountSm, fontSize: 17, color: st.color }}>{i === 0 ? '₹1,200' : '₹1,210'}</Text>
                                </PressableScale>
                            );
                        })}
                    </View>
                ) : (
                    <PressableScale
                        onPress={primary}
                        accessibilityRole="button"
                        style={{ height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.brand.primaryDark }}
                    >
                        <Text style={{ ...TYPE.callout, ...FACE.semibold, fontSize: 16, color: COLORS.brand.onAccent }}>{copy.action}</Text>
                    </PressableScale>
                )}
            </View>
        </View>
    );
};

export default IntroScreen;
