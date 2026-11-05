/**
 * Fini, FinSight's mascot: a coin with a sprout, because a rupee you keep
 * is a rupee that grows.
 *
 * Built the way Duolingo builds Duo, as a small set of states rather than a
 * library of clips: one body, and a mood that changes the eyes, the mouth and
 * how it moves. Everything that moves runs on the UI thread (Reanimated), so
 * a busy JS thread never makes the character stutter.
 *
 * It never scolds. Finch's lesson is that a pet lends motivation when it is
 * kind about a missed day, and that is the rule here: the lowest mood is
 * "concerned", soft eyes and a small mouth, never a frown aimed at the user.
 *
 * The coin's colours are its own and do not theme, the same way a logo does
 * not. It reads on both the light and the dark canvas.
 */
import React, { useEffect, useRef, useState } from 'react';
import { GestureResponderEvent, Pressable } from 'react-native';
import Animated, {
    Easing,
    cancelAnimation,
    useAnimatedProps,
    useAnimatedStyle,
    useReducedMotion,
    useSharedValue,
    withDelay,
    withRepeat,
    withSequence,
    withSpring,
    withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, Ellipse, G, Path } from 'react-native-svg';
import * as haptics from '../../utils/haptics';
import { FONTS } from '../../theme/tokens';

export type MascotMood = 'idle' | 'happy' | 'celebrate' | 'thinking' | 'sleepy' | 'concerned';

const AnimatedEllipse = Animated.createAnimatedComponent(Ellipse);
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

/** What a tap can turn into, briefly. Picked so two taps in a row differ. */
const TAP_REACTIONS: MascotMood[] = ['happy', 'celebrate', 'thinking', 'happy', 'celebrate'];

const GOLD = '#F5B82E';
const RIM = '#D9960F';
const INNER = '#FFD66B';
const INK = '#3A2A14';
const CHEEK = '#F28C6B';
const LEAF = '#3FAF6E';
const LEAF_DARK = '#2E8A55';

/** One mouth per mood, drawn in the 120 x 120 box. */
const MOUTH: Record<MascotMood, string> = {
    idle: 'M52 72 Q60 78 68 72',
    happy: 'M49 70 Q60 82 71 70',
    celebrate: 'M48 69 Q60 88 72 69 Z',
    thinking: 'M53 74 Q58 72 66 75',
    sleepy: 'M54 74 Q60 76 66 74',
    concerned: 'M53 76 Q60 72 67 76',
};

interface MascotProps {
    mood?: MascotMood;
    size?: number;
    /** Called after the hop when the coin is tapped. */
    onPress?: () => void;
}

