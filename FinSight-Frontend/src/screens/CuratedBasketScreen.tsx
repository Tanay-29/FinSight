import React, { useState } from 'react';
// 1. Added Platform to imports
import { View, Text, ScrollView, TouchableOpacity, SafeAreaView, Platform } from 'react-native';
import { TrendingUp, ShieldCheck, Coins, ArrowRight, ChevronDown, ChevronUp } from 'lucide-react-native';

import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

// Define Data and Helpers OUTSIDE the component
const mockReduxState = {
    riskTolerance: 'moderate',
    yearsToFI: 15,
};

const getPortfolioStrategy = (risk: string) => {
    switch (risk) {
        case 'moderate':
        default:
            return {
                title: "Balanced Wealth Builder",
                description: "A smooth ride balancing decent growth with strong downside protection.",
                allocation: [
                    { 
                        name: "Flexi-Cap Mutual Funds", 
                        split: "45%", 
                        type: "equity", 
                        icon: TrendingUp, 
                        color: "#6366F1", 
                        desc: "Dynamic equity exposure",
                        holdings: [
                            "HDFC Bank Ltd. (Financials)",
                            "Reliance Industries (Energy)",
                            "Infosys Ltd. (Technology)",
                            "Larsen & Toubro (Infrastructure)"
                        ]
                    },
                    { 
                        name: "Large & Mid Cap Funds", 
                        split: "15%", 
                        type: "equity", 
                        icon: TrendingUp, 
                        color: "#8B5CF6", 
                        desc: "Broader market growth",
                        holdings: [
                            "ICICI Bank (Large Cap)",
                            "Trent Ltd. (Mid Cap)",
                            "Tata Motors (Large Cap)",
                            "TVS Motor Co. (Mid Cap)"
                        ]
                    },
                    { 
                        name: "Debt Mutual Funds", 
                        split: "30%", 
                        type: "debt", 
                        icon: ShieldCheck, 
                        color: "#10B981", 
                        desc: "Portfolio shock absorbers",
                        holdings: [
                            "7.18% Govt of India Bonds 2033",
                            "State Development Loans (SDLs)",
                            "AAA-Rated Corporate Bonds (NABARD)",
                            "Treasury Bills (T-Bills)"
                        ]
                    },
                    { 
                        name: "Physical/Digital Gold", 
                        split: "10%", 
                        type: "gold", 
                        icon: Coins, 
                        color: "#F59E0B", 
                        desc: "Inflation hedge",
                        holdings: [
                            "RBI Sovereign Gold Bonds (SGBs)",
                            "Gold Exchange Traded Funds (ETFs)",
                            "Physical Gold Coins/Bars"
                        ]
                    }
                ]
            };
    }
};

