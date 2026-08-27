import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Alert, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Sparkles, ChevronLeft, CheckCircle2 } from 'lucide-react-native';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { addTransaction, fetchCategoryCorrections } from '../store/slices/transactionsSlice';
import { parseBankSMS } from '../utils/smartCategorizer';

// --- 2. THE UI COMPONENT ---
export default function AddTransactionScreen() {
    const navigation = useNavigation();
    const dispatch = useAppDispatch();
    
    // Bring back your original syncStatus for the loading spinner!
    const { syncStatus, corrections } = useAppSelector((state) => state.transactions);

    // Load what the user has already taught the categoriser, so a paste lands
    // in the right category first time for merchants the rules do not know.
    useEffect(() => {
        dispatch(fetchCategoryCorrections());
    }, [dispatch]);

    // Form State
    const [smsText, setSmsText] = useState('');
    const [amount, setAmount] = useState('');
    const [merchant, setMerchant] = useState('');
    const [category, setCategory] = useState('other');
    const [type, setType] = useState<'debit' | 'credit'>('debit');
    const [isParsed, setIsParsed] = useState(false);

    const ALL_CATEGORIES = ['dining', 'shopping', 'transport', 'groceries', 'utilities', 'entertainment', 'investments', 'health', 'education', 'housing', 'other'];

    const handleSmartPaste = () => {
        if (!smsText.trim()) {
            Alert.alert("Hold up!", "Please paste a bank SMS first.");
            return;
        }

        const extracted = parseBankSMS(smsText, corrections);
        
        if (extracted.amount === 0) {
            Alert.alert("Couldn't find an amount", "Make sure the SMS contains 'INR', 'Rs', or '₹'.");
            return;
        }

        // Auto-fill the form
        setAmount(extracted.amount.toString());
        setMerchant(extracted.merchant);
        setCategory(extracted.category);
        setType(extracted.type as 'debit' | 'credit');
        setIsParsed(true);
    };

    const handleSave = async () => {
        if (!amount || !merchant) {
            Alert.alert('Missing Info', 'Please fill in the amount and merchant.');
            return;
        }

        // Restore your exact Redux dispatch logic here
        try {
            await dispatch(addTransaction({
                amount: parseFloat(amount),
                merchant,
                category,
                type,
                date: new Date().toISOString(),
                source: isParsed ? 'auto' : 'manual',
            })).unwrap(); // .unwrap() allows us to catch errors if the thunk fails
            
            navigation.goBack();
        } catch (error) {
            Alert.alert('Error', 'Failed to save transaction.');
        }
    };

    return (
        <SafeAreaView className="flex-1 bg-surface-secondary" edges={['top', 'bottom']}>
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} className="flex-1">
                
                {/* Header */}
                <View className="px-4 py-4 flex-row items-center border-b border-border bg-white">
                    <TouchableOpacity onPress={() => navigation.goBack()} className="mr-3">
                        <ChevronLeft size={28} color="#111827" />
                    </TouchableOpacity>
                    <Text className="text-xl font-bold text-text-primary">Add Transaction</Text>
                </View>

                <ScrollView className="flex-1 px-4 pt-4" showsVerticalScrollIndicator={false}>
                    
                    {/* Smart Paste Section */}
                    <View className="bg-indigo-50 border border-indigo-200 rounded-2xl p-4 mb-6">
                        <View className="flex-row items-center mb-2">
                            <Sparkles size={18} color="#4F46E5" />
                            <Text className="text-base font-bold text-indigo-700 ml-2">Smart Paste</Text>
                        </View>
                        <Text className="text-xs text-indigo-600/80 mb-3">
                            Paste your bank SMS below. We'll extract the amount, merchant, and category automatically.
                        </Text>
                        <TextInput
                            className="bg-white border border-indigo-100 rounded-xl p-3 text-sm text-text-primary mb-3 min-h-[80px]"
                            placeholder="e.g., INR 649.00 debited from A/c XX1234 at NETFLIX on 21-Mar-26"
                            multiline
                            textAlignVertical="top"
                            value={smsText}
                            onChangeText={(text) => {
                                setSmsText(text);
                                setIsParsed(false); 
                            }}
                        />
                        <TouchableOpacity 
                            onPress={handleSmartPaste}
                            className={`flex-row justify-center items-center py-3 rounded-xl ${isParsed ? 'bg-green-500' : 'bg-indigo-600'}`}
                        >
                            {isParsed ? <CheckCircle2 size={18} color="white" /> : <Sparkles size={18} color="white" />}
                            <Text className="text-white font-bold ml-2">
                                {isParsed ? "Extracted Successfully" : "Auto-Fill Form"}
                            </Text>
                        </TouchableOpacity>
                    </View>

                    {/* Manual Form Section */}
                    <Text className="text-sm font-bold text-text-secondary uppercase tracking-wider mb-3 ml-1">
                        Transaction Details
                    </Text>

                    {/* Type Toggle */}
                    <View className="flex-row bg-surface-tertiary rounded-xl p-1 mb-4">
                        <TouchableOpacity 
                            className={`flex-1 py-2 rounded-lg items-center ${type === 'debit' ? 'bg-white shadow-sm' : ''}`}
                            onPress={() => setType('debit')}
                        >
                            <Text className={`font-semibold ${type === 'debit' ? 'text-alert-critical' : 'text-text-secondary'}`}>Expense</Text>
                        </TouchableOpacity>
                        <TouchableOpacity 
                            className={`flex-1 py-2 rounded-lg items-center ${type === 'credit' ? 'bg-white shadow-sm' : ''}`}
                            onPress={() => setType('credit')}
                        >
                            <Text className={`font-semibold ${type === 'credit' ? 'text-profit' : 'text-text-secondary'}`}>Income</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Amount & Merchant */}
                    <View className="flex-row gap-3 mb-4">
                        <View className="flex-1 bg-white border border-border rounded-xl p-3">
                            <Text className="text-xs text-text-secondary mb-1">Amount (₹)</Text>
                            <TextInput
                                className="text-xl font-bold text-text-primary p-0"
                                keyboardType="numeric"
                                placeholder="0.00"
                                value={amount}
                                onChangeText={setAmount}
                            />
                        </View>
                        <View className="flex-1 bg-white border border-border rounded-xl p-3">
                            <Text className="text-xs text-text-secondary mb-1">Merchant</Text>
                            <TextInput
                                className="text-lg font-semibold text-text-primary p-0"
                                placeholder="e.g. Zomato"
                                value={merchant}
                                onChangeText={setMerchant}
                            />
                        </View>
                    </View>

                    {/* Category Selection */}
                    <View className="bg-white border border-border rounded-xl p-4 mb-8">
                        <Text className="text-xs text-text-secondary mb-3">Category</Text>
                        <View className="flex-row flex-wrap gap-2">
                            {ALL_CATEGORIES.map((cat) => (
                                <TouchableOpacity
                                    key={cat}
                                    onPress={() => setCategory(cat)}
                                    className={`px-3 py-2 rounded-full border ${category === cat ? 'bg-brand-primary border-brand-primary' : 'bg-surface-secondary border-border'}`}
                                >
                                    <Text className={`text-sm capitalize ${category === cat ? 'text-white font-bold' : 'text-text-primary'}`}>
                                        {cat}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>

                </ScrollView>

                {/* Save Button with your original syncStatus integration */}
                <View className="p-4 bg-white border-t border-border">
                    <TouchableOpacity 
                        onPress={handleSave}
                        disabled={!amount || syncStatus === 'syncing'}
                        className={`py-4 rounded-xl items-center ${(!amount || syncStatus === 'syncing') ? 'bg-gray-400' : 'bg-gray-900'}`}
                    >
                        {syncStatus === 'syncing' ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <Text className="text-white text-lg font-bold">Save Transaction</Text>
                        )}
                    </TouchableOpacity>
                </View>

            </KeyboardAvoidingView>
        </SafeAreaView>
    );
};