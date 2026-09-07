/**
 * The tab bar.
 *
 * Rendered by hand rather than by the default bar, because the thing that
 * makes it feel like one object instead of four is a single pill that travels
 * between the tabs, and the default bar has nowhere to put it.
 *
 * It floats: a capsule inset from all three edges, lifted off the canvas by
 * the one warm shadow the elevation scale allows for things that genuinely
 * hover. The container behind it is transparent but still occupies its full
 * height in the layout, so screens keep ending above the bar. Making the bar
 * absolute instead would have let content slide underneath it, which looks
 * better in a screenshot and cuts the last row off on every screen that was
 * written before the bar floated.
 *
 * Three things the previous version got wrong, all of them only visible on a
 * device:
 *
 *   The background was the literal '#FFFFFF', so the bar stayed white in dark
 *   mode while every screen above it went dark. A literal cannot follow a
 *   theme; a token can.
 *
 *   Inactive icons were drawn at opacity 0.5 over text.tertiary, which lands
 *   near 2.4:1. The icon is the only thing naming the destination once the
 *   label is small, so it is carrying meaning and needs to be readable. They
 *   are full opacity now, and the active state is carried by the pill and the
 *   colour instead.
 *
 *   Labels were 10px, below the 11px micro step, which is the smallest size
 *   the type scale is willing to defend.
 */
import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { View, Text, Pressable, useWindowDimensions } from 'react-native';
import Animated, {
    useAnimatedStyle,
    useSharedValue,
    withSpring,
    withTiming,
    useReducedMotion,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Home, BarChart2, Target, GraduationCap } from 'lucide-react-native';
import { FeedScreen } from '../screens/FeedScreen';
import { VitalsScreen } from '../screens/VitalsScreen';
import { LearnScreen } from '../screens/LearnScreen';
import { GoalsScreen } from '../screens/GoalsScreen';
import { FONTS, COLORS, TYPE, MOTION, ELEVATION } from '../theme/tokens';
import * as haptics from '../utils/haptics';

const Tab = createBottomTabNavigator();

const ICONS: Record<string, React.ComponentType<{ size: number; color: string; strokeWidth?: number }>> = {
    Feed: Home,
    Vitals: BarChart2,
    Goals: Target,
    Learn: GraduationCap,
};

/** The floating capsule itself. */
const BAR_HEIGHT = 64;
/** Gap between the capsule and the screen edges. */
const BAR_INSET = 16;
/** Clearance under the capsule, on top of the safe-area inset. */
const BAR_LIFT = 10;
/** How wide the travelling pill is, as a share of one tab's width. */
const PILL_SHARE = 0.82;
const PILL_HEIGHT = 48;

/**
 * The pill that follows the selected tab.
 *
 * It moves and the icons do not, which is what makes the bar read as one
 * object. A spring rather than a duration because this is the one place in the
 * bar where something travels a distance, and a distance wants a spring; the
 * icon and label crossfades below stay on the timing tokens.
 */
const TravellingPill: React.FC<{ index: number; tabWidth: number; reduced: boolean }> = ({
    index,
    tabWidth,
    reduced,
}) => {
    const pillWidth = tabWidth * PILL_SHARE;
    const target = index * tabWidth + (tabWidth - pillWidth) / 2;
    const x = useSharedValue(target);

    React.useEffect(() => {
        x.value = reduced
            ? target
            : withSpring(target, { damping: 18, stiffness: 190, mass: 0.6 });
    }, [target, reduced, x]);

    const style = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }));

    return (
        <Animated.View
            pointerEvents="none"
            style={[
                {
                    position: 'absolute',
                    top: (BAR_HEIGHT - PILL_HEIGHT) / 2,
                    left: 0,
                    width: pillWidth,
                    height: PILL_HEIGHT,
                    borderRadius: PILL_HEIGHT / 2,
                    // Solid rather than the soft tint. Inside a floating
                    // capsule the tint had nothing to sit against and read as
                    // a smudge; a filled pill is the thing that travels.
                    backgroundColor: COLORS.brand.primaryDark,
                },
                style,
            ]}
        />
    );
};

