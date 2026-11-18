/**
 * The inset grouped list iPhone settings screens use: rounded groups on the
 * grouped background, a small uppercase header over each and an optional
 * footer under it, 44 point rows with a coloured icon tile, separators inset
 * to the text, and a chevron on rows that open something.
 *
 * Rows highlight their background while pressed rather than scaling, as a
 * system table cell does. Only used on iOS.
 */
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { ChevronRight } from 'lucide-react-native';
import { COLORS, FACE, RADIUS } from '../theme/tokens';
import * as haptics from '../utils/haptics';

const ICON_TILE = 30;
const ROW_PAD = 16;
const ICON_GAP = 14;

/** A group of rows with an optional header above and footer below. */
export const GroupedSection: React.FC<{ header?: string; footer?: string; children: React.ReactNode }> = ({
    header,
    footer,
    children,
}) => {
    const rows = React.Children.toArray(children).filter(Boolean);
    return (
        <View style={{ marginTop: header ? 26 : 20, marginHorizontal: 16 }}>
            {header ? (
                <Text
                    accessibilityRole="header"
                    style={{ ...FACE.regular, fontSize: 13, lineHeight: 18, color: COLORS.text.secondary, textTransform: 'uppercase', marginHorizontal: ROW_PAD, marginBottom: 7 }}
                >
                    {header}
                </Text>
            ) : null}
            <View style={{ borderRadius: RADIUS.card, overflow: 'hidden', backgroundColor: COLORS.surface.primary }}>
                {rows.map((row, i) => (
                    <View key={i}>
                        {row}
                        {i < rows.length - 1 ? (
                            <View style={{ height: StyleSheet.hairlineWidth, marginLeft: ROW_PAD + ICON_TILE + ICON_GAP, backgroundColor: COLORS.border.strong }} />
                        ) : null}
                    </View>
                ))}
            </View>
            {footer ? (
                <Text style={{ ...FACE.regular, fontSize: 13, lineHeight: 18, color: COLORS.text.secondary, marginHorizontal: ROW_PAD, marginTop: 7 }}>
                    {footer}
                </Text>
            ) : null}
        </View>
    );
};

/** The rounded square behind a row's glyph, as in the Settings app. */
export const IconTile: React.FC<{ color: string; children: React.ReactNode }> = ({ color, children }) => (
    <View style={{ width: ICON_TILE, height: ICON_TILE, borderRadius: 7, alignItems: 'center', justifyContent: 'center', backgroundColor: color }}>
        {children}
    </View>
);

export const GroupedRow: React.FC<{
    icon?: React.ReactNode;
    label: string;
    hint?: string;
    /** Secondary text on the right, such as the current value. */
    value?: string;
    /** A control on the right: a switch, a picker, a spinner. */
    accessory?: React.ReactNode;
    onPress?: () => void;
    destructive?: boolean;
    disabled?: boolean;
}> = ({ icon, label, hint, value, accessory, onPress, destructive, disabled }) => {
    const body = (
        <>
            {icon ? <View style={{ marginRight: ICON_GAP }}>{icon}</View> : null}
            <View style={{ flex: 1, paddingVertical: 11 }}>
                <Text style={{ ...FACE.regular, fontSize: 17, lineHeight: 22, color: destructive ? COLORS.semantic.loss : COLORS.text.primary }}>
                    {label}
                </Text>
                {hint ? (
                    <Text style={{ ...FACE.regular, fontSize: 13, lineHeight: 18, color: COLORS.text.secondary, marginTop: 1 }}>{hint}</Text>
                ) : null}
            </View>
            {value ? (
                <Text style={{ ...FACE.regular, fontSize: 17, lineHeight: 22, color: COLORS.text.secondary, marginLeft: 8 }}>{value}</Text>
            ) : null}
            {accessory ? <View style={{ marginLeft: 8 }}>{accessory}</View> : null}
            {onPress && !accessory ? <ChevronRight size={18} color={COLORS.text.muted} strokeWidth={2.4} style={{ marginLeft: 6 }} /> : null}
        </>
    );
    const rowStyle = { flexDirection: 'row' as const, alignItems: 'center' as const, minHeight: 44, paddingHorizontal: ROW_PAD, opacity: disabled ? 0.5 : 1 };

    // A row whose control sits on the right is not itself a button, or a tap
    // on the switch would also count as a tap on the row.
    if (!onPress) return <View style={rowStyle}>{body}</View>;

    return (
        <Pressable
            onPress={() => { haptics.tap(); onPress(); }}
            disabled={disabled}
            accessibilityRole="button"
            accessibilityLabel={label}
            accessibilityHint={hint}
            style={({ pressed }) => [rowStyle, { backgroundColor: pressed ? COLORS.surface.tertiary : 'transparent' }]}
        >
            {body}
        </Pressable>
    );
};

/** A small segmented control, for a choice of two or three. */
export function Segmented<T extends string>({ options, value, onChange, label }: {
    options: { value: T; label: string }[];
    value: T;
    onChange: (next: T) => void;
    label: string;
}) {
    return (
        <View accessibilityRole="radiogroup" accessibilityLabel={label} style={{ flexDirection: 'row', padding: 2, borderRadius: 9, backgroundColor: COLORS.surface.tertiary }}>
            {options.map((opt) => {
                const selected = opt.value === value;
                return (
                    <Pressable
                        key={opt.value}
                        onPress={() => { if (!selected) { haptics.select(); onChange(opt.value); } }}
                        accessibilityRole="radio"
                        accessibilityState={{ checked: selected }}
                        accessibilityLabel={`${label}, ${opt.label}`}
                        hitSlop={{ top: 8, bottom: 8 }}
                        style={{
                            paddingHorizontal: 11,
                            paddingVertical: 5,
                            borderRadius: 7,
                            backgroundColor: selected ? COLORS.surface.primary : 'transparent',
                            shadowColor: '#000',
                            shadowOpacity: selected ? 0.12 : 0,
                            shadowRadius: 3,
                            shadowOffset: { width: 0, height: 1 },
                        }}
                    >
                        <Text style={{ ...(selected ? FACE.semibold : FACE.medium), fontSize: 13, lineHeight: 18, color: COLORS.text.primary }}>
                            {opt.label}
                        </Text>
                    </Pressable>
                );
            })}
        </View>
    );
}
