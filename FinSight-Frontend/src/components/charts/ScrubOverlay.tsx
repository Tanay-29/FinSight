/**
 * A transparent layer over a chart that turns a finger on it into an x
 * position. Press and slide to read any point; let go and the chart goes
 * back to its resting labels.
 *
 * It is an empty View on purpose: touch coordinates are reported relative to
 * whatever was touched, and with no children the thing touched is always this
 * layer, so locationX is the x inside the chart on every platform.
 *
 * A vertical drag still scrolls the page: the scroll view may take the touch
 * back whenever it asks.
 */
import React from 'react';
import { GestureResponderEvent, View } from 'react-native';

interface Props {
    onScrub: (x: number) => void;
    onEnd: () => void;
    label: string;
}

export const ScrubOverlay: React.FC<Props> = ({ onScrub, onEnd, label }) => {
    const move = (e: GestureResponderEvent) => onScrub(e.nativeEvent.locationX);
    return (
        <View
            accessible
            accessibilityLabel={label}
            style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
            onStartShouldSetResponder={() => true}
            onMoveShouldSetResponder={() => true}
            onResponderGrant={move}
            onResponderMove={move}
            onResponderRelease={onEnd}
            onResponderTerminate={onEnd}
            onResponderTerminationRequest={() => true}
        />
    );
};
