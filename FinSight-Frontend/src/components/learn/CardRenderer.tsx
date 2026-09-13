/**
 * One component per card type, and a switch that picks it.
 *
 * Each card owns its own in-progress state (what is selected, what is
 * sorted) and reports exactly once through `onAnswer(correct)`. The player
 * above decides when Continue appears. Cards that have nothing to answer
 * (info, an explorable with no question) never call it.
 */
import React, { useMemo, useState } from 'react';
import { View, Text } from 'react-native';
import { ExternalLink, RotateCcw } from 'lucide-react-native';
import type {
    Card, ChoiceCard, TrueFalseCard, EstimateCard, TapSortCard, OrderStepsCard, SpotTrapCard, ExplorableCard, InfoCard,
} from '../../data/lessons/schema';
import { Prompt, OptionRow, Feedback, CheckButton } from './CardChrome';
import { Slider } from './Slider';
import { PressableScale } from '../PressableScale';
import { MinimumDueExplorable } from './explorables/MinimumDueExplorable';
import { SalarySlipExplorable } from './explorables/SalarySlipExplorable';
import { RegimeCompareExplorable } from './explorables/RegimeCompareExplorable';
import { RunwayExplorable } from './explorables/RunwayExplorable';
import { NoCostEmiExplorable } from './explorables/NoCostEmiExplorable';
import { CibilExplorable } from './explorables/CibilExplorable';
import { InflationExplorable } from './explorables/InflationExplorable';
import { inr } from '../../utils/moneyMath';
import * as haptics from '../../utils/haptics';
import { COLORS, FONTS, TYPE } from '../../theme/tokens';

export interface CardViewProps<C extends Card = Card> {
    card: C;
    onAnswer: (correct: boolean) => void;
}

const report = (correct: boolean, onAnswer: (c: boolean) => void) => {
    if (correct) haptics.success(); else haptics.warn();
    onAnswer(correct);
};

// ─── Info ────────────────────────────────────────────────────

const InfoView: React.FC<{ card: InfoCard }> = ({ card }) => (
    <View>
        <Text style={{ ...TYPE.title, color: COLORS.text.primary, marginBottom: 14 }}>{card.title}</Text>
        {card.stat ? (
            <View style={{ marginBottom: 16, padding: 16, borderRadius: 14, backgroundColor: COLORS.brand.soft }}>
                <Text style={{ ...TYPE.display, fontSize: 36, lineHeight: 40, color: COLORS.brand.primaryDark }}>{card.stat.value}</Text>
                <Text style={{ ...TYPE.caption, color: COLORS.text.secondary, marginTop: 4 }}>{card.stat.label}</Text>
            </View>
        ) : null}
        <Text style={{ ...TYPE.body, fontSize: 17, lineHeight: 26, color: COLORS.text.primary }}>{card.body}</Text>
        {card.source ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 14 }}>
                <ExternalLink size={11} color={COLORS.text.tertiary} />
                <Text numberOfLines={1} style={{ fontFamily: FONTS.regular, fontSize: 11, color: COLORS.text.tertiary, marginLeft: 4, flex: 1 }}>{card.source}</Text>
            </View>
        ) : null}
    </View>
);

// ─── Choice, shared by choice cards and explorable follow-ups ───

const ChoiceBody: React.FC<{
    prompt: string; options: string[]; answer: number; explain: string; small?: boolean;
    onAnswer: (correct: boolean) => void;
}> = ({ prompt, options, answer, explain, small, onAnswer }) => {
    const [picked, setPicked] = useState<number | null>(null);
    const done = picked !== null;
    const state = (i: number) => {
        if (!done) return 'idle' as const;
        if (i === answer) return 'correct' as const;
        if (i === picked) return 'wrong' as const;
        return 'dim' as const;
    };
    return (
        <View>
            <Prompt small={small}>{prompt}</Prompt>
            {options.map((o, i) => (
                <OptionRow
                    key={i}
                    label={o}
                    index={i}
                    state={state(i)}
                    disabled={done}
                    onPress={() => { setPicked(i); report(i === answer, onAnswer); }}
                />
            ))}
            {done ? <Feedback correct={picked === answer} explain={explain} /> : null}
        </View>
    );
};

const ChoiceView: React.FC<CardViewProps<ChoiceCard>> = ({ card, onAnswer }) => (
    <ChoiceBody prompt={card.prompt} options={card.options} answer={card.answer} explain={card.explain} onAnswer={onAnswer} />
);

