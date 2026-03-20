import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native'; // Keep for types if needed, or remove
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { X } from 'lucide-react-native';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { addTransaction } from '../store/slices/transactionsSlice';

type Props = NativeStackScreenProps<any, 'AddTransaction'>;

export default function AddTransactionScreen({ navigation }: Props) {
    // const navigation = useNavigation(); // Removed hook
    const dispatch = useAppDispatch();
    const { syncStatus } = useAppSelector((state) => state.transactions);

    const [amount, setAmount] = useState('');
    const [merchant, setMerchant] = useState('');
    const [category, setCategory] = useState({ id: 'dining', name: 'Dining' });
    const [type, setType] = useState<'debit' | 'credit'>('debit');

    const categories = [
        { id: 'dining', name: 'Dining' },
        { id: 'transport', name: 'Transport' },
        { id: 'shopping', name: 'Shopping' },
        { id: 'groceries', name: 'Groceries' },
        { id: 'utilities', name: 'Utilities' },
        { id: 'entertainment', name: 'Entertainment' },
        { id: 'other', name: 'Other' },
    ];

    const handleSubmit = async () => {
        if (!amount || !merchant) return;

        // Dispatch thunk
        await dispatch(addTransaction({
            amount: parseFloat(amount),
            merchant,
            category: category.id,
            type,
            date: new Date().toISOString(),
            source: 'manual',
        }));

        navigation.goBack();
    };

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
            <View className="flex-row justify-between items-center px-4 py-3 border-b border-gray-200">
                <Text className="text-xl font-bold">Add Transaction</Text>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <X color="#000" size={24} />
                </TouchableOpacity>
            </View>

            <ScrollView className="flex-1 p-4">
                {/* Amount */}
                <View className="mb-4">
                    <Text className="text-gray-500 mb-1">Amount</Text>
                    <TextInput
                        className="text-4xl font-bold border-b border-gray-300 pb-2"
                        placeholder="0"
                        keyboardType="numeric"
                        value={amount}
                        onChangeText={setAmount}
                        autoFocus
                    />
                </View>

                {/* Merchant */}
                <View className="mb-4">
                    <Text className="text-gray-500 mb-1">Merchant / Description</Text>
                    <TextInput
                        className="bg-gray-100 p-3 rounded-lg text-lg"
                        placeholder="e.g. Starbucks"
                        value={merchant}
                        onChangeText={setMerchant}
                    />
                </View>

                {/* Type Toggle */}
                <View className="flex-row bg-gray-100 p-1 rounded-lg mb-4">
                    <TouchableOpacity
                        className={`flex-1 py-2 items-center rounded-md ${type === 'debit' ? 'bg-white shadow-sm' : ''}`}
                        onPress={() => setType('debit')}
                    >
                        <Text className={type === 'debit' ? 'text-red-500 font-bold' : 'text-gray-500'}>Expense</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        className={`flex-1 py-2 items-center rounded-md ${type === 'credit' ? 'bg-white shadow-sm' : ''}`}
                        onPress={() => setType('credit')}
                    >
                        <Text className={type === 'credit' ? 'text-green-500 font-bold' : 'text-gray-500'}>Income</Text>
                    </TouchableOpacity>
                </View>

                {/* Categories */}
                <View className="mb-6">
                    <Text className="text-gray-500 mb-2">Category</Text>
                    <View className="flex-row flex-wrap gap-2">
                        {categories.map((cat) => (
                            <TouchableOpacity
                                key={cat.id}
                                className={`px-3 py-2 rounded-full border ${category.id === cat.id ? 'bg-indigo-500 border-indigo-500' : 'bg-white border-gray-300'}`}
                                onPress={() => setCategory(cat)}
                            >
                                <Text className={category.id === cat.id ? 'text-white' : 'text-gray-700'}>
                                    {cat.name}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                {/* Submit Button */}
                <TouchableOpacity
                    className={`bg-indigo-600 p-4 rounded-xl items-center ${!amount || syncStatus === 'syncing' ? 'opacity-50' : ''}`}
                    onPress={handleSubmit}
                    disabled={!amount || syncStatus === 'syncing'}
                >
                    {syncStatus === 'syncing' ? (
                        <ActivityIndicator color="#fff" />
                    ) : (
                        <Text className="text-white font-bold text-lg">Save</Text>
                    )}
                </TouchableOpacity>
            </ScrollView>
        </SafeAreaView>
    );
}
