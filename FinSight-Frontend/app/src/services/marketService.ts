import { MarketIndex } from '../data/mockData';

/**
 * Market data service
 *
 * Uses the open-source "Indian Stock Market API" (NSE/BSE, no API key)
 * as a quick way to get live Indian stock prices without your own backend.
 *
 * Docs: https://github.com/0xramm/Indian-Stock-Market-API
 *
 * We call `/stock/list?symbols=...&res=num` and then map the response
 * into the app's `MarketIndex` format for the Market Pulse widget.
 */

const INDIAN_STOCK_API_BASE = 'https://military-jobye-haiqstudios-14f59639.koyeb.app';

// Symbols we care about for the dashboard (NSE by default).
const DASHBOARD_SYMBOLS = ['RELIANCE', 'TCS', 'HDFCBANK', 'INFY'];

export async function fetchMarketIndices(): Promise<MarketIndex[]> {
    try {
        const url = `${INDIAN_STOCK_API_BASE}/stock/list?symbols=${DASHBOARD_SYMBOLS.join(
            ','
        )}&res=num`;

        const response = await fetch(url);

        if (!response.ok) {
            throw new Error(`Failed to fetch market data: ${response.status}`);
        }

        const json = await response.json();

        if (json.status !== 'success' || !Array.isArray(json.stocks)) {
            throw new Error('Unexpected market API response');
        }

        // Map API response -> MarketIndex[]
        const indices: MarketIndex[] = json.stocks.map((stock: any) => {
            const name = stock.company_name ?? stock.symbol ?? 'N/A';
            const value = Number(stock.last_price ?? 0);
            const change = Number(stock.percent_change ?? 0);

            // Simple synthetic sparkline around the last price.
            const base = isFinite(value) && value > 0 ? value : 100;
            const sparkline: number[] = [
                base * 0.98,
                base * 0.99,
                base,
                base * 1.01,
                base * 1.005,
            ];

            return {
                name,
                value: isFinite(value) ? value : 0,
                change: isFinite(change) ? change : 0,
                sparkline,
            };
        });

        return indices;
    } catch (error) {
        // Let caller decide how to handle, but don't log to the console.
        throw error;
    }
}