// ─── True or false ───────────────────────────────────────────

const TrueFalseView: React.FC<CardViewProps<TrueFalseCard>> = ({ card, onAnswer }) => {
    const [picked, setPicked] = useState<boolean | null>(null);
    const done = picked !== null;
    const state = (v: boolean) => {
        if (!done) return 'idle' as const;
        if (v === card.answer) return 'correct' as const;
        if (v === picked) return 'wrong' as const;
        return 'dim' as const;
    };
    return (
        <View>
            <Text style={{ ...TYPE.micro, color: COLORS.text.tertiary, marginBottom: 8 }}>True or false</Text>
            <Prompt>{card.statement}</Prompt>
            <View style={{ flexDirection: 'row', gap: 10 }}>
                {[true, false].map((v) => (
                    <View key={String(v)} style={{ flex: 1 }}>
                        <OptionRow label={v ? 'True' : 'False'} state={state(v)} disabled={done} onPress={() => { setPicked(v); report(v === card.answer, onAnswer); }} />
                    </View>
                ))}
            </View>
            {done ? <Feedback correct={picked === card.answer} explain={card.explain} /> : null}
        </View>
    );
};

// ─── Estimate ────────────────────────────────────────────────

const unitFormat = (unit: EstimateCard['unit']) => (v: number) =>
    unit === 'inr' ? inr(v) : unit === 'percent' ? `${v}%` : `${v} months`;

const EstimateView: React.FC<CardViewProps<EstimateCard>> = ({ card, onAnswer }) => {
    const [value, setValue] = useState(Math.round(((card.min + card.max) / 2) / card.step) * card.step);
    const [done, setDone] = useState(false);
    const fmt = unitFormat(card.unit);
    const withinTolerance = Math.abs(value - card.answer) <= card.answer * card.tolerance;
    return (
        <View>
            <Text style={{ ...TYPE.micro, color: COLORS.text.tertiary, marginBottom: 8 }}>Estimate</Text>
            <Prompt>{card.prompt}</Prompt>
            <View style={{ padding: 16, borderRadius: 14, backgroundColor: COLORS.surface.primary, borderWidth: 1, borderColor: COLORS.border.default, marginBottom: 12 }}>
                <Text style={{ ...TYPE.amountLg, fontSize: 34, lineHeight: 40, color: done ? (withinTolerance ? COLORS.semantic.profit : COLORS.semantic.alertCritical) : COLORS.text.primary, textAlign: 'center', marginBottom: 10 }}>
                    {fmt(value)}
                </Text>
                {!done ? (
                    <Slider label="Your guess" value={value} min={card.min} max={card.max} step={card.step} onChange={setValue} format={fmt} minLabel={fmt(card.min)} maxLabel={fmt(card.max)} />
                ) : (
                    <Text style={{ ...TYPE.callout, color: COLORS.text.secondary, textAlign: 'center' }}>
                        Actual: {fmt(card.answer)}
                    </Text>
                )}
            </View>
            {!done ? <CheckButton label="Lock it in" onPress={() => { setDone(true); report(withinTolerance, onAnswer); }} /> : null}
            {done ? <Feedback correct={withinTolerance} explain={card.explain} /> : null}
        </View>
    );
};

// ─── Tap to sort ─────────────────────────────────────────────

