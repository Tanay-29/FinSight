/**
 * The life-sim format.
 *
 * A scenario is a year of months. Each month opens with the salary landing
 * and the fixed costs leaving, then puts one decision in front of you. Every
 * option has a stated effect on four numbers (cash, debt, credit health,
 * peace of mind) and can set a flag that later months read, so a cover you
 * bought in April is there to claim in November and a card you declined in
 * May never bills you in December.
 *
 * Everything the story shows is computed by utils/scenario.ts from these
 * numbers. The prose is authored; the consequences are arithmetic.
 */
import { z } from 'zod';

export const EffectSchema = z.object({
    /** One-off change to cash this month. */
    cash: z.number().optional(),
    /** One-off change to debt. Positive borrows, negative repays. */
    debt: z.number().optional(),
    /** Change to credit health, 0 to 100. */
    credit: z.number().optional(),
    /** Change to peace of mind, 0 to 100. */
    peace: z.number().optional(),
    /** Recurring monthly cash outflow from next month on, labelled for the ledger. */
    monthly: z.object({ label: z.string(), amount: z.number() }).optional(),
    /** Recurring monthly transfer into investments from next month on. */
    invest: z.number().optional(),
    /** One-off transfer from cash into investments this month. */
    investOnce: z.number().optional(),
    /** Pay up to this much of the debt from cash, whatever is actually owed. */
    payDebt: z.number().optional(),
    /** Set a flag for later months. */
    setFlag: z.string().optional(),
});

export const OptionSchema = z.object({
    label: z.string(),
    /** Shown after choosing. Says what happened and why it matters. */
    outcome: z.string(),
    effect: EffectSchema,
    /** How the scorecard files it. */
    tag: z.enum(['wise', 'ok', 'costly']),
    /** Only available with this much cash on hand. Shown disabled otherwise. */
    requiresCash: z.number().optional(),
    /** Only available if an earlier month set this flag. */
    requiresFlag: z.string().optional(),
    /** Hidden if this flag is set. */
    hideIfFlag: z.string().optional(),
});

export const SceneSchema = z.object({
    id: z.string(),
    month: z.number().int().min(1).max(12),
    title: z.string(),
    body: z.string(),
    options: z.array(OptionSchema).min(2).max(4),
    /** Only played if this flag is set. */
    showIfFlag: z.string().optional(),
    /** Skipped if this flag is set. */
    hideIfFlag: z.string().optional(),
});

export const ScenarioSchema = z.object({
    id: z.string(),
    title: z.string(),
    summary: z.string(),
    minutes: z.number().int().positive(),
    start: z.object({
        cash: z.number(),
        monthlyIncome: z.number(),
        /** Rent, food, transport, phone: the costs that arrive whatever you decide. */
        fixedCosts: z.array(z.object({ label: z.string(), amount: z.number() })),
        credit: z.number().min(0).max(100),
        peace: z.number().min(0).max(100),
    }),
    /** Monthly interest on carried debt, as a fraction. */
    debtMonthlyRate: z.number().min(0).max(0.1),
    scenes: z.array(SceneSchema).min(4),
});

export type Effect = z.infer<typeof EffectSchema>;
export type Option = z.infer<typeof OptionSchema>;
export type Scene = z.infer<typeof SceneSchema>;
export type Scenario = z.infer<typeof ScenarioSchema>;

export function validateScenarios(list: Scenario[]): Scenario[] {
    for (const s of list) {
        ScenarioSchema.parse(s);
        const ids = new Set<string>();
        for (const sc of s.scenes) {
            if (ids.has(sc.id)) throw new Error(`Duplicate scene id ${s.id}:${sc.id}`);
            ids.add(sc.id);
        }
    }
    return list;
}
