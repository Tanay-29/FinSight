/**
 * Gemini, through Firebase AI Logic.
 *
 * The app calls the Gemini Developer API directly with the project's Firebase
 * config, so there is no server of our own holding a key. It is switched on
 * once in the Firebase console (AI Logic, Get started, Gemini Developer API),
 * which the free Spark plan allows.
 *
 * Every feature that uses the model asks for JSON against a schema and has a
 * way to carry on without it, so a missing network or a disabled API never
 * leaves a blank screen. To use another provider, such as Groq, replace
 * `generateJson` and keep its signature.
 */
import { getAI, getGenerativeModel, GoogleAIBackend, ObjectSchema, ArraySchema } from 'firebase/ai';
import app from './firebase';

export const MODEL = (process.env.EXPO_PUBLIC_GEMINI_MODEL as string) || 'gemini-3.6-flash';

/** Appended to every prompt, so model-written text reads like the rest of the app. */
export const STYLE_RULES = `
- Write in English only. No Hindi, no Hinglish.
- No emojis or pictographic characters. No em dashes; use a comma, colon or semicolon.
- Sound like a person, not a chatbot: plain words, short sentences, the way a friend who is good with money would text.
- No exclamation marks. No praise or pep talk such as "great job", "you've got this", "keep it up".
- Avoid filler and buzzwords: journey, unlock, empower, elevate, crucial, delve, dive into, leverage, navigate, game-changer, let's.`;

let ai: ReturnType<typeof getAI> | null = null;
const getClient = () => (ai ??= getAI(app, { backend: new GoogleAIBackend() }));

/**
 * One prompt in, parsed JSON out, or a rejection after `timeoutMs`. Callers
 * validate the shape themselves; the schema makes a bad shape rare, not
 * impossible.
 */
export async function generateJson<T>(opts: {
    system?: string;
    prompt: string;
    schema: ObjectSchema | ArraySchema;
    temperature?: number;
    timeoutMs?: number;
}): Promise<T> {
    const model = getGenerativeModel(getClient(), {
        model: MODEL,
        systemInstruction: opts.system,
        generationConfig: {
            responseMimeType: 'application/json',
            responseSchema: opts.schema,
            temperature: opts.temperature ?? 0.4,
        },
    });
    const timeout = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('timeout')), opts.timeoutMs ?? 15_000));
    const res = await Promise.race([model.generateContent(opts.prompt), timeout]);
    return JSON.parse(res.response.text()) as T;
}
