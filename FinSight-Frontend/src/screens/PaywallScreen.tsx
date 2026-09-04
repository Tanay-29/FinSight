/**
 * PaywallScreen - FinSight Plus.
 *
 * Nothing here takes a payment. There is no card field anywhere on this screen
 * and no payment processor behind it: the button waits, writes a flag to the
 * user's own profile, and returns. The banner at the bottom says so, in the
 * app, to whoever is looking at it.
 *
 * The structure follows the elements that decide whether a paywall converts:
 * an outcome headline rather than a plan name, three to five scannable
 * benefits, the annual plan selected by default with its saving stated and its
 * monthly equivalent shown so the two prices can be compared without mental
 * arithmetic, the trust line about when a card would be charged, one primary
 * action, and a restore path. What it does not have is invented social proof.
 * A star rating and a user count would both be lies at this stage, and a
 * fabricated testimonial on a student project is worse than a missing one.
 *
 * When the screen is opened by a gate rather than from the profile, the
 * headline names the feature that was blocked, because a paywall that answers
 * the question the user just asked converts better than a generic one.
 */
import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeIn, FadeInDown, useReducedMotion } from 'react-native-reanimated';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { X, Check, Sparkles, ShieldCheck, Info } from 'lucide-react-native';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { startPurchase, selectIsPremium, clearPremiumError } from '../store/slices/premiumSlice';
import { PLANS, DEFAULT_PLAN, TRIAL_DAYS, VALUE_PROPS, FEATURE_COPY, PlanId, PremiumFeature } from '../config/premium';
import { PressableScale } from '../components/PressableScale';
import * as haptics from '../utils/haptics';
import { COLORS } from '../theme/tokens';

type Props = NativeStackScreenProps<any, 'Paywall'>;

