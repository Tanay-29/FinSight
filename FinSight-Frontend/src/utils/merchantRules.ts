/**
 * One merchant table, shared by both expense categorisers.
 *
 * There used to be two: 43 keywords across 6 categories in the clipboard SMS
 * parser, and 96 across 9 in the notification parser. Static analysis of both
 * found three classes of defect, none of which needed labelled data to
 * demonstrate.
 *
 * **Substring collisions.** Both parsers tested keywords with a plain
 * containment check, so about a third of keywords matched inside unrelated
 * words: `gas` matched Vegas, `bill` matched billing, `sip` matched gossip,
 * `coin` matched Coinbase, and `fd` at two characters matched almost anything.
 * Fixed by matching on word boundaries, so a keyword must be a whole token.
 *
 * **Shadowing.** Both stopped at the first match while iterating categories in
 * declaration order, so a shorter keyword in an earlier category captured every
 * later phrase containing it. `swiggy` sat in dining and `swiggy instamart` in
 * groceries, with dining tested first, so every grocery order from that
 * merchant was recorded as dining, corrupting both the needs-versus-wants split
 * and the learner's budget. `vi` in utilities shadowed `prime video` in
 * entertainment. Fixed by testing longest keyword first, regardless of
 * category.
 *
 * **Disagreement.** `reliance` mapped to shopping in one parser and groceries
 * in the other, so the same transaction was categorised differently depending
 * on how it was captured. Fixed by there being one table.
 *
 * Categorisation gates every behavioural signal downstream of it: the score,
 * the 50/30/20 split, budgets, and anything the coach is told about conduct. A
 * miscategorised transaction is not a cosmetic error, it is a corrupted input.
 */

export type ExpenseCategory =
    | 'dining'
    | 'transport'
    | 'shopping'
    | 'groceries'
    | 'utilities'
    | 'entertainment'
    | 'healthcare'
    | 'investments'
    | 'education';

/**
 * Merchant or keyword to category.
 *
 * Multi-word entries are fine and are preferred wherever a single word would be
 * ambiguous. Order in this object is irrelevant: matching is longest-first, so
 * a longer phrase always wins over a shorter one it contains.
 */
export const MERCHANT_RULES: Record<string, ExpenseCategory> = {
    // ── Dining ───────────────────────────────────────────────
    zomato: 'dining',
    swiggy: 'dining',
    mcdonalds: 'dining',
    mcdonald: 'dining',
    starbucks: 'dining',
    dominos: 'dining',
    domino: 'dining',
    kfc: 'dining',
    subway: 'dining',
    dunkin: 'dining',
    pizza: 'dining',
    burger: 'dining',
    biryani: 'dining',
    cafe: 'dining',
    restaurant: 'dining',
    food: 'dining',
    chai: 'dining',

    // ── Transport ────────────────────────────────────────────
    irctc: 'transport',
    uber: 'transport',
    ola: 'transport',
    rapido: 'transport',
    redbus: 'transport',
    makemytrip: 'transport',
    indigo: 'transport',
    metro: 'transport',
    petrol: 'transport',
    fuel: 'transport',
    parking: 'transport',
    toll: 'transport',
    hpcl: 'transport',
    bpcl: 'transport',

    // ── Shopping ─────────────────────────────────────────────
    amazon: 'shopping',
    flipkart: 'shopping',
    myntra: 'shopping',
    ajio: 'shopping',
    meesho: 'shopping',
    nykaa: 'shopping',
    tatacliq: 'shopping',
    shoppers: 'shopping',
    decathlon: 'shopping',
    zara: 'shopping',
    'h m': 'shopping',              // "H&M" once punctuation is normalised
    'reliance digital': 'shopping', // see the note on bare `reliance` below

    // ── Groceries ────────────────────────────────────────────
    'swiggy instamart': 'groceries', // must outrank bare `swiggy`
    instamart: 'groceries',
    blinkit: 'groceries',
    zepto: 'groceries',
    bigbasket: 'groceries',
    grofers: 'groceries',
    jiomart: 'groceries',
    dmart: 'groceries',
    'd mart': 'groceries',
    'natures basket': 'groceries',
    'reliance fresh': 'groceries',
    'reliance smart': 'groceries',
    grocery: 'groceries',
    milk: 'groceries',

    // ── Utilities ────────────────────────────────────────────
    bescom: 'utilities',
    electricity: 'utilities',
    jio: 'utilities',
    airtel: 'utilities',
    bsnl: 'utilities',
    vi: 'utilities',
    broadband: 'utilities',
    wifi: 'utilities',
    internet: 'utilities',
    water: 'utilities',
    gas: 'utilities',

    // ── Entertainment ────────────────────────────────────────
    netflix: 'entertainment',
    spotify: 'entertainment',
    hotstar: 'entertainment',
    'prime video': 'entertainment', // must outrank `vi`
    'amazon prime': 'entertainment', // a subscription, must outrank `amazon`
    zee5: 'entertainment',
    gaana: 'entertainment',
    youtube: 'entertainment',
    bookmyshow: 'entertainment',
    pvr: 'entertainment',
    inox: 'entertainment',

    // ── Healthcare ───────────────────────────────────────────
    apollo: 'healthcare',
    pharmeasy: 'healthcare',
    netmeds: 'healthcare',
    medplus: 'healthcare',
    '1mg': 'healthcare',
    practo: 'healthcare',
    hospital: 'healthcare',
    doctor: 'healthcare',
    clinic: 'healthcare',
    dental: 'healthcare',

    // ── Investments ──────────────────────────────────────────
    groww: 'investments',
    zerodha: 'investments',
    kuvera: 'investments',
    'zerodha coin': 'investments',
    'mutual fund': 'investments',
    sip: 'investments',
    nps: 'investments',
    ppf: 'investments',

    // ── Education ────────────────────────────────────────────
    udemy: 'education',
    coursera: 'education',
    unacademy: 'education',
    byjus: 'education',
    physicswallah: 'education',
    'linkedin learning': 'education',
    skillshare: 'education',
};

