/**
 * Confetti
 *
 * Celebration burst for real milestones: a module finished, a goal reached, a
 * streak record. Deliberately hand-rolled rather than pulled from a library,
 * because the popular confetti packages have not kept up with React 19 and
 * Reanimated 4, and this is only a hundred lines.
 *
 * One native-driven Animated.Value drives every piece. Each piece interpolates
 * that same progress with its own offsets, so the whole burst costs a single
 * animation on the UI thread rather than one per piece.
 *
 * Fires when `active` flips to true. Renders nothing when idle.
 */
import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, Dimensions, Easing, StyleSheet, View } from 'react-native';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

const COLORS = ['#6366F1', '#10B981', '#F59E0B', '#EC4899', '#3B82F6', '#8B5CF6'];

interface Piece {
    startX: number;
    driftX: number;
    delay: number;
    size: number;
    color: string;
    spins: number;
    isCircle: boolean;
}

function buildPieces(count: number): Piece[] {
    return Array.from({ length: count }, (_, i) => ({
        startX: Math.random() * SCREEN_W,
        // Pieces fan outward: those starting left drift left.
        driftX: (Math.random() - 0.5) * 220,
        delay: Math.random() * 0.35,
        size: 6 + Math.random() * 8,
        color: COLORS[i % COLORS.length],
        spins: 1 + Math.random() * 3,
        isCircle: Math.random() > 0.6,
    }));
}

interface ConfettiProps {
    active: boolean;
    /** How many pieces. Keep modest on lower-end devices. */
    count?: number;
    duration?: number;
    onDone?: () => void;
}

export const Confetti: React.FC<ConfettiProps> = ({
    active,
    count = 45,
    duration = 2200,
    onDone,
}) => {
    const progress = useRef(new Animated.Value(0)).current;
    const pieces = useMemo(() => buildPieces(count), [count]);

    useEffect(() => {
        if (!active) return;

        progress.setValue(0);
        const animation = Animated.timing(progress, {
            toValue: 1,
            duration,
            easing: Easing.linear,
            useNativeDriver: true,
        });

        // The parent turns `active` back off in onDone, which unmounts the
        // pieces. No local visibility state needed.
        animation.start(({ finished }) => {
            if (finished) onDone?.();
        });

        return () => animation.stop();
        // onDone is intentionally excluded: a new identity each render would
        // restart the burst mid-flight.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [active, duration, progress]);

    if (!active) return null;

    return (
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
            {pieces.map((piece, i) => {
                // Each piece runs inside its own slice of the timeline, so the
                // burst staggers instead of moving as one sheet.
                const start = piece.delay;
                const end = Math.min(start + 0.75, 1);

                const translateY = progress.interpolate({
                    inputRange: [0, start, end, 1],
                    outputRange: [-40, -40, SCREEN_H * 0.85, SCREEN_H * 0.85],
                    extrapolate: 'clamp',
                });
                const translateX = progress.interpolate({
                    inputRange: [0, start, end, 1],
                    outputRange: [0, 0, piece.driftX, piece.driftX],
                    extrapolate: 'clamp',
                });
                const rotate = progress.interpolate({
                    inputRange: [0, 1],
                    outputRange: ['0deg', `${piece.spins * 360}deg`],
                });
                const opacity = progress.interpolate({
                    inputRange: [0, start, end - 0.15, end],
                    outputRange: [0, 1, 1, 0],
                    extrapolate: 'clamp',
                });

                return (
                    <Animated.View
                        key={i}
                        style={{
                            position: 'absolute',
                            left: piece.startX,
                            top: 0,
                            width: piece.size,
                            height: piece.isCircle ? piece.size : piece.size * 1.6,
                            backgroundColor: piece.color,
                            borderRadius: piece.isCircle ? piece.size / 2 : 2,
                            opacity,
                            transform: [{ translateY }, { translateX }, { rotate }],
                        }}
                    />
                );
            })}
        </View>
    );
};

export default Confetti;
