/**
 * OnboardingScreen - 5-step user profiling flow
 *
 * Step 1: Age
 * Step 2: Financial experience level (single-select)
 * Step 3: App goals / why are you here (multi-select)
 * Step 4: Monthly income range (single-select)
 * Step 5: Risk comfort (single-select)
 *
 * On completion → updateDoc to Firestore → dispatch completeOnboarding
 * → RootNavigator sees onboardingComplete: true → renders MainTabs
 */
import React, { useState } from 'react';
import {
    View, Text, TouchableOpacity, ScrollView, TextInput,
    KeyboardAvoidingView, Platform, ActivityIndicator, ViewStyle,
} from 'react-native';
import Animated, {
    FadeIn, FadeInRight, FadeInLeft, useReducedMotion,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
    Wallet, PiggyBank, TrendingUp, GraduationCap,
    Shield, Minus, Zap, Baby, BookOpen, ChevronRight,
    ChevronLeft, Sparkles, Check,
} from 'lucide-react-native';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { completeOnboarding } from '../store/slices/authSlice';
import { PressableScale } from '../components/PressableScale';
import * as haptics from '../utils/haptics';
import { COLORS, TYPE, RADIUS, GUTTER, FONTS } from '../theme/tokens';

const TOTAL_STEPS = 5;

// ─── Types ───────────────────────────────────────────────────────

type ExperienceLevel = 'beginner' | 'intermediate' | 'experienced';
type AppGoal = 'budgeting' | 'goals' | 'investing' | 'education';
type RiskProfile = 'conservative' | 'moderate' | 'aggressive';

interface OnboardingData {
    age: string;
    experienceLevel: ExperienceLevel | null;
    appGoals: AppGoal[];
    incomeRange: string | null;
    riskProfile: RiskProfile | null;
}

// ─── SelectCard - reusable single/multi select card ──────────────

/**
 * The per-step `accent` argument is gone.
 *
 * Each step used to pass its own colour, and the selected fill was built by
 * concatenating a hex alpha pair onto it. So the tint was a function of an
 * argument rather than a token, and picking a goal turned the card green while
 * picking an income band turned it amber, which said nothing: the colour was
 * not carrying meaning, it was just variety. One accent, one tint.
 *
 * The selected state also thickens the border to 2 and drops the padding to 15,
 * so the card does not grow by two pixels and shunt the rest of the list down.
 */
const SelectCard: React.FC<{
    /** Omitted by steps whose options read fine without one. */
    icon?: React.ReactNode;
    title: string;
    subtitle?: string;
    selected: boolean;
    onPress: () => void;
}> = ({ icon, title, subtitle, selected, onPress }) => (
    <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.8}
        style={{
            borderRadius: RADIUS.card,
            borderWidth: selected ? 2 : 1,
            borderColor: selected ? COLORS.brand.primary : COLORS.border.default,
            backgroundColor: selected ? COLORS.brand.soft : COLORS.surface.primary,
            padding: selected ? 15 : 16,
        }}
        className="mb-3 flex-row items-center"
        accessible
        accessibilityRole="button"
        accessibilityState={{ selected }}
    >
        {icon && (
            <View
                style={{
                    borderRadius: RADIUS.tile,
                    backgroundColor: selected ? COLORS.brand.primaryDark : COLORS.surface.tertiary,
                }}
                className="w-11 h-11 items-center justify-center mr-3"
            >
                {icon}
            </View>
        )}
        <View className="flex-1">
            <Text
                style={[TYPE.callout, {
                    fontFamily: FONTS.semibold,
                    color: selected ? COLORS.brand.primaryDark : COLORS.text.primary,
                }]}
            >
                {title}
            </Text>
            {subtitle && (
                <Text style={TYPE.caption} className="text-text-tertiary mt-0.5">{subtitle}</Text>
            )}
        </View>
        {selected && (
            <View
                style={{ backgroundColor: COLORS.brand.primaryDark }}
                className="w-6 h-6 rounded-full items-center justify-center ml-3"
            >
                <Check size={13} color={COLORS.text.inverse} strokeWidth={3} />
            </View>
        )}
    </TouchableOpacity>
);

