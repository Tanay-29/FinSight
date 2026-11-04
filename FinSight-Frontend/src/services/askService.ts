/**
 * Turn a question into a tool, through Gemini via Firebase AI Logic.
 *
 * No backend of our own: Firebase AI Logic calls the Gemini Developer API
 * from the app with the project's Firebase config, so there is no key to
 * hold on a server. It has to be switched on once in the Firebase console
 * (AI Logic, Get started, Gemini Developer API), which the free Spark plan
 * allows.
 *
 * The model is asked for one thing: which tool, and what numbers to start
 * at, as JSON. It never produces a figure the learner reads; the tool's
 * compute function does that. Its one free-text field, the line telling the
 * learner what to look at, is dropped if it contains a digit, so a made-up
 * number cannot reach the screen.
 *
 * If anything fails (no network, AI Logic not enabled, a slow reply, a bad
 * answer) the offline matcher picks the tool instead, so the screen always
 * opens something that works. To use another provider, such as Groq,
 * replace `askModel` and keep the same return shape.
 */
import { getAI, getGenerativeModel, GoogleAIBackend, Schema } from 'firebase/ai';
import app from '../config/firebase';
import { ASK_TOOLS, findTool, initialValues, matchOffline } from '../utils/askTools';

export interface AskPick {
    toolId: string;
    values: Record<string, number>;
    /** One line on what to look at. No numbers. */
    lookFor?: string;
    source: 'model' | 'offline';
}

const MODEL = (process.env.EXPO_PUBLIC_GEMINI_MODEL as string) || 'gemini-3.6-flash';
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

let model: ReturnType<typeof getGenerativeModel> | null = null;
function getModel() {
    if (!model) {
        const ai = getAI(app, { backend: new GoogleAIBackend() });
        model = getGenerativeModel(ai, {
            model: MODEL,
            systemInstruction: SYSTEM,
            generationConfig: { responseMimeType: 'application/json', responseSchema, temperature: 0.2 },
        });
    }
    return model;
}

async function askModel(question: string): Promise<AskPick> {
    const timeout = new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout')), TIMEOUT_MS));
    const res = await Promise.race([getModel().generateContent(question), timeout]);
    const raw = JSON.parse(res.response.text()) as {
        toolId?: string; values?: { key?: string; value?: number }[]; lookFor?: string;
    };
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
