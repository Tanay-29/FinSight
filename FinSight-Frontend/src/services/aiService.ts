/**
 * The two longer pieces of model-written text: the score summary on the
 * Money tab, and flashcards for a module.
 *
 * These used to be two routes on a Flask server whose only job was holding
 * the Gemini key. They call Gemini through Firebase AI Logic now (see
 * config/ai.ts), with the same prompts. Numbers are never taken from the
 * model: the score is computed on the phone and passed in, and the summary
 * only explains it.
 */
import { Schema } from 'firebase/ai';
import { generateJson, STYLE_RULES } from '../config/ai';

// ─── Score summary ───────────────────────────────────────────

export interface AdviceInput {
    score: number;
    streak: number;
    experienceLevel: string | null;
    age: number | null;
    transactions: { date?: string; type?: string; amount?: number; category?: string; merchant?: string }[];
    budgets: { category?: string; monthlyLimit?: number; currentSpend?: number }[];
    goals: { title?: string; targetAmount?: number; savedAmount?: number }[];
}

export interface Advice {
    mood: string;
    explanation: string;
    quests: { title: string; description: string; points: number }[];
}

const EXPERIENCE_LINE: Record<string, string> = {
    beginner: 'New to managing money. Explain any term you use, in one clause, the first time it appears. Never assume they have invested before.',
    intermediate: 'Knows the basics of budgeting and saving. Skip the beginner definitions, but do not assume they know investing vocabulary.',
    experienced: 'Comfortable with money and investing. Be brief and skip the explanations. Get to the point they cannot already see for themselves.',
};

const adviceSchema = Schema.object({
    properties: {
        mood: Schema.string(),
        explanation: Schema.string(),
        quests: Schema.array({
            items: Schema.object({ properties: { title: Schema.string(), description: Schema.string(), points: Schema.number() } }),
        }),
    },
});

export async function generateAdvice(i: AdviceInput): Promise<Advice> {
    const tx = i.transactions.slice(0, 15).map((t) =>
        `  - ${t.date ?? '?'}: ${t.type ?? 'debit'} Rs${t.amount ?? 0} on ${t.category ?? 'other'} (${t.merchant ?? 'unknown'})`,
    ).join('\n') || '  No transactions recorded.';
    const budgets = i.budgets.map((b) => {
        const pct = Math.round(((b.currentSpend ?? 0) / Math.max(b.monthlyLimit ?? 1, 1)) * 100);
        return `  - ${b.category ?? '?'}: Rs${b.currentSpend ?? 0} / Rs${b.monthlyLimit ?? 0} (${pct}% used)`;
    }).join('\n') || '  No budgets set.';
    const goals = i.goals.slice(0, 3).map((g) => {
        const pct = Math.round(((g.savedAmount ?? 0) / Math.max(g.targetAmount ?? 1, 1)) * 100);
        return `  - ${g.title ?? '?'}: ${pct}% saved (Rs${g.savedAmount ?? 0} of Rs${g.targetAmount ?? 0})`;
    }).join('\n') || '  No goals set.';
    const reader = `${i.age ? `Age ${i.age}. ` : ''}${EXPERIENCE_LINE[i.experienceLevel ?? ''] ?? 'Comfort with money is unknown. Keep the language plain and define anything technical.'}`;

    const prompt = `You write the short score summary inside FinSight, a money app for Indian students and young professionals.
Your tone is direct and calm. You talk about what this person actually did with their money, in plain words, the way a friend would.

WHO YOU ARE TALKING TO:
  ${reader}

FINSIGHT IQ SCORE: ${i.score} / 1000
LEARNING STREAK: ${i.streak} days

RECENT TRANSACTIONS:
${tx}

BUDGET USAGE THIS MONTH:
${budgets}

SAVINGS GOALS:
${goals}

Return JSON with:
- mood: one plain sentence, max 12 words, on where their money stands right now.
- explanation: 2 or 3 sentences on why the score is ${i.score}, pointing at specific items above.
- quests: exactly 3 objects, each with a short title, one sentence on exactly what to do and the score points it earns, and points as an integer from 10 to 100.

Rules:${STYLE_RULES}
- Quests must target real weaknesses visible above (an over-budget category, missing goals, a broken streak).
- If things look healthy, quests should focus on growth: investing, raising a goal, finishing lessons.`;

    const raw = await generateJson<Partial<Advice>>({ prompt, schema: adviceSchema, temperature: 0.5 });
    const quests = (raw.quests ?? [])
        .filter((q) => q && q.title && q.description)
        .slice(0, 3)
        .map((q) => ({ title: String(q.title), description: String(q.description), points: Math.max(10, Math.min(100, Math.round(Number(q.points) || 20))) }));
    if (!raw.mood || !raw.explanation || quests.length === 0) throw new Error('incomplete advice');
    return { mood: String(raw.mood), explanation: String(raw.explanation), quests };
}

// ─── Flashcards ──────────────────────────────────────────────

export interface Card {
    question: string;
    answer: string;
}

const cardsSchema = Schema.array({
    items: Schema.object({ properties: { question: Schema.string(), answer: Schema.string() } }),
});

export async function generateFlashcards(title: string, content: string, keyPoints: string[]): Promise<Card[]> {
    const prompt = `Create study flashcards for Indian students from this module. Return exactly 5.

MODULE TITLE: ${title}

MODULE CONTENT:
${content.slice(0, 2000)}

KEY TAKEAWAYS:
${keyPoints.length ? keyPoints.map((p) => `- ${p}`).join('\n') : 'None provided.'}

Each card has:
- question: a clear, specific question about a concept from this module, at most 15 words. Test understanding, not recall ("Why does...", "What happens when...").
- answer: 2 or 3 sentences, simple enough for a college student with no finance background, with rupee examples where they help.

Rules:${STYLE_RULES}
- Use Indian context where it fits (SIP, EPF, UPI, CIBIL).`;

    const raw = await generateJson<Partial<Card>[]>({ prompt, schema: cardsSchema, temperature: 0.4 });
    const cards = (Array.isArray(raw) ? raw : [])
        .filter((c) => c && c.question && c.answer)
        .slice(0, 5)
        .map((c) => ({ question: String(c.question), answer: String(c.answer) }));
    if (cards.length < 3) throw new Error('not enough cards');
    return cards;
}