// ─── Step content components ──────────────────────────────────────

const Step1Age: React.FC<{
    data: OnboardingData;
    onChange: (v: Partial<OnboardingData>) => void;
}> = ({ data, onChange }) => (
    <View className="flex-1 pt-6" style={{ paddingHorizontal: GUTTER }}>
        <View className="w-16 h-16 bg-brand-soft items-center justify-center mb-5" style={{ borderRadius: RADIUS.tile }}>
            <Sparkles size={30} color={COLORS.brand.primaryDark} strokeWidth={1.8} />
        </View>
        <Text style={TYPE.title} className="text-text-primary mb-2">
            Let's get to know you
        </Text>
        <Text style={TYPE.body} className="text-text-secondary mb-8">
            We personalise your experience and learning paths based on where you are in life.
        </Text>

        <Text style={TYPE.micro} className="text-text-tertiary mb-2">Your age</Text>
        <TextInput
            className="bg-surface-primary border border-border rounded-control px-4 h-[60px] text-2xl font-inter-bold text-text-primary"
            placeholder="e.g. 22"
            placeholderTextColor={COLORS.border.strong}
            keyboardType="number-pad"
            value={data.age}
            onChangeText={(v) => onChange({ age: v })}
            maxLength={3}
        />
        <Text style={TYPE.caption} className="text-text-tertiary mt-2">
            Your age is never shared publicly.
        </Text>
    </View>
);

const Step2Experience: React.FC<{
    data: OnboardingData;
    onChange: (v: Partial<OnboardingData>) => void;
}> = ({ data, onChange }) => {
    const OPTIONS: Array<{
        value: ExperienceLevel;
        icon: React.ReactNode;
        title: string;
        subtitle: string;
    }> = [
        {
            value: 'beginner',
            icon: <Baby size={22} color={data.experienceLevel === 'beginner' ? '#FFFFFF' : COLORS.text.secondary} />,
            title: "I'm just starting out",
            subtitle: 'New to managing money and investing',
        },
        {
            value: 'intermediate',
            icon: <BookOpen size={22} color={data.experienceLevel === 'intermediate' ? '#FFFFFF' : COLORS.text.secondary} />,
            title: 'I know the basics',
            subtitle: 'Familiar with budgets, some savings',
        },
        {
            value: 'experienced',
            icon: <TrendingUp size={22} color={data.experienceLevel === 'experienced' ? '#FFFFFF' : COLORS.text.secondary} />,
            title: "I'm fairly experienced",
            subtitle: 'Active investor or financial planner',
        },
    ];

    return (
        <View className="flex-1 pt-6" style={{ paddingHorizontal: GUTTER }}>
            <Text style={TYPE.title} className="text-text-primary mb-2">
                How comfortable are you with money?
            </Text>
            <Text style={TYPE.body} className="text-text-secondary mb-7">
                We'll tailor your content and suggestions accordingly - no wrong answer here.
            </Text>
            {OPTIONS.map((opt) => (
                <SelectCard
                    key={opt.value}
                    icon={opt.icon}
                    title={opt.title}
                    subtitle={opt.subtitle}
                    selected={data.experienceLevel === opt.value}
                    onPress={() => onChange({ experienceLevel: opt.value })}
                />
            ))}
        </View>
    );
};

