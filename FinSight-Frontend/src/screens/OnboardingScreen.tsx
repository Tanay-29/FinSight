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

const SelectCard: React.FC<{
    /** Omitted by steps whose options read fine without one. */
    icon?: React.ReactNode;
    title: string;
    subtitle?: string;
    selected: boolean;
    onPress: () => void;
    accent?: string;
}> = ({ icon, title, subtitle, selected, onPress, accent = '#6366F1' }) => (
    <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.8}
        style={{
            borderWidth: selected ? 2 : 1,
            borderColor: selected ? accent : '#E5E7EB',
            backgroundColor: selected ? `${accent}10` : '#FFFFFF',
        }}
        className="rounded-2xl p-4 mb-3 flex-row items-center"
        accessible
        accessibilityRole="button"
        accessibilityState={{ selected }}
    >
        {icon && (
            <View
                style={{ backgroundColor: selected ? accent : '#F3F4F6' }}
                className="w-11 h-11 rounded-xl items-center justify-center mr-3"
            >
                {icon}
            </View>
        )}
        <View className="flex-1">
            <Text
                style={{ color: selected ? accent : '#1F2937' }}
                className="text-base font-semibold"
            >
                {title}
            </Text>
            {subtitle && (
                <Text className="text-xs text-gray-400 mt-0.5">{subtitle}</Text>
            )}
        </View>
        {selected && (
            <View
                style={{ backgroundColor: accent }}
                className="w-6 h-6 rounded-full items-center justify-center"
            >
                <Check size={13} color="white" strokeWidth={3} />
            </View>
        )}
    </TouchableOpacity>
);

// ─── Step content components ──────────────────────────────────────

