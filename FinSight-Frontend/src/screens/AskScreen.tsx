/**
 * AskScreen: ask any money question, get a working tool instead of a paragraph.
 *
 * The question goes to askService, which picks one of the calculators in
 * utils/askTools.ts and its starting values. The screen then builds the tool
 * in front of the learner: the figures, a chart that draws itself in, and the
 * sliders, so the answer is something to play with. Moving a slider changes
 * every figure at once; that is the lesson.
 *
 * Everything on screen is computed in code. The model chooses the tool and
 * may add one line on what to look at; if it is unreachable, an offline
 * matcher chooses instead and the tool works the same.
 */
import React, { useEffect, useRef, useState } from 'react';
import { View, Text, ScrollView, TextInput, Pressable, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeIn, FadeInDown, useReducedMotion } from 'react-native-reanimated';
import { useNavigation, useRoute } from '@react-navigation/native';
import { ArrowLeft, ArrowUp, Check, Sparkles, Info, RotateCcw } from 'lucide-react-native';
import { pickTool, AskPick } from '../services/askService';
import { findTool, formatFigure, formatParam, ToolFigure } from '../utils/askTools';
import { Slider } from '../components/learn/Slider';
import { LinesChart, BarsChart } from '../components/ask/ToolChart';
import { AnimatedNumber } from '../components/AnimatedNumber';
import { PressableScale } from '../components/PressableScale';
import * as haptics from '../utils/haptics';
import { COLORS, FONTS, TYPE, GUTTER, RADIUS } from '../theme/tokens';

export const ASK_SUGGESTIONS = [
    'Should I buy an iPhone on no-cost EMI?',
    'What if I only pay the minimum on my credit card?',
    'Is it better to rent or buy a flat?',
    'If I invest 5,000 a month for 20 years?',
    'Does it matter if I start investing at 28 instead of 22?',
    'Is my FD beating inflation?',
];

type Stage = 'idle' | 'reading' | 'choosing' | 'building' | 'ready';

const STEPS: { stage: Stage; label: string }[] = [
    { stage: 'reading', label: 'Reading your question' },
    { stage: 'choosing', label: 'Choosing the right tool' },
    { stage: 'building', label: 'Setting it to your numbers' },
];
const ORDER: Stage[] = ['idle', 'reading', 'choosing', 'building', 'ready'];

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

const Figure: React.FC<{ f: ToolFigure; big?: boolean }> = ({ f, big }) => {
    const colour = f.tone === 'bad' ? COLORS.semantic.alertCritical : f.tone === 'good' ? COLORS.semantic.profit : COLORS.text.primary;
    return (
        <View style={{ flex: 1, padding: 12, borderRadius: RADIUS.tile, backgroundColor: COLORS.surface.primary, borderWidth: 1, borderColor: COLORS.border.default }}>
            <Text numberOfLines={2} style={{ fontFamily: FONTS.medium, fontSize: 11, lineHeight: 14, color: COLORS.text.tertiary, minHeight: 28 }}>{f.label}</Text>
            {Number.isFinite(f.value) ? (
                <AnimatedNumber
                    value={f.value}
                    duration={320}
                    format={(v) => formatFigure({ ...f, value: f.unit === 'months' ? Math.round(v) : v })}
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    style={{ ...TYPE.amountMd, fontSize: big ? 20 : 17, marginTop: 4, color: colour }}
                />
            ) : (
                <Text style={{ ...TYPE.amountMd, fontSize: 15, marginTop: 4, color: COLORS.semantic.alertCritical }}>{formatFigure(f)}</Text>
            )}
        </View>
    );
};