const Step3Goals: React.FC<{
    data: OnboardingData;
    onChange: (v: Partial<OnboardingData>) => void;
}> = ({ data, onChange }) => {
    const OPTIONS: Array<{
        value: AppGoal;
        icon: React.ReactNode;
        title: string;
        subtitle: string;
    }> = [
        {
            value: 'budgeting',
            icon: <Wallet size={22} color={data.appGoals.includes('budgeting') ? '#FFFFFF' : COLORS.text.secondary} />,
            title: 'Know where my money goes',
            subtitle: 'Log what you spend and set limits that hold',
        },
        {
            value: 'goals',
            icon: <PiggyBank size={22} color={data.appGoals.includes('goals') ? '#FFFFFF' : COLORS.text.secondary} />,
            title: 'Save for something specific',
            subtitle: 'A trip, a phone, or a buffer for bad months',
        },
        {
            value: 'investing',
            icon: <TrendingUp size={22} color={data.appGoals.includes('investing') ? '#FFFFFF' : COLORS.text.secondary} />,
            title: 'Understand investing',
            subtitle: 'What stocks, mutual funds and SIPs actually are',
        },
        {
            value: 'education',
            icon: <GraduationCap size={22} color={data.appGoals.includes('education') ? '#FFFFFF' : COLORS.text.secondary} />,
            title: 'Get the basics straight',
            subtitle: 'Interest, inflation, taxes, credit scores',
        },
    ];

    const toggle = (value: AppGoal) => {
        const current = data.appGoals;
        const updated = current.includes(value)
            ? current.filter((g) => g !== value)
            : [...current, value];
        onChange({ appGoals: updated });
    };

    return (
        <View className="flex-1 pt-6" style={{ paddingHorizontal: GUTTER }}>
            <Text style={TYPE.title} className="text-text-primary mb-2">
                What are you here for?
            </Text>
            <Text style={TYPE.body} className="text-text-secondary mb-2">
                Pick as many as you like - you can always change this later.
            </Text>
            <Text className="text-xs text-brand-link font-inter-semibold mb-6">
                Select at least one
            </Text>
            {OPTIONS.map((opt) => (
                <SelectCard
                    key={opt.value}
                    icon={opt.icon}
                    title={opt.title}
                    subtitle={opt.subtitle}
                    selected={data.appGoals.includes(opt.value)}
                    onPress={() => toggle(opt.value)}
                />
            ))}
        </View>
    );
};

const Step4Income: React.FC<{
    data: OnboardingData;
    onChange: (v: Partial<OnboardingData>) => void;
}> = ({ data, onChange }) => {
    const OPTIONS = [
        { value: 'under_15k', label: 'Under ₹15,000', sub: 'Student / intern' },
        { value: '15k_40k', label: '₹15,000 – ₹40,000', sub: 'Entry level / fresher' },
        { value: '40k_80k', label: '₹40,000 – ₹80,000', sub: 'Working professional' },
        { value: 'above_80k', label: '₹80,000+', sub: 'Senior / self-employed' },
        { value: 'prefer_not', label: 'Prefer not to say', sub: 'That\'s totally fine' },
    ];

    return (
        <View className="flex-1 pt-6" style={{ paddingHorizontal: GUTTER }}>
            <Text style={TYPE.title} className="text-text-primary mb-2">
                Your monthly income range
            </Text>
            <Text style={TYPE.body} className="text-text-secondary mb-7">
                Used only to suggest realistic budget templates. We never see your exact income.
            </Text>
            {OPTIONS.map((opt) => (
                <SelectCard
                    key={opt.value}
                    title={opt.label}
                    subtitle={opt.sub}
                    selected={data.incomeRange === opt.value}
                    onPress={() => onChange({ incomeRange: opt.value })}
                />
            ))}
        </View>
    );
};

