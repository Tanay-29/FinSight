import React, { useEffect } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { Svg, Polyline } from 'react-native-svg';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../store/store'; 
import { fetchMarketData } from '../store/slices/marketSlice';

// 1. KEEP YOUR AWESOME SPARKLINE COMPONENT EXACTLY AS IS
const Sparkline: React.FC<{ data: number[]; positive: boolean }> = ({ data, positive }) => {
    if (data.length === 0) return null;
    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min || 1;
    const width = 60;
    const height = 24;
    const padding = 2;

    const points = data
        .map((val, i) => {
            const x = padding + (i / (data.length - 1)) * (width - 2 * padding);
            const y = height - padding - ((val - min) / range) * (height - 2 * padding);
            return `${x},${y}`;
        })
        .join(' ');

    return (
        <Svg width={width} height={height}>
            <Polyline
                points={points}
                fill="none"
                stroke={positive ? '#10B981' : '#EF4444'}
                strokeWidth={1.5}
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </Svg>
    );
};

// 2. ADAPT YOUR INDEX ROW TO READ THE LIVE REDUX DATA
const IndexRow: React.FC<{ index: any }> = ({ index }) => {
    const isPositive = index.isUp;
    
    // Fallback dummy sparkline data based on the trend, since our current Python 
    // backend only sends the current price, not the 7-day history yet.
    const sparklineData = isPositive ? [1, 2, 4, 3, 6, 5, 8] : [8, 7, 5, 6, 3, 4, 1];

    return (
        <View className="flex-row items-center justify-between py-2 border-b border-gray-50">
            <Text className="text-sm font-medium text-gray-800 w-28" numberOfLines={1}>
                {index.name}
            </Text>

            <Text
                className="text-base font-bold text-gray-900 w-24 text-right"
                style={{ fontVariant: ['tabular-nums'] }}
            >
                {index.price}
            </Text>

            <View className="flex-row items-center w-20 justify-end">
                <Text className={`text-sm font-semibold mr-2 ${isPositive ? 'text-green-500' : 'text-red-500'}`}>
                    {isPositive ? '▲' : '▼'} {index.change}%
                </Text>
            </View>

            <View className="ml-2">
                <Sparkline data={sparklineData} positive={isPositive} />
            </View>
        </View>
    );
};

// 3. YOUR MAIN WIDGET, NOW POWERED BY REDUX
export const MarketPulseWidget = () => {
    const dispatch = useDispatch<AppDispatch>();
    const { data: marketData, loading, error } = useSelector((state: RootState) => state.market);

    useEffect(() => {
        dispatch(fetchMarketData());
        // Refresh every 60 seconds
        const interval = setInterval(() => dispatch(fetchMarketData()), 60000);
        return () => clearInterval(interval);
    }, [dispatch]);

    // Show loading spinner only on initial load
    if (loading && marketData.length === 0) {
        return (
            <View className="bg-white border border-gray-200 rounded-xl p-4 mx-4 items-center justify-center h-40">
                <ActivityIndicator size="large" color="#4F46E5" />
                <Text className="text-sm text-gray-500 mt-3">Fetching Dalal Street...</Text>
            </View>
        );
    }

    return (
        <View
            className="bg-white border border-gray-200 rounded-xl p-4 mx-4 shadow-sm"
            accessible
            accessibilityLabel="Market Pulse Widget"
        >
            <View className="flex-row items-center mb-3">
                <Text className="text-lg mr-2">📈</Text>
                <Text className="text-lg font-semibold text-gray-900">Market Pulse</Text>
            </View>

            {error && <Text className="text-red-500 text-xs mb-2">{error}</Text>}

            {marketData.map((index: any) => (
                <IndexRow key={index.id} index={index} />
            ))}

            <View className="mt-3 pt-3 border-t border-gray-100">
                <Text className="text-sm text-gray-500">Markets updated live via yfinance →</Text>
            </View>
        </View>
    );
};

// Important: If you imported this as `MarketPulse` in your HomeScreen before, 
// you might need to update that import since the component is now exported as `MarketPulseWidget`
export default MarketPulseWidget;