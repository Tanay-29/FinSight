/**
 * FlashcardScreen.tsx
 *
 * AI-generated flashcard revision experience.
 *
 * Flow:
 *   1. Enters with { moduleTitle, moduleContent, keyPoints } from route params
 *   2. Calls backend /api/generate-flashcards (Gemini generates 5 Q&A cards)
 *   3. User swipes through cards with a 3D flip animation
 *   4. After each card: marks "Got it ✓" or "Review ✗"
 *   5. End screen shows score + "Review Again" cards highlighted
 */
import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
    View, Text, TouchableOpacity, ScrollView,
    Animated, Dimensions, ActivityIndicator, StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import {
    ArrowLeft, RotateCcw, Check, X as XIcon,
    BrainCircuit, ChevronLeft, ChevronRight,
    Lightbulb, RefreshCw, Trophy,
} from 'lucide-react-native';

const { width: SCREEN_W } = Dimensions.get('window');
const BACKEND = process.env.EXPO_PUBLIC_BACKEND_URL ?? '';

// ─── Types ────────────────────────────────────────────────────

export interface Flashcard {
    question: string;
    answer: string;
}

type Status = 'got_it' | 'review' | 'unseen';
type Props = NativeStackScreenProps<any, 'Flashcards'>;

// ─── Card Flip Component ──────────────────────────────────────

