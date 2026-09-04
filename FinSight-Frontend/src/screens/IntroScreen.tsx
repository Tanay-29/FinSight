/**
 * IntroScreen - the three panels before sign-in.
 *
 * The job of this screen is not to list features. It is to answer, in about
 * fifteen seconds, why someone should hand over an email address. So each
 * panel makes one claim, in the second person, about something the reader
 * already recognises about their own money, and the claims run in the order
 * the app actually works: the money leaves, the app reads it, you find out
 * where it went.
 *
 * Each panel carries a small piece of the interface it is describing rather
 * than an illustration. Showing the real thing is more persuasive than drawing
 * a picture of it, and it costs no assets.
 *
 * Seen once. The flag is in AsyncStorage rather than on the profile, because
 * this runs before anyone has signed in and there is no profile to write to.
 */
import React, { useRef, useState } from 'react';
import {
    View, Text, ScrollView, TouchableOpacity, useWindowDimensions, ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeIn, useReducedMotion } from 'react-native-reanimated';
import { MessageSquareText, PieChart, TrendingUp, ArrowRight, Utensils } from 'lucide-react-native';
import { PressableScale } from '../components/PressableScale';
import * as haptics from '../utils/haptics';
import { COLORS, CATEGORY_COLORS, TYPE, RADIUS, SPACING, GUTTER, FONTS } from '../theme/tokens';

interface Panel {
    key: string;
    icon: React.ReactNode;
    headline: string;
    body: string;
    /** A fragment of the real interface, not a drawing of one. */
    preview: React.ReactNode;
}

/** The panel previews are cards, so they follow the card rules: white on the
 *  warm canvas, one hairline, no shadow. */
const previewCard = 'w-full bg-surface-primary border border-border p-4';

const PANELS: Panel[] = [
    {
        key: 'paste',
        icon: <MessageSquareText size={22} color={COLORS.brand.primaryDark} strokeWidth={1.8} />,
        headline: 'Paste the bank text.\nThat is the whole job.',
        body: 'No linking an account, no statements to upload. Paste the message your bank already sent you and the amount, the shop and the category come out of it.',
        preview: (
            <View className={previewCard} style={{ borderRadius: RADIUS.card }}>
                <Text style={TYPE.micro} className="text-text-tertiary mb-2">
                    Message from your bank
                </Text>
                <Text style={TYPE.caption} className="text-text-secondary">
                    INR 240.00 debited from A/c XX4417 at SWIGGY on 12-Sep-26
                </Text>
                <View className="h-px bg-border my-3.5" />
                <View className="flex-row items-center justify-between">
                    <View className="flex-row items-center">
                        <View
                            className="w-9 h-9 items-center justify-center mr-3"
                            style={{
                                borderRadius: RADIUS.tile,
                                backgroundColor: `${CATEGORY_COLORS.dining}1F`,
                            }}
                        >
                            <Utensils size={16} color={CATEGORY_COLORS.dining} strokeWidth={1.8} />
                        </View>
                        <View>
                            <Text style={TYPE.callout} className="text-text-primary">Swiggy</Text>
                            <Text style={TYPE.caption} className="text-text-tertiary">Dining</Text>
                        </View>
                    </View>
                    <Text style={TYPE.amountSm} className="text-loss">-₹240</Text>
                </View>
            </View>
        ),
    },
    {
        key: 'where',
        icon: <PieChart size={22} color={COLORS.brand.primaryDark} strokeWidth={1.8} />,
        headline: 'Find out where it\nactually went.',
        body: 'One big order is easy to remember. Thirty small ones are not, and they are usually the larger number. This is the part people get wrong about their own spending.',
        preview: (
            <View className={previewCard} style={{ borderRadius: RADIUS.card }}>
                {[
                    { label: 'Dining', amount: '₹1,280', width: '100%', note: '8 orders', color: CATEGORY_COLORS.dining },
                    { label: 'Shopping', amount: '₹1,100', width: '86%', note: '2 buys', color: CATEGORY_COLORS.shopping },
                    { label: 'Transport', amount: '₹340', width: '27%', note: '11 rides', color: CATEGORY_COLORS.transport },
                ].map((row, i) => (
                    <View key={row.label} style={{ marginBottom: i === 2 ? 0 : SPACING[3] }}>
                        <View className="flex-row items-baseline justify-between mb-1.5">
                            <Text style={TYPE.caption} className="text-text-primary">{row.label}</Text>
                            <Text style={TYPE.amountSm} className="text-text-primary">{row.amount}</Text>
                        </View>
                        <View className="h-2 rounded-full bg-surface-tertiary overflow-hidden">
                            <View
                                style={{ width: row.width as ViewStyle['width'], backgroundColor: row.color }}
                                className="h-full rounded-full"
                            />
                        </View>
                        <Text style={TYPE.caption} className="text-text-tertiary mt-1.5">{row.note}</Text>
                    </View>
                ))}
            </View>
        ),
    },
    {
        key: 'worth',
        icon: <TrendingUp size={22} color={COLORS.brand.primaryDark} strokeWidth={1.8} />,
        headline: 'See what a habit\ncosts you by 40.',
        body: 'A 200 rupee coffee is not 200 rupees. It is 200 rupees a day, for years, that could have been compounding instead. FinSight does that arithmetic so you do not have to argue with yourself about it.',
        preview: (
            <View
                className="w-full bg-brand-primary-dark p-5"
                style={{ borderRadius: RADIUS.card }}
            >
                <Text style={TYPE.micro} className="text-brand-edge">
                    A daily coffee, invested instead
                </Text>
                {/* The display face earns its place on a number this size. */}
                <Text style={TYPE.display} className="text-white mt-1.5">₹58.2 L</Text>
                <Text style={TYPE.caption} className="text-brand-edge mt-1.5">
                    ₹200 a day, 20 years, 12% a year
                </Text>
            </View>
        ),
    },
];

