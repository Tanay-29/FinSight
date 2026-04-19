import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, SafeAreaView, KeyboardAvoidingView, Platform } from 'react-native';
import { ChevronRight, ChevronLeft, TrendingUp, Shield, Target } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

export const OnboardingScreen = () => {
    const navigation = useNavigation();
    const [step, setStep] = useState(1);
    
    // State to hold our holistic FI data
    const [formData, setFormData] = useState({
        age: '',
        targetAge: '',
        netWorth: '',
        monthlyIncome: '',
        monthlyExpenses: '',
        lifestyleTier: 'chubby', // lean, chubby, fat
        riskTolerance: 'moderate' // conservative, moderate, aggressive
    });

    const updateForm = (key: string, value: string) => {
        setFormData(prev => ({ ...prev, [key]: value }));
    };

    const nextStep = () => {
        if (step < 4) setStep(step + 1);
        else {
            // Here you would dispatch to Redux and navigate to the Feed!
            console.log("Final FI Data:", formData);
            const navigation = useNavigation<NativeStackNavigationProp<any>>(); 
        }
    };

    return (
        <SafeAreaView className="flex-1 bg-surface-secondary">
            <KeyboardAvoidingView 
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                className="flex-1"
            >
                {/* Header & Progress Bar */}
                <View className="px-6 pt-8 pb-4">
                    <Text className="text-sm font-bold text-indigo-500 uppercase tracking-widest mb-2">
                        Step {step} of 4
                    </Text>
                    <View className="flex-row h-1.5 bg-border rounded-full overflow-hidden">
                        <View 
                            className="h-full bg-indigo-600 rounded-full transition-all duration-300" 
                            style={{ width: `${(step / 4) * 100}%` }} 
                        />
                    </View>
                </View>

                <ScrollView className="flex-1 px-6" showsVerticalScrollIndicator={false}>
                    {/* PHASE 1: The Baseline */}
                    {step === 1 && (
                        <View className="mt-4">
                            <Text className="text-3xl font-bold text-text-primary mb-2">Let's build your FI roadmap.</Text>
                            <Text className="text-text-secondary mb-8">First, we need to establish your timeline.</Text>

                            <View className="space-y-4">
                                <View>
                                    <Text className="text-sm font-medium text-text-primary mb-1.5">Current Age</Text>
                                    <TextInput 
                                        className="bg-white border border-border rounded-xl px-4 py-3.5 text-text-primary text-lg"
                                        placeholder="e.g. 25"
                                        keyboardType="numeric"
                                        value={formData.age}
                                        onChangeText={(t) => updateForm('age', t)}
                                    />
                                </View>
                                <View className="mt-4">
                                    <Text className="text-sm font-medium text-text-primary mb-1.5">Target FI Age</Text>
                                    <Text className="text-xs text-text-tertiary mb-2">When do you want the option to stop working?</Text>
                                    <TextInput 
                                        className="bg-white border border-border rounded-xl px-4 py-3.5 text-text-primary text-lg"
                                        placeholder="e.g. 45"
                                        keyboardType="numeric"
                                        value={formData.targetAge}
                                        onChangeText={(t) => updateForm('targetAge', t)}
                                    />
                                </View>
                            </View>
                        </View>
                    )}

                    {/* PHASE 2: The Snapshot */}
                    {step === 2 && (
                        <View className="mt-4">
                            <Text className="text-3xl font-bold text-text-primary mb-2">Your current reality.</Text>
                            <Text className="text-text-secondary mb-8">Let's look at your cash flow and assets.</Text>

                            <View className="space-y-4">
                                <View>
                                    <Text className="text-sm font-medium text-text-primary mb-1.5">Current Net Worth (₹)</Text>
                                    <TextInput 
                                        className="bg-white border border-border rounded-xl px-4 py-3.5 text-text-primary text-lg"
                                        placeholder="Assets minus Liabilities"
                                        keyboardType="numeric"
                                        value={formData.netWorth}
                                        onChangeText={(t) => updateForm('netWorth', t)}
                                    />
                                </View>
                                <View className="mt-4">
                                    <Text className="text-sm font-medium text-text-primary mb-1.5">Monthly Income (₹)</Text>
                                    <TextInput 
                                        className="bg-white border border-border rounded-xl px-4 py-3.5 text-text-primary text-lg"
                                        placeholder="After-tax income"
                                        keyboardType="numeric"
                                        value={formData.monthlyIncome}
                                        onChangeText={(t) => updateForm('monthlyIncome', t)}
                                    />
                                </View>
                                <View className="mt-4">
                                    <Text className="text-sm font-medium text-text-primary mb-1.5">Monthly Expenses (₹)</Text>
                                    <TextInput 
                                        className="bg-white border border-border rounded-xl px-4 py-3.5 text-text-primary text-lg"
                                        placeholder="Total spending"
                                        keyboardType="numeric"
                                        value={formData.monthlyExpenses}
                                        onChangeText={(t) => updateForm('monthlyExpenses', t)}
                                    />
                                </View>
                            </View>
                        </View>
                    )}

                    {/* PHASE 3: The Vision (Selectable Cards) */}
                    {step === 3 && (
                        <View className="mt-4">
                            <Text className="text-3xl font-bold text-text-primary mb-2">Design your FI.</Text>
                            <Text className="text-text-secondary mb-6">What lifestyle are you aiming for post-independence?</Text>

                            <TouchableOpacity 
                                onPress={() => updateForm('lifestyleTier', 'lean')}
                                className={`p-4 rounded-2xl border-2 mb-4 flex-row items-center ${formData.lifestyleTier === 'lean' ? 'border-indigo-500 bg-indigo-50/30' : 'border-border bg-white'}`}
                            >
                                <Shield color={formData.lifestyleTier === 'lean' ? '#6366F1' : '#9CA3AF'} size={24} />
                                <View className="ml-4 flex-1">
                                    <Text className={`font-bold text-base ${formData.lifestyleTier === 'lean' ? 'text-indigo-700' : 'text-text-primary'}`}>Lean FI</Text>
                                    <Text className="text-text-secondary text-xs mt-1">Cover basic living expenses. Minimalist approach.</Text>
                                </View>
                            </TouchableOpacity>

                            <TouchableOpacity 
                                onPress={() => updateForm('lifestyleTier', 'chubby')}
                                className={`p-4 rounded-2xl border-2 mb-4 flex-row items-center ${formData.lifestyleTier === 'chubby' ? 'border-indigo-500 bg-indigo-50/30' : 'border-border bg-white'}`}
                            >
                                <Target color={formData.lifestyleTier === 'chubby' ? '#6366F1' : '#9CA3AF'} size={24} />
                                <View className="ml-4 flex-1">
                                    <Text className={`font-bold text-base ${formData.lifestyleTier === 'chubby' ? 'text-indigo-700' : 'text-text-primary'}`}>Chubby FI</Text>
                                    <Text className="text-text-secondary text-xs mt-1">Comfortable lifestyle with room for travel and hobbies.</Text>
                                </View>
                            </TouchableOpacity>

                            <TouchableOpacity 
                                onPress={() => updateForm('lifestyleTier', 'fat')}
                                className={`p-4 rounded-2xl border-2 flex-row items-center ${formData.lifestyleTier === 'fat' ? 'border-indigo-500 bg-indigo-50/30' : 'border-border bg-white'}`}
                            >
                                <TrendingUp color={formData.lifestyleTier === 'fat' ? '#6366F1' : '#9CA3AF'} size={24} />
                                <View className="ml-4 flex-1">
                                    <Text className={`font-bold text-base ${formData.lifestyleTier === 'fat' ? 'text-indigo-700' : 'text-text-primary'}`}>Fat FI</Text>
                                    <Text className="text-text-secondary text-xs mt-1">Luxury living, high spending, no budget constraints.</Text>
                                </View>
                            </TouchableOpacity>
                        </View>
                    )}

                    {/* PHASE 4: Risk Tolerance */}
                    {step === 4 && (
                        <View className="mt-4">
                            <Text className="text-3xl font-bold text-text-primary mb-2">Risk & Behavior.</Text>
                            <Text className="text-text-secondary mb-6">If your portfolio dropped 20% in a month, what would you do?</Text>

                            <TouchableOpacity 
                                onPress={() => updateForm('riskTolerance', 'conservative')}
                                className={`p-4 rounded-2xl border-2 mb-4 ${formData.riskTolerance === 'conservative' ? 'border-indigo-500 bg-indigo-50/30' : 'border-border bg-white'}`}
                            >
                                <Text className={`font-bold text-base ${formData.riskTolerance === 'conservative' ? 'text-indigo-700' : 'text-text-primary'}`}>Sell everything</Text>
                                <Text className="text-text-secondary text-xs mt-1">I prioritize capital preservation over high returns.</Text>
                            </TouchableOpacity>

                            <TouchableOpacity 
                                onPress={() => updateForm('riskTolerance', 'moderate')}
                                className={`p-4 rounded-2xl border-2 mb-4 ${formData.riskTolerance === 'moderate' ? 'border-indigo-500 bg-indigo-50/30' : 'border-border bg-white'}`}
                            >
                                <Text className={`font-bold text-base ${formData.riskTolerance === 'moderate' ? 'text-indigo-700' : 'text-text-primary'}`}>Do nothing</Text>
                                <Text className="text-text-secondary text-xs mt-1">I can tolerate market swings for moderate growth.</Text>
                            </TouchableOpacity>

                            <TouchableOpacity 
                                onPress={() => updateForm('riskTolerance', 'aggressive')}
                                className={`p-4 rounded-2xl border-2 ${formData.riskTolerance === 'aggressive' ? 'border-indigo-500 bg-indigo-50/30' : 'border-border bg-white'}`}
                            >
                                <Text className={`font-bold text-base ${formData.riskTolerance === 'aggressive' ? 'text-indigo-700' : 'text-text-primary'}`}>Buy more</Text>
                                <Text className="text-text-secondary text-xs mt-1">I view dips as opportunities. Maximum growth focus.</Text>
                            </TouchableOpacity>
                        </View>
                    )}
                </ScrollView>

                {/* Footer Navigation */}
                <View className="p-6 bg-white border-t border-border flex-row justify-between items-center">
                    {step > 1 ? (
                        <TouchableOpacity 
                            onPress={() => setStep(step - 1)}
                            className="p-3 bg-surface-secondary rounded-full"
                        >
                            <ChevronLeft color="#4B5563" size={24} />
                        </TouchableOpacity>
                    ) : <View className="w-12" />}

                    <TouchableOpacity 
                        onPress={nextStep}
                        className="bg-indigo-600 px-8 py-3.5 rounded-full flex-row items-center shadow-sm"
                    >
                        <Text className="text-white font-bold text-base mr-2">
                            {step === 4 ? 'Build My Plan' : 'Continue'}
                        </Text>
                        {step < 4 && <ChevronRight color="white" size={20} />}
                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
};

export default OnboardingScreen;