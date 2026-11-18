/**
 * A form sheet on iPhone, presented the way iOS presents one: a real page
 * sheet (UIKit's own presentation), so the screen behind it recedes, the
 * sheet follows the finger, and a swipe down closes it at any speed. None of
 * that motion is drawn in JavaScript, which is why it feels right.
 *
 * The header follows the system layout: a grabber, the title centred in the
 * headline style, Cancel on the left and the confirming action on the right
 * when the sheet has one, or a round close button when it does not.
 *
 * Only used on iOS. Android keeps its own bottom sheets and dialogs.
 */
import React from 'react';
import { Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X } from 'lucide-react-native';
import { COLORS, FACE, GUTTER } from '../theme/tokens';

interface HeaderAction {
    label: string;
    onPress: () => void;
    disabled?: boolean;
}

/** A text button in the sheet header, at the 44 point minimum. */
const HeaderButton: React.FC<HeaderAction & { strong?: boolean }> = ({ label, onPress, disabled, strong }) => (
    <Pressable
        onPress={onPress}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityState={{ disabled: !!disabled }}
        hitSlop={8}
        style={({ pressed }) => ({ minHeight: 44, justifyContent: 'center', opacity: pressed ? 0.5 : 1 })}
    >
        <Text
            style={{
                ...(strong ? FACE.semibold : FACE.regular),
                fontSize: 17,
                lineHeight: 22,
                color: disabled ? COLORS.text.muted : COLORS.brand.link,
            }}
        >
            {label}
        </Text>
    </Pressable>
);

export const IOSSheet: React.FC<{
    visible: boolean;
    onClose: () => void;
    title: string;
    /** Usually Cancel. Shown on the left. */
    leading?: HeaderAction;
    /** The confirming action, such as Save. Without one, a close button shows. */
    trailing?: HeaderAction;
    children: React.ReactNode;
}> = ({ visible, onClose, title, leading, trailing, children }) => {
    const insets = useSafeAreaInsets();
    return (
        <Modal
            visible={visible}
            animationType="slide"
            presentationStyle="pageSheet"
            allowSwipeDismissal
            onRequestClose={onClose}
        >
            <View style={{ flex: 1, backgroundColor: COLORS.surface.primary }}>
                <View style={{ alignItems: 'center', paddingTop: 5 }}>
                    <View style={{ width: 36, height: 5, borderRadius: 2.5, backgroundColor: COLORS.border.strong }} />
                </View>
                <View style={{ height: 52, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16 }}>
                    <View style={{ flex: 1, alignItems: 'flex-start' }}>
                        {leading ? <HeaderButton {...leading} /> : null}
                    </View>
                    <Text
                        accessibilityRole="header"
                        numberOfLines={1}
                        style={{ ...FACE.semibold, fontSize: 17, lineHeight: 22, color: COLORS.text.primary, flexShrink: 1, textAlign: 'center' }}
                    >
                        {title}
                    </Text>
                    <View style={{ flex: 1, alignItems: 'flex-end' }}>
                        {trailing ? (
                            <HeaderButton {...trailing} strong />
                        ) : (
                            <Pressable
                                onPress={onClose}
                                hitSlop={7}
                                accessibilityRole="button"
                                accessibilityLabel="Close"
                                style={({ pressed }) => ({
                                    width: 30,
                                    height: 30,
                                    borderRadius: 15,
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    backgroundColor: COLORS.surface.tertiary,
                                    opacity: pressed ? 0.6 : 1,
                                })}
                            >
                                <X size={16} color={COLORS.text.secondary} strokeWidth={2.4} />
                            </Pressable>
                        )}
                    </View>
                </View>
                <ScrollView
                    style={{ flex: 1 }}
                    contentContainerStyle={{ paddingHorizontal: GUTTER, paddingTop: 8, paddingBottom: insets.bottom + 24 }}
                    keyboardShouldPersistTaps="handled"
                    keyboardDismissMode="interactive"
                    // The system moves the content clear of the keyboard,
                    // which a KeyboardAvoidingView cannot measure correctly
                    // inside a sheet that does not start at the top.
                    automaticallyAdjustKeyboardInsets
                    showsVerticalScrollIndicator={false}
                >
                    {children}
                </ScrollView>
            </View>
        </Modal>
    );
};