const FlipCard: React.FC<{
    card: Flashcard;
    index: number;
    total: number;
    onGotIt: () => void;
    onReview: () => void;
}> = ({ card, index, total, onGotIt, onReview }) => {
    const flipAnim = useRef(new Animated.Value(0)).current;
    const [flipped, setFlipped] = useState(false);

    const frontInterpolate = flipAnim.interpolate({
        inputRange: [0, 180],
        outputRange: ['0deg', '180deg'],
    });
    const backInterpolate = flipAnim.interpolate({
        inputRange: [0, 180],
        outputRange: ['180deg', '360deg'],
    });

    const handleFlip = () => {
        Animated.spring(flipAnim, {
            toValue: flipped ? 0 : 180,
            friction: 8,
            tension: 50,
            useNativeDriver: true,
        }).start(() => setFlipped((f) => !f));
    };

    return (
        <View style={{ alignItems: 'center' }}>
            {/* Progress indicator */}
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 20, gap: 6 }}>
                {Array.from({ length: total }).map((_, i) => (
                    <View
                        key={i}
                        style={{
                            height: 4, borderRadius: 2,
                            width: i === index ? 24 : 8,
                            backgroundColor: i === index ? '#6366F1' : i < index ? '#A5B4FC' : '#E5E7EB',
                        }}
                    />
                ))}
            </View>

            {/* Card counter */}
            <Text style={{ fontSize: 12, color: '#9CA3AF', fontWeight: '600', marginBottom: 16 }}>
                Card {index + 1} of {total}
            </Text>

            {/* Flip card */}
            <TouchableOpacity
                onPress={handleFlip}
                activeOpacity={0.95}
                style={{ width: SCREEN_W - 48, height: 280 }}
            >
                {/* Front — Question */}
                <Animated.View style={{
                    position: 'absolute', width: '100%', height: '100%',
                    backfaceVisibility: 'hidden',
                    transform: [{ rotateY: frontInterpolate }],
                    backgroundColor: '#FFFFFF',
                    borderRadius: 24,
                    borderWidth: 1.5,
                    borderColor: '#EEF2FF',
                    padding: 28,
                    alignItems: 'center',
                    justifyContent: 'center',
                    shadowColor: '#6366F1',
                    shadowOpacity: 0.1,
                    shadowRadius: 20,
                    elevation: 6,
                }}>
                    <View style={{ width: 48, height: 48, borderRadius: 16, backgroundColor: '#EEF2FF', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
                        <Lightbulb size={24} color="#6366F1" />
                    </View>
                    <Text style={{ fontSize: 11, fontWeight: '700', color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>
                        Question
                    </Text>
                    <Text style={{ fontSize: 18, fontWeight: '700', color: '#111827', textAlign: 'center', lineHeight: 26 }}>
                        {card.question}
                    </Text>
                    <Text style={{ fontSize: 12, color: '#C4B5FD', marginTop: 24, fontWeight: '500' }}>
                        Tap to reveal answer
                    </Text>
                </Animated.View>

                {/* Back — Answer */}
                <Animated.View style={{
                    position: 'absolute', width: '100%', height: '100%',
                    backfaceVisibility: 'hidden',
                    transform: [{ rotateY: backInterpolate }],
                    backgroundColor: '#6366F1',
                    borderRadius: 24,
                    padding: 28,
                    alignItems: 'center',
                    justifyContent: 'center',
                    shadowColor: '#6366F1',
                    shadowOpacity: 0.3,
                    shadowRadius: 20,
                    elevation: 6,
                }}>
                    <Text style={{ fontSize: 11, fontWeight: '700', color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>
                        Answer
                    </Text>
                    <Text style={{ fontSize: 16, fontWeight: '600', color: '#FFFFFF', textAlign: 'center', lineHeight: 24 }}>
                        {card.answer}
                    </Text>
                    <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginTop: 20 }}>
                        Tap to flip back
                    </Text>
                </Animated.View>
            </TouchableOpacity>

            {/* Action buttons — only visible after flip */}
            {flipped && (
                <View style={{ flexDirection: 'row', gap: 16, marginTop: 24 }}>
                    <TouchableOpacity
                        onPress={onReview}
                        style={{
                            flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
                            paddingVertical: 14, borderRadius: 16, gap: 8,
                            backgroundColor: '#FEF2F2', borderWidth: 1.5, borderColor: '#FECACA',
                        }}
                    >
                        <XIcon size={18} color="#EF4444" />
                        <Text style={{ color: '#EF4444', fontWeight: '700', fontSize: 14 }}>Review Again</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        onPress={onGotIt}
                        style={{
                            flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
                            paddingVertical: 14, borderRadius: 16, gap: 8,
                            backgroundColor: '#ECFDF5', borderWidth: 1.5, borderColor: '#BBF7D0',
                        }}
                    >
                        <Check size={18} color="#10B981" />
                        <Text style={{ color: '#10B981', fontWeight: '700', fontSize: 14 }}>Got It!</Text>
                    </TouchableOpacity>
                </View>
            )}
        </View>
    );
};

// ─── Results Screen ───────────────────────────────────────────

const ResultsScreen: React.FC<{
    cards: Flashcard[];
    statuses: Status[];
    onRestart: () => void;
    onReviewOnly: () => void;
    onBack: () => void;
}> = ({ cards, statuses, onRestart, onReviewOnly, onBack }) => {
    const gotItCount = statuses.filter((s) => s === 'got_it').length;
    const reviewCount = statuses.filter((s) => s === 'review').length;
    const pct = Math.round((gotItCount / cards.length) * 100);

    const scaleAnim = useRef(new Animated.Value(0)).current;
    useEffect(() => {
        Animated.spring(scaleAnim, { toValue: 1, friction: 5, tension: 80, useNativeDriver: true }).start();
    }, []);

    return (
        <ScrollView
            contentContainerStyle={{ flexGrow: 1, alignItems: 'center', paddingVertical: 40, paddingHorizontal: 24 }}
            showsVerticalScrollIndicator={false}
        >
            <Animated.View style={{ transform: [{ scale: scaleAnim }], alignItems: 'center' }}>
                <View style={{
                    width: 140, height: 140, borderRadius: 70,
                    backgroundColor: pct >= 80 ? '#ECFDF5' : pct >= 50 ? '#FFFBEB' : '#FEF2F2',
                    borderWidth: 4,
                    borderColor: pct >= 80 ? '#10B981' : pct >= 50 ? '#F59E0B' : '#EF4444',
                    alignItems: 'center', justifyContent: 'center',
                }}>
                    {pct >= 80 ? <Trophy size={40} color="#10B981" /> : <BrainCircuit size={40} color={pct >= 50 ? '#F59E0B' : '#EF4444'} />}
                    <Text style={{ fontSize: 22, fontWeight: '900', color: pct >= 80 ? '#10B981' : pct >= 50 ? '#F59E0B' : '#EF4444', marginTop: 4 }}>
                        {pct}%
                    </Text>
                </View>
            </Animated.View>

            <Text style={{ fontSize: 24, fontWeight: '800', color: '#111827', marginTop: 24, textAlign: 'center' }}>
                {pct === 100 ? 'Perfect Memory!' : pct >= 80 ? 'Great Recall!' : pct >= 50 ? 'Good Progress!' : 'Keep Studying!'}
            </Text>
            <Text style={{ fontSize: 14, color: '#6B7280', marginTop: 8, textAlign: 'center', lineHeight: 20 }}>
                You got {gotItCount} of {cards.length} cards right
                {reviewCount > 0 ? ` — ${reviewCount} card${reviewCount > 1 ? 's' : ''} need more review` : '!'}
            </Text>

            {/* Stats row */}
            <View style={{ flexDirection: 'row', gap: 12, marginTop: 24, width: '100%' }}>
                <View style={{ flex: 1, backgroundColor: '#ECFDF5', borderRadius: 16, padding: 16, alignItems: 'center' }}>
                    <Text style={{ fontSize: 28, fontWeight: '900', color: '#10B981' }}>{gotItCount}</Text>
                    <Text style={{ fontSize: 12, color: '#059669', fontWeight: '600', marginTop: 2 }}>Got It</Text>
                </View>
                <View style={{ flex: 1, backgroundColor: '#FEF2F2', borderRadius: 16, padding: 16, alignItems: 'center' }}>
                    <Text style={{ fontSize: 28, fontWeight: '900', color: '#EF4444' }}>{reviewCount}</Text>
                    <Text style={{ fontSize: 12, color: '#DC2626', fontWeight: '600', marginTop: 2 }}>Review Again</Text>
                </View>
            </View>

            {/* Review-only cards list */}
            {reviewCount > 0 && (
                <View style={{ width: '100%', marginTop: 20 }}>
                    <Text style={{ fontSize: 13, fontWeight: '700', color: '#374151', marginBottom: 10 }}>
                        Cards to Focus On:
                    </Text>
                    {cards.map((card, i) =>
                        statuses[i] === 'review' ? (
                            <View key={i} style={{
                                backgroundColor: '#FFF7ED',
                                borderRadius: 14, padding: 14,
                                borderWidth: 1, borderColor: '#FED7AA',
                                marginBottom: 8,
                            }}>
                                <Text style={{ fontSize: 13, fontWeight: '700', color: '#92400E', marginBottom: 4 }}>
                                    Q: {card.question}
                                </Text>
                                <Text style={{ fontSize: 12, color: '#78350F', lineHeight: 18 }}>
                                    A: {card.answer}
                                </Text>
                            </View>
                        ) : null
                    )}
                </View>
            )}

            {/* Actions */}
            <View style={{ width: '100%', gap: 10, marginTop: 24 }}>
                {reviewCount > 0 && (
                    <TouchableOpacity
                        onPress={onReviewOnly}
                        style={{
                            backgroundColor: '#6366F1', borderRadius: 16,
                            paddingVertical: 16, alignItems: 'center',
                        }}
                    >
                        <Text style={{ color: '#FFFFFF', fontWeight: '700', fontSize: 15 }}>
                            Practice {reviewCount} Weak Card{reviewCount > 1 ? 's' : ''}
                        </Text>
                    </TouchableOpacity>
                )}
                <TouchableOpacity
                    onPress={onRestart}
                    style={{
                        backgroundColor: '#FFFFFF', borderRadius: 16,
                        paddingVertical: 14, alignItems: 'center',
                        flexDirection: 'row', justifyContent: 'center', gap: 8,
                        borderWidth: 1.5, borderColor: '#E5E7EB',
                    }}
                >
                    <RefreshCw size={16} color="#6B7280" />
                    <Text style={{ color: '#374151', fontWeight: '600', fontSize: 14 }}>Restart All Cards</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    onPress={onBack}
                    style={{ paddingVertical: 12, alignItems: 'center' }}
                >
                    <Text style={{ color: '#9CA3AF', fontWeight: '500', fontSize: 14 }}>← Back to Module</Text>
                </TouchableOpacity>
            </View>
        </ScrollView>
    );
};

// ─── Main Screen ──────────────────────────────────────────────

const FlashcardScreen: React.FC<Props> = ({ route, navigation }) => {
    const { moduleTitle, moduleContent, keyPoints } = route.params ?? {};

    const [cards, setCards] = useState<Flashcard[]>([]);
    const [statuses, setStatuses] = useState<Status[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [phase, setPhase] = useState<'cards' | 'results'>('cards');

    // Active deck (all cards or review-only)
    const [activeDeck, setActiveDeck] = useState<number[]>([]);

    const fetchCards = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch(`${BACKEND}/api/generate-flashcards`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title: moduleTitle,
                    content: moduleContent,
                    keyPoints: keyPoints ?? [],
                }),
            });
            if (!res.ok) throw new Error(`Server error: ${res.status}`);
            const data: Flashcard[] = await res.json();
            setCards(data);
            setStatuses(data.map(() => 'unseen'));
            setActiveDeck(data.map((_, i) => i));
            setCurrentIndex(0);
            setPhase('cards');
        } catch (e: any) {
            setError(e.message ?? 'Failed to load flashcards');
        } finally {
            setLoading(false);
        }
    }, [moduleTitle, moduleContent, keyPoints]);

    useEffect(() => { fetchCards(); }, []);

    const currentCardOriginalIndex = activeDeck[currentIndex];

    const handleGotIt = () => {
        const newStatuses = [...statuses];
        newStatuses[currentCardOriginalIndex] = 'got_it';
        setStatuses(newStatuses);
        advance(newStatuses);
    };

    const handleReview = () => {
        const newStatuses = [...statuses];
        newStatuses[currentCardOriginalIndex] = 'review';
        setStatuses(newStatuses);
        advance(newStatuses);
    };

    const advance = (newStatuses: Status[]) => {
        if (currentIndex + 1 < activeDeck.length) {
            setCurrentIndex((i) => i + 1);
        } else {
            setPhase('results');
        }
    };

    const restart = () => {
        setStatuses(cards.map(() => 'unseen'));
        setActiveDeck(cards.map((_, i) => i));
        setCurrentIndex(0);
        setPhase('cards');
    };

    const reviewOnly = () => {
        const reviewIndices = statuses
            .map((s, i) => (s === 'review' ? i : -1))
            .filter((i) => i !== -1);
        setActiveDeck(reviewIndices);
        setCurrentIndex(0);
        setPhase('cards');
    };

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: '#F9FAFB' }} edges={['top', 'bottom']}>
            <StatusBar barStyle="dark-content" />

            {/* Header */}
            <View style={{
                flexDirection: 'row', alignItems: 'center',
                paddingHorizontal: 20, paddingVertical: 14,
                backgroundColor: '#FFFFFF',
                borderBottomWidth: 1, borderBottomColor: '#F3F4F6',
            }}>
                <TouchableOpacity
                    onPress={() => navigation.goBack()}
                    style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center', marginRight: 12 }}
                >
                    <ArrowLeft size={18} color="#374151" />
                </TouchableOpacity>
                <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 15, fontWeight: '800', color: '#111827' }} numberOfLines={1}>
                        AI Flashcards
                    </Text>
                    <Text style={{ fontSize: 12, color: '#9CA3AF' }} numberOfLines={1}>
                        {moduleTitle}
                    </Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#EEF2FF', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 5 }}>
                    <BrainCircuit size={13} color="#6366F1" />
                    <Text style={{ fontSize: 11, fontWeight: '700', color: '#6366F1' }}>AI Generated</Text>
                </View>
            </View>

            {/* Content */}
            {loading ? (
                <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16 }}>
                    <View style={{ width: 64, height: 64, borderRadius: 20, backgroundColor: '#EEF2FF', alignItems: 'center', justifyContent: 'center' }}>
                        <BrainCircuit size={32} color="#6366F1" />
                    </View>
                    <ActivityIndicator size="large" color="#6366F1" />
                    <Text style={{ fontSize: 14, color: '#6B7280', fontWeight: '500' }}>
                        Generating your flashcards...
                    </Text>
                    <Text style={{ fontSize: 12, color: '#9CA3AF' }}>
                        Gemini AI is reading the module
                    </Text>
                </View>
            ) : error ? (
                <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 }}>
                    <Text style={{ fontSize: 16, fontWeight: '700', color: '#EF4444', marginBottom: 8 }}>
                        Could not load flashcards
                    </Text>
                    <Text style={{ fontSize: 13, color: '#6B7280', textAlign: 'center', marginBottom: 24 }}>
                        {error}
                    </Text>
                    <TouchableOpacity
                        onPress={fetchCards}
                        style={{ backgroundColor: '#6366F1', borderRadius: 14, paddingVertical: 12, paddingHorizontal: 24, flexDirection: 'row', alignItems: 'center', gap: 8 }}
                    >
                        <RefreshCw size={16} color="white" />
                        <Text style={{ color: 'white', fontWeight: '700' }}>Try Again</Text>
                    </TouchableOpacity>
                </View>
            ) : phase === 'cards' && cards.length > 0 && activeDeck.length > 0 ? (
                <ScrollView
                    contentContainerStyle={{ flexGrow: 1, alignItems: 'center', paddingTop: 32, paddingHorizontal: 24, paddingBottom: 40 }}
                    showsVerticalScrollIndicator={false}
                >
                    <FlipCard
                        key={`${currentCardOriginalIndex}-${currentIndex}`}
                        card={cards[currentCardOriginalIndex]}
                        index={currentIndex}
                        total={activeDeck.length}
                        onGotIt={handleGotIt}
                        onReview={handleReview}
                    />
                </ScrollView>
            ) : phase === 'results' ? (
                <ResultsScreen
                    cards={cards}
                    statuses={statuses}
                    onRestart={restart}
                    onReviewOnly={reviewOnly}
                    onBack={() => navigation.goBack()}
                />
            ) : null}
        </SafeAreaView>
    );
};

export default FlashcardScreen;
