/**
 * The header every pushed screen uses: the round back button, the title in
 * the heading style, an optional caption under it, and an optional control on
 * the right. It sits on the canvas, with no bar or divider of its own.
 *
 * Several screens had their own version (a white bar with a border, a smaller
 * grey back circle, a bigger or bolder title), so moving between them looked
 * like moving between apps.
 */
import React from 'react';
import { View, Text } from 'react-native';
import { BackButton } from './BackButton';
import { COLORS, GUTTER, TYPE } from '../theme/tokens';

export const ScreenHeader: React.FC<{
    title: string;
    subtitle?: string;
    onBack?: () => void;
    right?: React.ReactNode;
}> = ({ title, subtitle, onBack, right }) => (
    <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: GUTTER, paddingTop: 10, paddingBottom: 6 }}>
        <BackButton onPress={onBack} />
        <View style={{ marginLeft: 12, flex: 1 }}>
            <Text numberOfLines={1} style={{ ...TYPE.heading, color: COLORS.text.primary }}>{title}</Text>
            {subtitle ? <Text numberOfLines={1} style={{ ...TYPE.caption, color: COLORS.text.tertiary }}>{subtitle}</Text> : null}
        </View>
        {right}
    </View>
);