/** One tab. The lift is small on purpose: it should read as arrival, not as a jump. */
const TabItem: React.FC<{
    label: string;
    focused: boolean;
    width: number;
    onPress: () => void;
    onLongPress: () => void;
    reduced: boolean;
}> = ({ label, focused, width, onPress, onLongPress, reduced }) => {
    const Icon = ICONS[label] ?? Home;
    const lift = useSharedValue(focused ? 1 : 0);

    React.useEffect(() => {
        lift.value = reduced
            ? (focused ? 1 : 0)
            : withTiming(focused ? 1 : 0, { duration: MOTION.quick });
    }, [focused, reduced, lift]);

    const iconStyle = useAnimatedStyle(() => ({
        transform: [{ translateY: -2 * lift.value }, { scale: 1 + 0.06 * lift.value }],
    }));

    // The active item sits on the filled pill, so it takes the on-accent
    // value, which is the same white in both themes because the pill is.
    const colour = focused ? COLORS.brand.onAccent : COLORS.text.tertiary;

    return (
        <Pressable
            onPress={onPress}
            onLongPress={onLongPress}
            style={{ width, height: BAR_HEIGHT, alignItems: 'center', justifyContent: 'center' }}
            accessibilityRole="button"
            accessibilityState={focused ? { selected: true } : {}}
            accessibilityLabel={label}
        >
            <Animated.View style={iconStyle}>
                <Icon size={21} color={colour} strokeWidth={focused ? 2.2 : 1.8} />
            </Animated.View>
            <Text
                style={{
                    ...TYPE.micro,
                    // The micro step is built for uppercase section labels and
                    // carries the transform with it. These are destinations,
                    // not section headings, and "FEED" shouts.
                    textTransform: 'none',
                    letterSpacing: 0,
                    fontFamily: focused ? FONTS.semibold : FONTS.medium,
                    color: colour,
                    marginTop: 3,
                }}
            >
                {label}
            </Text>
        </Pressable>
    );
};

const FinSightTabBar: React.FC<BottomTabBarProps> = ({ state, navigation }) => {
    const insets = useSafeAreaInsets();
    const { width } = useWindowDimensions();
    const reduced = useReducedMotion();
    // Measured against the inside of the capsule, not the screen. Dividing the
    // full window width here made the four tabs 32px wider than the capsule
    // holding them, and overflow:hidden ate the last label: "Learn" rendered
    // as "Learr".
    const inner = width - BAR_INSET * 2 - 2;
    const tabWidth = inner / state.routes.length;

    return (
        <View
            style={{
                backgroundColor: 'transparent',
                paddingHorizontal: BAR_INSET,
                paddingBottom: insets.bottom + BAR_LIFT,
                paddingTop: BAR_LIFT,
            }}
        >
            <View
                style={{
                    height: BAR_HEIGHT,
                    flexDirection: 'row',
                    borderRadius: BAR_HEIGHT / 2,
                    backgroundColor: COLORS.surface.primary,
                    borderWidth: 1,
                    borderColor: COLORS.border.default,
                    // The one place the lifted shadow is unambiguously right.
                    // Android draws shadows from `elevation` alone and the
                    // token's 3 disappears under a capsule this size, so this
                    // surface asks for more of it and nothing else does.
                    ...ELEVATION.lifted,
                    elevation: 10,
                    overflow: 'hidden',
                }}
            >
                <TravellingPill index={state.index} tabWidth={tabWidth} reduced={reduced} />
                {state.routes.map((route, i) => {
                    const focused = state.index === i;
                    return (
                        <TabItem
                            key={route.key}
                            label={route.name}
                            focused={focused}
                            width={tabWidth}
                            reduced={reduced}
                            onPress={() => {
                                haptics.tap();
                                const event = navigation.emit({
                                    type: 'tabPress',
                                    target: route.key,
                                    canPreventDefault: true,
                                });
                                if (!focused && !event.defaultPrevented) {
                                    navigation.navigate(route.name);
                                }
                            }}
                            onLongPress={() =>
                                navigation.emit({ type: 'tabLongPress', target: route.key })
                            }
                        />
                    );
                })}
            </View>
        </View>
    );
};

export const BottomTabs: React.FC = () => (
    <Tab.Navigator
        screenOptions={{ headerShown: false }}
        tabBar={(props) => <FinSightTabBar {...props} />}
    >
        <Tab.Screen name="Feed" component={FeedScreen} />
        <Tab.Screen name="Vitals" component={VitalsScreen} />
        <Tab.Screen name="Goals" component={GoalsScreen} />
        <Tab.Screen name="Learn" component={LearnScreen} />
    </Tab.Navigator>
);