const Step5Risk: React.FC<{
    data: OnboardingData;
    onChange: (v: Partial<OnboardingData>) => void;
}> = ({ data, onChange }) => {
    const OPTIONS: Array<{
        value: RiskProfile;
        icon: React.ReactNode;
        title: string;
        subtitle: string;
    }> = [
        {
            value: 'conservative',
            icon: <Shield size={22} color={data.riskProfile === 'conservative' ? '#FFFFFF' : COLORS.text.secondary} />,
            title: "Sell - I can't risk it",
            subtitle: 'Safety first. Prefer stability over returns.',
        },
        {
            value: 'moderate',
            icon: <Minus size={22} color={data.riskProfile === 'moderate' ? '#FFFFFF' : COLORS.text.secondary} />,
            title: "Hold - I'll wait it out",
            subtitle: 'Comfortable with short-term dips.',
        },
        {
            value: 'aggressive',
            icon: <Zap size={22} color={data.riskProfile === 'aggressive' ? '#FFFFFF' : COLORS.text.secondary} />,
            title: 'Buy more - great discount!',
            subtitle: 'Long-term growth is the goal.',
        },
    ];

    return (
        <View className="flex-1 pt-6" style={{ paddingHorizontal: GUTTER }}>
            <Text style={TYPE.title} className="text-text-primary mb-2">
                Your risk comfort
            </Text>
            <Text style={TYPE.body} className="text-text-secondary mb-3">
                Imagine your investments drop 20% in a month. What would you do?
            </Text>
            <Text className="text-xs text-text-tertiary mb-7 font-inter">
                No right or wrong - this helps us tailor investment suggestions.
            </Text>
            {OPTIONS.map((opt) => (
                <SelectCard
                    key={opt.value}
                    icon={opt.icon}
                    title={opt.title}
                    subtitle={opt.subtitle}
                    selected={data.riskProfile === opt.value}
                    onPress={() => onChange({ riskProfile: opt.value })}
                />
            ))}
        </View>
    );
};

// ─── Main OnboardingScreen ────────────────────────────────────────