export const CuratedBasketScreen = () => {
    const strategy = getPortfolioStrategy(mockReduxState.riskTolerance);
    const navigation = useNavigation<NativeStackNavigationProp<any>>();
    
    // State
    const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
    const [monthlySip, setMonthlySip] = useState(20000); 

    const toggleExpand = (index: number) => {
        setExpandedIndex(expandedIndex === index ? null : index);
    };

    // Calculate Compound Interest
    const calculateProjection = () => {
        const years = mockReduxState.yearsToFI;
        const rate = 0.104; // 10.4% blended return
        const monthlyRate = rate / 12;
        const totalMonths = years * 12;
        
        const futureValue = monthlySip * ((Math.pow(1 + monthlyRate, totalMonths) - 1) / monthlyRate) * (1 + monthlyRate);
        const totalInvested = monthlySip * totalMonths;
        const wealthGained = futureValue - totalInvested;

        return { futureValue, totalInvested, wealthGained };
    };

    const projection = calculateProjection();

    // Helper function to format Indian Rupees
    const formatCurrency = (val: number) => {
        if (val >= 10000000) return `₹ ${(val / 10000000).toFixed(2)} Cr`;
        if (val >= 100000) return `₹ ${(val / 100000).toFixed(2)} L`;
        return `₹ ${val.toLocaleString('en-IN')}`;
    };

    return (
        <SafeAreaView 
            className="flex-1 bg-surface-secondary"
            // 2. THE MAGIC BULLET: This forces the web browser to act exactly like a phone screen
            style={Platform.OS === 'web' ? { height: '100vh', overflow: 'hidden' } : { flex: 1 }}
        >
            
            {/* --- SCROLLABLE CONTENT --- */}
            <ScrollView 
                className="flex-1 px-6 pt-6" 
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 40 }} 
            >
                {/* Header Section */}
                <View className="mb-8">
                    <Text className="text-sm font-bold text-indigo-500 uppercase tracking-widest mb-2">
                        Your Custom Plan
                    </Text>
                    <Text className="text-3xl font-bold text-text-primary mb-2">
                        {strategy.title}
                    </Text>
                    <Text className="text-text-secondary text-base leading-6">
                        Based on your {mockReduxState.riskTolerance} profile and {mockReduxState.yearsToFI}-year runway to Financial Independence, here is your mathematically optimized portfolio.
                    </Text>
                </View>

                {/* The Basket Breakdown with Accordion */}
                <View className="space-y-4 mb-8">
                    {strategy.allocation.map((item, index) => {
                        const isExpanded = expandedIndex === index;

                        return (
                            <View key={index} className="bg-white rounded-2xl border border-border overflow-hidden">
                                <TouchableOpacity 
                                    activeOpacity={0.7}
                                    onPress={() => toggleExpand(index)}
                                    className="p-5 flex-row items-center"
                                >
                                    <View 
                                        className="w-12 h-12 rounded-full items-center justify-center mr-4"
                                        style={{ backgroundColor: `${item.color}15` }} 
                                    >
                                        <item.icon color={item.color} size={24} />
                                    </View>
                                    
                                    <View className="flex-1">
                                        <Text className="text-lg font-bold text-text-primary">{item.name}</Text>
                                        <Text className="text-sm text-text-secondary mt-0.5">{item.desc}</Text>
                                    </View>

                                    <View className="items-end ml-2 flex-row gap-3">
                                        <Text className="text-xl font-black" style={{ color: item.color }}>
                                            {item.split}
                                        </Text>
                                        {isExpanded ? (
                                            <ChevronUp color="#9CA3AF" size={20} />
                                        ) : (
                                            <ChevronDown color="#9CA3AF" size={20} />
                                        )}
                                    </View>
                                </TouchableOpacity>

                                {/* Expanded Details Section */}
                                {isExpanded && (
                                    <View className="px-5 pb-5 pt-2 border-t border-border/50 bg-slate-50/50">
                                        <Text className="text-xs font-bold text-text-tertiary uppercase tracking-wider mb-3 mt-2">
                                            Top Holdings & Components
                                        </Text>
                                        {item.holdings.map((holding, hIndex) => (
                                            <View key={hIndex} className="flex-row items-center mb-2">
                                                <View className="w-1.5 h-1.5 rounded-full bg-slate-400 mr-3" />
                                                <Text className="text-sm text-text-secondary flex-1">
                                                    {holding}
                                                </Text>
                                            </View>
                                        ))}
                                    </View>
                                )}
                            </View>
                        );
                    })}
                </View>

                {/* 15-Year Wealth Projection Card */}
                <View className="bg-indigo-900 rounded-3xl p-6 overflow-hidden relative">
                    <Text className="text-indigo-200 text-sm font-bold uppercase tracking-wider mb-2">
                        {mockReduxState.yearsToFI}-Year Wealth Projection
                    </Text>
                    
                    <View className="flex-row items-end mb-1">
                        <Text className="text-white text-4xl font-black">{formatCurrency(projection.futureValue)}</Text>
                    </View>
                    <Text className="text-indigo-200 text-xs mb-6">Expected corpus at 10.4% p.a. blended return</Text>

                    {/* Breakdown */}
                    <View className="bg-white/10 rounded-2xl p-4 flex-row justify-between mb-6">
                        <View>
                            <Text className="text-indigo-200 text-xs mb-1">Total Invested</Text>
                            <Text className="text-white font-bold text-base">{formatCurrency(projection.totalInvested)}</Text>
                        </View>
                        <View className="w-px bg-white/20" />
                        <View>
                            <Text className="text-indigo-200 text-xs mb-1">Est. Returns</Text>
                            <Text className="text-emerald-400 font-bold text-base">+{formatCurrency(projection.wealthGained)}</Text>
                        </View>
                    </View>

                    {/* SIP Adjuster */}
                    <View>
                        <Text className="text-indigo-200 text-xs mb-3 text-center">Adjust Monthly SIP</Text>
                        <View className="flex-row justify-between items-center bg-white/5 rounded-full p-1 border border-white/10">
                            <TouchableOpacity 
                                onPress={() => setMonthlySip(Math.max(5000, monthlySip - 5000))}
                                className="w-10 h-10 bg-white/10 rounded-full items-center justify-center"
                            >
                                <Text className="text-white text-xl font-bold">-</Text>
                            </TouchableOpacity>
                            
                            <Text className="text-white font-bold text-lg">₹ {monthlySip.toLocaleString('en-IN')}/mo</Text>
                            
                            <TouchableOpacity 
                                onPress={() => setMonthlySip(monthlySip + 5000)}
                                className="w-10 h-10 bg-white/10 rounded-full items-center justify-center"
                            >
                                <Text className="text-white text-xl font-bold">+</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </ScrollView>

            {/* --- 3. STICKY BOTTOM BUTTON --- */}
            {/* Because the parent is locked to exactly 100vh, this will rest perfectly on the bottom edge */}
            <View className="px-6 py-4 bg-white border-t border-border/40">
                <TouchableOpacity 
                    onPress={() => navigation.replace('MainTabs')}
                    className="bg-indigo-600 p-4 rounded-2xl flex-row items-center justify-center shadow-sm"
                >
                    <Text className="text-white font-bold text-lg mr-2">Start Auto-Invest (SIP)</Text>
                    <ArrowRight color="white" size={20} />
                </TouchableOpacity>
            </View>

        </SafeAreaView>
    );
};

export default CuratedBasketScreen;