interface IntroScreenProps {
    onDone: () => void;
}

export const IntroScreen: React.FC<IntroScreenProps> = ({ onDone }) => {
    const { width } = useWindowDimensions();
    const reduced = useReducedMotion();
    const scrollRef = useRef<ScrollView>(null);
    const [index, setIndex] = useState(0);

    const last = index === PANELS.length - 1;

    const goTo = (next: number) => {
        scrollRef.current?.scrollTo({ x: next * width, animated: !reduced });
        setIndex(next);
    };

    const advance = () => {
        haptics.tap();
        if (last) onDone();
        else goTo(index + 1);
    };

    return (
        <SafeAreaView className="flex-1 bg-surface-secondary" edges={['top', 'bottom']}>
            {/* Indicator and skip sit above the panels, so the reader can see
                how long this is before deciding to sit through it. */}
            <View
                className="flex-row items-center justify-between pt-2 pb-5"
                style={{ paddingHorizontal: GUTTER }}
            >
                <View className="flex-row items-center">
                    {PANELS.map((panel, i) => (
                        <View
                            key={panel.key}
                            className="rounded-full mr-1.5"
                            style={{
                                height: 4,
                                width: i === index ? 22 : 8,
                                backgroundColor: i === index
                                    ? COLORS.brand.primaryDark
                                    : COLORS.border.strong,
                            }}
                        />
                    ))}
                </View>

                <TouchableOpacity
                    onPress={() => { haptics.tap(); onDone(); }}
                    hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                    accessibilityRole="button"
                    accessibilityLabel="Skip the introduction"
                >
                    <Text style={TYPE.callout} className="text-text-tertiary">Skip</Text>
                </TouchableOpacity>
            </View>

            <ScrollView
                ref={scrollRef}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                onMomentumScrollEnd={(e) =>
                    setIndex(Math.round(e.nativeEvent.contentOffset.x / width))
                }
                className="flex-1"
            >
                {PANELS.map((panel) => (
                    <View key={panel.key} style={{ width, paddingHorizontal: GUTTER }}>
                        <View className="flex-1 justify-center">
                            <View
                                className="w-12 h-12 items-center justify-center mb-6 bg-brand-soft"
                                style={{ borderRadius: RADIUS.tile }}
                            >
                                {panel.icon}
                            </View>

                            {/* Instrument Serif, per the Phase 0 type direction.
                                One weight, so the size carries the emphasis. */}
                            <Text style={TYPE.title} className="text-text-primary">
                                {panel.headline}
                            </Text>
                            <Text style={TYPE.body} className="text-text-secondary mt-4 mb-8">
                                {panel.body}
                            </Text>

                            {panel.preview}
                        </View>
                    </View>
                ))}
            </ScrollView>

            <Animated.View
                entering={reduced ? FadeIn.duration(160) : FadeIn.duration(260)}
                className="pb-2"
                style={{ paddingHorizontal: GUTTER }}
            >
                <PressableScale
                    onPress={advance}
                    accessibilityRole="button"
                    className="bg-brand-primary-dark rounded-pill h-[52px] flex-row items-center justify-center"
                >
                    <Text
                        style={[TYPE.callout, { fontFamily: FONTS.semibold }]}
                        className="text-white mr-1.5"
                    >
                        {last ? 'Get started' : 'Next'}
                    </Text>
                    <ArrowRight size={18} color={COLORS.text.inverse} strokeWidth={2} />
                </PressableScale>

                <Text style={TYPE.caption} className="text-text-tertiary text-center mt-4">
                    FinSight is educational. It holds no money and connects to no bank.
                </Text>
            </Animated.View>
        </SafeAreaView>
    );
};

export default IntroScreen;