const PaywallScreen: React.FC<Props> = ({ navigation, route }) => {
    const dispatch = useAppDispatch();
    const reduced = useReducedMotion();
    const { user } = useAppSelector((s) => s.auth);
    const { purchasing, error } = useAppSelector((s) => s.premium);
    const isPremium = useAppSelector(selectIsPremium);

    const feature = (route.params as { feature?: PremiumFeature } | undefined)?.feature;
    const [selected, setSelected] = useState<PlanId>(DEFAULT_PLAN);

    const headline = feature ? FEATURE_COPY[feature] : null;

    const close = () => {
        dispatch(clearPremiumError());
        navigation.goBack();
    };

    const purchase = async () => {
        if (!user?.uid) return;
        haptics.commit();
        const result = await dispatch(startPurchase({ uid: user.uid, plan: selected }));
        if (startPurchase.fulfilled.match(result)) {
            haptics.celebrate();
            navigation.goBack();
        }
    };

    const plan = PLANS.find((p) => p.id === selected)!;

    return (
        <SafeAreaView className="flex-1 bg-surface-primary" edges={['top', 'bottom']}>
            <StatusBar barStyle="dark-content" />

            <View className="px-5 pt-2 pb-1 flex-row justify-end">
                <TouchableOpacity
                    onPress={close}
                    hitSlop={{ top: 14, bottom: 14, left: 14, right: 14 }}
                    accessibilityRole="button"
                    accessibilityLabel="Close"
                >
                    <X size={22} color={COLORS.text.tertiary} />
                </TouchableOpacity>
            </View>

            <ScrollView
                contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 24 }}
                showsVerticalScrollIndicator={false}
            >
                <Animated.View entering={reduced ? FadeIn.duration(180) : FadeInDown.duration(320)}>
                    <View className="w-14 h-14 rounded-2xl bg-brand-soft items-center justify-center mb-5">
                        <Sparkles size={26} color={COLORS.brand.primary} />
                    </View>

                    <Text className="text-[28px] leading-9 font-inter-bold text-text-primary tracking-tight">
                        {headline ? headline.title : 'Keep the coach.'}
                    </Text>
                    <Text className="text-[15px] leading-6 text-text-secondary mt-2.5">
                        {headline
                            ? headline.body
                            : 'Everything you log stays free. FinSight Plus covers the parts a model writes for you, fresh, whenever you ask.'}
                    </Text>

                    <View className="mt-7 mb-7">
                        {VALUE_PROPS.map((prop) => (
                            <View key={prop} className="flex-row items-start mb-3">
                                <View className="w-5 h-5 rounded-full bg-profit-bg items-center justify-center mt-0.5 mr-3">
                                    <Check size={12} color={COLORS.semantic.profit} strokeWidth={3} />
                                </View>
                                <Text className="text-[15px] leading-6 text-text-primary flex-1">
                                    {prop}
                                </Text>
                            </View>
                        ))}
                    </View>

                    {PLANS.map((p) => {
                        const active = selected === p.id;
                        return (
                            <PressableScale
                                key={p.id}
                                onPress={() => { haptics.select(); setSelected(p.id); }}
                                activeScale={0.985}
                                accessibilityRole="button"
                                accessibilityState={{ selected: active }}
                                className="mb-3 rounded-2xl px-4 py-3.5 flex-row items-center"
                                style={{
                                    borderWidth: active ? 2 : 1,
                                    borderColor: active ? COLORS.brand.primary : COLORS.border.default,
                                    backgroundColor: active ? COLORS.brand.soft : '#FFFFFF',
                                }}
                            >
                                <View
                                    className="w-5 h-5 rounded-full items-center justify-center mr-3"
                                    style={{
                                        borderWidth: 2,
                                        borderColor: active ? COLORS.brand.primary : COLORS.border.strong,
                                        backgroundColor: active ? COLORS.brand.primary : 'transparent',
                                    }}
                                >
                                    {active && <Check size={11} color="#FFFFFF" strokeWidth={3} />}
                                </View>

                                <View className="flex-1">
                                    <View className="flex-row items-center">
                                        <Text className="text-base font-inter-bold text-text-primary">
                                            {p.label}
                                        </Text>
                                        {p.badge && (
                                            <View className="bg-profit-bg rounded-full px-2 py-0.5 ml-2">
                                                <Text className="text-[10px] font-inter-bold text-profit uppercase tracking-wide">
                                                    {p.badge}
                                                </Text>
                                            </View>
                                        )}
                                    </View>
                                    {/* Both prices in the same place, so the yearly
                                        plan can be compared without doing the sum. */}
                                    <Text className="text-xs text-text-secondary mt-0.5 font-inter">
                                        ₹{p.perMonth}/month
                                        {p.id === 'annual' ? `, billed ₹${p.price} a year` : ', billed monthly'}
                                    </Text>
                                </View>

                                {p.savings && (
                                    <Text className="text-xs font-inter-bold text-profit">
                                        Save {p.savings}%
                                    </Text>
                                )}
                            </PressableScale>
                        );
                    })}

                    {error && (
                        <Animated.View entering={FadeIn.duration(180)} className="mt-1 mb-1">
                            <Text className="text-loss text-sm leading-5 font-inter">{error}</Text>
                        </Animated.View>
                    )}

                    <PressableScale
                        onPress={purchase}
                        disabled={purchasing || isPremium}
                        accessibilityRole="button"
                        className={`rounded-pill h-[52px] justify-center items-center mt-4 ${purchasing ? 'bg-brand-primary/60' : 'bg-brand-primary'}`}
                    >
                        {purchasing ? (
                            <ActivityIndicator color="#FFFFFF" />
                        ) : (
                            <Text className="text-white font-inter-bold text-base">
                                {isPremium ? 'You already have Plus' : `Start ${TRIAL_DAYS} days free`}
                            </Text>
                        )}
                    </PressableScale>

                    <View className="flex-row items-center justify-center mt-3.5">
                        <ShieldCheck size={13} color={COLORS.text.tertiary} />
                        <Text className="text-xs text-text-tertiary ml-1.5 text-center font-inter">
                            Free for {TRIAL_DAYS} days, then ₹{plan.price} a {plan.period}. Cancel any time.
                        </Text>
                    </View>

                    <TouchableOpacity
                        onPress={close}
                        className="items-center mt-4 py-2"
                        accessibilityRole="button"
                    >
                        <Text className="text-sm font-inter-semibold text-text-secondary">
                            Not now
                        </Text>
                    </TouchableOpacity>

                    {/* Said in the app, not only in a commit message. */}
                    <View className="flex-row items-start bg-surface-secondary rounded-xl px-3 py-2.5 mt-6">
                        <Info size={13} color={COLORS.text.secondary} style={{ marginTop: 1 }} />
                        <Text className="text-xs text-text-secondary ml-2 flex-1 leading-4 font-inter">
                            Demonstration only. No payment is taken and no card details are asked
                            for anywhere in this app. The button below unlocks the features on this
                            account so the flow can be shown end to end.
                        </Text>
                    </View>
                </Animated.View>
            </ScrollView>
        </SafeAreaView>
    );
};

export default PaywallScreen;
