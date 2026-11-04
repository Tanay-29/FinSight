/**
 * Bubble Room: the market rules, as pure functions.
 *
 * One fictional token, HYPE, that everyone knows pays out exactly 100 at the
 * end. Players start with 800 in cash and 2 tokens, so everyone is worth
 * 1,000 at fair value. The price comes from demand on a curve: every buy
 * pushes it up, every sell pushes it down. A scripted set of headlines moves
 * "traders outside the room", which is what makes the bubble reliable with
 * five players or fifty; the screen says so, so nothing is hidden.
 *
 * At the end the price stops mattering and every token is cashed out at its
 * value, 100. Whoever bought high is left holding something worth less than
 * they paid. That is the lesson: price is what people pay, value is what it
 * is worth, and the two can be very far apart for a while.
 *
 * The host's phone runs these functions once a second and writes the result
 * to Firestore; players only ever append orders. Pure so it can be checked
 * in node without a database.
 */

export const TOKEN_VALUE = 100;
export const START_CASH = 800;
export const START_TOKENS = 2;
export const START_WORTH = START_CASH + START_TOKENS * TOKEN_VALUE;
export const GAME_SECONDS = 180;
/** Price sensitivity: each net buy moves the price by about 2%. */
const K = 0.02;

export function priceFor(demand: number): number {
    return Math.max(5, Math.round(TOKEN_VALUE * Math.exp(K * demand)));
}

export interface BubbleEvent {
    id: string;
    at: number;
    until: number;
    /** Net tokens a second bought (positive) or sold (negative) by outside traders. */
    flow: number;
    headline: string;
}

/** The script. Same every game, so the demo is reliable. */
export const TIMELINE: BubbleEvent[] = [
    { id: 'influencer', at: 20, until: 50, flow: 0.6, headline: 'A finance influencer with 2M followers posts: "HYPE is the next big thing"' },
    { id: 'trending', at: 60, until: 100, flow: 1.0, headline: 'HYPE is trending. Your cousin just bought some.' },
    { id: 'early', at: 105, until: 130, flow: -0.5, headline: 'Early buyers are quietly cashing out' },
    { id: 'rumour', at: 130, until: 160, flow: -1.5, headline: 'Rumour: HYPE has no real use. Sellers rush in.' },
    { id: 'quiet', at: 160, until: GAME_SECONDS, flow: -0.3, headline: 'The crowd has moved on' },
];

export function eventAt(t: number): BubbleEvent | null {
    return TIMELINE.find((e) => t >= e.at && t < e.until) ?? null;
}

export interface PlayerState {
    cash: number;
    tokens: number;
    buys: number;
    sells: number;
    /** Total paid for tokens, and received for them. */
    spent: number;
    earned: number;
    /** Highest price this player bought at. */
    topBuy: number;
}

export const newPlayer = (): PlayerState => ({
    cash: START_CASH, tokens: START_TOKENS, buys: 0, sells: 0, spent: 0, earned: 0, topBuy: 0,
});

export interface MarketState {
    demand: number;
    price: number;
}

export type Side = 'buy' | 'sell';

/**
 * Fill one order at the current price, if the player can. Returns the new
 * market and player, or null when the order cannot be filled (not enough
 * cash, or no token to sell), in which case nothing changes.
 */
export function fill(market: MarketState, player: PlayerState, side: Side): { market: MarketState; player: PlayerState } | null {
    const p = market.price;
    if (side === 'buy') {
        if (player.cash < p) return null;
        const demand = market.demand + 1;
        return {
            market: { demand, price: priceFor(demand) },
            player: { ...player, cash: player.cash - p, tokens: player.tokens + 1, buys: player.buys + 1, spent: player.spent + p, topBuy: Math.max(player.topBuy, p) },
        };
    }
    if (player.tokens <= 0) return null;
    const demand = market.demand - 1;
    return {
        market: { demand, price: priceFor(demand) },
        player: { ...player, cash: player.cash + p, tokens: player.tokens - 1, sells: player.sells + 1, earned: player.earned + p },
    };
}

/** One second of outside traders. Fractional flow accumulates in demand. */
export function tick(market: MarketState, t: number): MarketState {
    const e = eventAt(t);
    if (!e) return market;
    const demand = market.demand + e.flow;
    return { demand, price: priceFor(demand) };
}

/** What a player is worth while trading, at the market price. */
export const worthAtPrice = (p: PlayerState, price: number) => p.cash + p.tokens * price;
/** What they end with, every token cashed out at its value. */
export const finalWorth = (p: PlayerState) => p.cash + p.tokens * TOKEN_VALUE;

export interface RoomSummary {
    players: number;
    peak: number;
    peakAt: number;
    /** Players who ended below where they started: doing nothing would have beaten them. */
    belowStart: number;
    /** Players who bought at twice the value or more. */
    boughtHigh: number;
    best?: { id: string; worth: number };
    worst?: { id: string; worth: number };
}

export function summarise(players: Record<string, PlayerState>, history: number[]): RoomSummary {
    const ids = Object.keys(players);
    let peak = TOKEN_VALUE;
    let peakAt = 0;
    history.forEach((p, i) => { if (p > peak) { peak = p; peakAt = i; } });
    const ranked = ids.map((id) => ({ id, worth: finalWorth(players[id]) })).sort((a, b) => b.worth - a.worth);
    return {
        players: ids.length,
        peak,
        peakAt,
        belowStart: ranked.filter((r) => r.worth < START_WORTH).length,
        boughtHigh: ids.filter((id) => players[id].topBuy >= TOKEN_VALUE * 2).length,
        best: ranked[0],
        worst: ranked[ranked.length - 1],
    };
}

/** A short room code people can type: no 0/O, 1/I. */
export function roomCode(rand: () => number = Math.random): string {
    const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    return Array.from({ length: 4 }, () => alphabet[Math.floor(rand() * alphabet.length)]).join('');
}