export const Mascot: React.FC<MascotProps> = ({ mood: baseMood = 'idle', size = 140, onPress }) => {
    const reduced = useReducedMotion();

    // A tap shows a short reaction over whatever mood the screen asked for,
    // then hands back to it.
    const [reaction, setReaction] = useState<MascotMood | null>(null);
    const reactionTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const taps = useRef(0);
    useEffect(() => () => { if (reactionTimer.current) clearTimeout(reactionTimer.current); }, []);
    const mood = reaction ?? baseMood;

    // Where the eyes look (in the 120 box), the squish while held, and a spin.
    const lookX = useSharedValue(0);
    const lookY = useSharedValue(0);
    const squish = useSharedValue(0);
    const spin = useSharedValue(0);

    const breathe = useSharedValue(0);
    const hop = useSharedValue(0);
    const tilt = useSharedValue(0);
    const blink = useSharedValue(1);
    const sparkle = useSharedValue(0);

    // Breathing and blinking: the two things that make a drawing look alive
    // while nothing is happening.
    useEffect(() => {
        if (reduced) {
            breathe.value = 0;
            blink.value = 1;
            return;
        }
        const period = mood === 'sleepy' ? 2600 : 1700;
        breathe.value = withRepeat(
            withTiming(1, { duration: period, easing: Easing.inOut(Easing.sin) }),
            -1,
            true,
        );
        if (mood !== 'sleepy') {
            blink.value = withRepeat(
                withSequence(
                    withDelay(2800, withTiming(0.08, { duration: 70 })),
                    withTiming(1, { duration: 110 }),
                ),
                -1,
            );
        } else {
            blink.value = 1;
        }
        return () => {
            cancelAnimation(breathe);
            cancelAnimation(blink);
        };
    }, [mood, reduced, breathe, blink]);

    // Entering a mood is the moment worth animating: a hop for good news, a
    // two-jump wiggle and sparks for a celebration.
    useEffect(() => {
        if (reduced) return;
        if (mood === 'celebrate') {
            hop.value = withSequence(
                withTiming(-24, { duration: 180, easing: Easing.out(Easing.quad) }),
                withTiming(0, { duration: 220, easing: Easing.in(Easing.quad) }),
                withTiming(-14, { duration: 150, easing: Easing.out(Easing.quad) }),
                withSpring(0, { damping: 9, stiffness: 220 }),
            );
            tilt.value = withSequence(
                withTiming(-8, { duration: 120 }),
                withTiming(8, { duration: 160 }),
                withTiming(-4, { duration: 140 }),
                withSpring(0, { damping: 10 }),
            );
            sparkle.value = 0;
            sparkle.value = withTiming(1, { duration: 900, easing: Easing.out(Easing.cubic) });
        } else if (mood === 'happy') {
            hop.value = withSequence(
                withTiming(-10, { duration: 160, easing: Easing.out(Easing.quad) }),
                withSpring(0, { damping: 10, stiffness: 240 }),
            );
        } else if (mood === 'thinking') {
            tilt.value = withSpring(-6, { damping: 12 });
        } else {
            tilt.value = withSpring(0, { damping: 12 });
        }
    }, [mood, reduced, hop, tilt, sparkle]);

    const bodyStyle = useAnimatedStyle(() => ({
        transform: [
            { translateY: hop.value + squish.value * size * 0.06 },
            { rotate: `${tilt.value + spin.value}deg` },
            { scaleX: 1 + 0.012 * breathe.value + 0.1 * squish.value },
            { scaleY: 1 + 0.03 * breathe.value - 0.14 * squish.value },
        ],
    }));

    // The shadow shrinks as the coin leaves the ground, which is what sells
    // the jump more than the jump does.
    const shadowStyle = useAnimatedStyle(() => ({
        transform: [{ scaleX: 1 + hop.value / 60 }],
        opacity: 0.18 + hop.value / 200,
    }));

    const leftEye = useAnimatedProps(() => ({ ry: 7 * blink.value, cx: 47 + lookX.value, cy: 57 + lookY.value }));
    const rightEye = useAnimatedProps(() => ({ ry: 7 * blink.value, cx: 73 + lookX.value, cy: 57 + lookY.value }));
    const leftShine = useAnimatedProps(() => ({ cx: 48.8 + lookX.value, cy: 54 + lookY.value }));
    const rightShine = useAnimatedProps(() => ({ cx: 74.8 + lookX.value, cy: 54 + lookY.value }));

    const sparkStyle = useAnimatedStyle(() => ({
        opacity: sparkle.value > 0 && sparkle.value < 1 ? 1 - sparkle.value : 0,
        transform: [{ scale: 0.6 + sparkle.value * 0.7 }],
    }));

    // The eyes turn toward the finger the moment it lands.
    const look = (e: GestureResponderEvent) => {
        if (reduced) return;
        const { locationX, locationY } = e.nativeEvent;
        const dx = (locationX / size - 0.5) * 2;
        const dy = (locationY / (size * 1.08) - 0.5) * 2;
        lookX.set(withSpring(Math.max(-1, Math.min(1, dx)) * 3.2, { damping: 14, stiffness: 260 }));
        lookY.set(withSpring(Math.max(-1, Math.min(1, dy)) * 2.4, { damping: 14, stiffness: 260 }));
    };

    const release = () => {
        lookX.set(withDelay(500, withSpring(0, { damping: 14 })));
        lookY.set(withDelay(500, withSpring(0, { damping: 14 })));
        if (squish.get() > 0) {
            squish.set(withSpring(0, { damping: 6, stiffness: 300 }));
            haptics.tap();
        }
    };

    const tap = () => {
        haptics.tap();
        taps.current += 1;
        if (!reduced) {
            hop.set(withSequence(
                withTiming(-14, { duration: 140, easing: Easing.out(Easing.quad) }),
                withSpring(0, { damping: 8, stiffness: 260 }),
            ));
            tilt.set(withSequence(withTiming(6, { duration: 100 }), withSpring(0, { damping: 8 })));
            // Every third tap is a full turn.
            if (taps.current % 3 === 0) {
                spin.set(0);
                spin.set(withTiming(360, { duration: 520, easing: Easing.out(Easing.cubic) }));
            }
        }
        const next = TAP_REACTIONS[taps.current % TAP_REACTIONS.length];
        setReaction(next === baseMood ? 'celebrate' : next);
        if (reactionTimer.current) clearTimeout(reactionTimer.current);
        reactionTimer.current = setTimeout(() => setReaction(null), 1400);
        onPress?.();
    };

    // Hold to squish; letting go pops it back.
    const hold = () => {
        if (reduced) return;
        haptics.select();
        squish.set(withSpring(1, { damping: 12, stiffness: 200 }));
        setReaction('happy');
        if (reactionTimer.current) clearTimeout(reactionTimer.current);
        reactionTimer.current = setTimeout(() => setReaction(null), 1800);
    };

    const eyesClosed = mood === 'sleepy';
    const softEyes = mood === 'concerned';

    return (
        <Pressable
            onPress={tap}
            onPressIn={look}
            onPressOut={release}
            onLongPress={hold}
            delayLongPress={320}
            accessibilityRole="imagebutton"
            accessibilityLabel="Fini, your FinSight coin"
            hitSlop={8}
            style={{ width: size, height: size * 1.08 }}
        >
            {/* Sparks sit behind the coin and burst outward on a celebration. */}
            <Animated.View
                pointerEvents="none"
                style={[{ position: 'absolute', left: 0, top: 0, width: size, height: size }, sparkStyle]}
            >
                <Svg width={size} height={size} viewBox="0 0 120 120">
                    {[[14, 30], [104, 26], [10, 84], [108, 80], [60, 4]].map(([x, y], i) => (
                        <Path
                            key={i}
                            d={`M${x} ${y - 6} L${x + 1.6} ${y - 1.6} L${x + 6} ${y} L${x + 1.6} ${y + 1.6} L${x} ${y + 6} L${x - 1.6} ${y + 1.6} L${x - 6} ${y} L${x - 1.6} ${y - 1.6} Z`}
                            fill={i % 2 ? '#FFC94A' : '#7C83FF'}
                        />
                    ))}
                </Svg>
            </Animated.View>

            <Animated.View
                pointerEvents="none"
                style={[{
                    position: 'absolute', left: size * 0.27, top: size * 0.98,
                    width: size * 0.46, height: size * 0.08, borderRadius: size,
                    backgroundColor: '#000',
                }, shadowStyle]}
            />

            <Animated.View style={[{ width: size, height: size }, bodyStyle]}>
                <Svg width={size} height={size} viewBox="0 0 120 120">
                    {/* Sprout */}
                    <Path d="M60 16 C60 11 60 8 61 4" stroke={LEAF_DARK} strokeWidth={3} strokeLinecap="round" fill="none" />
                    <Path d="M61 7 C66 0 75 1 77 4 C72 9 66 10 61 7 Z" fill={LEAF} />
                    <Path d="M60 9 C55 3 47 4 45 7 C50 11 56 12 60 9 Z" fill={LEAF} />

                    {/* Coin */}
                    <Circle cx={60} cy={62} r={45} fill={GOLD} stroke={RIM} strokeWidth={5} />
                    <Circle cx={60} cy={62} r={36} fill="none" stroke={INNER} strokeWidth={2.5} opacity={0.9} />
                    <Path d="M30 46 Q36 30 52 24" stroke="#FFFFFF" strokeWidth={4} strokeLinecap="round" fill="none" opacity={0.55} />

                    {/* Cheeks */}
                    <Ellipse cx={38} cy={70} rx={6.5} ry={3.6} fill={CHEEK} opacity={0.5} />
                    <Ellipse cx={82} cy={70} rx={6.5} ry={3.6} fill={CHEEK} opacity={0.5} />

                    {/* Eyes */}
                    {eyesClosed ? (
                        <G stroke={INK} strokeWidth={3} strokeLinecap="round" fill="none">
                            <Path d="M41 58 Q47 62 53 58" />
                            <Path d="M67 58 Q73 62 79 58" />
                        </G>
                    ) : (
                        <G>
                            <AnimatedEllipse cx={47} cy={57} rx={softEyes ? 5.5 : 5} fill={INK} animatedProps={leftEye} />
                            <AnimatedEllipse cx={73} cy={57} rx={softEyes ? 5.5 : 5} fill={INK} animatedProps={rightEye} />
                            <AnimatedCircle cx={48.8} cy={54} r={1.7} fill="#FFFFFF" animatedProps={leftShine} />
                            <AnimatedCircle cx={74.8} cy={54} r={1.7} fill="#FFFFFF" animatedProps={rightShine} />
                            {softEyes && (
                                <G stroke={INK} strokeWidth={2} strokeLinecap="round">
                                    <Path d="M40 47 L52 49" />
                                    <Path d="M80 47 L68 49" />
                                </G>
                            )}
                        </G>
                    )}

                    {/* Mouth */}
                    <Path
                        d={MOUTH[mood]}
                        stroke={INK}
                        strokeWidth={3}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        fill={mood === 'celebrate' ? '#8A3B2A' : 'none'}
                    />
                </Svg>
            </Animated.View>

            {mood === 'sleepy' && <SleepyZ size={size} reduced={reduced} />}
        </Pressable>
    );
};

/** A small "z" that drifts up and fades, on a loop, while Fini dozes. */
const SleepyZ: React.FC<{ size: number; reduced: boolean }> = ({ size, reduced }) => {
    const t = useSharedValue(0);
    useEffect(() => {
        if (reduced) return;
        t.value = withRepeat(withTiming(1, { duration: 2200, easing: Easing.out(Easing.quad) }), -1);
        return () => cancelAnimation(t);
    }, [reduced, t]);
    const style = useAnimatedStyle(() => ({
        opacity: reduced ? 0.8 : 1 - t.value,
        transform: [{ translateY: -t.value * 18 }, { translateX: t.value * 8 }],
    }));
    return (
        <Animated.Text
            pointerEvents="none"
            style={[{
                position: 'absolute', right: size * 0.06, top: size * 0.12,
                fontSize: size * 0.14, fontFamily: FONTS.bold, color: '#7C83FF',
            }, style]}
        >
            z
        </Animated.Text>
    );
};

export default Mascot;