const TapSortView: React.FC<CardViewProps<TapSortCard>> = ({ card, onAnswer }) => {
    const [assign, setAssign] = useState<Record<number, 0 | 1>>({});
    const [done, setDone] = useState(false);
    const allAssigned = card.items.every((_, i) => assign[i] !== undefined);
    const allRight = card.items.every((it, i) => assign[i] === it.bucket);

    return (
        <View>
            <Prompt>{card.prompt}</Prompt>
            {card.items.map((it, i) => {
                const chosen = assign[i];
                const right = done && chosen === it.bucket;
                const wrong = done && chosen !== it.bucket;
                return (
                    <View key={i} style={{
                        marginBottom: 8, padding: 10, borderRadius: 12, borderWidth: 1,
                        borderColor: right ? COLORS.semantic.profit : wrong ? COLORS.semantic.loss : COLORS.border.default,
                        backgroundColor: right ? COLORS.semantic.profitBg : wrong ? COLORS.semantic.lossBg : COLORS.surface.primary,
                    }}>
                        <Text style={{ ...TYPE.callout, color: COLORS.text.primary, marginBottom: 8 }}>{it.label}</Text>
                        <View style={{ flexDirection: 'row', gap: 8 }}>
                            {card.buckets.map((b, bi) => {
                                const active = chosen === bi;
                                return (
                                    <PressableScale
                                        key={bi}
                                        disabled={done}
                                        onPress={() => { haptics.select(); setAssign((s) => ({ ...s, [i]: bi as 0 | 1 })); }}
                                        activeScale={0.96}
                                        accessibilityRole="button"
                                        accessibilityState={{ selected: active }}
                                        style={{
                                            flex: 1, paddingVertical: 8, borderRadius: 8, alignItems: 'center',
                                            backgroundColor: active ? COLORS.brand.primaryDark : COLORS.surface.tertiary,
                                        }}
                                    >
                                        <Text style={{ ...TYPE.caption, color: active ? COLORS.brand.onAccent : COLORS.text.secondary }}>{b}</Text>
                                    </PressableScale>
                                );
                            })}
                        </View>
                        {wrong ? (
                            <Text style={{ fontFamily: FONTS.medium, fontSize: 12, color: COLORS.semantic.alertCritical, marginTop: 6 }}>
                                Belongs under {card.buckets[it.bucket]}
                            </Text>
                        ) : null}
                    </View>
                );
            })}
            {!done ? <CheckButton disabled={!allAssigned} onPress={() => { setDone(true); report(allRight, onAnswer); }} /> : null}
            {done ? <Feedback correct={allRight} explain={card.explain} /> : null}
        </View>
    );
};

// ─── Order the steps ─────────────────────────────────────────

function shuffled<T>(arr: T[]): T[] {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    // A shuffle that lands on the answer teaches nothing; rotate once if so.
    return a.every((v, i) => v === arr[i]) ? [...a.slice(1), a[0]] : a;
}

const OrderStepsView: React.FC<CardViewProps<OrderStepsCard>> = ({ card, onAnswer }) => {
    const pool = useMemo(() => shuffled(card.steps.map((s, i) => ({ s, i }))), [card.steps]);
    const [picked, setPicked] = useState<number[]>([]);
    const [done, setDone] = useState(false);
    const complete = picked.length === card.steps.length;
    const allRight = picked.every((orig, pos) => orig === pos);

    return (
        <View>
            <Prompt>{card.prompt}</Prompt>
            <Text style={{ ...TYPE.caption, color: COLORS.text.tertiary, marginBottom: 8 }}>Tap the steps in order</Text>

            {picked.length > 0 ? (
                <View style={{ marginBottom: 10 }}>
                    {picked.map((orig, pos) => {
                        const right = done && orig === pos;
                        const wrong = done && orig !== pos;
                        return (
                            <View key={orig} style={{
                                flexDirection: 'row', alignItems: 'center', padding: 10, marginBottom: 6, borderRadius: 10,
                                backgroundColor: right ? COLORS.semantic.profitBg : wrong ? COLORS.semantic.lossBg : COLORS.brand.soft,
                            }}>
                                <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: right ? COLORS.semantic.profit : wrong ? COLORS.semantic.loss : COLORS.brand.primaryDark, alignItems: 'center', justifyContent: 'center', marginRight: 10 }}>
                                    <Text style={{ fontFamily: FONTS.bold, fontSize: 11, color: COLORS.brand.onAccent }}>{pos + 1}</Text>
                                </View>
                                <Text style={{ ...TYPE.callout, fontSize: 14, color: COLORS.text.primary, flex: 1 }}>{card.steps[orig]}</Text>
                            </View>
                        );
                    })}
                    {!done ? (
                        <PressableScale onPress={() => { haptics.tap(); setPicked([]); }} accessibilityRole="button" style={{ flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-end', paddingVertical: 4 }}>
                            <RotateCcw size={12} color={COLORS.brand.link} />
                            <Text style={{ ...TYPE.caption, color: COLORS.brand.link, marginLeft: 4 }}>Start over</Text>
                        </PressableScale>
                    ) : null}
                </View>
            ) : null}

            {!done ? pool.filter((p) => !picked.includes(p.i)).map((p) => (
                <OptionRow key={p.i} label={p.s} state="idle" onPress={() => { haptics.select(); setPicked((s) => [...s, p.i]); }} />
            )) : null}

            {!done ? <CheckButton disabled={!complete} onPress={() => { setDone(true); report(allRight, onAnswer); }} /> : null}
            {done ? <Feedback correct={allRight} explain={card.explain} /> : null}
        </View>
    );
};

