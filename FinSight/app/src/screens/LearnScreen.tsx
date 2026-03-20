import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TextInput, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { setLearningPaths, fetchGlossary, fetchLearningPaths } from '../store/slices/learningSlice';
import { LearningPathCard } from '../components/LearningPathCard';
import { MOCK_LEARNING_PATHS, MOCK_GLOSSARY, GlossaryTerm } from '../data/mockData';

export const LearnScreen: React.FC = () => {
    const navigation = useNavigation<any>();
    const dispatch = useAppDispatch();
    const learningPaths = useAppSelector((state) => state.learning.paths);
    const [searchQuery, setSearchQuery] = useState('');
    const [showGlossary, setShowGlossary] = useState(false);



    useEffect(() => {
        dispatch(fetchLearningPaths());
        dispatch(fetchGlossary());
    }, [dispatch]);

    const glossary = useAppSelector((state) => state.learning.glossary);
    const displayGlossary = glossary.length > 0 ? glossary : MOCK_GLOSSARY;
    
    const displayPaths = learningPaths && learningPaths.length > 0 ? learningPaths : MOCK_LEARNING_PATHS;

    const filteredGlossary = displayGlossary.filter(
        (term) =>
            term.term.toLowerCase().includes(searchQuery.toLowerCase()) ||
            term.definition.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <SafeAreaView className="flex-1 bg-surface-secondary" edges={['top']}>
            <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
                {/* Header */}
                <View className="px-4 pt-4 pb-2">
                    <Text className="text-2xl font-bold text-text-primary">Learning Hub 🎓</Text>
                    <Text className="text-sm text-text-secondary">
                        Build your financial knowledge, one module at a time
                    </Text>
                </View>

                {/* Tab Toggle */}
                <View className="flex-row mx-4 mt-3 bg-surface-tertiary rounded-xl p-1">
                    <TouchableOpacity
                        className={`flex-1 rounded-lg py-2 items-center ${!showGlossary ? 'bg-white' : ''
                            }`}
                        onPress={() => setShowGlossary(false)}
                    >
                        <Text
                            className={`text-sm font-semibold ${!showGlossary ? 'text-brand-primary' : 'text-text-tertiary'
                                }`}
                        >
                            📚 Paths
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        className={`flex-1 rounded-lg py-2 items-center ${showGlossary ? 'bg-white' : ''
                            }`}
                        onPress={() => setShowGlossary(true)}
                    >
                        <Text
                            className={`text-sm font-semibold ${showGlossary ? 'text-brand-primary' : 'text-text-tertiary'
                                }`}
                        >
                            🔤 FinVocab
                        </Text>
                    </TouchableOpacity>
                </View>

                {!showGlossary ? (
                    /* Learning Paths */
                    <View className="mt-4">
                        {/* Stats - Moved to Top */}
                        <View className="mx-4 mb-6 mt-2 bg-white border border-border rounded-xl p-4">
                            <Text className="text-sm font-semibold text-text-primary mb-2">
                                📊 Your Stats
                            </Text>
                            <View className="flex-row justify-between">
                                <View className="items-center flex-1">
                                    <Text className="text-2xl font-bold text-brand-primary">8</Text>
                                    <Text className="text-xs text-text-tertiary">Modules Done</Text>
                                </View>
                                <View className="w-px bg-border" />
                                <View className="items-center flex-1">
                                    <Text className="text-2xl font-bold text-profit">1</Text>
                                    <Text className="text-xs text-text-tertiary">Badges Earned</Text>
                                </View>
                                <View className="w-px bg-border" />
                                <View className="items-center flex-1">
                                    <Text className="text-2xl font-bold text-alert-amber">🔥 3</Text>
                                    <Text className="text-xs text-text-tertiary">Day Streak</Text>
                                </View>
                            </View>
                        </View>

                        {/* Learning Paths */}
                        {displayPaths.map((path) => (
                            <LearningPathCard
                                key={path.id}
                                path={{ ...path, id: path.id || '' }}
                                onPress={() => navigation.navigate('LearnPathDetail', { path })}
                            />
                        ))}
                    </View>
                ) : (
                    /* Glossary */
                    <View className="mt-4 mx-4">
                        {/* Search */}
                        <View className="bg-white border border-border rounded-xl px-4 py-3 mb-4 flex-row items-center">
                            <Text className="text-base mr-2">🔍</Text>
                            <TextInput
                                className="flex-1 text-base text-text-primary"
                                placeholder="Search financial terms..."
                                placeholderTextColor="#9CA3AF"
                                value={searchQuery}
                                onChangeText={setSearchQuery}
                            />
                        </View>

                        {/* Terms */}
                        {filteredGlossary.map((term) => (
                            <GlossaryTermCard key={term.term} term={term} />
                        ))}

                        {filteredGlossary.length === 0 && (
                            <View className="items-center py-8">
                                <Text className="text-4xl mb-2">🤔</Text>
                                <Text className="text-sm text-text-tertiary">
                                    No terms found for "{searchQuery}"
                                </Text>
                            </View>
                        )}

                        <View className="h-6" />
                    </View>
                )}
            </ScrollView>
        </SafeAreaView>
    );
};

const GlossaryTermCard: React.FC<{ term: GlossaryTerm }> = ({ term }) => (
    <View className="bg-white border border-border rounded-xl p-4 mb-3">
        <Text className="text-base font-semibold text-brand-primary mb-1">
            {term.term}
        </Text>
        <Text className="text-sm text-text-secondary leading-5">
            {term.definition}
        </Text>
    </View>
);
