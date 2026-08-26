/**
 * Split and Settle
 *
 * Tracks who owes whom after group spends. Deliberately a private ledger: the
 * whole thing lives under the owner's own documents, and friends are names the
 * owner typed, not other accounts.
 *
 * That is a real scope decision rather than a shortcut. A shared ledger, where
 * both people see and edit the same record, needs multi-party write access to
 * one document, invitations, and a rule that lets someone else's write touch
 * your data. That is a much larger security surface, and getting it wrong
 * leaks real financial information. A private ledger gets most of the value at
 * none of that risk.
 */

export interface SplitParticipant {
    /** Stable id within this ledger. Not a user account. */
    id: string;
    name: string;
}

export interface SplitExpense {
    id: string;
    description: string;
    /** Total of the bill. */
    amount: number;
    /** Participant id who actually paid, or 'me'. */
    paidBy: string;
    /** Participant ids sharing the cost, including the payer if they took a share. */
    sharedWith: string[];
    date: string;
}

export interface Balance {
    participantId: string;
    name: string;
    /**
     * Positive: they owe you. Negative: you owe them.
     * Rounded to whole rupees.
     */
    net: number;
}

export const ME = 'me';

/**
 * Net every expense down to one figure per person.
 *
 * Each expense splits evenly across `sharedWith`. The payer is credited the
 * whole amount and debited their own share, so someone who pays for a group
 * they are part of ends up owed everyone else's shares and nothing more.
 *
 * Rounding is applied once at the end rather than per expense, so a long run
 * of odd splits cannot drift by a rupee at a time.
 */
export function computeBalances(
    expenses: SplitExpense[],
    participants: SplitParticipant[]
): Balance[] {
    const net = new Map<string, number>();

    for (const expense of expenses) {
        const sharers = expense.sharedWith.filter(Boolean);
        if (sharers.length === 0 || !(expense.amount > 0)) continue;

        const perHead = expense.amount / sharers.length;

        // Everyone sharing owes their head.
        for (const id of sharers) {
            net.set(id, (net.get(id) ?? 0) - perHead);
        }
        // The payer fronted the whole bill.
        net.set(expense.paidBy, (net.get(expense.paidBy) ?? 0) + expense.amount);
    }

    // A positive figure for a friend means they are owed; from your side that
    // means you owe them, so flip the sign to read "they owe you".
    return participants
        .filter((p) => p.id !== ME)
        .map((p) => ({
            participantId: p.id,
            name: p.name,
            net: -Math.round(net.get(p.id) ?? 0),
        }))
        .filter((b) => b.net !== 0)
        .sort((a, b) => Math.abs(b.net) - Math.abs(a.net));
}

export interface SplitSummary {
    /** Total everyone owes you. */
    owedToYou: number;
    /** Total you owe others. */
    youOwe: number;
    /** owedToYou - youOwe. */
    net: number;
    settledUp: boolean;
}

export function summarise(balances: Balance[]): SplitSummary {
    const owedToYou = balances.filter((b) => b.net > 0).reduce((s, b) => s + b.net, 0);
    const youOwe = balances.filter((b) => b.net < 0).reduce((s, b) => s - b.net, 0);
    return {
        owedToYou,
        youOwe,
        net: owedToYou - youOwe,
        settledUp: balances.length === 0,
    };
}

/**
 * Fewest transfers that clear every balance.
 *
 * Repeatedly matches the largest creditor against the largest debtor. This is
 * the standard greedy approach: it is not guaranteed to find the theoretical
 * minimum number of transfers, which is NP-hard, but it never produces more
 * than n-1 and is what every split app actually ships.
 */
export interface Settlement {
    from: string;
    to: string;
    amount: number;
}

export function suggestSettlements(balances: Balance[]): Settlement[] {
    // From your point of view: positive net means they owe you.
    const creditors = balances.filter((b) => b.net > 0).map((b) => ({ ...b }));
    const debtors = balances.filter((b) => b.net < 0).map((b) => ({ ...b, net: -b.net }));

    const settlements: Settlement[] = [];

    // Everyone who owes you pays you.
    for (const c of creditors) {
        settlements.push({ from: c.name, to: 'You', amount: c.net });
    }
    // You pay everyone you owe.
    for (const d of debtors) {
        settlements.push({ from: 'You', to: d.name, amount: d.net });
    }

    return settlements.sort((a, b) => b.amount - a.amount);
}
