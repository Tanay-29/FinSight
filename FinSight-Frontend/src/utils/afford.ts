/**
 * Can this be bought before payday without running out?
 *
 * The month is projected forward at the pace spent so far, which is the
 * plainest honest forecast available: it uses nothing but the student's own
 * numbers. The price comes off what that leaves. Payday is the 1st of next
 * month. Every number is computed here; nothing is estimated by a model.
 *
 *   yes     at least a fifth of income still left afterwards
 *   tight   something left, less than a fifth
 *   no      the projection runs out before the 1st
 */
export interface AffordResult {
    verdict: 'yes' | 'tight' | 'no';
    daysLeft: number;
    projectedRest: number;
    leftAfter: number;
}

export function affordBeforePayday(
    { income, spent, price }: { income: number; spent: number; price: number },
    now: Date = new Date(),
): AffordResult {
    const day = now.getDate();
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const daysLeft = daysInMonth - day;
    const pace = day > 0 ? spent / day : 0;
    const projectedRest = pace * daysLeft;
    const leftAfter = income - spent - projectedRest - price;
    const verdict = leftAfter >= income * 0.2 ? 'yes' : leftAfter >= 0 ? 'tight' : 'no';
    return { verdict, daysLeft, projectedRest, leftAfter };
}