/**
 * Deliberately absent, and each for a reason.
 *
 * `reliance` on its own: Reliance Digital is electronics, Reliance Fresh and
 * Smart are supermarkets, Reliance Jio is a telco. The two parsers disagreed
 * about it precisely because it has no single right answer. The specific forms
 * are listed above and the bare word is left unmatched, so an ambiguous
 * merchant falls through to the caller's default rather than being guessed at.
 *
 * `fd`, `coin`, `stock`, `bill`, `sony`, `nature`, `basket`: too short or too
 * generic to identify a merchant even with word boundaries. `fd` is two
 * characters, `bill` appears in any payment message, and `sony` is as often a
 * television as a record label. Where a real merchant was intended, the
 * specific phrase is listed instead, as with `zerodha coin`.
 */

/**
 * Lowercase, and reduce every run of non-alphanumeric characters to a single
 * space, then pad with spaces.
 *
 * The padding is what makes boundary matching a plain substring test: a keyword
 * wrapped in spaces can only match a whole token sequence. "Vegas" becomes
 * " vegas " which does not contain " gas ", while "gas bill" becomes
 * " gas bill " which does.
 */
function normalise(text: string): string {
    return ` ${(text ?? '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()} `;
}

/**
 * Keywords longest first, so a phrase always beats a word it contains.
 *
 * Computed once. Sorted by length rather than by category, which is the whole
 * point: the previous parsers iterated categories in declaration order, and
 * that ordering silently decided the outcome.
 */
const SORTED_KEYWORDS: string[] = Object.keys(MERCHANT_RULES).sort(
    (a, b) => b.length - a.length || a.localeCompare(b)
);

export interface MerchantMatch {
    category: ExpenseCategory;
    /** The keyword that matched, for display as a merchant name. */
    keyword: string;
}

/**
 * Find the most specific merchant rule in a piece of text.
 *
 * Pass `learned` to fold in categories the user has corrected by hand. Those
 * are merged with the built-in rules and matched in the same single
 * longest-first pass, so a correction can teach a merchant the table has never
 * heard of without disturbing the ordering that makes the table work.
 *
 * Returns null when nothing matches, so each caller can apply its own default
 * rather than having one imposed here. The two parsers historically defaulted
 * to different strings and changing that is not this function's business.
 */
function findIn(
    haystack: string,
    keywords: string[],
    table: Record<string, string>
): MerchantMatch | null {
    for (const keyword of keywords) {
        if (haystack.includes(` ${keyword} `)) {
            return { category: table[keyword] as ExpenseCategory, keyword };
        }
    }
    return null;
}

export function matchMerchant(
    text: string,
    learned?: Record<string, string>
): MerchantMatch | null {
    const haystack = normalise(text);

    if (learned && Object.keys(learned).length > 0) {
        // One pass over both tables rather than checking learned entries first,
        // so longest match still decides across the union. A user who corrected
        // `swiggy` has not thereby overruled the more specific
        // `swiggy instamart`, and a correction on the same keyword as a rule
        // does win, because they told us and the table only guessed.
        const merged: Record<string, string> = { ...MERCHANT_RULES, ...learned };
        const keywords = Object.keys(merged).sort(
            (a, b) => b.length - a.length || a.localeCompare(b)
        );
        return findIn(haystack, keywords, merged);
    }

    return findIn(haystack, SORTED_KEYWORDS, MERCHANT_RULES);
}

/**
 * Stable grouping identity for a merchant string.
 *
 * Returns the matched rule keyword when one applies, so "Netflix" and
 * "Netflix India" land on the same key while "Swiggy" and "Swiggy Instamart"
 * stay apart, which is exactly what the longest-match ordering is for.
 *
 * Falls back to the whole normalised name, not its first word. The recurring
 * charge detector used to key on the first word alone, which collapsed
 * "Amazon Prime" into "Amazon" and "Google One" into "Google Pay", so ordinary
 * shopping was reported as a subscription.
 */
export function merchantKey(text: string): string {
    const match = matchMerchant(text);
    if (match) return match.keyword;
    return normalise(text).trim();
}
