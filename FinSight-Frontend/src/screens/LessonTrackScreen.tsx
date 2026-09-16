/**
 * LessonTrackScreen
 *
 * One track: its lessons in order, which are finished, and how many of each
 * lesson's concepts are mastered (answered right twice, spaced) rather than
 * merely opened. Tapping a lesson plays it in LessonPlayerScreen.
 */
import React from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeIn, FadeInDown, useReducedMotion } from 'react-native-reanimated';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ArrowLeft, Check, ChevronRight, Clock, Play, Trophy } from 'lucide-react-native';
import { useAppSelector } from '../store/hooks';
import { selectCardResults } from '../store/slices/lessonsSlice';
import { findTrack, cardKey } from '../data/lessons';
import { isScorable } from '../data/lessons/schema';
import { isMastered } from '../services/lessonService';
import { PressableScale } from '../components/PressableScale';
import { BarFill } from '../components/BarFill';
import * as haptics from '../utils/haptics';
import { COLORS, FONTS, TYPE } from '../theme/tokens';

type Props = NativeStackScreenProps<any, 'LessonTrack'>;

const LessonTrackScreen: React.FC<Props> = ({ route, navigation }) => {
    const reduced = useReducedMotion();
    const trackId = route.params?.trackId as string;
    const track = findTrack(trackId);
    const results = useAppSelector(selectCardResults);
    const progress = useAppSelector((s) => s.learning.progress[trackId]);

    if (!track) {
        return (
            <SafeAreaView className="flex-1 bg-surface-secondary items-center justify-center">
                <Text className="text-text-secondary">Track not found.</Text>
            </SafeAreaView>
        );
    }

    const completed = new Set(progress?.completedModules ?? []);
    const pct = Math.round((completed.size / track.lessons.length) * 100);
    const badge = progress?.badgeEarned ?? false;
    const firstOpen = track.lessons.findIndex((l) => !completed.has(l.id));

    return (
        <SafeAreaView className="flex-1 bg-surface-secondary" edges={['top']}>
            <View className="flex-row items-center px-4 py-3 border-b border-border bg-surface-primary">
                <TouchableOpacity
                    onPress={() => navigation.goBack()}
                    className="w-9 h-9 items-center justify-center rounded-full bg-surface-tertiary mr-3"
                    activeOpacity={0.7}
                    accessibilityRole="button"
                    accessibilityLabel="Back"
                >
                    <ArrowLeft color={COLORS.text.primary} size={18} />
                </TouchableOpacity>
                <Text numberOfLines={1} className="text-lg font-inter-bold text-text-primary flex-1">{track.title}</Text>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
                <View className="mx-5 mt-4 bg-surface-primary border border-border rounded-2xl p-5">
                    <Text style={{ ...TYPE.body, color: COLORS.text.secondary, marginBottom: 14 }}>{track.audience}</Text>
                    <View className="flex-row justify-between items-center mb-1.5">
                        <Text className="text-sm font-inter-semibold text-text-secondary">Lessons finished</Text>
                        <Text className="text-xs text-text-tertiary font-inter">{completed.size}/{track.lessons.length}</Text>
                    </View>
                    <BarFill percent={pct} trackClassName="bg-surface-tertiary" color={pct === 100 ? COLORS.semantic.profit : COLORS.brand.primary} />
                    {badge ? (
                        <View className="bg-profit-bg rounded-xl px-4 py-3 flex-row items-center mt-4">
                            <Trophy size={16} color={COLORS.semantic.profit} />
                            <Text className="text-sm font-inter-semibold text-profit ml-2">Track badge earned</Text>
                        </View>
                    ) : null}
                </View>

                <View className="mx-5 mt-5">
                    {track.lessons.map((lesson, i) => {
                        const done = completed.has(lesson.id);
                        const concepts = lesson.cards.filter(isScorable);
                        const mastered = concepts.filter((c) => {
                            const r = results[cardKey(lesson.id, c.id)];
                            return r && isMastered(r);
                        }).length;
                        const seen = concepts.filter((c) => results[cardKey(lesson.id, c.id)]).length;
                        const isNext = i === firstOpen;
                        return (
                            <Animated.View key={lesson.id} entering={reduced ? FadeIn.duration(160) : FadeInDown.duration(200)}>
                                <PressableScale
                                    onPress={() => { haptics.tap(); navigation.navigate('LessonPlayer', { mode: 'lesson', trackId: track.id, lessonId: lesson.id }); }}
                                    accessibilityRole="button"
                                    style={{
                                        marginBottom: 12, padding: 16, borderRadius: 18,
                                        backgroundColor: COLORS.surface.primary,
                                        borderWidth: isNext ? 2 : 1,
                                        borderColor: isNext ? COLORS.brand.primary : COLORS.border.default,
                                        flexDirection: 'row', alignItems: 'center',
                                    }}
                                >
                                    <View style={{
                                        width: 40, height: 40, borderRadius: 20, marginRight: 14, alignItems: 'center', justifyContent: 'center',
                                        backgroundColor: done ? COLORS.semantic.profitBg : isNext ? COLORS.brand.primaryDark : COLORS.surface.tertiary,
                                    }}>
                                        {done ? <Check size={18} color={COLORS.semantic.profit} strokeWidth={3} />
                                            : isNext ? <Play size={16} color={COLORS.brand.onAccent} fill={COLORS.brand.onAccent} />
                                                : <Text style={{ fontFamily: FONTS.bold, fontSize: 13, color: COLORS.text.secondary }}>{i + 1}</Text>}
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <Text style={{ ...TYPE.callout, fontFamily: FONTS.bold, color: COLORS.text.primary }}>{lesson.title}</Text>
                                        <Text style={{ ...TYPE.caption, fontFamily: FONTS.regular, color: COLORS.text.secondary, marginTop: 2 }}>{lesson.summary}</Text>
                                        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8 }}>
                                            <Clock size={11} color={COLORS.text.tertiary} />
                                            <Text style={{ fontFamily: FONTS.medium, fontSize: 11, color: COLORS.text.tertiary, marginLeft: 4 }}>{lesson.minutes} min</Text>
                                            <Text style={{ fontFamily: FONTS.medium, fontSize: 11, color: COLORS.text.tertiary, marginHorizontal: 6 }}>{'·'}</Text>
                                            <Text style={{ fontFamily: FONTS.medium, fontSize: 11, color: mastered === concepts.length && concepts.length > 0 ? COLORS.semantic.profit : COLORS.text.tertiary }}>
                                                {seen === 0 ? `${concepts.length} concepts` : `${mastered}/${concepts.length} mastered`}
                                            </Text>
                                        </View>
                                    </View>
                                    <ChevronRight size={18} color={isNext ? COLORS.brand.primary : COLORS.text.tertiary} />
                                </PressableScale>
                            </Animated.View>
                        );
                    })}
                </View>
            </ScrollView>
        </SafeAreaView>
    );
};

export default LessonTrackScreen;
