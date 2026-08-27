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