const Step1Age: React.FC<{
    data: OnboardingData;
    onChange: (v: Partial<OnboardingData>) => void;
}> = ({ data, onChange }) => (
    <View className="flex-1 px-6 pt-6">
        <View className="w-16 h-16 rounded-2xl bg-indigo-50 items-center justify-center mb-5">
            <Sparkles size={30} color="#6366F1" />
        </View>
        <Text className="text-3xl font-bold text-gray-900 mb-2">
            Let's get to know you
        </Text>
        <Text className="text-base text-gray-500 mb-8 leading-6">
            We personalise your experience and learning paths based on where you are in life.
        </Text>

        <Text className="text-sm font-semibold text-gray-600 mb-2">Your age</Text>
        <TextInput
            className="bg-gray-50 border border-gray-200 rounded-2xl px-5 py-4 text-2xl font-bold text-gray-900"
            placeholder="e.g. 22"
            placeholderTextColor="#D1D5DB"
            keyboardType="number-pad"
            value={data.age}
            onChangeText={(v) => onChange({ age: v })}
            maxLength={3}
        />
        <Text className="text-xs text-gray-400 mt-2">
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
            icon: <Baby size={22} color={data.experienceLevel === 'beginner' ? '#FFFFFF' : '#6B7280'} />,
            title: "I'm just starting out",
            subtitle: 'New to managing money and investing',
        },
        {
            value: 'intermediate',
            icon: <BookOpen size={22} color={data.experienceLevel === 'intermediate' ? '#FFFFFF' : '#6B7280'} />,
            title: 'I know the basics',
            subtitle: 'Familiar with budgets, some savings',
        },
        {
            value: 'experienced',
            icon: <TrendingUp size={22} color={data.experienceLevel === 'experienced' ? '#FFFFFF' : '#6B7280'} />,
            title: "I'm fairly experienced",
            subtitle: 'Active investor or financial planner',
        },
    ];

    return (
        <View className="flex-1 px-6 pt-6">
            <Text className="text-3xl font-bold text-gray-900 mb-2">
                How comfortable are you with money?
            </Text>
            <Text className="text-base text-gray-500 mb-7 leading-6">
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
        accent: string;
    }> = [
        {
            value: 'budgeting',
            icon: <Wallet size={22} color={data.appGoals.includes('budgeting') ? '#FFFFFF' : '#6B7280'} />,
            title: 'Track & manage money',
            subtitle: 'Log expenses, set budgets, spot leaks',
            accent: '#6366F1',
        },
        {
            value: 'goals',
            icon: <PiggyBank size={22} color={data.appGoals.includes('goals') ? '#FFFFFF' : '#6B7280'} />,
            title: 'Build savings goals',
            subtitle: 'Trip fund, emergency fund, big purchases',
            accent: '#10B981',
        },
        {
            value: 'investing',
            icon: <TrendingUp size={22} color={data.appGoals.includes('investing') ? '#FFFFFF' : '#6B7280'} />,
            title: 'Learn to invest',
            subtitle: 'Stocks, mutual funds, SIPs explained simply',
            accent: '#F59E0B',
        },
        {
            value: 'education',
            icon: <GraduationCap size={22} color={data.appGoals.includes('education') ? '#FFFFFF' : '#6B7280'} />,
            title: 'Learn financial concepts',
            subtitle: 'Interest, taxes, inflation, credit scores',
            accent: '#8B5CF6',
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
        <View className="flex-1 px-6 pt-6">
            <Text className="text-3xl font-bold text-gray-900 mb-2">
                What are you here for?
            </Text>
            <Text className="text-base text-gray-500 mb-2 leading-6">
                Pick as many as you like - you can always change this later.
            </Text>
            <Text className="text-xs text-indigo-500 font-semibold mb-6">
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
                    accent={opt.accent}
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
        <View className="flex-1 px-6 pt-6">
            <Text className="text-3xl font-bold text-gray-900 mb-2">
                Your monthly income range
            </Text>
            <Text className="text-base text-gray-500 mb-7 leading-6">
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
        accent: string;
    }> = [
        {
            value: 'conservative',
            icon: <Shield size={22} color={data.riskProfile === 'conservative' ? '#FFFFFF' : '#6B7280'} />,
            title: "Sell - I can't risk it",
            subtitle: 'Safety first. Prefer stability over returns.',
            accent: '#10B981',
        },
        {
            value: 'moderate',
            icon: <Minus size={22} color={data.riskProfile === 'moderate' ? '#FFFFFF' : '#6B7280'} />,
            title: "Hold - I'll wait it out",
            subtitle: 'Comfortable with short-term dips.',
            accent: '#F59E0B',
        },
        {
            value: 'aggressive',
            icon: <Zap size={22} color={data.riskProfile === 'aggressive' ? '#FFFFFF' : '#6B7280'} />,
            title: 'Buy more - great discount!',
            subtitle: 'Long-term growth is the goal.',
            accent: '#6366F1',
        },
    ];

    return (
        <View className="flex-1 px-6 pt-6">
            <Text className="text-3xl font-bold text-gray-900 mb-2">
                Your risk comfort
            </Text>
            <Text className="text-base text-gray-500 mb-3 leading-6">
                Imagine your investments drop 20% in a month. What would you do?
            </Text>
            <Text className="text-xs text-gray-400 mb-7">
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
                    accent={opt.accent}
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
        <SafeAreaView className="flex-1 bg-white" edges={['top', 'bottom']}>
            <KeyboardAvoidingView
                className="flex-1"
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            >
                {/* Progress bar */}
                <View className="px-6 pt-4">
                    <View className="flex-row items-center justify-between mb-2">
                        <Text className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                            Step {step} of {TOTAL_STEPS} · {STEP_TITLES[step - 1]}
                        </Text>
                        <Text className="text-xs text-gray-400">
                            {Math.round((step / TOTAL_STEPS) * 100)}%
                        </Text>
                    </View>
                    <View className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        {/* Width, not scaleX: the fill is childless and clipped,
                            so nothing re-lays-out, and the rounded cap survives. */}
                        <Animated.View
                            className="h-full bg-indigo-500 rounded-full"
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
                    <View className="px-6 pb-1">
                        <Text className="text-loss text-sm leading-5">{error}</Text>
                    </View>
                )}

                {/* Navigation buttons */}
                <View className="px-6 pb-4 flex-row gap-3">
                    {step > 1 && (
                        <TouchableOpacity
                            onPress={goBack}
                            className="flex-row items-center justify-center border border-gray-200 rounded-2xl py-4 px-5"
                            activeOpacity={0.7}
                        >
                            <ChevronLeft size={20} color="#6B7280" />
                        </TouchableOpacity>
                    )}

                    <PressableScale
                        onPress={goNext}
                        disabled={!canProceed() || saving}
                        accessibilityRole="button"
                        containerStyle={{ flex: 1 }}
                        style={{ opacity: canProceed() && !saving ? 1 : 0.45 }}
                        className="flex-row items-center justify-center bg-indigo-600 rounded-2xl py-4"
                    >
                        {saving ? (
                            <ActivityIndicator color="white" />
                        ) : (
                            <>
                                <Text className="text-white font-bold text-base mr-2">
                                    {step === TOTAL_STEPS ? 'Get Started' : 'Continue'}
                                </Text>
                                <ChevronRight size={18} color="white" />
                            </>
                        )}
                    </PressableScale>
                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
};

export default OnboardingScreen;