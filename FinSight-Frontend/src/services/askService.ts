/**
 * Turn a question into a tool, through Gemini via Firebase AI Logic.
 *
 * Through Firebase AI Logic (config/ai.ts), so no server of our own.
 *
 * The model is asked for one thing: which tool, and what numbers to start
 * at, as JSON. It never produces a figure the learner reads; the tool's
 * compute function does that. Its one free-text field, the line telling the
 * learner what to look at, is dropped if it contains a digit, so a made-up
 * number cannot reach the screen.
 *
 * If anything fails (no network, AI Logic not enabled, a slow reply, a bad
 * answer) the offline matcher picks the tool instead, so the screen always
 * opens something that works.
 */
import { Schema } from 'firebase/ai';
import { generateJson } from '../config/ai';
import { ASK_TOOLS, findTool, initialValues, matchOffline } from '../utils/askTools';

export interface AskPick {
    toolId: string;
    values: Record<string, number>;
    /** One line on what to look at. No numbers. */
    lookFor?: string;
    source: 'model' | 'offline';
}

const TIMEOUT_MS = 9_000;

const TOOL_LIST = ASK_TOOLS.map((t) =>
    `- ${t.id}: ${t.asks} Sliders: ${t.params.map((p) => `${p.key} (${p.unit}, ${p.min} to ${p.max})`).join(', ')}`,
).join('\n');

const SYSTEM = `You pick a calculator for a money question from a finance learning app.
Choose exactly one tool id from this list:
${TOOL_LIST}

Return JSON only. Set a slider value only if the question states it or clearly implies it; otherwise leave it out.
Percent sliders are plain numbers, so 12% is 12. Rupee sliders are full rupees, so 3 lakh is 300000.
lookFor is one short sentence, under 18 words, telling the learner which slider to move and what to watch. Do not write any digits in lookFor.`;

const responseSchema = Schema.object({
    properties: {
        toolId: Schema.enumString({ enum: ASK_TOOLS.map((t) => t.id) }),
        values: Schema.array({
            items: Schema.object({ properties: { key: Schema.string(), value: Schema.number() } }),
        }),
        lookFor: Schema.string(),
    },
    optionalProperties: ['values', 'lookFor'],
});

async function askModel(question: string): Promise<AskPick> {
    const raw = await generateJson<{
        toolId?: string; values?: { key?: string; value?: number }[]; lookFor?: string;
    }>({ system: SYSTEM, prompt: question, schema: responseSchema, temperature: 0.2, timeoutMs: TIMEOUT_MS });
    const tool = raw.toolId ? findTool(raw.toolId) : undefined;
    if (!tool) throw new Error('unknown tool');
    const given: Record<string, number> = {};
    for (const v of raw.values ?? []) {
        if (v.key && typeof v.value === 'number' && tool.params.some((p) => p.key === v.key)) given[v.key] = v.value;
    }
    const lookFor = raw.lookFor && !/\d/.test(raw.lookFor) && raw.lookFor.length <= 160 ? raw.lookFor.trim() : undefined;
    return { toolId: tool.id, values: initialValues(tool, given), lookFor, source: 'model' };
}

export async function pickTool(question: string): Promise<AskPick> {
    try {
        return await askModel(question);
    } catch {
        const m = matchOffline(question);
        const tool = findTool(m.toolId)!;
        return { toolId: tool.id, values: initialValues(tool, m.values), source: 'offline' };
    }
}