const AskScreen: React.FC = () => {
    const navigation = useNavigation<any>();
    const route = useRoute<any>();
    const reduced = useReducedMotion();
    const scrollRef = useRef<ScrollView>(null);

    const [question, setQuestion] = useState<string>(route.params?.question ?? '');
    const [asked, setAsked] = useState('');
    const [stage, setStage] = useState<Stage>('idle');
    const [pick, setPick] = useState<AskPick | null>(null);
    const [values, setValues] = useState<Record<string, number>>({});
    const runId = useRef(0);

    const ask = async (q: string) => {
        const text = q.trim();
        if (!text) return;
        haptics.commit();
        const id = ++runId.current;
        setAsked(text);
        setPick(null);
        setStage('reading');
        const started = Date.now();
        const resultP = pickTool(text);
        await wait(450);
        if (id !== runId.current) return;
        setStage('choosing');
        const result = await resultP;
        // Let each step be seen, however fast the model was.
        const elapsed = Date.now() - started;
        if (elapsed < 1100) await wait(1100 - elapsed);
        if (id !== runId.current) return;
        setStage('building');
        await wait(420);
        if (id !== runId.current) return;
        setPick(result);
        setValues(result.values);
        setStage('ready');
        haptics.success();
    };

    // A question handed over from Today runs straight away.
    useEffect(() => {
        const handed: string | undefined = route.params?.question;
        if (!handed) return;
        // After the screen has painted, so the steps animate in rather than
        // the first one being skipped during the push transition.
        const t = setTimeout(() => ask(handed), 250);
        return () => clearTimeout(t);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const tool = pick ? findTool(pick.toolId) : undefined;
    const result = tool ? tool.compute(values) : null;
    const busy = stage === 'reading' || stage === 'choosing' || stage === 'building';

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.surface.secondary }} edges={['top']}>
            <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
                <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: GUTTER, paddingTop: 8, paddingBottom: 10 }}>
                    <Pressable
                        onPress={() => { haptics.tap(); navigation.goBack(); }}
                        hitSlop={12}
                        accessibilityRole="button"
                        accessibilityLabel="Back"
                        style={{ width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.surface.primary, borderWidth: 1, borderColor: COLORS.border.default }}
                    >
                        <ArrowLeft size={18} color={COLORS.text.primary} />
                    </Pressable>
                    <Text style={{ ...TYPE.heading, color: COLORS.text.primary, marginLeft: 12 }}>Ask anything</Text>
                </View>

                <ScrollView ref={scrollRef} contentContainerStyle={{ paddingHorizontal: GUTTER, paddingBottom: 40 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
                    {/* The question box */}
                    <View style={{ flexDirection: 'row', alignItems: 'flex-end', padding: 6, paddingLeft: 14, borderRadius: 24, backgroundColor: COLORS.surface.primary, borderWidth: 1, borderColor: COLORS.border.default }}>
                        <TextInput
                            value={question}
                            onChangeText={setQuestion}
                            placeholder="A money question, in your words"
                            placeholderTextColor={COLORS.text.tertiary}
                            multiline
                            maxLength={200}
                            onSubmitEditing={() => ask(question)}
                            blurOnSubmit
                            returnKeyType="send"
                            accessibilityLabel="Your question"
                            style={{ flex: 1, ...TYPE.body, fontSize: 16, color: COLORS.text.primary, paddingVertical: 8, maxHeight: 96 }}
                        />
                        <PressableScale
                            onPress={() => ask(question)}
                            disabled={!question.trim() || busy}
                            activeScale={0.92}
                            accessibilityRole="button"
                            accessibilityLabel="Ask"
                            style={{ width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: question.trim() && !busy ? COLORS.brand.primaryDark : COLORS.surface.tertiary }}
                        >
                            <ArrowUp size={20} color={question.trim() && !busy ? COLORS.brand.onAccent : COLORS.text.tertiary} strokeWidth={2.5} />
                        </PressableScale>
                    </View>

                    {/* Before anything is asked: ideas */}
                    {stage === 'idle' ? (
                        <Animated.View entering={reduced ? FadeIn.duration(150) : FadeInDown.duration(260)} style={{ marginTop: 18 }}>
                            <Text style={{ ...TYPE.micro, color: COLORS.text.tertiary, marginBottom: 10 }}>Try one</Text>
                            {ASK_SUGGESTIONS.map((s) => (
                                <PressableScale
                                    key={s}
                                    onPress={() => { setQuestion(s); ask(s); }}
                                    activeScale={0.98}
                                    accessibilityRole="button"
                                    style={{ flexDirection: 'row', alignItems: 'center', padding: 14, marginBottom: 8, borderRadius: RADIUS.tile, backgroundColor: COLORS.surface.primary, borderWidth: 1, borderColor: COLORS.border.default }}
                                >
                                    <Sparkles size={15} color={COLORS.brand.link} />
                                    <Text style={{ ...TYPE.callout, color: COLORS.text.primary, marginLeft: 10, flex: 1 }}>{s}</Text>
                                </PressableScale>
                            ))}
                            <Text style={{ ...TYPE.caption, color: COLORS.text.tertiary, marginTop: 6 }}>
                                You get a tool to play with, not a paragraph. Every number is worked out in the app.
                            </Text>
                        </Animated.View>
                    ) : null}

                    {/* While it works: the steps, ticking off */}
                    {busy ? (
                        <Animated.View entering={FadeIn.duration(180)} style={{ marginTop: 22 }}>
                            <Text numberOfLines={3} style={{ ...TYPE.callout, color: COLORS.text.secondary, marginBottom: 16 }}>"{asked}"</Text>
                            {STEPS.map((s) => {
                                const done = ORDER.indexOf(stage) > ORDER.indexOf(s.stage);
                                const active = stage === s.stage;
                                return (
                                    <View key={s.stage} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 14, opacity: done || active ? 1 : 0.35 }}>
                                        <View style={{ width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: done ? COLORS.semantic.profit : active ? COLORS.brand.soft : COLORS.surface.tertiary, borderWidth: active ? 2 : 0, borderColor: COLORS.brand.primary }}>
                                            {done ? <Check size={14} color={COLORS.brand.onAccent} strokeWidth={3} /> : null}
                                        </View>
                                        <Text style={{ ...TYPE.callout, color: COLORS.text.primary, marginLeft: 12 }}>{s.label}</Text>
                                    </View>
                                );
                            })}
                            {/* A skeleton of what is coming */}
                            <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
                                {[0, 1, 2].map((i) => <View key={i} style={{ flex: 1, height: 64, borderRadius: RADIUS.tile, backgroundColor: COLORS.surface.tertiary }} />)}
                            </View>
                            <View style={{ height: 150, borderRadius: RADIUS.tile, backgroundColor: COLORS.surface.tertiary, marginTop: 10 }} />
                        </Animated.View>
                    ) : null}

                    {/* The tool */}
                    {stage === 'ready' && tool && result ? (
                        <View style={{ marginTop: 20 }}>
                            <Animated.View entering={reduced ? FadeIn.duration(150) : FadeInDown.duration(280)}>
                                <Text numberOfLines={2} style={{ ...TYPE.caption, color: COLORS.text.tertiary }}>"{asked}"</Text>
                                <Text style={{ ...TYPE.title, color: COLORS.text.primary, marginTop: 6 }}>{tool.title}</Text>
                                <Text style={{ ...TYPE.body, fontSize: 15, lineHeight: 22, color: COLORS.text.secondary, marginTop: 6 }}>
                                    {pick?.lookFor ?? 'Move the sliders and watch every number change.'}
                                </Text>
                            </Animated.View>

                            <Animated.View entering={reduced ? FadeIn.duration(150) : FadeInDown.delay(120).duration(280)} style={{ flexDirection: 'row', gap: 8, marginTop: 16 }}>
                                {result.figures.map((f, i) => <Figure key={i} f={f} big={i === 1} />)}
                            </Animated.View>

                            <Animated.View
                                entering={reduced ? FadeIn.duration(150) : FadeInDown.delay(240).duration(280)}
                                style={{ marginTop: 12, padding: 14, borderRadius: RADIUS.card, backgroundColor: COLORS.surface.primary, borderWidth: 1, borderColor: COLORS.border.default }}
                            >
                                {result.series && result.xUnit ? (
                                    <LinesChart series={result.series} xUnit={result.xUnit} drawKey={`${tool.id}:${asked}`} />
                                ) : result.bars ? (
                                    <BarsChart bars={result.bars} />
                                ) : null}
                            </Animated.View>

                            <Animated.View
                                entering={reduced ? FadeIn.duration(150) : FadeInDown.delay(360).duration(280)}
                                style={{ marginTop: 12, padding: 16, borderRadius: RADIUS.card, backgroundColor: COLORS.brand.soft, borderWidth: 1, borderColor: COLORS.brand.edge }}
                            >
                                <Text style={{ ...TYPE.heading, fontSize: 17, lineHeight: 24, color: COLORS.text.primary }}>{result.insight}</Text>
                            </Animated.View>

                            <Animated.View
                                entering={reduced ? FadeIn.duration(150) : FadeInDown.delay(480).duration(280)}
                                style={{ marginTop: 12, padding: 16, paddingBottom: 4, borderRadius: RADIUS.card, backgroundColor: COLORS.surface.primary, borderWidth: 1, borderColor: COLORS.border.default }}
                            >
                                {tool.params.map((p) => (
                                    <Slider
                                        key={p.key}
                                        label={p.label}
                                        value={values[p.key] ?? p.initial}
                                        min={p.min}
                                        max={p.max}
                                        step={p.step}
                                        onChange={(v) => setValues((s) => ({ ...s, [p.key]: v }))}
                                        format={(v) => formatParam(p.unit, v)}
                                    />
                                ))}
                            </Animated.View>

                            <Animated.View entering={reduced ? FadeIn.duration(150) : FadeIn.delay(600).duration(300)} style={{ marginTop: 12 }}>
                                {tool.assumes ? (
                                    <View style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10 }}>
                                        <Info size={13} color={COLORS.text.tertiary} style={{ marginTop: 2 }} />
                                        <Text style={{ fontFamily: FONTS.regular, fontSize: 12, lineHeight: 17, color: COLORS.text.tertiary, marginLeft: 6, flex: 1 }}>{tool.assumes}</Text>
                                    </View>
                                ) : null}
                                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 9, paddingVertical: 4, borderRadius: 999, backgroundColor: COLORS.surface.tertiary }}>
                                        <Sparkles size={12} color={COLORS.text.secondary} />
                                        <Text style={{ fontFamily: FONTS.medium, fontSize: 11, color: COLORS.text.secondary, marginLeft: 5 }}>
                                            {pick?.source === 'model' ? 'Tool picked by Gemini · maths by FinSight' : 'Tool picked on this phone · maths by FinSight'}
                                        </Text>
                                    </View>
                                    <PressableScale
                                        onPress={() => { haptics.tap(); setStage('idle'); setPick(null); setQuestion(''); scrollRef.current?.scrollTo({ y: 0, animated: !reduced }); }}
                                        accessibilityRole="button"
                                        style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 6 }}
                                    >
                                        <RotateCcw size={13} color={COLORS.brand.link} />
                                        <Text style={{ ...TYPE.caption, fontFamily: FONTS.semibold, color: COLORS.brand.link, marginLeft: 5 }}>Ask another</Text>
                                    </PressableScale>
                                </View>
                            </Animated.View>
                        </View>
                    ) : null}
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
};

export default AskScreen;