const OnboardingScreen: React.FC = () => {
    const dispatch = useAppDispatch();
    const { user, error } = useAppSelector((state) => state.auth);

    const reduced = useReducedMotion();
    const [step, setStep] = useState(1);
    // Which way the step last moved, so the incoming panel enters from the
    // side the user pushed it from. Without this, back reads as forward.
    const [direction, setDirection] = useState<'forward' | 'back'>('forward');
    const [saving, setSaving] = useState(false);

    const [data, setData] = useState<OnboardingData>({
        age: '',
        experienceLevel: null,
        appGoals: [],
        incomeRange: null,
        riskProfile: null,
    });

    const updateData = (partial: Partial<OnboardingData>) => {
        setData((prev) => ({ ...prev, ...partial }));
    };

    const canProceed = () => {
        switch (step) {
            case 1: return data.age.trim().length > 0 && !isNaN(Number(data.age)) && Number(data.age) > 0;
            case 2: return data.experienceLevel !== null;
            case 3: return data.appGoals.length > 0;
            case 4: return data.incomeRange !== null;
            case 5: return data.riskProfile !== null;
            default: return false;
        }
    };

    const goNext = () => {
        if (!canProceed()) return;
        if (step < TOTAL_STEPS) {
            haptics.tap();
            setDirection('forward');
            setStep(step + 1);
        } else {
            handleFinish();
        }
    };

    const goBack = () => {
        if (step > 1) {
            haptics.tap();
            setDirection('back');
            setStep(step - 1);
        }
    };

    const handleFinish = async () => {
        if (!user?.uid) return;
        setSaving(true);
        const result = await dispatch(completeOnboarding({
            uid: user.uid,
            data: {
                age: Number(data.age),
                experienceLevel: data.experienceLevel!,
                appGoals: data.appGoals,
                incomeRange: data.incomeRange!,
                riskProfile: data.riskProfile!,
            },
        }));
        setSaving(false);
        // The buzz used to fire whether or not the save landed, which told a
        // user their answers were in at the exact moment they were lost.
        if (completeOnboarding.fulfilled.match(result)) haptics.success();
        else haptics.error();
        // RootNavigator re-renders automatically when profile.onboardingComplete = true
    };

    const STEP_TITLES = [
        'About you',
        'Experience',
        'Your goals',
        'Income',
        'Risk profile',
    ];

    return (
        <SafeAreaView className="flex-1 bg-surface-primary" edges={['top', 'bottom']}>
            <KeyboardAvoidingView
                className="flex-1"
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            >
                {/* Progress bar */}
                <View className="pt-4" style={{ paddingHorizontal: GUTTER }}>
                    <View className="flex-row items-center justify-between mb-2">
                        <Text style={TYPE.micro} className="text-text-tertiary">
                            Step {step} of {TOTAL_STEPS} · {STEP_TITLES[step - 1]}
                        </Text>
                        <Text style={TYPE.caption} className="text-text-tertiary">
                            {Math.round((step / TOTAL_STEPS) * 100)}%
                        </Text>
                    </View>
                    <View className="h-1.5 bg-surface-tertiary rounded-full overflow-hidden">
                        {/* Width, not scaleX: the fill is childless and clipped,
                            so nothing re-lays-out, and the rounded cap survives. */}
                        <Animated.View
                            className="h-full bg-brand-primary-dark rounded-full"
                            style={[
                                { width: `${(step / TOTAL_STEPS) * 100}%` },
                                {
                                    transitionProperty: ['width'],
                                    transitionDuration: reduced ? 0 : 300,
                                    transitionTimingFunction: 'ease-out',
                                } as ViewStyle,
                            ]}
                        />
                    </View>
                </View>

                {/* Step content */}
                <ScrollView
                    className="flex-1"
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                    contentContainerStyle={{ paddingBottom: 24 }}
                >
                    {/* Keyed on step so each panel is a real mount, which is what
                        gives the entrance something to animate. */}
                    <Animated.View
                        key={step}
                        entering={
                            reduced
                                ? FadeIn.duration(160)
                                : direction === 'forward'
                                    ? FadeInRight.duration(260)
                                    : FadeInLeft.duration(260)
                        }
                    >
                        {step === 1 && <Step1Age data={data} onChange={updateData} />}
                        {step === 2 && <Step2Experience data={data} onChange={updateData} />}
                        {step === 3 && <Step3Goals data={data} onChange={updateData} />}
                        {step === 4 && <Step4Income data={data} onChange={updateData} />}
                        {step === 5 && <Step5Risk data={data} onChange={updateData} />}
                    </Animated.View>
                </ScrollView>

                {error && (
                    <View className="pb-1" style={{ paddingHorizontal: GUTTER }}>
                        <Text style={TYPE.caption} className="text-loss">{error}</Text>
                    </View>
                )}

                {/* Navigation buttons */}
                <View className="pb-4 flex-row gap-3" style={{ paddingHorizontal: GUTTER }}>
                    {step > 1 && (
                        <TouchableOpacity
                            onPress={goBack}
                            className="flex-row items-center justify-center border border-border-strong px-5 rounded-pill h-[52px]"
                            activeOpacity={0.7}
                        >
                            <ChevronLeft size={20} color={COLORS.text.secondary} />
                        </TouchableOpacity>
                    )}

                    <PressableScale
                        onPress={goNext}
                        disabled={!canProceed() || saving}
                        accessibilityRole="button"
                        // Appearance goes in className only. PressableScale
                        // forwards it to an Animated.View, and passing `style`
                        // as well makes NativeWind drop the class styles.
                        containerStyle={{ flex: 1, opacity: canProceed() && !saving ? 1 : 0.45 }}
                        style={{
                            backgroundColor: COLORS.brand.primaryDark,
                            borderRadius: RADIUS.pill,
                            height: 52,
                            flexDirection: 'row',
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}
                    >
                        {saving ? (
                            <ActivityIndicator color="white" />
                        ) : (
                            <>
                                <Text style={[TYPE.callout, { fontFamily: FONTS.semibold }]} className="text-white mr-2">
                                    {step === TOTAL_STEPS ? 'Get Started' : 'Continue'}
                                </Text>
                                <ChevronRight size={18} color={COLORS.text.inverse} strokeWidth={2} />
                            </>
                        )}
                    </PressableScale>
                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
};

export default OnboardingScreen;