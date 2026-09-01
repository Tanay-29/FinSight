/**
 * The one list of spending categories.
 *
 * There were five. The add-transaction picker offered `health`, `housing` and
 * `other`; the merchant rules produced `healthcare` and neither of the other
 * two; the budget picker offered `health` but no `housing`; the sorting game
 * assigned `rent` and `miscellaneous`, which no picker offered and no icon map
 * knew; and the icon maps keyed on `healthcare` alone.
 *
 * So a transaction filed by hand under `health` and one the parser filed under
 * `healthcare` were different categories: separate rows in the chart, and a
 * budget set on one never saw spending on the other. `utils/vitals.ts` had
 * already noticed and worked around it, accepting every spelling in its
 * needs-and-wants map rather than fixing the cause.
 *
 * `normaliseCategory` exists so none of that has to be migrated. Whatever
 * spelling is already sitting in Firestore still resolves to the right
 * category on the way in.
 */

export type Category =
    | 'dining'
    | 'transport'
    | 'shopping'
    | 'groceries'
    | 'utilities'
    | 'entertainment'
    | 'healthcare'
    | 'education'
    | 'housing'
    | 'investments'
    | 'other';

/** Canonical order, used by every picker so they cannot drift apart again. */
export const CATEGORIES: { key: Category; label: string }[] = [
    { key: 'dining', label: 'Dining' },
    { key: 'groceries', label: 'Groceries' },
    { key: 'transport', label: 'Transport' },
    { key: 'shopping', label: 'Shopping' },
    { key: 'utilities', label: 'Utilities' },
    { key: 'housing', label: 'Rent & Housing' },
    { key: 'healthcare', label: 'Health' },
    { key: 'education', label: 'Education' },
    { key: 'entertainment', label: 'Entertainment' },
    { key: 'investments', label: 'Investments' },
    { key: 'other', label: 'Other' },
];

export const CATEGORY_KEYS: Category[] = CATEGORIES.map((c) => c.key);

/**
 * Where money came in from.
 *
 * The add-transaction form offered the eleven spending categories whatever the
 * type was, so income had to be filed under Dining or Shopping, which is not a
 * thing that means anything. Income needs a different question - not "what did
 * you buy" but "where did this come from" - and a much shorter list: a student
 * has three or four sources, not eleven.
 *
 * These are stored in the same `category` field. Nothing double counts,
 * because every spending figure in the app filters on type === 'debit' before
 * it looks at the category at all.
 */
export type IncomeSource =
    | 'allowance'
    | 'salary'
    | 'freelance'
    | 'scholarship'
    | 'refund'
    | 'gift'
    | 'other_income';

export const INCOME_SOURCES: { key: IncomeSource; label: string }[] = [
    { key: 'allowance', label: 'From family' },
    { key: 'salary', label: 'Salary' },
    { key: 'freelance', label: 'Freelance' },
    { key: 'scholarship', label: 'Scholarship' },
    { key: 'refund', label: 'Refund' },
    { key: 'gift', label: 'Gift' },
    { key: 'other_income', label: 'Something else' },
];

const INCOME_KEYS = new Set<string>(INCOME_SOURCES.map((s) => s.key));

/** True when a stored category names an income source rather than a spend. */
export const isIncomeSource = (raw: string | null | undefined): boolean =>
    INCOME_KEYS.has((raw ?? '').trim().toLowerCase());

/** Display label for an income source, falling back to a readable string. */
export function incomeLabel(raw: string | null | undefined): string {
    const key = (raw ?? '').trim().toLowerCase();
    return INCOME_SOURCES.find((s) => s.key === key)?.label ?? 'Income';
}

/** Spellings that already exist in stored data, and what they really mean. */
const ALIASES: Record<string, Category> = {
    health: 'healthcare',
    medical: 'healthcare',
    rent: 'housing',
    miscellaneous: 'other',
    misc: 'other',
    food: 'dining',
};

const CANONICAL = new Set<string>(CATEGORY_KEYS);

/**
 * Resolve any stored category string to a canonical one.
 *
 * Anything unrecognised becomes `other` rather than throwing, because this
 * reads user data written by older versions of the app and a transaction with
 * an odd category should still show up somewhere.
 */
export function normaliseCategory(raw: string | null | undefined): Category {
    const key = (raw ?? '').trim().toLowerCase();
    if (CANONICAL.has(key)) return key as Category;
    return ALIASES[key] ?? 'other';
}

/** Display label for a category, accepting any legacy spelling. */
export function categoryLabel(raw: string | null | undefined): string {
    const key = normaliseCategory(raw);
    return CATEGORIES.find((c) => c.key === key)?.label ?? 'Other';
}
