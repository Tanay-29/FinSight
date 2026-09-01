/**
 * AnimatedNumber
 *
 * Counts a value up rather than snapping to it. Used for money and scores,
 * where the motion makes a figure feel earned instead of just printed.
 *
 * Driven by requestAnimationFrame rather than Animated, because the number has
 * to be reformatted as text on every frame and Animated cannot drive text
 * content on the native thread anyway.
 */
import React, { useEffect, useRef, useState } from 'react';
import { Text, TextProps } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';

/** Fast at first, easing out at the end. */
function easeOutCubic(t: number): number {
    return 1 - Math.pow(1 - t, 3);
}

interface AnimatedNumberProps extends TextProps {
    value: number;
    duration?: number;
    /** Turns the animated value into what the user reads. */
    format?: (value: number) => string;
    /** Force the animation off. Reduced motion turns it off on its own. */
    animate?: boolean;
}

/** Indian digit grouping, no decimals. 120000 becomes 1,20,000. */
export const formatIndianCurrency = (value: number): string =>
    `₹${Math.round(value).toLocaleString('en-IN')}`;

export const AnimatedNumber: React.FC<AnimatedNumberProps> = ({
    value,
    duration = 900,
    format = (v) => Math.round(v).toLocaleString('en-IN'),
    animate = true,
    ...textProps
}) => {
    const reduced = useReducedMotion();
    const running = animate && !reduced;
    const [displayed, setDisplayed] = useState(0);
    const frameRef = useRef<number | null>(null);
    const fromRef = useRef(0);

    useEffect(() => {
        // Nothing to drive when animation is off: the value is rendered
        // directly below, so no state update is needed here.
        if (!running) return;

        // Animate from wherever the counter currently sits, so a value that
        // updates mid-flight continues smoothly instead of restarting at zero.
        const from = fromRef.current;
        const start = Date.now();

        const step = () => {
            const elapsed = Date.now() - start;
            const t = Math.min(elapsed / duration, 1);
            const current = from + (value - from) * easeOutCubic(t);

            setDisplayed(current);
            fromRef.current = current;

            if (t < 1) {
                frameRef.current = requestAnimationFrame(step);
            } else {
                fromRef.current = value;
            }
        };

        frameRef.current = requestAnimationFrame(step);

        return () => {
            if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
        };
    }, [value, duration, running]);

    return <Text {...textProps}>{format(running ? displayed : value)}</Text>;
};

export default AnimatedNumber;
