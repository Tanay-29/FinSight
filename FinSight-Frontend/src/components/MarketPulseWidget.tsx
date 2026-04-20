import React, { useEffect } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { Svg, Polyline } from 'react-native-svg';
import { TrendingUp, TrendingDown } from 'lucide-react-native';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../store/store';
import { fetchMarketData } from '../store/slices/marketSlice';

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

const IndexRow: React.FC<{ index: any }> = ({ index }) => {
    const isPositive = index.isUp;
    const sparklineData = isPositive ? [1, 2, 4, 3, 6, 5, 8] : [8, 7, 5, 6, 3, 4, 1];
    const TrendIcon = isPositive ? TrendingUp : TrendingDown;
    const trendColor = isPositive ? '#10B981' : '#EF4444';

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
                <TrendIcon size={12} color={trendColor} />
                <Text className={`text-sm font-semibold ml-1 ${isPositive ? 'text-green-500' : 'text-red-500'}`}>
                    {index.change}%
                </Text>
            </View>

            <View className="ml-2">
                <Sparkline data={sparklineData} positive={isPositive} />
            </View>
        </View>
    );
};

export const MarketPulseWidget = () => {
    const dispatch = useDispatch<AppDispatch>();
    const { data: marketData, loading, error } = useSelector((state: RootState) => state.market);

    useEffect(() => {
        dispatch(fetchMarketData());
        const interval = setInterval(() => dispatch(fetchMarketData()), 60000);
        return () => clearInterval(interval);
    }, [dispatch]);

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
                <TrendingUp size={20} color="#1F2937" />
                <Text className="text-lg font-semibold text-gray-900 ml-2">Market Pulse</Text>
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

export default MarketPulseWidget;