/**
 * OnboardingScreen: four questions, then the plan they produced.
 *
 *   1. You         name, and age on a slider
 *   2. Experience  how much the coach should explain
 *   3. Goals       what home and Learn lead with (pick any)
 *   4. Income      the starting point budgets assume until income is logged
 *   then           a summary of what those answers set up, and in
 *
 * The previous version asked and moved on, so nothing told anyone why a
 * question was there. Each step now answers back the moment it is answered,
 * with a line saying what that choice changes, and every one of those lines
 * is true of the code: experience goes into the coach prompt, goals reorder
 * the Feed and the Learn courses, the income band is the fallback the 50/30/20
 * and burn-rate screens use. Nothing here promises a feature that does not
 * read the answer.
 *
 * Name is asked because a phone sign-in arrives without one, and it is
 * prefilled for everyone else. Age was a text box that took 0 or 999; it is a
 * bounded slider with a figure that moves as it does.
 *
 * Saved once, from the summary. RootNavigator moves to the tabs as soon as
 * the profile says onboarding is complete.
 *
 * The same screen is Profile's "Your details" (route EditProfile, param
 * edit): prefilled from the profile, no confetti, and it closes on save.
 */
import React, { useMemo, useState } from 'react';
import {
    View, Text, TouchableOpacity, ScrollView, TextInput,
    KeyboardAvoidingView, Platform, ActivityIndicator, ViewStyle,
} from 'react-native';
import Animated, {
    FadeIn, FadeInDown, FadeInRight, FadeInLeft, ZoomIn, useReducedMotion,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import {
    Wallet, PiggyBank, TrendingUp, GraduationCap,
    Sprout, BookOpen, ChevronRight, ChevronLeft, Sparkles, Check,
    MessageCircle, LayoutList, Calculator, Footprints, X,
} from 'lucide-react-native';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { completeOnboarding } from '../store/slices/authSlice';
import { PressableScale } from '../components/PressableScale';
import { Slider } from '../components/learn/Slider';
import { Confetti } from '../components/Confetti';
import { incomeFromBand } from '../utils/income';
import { inr } from '../utils/moneyMath';
import * as haptics from '../utils/haptics';
import { COLORS, CATEGORY_COLORS, TYPE, RADIUS, GUTTER, FONTS, MOTION } from '../theme/tokens';

const QUESTION_STEPS = 4;
const SUMMARY_STEP = QUESTION_STEPS + 1;

// ─── Types ───────────────────────────────────────────────────────

type ExperienceLevel = 'beginner' | 'intermediate' | 'experienced';
type AppGoal = 'budgeting' | 'goals' | 'investing' | 'education';

interface OnboardingData {
    name: string;
    age: number;
    experienceLevel: ExperienceLevel | null;
    appGoals: AppGoal[];
    incomeRange: string | null;
}

const STEP_TITLES = ['About you', 'Experience', 'Your goals', 'Income'];

const EXPERIENCE: {
    value: ExperienceLevel;
    Icon: typeof Sprout;
    title: string;
    subtitle: string;
    /** What the coach prompt does with this, in the backend's own terms. */
    effect: string;
    summary: string;
}[] = [
    {
        value: 'beginner',
        Icon: Sprout,
        title: "I'm just starting out",
        subtitle: 'New to managing money and investing',
        effect: 'FinSight explains every term the first time it comes up, and never assumes you have invested before.',
        summary: 'explains every term',
    },
    {
        value: 'intermediate',
        Icon: BookOpen,
        title: 'I know the basics',
        subtitle: 'Budgets and saving, maybe not investing yet',
        effect: 'FinSight skips the beginner definitions, but still spells out investing words.',
        summary: 'skips the basics',
    },
    {
        value: 'experienced',
        Icon: TrendingUp,
        title: "I'm fairly experienced",
        subtitle: 'Comfortable with money and investing',
        effect: 'FinSight keeps it brief and gets straight to what you cannot already see.',
        summary: 'keeps it brief',
    },
];

const GOALS: {
    value: AppGoal;
    Icon: typeof Wallet;
    title: string;
    subtitle: string;
    effect: string;
}[] = [
    {
        value: 'budgeting',
        Icon: Wallet,
        title: 'Know where my money goes',
        subtitle: 'Log what you spend and set limits that hold',
        effect: 'Today points you at your first budget',
    },
    {
        value: 'goals',
        Icon: PiggyBank,
        title: 'Save for something specific',
        subtitle: 'A trip, a phone, or a buffer for bad months',
        effect: 'Today points you at your first savings goal',
    },
    {
        value: 'investing',
        Icon: TrendingUp,
        title: 'Understand investing',
        subtitle: 'What stocks, mutual funds and SIPs actually are',
        effect: 'Your Learn path starts with Grow: inflation, FDs and the SIP habit',
    },
    {
        value: 'education',
        Icon: GraduationCap,
        title: 'Get the basics straight',
        subtitle: 'Interest, inflation, taxes, credit scores',
        effect: 'Your Learn path starts with First Job: payslips and your first tax year',
    },
];

const INCOME = [
    { value: 'under_15k', label: 'Under ₹15,000', sub: 'Pocket money, a stipend or a part-time job' },
    { value: '15k_40k', label: '₹15,000 to ₹40,000', sub: 'Internship or first job' },
    { value: '40k_80k', label: '₹40,000 to ₹80,000', sub: 'Working professional' },
    { value: 'above_80k', label: '₹80,000 or more', sub: 'Senior or self-employed' },
    { value: 'prefer_not', label: 'Prefer not to say', sub: 'Budgets wait until you log income' },
];

/**
 * ₹100 a day, invested monthly at 12% a year. The same illustration the intro
 * makes, sized to this person's age so the slider changes something real.
 */
function dailyHundredBy(age: number): { amount: number; horizon: string } {
    const years = age < 35 ? 40 - age : 20;
    const monthly = 3000;
    const r = 0.12 / 12;
    const n = years * 12;
    const amount = monthly * ((Math.pow(1 + r, n) - 1) / r) * (1 + r);
    return { amount, horizon: age < 35 ? 'by the time you are 40' : 'over the next 20 years' };
}

/** 29,97,480 reads "30 lakh"; 1,24,00,000 reads "1.2 crore". */
const lakhOrCrore = (n: number): string => {
    const short = (v: number) => (Math.round(v * 10) / 10).toString();
    return n >= 1e7 ? `${short(n / 1e7)} crore` : `${short(n / 1e5)} lakh`;
};

const firstName = (name: string) => name.trim().split(/\s+/)[0] ?? '';

const timeOfDay = () => {
    const h = new Date().getHours();
    return h < 12 ? 'morning' : h < 17 ? 'afternoon' : 'evening';
};

// ─── Pieces ──────────────────────────────────────────────────────

/**
 * One accent, one tint. The selected title takes `brand.link`, which is the
 * accent-on-canvas value in both themes; `primaryDark` read about 2.5:1 on the
 * dark soft panel.
 */
const SelectCard: React.FC<{
    Icon?: typeof Wallet;
    title: string;
    subtitle?: string;
    selected: boolean;
    multi?: boolean;
    onPress: () => void;
}> = ({ Icon, title, subtitle, selected, multi, onPress }) => (
    <PressableScale
        onPress={() => { haptics.select(); onPress(); }}
        activeScale={0.98}
        accessibilityRole={multi ? 'checkbox' : 'radio'}
        accessibilityState={multi ? { checked: selected } : { selected }}
        containerStyle={{ marginBottom: 12 }}
        style={{
            borderRadius: RADIUS.card,
            borderWidth: selected ? 2 : 1,
            borderColor: selected ? COLORS.brand.primary : COLORS.border.default,
            backgroundColor: selected ? COLORS.brand.soft : COLORS.surface.primary,
            // Two pixels of border less padding, so selecting does not shunt the list.
            padding: selected ? 15 : 16,
            flexDirection: 'row',
            alignItems: 'center',
        }}
    >
        {Icon && (
            <View
                style={{
                    borderRadius: RADIUS.tile,
                    backgroundColor: selected ? COLORS.brand.primaryDark : COLORS.surface.tertiary,
                }}
                className="w-11 h-11 items-center justify-center mr-3"
            >
                <Icon size={21} color={selected ? COLORS.brand.onAccent : COLORS.text.secondary} strokeWidth={1.8} />
            </View>
        )}
        <View className="flex-1">
            <Text style={[TYPE.callout, { fontFamily: FONTS.semibold, color: selected ? COLORS.brand.link : COLORS.text.primary }]}>
                {title}
            </Text>
            {subtitle && <Text style={TYPE.caption} className="text-text-tertiary mt-0.5">{subtitle}</Text>}
        </View>
        <View
            className="w-6 h-6 items-center justify-center ml-3"
            style={{
                borderRadius: multi ? 7 : 12,
                borderWidth: selected ? 0 : 1.5,
                borderColor: COLORS.border.strong,
                backgroundColor: selected ? COLORS.brand.primaryDark : 'transparent',
            }}
        >
            {selected && (
                <Animated.View entering={ZoomIn.duration(160)}>
                    <Check size={13} color={COLORS.brand.onAccent} strokeWidth={3} />
                </Animated.View>
            )}
        </View>
    </PressableScale>
);

/** The line that answers back. Keyed on its text, so a new answer re-enters. */
const Effect: React.FC<{ text: string | null; reduced: boolean }> = ({ text, reduced }) =>
    text ? (
        <Animated.View
            key={text}
            entering={reduced ? FadeIn.duration(140) : FadeInDown.duration(220)}
            style={{
                flexDirection: 'row', alignItems: 'flex-start', marginTop: 4, padding: 14,
                borderRadius: RADIUS.control, borderWidth: 1,
                backgroundColor: COLORS.brand.soft, borderColor: COLORS.brand.edge,
            }}
        >
            <Sparkles size={15} color={COLORS.brand.link} strokeWidth={2} style={{ marginTop: 2 }} />
            <Text style={TYPE.caption} className="text-text-primary ml-2.5 flex-1">{text}</Text>
        </Animated.View>
    ) : null;

const StepHeader: React.FC<{ title: string; body: string }> = ({ title, body }) => (
    <>
        <Text style={TYPE.title} className="text-text-primary mb-2">{title}</Text>
        <Text style={TYPE.body} className="text-text-secondary mb-6">{body}</Text>
    </>
);

// ─── Steps ───────────────────────────────────────────────────────

type StepProps = { data: OnboardingData; onChange: (v: Partial<OnboardingData>) => void; reduced: boolean };

const StepYou: React.FC<StepProps> = ({ data, onChange, reduced }) => {
    const [focused, setFocused] = useState(false);
    const first = firstName(data.name);
    const growth = dailyHundredBy(data.age);
    return (
        <View>
            <StepHeader
                title={first ? `Good ${timeOfDay()}, ${first}` : 'First, what should we call you?'}
                body={first
                    ? 'Four quick questions and FinSight is set up around you.'
                    : 'This is the name FinSight greets you with. You can change it later in Profile.'}
            />

            <Text style={TYPE.micro} className="text-text-tertiary mb-2">Your name</Text>
            <TextInput
                className="bg-surface-primary rounded-control px-4 h-[56px] text-lg text-text-primary font-inter-semibold"
                style={{ borderWidth: 1, borderColor: focused ? COLORS.brand.primary : COLORS.border.default }}
                placeholder="e.g. Priya Sharma"
                placeholderTextColor={COLORS.text.tertiary}
                value={data.name}
                onChangeText={(v) => onChange({ name: v })}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
                autoCapitalize="words"
                textContentType="name"
                autoComplete="name"
                maxLength={40}
                returnKeyType="done"
            />

            <View className="flex-row items-end justify-between mt-7 mb-1">
                <Text style={TYPE.micro} className="text-text-tertiary">Your age</Text>
                <Animated.Text
                    key={data.age}
                    entering={reduced ? undefined : FadeIn.duration(120)}
                    style={[TYPE.display, { color: COLORS.text.primary, fontVariant: ['tabular-nums'] }]}
                >
                    {data.age}
                </Animated.Text>
            </View>
            <Slider
                label="Drag to set your age"
                value={data.age}
                min={15}
                max={60}
                step={1}
                onChange={(v) => onChange({ age: v })}
                // The figure is already printed large above the track.
                format={() => ''}
                minLabel="15"
                maxLabel="60"
            />

            <View className="bg-brand-primary-dark p-4" style={{ borderRadius: RADIUS.card }}>
                <Text style={TYPE.micro} className="text-brand-edge">Why age matters</Text>
                <Text style={TYPE.callout} className="text-white mt-1.5">
                    ₹100 a day, invested {growth.horizon}, could grow to{' '}
                    <Text style={{ fontFamily: FONTS.bold }}>₹{lakhOrCrore(growth.amount)}</Text>.
                </Text>
                <Text style={TYPE.caption} className="text-brand-on-dark mt-1.5">
                    An illustration at 12% a year, not a promise. Tips are pitched at your age too.
                </Text>
            </View>
        </View>
    );
};

const StepExperience: React.FC<StepProps> = ({ data, onChange, reduced }) => {
    const chosen = EXPERIENCE.find((e) => e.value === data.experienceLevel);
    return (
        <View>
            <StepHeader
                title="How comfortable are you with money?"
                body="There is no wrong answer. It changes how much FinSight explains."
            />
            {EXPERIENCE.map((opt) => (
                <SelectCard
                    key={opt.value}
                    Icon={opt.Icon}
                    title={opt.title}
                    subtitle={opt.subtitle}
                    selected={data.experienceLevel === opt.value}
                    onPress={() => onChange({ experienceLevel: opt.value })}
                />
            ))}
            <Effect text={chosen?.effect ?? null} reduced={reduced} />
        </View>
    );
};

const StepGoals: React.FC<StepProps> = ({ data, onChange, reduced }) => {
    const toggle = (value: AppGoal) => {
        const current = data.appGoals;
        onChange({
            appGoals: current.includes(value) ? current.filter((g) => g !== value) : [...current, value],
        });
    };
    const effects = GOALS.filter((g) => data.appGoals.includes(g.value)).map((g) => g.effect);
    return (
        <View>
            <StepHeader
                title="What are you here for?"
                body="Pick as many as you like. Your next steps and the Learn tab are ordered around these."
            />
            {GOALS.map((opt) => (
                <SelectCard
                    key={opt.value}
                    Icon={opt.Icon}
                    title={opt.title}
                    subtitle={opt.subtitle}
                    multi
                    selected={data.appGoals.includes(opt.value)}
                    onPress={() => toggle(opt.value)}
                />
            ))}
            <Effect text={effects.length ? `${effects.join('. ')}.` : null} reduced={reduced} />
        </View>
    );
};

/** The 50/30/20 split of the band's midpoint, drawn as one bar. */
const SplitPreview: React.FC<{ income: number; reduced: boolean }> = ({ income, reduced }) => {
    const parts = [
        { label: 'Needs', share: 0.5, color: CATEGORY_COLORS.housing },
        { label: 'Wants', share: 0.3, color: CATEGORY_COLORS.shopping },
        { label: 'Savings', share: 0.2, color: COLORS.semantic.profit },
    ];
    return (
        <Animated.View
            key={income}
            entering={reduced ? FadeIn.duration(140) : FadeInDown.duration(220)}
            style={{
                marginTop: 4, padding: 16, borderRadius: RADIUS.card, borderWidth: 1,
                backgroundColor: COLORS.surface.primary, borderColor: COLORS.border.default,
            }}
        >
            <Text style={TYPE.micro} className="text-text-tertiary">A starting budget for about ₹{inr(income)}</Text>
            <View className="flex-row h-2.5 mt-3 mb-3 overflow-hidden" style={{ borderRadius: 6, gap: 3 }}>
                {parts.map((p) => (
                    <View key={p.label} style={{ flex: p.share, backgroundColor: p.color }} />
                ))}
            </View>
            <View className="flex-row justify-between">
                {parts.map((p) => (
                    <View key={p.label}>
                        <View className="flex-row items-center">
                            <View className="w-2 h-2 rounded-full mr-1.5" style={{ backgroundColor: p.color }} />
                            <Text style={TYPE.caption} className="text-text-secondary">{p.label}</Text>
                        </View>
                        <Text style={TYPE.amountSm} className="text-text-primary mt-0.5">₹{inr(income * p.share)}</Text>
                    </View>
                ))}
            </View>
            <Text style={TYPE.caption} className="text-text-tertiary mt-3">
                The 50/30/20 rule. Log your real income and every screen switches to that figure instead.
            </Text>
        </Animated.View>
    );
};

const StepIncome: React.FC<StepProps> = ({ data, onChange, reduced }) => {
    const income = incomeFromBand(data.incomeRange ?? undefined);
    return (
        <View>
            <StepHeader
                title="Roughly what comes in each month?"
                body="Pocket money, stipend or salary. Only the range is kept, never an exact figure."
            />
            {INCOME.map((opt) => (
                <SelectCard
                    key={opt.value}
                    title={opt.label}
                    subtitle={opt.sub}
                    selected={data.incomeRange === opt.value}
                    onPress={() => onChange({ incomeRange: opt.value })}
                />
            ))}
            {income > 0 ? (
                <SplitPreview income={income} reduced={reduced} />
            ) : (
                <Effect
                    text={data.incomeRange === 'prefer_not'
                        ? 'That is fine. Budgets and the savings rate wait until you log your first income.'
                        : null}
                    reduced={reduced}
                />
            )}
        </View>
    );
};

/** What the four answers set up, row by row. */
const Summary: React.FC<{ data: OnboardingData; reduced: boolean; editing: boolean }> = ({ data, reduced, editing }) => {
    const exp = EXPERIENCE.find((e) => e.value === data.experienceLevel);
    const income = incomeFromBand(data.incomeRange ?? undefined);
    const firstStep = data.appGoals.includes('budgeting')
        ? 'Your first lesson, then your first budget'
        : data.appGoals.includes('goals')
            ? 'Your first lesson, then your first savings goal'
            : 'Your first three-minute lesson';

    const rows = [
        { Icon: MessageCircle, title: 'How FinSight talks to you', body: `Tuned for age ${data.age}, and ${exp?.summary ?? 'keeps it plain'}.` },
        {
            Icon: LayoutList,
            title: 'Your daily habit',
            body: 'Fini, a three-minute lesson and a ten-second money check-in, every day on Today.',
        },
        {
            Icon: Calculator,
            title: 'Your budgets',
            body: income > 0
                ? `Start from about ₹${inr(income)} a month until you log real income.`
                : 'Wait for your first logged income, so nothing is guessed.',
        },
        { Icon: Footprints, title: 'Your first step', body: `${firstStep}.` },
    ];

    return (
        <View>
            <Animated.View
                entering={reduced ? FadeIn.duration(160) : ZoomIn.duration(320)}
                style={{
                    width: 64, height: 64, marginBottom: 20, borderRadius: RADIUS.pill,
                    alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.brand.primaryDark,
                }}
            >
                <Check size={30} color={COLORS.brand.onAccent} strokeWidth={2.6} />
            </Animated.View>
            <Text style={TYPE.title} className="text-text-primary mb-2">
                {editing
                    ? 'Your plan, updated'
                    : firstName(data.name) ? `You're set, ${firstName(data.name)}` : "You're set"}
            </Text>
            <Text style={TYPE.body} className="text-text-secondary mb-6">
                Here is what your answers change. You can edit them any time from Profile.
            </Text>
            {rows.map((row, i) => (
                <Animated.View
                    key={row.title}
                    entering={reduced ? FadeIn.duration(160) : FadeInDown.delay(120 + i * 110).duration(260)}
                    style={{
                        flexDirection: 'row', alignItems: 'flex-start', padding: 16, marginBottom: 12,
                        borderRadius: RADIUS.card, borderWidth: 1,
                        backgroundColor: COLORS.surface.primary, borderColor: COLORS.border.default,
                    }}
                >
                    <View className="w-10 h-10 bg-brand-soft items-center justify-center mr-3" style={{ borderRadius: RADIUS.tile }}>
                        <row.Icon size={19} color={COLORS.brand.link} strokeWidth={1.8} />
                    </View>
                    <View className="flex-1">
                        <Text style={[TYPE.callout, { fontFamily: FONTS.semibold }]} className="text-text-primary">{row.title}</Text>
                        <Text style={TYPE.caption} className="text-text-secondary mt-0.5">{row.body}</Text>
                    </View>
                </Animated.View>
            ))}
        </View>
    );
};

// ─── Screen ──────────────────────────────────────────────────────

const OnboardingScreen: React.FC = () => {
    const dispatch = useAppDispatch();
    const navigation = useNavigation();
    const editing = (useRoute().params as { edit?: boolean } | undefined)?.edit === true;
    const { user, profile, error } = useAppSelector((state) => state.auth);

    const reduced = useReducedMotion();
    const [step, setStep] = useState(1);
    // Which way the step last moved, so the incoming panel enters from the
    // side the user pushed it from. Without this, back reads as forward.
    const [direction, setDirection] = useState<'forward' | 'back'>('forward');
    const [saving, setSaving] = useState(false);

    // Prefilled from the profile, which is empty for a new account and holds
    // the earlier answers when this is opened from Profile to edit them.
    const [data, setData] = useState<OnboardingData>(() => ({
        name: user?.displayName || profile?.name || '',
        age: profile?.age && profile.age >= 15 && profile.age <= 60 ? profile.age : 20,
        experienceLevel: profile?.experienceLevel ?? null,
        appGoals: profile?.appGoals ?? [],
        incomeRange: profile?.incomeRange ?? null,
    }));

    const updateData = (partial: Partial<OnboardingData>) => setData((prev) => ({ ...prev, ...partial }));

    const canProceed = useMemo(() => {
        switch (step) {
            case 1: return data.name.trim().length >= 1;
            case 2: return data.experienceLevel !== null;
            case 3: return data.appGoals.length > 0;
            case 4: return data.incomeRange !== null;
            case SUMMARY_STEP: return true;
            default: return false;
        }
    }, [step, data]);

    const hint = !canProceed
        ? step === 1 ? 'Add your name to continue'
            : step === 3 ? 'Pick at least one'
                : 'Pick one to continue'
        : null;

    const handleFinish = async () => {
        if (!user?.uid || saving) return;
        setSaving(true);
        const result = await dispatch(completeOnboarding({
            uid: user.uid,
            data: {
                name: data.name.trim(),
                age: data.age,
                experienceLevel: data.experienceLevel!,
                appGoals: data.appGoals,
                incomeRange: data.incomeRange!,
            },
        }));
        // The buzz used to fire whether or not the save landed, which told a
        // user their answers were in at the exact moment they were lost.
        if (completeOnboarding.fulfilled.match(result)) {
            if (editing) {
                haptics.success();
                navigation.goBack();
            } else {
                haptics.celebrate();
            }
        } else {
            haptics.error();
            setSaving(false);
        }
        // RootNavigator re-renders automatically when profile.onboardingComplete = true
    };

    const goNext = () => {
        if (!canProceed) return;
        if (step === SUMMARY_STEP) {
            handleFinish();
            return;
        }
        haptics.tap();
        setDirection('forward');
        setStep(step + 1);
        if (step + 1 === SUMMARY_STEP) haptics.success();
    };

    const goBack = () => {
        if (saving) return;
        if (step <= 1) {
            if (editing) navigation.goBack();
            return;
        }
        haptics.tap();
        setDirection('back');
        setStep(step - 1);
    };

    const onSummary = step === SUMMARY_STEP;

    return (
        <SafeAreaView className="flex-1 bg-surface-secondary" edges={['top', 'bottom']}>
            <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
                {/* Progress: one segment per question, filled as each is answered. */}
                <View className="pt-4 pb-2" style={{ paddingHorizontal: GUTTER }}>
                    <View className="flex-row items-center justify-between mb-2.5 h-5">
                        <Text style={TYPE.micro} className="text-text-tertiary">
                            {onSummary ? 'All done' : `Step ${step} of ${QUESTION_STEPS} · ${STEP_TITLES[step - 1]}`}
                        </Text>
                    </View>
                    <View className="flex-row" style={{ gap: 6 }}>
                        {Array.from({ length: QUESTION_STEPS }, (_, i) => (
                            <View key={i} className="flex-1 h-1.5 bg-surface-tertiary rounded-full overflow-hidden">
                                {/* Width, not scaleX: the fill is childless and clipped,
                                    so nothing re-lays-out, and the rounded cap survives. */}
                                <Animated.View
                                    style={{
                                        height: '100%',
                                        borderRadius: 999,
                                        backgroundColor: COLORS.brand.primaryDark,
                                        width: i + 1 < step || onSummary ? '100%' : i + 1 === step ? '50%' : '0%',
                                        transitionProperty: ['width'],
                                        transitionDuration: reduced ? 0 : MOTION.enter,
                                        transitionTimingFunction: 'ease-out',
                                    } as ViewStyle}
                                />
                            </View>
                        ))}
                    </View>
                </View>

                <ScrollView
                    className="flex-1"
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                    contentContainerStyle={{ paddingHorizontal: GUTTER, paddingTop: 20, paddingBottom: 24 }}
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
                        {step === 1 && <StepYou data={data} onChange={updateData} reduced={reduced} />}
                        {step === 2 && <StepExperience data={data} onChange={updateData} reduced={reduced} />}
                        {step === 3 && <StepGoals data={data} onChange={updateData} reduced={reduced} />}
                        {step === 4 && <StepIncome data={data} onChange={updateData} reduced={reduced} />}
                        {onSummary && <Summary data={data} reduced={reduced} editing={editing} />}
                    </Animated.View>
                </ScrollView>

                {error && (
                    <View className="pb-2" style={{ paddingHorizontal: GUTTER }}>
                        <Text style={TYPE.caption} className="text-loss text-center">{error}</Text>
                    </View>
                )}

                <View className="pb-4 pt-2 flex-row gap-3" style={{ paddingHorizontal: GUTTER }}>
                    {(step > 1 || editing) && (
                        <TouchableOpacity
                            onPress={goBack}
                            disabled={saving}
                            className="items-center justify-center border border-border-strong rounded-pill h-[52px] w-[52px]"
                            activeOpacity={0.7}
                            accessibilityRole="button"
                            accessibilityLabel={step > 1 ? 'Back' : 'Close without saving'}
                        >
                            {step > 1
                                ? <ChevronLeft size={20} color={COLORS.text.secondary} />
                                : <X size={20} color={COLORS.text.secondary} />}
                        </TouchableOpacity>
                    )}

                    <PressableScale
                        onPress={goNext}
                        disabled={!canProceed || saving}
                        accessibilityRole="button"
                        accessibilityHint={hint ?? undefined}
                        containerStyle={{ flex: 1 }}
                        style={{
                            backgroundColor: COLORS.brand.primaryDark,
                            opacity: canProceed && !saving ? 1 : 0.45,
                            borderRadius: RADIUS.pill,
                            height: 52,
                            flexDirection: 'row',
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}
                    >
                        {saving ? (
                            <ActivityIndicator color={COLORS.brand.onAccent} />
                        ) : (
                            <>
                                <Text style={[TYPE.callout, { fontFamily: FONTS.semibold, color: COLORS.brand.onAccent }]} className="mr-2">
                                    {onSummary
                                        ? editing ? 'Save changes' : 'Take me to FinSight'
                                        : hint ?? (step === QUESTION_STEPS ? 'See my plan' : 'Continue')}
                                </Text>
                                {canProceed && <ChevronRight size={18} color={COLORS.brand.onAccent} strokeWidth={2} />}
                            </>
                        )}
                    </PressableScale>
                </View>
            </KeyboardAvoidingView>

            <Confetti active={onSummary && !reduced && !editing} count={36} />
        </SafeAreaView>
    );
};

export default OnboardingScreen;
