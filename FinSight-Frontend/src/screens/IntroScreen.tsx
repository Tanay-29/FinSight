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
import { MessageSquareText, PieChart, TrendingUp, ArrowRight } from 'lucide-react-native';
import { PressableScale } from '../components/PressableScale';
import * as haptics from '../utils/haptics';

interface Panel {
    key: string;
    icon: React.ReactNode;
    tint: string;
    headline: string;
    body: string;
    /** A fragment of the real interface, not a drawing of one. */
    preview: React.ReactNode;
}

const PANELS: Panel[] = [
    {
        key: 'paste',
        icon: <MessageSquareText size={22} color="#6366F1" />,
        tint: '#EEF2FF',
        headline: 'Paste the bank text.\nThat is the whole job.',
        body: 'No linking an account, no statements to upload. Paste the message your bank already sent you and the amount, the shop and the category come out of it.',
        preview: (
            <View className="w-full bg-white rounded-2xl border border-gray-100 p-3.5">
                <Text className="text-[11px] text-gray-400 mb-2">Message from your bank</Text>
                <Text className="text-[12px] text-gray-600 leading-4">
                    INR 240.00 debited from A/c XX4417 at SWIGGY on 12-Sep-26
                </Text>
                <View className="h-px bg-gray-100 my-3" />
                <View className="flex-row items-center justify-between">
                    <View>
                        <Text className="text-[13px] font-bold text-gray-900">Swiggy</Text>
                        <Text className="text-[11px] text-gray-400">Dining</Text>
                    </View>
                    <Text className="text-[15px] font-bold text-red-500">-₹240</Text>
                </View>
            </View>
        ),
    },
    {
        key: 'where',
        icon: <PieChart size={22} color="#0EA5E9" />,
        tint: '#E0F2FE',
        headline: 'Find out where it\nactually went.',
        body: 'One big order is easy to remember. Thirty small ones are not, and they are usually the larger number. This is the part people get wrong about their own spending.',
        preview: (
            <View className="w-full bg-white rounded-2xl border border-gray-100 p-3.5">
                {[
                    { label: 'Dining', amount: '₹1,280', width: '100%', note: '8 orders', color: '#F97316' },
                    { label: 'Shopping', amount: '₹1,100', width: '86%', note: '2 buys', color: '#EC4899' },
                    { label: 'Transport', amount: '₹340', width: '27%', note: '11 rides', color: '#3B82F6' },
                ].map((row) => (
                    <View key={row.label} className="mb-2.5">
                        <View className="flex-row items-baseline justify-between mb-1">
                            <Text className="text-[12px] font-medium text-gray-700">{row.label}</Text>
                            <Text className="text-[12px] font-bold text-gray-900">{row.amount}</Text>
                        </View>
                        <View className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
                            <View
                                style={{ width: row.width as ViewStyle['width'], backgroundColor: row.color }}
                                className="h-full rounded-full"
                            />
                        </View>
                        <Text className="text-[10px] text-gray-400 mt-1">{row.note}</Text>
                    </View>
                ))}
            </View>
        ),
    },
    {
        key: 'worth',
        icon: <TrendingUp size={22} color="#10B981" />,
        tint: '#ECFDF5',
        headline: 'See what a habit\ncosts you by 40.',
        body: 'A 200 rupee coffee is not 200 rupees. It is 200 rupees a day, for years, that could have been compounding instead. FinSight does that arithmetic so you do not have to argue with yourself about it.',
        preview: (
            <View className="w-full bg-indigo-600 rounded-2xl p-4">
                <Text className="text-[11px] font-bold text-indigo-200 uppercase tracking-wider">
                    A daily coffee, invested instead
                </Text>
                <Text className="text-[30px] font-extrabold text-white mt-1">₹58.2 L</Text>
                <Text className="text-[11px] text-indigo-200 mt-1">
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
        <SafeAreaView className="flex-1 bg-white" edges={['top', 'bottom']}>
            {/* Indicator and skip sit above the panels, so the reader can see
                how long this is before deciding to sit through it. */}
            <View className="flex-row items-center justify-between px-6 pt-2 pb-4">
                <View className="flex-row items-center">
                    {PANELS.map((panel, i) => (
                        <View
                            key={panel.key}
                            className="rounded-full mr-1.5"
                            style={{
                                height: 4,
                                width: i === index ? 22 : 8,
                                backgroundColor: i === index ? '#6366F1' : '#E5E7EB',
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
                    <Text className="text-sm font-semibold text-gray-400">Skip</Text>
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
                    <View key={panel.key} style={{ width }} className="px-7">
                        <View className="flex-1 justify-center">
                            <View
                                className="w-12 h-12 rounded-2xl items-center justify-center mb-6"
                                style={{ backgroundColor: panel.tint }}
                            >
                                {panel.icon}
                            </View>

                            <Text className="text-[30px] leading-9 font-bold text-gray-900 tracking-tight">
                                {panel.headline}
                            </Text>
                            <Text className="text-[15px] leading-6 text-gray-500 mt-3.5 mb-8">
                                {panel.body}
                            </Text>

                            {panel.preview}
                        </View>
                    </View>
                ))}
            </ScrollView>

            <Animated.View
                entering={reduced ? FadeIn.duration(160) : FadeIn.duration(260)}
                className="px-7 pb-2"
            >
                <PressableScale
                    onPress={advance}
                    accessibilityRole="button"
                    className="bg-brand-primary rounded-2xl py-4 flex-row items-center justify-center"
                >
                    <Text className="text-white font-bold text-base mr-1.5">
                        {last ? 'Get started' : 'Next'}
                    </Text>
                    <ArrowRight size={18} color="#FFFFFF" />
                </PressableScale>

                <Text className="text-xs text-gray-400 text-center mt-4 leading-4">
                    FinSight is educational. It holds no money and connects to no bank.
                </Text>
            </Animated.View>
        </SafeAreaView>
    );
};

export default IntroScreen;