// ─── Spot the trap ───────────────────────────────────────────

const SpotTrapView: React.FC<CardViewProps<SpotTrapCard>> = ({ card, onAnswer }) => {
    const [picked, setPicked] = useState<number | null>(null);
    const done = picked !== null;
    return (
        <View>
            <Prompt>{card.prompt}</Prompt>
            <View style={{ borderRadius: 14, borderWidth: 1, borderColor: COLORS.border.default, backgroundColor: COLORS.surface.primary, overflow: 'hidden', marginBottom: 12 }}>
                {card.lines.map((l, i) => {
                    const isTrap = i === card.trap;
                    const bg = done && isTrap ? COLORS.semantic.lossBg : done && i === picked ? COLORS.surface.tertiary : 'transparent';
                    return (
                        <PressableScale
                            key={i}
                            disabled={done}
                            onPress={() => { setPicked(i); report(i === card.trap, onAnswer); }}
                            activeScale={0.99}
                            accessibilityRole="button"
                            style={{
                                flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
                                paddingHorizontal: 16, paddingVertical: 13,
                                borderBottomWidth: i < card.lines.length - 1 ? 1 : 0, borderBottomColor: COLORS.border.default,
                                backgroundColor: bg,
                            }}
                        >
                            <Text style={{ ...TYPE.callout, color: done && isTrap ? COLORS.semantic.alertCritical : COLORS.text.primary }}>{l.label}</Text>
                            {l.value ? <Text style={{ ...TYPE.amountSm, color: done && isTrap ? COLORS.semantic.alertCritical : COLORS.text.primary }}>{l.value}</Text> : null}
                        </PressableScale>
                    );
                })}
            </View>
            {done ? <Feedback correct={picked === card.trap} explain={card.explain} /> : null}
        </View>
    );
};

// ─── Explorable ──────────────────────────────────────────────

const ExplorableView: React.FC<CardViewProps<ExplorableCard>> = ({ card, onAnswer }) => (
    <View>
        <Text style={{ ...TYPE.micro, color: COLORS.text.tertiary, marginBottom: 8 }}>Try it</Text>
        <Prompt small>{card.prompt}</Prompt>
        <View style={{ padding: 16, borderRadius: 14, borderWidth: 1, borderColor: COLORS.border.default, backgroundColor: COLORS.surface.primary, marginBottom: 20 }}>
            {card.explorable === 'minimumDue' ? <MinimumDueExplorable /> : null}
            {card.explorable === 'salarySlip' ? <SalarySlipExplorable /> : null}
            {card.explorable === 'regimeCompare' ? <RegimeCompareExplorable /> : null}
            {card.explorable === 'runway' ? <RunwayExplorable /> : null}
            {card.explorable === 'noCostEmi' ? <NoCostEmiExplorable /> : null}
            {card.explorable === 'cibil' ? <CibilExplorable /> : null}
            {card.explorable === 'inflation' ? <InflationExplorable /> : null}
        </View>
        {card.question ? (
            <ChoiceBody small prompt={card.question.prompt} options={card.question.options} answer={card.question.answer} explain={card.question.explain} onAnswer={onAnswer} />
        ) : null}
    </View>
);

// ─── Switch ──────────────────────────────────────────────────

export const CardRenderer: React.FC<CardViewProps> = ({ card, onAnswer }) => {
    switch (card.type) {
        case 'info': return <InfoView card={card} />;
        case 'choice': return <ChoiceView card={card} onAnswer={onAnswer} />;
        case 'trueFalse': return <TrueFalseView card={card} onAnswer={onAnswer} />;
        case 'estimate': return <EstimateView card={card} onAnswer={onAnswer} />;
        case 'tapSort': return <TapSortView card={card} onAnswer={onAnswer} />;
        case 'orderSteps': return <OrderStepsView card={card} onAnswer={onAnswer} />;
        case 'spotTrap': return <SpotTrapView card={card} onAnswer={onAnswer} />;
        case 'explorable': return <ExplorableView card={card} onAnswer={onAnswer} />;
        default: return null;
    }
};
