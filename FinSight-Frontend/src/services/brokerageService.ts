/**
 * brokerageService.ts
 * Communicates with the Flask mock brokerage engine
 */
import { BACKEND_URL, authedFetch } from '../config/api';

export interface AssetPrice {
    symbol: string;
    name: string;
    type: 'ETF' | 'Stock' | 'MF';
    price: number;
    change_pct: number;
    is_up: boolean;
}

export interface Order {
    order_id: string;
    user_id: string;
    asset_type: string;
    asset_id: string;
    quantity: number;
    price: number;
    order_type: 'BUY' | 'SELL';
    status: 'PENDING' | 'EXECUTED' | 'FAILED';
    timestamp: string;
    total?: number;
}

export interface Holding {
    asset_id: string;
    name: string;
    type: string;
    quantity: number;
    avg_buy_price: number;
    current_price: number;
    invested: number;
    current_value: number;
    unrealised_pnl: number;
    unrealised_pnl_pct: number;
    allocation_pct: number;
}

export interface Portfolio {
    holdings: Holding[];
    total_invested: number;
    total_value: number;
    total_pnl: number;
    total_pnl_pct: number;
}

export interface PlaceOrderParams {
    asset_id: string;
    quantity: number;
    order_type: 'BUY' | 'SELL';
}

export const fetchPrices = async (): Promise<AssetPrice[]> => {
    const res = await fetch(`${BACKEND_URL}/api/prices`);
    if (!res.ok) throw new Error('Failed to fetch prices');
    return res.json();
};

export const placeOrder = async (params: PlaceOrderParams): Promise<Order> => {
    const res = await authedFetch('/api/orders', {
        method: 'POST',
        body: JSON.stringify(params),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Order failed');
    return data;
};

export const fetchOrders = async (): Promise<Order[]> => {
    const res = await authedFetch('/api/orders');
    if (!res.ok) throw new Error('Failed to fetch orders');
    return res.json();
};

export const fetchPortfolio = async (): Promise<Portfolio> => {
    const res = await authedFetch('/api/portfolio');
    if (!res.ok) throw new Error('Failed to fetch portfolio');
    return res.json();
};

export const fetchLedger = async () => {
    const res = await authedFetch('/api/ledger');
    if (!res.ok) throw new Error('Failed to fetch ledger');
    return res.json();
};
