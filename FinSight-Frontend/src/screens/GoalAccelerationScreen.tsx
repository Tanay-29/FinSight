import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, SafeAreaView, Platform } from 'react-native';
import { ArrowRight, Clock, TrendingUp, ShieldCheck, Zap, ChevronLeft } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

// We are pulling data directly matching your uploaded screenshot!
const GOAL_DATA = {
    name: "Harrier",
    target: 1800000,
    currentSaved: 15000,
    daysLeft: 543,
};

// Standard Bank Rate vs Our Suggested Portfolio Rate
const BANK_RATE_ANNUAL = 0.04; // 4% Savings Account
const PORTFOLIO_RATE_ANNUAL = 0.09; // 9% Conservative Hybrid (Medium Term)

// The Math Engine: Calculates how many months it takes to hit the target
const calculateMonthsToGoal = (target: number, current: number, annualRate: number, monthlyContribution: number) => {
    if (monthlyContribution <= 0) return 999;
    
    let months = 0;
    let balance = current;
    const monthlyRate = annualRate / 12;

    // Iterative calculation for accuracy
    while (balance < target && months < 600) { // Capped at 50 years to prevent infinite loops
        balance = balance * (1 + monthlyRate) + monthlyContribution;
        months++;
    }
    return months;
};

export const GoalAccelerationScreen = () => {
    const navigation = useNavigation<NativeStackNavigationProp<any>>();
    
    // We start them at a reasonable ₹90,000/mo SIP to reach their 18L goal in ~1.5 years
    const [monthlySip, setMonthlySip] = useState(90000);

    // Calculate timelines
    const monthsWithBank = calculateMonthsToGoal(GOAL_DATA.target, GOAL_DATA.currentSaved, BANK_RATE_ANNUAL, monthlySip);
    const monthsWithPortfolio = calculateMonthsToGoal(GOAL_DATA.target, GOAL_DATA.currentSaved, PORTFOLIO_RATE_ANNUAL, monthlySip);
    
    // The magic number!
    const monthsSaved = monthsWithBank - monthsWithPortfolio;

    const formatCurrency = (val: number) => `₹ ${val.toLocaleString('en-IN')}`;

    return (
        <SafeAreaView 
            className="flex-1 bg-surface-secondary"
            style={Platform.OS === 'web' ? { height: '100vh', overflow: 'hidden' } : { flex: 1 }}
        >
            {/* --- HEADER --- */}
            <View className="px-6 pt-4 pb-2 flex-row items-center">
                <TouchableOpacity onPress={() => navigation.goBack()} className="p-2 -ml-2">
                    <ChevronLeft color="#1F2937" size={28} />
                </TouchableOpacity>
                <Text className="text-xl font-bold text-text-primary ml-2">Accelerate Goal</Text>
            </View>

            <ScrollView 
                className="flex-1 px-6 pt-4" 
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 120 }} 
            >
                {/* Goal Context Card */}
                <View className="bg-white rounded-3xl p-6 border border-border mb-6 shadow-sm">
                    <View className="flex-row items-center justify-between mb-4">
                        <View className="flex-row items-center">
                            <View className="w-10 h-10 bg-slate-100 rounded-full items-center justify-center mr-3">
                                <Text className="text-xl">🚙</Text>
                            </View>
                            <View>
                                <Text className="text-lg font-bold text-text-primary">{GOAL_DATA.name}</Text>
                                <Text className="text-sm text-text-secondary">Target: {formatCurrency(GOAL_DATA.target)}</Text>
                            </View>
                        </View>
                    </View>

                    {/* Progress Bar */}
                    <View className="h-2 bg-slate-100 rounded-full overflow-hidden mb-2">
                        <View 
                            className="h-full bg-indigo-500 rounded-full" 
                            style={{ width: `${(GOAL_DATA.currentSaved / GOAL_DATA.target) * 100}%` }} 
                        />
                    </View>
                    <Text className="text-xs text-text-tertiary">Currently saved: {formatCurrency(GOAL_DATA.currentSaved)}</Text>
                </View>

                {/* The "Smart Suggestion" Engine Output */}
                <View className="mb-6">
                    <Text className="text-sm font-bold text-emerald-600 uppercase tracking-widest mb-3 flex-row items-center">
                        <Zap size={14} color="#059669" /> AI Strategy Match
                    </Text>
                    <View className="bg-emerald-50 rounded-2xl p-5 border border-emerald-100">
                        <View className="flex-row items-center mb-2">
                            <ShieldCheck color="#059669" size={24} />
                            <Text className="text-lg font-bold text-emerald-900 ml-3">Conservative Hybrid Fund</Text>
                        </View>
                        <Text className="text-emerald-700 text-sm leading-5">
                            Since you need this money in roughly 1.5 years, we recommend a stable mix of 80% Debt and 20% Equity. It targets ~9% returns with minimal volatility.
                        </Text>
                    </View>
                </View>

                {/* The Mathematical Impact (The Wow Factor) */}
                <View className="bg-indigo-900 rounded-3xl p-6 relative overflow-hidden mb-6">
                    {/* Background decoration */}
                    <View className="absolute -right-6 -top-6 opacity-10">
                        <Clock size={120} color="#FFFFFF" />
                    </View>

                    <Text className="text-indigo-200 text-sm font-bold uppercase tracking-wider mb-2">
                        Time Saved
                    </Text>
                    <View className="flex-row items-baseline mb-4">
                        <Text className="text-white text-5xl font-black">{monthsSaved}</Text>
                        <Text className="text-indigo-200 text-lg font-bold ml-2">Months</Text>
                    </View>
                    
                    <View className="bg-white/10 rounded-2xl p-4 flex-row justify-between items-center mb-6">
                        <View>
                            <Text className="text-indigo-200 text-xs mb-1">Standard Bank (4%)</Text>
                            <Text className="text-white font-bold text-base">{monthsWithBank} months</Text>
                        </View>
                        <View className="w-px h-8 bg-white/20" />
                        <View>
                            <Text className="text-indigo-200 text-xs mb-1">FinSight Plan (9%)</Text>
                            <Text className="text-emerald-400 font-bold text-base">{monthsWithPortfolio} months</Text>
                        </View>
                    </View>

                    {/* Interactive Slider / Adjuster */}
                    <View>
                        <Text className="text-indigo-200 text-xs mb-3 text-center">Simulate Monthly Investment</Text>
                        <View className="flex-row justify-between items-center bg-white/5 rounded-full p-1 border border-white/10">
                            <TouchableOpacity 
                                onPress={() => setMonthlySip(Math.max(10000, monthlySip - 5000))}
                                className="w-12 h-12 bg-white/10 rounded-full items-center justify-center"
                            >
                                <Text className="text-white text-2xl font-bold">-</Text>
                            </TouchableOpacity>
                            
                            <Text className="text-white font-bold text-xl">{formatCurrency(monthlySip)}</Text>
                            
                            <TouchableOpacity 
                                onPress={() => setMonthlySip(monthlySip + 5000)}
                                className="w-12 h-12 bg-white/10 rounded-full items-center justify-center"
                            >
                                <Text className="text-white text-2xl font-bold">+</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>

            </ScrollView>

            {/* STICKY BOTTOM BUTTON */}}
            <View className="absolute bottom-0 w-full px-6 py-4 bg-white border-t border-border/40 pb-6 shadow-xl z-50">
                <TouchableOpacity 
                    // 👇 ADD THIS LINE RIGHT HERE! 👇
                    onPress={() => navigation.replace('MainTabs')} 
                    className="bg-indigo-600 p-4 rounded-2xl flex-row items-center justify-center"
                >
                    <Text className="text-white font-bold text-lg mr-2">Convert to Smart SIP</Text>
                    <TrendingUp color="white" size={20} />
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
};

export default GoalAccelerationScreen;